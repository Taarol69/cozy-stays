import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Our story</p>
        <h1 className="font-display text-4xl font-semibold">About AuréStay</h1>
        <div className="mt-8 space-y-5 text-muted-foreground leading-relaxed">
          <p>
            AuréStay began with a simple belief: where you stay shapes how you travel.
            We exist to make discovering and booking exceptional hotels feel effortless,
            personal, and a little bit magical.
          </p>
          <p>
            Every property in our collection is reviewed by a real human — for design,
            service, location, and that intangible quality that makes a stay memorable.
            No paid placements, no inflated ratings, no surprise fees.
          </p>
          <p>
            From boutique city retreats to coastal hideaways, we curate stays you'd
            recommend to your closest friends — because that's exactly what we're doing.
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}
