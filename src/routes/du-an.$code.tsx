// Trang công khai khi khách quét QR dự án: /du-an/<code>
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
} from "lucide-react";
import { getPublicProjectByQr, submitProjectQrLead } from "@/lib/public-project.functions";
import { ProjectTouchTracker, getTouchSessionId, trackTouch } from "@/components/landing-touch-tracker";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/du-an/$code")({
  loader: async ({ params }) => {
    const data = await getPublicProjectByQr({ data: { code: params.code } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Không tìm thấy dự án" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.project;
    const title = `${p.name}${p.location ? ` · ${p.location}` : ""}`.slice(0, 58);
    const desc = (p.description || `Thông tin dự án ${p.name}${p.developer ? ` do ${p.developer} phát triển` : ""}.`)
      .slice(0, 155);
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0B0F1A" },
      { name: "format-detection", content: "telephone=yes" },
      { name: "robots", content: "noindex" },
    ];
    const cover = p.coverUrl ?? "";
    if (cover.startsWith("https://")) {
      meta.push({ property: "og:image", content: cover });
      meta.push({ name: "twitter:image", content: cover });
    }
    return { meta };
  },
  component: PublicProjectQrPage,
  errorComponent: () => <Fallback title="Không tải được dự án" sub="Vui lòng thử lại sau ít phút." />,
  notFoundComponent: () => (
    <Fallback title="Mã QR không hợp lệ" sub="Mã có thể đã bị khoá. Liên hệ người gửi để nhận mã mới." />
  ),
});

function Fallback({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

const money = (v: number | null, currency: string) => {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1)} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} triệu`;
  return `${new Intl.NumberFormat("vi-VN").format(n)} ${currency}`;
};

function PublicProjectQrPage() {
  const data = Route.useLoaderData();
  const p = data.project;
  const sale = data.sale;
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const phone = sale?.phone || p.ctaPhone || null;
  const priceFrom = money(p.priceFrom as number | null, p.currency);
  const priceTo = money(p.priceTo as number | null, p.currency);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    try {
      await submitProjectQrLead({
        data: {
          code: data.code,
          full_name: String(fd.get("full_name") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          note: String(fd.get("note") ?? "") || undefined,
        },
      });
      setSent(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Không gửi được, vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = `${origin}/du-an/${data.code}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: p.name, url });
        return;
      } catch {
        /* người dùng huỷ */
      }
    }
    void navigator.clipboard?.writeText(url);
  };

  return (
    <main className="min-h-screen bg-background pb-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] text-foreground">
      {/* Ảnh bìa + tên dự án */}
      <section className="relative">
        {p.coverUrl ? (
          <img
            src={p.coverMobileUrl || p.coverUrl}
            srcSet={p.coverMobileUrl ? `${p.coverMobileUrl} 800w, ${p.coverUrl} 1600w` : undefined}
            sizes="(max-width: 768px) 100vw, 768px"
            alt={`Ảnh dự án ${p.name}`}
            width={1600}
            height={900}
            loading="eager"
            fetchPriority="high"
            className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
          />
        ) : (
          <div className="grid aspect-[4/3] w-full place-items-center bg-muted sm:aspect-[16/9]">
            <Building2 className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="mx-auto -mt-8 max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <h1 className="break-words text-[22px] font-bold leading-tight sm:text-[30px]">{p.name}</h1>
                <p className="mt-1.5 flex min-w-0 items-start gap-1.5 text-[13px] text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">
                    {[p.developer, p.location].filter(Boolean).join(" · ") || "Đang cập nhật"}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={share}
                aria-label="Chia sẻ dự án"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {p.propertyType ? (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11.5px] font-semibold">{p.propertyType}</span>
              ) : null}
              {priceFrom ? (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11.5px] font-semibold text-primary">
                  {priceTo ? `${priceFrom} – ${priceTo}` : `Từ ${priceFrom}`}
                </span>
              ) : null}
            </div>
            {p.description ? (
              <p className="mt-3 break-words text-[14px] leading-relaxed text-muted-foreground">{p.description}</p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Thông tin sale phụ trách */}
      {sale?.full_name || phone ? (
        <section className="mx-auto mt-4 max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Chuyên viên tư vấn
            </div>
            <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[16px] font-bold">
                {sale?.avatar_url ? (
                  <img src={sale.avatar_url} alt={sale.full_name ?? "Chuyên viên tư vấn"} className="h-full w-full object-cover" />
                ) : (
                  (sale?.full_name ?? "S").slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold">{sale?.full_name || "Chuyên viên tư vấn"}</div>
                {phone ? <div className="truncate text-[13px] text-muted-foreground">{phone}</div> : null}
                {sale?.email ? <div className="truncate text-[12.5px] text-muted-foreground">{sale.email}</div> : null}
              </div>
            </div>
            {phone ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a
                  href={`tel:${phone}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Phone className="h-4 w-4" /> Gọi ngay
                </a>
                <a
                  href={`https://zalo.me/${phone.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold hover:bg-muted"
                >
                  <MessageCircle className="h-4 w-4" /> Chat Zalo
                </a>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Điểm nổi bật */}
      {p.highlights.length > 0 ? (
        <section className="mx-auto mt-4 max-w-3xl px-4 sm:px-6">
          <h2 className="text-[18px] font-bold tracking-tight">Điểm nổi bật</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {p.highlights.map((h, i) => (
              <li
                key={i}
                className="flex min-w-0 gap-2.5 rounded-xl border border-border bg-card p-3.5 text-[14px] leading-relaxed"
              >
                <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" />
                <span className="min-w-0 break-words">{h}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Hình ảnh dự án */}
      {p.gallery.length > 0 ? (
        <section className="mt-5">
          <h2 className="mx-auto max-w-3xl px-4 text-[18px] font-bold tracking-tight sm:px-6">Hình ảnh</h2>
          <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:px-6">
            {p.gallery.map((g, i) => (
              <img
                key={i}
                src={p.galleryMobile[i] || g}
                alt={`Hình ảnh ${i + 1} của dự án ${p.name}`}
                loading="lazy"
                className="h-44 w-[78vw] max-w-sm shrink-0 snap-start rounded-xl border border-border object-cover sm:h-56 sm:w-80"
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Chính sách bán hàng */}
      {p.salesPolicy ? (
        <section className="mx-auto mt-5 max-w-3xl px-4 sm:px-6">
          <h2 className="text-[18px] font-bold tracking-tight">Chính sách bán hàng</h2>
          <p className="mt-3 whitespace-pre-line break-words rounded-xl border border-border bg-card p-4 text-[14px] leading-relaxed">
            {p.salesPolicy}
          </p>
        </section>
      ) : null}

      {/* Brochure */}
      {p.brochureUrl ? (
        <section className="mx-auto mt-5 max-w-3xl px-4 sm:px-6">
          <a
            href={p.brochureUrl}
            target="_blank"
            rel="noreferrer"
            className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-muted"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold">{p.brochureName || "Tài liệu dự án (PDF)"}</span>
              <span className="block text-[12.5px] text-muted-foreground">Tải brochure để xem chi tiết</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
          </a>
        </section>
      ) : null}

      {/* Lịch sự kiện */}
      {data.appointments.length > 0 ? (
        <section className="mx-auto mt-5 max-w-3xl px-4 sm:px-6">
          <h2 className="text-[18px] font-bold tracking-tight">Sự kiện sắp tới</h2>
          <ul className="mt-3 space-y-2.5">
            {data.appointments.map((a) => {
              const st = new Date(a.starts_at);
              return (
                <li key={a.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-border bg-card p-4">
                  <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <h3 className="break-words text-[14px] font-semibold">{a.title}</h3>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      {st.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })} ·{" "}
                      {st.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {a.location ? <p className="mt-1 break-words text-[12.5px] text-muted-foreground">{a.location}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Landing chi tiết nếu có */}
      {data.landingSlug ? (
        <section className="mx-auto mt-5 max-w-3xl px-4 sm:px-6">
          <a
            href={`/p/${data.landingSlug}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-[14px] font-semibold hover:bg-muted"
          >
            Xem trang giới thiệu chi tiết <ArrowRight className="h-4 w-4" />
          </a>
        </section>
      ) : null}

      {/* Form nhận tư vấn */}
      <section id="lien-he" className="mx-auto mt-6 max-w-lg scroll-mt-4 px-4 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-[18px] font-bold tracking-tight">Nhận bảng giá & tư vấn</h2>
          {sent ? (
            <p className="mt-4 rounded-xl border border-success/30 bg-success/10 p-4 text-[14px] font-medium text-success">
              Cảm ơn bạn! Chuyên viên sẽ liên hệ trong thời gian sớm nhất.
            </p>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={submit}>
              <div>
                <label htmlFor="qr-name" className="text-[12.5px] font-medium text-muted-foreground">
                  Họ và tên
                </label>
                <input
                  id="qr-name"
                  required
                  name="full_name"
                  autoComplete="name"
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-4 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="qr-phone" className="text-[12.5px] font-medium text-muted-foreground">
                  Số điện thoại
                </label>
                <input
                  id="qr-phone"
                  required
                  name="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  pattern="[-0-9+() .]{8,20}"
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-4 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="qr-note" className="text-[12.5px] font-medium text-muted-foreground">
                  Ghi chú (không bắt buộc)
                </label>
                <textarea
                  id="qr-note"
                  name="note"
                  rows={3}
                  maxLength={1000}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              {err ? <p className="text-[13px] font-medium text-destructive">{err}</p> : null}
              <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl text-[14px] font-semibold">
                {busy ? "Đang gửi…" : "Gửi thông tin"}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Thanh hành động cố định trên mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background text-[14px] font-semibold"
            >
              <Phone className="h-4 w-4" /> Gọi sale
            </a>
          ) : (
            <span />
          )}
          <a
            href="#lien-he"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground"
          >
            Nhận bảng giá
          </a>
        </div>
      </div>
    </main>
  );
}
