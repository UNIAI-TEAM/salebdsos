import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Sparkles, TrendingUp, Flame, Snowflake, Loader2, RefreshCw, Phone, MessageCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  getScoreDashboard, recomputeTenantScores, bandFromScore, SCORE_LABEL, type ScoreBand,
} from "@/lib/lead-score.functions";

export const Route = createFileRoute("/_app/ai-lead-score")({ component: AILeadScore });

const BAND_TONE: Record<ScoreBand, { bar: string; chip: string; icon: any }> = {
  very_hot: { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-600 ring-1 ring-rose-100", icon: Flame },
  hot: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-600 ring-1 ring-amber-100", icon: TrendingUp },
  warm: { bar: "bg-blue-500", chip: "bg-blue-50 text-blue-600 ring-1 ring-blue-100", icon: Sparkles },
  cold: { bar: "bg-slate-400", chip: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", icon: Snowflake },
};

function AILeadScore() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const fnDash = useServerFn(getScoreDashboard);
  const fnRecompute = useServerFn(recomputeTenantScores);

  const dashQ = useQuery({
    queryKey: ["score-dashboard", tenantId],
    queryFn: () => fnDash({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const recomputeM = useMutation({
    mutationFn: () => fnRecompute({ data: { tenantId: tenantId! } }),
    onSuccess: (r) => {
      toast.success(`Đã tính lại ${r.updated} lead`);
      qc.invalidateQueries({ queryKey: ["score-dashboard", tenantId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: any) => toast.error(e?.message || "Không thể tính lại"),
  });

  const dist = dashQ.data?.distribution || { cold: 0, warm: 0, hot: 0, very_hot: 0 };
  const total = (dist.cold + dist.warm + dist.hot + dist.very_hot) || 1;
  const bands: { band: ScoreBand; range: string }[] = [
    { band: "very_hot", range: "80-100" },
    { band: "hot", range: "60-79" },
    { band: "warm", range: "40-59" },
    { band: "cold", range: "0-39" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Lead Score"
        sub="Chấm điểm lead theo hành vi, nhu cầu và mức độ khớp dự án."
        action={
          <Button variant="outline" size="sm" onClick={() => recomputeM.mutate()} disabled={recomputeM.isPending || !tenantId}>
            {recomputeM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tính lại tất cả
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {bands.map(({ band, range }) => {
          const T = BAND_TONE[band];
          const c = dist[band];
          const pct = ((c / total) * 100).toFixed(0);
          return (
            <div key={band} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className={["inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold", T.chip].join(" ")}>
                  <T.icon className="h-3 w-3" /> {SCORE_LABEL[band]}
                </span>
                <span className="text-[10.5px] text-muted-foreground tabular-nums">{range}</span>
              </div>
              <div className="mt-2 text-[24px] font-bold tabular-nums">{c}</div>
              <div className="text-[11.5px] text-muted-foreground">{pct}% tổng số lead</div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={["h-full rounded-full", T.bar].join(" ")} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Phân bố Lead Score" className="lg:col-span-2">
          {dashQ.isLoading ? (
            <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : dashQ.data?.total === 0 ? (
            <div className="py-10 text-center text-[12.5px] text-muted-foreground">Chưa có lead. Hãy thêm lead để bắt đầu chấm điểm.</div>
          ) : (
            <ul className="space-y-3.5">
              {bands.map(({ band, range }) => {
                const T = BAND_TONE[band];
                const c = dist[band];
                const pct = (c / total) * 100;
                return (
                  <li key={band}>
                    <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                      <span className="font-medium">{SCORE_LABEL[band]} ({range})</span>
                      <span className="font-semibold tabular-nums">{c} lead · {pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={["h-full rounded-full", T.bar].join(" ")} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-5 rounded-xl bg-gradient-to-br from-primary/5 to-indigo-50 p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="text-[13px] font-semibold">Mô hình chấm điểm: Rule-based v1</div>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Dựa trên 12+ tín hiệu: hoàn thiện liên hệ, nguồn, nhu cầu, ngân sách, thời gian, khớp dự án, hành vi tương tác và trạng thái. Giải thích AI có sẵn trong từng lead.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Quy tắc chấm điểm">
          <ul className="space-y-2 text-[12px]">
            {[
              ["Có SĐT / email", "+8 / +4"],
              ["Nguồn NFC / QR", "+10 / +8"],
              ["Quan tâm dự án cụ thể", "+10"],
              ["Ngân sách khớp dự án", "+15"],
              ["Mua ngay / 1-3 tháng", "+15 / +10"],
              ["Đã tải brochure", "+12"],
              ["Bấm gọi / Zalo", "+14 / +12"],
              ["Quay lại nhiều lần", "+8"],
              ["Trạng thái Đặt cọc", "+30"],
            ].map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-2 py-1 border-b border-border last:border-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-bold text-foreground tabular-nums">{v}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Top lead có điểm cao nhất">
        {dashQ.isLoading ? (
          <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (dashQ.data?.top?.length ?? 0) === 0 ? (
          <div className="py-10 text-center text-[12.5px] text-muted-foreground">Chưa có dữ liệu xếp hạng.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dashQ.data!.top.map((l) => {
              const band = bandFromScore(l.score);
              const T = BAND_TONE[band];
              return (
                <div key={l.id} className="rounded-xl border border-border p-4 hover:border-primary/40 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold truncate">{l.name || "—"}</div>
                      <div className="text-[11.5px] text-muted-foreground truncate">{l.project || l.source || "—"}</div>
                    </div>
                    <div className="text-center shrink-0">
                      <div className={["text-[22px] font-bold leading-none tabular-nums", band === "very_hot" ? "text-rose-600" : band === "hot" ? "text-amber-600" : band === "warm" ? "text-blue-600" : "text-slate-500"].join(" ")}>{l.score}</div>
                      <div className="text-[10px] text-muted-foreground">/ 100</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={["inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-md font-semibold", T.chip].join(" ")}>
                      <T.icon className="h-3 w-3" /> {SCORE_LABEL[band]}
                    </span>
                    <div className="flex items-center gap-1">
                      {l.phone && <a href={`tel:${l.phone}`} className="h-7 w-7 rounded-md grid place-items-center hover:bg-muted text-muted-foreground"><Phone className="h-3.5 w-3.5" /></a>}
                      {l.phone && <a href={`https://zalo.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="h-7 w-7 rounded-md grid place-items-center hover:bg-muted text-muted-foreground"><MessageCircle className="h-3.5 w-3.5" /></a>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
