import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Hotel, Bed, CalendarCheck, ShieldAlert } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const items = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/hotels", label: "Hotels", icon: Hotel },
  { to: "/admin/rooms", label: "Rooms", icon: Bed },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  const [claiming, setClaiming] = useState(false);
  const [anyAdmin, setAnyAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || isAdmin) return;
    // best-effort check: anyone can read their own row, admins read all
    // We rely on RPC to bootstrap, so just show the claim button if not admin
    setAnyAdmin(false);
  }, [user, isAdmin]);

  async function claim() {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_admin_if_none");
    setClaiming(false);
    if (error) return toast.error(error.message);
    if (data) {
      toast.success("You are now admin. Reloading…");
      setTimeout(() => window.location.reload(), 600);
    } else {
      toast.error("An admin already exists. Ask them to grant you access.");
    }
  }

  if (loading) {
    return <div className="p-10 text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-4 font-display text-2xl">Admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please sign in to continue.</p>
          <Button asChild className="mt-4"><Link to="/auth/login">Sign in</Link></Button>
        </div>
      </>
    );
  }
  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-4 font-display text-2xl">Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have admin permissions. If you're the first user setting up this site, claim admin below.
          </p>
          <Button onClick={claim} disabled={claiming} className="mt-4 bg-gold text-gold-foreground hover:bg-gold/90">
            {claiming ? "Claiming…" : "Claim admin role"}
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container mx-auto flex-1 grid gap-6 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <p className="px-3 pb-2 text-xs uppercase tracking-wider text-muted-foreground">Admin</p>
          {items.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-gold/15 text-gold" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </aside>
        <main>{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
