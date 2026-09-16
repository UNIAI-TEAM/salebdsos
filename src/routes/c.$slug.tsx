import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, BadgeCheck, Phone, MessageCircle, Download, Share2, MapPin, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

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
    const { data: blocks } = await supabaseAdmin
      .from("card_blocks")
      .select("id, block_type, position, config")
      .eq("card_id", card.id)
      .eq("is_visible", true)
      .is("deleted_at", null)
      .order("position", { ascending: true });

    // Dự án sale đang bán (gắn trong app) + landing công khai tương ứng
    const { data: links } = await supabaseAdmin
      .from("card_projects")
      .select("project_id, position")
      .eq("card_id", card.id)
      .order("position", { ascending: true });

    const projectIds = (links ?? []).map((l) => l.project_id);
    let projects: {
      id: string; name: string; city: string | null; status: string | null;
      price_from: number | null; currency: string | null;
      cover_url: string | null; cover_mobile_url: string | null;
      landing_slug: string | null;
    }[] = [];

    if (projectIds.length) {
      const [{ data: rows }, { data: pages }] = await Promise.all([
        supabaseAdmin
          .from("projects")
          .select("id, name, city, status, price_from, currency, cover_url, cover_mobile_url")
          .in("id", projectIds)
          .is("deleted_at", null),
        supabaseAdmin
          .from("ai_sales_pages")
          .select("project_id, slug, updated_at")
          .in("project_id", projectIds)
          .eq("is_published", true)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false }),
      ]);
      const slugByProject = new Map<string, string>();
      for (const p of pages ?? []) {
        if (p.project_id && p.slug && !slugByProject.has(p.project_id)) {
          slugByProject.set(p.project_id, p.slug);
        }
      }
      projects = projectIds
        .map((id) => (rows ?? []).find((r) => r.id === id))
        .filter(Boolean)
        .map((r) => ({ ...(r as any), landing_slug: slugByProject.get((r as any).id) ?? null }));
    }

    return { ...card, blocks: blocks ?? [], projects };
  });


const TEMPLATES: Record<string, { bg: string; text: string }> = {
  "luxury-dark": { bg: "from-slate-900 via-[#0B0F1A] to-black", text: "text-white" },
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

  const blocks = (Array.isArray((card as any).blocks) ? (card as any).blocks : []) as {
    id: string; block_type: string; position: number; config: Record<string, unknown> | null;
  }[];
  const fields = (Array.isArray(card.fields) ? card.fields : []) as { type?: string; label: string; value?: string; href?: string }[];
  const projects = ((card as any).projects ?? []) as {
    id: string; name: string; city: string | null; status: string | null;
    price_from: number | null; currency: string | null;
    cover_url: string | null; cover_mobile_url: string | null; landing_slug: string | null;
  }[];

  const phone = fields.find((f) => f.type === "phone")?.value ?? null;
  const zalo = fields.find((f) => f.type === "zalo");

  const trackProjectClick = (projectId: string) => {
    supabase.from("interaction_events").insert({
      card_id: card.id,
      tenant_id: card.tenant_id,
      source: "project_click",
      referrer: projectId,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    }).then(() => {});
  };

  const saveContact = () => {
    const lines = [
      "BEGIN:VCARD", "VERSION:3.0",
      `FN:${card.display_name}`,
      card.company ? `ORG:${card.company}` : "",
      card.title ? `TITLE:${card.title}` : "",
      phone ? `TEL;TYPE=CELL:${phone}` : "",
      `URL:${typeof window !== "undefined" ? window.location.href : ""}`,
      "END:VCARD",
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${card.slug}.vcf`; a.click();
    URL.revokeObjectURL(url);
  };

  const shareCard = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: card.display_name, url }); return; } catch { /* ignore */ }
    }
    if (typeof navigator !== "undefined") navigator.clipboard?.writeText(url);
  };

  const money = (v: number | null, cur: string | null) =>
    v == null ? null : `từ ${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ${cur && cur !== "VND" ? ` ${cur}` : ""}`;


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

        {/* Nút nhanh */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {[
            { label: "Gọi", icon: Phone, href: phone ? `tel:${phone.replace(/\s/g, "")}` : null, onClick: undefined as (() => void) | undefined },
            { label: "Zalo", icon: MessageCircle, href: zalo?.href ?? null, onClick: undefined },
            { label: "Lưu liên hệ", icon: Download, href: null, onClick: saveContact },
            { label: "Chia sẻ", icon: Share2, href: null, onClick: shareCard },
          ]
            .filter((a) => a.href || a.onClick)
            .map((a) =>
              a.href ? (
                <a
                  key={a.label}
                  href={a.href}
                  className="rounded-2xl bg-white/12 backdrop-blur py-3 grid place-items-center gap-1 text-[11px] font-semibold active:scale-[0.97] transition"
                >
                  <a.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                  {a.label}
                </a>
              ) : (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className="rounded-2xl bg-white/12 backdrop-blur py-3 grid place-items-center gap-1 text-[11px] font-semibold active:scale-[0.97] transition"
                >
                  <a.icon style={{ width: 18, height: 18 }} />
                  {a.label}
                </button>
              ),
            )}
        </div>

        <nav className="mt-4 space-y-2.5" aria-label="Liên hệ">
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

        {/* Dự án đang bán */}
        {projects.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[15px] font-semibold">Dự án tôi đang bán</h2>
            <div className="mt-3 space-y-3">
              {projects.map((p) => {
                const inner = (
                  <>
                    <div className="h-36 w-full bg-white/10">
                      {(p.cover_mobile_url || p.cover_url) && (
                        <img
                          src={p.cover_mobile_url || p.cover_url || ""}
                          srcSet={
                            p.cover_mobile_url && p.cover_url
                              ? `${p.cover_mobile_url} 800w, ${p.cover_url} 1600w`
                              : undefined
                          }
                          sizes="(max-width: 640px) 100vw, 448px"
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-3.5">
                      <div className="text-[14px] font-semibold leading-snug">{p.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-[11.5px] opacity-80">
                        {p.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin style={{ width: 12, height: 12 }} /> {p.city}
                          </span>
                        )}
                        {money(p.price_from, p.currency) && <span>· {money(p.price_from, p.currency)}</span>}
                      </div>
                      {p.landing_slug && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: primary }}>
                          Xem chi tiết & brochure <ArrowRight style={{ width: 13, height: 13 }} />
                        </div>
                      )}
                    </div>
                  </>
                );
                const cls = "block rounded-2xl overflow-hidden bg-white/10 backdrop-blur active:scale-[0.99] transition";
                return p.landing_slug ? (
                  <a key={p.id} href={`/p/${p.landing_slug}`} onClick={() => trackProjectClick(p.id)} className={cls}>
                    {inner}
                  </a>
                ) : (
                  <div key={p.id} className={cls}>{inner}</div>
                );
              })}
            </div>
          </section>
        )}

        {/* Khách để lại thông tin */}
        <LeadForm slug={card.slug} primary={primary} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />


        {blocks.length > 0 && (
          <section className="mt-8 space-y-4">
            {blocks.map((b) => {
              const cfg = (b.config ?? {}) as Record<string, any>;
              const items: any[] = Array.isArray(cfg.items) ? cfg.items : [];
              return (
                <article key={b.id} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  {cfg.title && <h2 className="text-[15px] font-semibold">{cfg.title}</h2>}
                  {cfg.text && <p className="mt-1.5 text-[13px] leading-relaxed opacity-90">{cfg.text}</p>}
                  {items.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {items.map((it, i) => (
                        <li key={i} className="text-[13px] opacity-90">
                          {it.href ? (
                            <a href={it.href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                              {it.label ?? it.title ?? it.href}
                            </a>
                          ) : (
                            <>{it.label ?? it.title ?? String(it)}</>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {cfg.image && (
                    <img src={cfg.image} alt={cfg.title ?? "Hình ảnh"} loading="lazy" className="mt-3 w-full rounded-xl object-cover" />
                  )}
                </article>
              );
            })}
          </section>
        )}

        <footer className="mt-10 text-center text-[11px] opacity-60">
          Tạo bởi SaleBDS OS · BĐS
        </footer>
      </div>
    </main>
  );
}

function LeadForm({
  slug, primary, projects,
}: { slug: string; primary: string; projects: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending"); setError(null);
    try {
      const res = await fetch(`/api/public/card-leads/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, phone, project_id: projectId || null, notes: notes || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Không gửi được, vui lòng thử lại.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được.");
      setState("idle");
    }
  };

  const input = "w-full rounded-xl bg-white/12 backdrop-blur px-3.5 py-3 text-[13.5px] placeholder:opacity-60 outline-none focus:ring-2 focus:ring-white/30";

  if (state === "done") {
    return (
      <section className="mt-8 rounded-2xl bg-white/10 backdrop-blur p-5 text-center">
        <CheckCircle2 className="h-7 w-7 mx-auto" />
        <div className="mt-2 text-[14px] font-semibold">Đã nhận thông tin của bạn</div>
        <p className="mt-1 text-[12.5px] opacity-80">Tôi sẽ liên hệ lại trong thời gian sớm nhất.</p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl bg-white/10 backdrop-blur p-4">
      <h2 className="text-[15px] font-semibold">Để lại thông tin, tôi tư vấn ngay</h2>
      <form className="mt-3 space-y-2.5" onSubmit={submit}>
        <input className={input} placeholder="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={input} placeholder="Số điện thoại" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        {projects.length > 0 && (
          <select className={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Dự án quan tâm (tuỳ chọn)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>
            ))}
          </select>
        )}
        <textarea className={input} rows={2} placeholder="Nhu cầu, ngân sách… (tuỳ chọn)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <p className="text-[12px] text-red-200">{error}</p>}
        <button
          type="submit"
          disabled={state === "sending"}
          className="w-full rounded-xl py-3.5 text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2 active:scale-[0.98] transition"
          style={{ backgroundColor: primary }}
        >
          {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
          Gửi thông tin
        </button>
        <p className="text-[11px] opacity-60 text-center">Thông tin chỉ dùng để liên hệ tư vấn.</p>
      </form>
    </section>
  );
}

