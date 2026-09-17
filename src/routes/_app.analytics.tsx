import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { CustomerJourney } from "@/components/app/customer-journey";
import {
  BarChart3, Users2, Target, Radio, QrCode, Link2, Share2, MousePointerClick,
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  getDashboardKpis, getTopRankings, listAnalyticsFilters,
} from "@/lib/analytics.functions";

export const Route = createFileRoute("/_app/analytics")({ component: AnalyticsPage });

const SOURCE_META: Record<string, { label: string; color: string; icon: any }> = {
  nfc: { label: "NFC Tap", color: "oklch(0.59 0.22 285)", icon: Radio },
  qr: { label: "QR Code", color: "oklch(0.65 0.16 240)", icon: QrCode },
  link: { label: "Direct Link", color: "oklch(0.68 0.16 152)", icon: Link2 },
  social: { label: "Social Bio", color: "oklch(0.74 0.17 60)", icon: Share2 },
  direct: { label: "Direct", color: "oklch(0.6 0.02 265)", icon: MousePointerClick },
};

function fmt(n: number) { return n.toLocaleString("vi-VN"); }
function initials(n?: string | null) {
  if (!n) return "?"; return n.split(" ").slice(-2).map((x) => x[0]?.toUpperCase()).join("");
}

function AnalyticsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;

  const [days, setDays] = useState<number>(30);
  const [source, setSource] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("all");
  const [ownerId, setOwnerId] = useState<string>("all");

  const fetchKpis = useServerFn(getDashboardKpis);
  const fetchTops = useServerFn(getTopRankings);
  const fetchFilters = useServerFn(listAnalyticsFilters);

  const params = useMemo(() => ({
    tenantId: tenantId!, days,
    source: source === "all" ? undefined : source,
    projectId: projectId === "all" ? undefined : projectId,
    ownerId: ownerId === "all" ? undefined : ownerId,
  }), [tenantId, days, source, projectId, ownerId]);

  const filtersQ = useQuery({
    queryKey: ["analytics-filters", tenantId],
    queryFn: () => fetchFilters({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const kpisQ = useQuery({
    queryKey: ["analytics-kpis", params],
    queryFn: () => fetchKpis({ data: params }),
    enabled: !!tenantId,
  });
  const topsQ = useQuery({
    queryKey: ["analytics-tops", params],
    queryFn: () => fetchTops({ data: params }),
    enabled: !!tenantId,
  });

  const kpis = kpisQ.data?.kpis;
  const daily = kpisQ.data?.daily ?? [];
  const bySource = (kpisQ.data?.bySource ?? []).map((r) => ({
    ...r,
    label: SOURCE_META[r.source]?.label ?? r.source,
    color: SOURCE_META[r.source]?.color ?? "oklch(0.6 0.02 265)",
  }));
  const totalTouches = bySource.reduce((s, r) => s + r.count, 0);
  const funnel = kpisQ.data?.funnel ?? [];
  const tops = topsQ.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo & Analytics"
        sub="Số liệu tổng hợp từ analytics_daily — cập nhật mỗi ngày, dữ liệu hôm nay tính realtime."
        action={
          <div className="flex flex-wrap gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="h-9 w-[140px] text-[12.5px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
                <SelectItem value="365">12 tháng</SelectItem>
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9 w-[140px] text-[12.5px] rounded-xl"><SelectValue placeholder="Nguồn" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nguồn</SelectItem>
                {Object.entries(SOURCE_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-9 w-[160px] text-[12.5px] rounded-xl"><SelectValue placeholder="Dự án" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả dự án</SelectItem>
                {(filtersQ.data?.projects ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="h-9 w-[160px] text-[12.5px] rounded-xl"><SelectValue placeholder="Nhân sự" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toàn team</SelectItem>
                {(filtersQ.data?.owners ?? []).map((o: any) => (
                  <SelectItem key={o.user_id} value={o.user_id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Radio} label="NFC Taps" value={fmt(kpis?.nfc ?? 0)} delta={kpis?.deltas.nfc ?? 0} tone="primary" />
        <KpiCard icon={QrCode} label="QR Scans" value={fmt(kpis?.qr ?? 0)} delta={kpis?.deltas.qr ?? 0} tone="blue" />
        <KpiCard icon={Link2} label="Lượt xem link" value={fmt((kpis?.link ?? 0) + (kpis?.social ?? 0) + (kpis?.direct ?? 0))} delta={kpis?.deltas.touches ?? 0} tone="indigo" />
        <KpiCard icon={Users2} label="Lead mới" value={fmt(kpis?.leads ?? 0)} delta={kpis?.deltas.leads ?? 0} tone="amber" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Target} label="Tỷ lệ chuyển đổi" value={`${kpis?.conversion ?? 0}%`} delta={0} deltaLabel="trên tổng lead" tone="green" />
        <KpiCard icon={BarChart3} label="Tổng lượt chạm" value={fmt(kpis?.totalTouches ?? 0)} delta={kpis?.deltas.touches ?? 0} tone="primary" />
        <KpiCard icon={MousePointerClick} label="Lead đã chốt" value={fmt(kpis?.won ?? 0)} delta={0} deltaLabel="trong kỳ" tone="rose" />
        <KpiCard icon={Share2} label="Social Bio" value={fmt(kpis?.social ?? 0)} delta={0} deltaLabel="lượt chạm" tone="indigo" />
      </div>

      {/* Trends + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title={`Xu hướng tương tác (${days} ngày)`} className="lg:col-span-2">
          {kpisQ.isLoading ? (
            <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">Đang tải…</div>
          ) : daily.every((d: any) => d.total === 0) ? (
            <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">
              Chưa có dữ liệu trong khoảng thời gian này.
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer>
                <LineChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="oklch(0.93 0.008 265)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid oklch(0.93 0.008 265)" }} />
                  <Line type="monotone" dataKey="nfc" stroke={SOURCE_META.nfc.color} strokeWidth={2.2} dot={false} name="NFC" />
                  <Line type="monotone" dataKey="qr" stroke={SOURCE_META.qr.color} strokeWidth={2.2} dot={false} name="QR" />
                  <Line type="monotone" dataKey="link" stroke={SOURCE_META.link.color} strokeWidth={2.2} dot={false} name="Link" />
                  <Line type="monotone" dataKey="social" stroke={SOURCE_META.social.color} strokeWidth={2.2} dot={false} name="Social" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Phân bổ kênh">
          {totalTouches === 0 ? (
            <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">—</div>
          ) : (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={bySource} dataKey="count" nameKey="label" innerRadius={50} outerRadius={75} paddingAngle={2}>
                      {bySource.map((s) => <Cell key={s.source} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid oklch(0.93 0.008 265)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 mt-2">
                {bySource.map((s) => (
                  <li key={s.source} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span className="font-semibold">
                      {fmt(s.count)} <span className="text-muted-foreground font-normal">· {Math.round((s.count / totalTouches) * 100)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SectionCard>
      </div>

      {/* Funnel */}
      <SectionCard title="Funnel chuyển đổi">
        {funnel.length === 0 || funnel[0].v === 0 ? (
          <div className="text-[12.5px] text-muted-foreground py-6 text-center">Chưa đủ dữ liệu để dựng funnel.</div>
        ) : (
          <ul className="space-y-2.5">
            {funnel.map((f: any, i: number) => (
              <li key={f.stage}>
                <div className="flex items-center justify-between text-[12.5px] mb-1">
                  <span className="font-medium">{f.stage}</span>
                  <span className="font-semibold">
                    {fmt(f.v)} <span className="text-muted-foreground font-normal">· {f.pct}%</span>
                  </span>
                </div>
                <div className="h-7 rounded-lg bg-muted overflow-hidden">
                  <div className="h-full bg-brand-gradient rounded-lg flex items-center px-3 text-white text-[10.5px] font-bold"
                    style={{ width: `${Math.max(2, f.pct)}%`, opacity: 1 - i * 0.1 }}>
                    {f.pct}%
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Top Cards (lượt chạm)">
          <RankList loading={topsQ.isLoading} empty="Chưa có card nào ghi nhận lượt chạm.">
            {(tops?.topCards ?? []).map((c: any, i: number) => (
              <RankRow key={c.id} idx={i + 1} title={c.display_name} sub={`/c/${c.slug}`} value={fmt(c.touches)} />
            ))}
          </RankList>
        </SectionCard>
        <SectionCard title="Top Dự án (số lead)">
          <RankList loading={topsQ.isLoading} empty="Chưa có lead theo dự án.">
            {(tops?.topProjects ?? []).map((p: any, i: number) => (
              <RankRow key={p.id} idx={i + 1} title={p.name}
                sub={p.won ? `${p.won} lead chốt thành công` : "Chưa có lead chốt"} value={fmt(p.leads)} />
            ))}
          </RankList>
        </SectionCard>
        <SectionCard title="Top Sales Agents">
          <RankList loading={topsQ.isLoading} empty="Chưa có nhân sự nào ghi nhận hoạt động.">
            {(tops?.topAgents ?? []).map((a: any, i: number) => (
              <RankRow key={a.user_id} idx={i + 1} title={a.name}
                avatar={initials(a.name)}
                sub={`${fmt(a.touches)} lượt chạm · ${fmt(a.won)} chốt`} value={fmt(a.leads)} />
            ))}
          </RankList>
        </SectionCard>
      </div>

      {tenantId && <CustomerJourney tenantId={tenantId} days={days} />}
    </div>
  );
}

function RankList({ loading, empty, children }: { loading?: boolean; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  if (loading) return <div className="text-[12.5px] text-muted-foreground py-6 text-center">Đang tải…</div>;
  if (!arr || arr.length === 0 || (arr.length === 1 && !arr[0]))
    return <div className="text-[12.5px] text-muted-foreground py-6 text-center italic">{empty}</div>;
  return <ul className="space-y-1">{children}</ul>;
}

function RankRow({ idx, title, sub, value, avatar }: {
  idx: number; title: string; sub?: string; value: string; avatar?: string;
}) {
  return (
    <li className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition">
      <span className="w-6 text-[11px] font-bold text-muted-foreground text-center">{idx}</span>
      {avatar !== undefined && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[10.5px] font-bold shrink-0">
          {avatar}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold truncate">{title}</div>
        {sub && <div className="text-[10.5px] text-muted-foreground truncate">{sub}</div>}
      </div>
      <span className="text-[12.5px] font-bold text-primary tabular-nums">{value}</span>
    </li>
  );
}
