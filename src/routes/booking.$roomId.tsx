import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, MapPin, CreditCard, Hotel as HotelIcon } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Price, formatNPR, useCurrency } from "@/lib/currency";
import { breakdown } from "@/lib/pricing";
import { initiateKhaltiPayment } from "@/lib/payment.functions";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Room = Database["public"]["Tables"]["rooms"]["Row"];
type Hotel = Database["public"]["Tables"]["hotels"]["Row"];

export const Route = createFileRoute("/booking/$roomId")({
  component: BookingPage,
});

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function BookingPage() {
  const { roomId } = Route.useParams();
  const { user } = useAuth();
  const { rate } = useCurrency();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [checkIn, setCheckIn] = useState(todayISO(1));
  const [checkOut, setCheckOut] = useState(todayISO(3));
  const [guests, setGuests] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState(user?.email ?? "");
  const [guestPhone, setGuestPhone] = useState("");
  const [requests, setRequests] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"khalti" | "pay_at_hotel">("khalti");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
      setRoom(r);
      if (r) {
        const { data: h } = await supabase.from("hotels").select("*").eq("id", r.hotel_id).maybeSingle();
        setHotel(h);
      }
    })();
  }, [roomId]);

  useEffect(() => {
    if (user) setGuestEmail((e) => e || user.email || "");
  }, [user]);

  const nights = Math.max(
    1,
    Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  );
  const subtotalUSD = room ? Number(room.price_per_night) * nights : 0;
  const b = breakdown(subtotalUSD);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return navigate({ to: "/auth/login" });
    if (!room) return;
    if (new Date(checkOut) <= new Date(checkIn))
      return toast.error("Check-out must be after check-in");
    setSaving(true);

    const initialStatus = paymentMethod === "pay_at_hotel" ? "confirmed" : "pending";
    const initialPayment = "pending";

    const { data: created, error } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        room_id: room.id,
        hotel_id: room.hotel_id,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || null,
        special_requests: requests || null,
        nights,
        subtotal: b.subtotal,
        service_charge: b.service,
        tax_amount: b.tax,
        total_price: b.total,
        currency: "USD",
        payment_method: paymentMethod,
        status: initialStatus,
        payment_status: initialPayment,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }

    if (paymentMethod === "pay_at_hotel") {
      setSaving(false);
      navigate({ to: "/payment/callback", search: { bookingId: created.id, offline: "1" } as any });
      return;
    }

    // Kick off Khalti sandbox checkout
    try {
      const origin = window.location.origin;
      const { paymentUrl } = await initiateKhaltiPayment({
        data: {
          bookingId: created.id,
          returnUrl: `${origin}/payment/callback`,
          websiteUrl: origin,
        },
      });
      window.location.href = paymentUrl;
    } catch (err: any) {
      setSaving(false);
      toast.error(err?.message ?? "Could not start payment");
    }
  }

  if (!room || !hotel) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading…</div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Complete your booking</h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" /> {hotel.name} — {hotel.city}, {hotel.country}
        </p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="mb-4 font-display text-xl font-semibold">Trip details</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="ci">Check-in</Label>
                  <Input id="ci" type="date" min={todayISO()} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="co">Check-out</Label>
                  <Input id="co" type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="g">Guests</Label>
                  <Input id="g" type="number" min={1} max={room.capacity} value={guests} onChange={(e) => setGuests(Number(e.target.value))} required />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 font-display text-xl font-semibold">Guest information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="n">Full name</Label>
                  <Input id="n" required value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="e">Email</Label>
                  <Input id="e" type="email" required value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="p">Phone</Label>
                  <Input id="p" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="98XXXXXXXX" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="r">Special requests</Label>
                  <Textarea id="r" rows={3} value={requests} onChange={(e) => setRequests(e.target.value)} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 font-display text-xl font-semibold">Payment method</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("khalti")}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                    paymentMethod === "khalti" ? "border-gold ring-1 ring-gold" : "border-border hover:border-gold/60"
                  }`}
                >
                  <CreditCard className="mt-0.5 h-5 w-5 text-gold" />
                  <div>
                    <div className="font-medium">Khalti</div>
                    <div className="text-xs text-muted-foreground">Pay now via Khalti sandbox. Instant confirmation + invoice.</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pay_at_hotel")}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                    paymentMethod === "pay_at_hotel" ? "border-gold ring-1 ring-gold" : "border-border hover:border-gold/60"
                  }`}
                >
                  <HotelIcon className="mt-0.5 h-5 w-5 text-gold" />
                  <div>
                    <div className="font-medium">Pay at hotel</div>
                    <div className="text-xs text-muted-foreground">Reserve now, settle at check-in. No card required.</div>
                  </div>
                </button>
              </div>
            </Card>
          </div>

          <aside>
            <Card className="sticky top-20 p-6">
              <h3 className="mb-4 font-display text-lg font-semibold">Price summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{room.name} × {nights}n</span>
                  <span>${b.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service (10%)</span>
                  <span>${b.service.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (13%)</span>
                  <span>${b.tax.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4 border-t border-border/60 pt-4">
                <div className="flex flex-col gap-1 font-display text-lg font-semibold">
                  <div className="flex justify-between"><span>Total</span><span className="text-gold">{formatNPR(b.total * rate)}</span></div>
                  <div className="flex justify-between text-sm font-normal text-muted-foreground"><span>USD equivalent</span><span>${b.total.toFixed(2)}</span></div>
                </div>
              </div>
              <Button type="submit" disabled={saving || !user} className="mt-6 w-full bg-gold text-gold-foreground hover:bg-gold/90">
                {!user
                  ? "Sign in to book"
                  : saving
                    ? "Processing…"
                    : paymentMethod === "khalti"
                      ? "Pay with Khalti"
                      : "Confirm reservation"}
              </Button>
              {!user && (
                <Button asChild variant="outline" className="mt-2 w-full">
                  <Link to="/auth/login">Sign in</Link>
                </Button>
              )}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                <Price usd={Number(room.price_per_night)} showUsd={false} /> per night ·
                you can cancel up to 24h before check-in
              </p>
            </Card>
          </aside>
        </form>

        {/* Sandbox helper for testers */}
        {paymentMethod === "khalti" && (
          <Card className="mt-6 p-4 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">Khalti sandbox test credentials</div>
            Test mobile: <span className="font-mono">9800000000–9800000005</span> · MPIN: <span className="font-mono">1111</span> · OTP: <span className="font-mono">987654</span>
          </Card>
        )}
      </div>
    </SiteLayout>
  );
}

