import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Hotel } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // Check role and route accordingly
    const uid = data.user?.id;
    let isAdmin = false;
    if (uid) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      isAdmin = (roles ?? []).some((r) => r.role === "admin");
    }
    setLoading(false);
    toast.success("Welcome back");
    navigate({ to: isAdmin ? "/admin" : "/" });
  }

  return (
    <SiteLayout>
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md p-8">
          <div className="mb-6 text-center">
            <Hotel className="mx-auto h-8 w-8 text-gold" />
            <h1 className="mt-3 font-display text-2xl font-semibold">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your AuréStay account</p>
          </div>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/auth/register" className="text-gold hover:underline">Create one</Link>
          </p>
        </Card>
      </div>
    </SiteLayout>
  );
}
