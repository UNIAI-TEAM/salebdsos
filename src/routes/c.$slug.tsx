import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, BadgeCheck, Phone, MessageCircle, Download, Share2, MapPin, ArrowRight, Loader2, CheckCircle2, Building2, Check } from "lucide-react";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";

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
  const [origin, setOrigin] = useState("");
  const [shared, setShared] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

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
    if (typeof navigator !== "undefined") {
      await navigator.clipboard?.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    }
  };

  const money = (v: number | null, cur: string | null) =>
    v == null ? null : `từ ${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ${cur && cur !== "VND" ? ` ${cur}` : ""}`;


  return (
    <main className="min-h-screen overflow-hidden bg-digital-canvas font-card-sans text-digital-ink">
      <div className="relative mx-auto max-w-md px-5 pb-12 pt-[max(2rem,env(safe-area-inset-top))]">
        <section className="digital-card-glass overflow-hidden rounded-3xl border border-digital-ink/10 px-5 pb-6 pt-8 shadow-2xl">
        <header className="text-center">
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-digital-glass ring-2 ring-digital-blue ring-offset-4 ring-offset-digital-surface">
            {card.avatar_url ? (
              <img src={card.avatar_url} alt={card.display_name} className="h-full w-full object-cover" loading="eager" />
            ) : (
              <div className="h-full w-full grid place-items-center"><User className="h-9 w-9 opacity-60" /></div>
            )}
          </div>
          <h1 className="mt-5 font-card-serif text-2xl font-bold leading-tight">{card.display_name}</h1>
          {card.title && <p className="mt-2 text-xs font-semibold uppercase text-digital-blue">{card.title}</p>}
          {card.company && <div className="mt-1 inline-flex items-center gap-1 text-xs text-digital-ink/50">{card.company} <BadgeCheck className="h-3.5 w-3.5" /></div>}
        </header>

        <div className="mt-7 rounded-3xl bg-digital-ink p-4 shadow-xl shadow-digital-blue/10">
          <QrCode value={origin ? `${origin}/c/${card.slug}?utm_source=qr_card` : `/c/${card.slug}?utm_source=qr_card`} size={224} showDownload={false} />
        </div>
        <p className="mt-3 text-center text-xs italic text-digital-ink/45">Quét mã để lưu thông tin liên hệ ngay</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {phone && <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-digital-blue text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"><Phone className="h-4 w-4" />Gọi điện</a>}
          {zalo?.href && <a href={zalo.href} target="_blank" rel="noreferrer" className="digital-card-glass flex min-h-12 items-center justify-center gap-2 rounded-xl border border-digital-ink/10 text-sm font-semibold transition active:scale-[0.98]"><MessageCircle className="h-4 w-4" />Zalo</a>}
          <Button type="button" variant="ghost" onClick={saveContact} className="digital-card-glass col-span-2 h-12 rounded-xl border border-digital-ink/10 text-digital-ink hover:bg-digital-glass hover:text-digital-ink"><Download className="h-4 w-4" />Lưu danh bạ</Button>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-digital-ink/10 pt-5 text-sm">
          <Button type="button" variant="ghost" onClick={shareCard} className="h-10 px-2 text-digital-ink/60 hover:bg-digital-glass hover:text-digital-ink">
            {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}{shared ? "Đã sao chép" : "Chia sẻ"}
          </Button>
          {projects.length > 0 && <a href="#projects" className="inline-flex min-h-10 items-center gap-1 font-semibold text-digital-blue">Xem danh sách dự án <ArrowRight className="h-4 w-4" /></a>}
        </div>
        </section>

        {card.bio && <p className="mx-auto mt-6 max-w-sm text-center text-[13px] leading-relaxed text-digital-ink/65">{card.bio}</p>}

        <nav className="mt-6 space-y-2.5" aria-label="Liên hệ">
          {fields.filter((f) => !["phone", "zalo"].includes(f.type ?? "")).map((f, i) => {
            return (
              <a
                key={i}
                href={f.href || "#"}
                target={f.href?.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className={`digital-card-glass block w-full rounded-xl border py-3.5 text-center text-sm font-semibold transition active:scale-[0.98] ${f.type === "cta" ? "border-digital-blue bg-digital-blue text-primary-foreground" : "border-digital-ink/10"}`}
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
          <section id="projects" className="mt-10 scroll-mt-5">
            <h2 className="flex items-center gap-2 font-card-serif text-lg font-bold"><Building2 className="h-5 w-5 text-digital-blue" />Dự án tôi đang bán</h2>
            <div className="mt-3 space-y-3">
              {projects.map((p) => {
                const inner = (
                  <>
                    <div className="h-36 w-full bg-digital-glass">
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
                        <div className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-digital-blue">
                          Xem chi tiết & brochure <ArrowRight style={{ width: 13, height: 13 }} />
                        </div>
                      )}
                    </div>
                  </>
                );
                const cls = "digital-card-glass block overflow-hidden rounded-2xl border border-digital-ink/10 active:scale-[0.99] transition";
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
        <LeadForm slug={card.slug} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />


        {blocks.length > 0 && (
          <section className="mt-8 space-y-4">
            {blocks.map((b) => {
              const cfg = (b.config ?? {}) as Record<string, any>;
              const items: any[] = Array.isArray(cfg.items) ? cfg.items : [];
              return (
                <article key={b.id} className="digital-card-glass rounded-2xl border border-digital-ink/10 p-4">
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
  slug, projects,
}: { slug: string; projects: { id: string; name: string }[] }) {
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

  const input = "digital-card-glass w-full rounded-xl border border-digital-ink/10 px-3.5 py-3 text-[13.5px] text-digital-ink placeholder:text-digital-ink/45 outline-none focus:ring-2 focus:ring-digital-blue/50";

  if (state === "done") {
    return (
      <section className="digital-card-glass mt-8 rounded-2xl border border-digital-ink/10 p-5 text-center">
        <CheckCircle2 className="h-7 w-7 mx-auto" />
        <div className="mt-2 text-[14px] font-semibold">Đã nhận thông tin của bạn</div>
        <p className="mt-1 text-[12.5px] opacity-80">Tôi sẽ liên hệ lại trong thời gian sớm nhất.</p>
      </section>
    );
  }

  return (
    <section className="digital-card-glass mt-8 rounded-2xl border border-digital-ink/10 p-4">
      <h2 className="text-[15px] font-semibold">Để lại thông tin, tôi tư vấn ngay</h2>
      <form className="mt-3 space-y-2.5" onSubmit={submit}>
        <input className={input} placeholder="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={input} placeholder="Số điện thoại" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        {projects.length > 0 && (
          <select className={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Dự án quan tâm (tuỳ chọn)</option>
            {projects.map((p) => (
            <option key={p.id} value={p.id} className="text-foreground">{p.name}</option>
            ))}
          </select>
        )}
        <textarea className={input} rows={2} placeholder="Nhu cầu, ngân sách… (tuỳ chọn)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <p className="text-[12px] text-destructive">{error}</p>}
        <Button
          type="submit"
          disabled={state === "sending"}
          className="h-12 w-full rounded-xl bg-digital-blue text-sm font-semibold text-primary-foreground active:scale-[0.98]"
        >
          {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
          Gửi thông tin
        </Button>
        <p className="text-[11px] opacity-60 text-center">Thông tin chỉ dùng để liên hệ tư vấn.</p>
      </form>
    </section>
  );
}

