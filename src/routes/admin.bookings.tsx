import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bookings")({ component: AdminBookings });

interface Row {
  id: string;
  check_in: string;
  check_out: string;
  guests: number;
  guest_name: string;
  guest_email: string;
  nights: number;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: string;
  hotels: { name: string } | null;
  rooms: { name: string } | null;
}

function AdminBookings() {
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const { data } = await supabase
      .from("bookings")
      .select("id, check_in, check_out, guests, guest_name, guest_email, nights, total_price, status, payment_status, created_at, hotels(name), rooms(name)")
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
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <div>
                <div className="font-medium">{b.hotels?.name} — {b.rooms?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {b.guest_name} · {b.guest_email} · {b.guests} guests
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="outline">{b.check_in} → {b.check_out}</Badge>
                  <Badge variant="outline">{b.nights}n</Badge>
                  <Badge variant="outline">${Number(b.total_price).toFixed(0)}</Badge>
                </div>
              </div>
              <Select value={b.status} onValueChange={(v) => setStatus(b.id, v)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
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
              <Button variant="outline" size="icon" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
