import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({ component: Contact });

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <SiteLayout>
      <div className="container mx-auto max-w-5xl px-4 py-16">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Contact</p>
        <h1 className="font-display text-4xl font-semibold">We're here to help</h1>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <div className="space-y-5 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-gold" />
              <div><div className="font-medium">Email</div><div className="text-muted-foreground">hello@aurestay.com</div></div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-gold" />
              <div><div className="font-medium">Phone</div><div className="text-muted-foreground">+1 (555) 010-2024</div></div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-gold" />
              <div><div className="font-medium">Office</div><div className="text-muted-foreground">100 Park Avenue, New York, NY</div></div>
            </div>
          </div>
          <Card className="p-6">
            {sent ? (
              <div className="text-center">
                <h3 className="font-display text-xl">Thanks — we'll be in touch.</h3>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                  toast.success("Message sent");
                }}
              >
                <div><Label htmlFor="cn">Name</Label><Input id="cn" required /></div>
                <div><Label htmlFor="ce">Email</Label><Input id="ce" type="email" required /></div>
                <div><Label htmlFor="cm">Message</Label><Textarea id="cm" rows={4} required /></div>
                <Button type="submit" className="w-full bg-gold text-gold-foreground hover:bg-gold/90">Send message</Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
