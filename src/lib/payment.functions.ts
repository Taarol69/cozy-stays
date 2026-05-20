import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SERVER_FALLBACK_NPR_PER_USD } from "./pricing";

const KHALTI_BASE = "https://dev.khalti.com/api/v2"; // sandbox

/**
 * Initiate a Khalti sandbox payment for an existing booking owned by the caller.
 * Returns the hosted payment URL the client must redirect to.
 */
export const initiateKhaltiPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        bookingId: z.string().uuid(),
        returnUrl: z.string().url(),
        websiteUrl: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fetch booking via user-scoped client (RLS guarantees ownership).
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        "id, user_id, total_price, guest_name, guest_email, guest_phone, hotel_id, hotels(name)",
      )
      .eq("id", data.bookingId)
      .single();

    if (error || !booking) throw new Error("Booking not found");
    if (booking.user_id !== userId) throw new Error("Forbidden");

    const secret = process.env.KHALTI_SECRET_KEY;
    if (!secret) throw new Error("Khalti is not configured");

    const totalUSD = Number(booking.total_price);
    const amountNPR = Math.round(totalUSD * SERVER_FALLBACK_NPR_PER_USD * 100); // paisa
    const hotelName = (booking as any).hotels?.name ?? "HimalStay booking";

    const res = await fetch(`${KHALTI_BASE}/epayment/initiate/`, {
      method: "POST",
      headers: {
        Authorization: `Key ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        return_url: data.returnUrl,
        website_url: data.websiteUrl,
        amount: amountNPR,
        purchase_order_id: booking.id,
        purchase_order_name: `${hotelName} — booking ${booking.id.slice(0, 8)}`,
        customer_info: {
          name: booking.guest_name,
          email: booking.guest_email,
          phone: booking.guest_phone || "9800000000",
        },
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.pidx) {
      console.error("Khalti initiate failed", res.status, body);
      throw new Error(body?.detail || "Failed to initiate payment");
    }

    // Record initiated payment (admin client — clients can't write payments).
    await supabaseAdmin.from("payments").insert({
      booking_id: booking.id,
      user_id: userId,
      amount: amountNPR / 100,
      currency: "NPR",
      method: "khalti",
      status: "initiated",
      pidx: body.pidx,
      payment_url: body.payment_url,
      gateway_response: body,
    });

    return { paymentUrl: body.payment_url as string, pidx: body.pidx as string };
  });

/**
 * Verify a Khalti payment via lookup. Updates booking + payment + assigns
 * an invoice number on success. Safe to call multiple times (idempotent).
 */
export const verifyKhaltiPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ pidx: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const secret = process.env.KHALTI_SECRET_KEY;
    if (!secret) throw new Error("Khalti is not configured");

    // Find payment row (must belong to caller).
    const { data: payment, error: pErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("pidx", data.pidx)
      .maybeSingle();
    if (pErr || !payment) throw new Error("Payment not found");
    if (payment.user_id !== userId) throw new Error("Forbidden");

    const res = await fetch(`${KHALTI_BASE}/epayment/lookup/`, {
      method: "POST",
      headers: {
        Authorization: `Key ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx: data.pidx }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Khalti lookup failed", res.status, body);
      throw new Error(body?.detail || "Failed to verify payment");
    }

    const khaltiStatus = String(body?.status || "").toLowerCase();
    let paymentStatus: "completed" | "pending" | "failed" = "pending";
    if (khaltiStatus === "completed") paymentStatus = "completed";
    else if (["expired", "user canceled", "failed", "refunded"].includes(khaltiStatus))
      paymentStatus = "failed";

    await supabaseAdmin
      .from("payments")
      .update({
        status: paymentStatus,
        transaction_id: body?.transaction_id ?? null,
        gateway_response: body,
      })
      .eq("id", payment.id);

    if (paymentStatus === "completed") {
      // Issue an invoice number if not already assigned, and flip booking to confirmed/paid.
      const { data: existing } = await supabaseAdmin
        .from("bookings")
        .select("invoice_number")
        .eq("id", payment.booking_id)
        .single();

      let invoiceNumber = existing?.invoice_number ?? null;
      if (!invoiceNumber) {
        const { data: inv } = await supabaseAdmin.rpc("generate_invoice_number");
        invoiceNumber = (inv as unknown as string) ?? `INV-${Date.now()}`;
      }

      await supabaseAdmin
        .from("bookings")
        .update({
          status: "confirmed",
          payment_status: "paid",
          invoice_number: invoiceNumber,
        })
        .eq("id", payment.booking_id);
    }

    return {
      status: paymentStatus,
      bookingId: payment.booking_id as string,
      transactionId: (body?.transaction_id as string) || null,
    };
  });
