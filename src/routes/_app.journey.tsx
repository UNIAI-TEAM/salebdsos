// Theo dõi hành trình khách hàng theo từng dự án: thời gian, trang đã xem, QR quét, trạng thái.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Route as RouteIcon, QrCode, Clock, Users2, Flame, Smartphone } from "lucide-react";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { listProjects } from "@/lib/project.functions";
import { listProjectJourney, JOURNEY_FUNNEL } from "@/lib/journey.functions";

export const Route = createFileRoute("/_app/journey")({
  head: () => ({
    meta: [
      { title: "Hành trình khách hàng theo dự án · SaleBDS OS" },
      {
        name: "description",
        content:
          "Theo dõi từng khách quét QR dự án: thời gian, trang đã xem, kênh QR và trạng thái quan tâm.",
      },
      { property: "og:title", content: "Hành trình khách hàng theo dự án · SaleBDS OS" },
      {
        property: "og:description",
        content: "Sale xem rõ khách đang ở bước nào trong hành trình của từng dự án.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JourneyPage,
});

const STATUS_META: Record<string, { label: string; cls: string }> = {
  lead: { label: "Đã để lại thông tin", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  hot: { label: "Đang quan tâm cao", cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  warm: { label: "Đang tìm hiểu", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  cold: { label: "Mới xem qua", cls: "bg-muted text-muted-foreground border-border" },
};

function fmtTime(s: string) {
  return new Date(s).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDur(sec: number) {
  if (sec < 60) return `${sec} giây`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} phút`;
  return `${Math.floor(m / 60)} giờ ${m % 60} phút`;
}

function JourneyPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;

  const [projectId, setProjectId] = useState<string>("");
  const [days, setDays] = useState<number>(30);
  const [stage, setStage] = useState<string>("all");

  const fetchProjects = useServerFn(listProjects);
  const fetchJourney = useServerFn(listProjectJourney);

  const projectsQ = useQuery({
    queryKey: ["journey-projects", tenantId],
    queryFn: () => fetchProjects({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  useEffect(() => {
    const first = projectsQ.data?.[0]?.id;
    if (!projectId && first) setProjectId(first);
  }, [projectsQ.data, projectId]);

  const journeyQ = useQuery({
    queryKey: ["project-journey", tenantId, projectId, days, stage],
    queryFn: () =>
      fetchJourney({
        data: {
          tenantId: tenantId!,
          projectId,
          days,
          stage: stage === "all" ? undefined : stage,
        },
      }),
    enabled: !!tenantId && !!projectId,
  });

  const d = journeyQ.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hành trình khách hàng theo dự án"
        sub="Xem từng khách quét QR: thời gian, trang đã xem, kênh QR và trạng thái quan tâm."
      />

      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Chọn dự án" />
          </SelectTrigger>
          <SelectContent>
            {(projectsQ.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 ngày qua</SelectItem>
            <SelectItem value="30">30 ngày qua</SelectItem>
            <SelectItem value="90">90 ngày qua</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả bước</SelectItem>
            {JOURNEY_FUNNEL.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiCard label="Khách theo dõi" value={(d?.totalSessions ?? 0).toLocaleString("vi-VN")} delta={0} icon={Users2} />
        <KpiCard label="Điểm chạm" value={(d?.totalTouches ?? 0).toLocaleString("vi-VN")} delta={0} icon={RouteIcon} />
        <KpiCard label="Đã để lại thông tin" value={(d?.leadSessions ?? 0).toLocaleString("vi-VN")} delta={0} icon={QrCode} />
        <KpiCard label="Quan tâm cao" value={(d?.hotSessions ?? 0).toLocaleString("vi-VN")} delta={0} icon={Flame} />
      </div>

      <SectionCard title="Dòng thời gian từng khách">
        {journeyQ.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải hành trình…</p>
        ) : !projectId ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Hãy chọn một dự án.</p>
        ) : (d?.sessions.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Chưa có khách nào quét QR dự án này trong khoảng thời gian đã chọn.
          </p>
        ) : (
          <div className="space-y-3">
            {d!.sessions.map((s) => {
              const st = STATUS_META[s.status] ?? STATUS_META["cold"]!;
              const pct =
                s.stage_index >= 0 ? Math.round(((s.stage_index + 1) / s.stage_total) * 100) : 0;
              return (
                <div key={s.session_id} className="rounded-xl border border-border bg-card/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={st.cls}>
                      {st.label}
                    </Badge>
                    <span className="text-sm font-medium">{s.stage_label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{fmtTime(s.last_at)}</span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {s.qr_label && (
                      <span className="inline-flex items-center gap-1">
                        <QrCode className="h-3.5 w-3.5" /> {s.qr_label}
                      </span>
                    )}
                    {s.channel_label && !s.qr_label && <span>{s.channel_label}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {fmtDur(s.duration_sec)}
                    </span>
                    {s.device && (
                      <span className="inline-flex items-center gap-1">
                        <Smartphone className="h-3.5 w-3.5" /> {s.device}
                      </span>
                    )}
                    <span>{s.touch_count} điểm chạm</span>
                  </div>

                  {s.lead && (
                    <p className="mt-2 text-xs">
                      Khách: <span className="font-medium">{s.lead.full_name ?? "Chưa có tên"}</span>
                      {s.lead.phone ? ` · ${s.lead.phone}` : ""} · trạng thái {s.lead.status}
                    </p>
                  )}

                  <ol className="mt-3 space-y-1.5 border-l border-border pl-3">
                    {s.steps.map((step, i) => (
                      <li key={`${s.session_id}-${i}`} className="relative text-xs">
                        <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-primary/70" />
                        <span className="text-foreground">{step.label}</span>
                        <span className="ml-2 text-muted-foreground">{fmtTime(step.at)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
