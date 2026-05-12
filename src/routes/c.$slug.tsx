// Public card page. If user lands here directly (not via /t/<code>),
// log a "direct" or "link" event from the client side via beacon.
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const getPublicCard = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { data: card, error } = await supabaseAdmin
      .from("cards")
      .select("id, slug, display_name, title, company, bio, avatar_url, theme, fields, tenant_id")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error || !card) throw notFound();
    return card;
  });

export const Route = createFileRoute("/c/$slug")({
  loader: ({ params }) => getPublicCard({ data: { slug: params.slug } }),
  component: PublicCard,
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.display_name} — Digital Card` : "Card" },
      { name: "description", content: loaderData?.bio || "Digital business card" },
    ],
  }),
});

function PublicCard() {
  const card = Route.useLoaderData();
  const search = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const utm = search.get("utm_source");

  useEffect(() => {
    // If no utm_source → direct visit → log it (NFC/QR/link redirects already logged server-side).
    if (utm) return;
    const ref = document.referrer;
    let source: "direct" | "social" | "link" = "direct";
    if (ref) {
      if (/facebook|instagram|tiktok|zalo|linkedin|twitter|x\.com|youtube/i.test(ref)) source = "social";
      else source = "link";
    }
    supabase.from("interaction_events").insert({
      card_id: card.id,
      tenant_id: card.tenant_id,
      source,
      referrer: ref || null,
      user_agent: navigator.userAgent.slice(0, 500),
    }).then(() => {});
  }, [card.id, card.tenant_id, utm]);

  const fields = (Array.isArray(card.fields) ? card.fields : []) as { label: string; value: string; href?: string }[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-10 px-4">
      <div className="max-w-md mx-auto bg-card border rounded-3xl p-6 shadow-lg">
        {card.avatar_url && (
          <img src={card.avatar_url} alt={card.display_name} className="h-24 w-24 rounded-full mx-auto mb-4 object-cover" />
        )}
        <h1 className="text-2xl font-bold text-center">{card.display_name}</h1>
        {card.title && <p className="text-center text-muted-foreground">{card.title}</p>}
        {card.company && <p className="text-center text-sm text-muted-foreground">{card.company}</p>}
        {card.bio && <p className="text-center mt-3 text-sm">{card.bio}</p>}
        <div className="mt-6 space-y-2">
          {fields.map((f, i) => (
            <a
              key={i}
              href={f.href || "#"}
              className="block w-full text-center bg-secondary hover:bg-secondary/80 rounded-xl py-3 text-sm font-medium transition"
            >
              {f.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
