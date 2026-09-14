// Public AI sales landing page: /p/<slug>
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Gift, Quote, MapPin, ArrowRight } from "lucide-react";
import { getPublicSalesPage } from "@/lib/ai-sales-page.functions";

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
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
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

function PublicSalesPage() {
  const page = Route.useLoaderData();
  const o = page.output as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  const benefits = Array.isArray(o["benefits"]) ? (o["benefits"] as string[]) : [];
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      setSent(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Không gửi được.");
    } finally {
      setBusy(false);
    }
  };


  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
          {s("hero_image_url") ? (
            <img
              src={s("hero_image_url")}
              alt={s("headline") || page.title || "Hình ảnh dự án"}
              loading="lazy"
              className="mx-auto mb-8 aspect-[16/9] w-full max-w-3xl rounded-2xl border border-border object-cover"
            />
          ) : null}
          {page.project?.name ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[12px] font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {page.project.name}
              {page.project.location ? ` · ${page.project.location}` : ""}
            </div>
          ) : null}
          <h1 className="mt-5 text-[34px] sm:text-[46px] font-bold leading-[1.1] tracking-tight">
            {s("headline") || page.title}
          </h1>
          {s("subheadline") ? (
            <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">
              {s("subheadline")}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#lien-he"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {s("cta_primary") || page.cta || "Nhận thông tin"}
              <ArrowRight className="h-4 w-4" />
            </a>
            {s("cta_secondary") ? (
              <a
                href="#lien-he"
                className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-6 text-[14px] font-semibold hover:bg-muted"
              >
                {s("cta_secondary")}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {benefits.length > 0 ? (
        <section className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-[20px] font-bold tracking-tight">Điểm nổi bật</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {benefits.map((b, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-2xl border border-border bg-card p-5 text-[14px] leading-relaxed"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {s("offer") ? (
        <section className="mx-auto max-w-4xl px-6 pb-14">
          <div className="flex gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <Gift className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-wide text-primary">Ưu đãi</div>
              <p className="mt-1.5 text-[15px] leading-relaxed">{s("offer")}</p>
            </div>
          </div>
        </section>
      ) : null}

      {s("social_proof") ? (
        <section className="mx-auto max-w-3xl px-6 pb-14">
          <blockquote className="rounded-2xl border border-border bg-card p-7 text-center">
            <Quote className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-[16px] italic leading-relaxed">{s("social_proof")}</p>
          </blockquote>
        </section>
      ) : null}

      <section id="lien-he" className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-lg px-6">
          <h2 className="text-center text-[22px] font-bold tracking-tight">
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
                pattern="[0-9+()\s.\-]{8,20}"
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
              <button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Đang gửi…" : s("cta_primary") || "Gửi thông tin"}
              </button>

            </form>
          )}
        </div>
      </section>
    </main>
  );
}
