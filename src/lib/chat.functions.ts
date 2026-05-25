import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
});

const SYSTEM_PROMPT = `You are HimalStay's friendly booking concierge for a Nepal-focused hotel booking app.

You help guests:
- Discover hotels (by city, vibe, price, star rating, amenities)
- Understand rooms, prices (shown in NPR with USD reference), check-in/out, nights
- Walk through the booking flow: pick a hotel → pick a room → fill guest details → pay with Khalti (sandbox) or "Pay at hotel"
- Find their bookings under "My Bookings" and favorites under "My Favorites"

LINK RULES (very important):
- ALWAYS write site links as proper markdown links: [Browse all hotels](/hotels), [My Bookings](/dashboard/bookings), [My Favorites](/dashboard/favorites).
- When you mention a specific hotel from the catalog, link to that hotel's page using its id, e.g. [Hotel Everest View](/hotels/<id>). The hotel ids are given to you below.
- Never write a bare path like \`/hotels\` — always wrap it in a friendly label like [our hotel collection](/hotels).
- Never invent hotel ids or prices. Only use the ones listed in the catalog context.

Style: warm, concise, use markdown (short paragraphs, bullets, **bold** for key info). If unsure about availability, point them to [our hotel collection](/hotels) and the filters there.`;

export const chatWithAssistant = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    // Lightweight live context so the assistant can give real suggestions.
    const { data: hotels } = await supabaseAdmin
      .from("hotels")
      .select("id, name, city, country, star_rating, rating, price_from")
      .order("rating", { ascending: false })
      .limit(12);

    const hotelContext = (hotels ?? [])
      .map(
        (h) =>
          `- [${h.name}](/hotels/${h.id}) — ${h.city}, ${h.country} · ${h.star_rating}★ · rating ${h.rating} · from $${Number(h.price_from).toFixed(0)}/night`,
      )
      .join("\n");


    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "system",
            content: `Top hotels currently in the catalog:\n${hotelContext || "(none yet)"}`,
          },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) throw new Error("Too many requests — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("AI gateway error", res.status, t);
      throw new Error("AI service is unavailable right now.");
    }

    const body = await res.json();
    const reply: string = body?.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a reply.";
    return { reply };
  });
