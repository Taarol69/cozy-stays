import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hotel, Bed, CalendarCheck, DollarSign } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const [stats, setStats] = useState({ hotels: 0, rooms: 0, bookings: 0, revenue: 0 });
  const [chart, setChart] = useState<{ day: string; revenue: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [h, r, b] = await Promise.all([
        supabase.from("hotels").select("id", { count: "exact", head: true }),
        supabase.from("rooms").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("total_price, created_at, status"),
      ]);
      const bookings = b.data ?? [];
      const revenue = bookings
        .filter((x: any) => x.status !== "cancelled")
        .reduce((s: number, x: any) => s + Number(x.total_price), 0);
      setStats({
        hotels: h.count ?? 0,
        rooms: r.count ?? 0,
        bookings: bookings.length,
        revenue,
      });

      // last 14 days
      const byDay = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        byDay.set(d.toISOString().slice(0, 10), 0);
      }
      bookings.forEach((x: any) => {
        if (x.status === "cancelled") return;
        const day = (x.created_at as string).slice(0, 10);
        if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + Number(x.total_price));
      });
      setChart([...byDay.entries()].map(([day, revenue]) => ({ day: day.slice(5), revenue })));
    })();
  }, []);

  const cards = [
    { label: "Hotels", value: stats.hotels, Icon: Hotel },
    { label: "Rooms", value: stats.rooms, Icon: Bed },
    { label: "Bookings", value: stats.bookings, Icon: CalendarCheck },
    { label: "Revenue", value: `$${stats.revenue.toFixed(0)}`, Icon: DollarSign },
  ];

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">Overview of your business</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-gold" />
            </div>
            <div className="mt-3 font-display text-3xl font-semibold">{value}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-xl font-semibold">Revenue (last 14 days)</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(v: any) => [`$${v}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="var(--gold)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </AdminShell>
  );
}
