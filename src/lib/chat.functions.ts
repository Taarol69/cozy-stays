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
- Find their bookings under /dashboard/bookings, favorites under /dashboard/favorites
- Explain that admins manage hotels/rooms at /admin

Style: warm, concise, use markdown (short paragraphs, bullets, **bold** for key info). When suggesting a page, give the path in backticks, e.g. \`/hotels\`. If you don't know a specific hotel, recommend browsing \`/hotels\` and using filters. Never invent prices or availability — refer the user to the live listing.`;

export const chatWithAssistant = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    // Lightweight live context so the assistant can give real suggestions.
    const { data: hotels } = await supabaseAdmin
      .from("hotels")
      .select("name, city, country, star_rating, rating, price_from")
      .order("rating", { ascending: false })
      .limit(8);

    const hotelContext = (hotels ?? [])
      .map(
        (h) =>
          `- ${h.name} — ${h.city}, ${h.country} · ${h.star_rating}★ · rating ${h.rating} · from $${Number(h.price_from).toFixed(0)}/night`,
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
