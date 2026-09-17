// Hành trình khách hàng: phễu từ quét QR đến để lại thông tin + nhật ký phiên.
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Route as RouteIcon } from "lucide-react";
import { SectionCard } from "@/components/app/ui";
import { getJourneyOverview, listJourneySessions } from "@/lib/journey.functions";

function fmt(n: number) { return n.toLocaleString("vi-VN"); }

export function CustomerJourney({ tenantId, days = 30 }: { tenantId: string; days?: number }) {
  const fetchOverview = useServerFn(getJourneyOverview);
  const fetchSessions = useServerFn(listJourneySessions);

  const overview = useQuery({
    queryKey: ["journey-overview", tenantId, days],
    queryFn: () => fetchOverview({ data: { tenantId, days } }),
    enabled: !!tenantId,
  });
  const sessions = useQuery({
    queryKey: ["journey-sessions", tenantId, days],
    queryFn: () => fetchSessions({ data: { tenantId, days, limit: 15 } }),
    enabled: !!tenantId,
  });

  const data = overview.data;
  const top = data?.funnel?.[0]?.sessions ?? 0;

  return (
    <div className="space-y-4">
      <SectionCard title="Hành trình khách hàng từ mã QR dự án">
        {overview.isLoading ? (
          <div className="py-6 text-center text-[12.5px] text-muted-foreground">Đang tải…</div>
        ) : !data || data.totalTouches === 0 ? (
          <div className="py-6 text-center text-[12.5px] italic text-muted-foreground">
            Chưa có khách nào quét mã QR dự án trong {days} ngày qua.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-[12.5px] text-muted-foreground">
              {fmt(data.totalSessions)} phiên khách · {fmt(data.totalTouches)} điểm chạm
            </div>
            <ul className="space-y-2">
              {data.funnel.map((step) => (
                <li key={step.key} className="space-y-1">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-medium">{step.label}</span>
                    <span className="font-bold tabular-nums text-primary">{fmt(step.sessions)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${top ? Math.round((step.sessions / top) * 100) : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>

            {data.channels.length > 0 && (
              <div>
                <div className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Nguồn quét
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {data.channels.map((c) => (
                    <span key={c.key} className="rounded-full border border-border px-2.5 py-1 text-[11.5px]">
                      {c.label}: {fmt(c.count)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.projects.length > 0 && (
              <div>
                <div className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Dự án hút khách nhất
                </div>
                <ul className="mt-1.5 space-y-1">
                  {data.projects.map((p, i) => (
                    <li key={p.project_id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                      <span className="w-5 text-center text-[11px] font-bold text-muted-foreground">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-semibold">{p.name}</div>
                        <div className="text-[10.5px] text-muted-foreground">
                          {fmt(p.scans)} lượt quét · {fmt(p.leads)} khách · {p.conversion}% ra khách
                        </div>
                      </div>
                      <span className="text-[12.5px] font-bold tabular-nums text-primary">{fmt(p.sessions)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Nhật ký từng phiên khách">
        {sessions.isLoading ? (
          <div className="py-6 text-center text-[12.5px] text-muted-foreground">Đang tải…</div>
        ) : (sessions.data ?? []).length === 0 ? (
          <div className="py-6 text-center text-[12.5px] italic text-muted-foreground">Chưa có phiên khách nào.</div>
        ) : (
          <ul className="space-y-3">
            {(sessions.data ?? []).map((s) => (
              <li key={s.session_id} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <RouteIcon className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold">{s.project_name}</div>
                    <div className="text-[10.5px] text-muted-foreground">
                      {new Date(s.last_at).toLocaleString("vi-VN")}
                      {s.channel_label ? ` · ${s.channel_label}` : ""}
                      {s.device ? ` · ${s.device}` : ""}
                    </div>
                  </div>
                </div>
                <ol className="mt-2 flex flex-wrap gap-1.5">
                  {s.steps.map((st, i) => (
                    <li key={`${st.at}-${i}`} className="rounded-full bg-muted px-2.5 py-1 text-[11px]">
                      {st.label}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
