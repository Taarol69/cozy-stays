import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, MapPin, Calendar, Users, Sparkles, Shield, Award } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HotelCard } from "@/components/HotelCard";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Hotel = Database["public"]["Tables"]["hotels"]["Row"];

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [featured, setFeatured] = useState<Hotel[]>([]);

  useEffect(() => {
    supabase
      .from("hotels")
      .select("*")
      .order("rating", { ascending: false })
      .limit(6)
      .then(({ data }) => setFeatured(data ?? []));
  }, []);

  function search(e: React.FormEvent) {
    e.preventDefault();
    navigate({
      to: "/hotels",
      search: { location, checkIn, checkOut, guests },
    });
  }

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=2000&q=80"
            alt="Luxury hotel lobby"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        </div>

        <div className="container mx-auto px-4 pt-24 pb-32 md:pt-32 md:pb-40">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-gold">
              Curated · Luxury · Effortless
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight md:text-6xl">
              Find your next <span className="text-gold">extraordinary</span> stay
            </h1>
            <p className="mt-5 text-base text-muted-foreground md:text-lg">
              Hand-picked hotels and resorts. Transparent pricing. Booking in under a minute.
            </p>
          </div>

          {/* Search box */}
          <form
            onSubmit={search}
            className="mx-auto mt-10 max-w-5xl rounded-2xl border border-border/60 bg-card/90 p-3 shadow-2xl backdrop-blur-md md:p-4"
          >
            <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_0.7fr_auto]">
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where are you going?"
                  className="border-0 p-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="border-0 p-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="border-0 p-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="border-0 p-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="bg-gold text-gold-foreground hover:bg-gold/90"
              >
                <Search className="mr-2 h-4 w-4" /> Search
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-gold">Editor's pick</p>
            <h2 className="font-display text-3xl font-semibold md:text-4xl">Featured hotels</h2>
          </div>
          <Button asChild variant="ghost" className="hidden md:inline-flex">
            <Link to="/hotels">View all →</Link>
          </Button>
        </div>

        {featured.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">
            No hotels yet. {" "}
            <Link to="/admin" className="text-gold hover:underline">
              Sign in as admin to add hotels.
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((h) => (
              <HotelCard key={h.id} hotel={h} />
            ))}
          </div>
        )}
      </section>

      {/* Value props */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="container mx-auto grid gap-8 px-4 py-16 md:grid-cols-3">
          {[
            { Icon: Sparkles, title: "Hand-curated", body: "Every property is personally reviewed for quality, design, and service." },
            { Icon: Shield, title: "Best price guarantee", body: "Find a lower rate elsewhere and we'll refund the difference." },
            { Icon: Award, title: "Concierge support", body: "Real humans, 24/7, ready to help before, during, and after your stay." },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
