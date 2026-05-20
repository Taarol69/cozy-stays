import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Download } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Price, useCurrency } from "@/lib/currency";
import { downloadInvoice, type InvoiceData } from "@/lib/invoice";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bookings")({ component: AdminBookings });

interface Row {
  id: string;
  check_in: string;
  check_out: string;
  guests: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  nights: number;
  subtotal: number | null;
  service_charge: number | null;
  tax_amount: number | null;
  total_price: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  invoice_number: string | null;
  created_at: string;
  hotels: { name: string; city: string; country: string; address: string | null } | null;
  rooms: { name: string; room_type: string } | null;
  payments: { transaction_id: string | null }[] | null;
}

function AdminBookings() {
  const { rate } = useCurrency();
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const { data } = await supabase
      .from("bookings")
      .select(
        "id, check_in, check_out, guests, guest_name, guest_email, guest_phone, nights, subtotal, service_charge, tax_amount, total_price, status, payment_status, payment_method, invoice_number, created_at, hotels(name,city,country,address), rooms(name,room_type), payments(transaction_id)",
      )
      .order("created_at", { ascending: false });
    setRows((data as any) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  async function setPayment(id: string, payment_status: string) {
    const { error } = await supabase.from("bookings").update({ payment_status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  function asInvoice(b: Row): InvoiceData {
    return {
      invoiceNumber: b.invoice_number || `INV-${b.id.slice(0, 8).toUpperCase()}`,
      bookingId: b.id,
      status: b.status,
      paymentStatus: b.payment_status,
      paymentMethod: b.payment_method,
      issuedAt: b.created_at,
      hotel: {
        name: b.hotels?.name ?? "—",
        city: b.hotels?.city ?? "",
        country: b.hotels?.country ?? "",
        address: b.hotels?.address,
      },
      room: { name: b.rooms?.name ?? "—", room_type: b.rooms?.room_type ?? "Standard" },
      guest: { name: b.guest_name, email: b.guest_email, phone: b.guest_phone },
      checkIn: b.check_in,
      checkOut: b.check_out,
      nights: b.nights,
      guests: b.guests,
      subtotal: Number(b.subtotal ?? b.total_price),
      service: Number(b.service_charge ?? 0),
      tax: Number(b.tax_amount ?? 0),
      total: Number(b.total_price),
      nprRate: rate,
      transactionId: b.payments?.[0]?.transaction_id ?? null,
    };
  }

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-semibold">Bookings</h1>
      <p className="text-muted-foreground">{rows.length} total</p>

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
            No bookings yet.
          </div>
        ) : rows.map((b) => (
          <Card key={b.id} className="p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-center">
              <div>
                <div className="font-medium">{b.hotels?.name} — {b.rooms?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {b.guest_name} · {b.guest_email} · {b.guests} guests
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="outline">{b.check_in} → {b.check_out}</Badge>
                  <Badge variant="outline">{b.nights}n</Badge>
                  <Badge variant="outline"><Price usd={Number(b.total_price)} showUsd={false} /></Badge>
                  <Badge variant="outline" className="text-muted-foreground">${Number(b.total_price).toFixed(0)}</Badge>
                  {b.payment_method && <Badge variant="outline" className="capitalize">{b.payment_method.replace("_", " ")}</Badge>}
                  {b.invoice_number && <Badge variant="outline" className="font-mono">{b.invoice_number}</Badge>}
                </div>
              </div>
              <Select value={b.status} onValueChange={(v) => setStatus(b.id, v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="checked_in">Checked-in</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={b.payment_status} onValueChange={(v) => setPayment(b.id, v)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => downloadInvoice(asInvoice(b))} title="Download invoice">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => remove(b.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
