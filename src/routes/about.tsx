import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">हाम्रो कथा · Our story</p>
        <h1 className="font-display text-4xl font-semibold">About HimalStay</h1>
        <div className="mt-8 space-y-5 text-muted-foreground leading-relaxed">
          <p>
            HimalStay is a Nepal-first hotel booking platform. From the temples of
            Kathmandu and the lakeside of Pokhara to the jungles of Chitwan and the
            trails of the Himalayas, we make finding and booking exceptional stays
            feel effortless.
          </p>
          <p>
            Every property in our collection is reviewed by a real human — for
            design, service, location, and that intangible quality that makes a
            stay memorable. No paid placements. No inflated ratings. No surprise fees.
          </p>
          <p>
            Prices are shown in Nepali Rupees (रू) with the live USD equivalent,
            so international travellers always know exactly what they're paying.
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}
