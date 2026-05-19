import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/bookings")({
  component: MyBookings,
});

interface BookingRow {
  id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  total_price: number;
  status: string;
  payment_status: string;
  hotels: { id: string; name: string; city: string; country: string; cover_image: string | null } | null;
  rooms: { id: string; name: string } | null;
}

function MyBookings() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("bookings")
      .select("id, check_in, check_out, nights, guests, total_price, status, payment_status, hotels(id,name,city,country,cover_image), rooms(id,name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as any) ?? []));
  }, [user]);

  async function cancel(id: string) {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    setRows((r) => r.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
  }

  if (!loading && !user) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Please sign in to view your bookings.</p>
          <Button asChild className="mt-4"><Link to="/auth/login">Sign in</Link></Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">My bookings</h1>
        <p className="text-muted-foreground">{rows.length} total</p>

        <div className="mt-8 space-y-4">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
              No bookings yet.{" "}
              <Link to="/hotels" className="text-gold hover:underline">Browse hotels</Link>
            </div>
          ) : (
            rows.map((b) => (
              <Card key={b.id} className="overflow-hidden p-0">
                <div className="grid gap-4 md:grid-cols-[200px_1fr_auto] md:items-center">
                  <img
                    src={b.hotels?.cover_image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80"}
                    alt=""
                    className="h-40 w-full object-cover md:h-full"
                  />
                  <div className="p-4">
                    <h3 className="font-display text-lg font-semibold">{b.hotels?.name}</h3>
                    <p className="text-xs text-muted-foreground">{b.hotels?.city}, {b.hotels?.country} · {b.rooms?.name}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">{b.check_in} → {b.check_out}</Badge>
                      <Badge variant="outline">{b.nights} night(s)</Badge>
                      <Badge variant="outline">{b.guests} guests</Badge>
                      <Badge className={b.status === "cancelled" ? "bg-destructive text-destructive-foreground" : "bg-gold text-gold-foreground"}>
                        {b.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 p-4">
                    <div className="font-display text-2xl font-semibold text-gold">${Number(b.total_price).toFixed(2)}</div>
                    {b.status === "confirmed" && (
                      <Button variant="outline" size="sm" onClick={() => cancel(b.id)}>Cancel</Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
