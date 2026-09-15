// Timeline gộp cho sale: hoạt động của tôi + lượt xem landing/danh thiếp.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { Eye, Users2, Activity, ExternalLink, IdCard, Globe2 } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { warmOfflineCache } from "@/lib/pwa";
import { getSaleTimeline } from "@/lib/sale-timeline.functions";
import { QuickContact } from "@/components/app/quick-contact";


export const Route = createFileRoute("/_app/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline hoạt động — SaleBDS OS" },
      { name: "description", content: "Dòng thời gian gộp: hoạt động của bạn và lượt xem landing, danh thiếp." },
      { property: "og:title", content: "Timeline hoạt động — SaleBDS OS" },
      { property: "og:description", content: "Theo dõi hoạt động bán hàng và lượt xem landing, danh thiếp theo thời gian." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TimelinePage,
});

const KIND_STYLE: Record<string, { dot: string; label: string }> = {
  activity: { dot: "bg-primary", label: "Hoạt động" },
  view: { dot: "bg-emerald-400", label: "Lượt xem" },
  lead: { dot: "bg-amber-400", label: "Khách mới" },
};

function fmt(at: string) {
  const d = new Date(at);
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function TimelinePage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const fetchTimeline = useServerFn(getSaleTimeline);

  const q = useQuery({
    queryKey: ["sale-timeline", tenantId],
    enabled: !!tenantId,
    queryFn: () => fetchTimeline({ data: { tenantId: tenantId!, days: 14, limit: 80 } }),
  });

  const d = q.data;

  // Lưu trước timeline, danh thiếp và landing để xem được khi mất mạng.
  useEffect(() => {
    if (!d) return;
    warmOfflineCache([
      "/timeline",
      "/digital-card",
      "/landings",
      "/sale-projects",
      "/customers",
      ...d.cards.filter((c) => c.slug).map((c) => `/c/${c.slug}`),
      ...d.pages.filter((p) => p.slug).map((p) => `/p/${p.slug}`),
    ]);
  }, [d]);

  return (
    <div className="space-y-6">
      <PageHeader title="Timeline" sub="Hoạt động của bạn và lượt xem landing, danh thiếp trong 14 ngày." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard icon={Eye} label="Lượt xem" value={String(d?.stats.views ?? 0)} delta={0} deltaLabel="14 ngày qua" />
        <KpiCard icon={Users2} label="Khách mới" value={String(d?.stats.leads ?? 0)} delta={0} deltaLabel="14 ngày qua" tone="amber" />
        <KpiCard icon={Activity} label="Hoạt động" value={String(d?.stats.activities ?? 0)} delta={0} deltaLabel="14 ngày qua" tone="blue" />
        <KpiCard icon={Globe2} label="Landing đang có" value={String(d?.stats.pages ?? 0)} delta={0} deltaLabel="tổng hiện tại" tone="green" />
      </div>

      {(d?.cards?.length || d?.pages?.length) ? (
        <SectionCard title="Mở nhanh">
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {(d?.cards ?? []).map((c) => (
              <a
                key={c.id}
                href={`/c/${c.slug}`}
                target="_blank"
                rel="noreferrer"
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[13px] hover:border-primary/50"
              >
                <IdCard className="size-4 shrink-0 text-primary" />
                <span className="truncate">{c.name}</span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))}
            {(d?.pages ?? []).filter((p) => p.slug).map((p) => (
              <a
                key={p.id}
                href={`/p/${p.slug}`}
                target="_blank"
                rel="noreferrer"
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[13px] hover:border-primary/50"
              >
                <Globe2 className="size-4 shrink-0 text-primary" />
                <span className="truncate">{p.title || "Landing"}</span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Dòng thời gian">
        {q.isLoading || (!d && !q.isError) ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải...</p>
        ) : q.isError ? (
          <p className="py-6 text-center text-sm text-destructive">Không tải được timeline.</p>
        ) : (d?.items.length ?? 0) === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Chưa có hoạt động nào. Hãy chia sẻ{" "}
            <Link to="/digital-card" className="text-primary hover:underline">danh thiếp</Link> hoặc{" "}
            <Link to="/landings" className="text-primary hover:underline">landing</Link> của bạn.
          </div>
        ) : (
          <ol className="relative min-w-0 space-y-4 pl-5">
            <span className="absolute left-1.5 top-2 bottom-2 w-px bg-border" aria-hidden />
            {d!.items.map((it) => {
              const s = KIND_STYLE[it.kind] ?? KIND_STYLE.activity;
              return (
                <li key={it.id} className="relative min-w-0">
                  <span className={`absolute -left-[15px] top-1.5 size-2.5 rounded-full ${s.dot}`} aria-hidden />
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="min-w-0 break-words text-[13.5px] font-semibold">{it.title}</span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</span>
                  </div>
                  {it.detail ? <p className="min-w-0 break-words text-[13px] text-muted-foreground">{it.detail}</p> : null}
                  <p className="min-w-0 break-words text-[11.5px] text-muted-foreground/80">
                    {fmt(it.at)}
                    {it.meta ? ` • ${it.meta}` : ""}
                  </p>
                  {it.phone || it.email ? (
                    <div className="mt-2">
                      <QuickContact phone={it.phone} email={it.email} name={it.name} compact />
                    </div>
                  ) : null}

                </li>
              );
            })}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}
