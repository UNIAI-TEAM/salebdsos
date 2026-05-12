import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, BadgeCheck } from "lucide-react";

const getPublicCard = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { data: card, error } = await supabaseAdmin
      .from("cards")
      .select("id, slug, display_name, title, company, bio, avatar_url, theme, fields, tenant_id")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !card) throw notFound();
    return card;
  });

const TEMPLATES: Record<string, { bg: string; text: string }> = {
  "luxury-dark": { bg: "from-slate-800 via-slate-900 to-black", text: "text-white" },
  "skyline": { bg: "from-sky-500 via-indigo-600 to-violet-700", text: "text-white" },
  "minimal": { bg: "from-zinc-50 to-zinc-100", text: "text-zinc-900" },
  "premium": { bg: "from-violet-700 via-fuchsia-700 to-rose-600", text: "text-white" },
  "ocean": { bg: "from-blue-900 via-cyan-700 to-teal-700", text: "text-white" },
};

export const Route = createFileRoute("/c/$slug")({
  loader: ({ params }) => getPublicCard({ data: { slug: params.slug } }),
  component: PublicCard,
  head: ({ loaderData }) => {
    const c = loaderData;
    const title = c ? `${c.display_name}${c.title ? ` — ${c.title}` : ""}${c.company ? ` · ${c.company}` : ""}` : "Digital Card";
    const desc = c?.bio || (c ? `Danh thiếp điện tử của ${c.display_name}` : "Digital business card");
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        ...(c?.avatar_url ? [{ property: "og:image", content: c.avatar_url }] as const : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

function PublicCard() {
  const card = Route.useLoaderData();
  const themeKey = (card.theme as any)?.template ?? "luxury-dark";
  const primary = (card.theme as any)?.primary ?? "#A855F7";
  const tmpl = TEMPLATES[themeKey] ?? TEMPLATES["luxury-dark"];

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("utm_source")) return;
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
  }, [card.id, card.tenant_id]);

  const fields = (Array.isArray(card.fields) ? card.fields : []) as { type?: string; label: string; value?: string; href?: string }[];

  return (
    <main className={`min-h-screen bg-gradient-to-b ${tmpl.bg} ${tmpl.text}`}>
      <div className="max-w-md mx-auto px-5 pt-10 pb-12">
        <header className="text-center">
          <div className="h-24 w-24 mx-auto rounded-full bg-white/10 overflow-hidden ring-2 ring-white/20">
            {card.avatar_url ? (
              <img src={card.avatar_url} alt={card.display_name} className="h-full w-full object-cover" loading="eager" />
            ) : (
              <div className="h-full w-full grid place-items-center"><User className="h-9 w-9 opacity-60" /></div>
            )}
          </div>
          {card.company && (
            <div className="mt-3 inline-flex items-center gap-1 text-xs opacity-85">
              {card.company} <BadgeCheck className="h-3.5 w-3.5" />
            </div>
          )}
          <h1 className="mt-1 text-2xl font-bold leading-tight">{card.display_name}</h1>
          {card.title && <p className="text-sm opacity-85">{card.title}</p>}
          {card.bio && <p className="mt-3 text-[13px] opacity-90 leading-relaxed">{card.bio}</p>}
        </header>

        <nav className="mt-7 space-y-2.5" aria-label="Liên hệ">
          {fields.map((f, i) => {
            const isCta = f.type === "cta";
            return (
              <a
                key={i}
                href={f.href || "#"}
                target={f.href?.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="block w-full text-center rounded-xl py-3.5 text-sm font-semibold backdrop-blur transition active:scale-[0.98]"
                style={{ backgroundColor: isCta ? primary : "rgba(255,255,255,0.14)" }}
              >
                {f.label}
              </a>
            );
          })}
          {fields.length === 0 && (
            <p className="text-center text-xs opacity-60 py-4">Chưa có thông tin liên hệ</p>
          )}
        </nav>

        <footer className="mt-10 text-center text-[11px] opacity-60">
          Tạo bởi NFC Platform · BĐS
        </footer>
      </div>
    </main>
  );
}
