import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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
  const [confirmed, setConfirmed] = useState<string | null>(null);
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
  const total = room ? Number(room.price_per_night) * nights : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return navigate({ to: "/auth/login" });
    if (!room) return;
    if (new Date(checkOut) <= new Date(checkIn)) return toast.error("Check-out must be after check-in");
    setSaving(true);
    const { data, error } = await supabase
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
        total_price: total,
        status: "confirmed",
        payment_status: "pending",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setConfirmed(data.id);
  }

  if (!room || !hotel) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading…</div>
      </SiteLayout>
    );
  }

  if (confirmed) {
    return (
      <SiteLayout>
        <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-16">
          <Card className="w-full max-w-lg p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-gold" />
            <h1 className="mt-4 font-display text-3xl font-semibold">Booking confirmed</h1>
            <p className="mt-2 text-muted-foreground">
              A confirmation has been recorded. Reference: <span className="font-mono text-foreground">{confirmed.slice(0, 8)}</span>
            </p>
            <div className="mt-6 grid gap-2 rounded-lg bg-muted/40 p-4 text-left text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Hotel</span><span>{hotel.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Room</span><span>{room.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Check-in</span><span>{checkIn}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Check-out</span><span>{checkOut}</span></div>
              <div className="flex justify-between font-medium"><span>Total</span><span className="text-gold">${total.toFixed(2)}</span></div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button asChild variant="outline" className="flex-1"><Link to="/dashboard/bookings">My bookings</Link></Button>
              <Button asChild className="flex-1 bg-gold text-gold-foreground hover:bg-gold/90"><Link to="/hotels">Browse more</Link></Button>
            </div>
          </Card>
        </div>
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
                  <Input id="p" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="r">Special requests</Label>
                  <Textarea id="r" rows={3} value={requests} onChange={(e) => setRequests(e.target.value)} />
                </div>
              </div>
            </Card>
          </div>
          <aside>
            <Card className="sticky top-20 p-6">
              <h3 className="mb-4 font-display text-lg font-semibold">Price summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{room.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">${Number(room.price_per_night).toFixed(0)} × {nights} night(s)</span><span>${total.toFixed(2)}</span></div>
              </div>
              <div className="mt-4 border-t border-border/60 pt-4">
                <div className="flex justify-between font-display text-lg font-semibold">
                  <span>Total</span><span className="text-gold">${total.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Pay at hotel — no card required.</p>
              </div>
              <Button type="submit" disabled={saving || !user} className="mt-6 w-full bg-gold text-gold-foreground hover:bg-gold/90">
                {!user ? "Sign in to book" : saving ? "Confirming…" : "Confirm booking"}
              </Button>
              {!user && (
                <Button asChild variant="outline" className="mt-2 w-full">
                  <Link to="/auth/login">Sign in</Link>
                </Button>
              )}
            </Card>
          </aside>
        </form>
      </div>
    </SiteLayout>
  );
}
