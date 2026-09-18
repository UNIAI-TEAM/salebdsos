// Public AI sales landing page: /p/<slug>
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Gift, Quote, MapPin, ArrowRight, FileText, Share2, CalendarClock, Phone, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { getPublicSalesPage } from "@/lib/ai-sales-page.functions";
import { InstallLandingApp } from "@/components/install-landing-app";
import { LandingBrowserMeta } from "@/components/landing-browser-meta";
import { LandingTouchTracker, trackTouch, getTouchSessionId } from "@/components/landing-touch-tracker";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/qr-code";
import { SaleTrustMetrics } from "@/components/sale-trust-metrics";

import { warmLanding, warmOfflineAssets } from "@/lib/pwa";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const page = await getPublicSalesPage({ data: { slug: params.slug } });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => {
    const title = (loaderData?.title || "Trang bán hàng").slice(0, 58);
    const desc = String(
      (loaderData?.output?.["subheadline"] as string) || "Thông tin dự án và ưu đãi dành riêng cho bạn.",
    ).slice(0, 155);
    const heroUrl = String((loaderData?.output?.["hero_image_url"] as string) || "");
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (heroUrl.startsWith("https://")) {
      meta.push({ property: "og:image", content: heroUrl });
      meta.push({ name: "twitter:image", content: heroUrl });
    }
    const slug = loaderData?.slug || "";
    const url = `https://salebdsos.lovable.app/p/${slug}`;
    meta.push({ property: "og:url", content: url });
    meta.push({ property: "og:site_name", content: "SaleBDS OS" });
    meta.push({ name: "theme-color", content: "#0B0F1A" });
    meta.push({ name: "apple-mobile-web-app-capable", content: "yes" });
    meta.push({ name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" });
    meta.push({ name: "apple-mobile-web-app-title", content: title.slice(0, 20) });
    meta.push({ name: "mobile-web-app-capable", content: "yes" });
    meta.push({ name: "format-detection", content: "telephone=yes" });
    // Không thêm lại manifest/icon ở đây: root đã có sẵn, manifest riêng của
    // landing được gắn trong LandingBrowserMeta để tránh 2 thẻ manifest.
    const links = [{ rel: "canonical", href: url }];
    return { meta, links };
  },
  component: PublicSalesPage,
  errorComponent: () => (
    <Fallback title="Không tải được trang" sub="Vui lòng thử lại sau ít phút." />
  ),
  notFoundComponent: () => (
    <Fallback title="Trang không tồn tại" sub="Trang này có thể đã bị gỡ hoặc chưa được xuất bản." />
  ),
});

function Fallback({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function shareLinks(url: string, text: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    zalo: `https://zalo.me/share?u=${encodedUrl}&t=${encodedText}`,
    viber: `viber://forward?text=${encodedText}%20${encodedUrl}`,
  };
}

function ShareLanding({ url, title }: { url: string; title: string }) {
  const links = shareLinks(url, title);
  const share = async (href: string, app: string) => {
    if (app === "viber" && typeof window !== "undefined" && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      toast?.error?.("Viber chỉ mở được trên điện thoại.");
      return;
    }
    trackTouch("share_click", { app });
    window.open(href, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="mt-6">
      <div className="flex items-center justify-center gap-2 text-[12.5px] text-muted-foreground">
        <Share2 className="h-3.5 w-3.5" />
        <span>Chia sẻ cho bạn bè</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => share(links.zalo, "zalo")}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0068FF] px-4 text-[12.5px] font-semibold text-white hover:bg-[#0056d6]"
        >
          Zalo
        </button>
        <button
          type="button"
          onClick={() => share(links.facebook, "facebook")}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1877F3] px-4 text-[12.5px] font-semibold text-white hover:bg-[#166fe5]"
        >
          Facebook
        </button>
        <button
          type="button"
          onClick={() => share(links.viber, "viber")}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#7360F2] px-4 text-[12.5px] font-semibold text-white hover:bg-[#6658d9]"
        >
          Viber
        </button>
      </div>
    </div>
  );
}

function PublicSalesPage() {
  const page = Route.useLoaderData();
  const o = page.output as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  const benefits = Array.isArray(o["benefits"]) ? (o["benefits"] as string[]) : [];
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Làm mới cache của chính landing này (trang + manifest + ảnh hero)
  // để lần mở từ icon sau đó hiện gần như tức thì.
  useEffect(() => {
    if (!page.slug) return;
    void warmLanding(page.slug, s("hero_image_url") || null, s("brochure_url") || null);
    const mob = s("hero_image_mobile_url");
    if (mob) void warmOfflineAssets([mob]);
  }, [page.slug]); // eslint-disable-line react-hooks/exhaustive-deps


  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/public/sales-pages/${page.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: getTouchSessionId(),
          full_name: fd.get("full_name"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          need_type: fd.get("need_type"),
          budget: fd.get("budget"),
          timeline: fd.get("timeline"),
          note: fd.get("note"),
        }),
      });
      const out = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !out.ok) throw new Error(out.error || "Không gửi được.");
      trackTouch("form_submit");
      setSent(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Không gửi được.");
    } finally {
      setBusy(false);
    }
  };


  return (
    <main className="min-h-screen bg-background pb-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] text-foreground sm:pb-0">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-20">
          {s("hero_image_url") ? (
            <img
              src={s("hero_image_mobile_url") || s("hero_image_url")}
              srcSet={
                s("hero_image_mobile_url")
                  ? `${s("hero_image_mobile_url")} 800w, ${s("hero_image_url")} 1600w`
                  : undefined
              }
              sizes="(max-width: 768px) 100vw, 768px"
              alt={s("headline") || page.title || "Hình ảnh dự án"}
              width={1600}
              height={900}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="mx-auto mb-6 aspect-[16/9] w-full max-w-3xl rounded-xl border border-border bg-muted object-cover sm:mb-8 sm:rounded-2xl"
            />
          ) : null}

          {page.project?.name ? (
            <div className="inline-grid max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[12px] font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {page.project.name}
                {page.project.location ? ` · ${page.project.location}` : ""}
              </span>
            </div>
          ) : null}
          <h1 className="mt-4 break-words text-[30px] font-bold leading-[1.12] sm:mt-5 sm:text-[46px]">
            {s("headline") || page.title}
          </h1>
          {s("subheadline") ? (
            <p className="mx-auto mt-3 max-w-2xl break-words text-[14px] leading-relaxed text-muted-foreground sm:mt-4 sm:text-[16px]">
              {s("subheadline")}
            </p>
          ) : null}
          <div className="mx-auto mt-6 grid w-full max-w-sm gap-2.5 sm:mt-8 sm:flex sm:max-w-none sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
            <a
              href="#lien-he"
              className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-center text-[14px] font-semibold text-primary-foreground hover:bg-primary/90 sm:px-6"
            >
              <span className="min-w-0 break-words">{s("cta_primary") || page.cta || "Nhận thông tin"}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </a>
            {s("cta_secondary") ? (
              <a
                href="#lien-he"
                className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl border border-border bg-card px-4 text-center text-[14px] font-semibold hover:bg-muted sm:px-6"
              >
                <span className="break-words">{s("cta_secondary")}</span>
              </a>
            ) : null}
          </div>
          <div className="mt-5 flex justify-center">
            <LandingBrowserMeta slug={page.slug ?? ""} title={page.title || "Landing"} />
            <LandingTouchTracker slug={page.slug ?? ""} />
            <InstallLandingApp slug={page.slug ?? ""} title={page.title || "Landing"} />
          </div>
          {mounted && page.slug ? (
            <ShareLanding
              url={`${window.location.origin}/p/${page.slug}`}
              title={s("headline") || page.title || "Thông tin dự án"}
            />
          ) : null}
        </div>
      </section>

      {page.sale?.full_name || page.sale?.phone ? (
        <section className="mx-auto mt-6 max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Chuyên viên tư vấn
            </div>
            <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[16px] font-bold">
                {page.sale.avatar_url ? (
                  <img
                    src={page.sale.avatar_url}
                    alt={page.sale.full_name ?? "Chuyên viên tư vấn"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (page.sale.full_name ?? "S").slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0 text-left">
                <div className="truncate text-[15px] font-semibold">
                  {page.sale.full_name || "Chuyên viên tư vấn"}
                </div>
                {page.sale.phone ? (
                  <div className="truncate text-[13px] text-muted-foreground">{page.sale.phone}</div>
                ) : null}
                {page.sale.email ? (
                  <div className="truncate text-[12.5px] text-muted-foreground">{page.sale.email}</div>
                ) : null}
              </div>
            </div>
            {page.sale.phone ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a
                  href={`tel:${page.sale.phone}`}
                  onClick={() => trackTouch("call_click")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Phone className="h-4 w-4" /> Gọi ngay
                </a>
                <a
                  href={`https://zalo.me/${page.sale.phone.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackTouch("share_click", { app: "zalo_contact" })}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold hover:bg-muted"
                >
                  <MessageCircle className="h-4 w-4" /> Chat Zalo
                </a>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {page.inventory && page.inventory.length > 0 ? (
        <PublicInventorySection units={page.inventory} />
      ) : null}


      {page.saleCard ? (
        <section className="mx-auto mt-6 max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Danh thiếp số
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <div className="mx-auto shrink-0">
                <QrCode
                  value={
                    mounted
                      ? `${window.location.origin}/c/${page.saleCard.slug}?utm_source=landing_qr`
                      : `/c/${page.saleCard.slug}?utm_source=landing_qr`
                  }
                  size={168}
                  showDownload={false}
                />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <div className="truncate text-[16px] font-bold">{page.saleCard.display_name}</div>
                {page.saleCard.title ? (
                  <div className="truncate text-[13px] text-muted-foreground">{page.saleCard.title}</div>
                ) : null}
                {page.saleCard.company ? (
                  <div className="truncate text-[12.5px] text-muted-foreground">{page.saleCard.company}</div>
                ) : null}
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Quét mã hoặc mở danh thiếp để lưu liên hệ chuyên viên ngay.
                </p>
                <a
                  href={`/c/${page.saleCard.slug}?utm_source=landing_link`}
                  onClick={() => trackTouch("share_click", { app: "digital_card" })}
                  className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold hover:bg-muted"
                >
                  Mở danh thiếp <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
            <SaleTrustMetrics metrics={page.saleCard.metrics} variant="embedded" className="mt-5" />
          </div>
        </section>
      ) : null}




      {benefits.length > 0 ? (
        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <h2 className="text-[20px] font-bold tracking-tight">Điểm nổi bật</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {benefits.map((b, i) => (
              <li
                key={i}
                className="flex min-w-0 gap-3 rounded-xl border border-border bg-card p-4 text-[14px] leading-relaxed sm:rounded-2xl sm:p-5"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 break-words">{b}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {s("offer") ? (
        <section className="mx-auto max-w-4xl px-4 pb-10 sm:px-6 sm:pb-14">
          <div className="flex min-w-0 gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:gap-4 sm:rounded-2xl sm:p-6">
            <Gift className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold uppercase tracking-wide text-primary">Ưu đãi</div>
              <p className="mt-1.5 break-words text-[15px] leading-relaxed">{s("offer")}</p>
            </div>
          </div>
        </section>
      ) : null}

      {s("social_proof") ? (
        <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 sm:pb-14">
          <blockquote className="rounded-xl border border-border bg-card p-5 text-center sm:rounded-2xl sm:p-7">
            <Quote className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 break-words text-[15px] italic leading-relaxed sm:text-[16px]">{s("social_proof")}</p>
          </blockquote>
        </section>
      ) : null}

      {s("brochure_url") ? (
        <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 sm:pb-14">
          <a
            href={s("brochure_url")}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackTouch("brochure_download", { name: s("brochure_name") || "brochure" })}
            className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-muted sm:rounded-2xl sm:p-4"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold truncate">
                {s("brochure_name") || "Tài liệu dự án (PDF)"}
              </span>
              <span className="block text-[12.5px] text-muted-foreground">Tải brochure để xem chi tiết</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
          </a>
        </section>
      ) : null}

      {page.appointments.length > 0 ? (
        <section data-touch="schedule_view" className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 sm:pb-14">
          <h2 className="text-[20px] font-bold tracking-tight">Lịch sự kiện sắp tới</h2>
          <ol className="relative mt-5 space-y-3 border-l border-border pl-5">
            {page.appointments.map((appointment) => {
              const starts = new Date(appointment.starts_at);
              const ends = new Date(appointment.ends_at);
              return (
                <li key={appointment.id} className="relative min-w-0 rounded-xl border border-border bg-card p-4">
                  <span className="absolute -left-[29px] top-4 grid h-4 w-4 place-items-center rounded-full bg-primary ring-4 ring-background" />
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <h3 className="break-words text-[14px] font-semibold">{appointment.title}</h3>
                      <p className="mt-1 text-[12.5px] text-muted-foreground">
                        {starts.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })} · {starts.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}–{ends.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {appointment.location ? <p className="mt-1 flex min-w-0 items-start gap-1 text-[12.5px] text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="break-words">{appointment.location}</span></p> : null}
                      <a href="#lien-he" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary">Đăng ký tham dự <ArrowRight className="h-3.5 w-3.5" /></a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {page.qrCode && mounted ? (
        <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 sm:pb-14">
          <h2 className="text-[20px] font-bold tracking-tight">Mã QR dự án</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Quét hoặc chia sẻ mã QR này để mở nhanh thông tin dự án.
          </p>
          <div className="mt-4 flex justify-center">
            <QrCode
              value={`${window.location.origin}/api/public/pq/${page.qrCode}`}
              size={200}
              label={page.project?.name ?? page.title ?? undefined}
              filename={`qr-${page.slug}`}
            />
          </div>
        </section>
      ) : null}



      <section id="lien-he" data-touch="form_open" className="scroll-mt-4 border-t border-border bg-muted/30 py-12 pb-[max(3rem,env(safe-area-inset-bottom))] sm:py-16">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <h2 className="break-words text-center text-[20px] font-bold sm:text-[22px]">
            {s("form_intro") || "Để lại thông tin để được tư vấn"}
          </h2>
          {sent ? (
            <p className="mt-6 rounded-xl border border-success/30 bg-success/10 p-4 text-center text-[14px] font-medium text-success">
              Cảm ơn bạn! Chúng tôi sẽ liên hệ trong thời gian sớm nhất.
            </p>
          ) : (
            <form className="mt-6 space-y-3" onSubmit={submit}>
              <input
                required
                name="full_name"
                placeholder="Họ và tên"
                className="h-11 w-full rounded-xl border border-border bg-card px-4 text-[14px] outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                required
                name="phone"
                inputMode="tel"
                pattern="[-0-9+() .]{8,20}"
                placeholder="Số điện thoại"
                className="h-11 w-full rounded-xl border border-border bg-card px-4 text-[14px] outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                name="email"
                type="email"
                placeholder="Email (không bắt buộc)"
                className="h-11 w-full rounded-xl border border-border bg-card px-4 text-[14px] outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  name="need_type"
                  defaultValue=""
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Nhu cầu</option>
                  <option value="Để ở">Để ở</option>
                  <option value="Đầu tư">Đầu tư</option>
                  <option value="Cho thuê">Cho thuê</option>
                </select>
                <select
                  name="budget"
                  defaultValue=""
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Ngân sách</option>
                  <option value="Dưới 2 tỷ">Dưới 2 tỷ</option>
                  <option value="2 - 5 tỷ">2 - 5 tỷ</option>
                  <option value="5 - 10 tỷ">5 - 10 tỷ</option>
                  <option value="Trên 10 tỷ">Trên 10 tỷ</option>
                </select>
              </div>
              <select
                name="timeline"
                defaultValue=""
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Thời điểm quan tâm</option>
                <option value="Ngay lập tức">Ngay lập tức</option>
                <option value="Trong 1 tháng">Trong 1 tháng</option>
                <option value="Trong 3 tháng">Trong 3 tháng</option>
                <option value="Đang tham khảo">Đang tham khảo</option>
              </select>
              <textarea
                name="note"
                rows={3}
                maxLength={1000}
                placeholder="Ghi chú (không bắt buộc)"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/30"
              />
              {err ? <p className="text-[13px] font-medium text-destructive">{err}</p> : null}
              <Button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-xl text-[14px] font-semibold"
              >
                {busy ? "Đang gửi…" : s("cta_primary") || "Gửi thông tin"}
              </Button>

            </form>
          )}
        </div>
      </section>

      {/* Thanh hành động cố định trên mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
        <div className="grid grid-cols-2 gap-2">
          {page.sale?.phone ? (
            <a
              href={`tel:${page.sale.phone}`}
              onClick={() => trackTouch("call_click")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background text-[14px] font-semibold"
            >
              <Phone className="h-4 w-4" /> Gọi sale
            </a>
          ) : (
            <span />
          )}
          <a
            href="#lien-he"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground"
          >
            {s("cta_primary") || "Nhận tư vấn"}
          </a>
        </div>
      </div>
    </main>

  );
}
