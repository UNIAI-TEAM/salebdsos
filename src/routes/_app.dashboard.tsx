import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { KpiCard, SectionCard } from "@/components/app/ui";
import {
  Radio, Users2, Target, DollarSign, CalendarClock, Building2,
  Sparkles, Phone, MessageCircle, Mail, Plus, Filter, Calendar, ArrowUpRight,
  Wallet, QrCode, IdCard, Megaphone, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { getDashboardKpis, getTopRankings } from "@/lib/analytics.functions";
import { listLeads } from "@/lib/lead.functions";
import { getPipeline } from "@/lib/pipeline.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const SOURCE_META: Record<string, { name: string; color: string }> = {
  nfc: { name: "NFC", color: "oklch(0.59 0.22 285)" },
  qr: { name: "QR Code", color: "oklch(0.65 0.16 240)" },
  link: { name: "Link", color: "oklch(0.68 0.16 152)" },
  social: { name: "Social", color: "oklch(0.74 0.17 60)" },
  direct: { name: "Direct", color: "oklch(0.6 0.02 265)" },
};

function fmt(n: number | undefined | null) {
  return (n ?? 0).toLocaleString("vi-VN");
}
function fmtCurrencyBn(v: number) {
  if (!v) return "0";
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} tr`;
  return v.toLocaleString("vi-VN");
}
function relTime(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const dd = Math.floor(h / 24);
  return `${dd} ngày trước`;
}

function Dashboard() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const [days, setDays] = useState<number>(30);

  const fetchKpis = useServerFn(getDashboardKpis);
  const fetchTops = useServerFn(getTopRankings);
  const fetchLeads = useServerFn(listLeads);
  const fetchPipeline = useServerFn(getPipeline);

  const params = useMemo(() => ({ tenantId: tenantId!, days }), [tenantId, days]);

  const kpisQ = useQuery({
    queryKey: ["dashboard-kpis", params],
    queryFn: () => fetchKpis({ data: params }),
    enabled: !!tenantId,
  });
  const topsQ = useQuery({
    queryKey: ["dashboard-tops", params],
    queryFn: () => fetchTops({ data: params }),
    enabled: !!tenantId,
  });
  const leadsQ = useQuery({
    queryKey: ["dashboard-recent-leads", tenantId],
    queryFn: () => fetchLeads({ data: { tenantId: tenantId!, page: 1, pageSize: 5 } }),
    enabled: !!tenantId,
  });
  const pipelineQ = useQuery({
    queryKey: ["dashboard-pipeline", tenantId],
    queryFn: () => fetchPipeline({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const kpis = kpisQ.data?.kpis;
  const daily = kpisQ.data?.daily ?? [];
  const bySourceRaw = kpisQ.data?.bySource ?? [];
  const totalTouches = kpis?.totalTouches ?? 0;
  const sourceData = bySourceRaw.map((s) => ({
    name: SOURCE_META[s.source]?.name ?? s.source,
    value: totalTouches ? Math.round((s.count / totalTouches) * 100) : 0,
    count: fmt(s.count),
    color: SOURCE_META[s.source]?.color ?? "oklch(0.6 0.02 265)",
  }));

  const trafficData = daily.map((d) => ({
    day: d.day.slice(5), // MM-DD
    taps: d.total ?? 0,
  }));

  const topProjects = topsQ.data?.topProjects ?? [];
  const recentLeads = leadsQ.data?.rows ?? [];

  // Pipeline aggregation by stage
  const pipeline = useMemo(() => {
    const stages = pipelineQ.data?.stages ?? [];
    const deals = pipelineQ.data?.deals ?? [];
    return stages.slice(0, 5).map((s: any) => {
      const dealsInStage = deals.filter((d: any) => d.stage_id === s.id && d.status !== "lost");
      const total = dealsInStage.reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0);
      return {
        stage: s.name,
        count: dealsInStage.length,
        total: fmtCurrencyBn(total),
        deals: dealsInStage.slice(0, 2),
      };
    });
  }, [pipelineQ.data]);

  const stageColors = [
    "bg-primary/15 text-primary",
    "bg-info/15 text-info",
    "bg-warning/15 text-warning",
    "bg-success/15 text-success",
    "bg-muted text-muted-foreground",
  ];

  // Estimated revenue from won deals in pipeline
  const revenueEst = useMemo(() => {
    const deals = pipelineQ.data?.deals ?? [];
    return deals
      .filter((d: any) => d.status === "won")
      .reduce((s: number, d: any) => s + (Number(d.value) || 0), 0);
  }, [pipelineQ.data]);

  const isLoading = kpisQ.isLoading || !tenantId;

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex items-center justify-end gap-2">
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="h-9 w-[160px] rounded-xl text-[12.5px]">
            <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 ngày qua</SelectItem>
            <SelectItem value="30">30 ngày qua</SelectItem>
            <SelectItem value="90">90 ngày qua</SelectItem>
          </SelectContent>
        </Select>
        <button className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-card border border-border text-[12.5px] font-medium hover:bg-muted">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Bộ lọc
        </button>
      </div>

      {/* Layout: main + right rail */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6 min-w-0">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
            <KpiCard icon={Radio} label="Lượt chạm NFC/QR" value={fmt(kpis?.totalTouches)} delta={kpis?.deltas.touches ?? 0} tone="primary" />
            <KpiCard icon={Users2} label="Leads mới" value={fmt(kpis?.leads)} delta={kpis?.deltas.leads ?? 0} tone="blue" />
            <KpiCard icon={Target} label="Tỷ lệ chuyển đổi" value={`${kpis?.conversion ?? 0}%`} delta={0} tone="green" />
            <KpiCard icon={DollarSign} label="Doanh thu chốt" value={fmtCurrencyBn(revenueEst)} delta={0} tone="amber" />
            <KpiCard icon={CalendarClock} label="Won trong kỳ" value={fmt(kpis?.won)} delta={0} tone="indigo" />
            <KpiCard icon={Building2} label="NFC + QR" value={fmt((kpis?.nfc ?? 0) + (kpis?.qr ?? 0))} delta={kpis?.deltas.nfc ?? 0} tone="rose" />
          </div>

          {/* Traffic + Source + Top projects */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Biểu đồ lượt chạm theo ngày" className="lg:col-span-1">
              <div className="h-[220px]">
                {isLoading ? (
                  <div className="h-full grid place-items-center text-[12px] text-muted-foreground">Đang tải…</div>
                ) : (
                  <ResponsiveContainer>
                    <AreaChart data={trafficData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.59 0.22 285)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="oklch(0.59 0.22 285)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="oklch(0.93 0.008 265)" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "oklch(0.52 0.02 265)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.02 265)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.93 0.008 265)", fontSize: 12 }} />
                      <Area dataKey="taps" stroke="oklch(0.59 0.22 285)" strokeWidth={2.2} fill="url(#g1)" name="Lượt chạm" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Nguồn lượt chạm">
              {sourceData.length === 0 ? (
                <div className="h-[180px] grid place-items-center text-[12px] text-muted-foreground">Chưa có dữ liệu</div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative h-[180px] w-[180px] shrink-0">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={sourceData} dataKey="value" innerRadius={56} outerRadius={80} paddingAngle={3} stroke="none">
                          {sourceData.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <div className="text-[20px] font-bold">{fmt(totalTouches)}</div>
                        <div className="text-[10.5px] text-muted-foreground">Tổng</div>
                      </div>
                    </div>
                  </div>
                  <ul className="flex-1 space-y-2.5">
                    {sourceData.map((s) => (
                      <li key={s.name} className="flex items-center gap-2 text-[12.5px]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="font-medium flex-1">{s.name}</span>
                        <span className="font-semibold">{s.value}%</span>
                        <span className="text-muted-foreground text-[11px]">({s.count})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Top dự án được quan tâm" action={<button className="text-[12px] text-primary font-medium hover:underline">Xem tất cả</button>}>
              {topProjects.length === 0 ? (
                <div className="py-6 text-center text-[12px] text-muted-foreground">Chưa có dự án nào có lead</div>
              ) : (
                <ul className="space-y-3">
                  {topProjects.slice(0, 5).map((p: any) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-indigo-500/20 grid place-items-center text-lg overflow-hidden">
                        {p.cover_url ? <img src={p.cover_url} alt="" className="h-full w-full object-cover" /> : "🏙️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold truncate">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">{p.leads} leads · {p.won} chốt</div>
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-success text-[11.5px] font-semibold">
                        <ArrowUpRight className="h-3 w-3" /> {p.won ? Math.round((p.won / Math.max(p.leads, 1)) * 100) : 0}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* Leads + Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <SectionCard title="Leads mới" className="lg:col-span-2"
              action={<button className="text-[12px] text-primary font-medium hover:underline">Xem tất cả</button>}>
              {recentLeads.length === 0 ? (
                <div className="py-6 text-center text-[12px] text-muted-foreground">Chưa có lead nào</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="font-semibold py-2">Khách hàng</th>
                      <th className="font-semibold py-2">Nguồn</th>
                      <th className="font-semibold py-2 hidden sm:table-cell">Thời gian</th>
                      <th className="font-semibold py-2 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="text-[12.5px]">
                    {recentLeads.map((l: any) => {
                      const src = l.source || "direct";
                      const label = SOURCE_META[src]?.name ?? src;
                      return (
                        <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-indigo-500/30 grid place-items-center text-[10.5px] font-semibold">
                                {(l.full_name?.split(" ").pop()?.[0] ?? "?").toUpperCase()}
                              </div>
                              <span className="font-medium">{l.full_name}</span>
                            </div>
                          </td>
                          <td className="py-2.5">
                            <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-primary-soft text-primary">{label}</span>
                          </td>
                          <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{relTime(l.created_at)}</td>
                          <td className="py-2.5 text-right font-semibold">{l.score ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </SectionCard>

            <SectionCard title="Pipeline bán hàng" className="lg:col-span-3"
              action={<button className="text-[12px] text-primary font-medium hover:underline">Xem chi tiết</button>}>
              {pipeline.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-muted-foreground">Đang tải pipeline…</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                  {pipeline.map((s, idx) => (
                    <div key={s.stage} className="rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[11px] font-semibold text-muted-foreground truncate">{s.stage}</div>
                        <span className={["text-[10.5px] px-1.5 py-0.5 rounded font-bold", stageColors[idx % stageColors.length]].join(" ")}>{s.count}</span>
                      </div>
                      <div className="text-[14px] font-bold">{s.total}</div>
                      <div className="mt-2 space-y-1.5">
                        {s.deals.map((d: any) => (
                          <div key={d.id} className="rounded-lg bg-card border border-border p-2 hover:border-primary/40 cursor-pointer transition">
                            <div className="text-[11.5px] font-semibold truncate">{d.title}</div>
                            <div className="text-[10.5px] text-muted-foreground">{fmtCurrencyBn(Number(d.value) || 0)}</div>
                          </div>
                        ))}
                        {s.deals.length === 0 && (
                          <div className="text-[10.5px] text-muted-foreground italic">Không có deal</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Performance + Activity + AI */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Hiệu suất theo ngày" action={<button className="text-[12px] text-primary font-medium hover:underline">Xem báo cáo</button>}>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { l: "Lượt chạm", v: fmt(kpis?.totalTouches), d: kpis?.deltas.touches ?? 0 },
                  { l: "Leads", v: fmt(kpis?.leads), d: kpis?.deltas.leads ?? 0 },
                  { l: "Won", v: fmt(kpis?.won), d: 0 },
                  { l: "Tỷ lệ", v: `${kpis?.conversion ?? 0}%`, d: 0 },
                ].map((m) => (
                  <div key={m.l}>
                    <div className="text-[10.5px] text-muted-foreground">{m.l}</div>
                    <div className="text-[14px] font-bold leading-tight">{m.v}</div>
                    <div className={["text-[10.5px] font-semibold", m.d >= 0 ? "text-emerald-600" : "text-rose-600"].join(" ")}>
                      {m.d >= 0 ? "↑" : "↓"} {Math.abs(m.d)}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-[160px]">
                {daily.length === 0 ? (
                  <div className="h-full grid place-items-center text-[12px] text-muted-foreground">Đang tải…</div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={daily.slice(-14).map((d: any) => ({ day: d.day.slice(5), nfc: d.nfc ?? 0, qr: d.qr ?? 0 }))} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid stroke="oklch(0.93 0.008 265)" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid oklch(0.93 0.008 265)" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="nfc" fill="oklch(0.59 0.22 285)" radius={[4, 4, 0, 0]} name="NFC" />
                      <Bar dataKey="qr" fill="oklch(0.65 0.16 240)" radius={[4, 4, 0, 0]} name="QR" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Hoạt động gần đây">
              {recentLeads.length === 0 ? (
                <div className="py-6 text-center text-[12px] text-muted-foreground">Chưa có hoạt động</div>
              ) : (
                <ul className="space-y-3">
                  {recentLeads.slice(0, 5).map((l: any) => (
                    <li key={l.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0 text-primary bg-primary-soft">
                        <Users2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12.5px] leading-snug">
                          Lead mới: <span className="font-semibold">{l.full_name}</span>
                          {l.source ? ` từ ${SOURCE_META[l.source]?.name ?? l.source}` : ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{relTime(l.created_at)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="AI Insights" action={<button className="text-[12px] text-primary font-medium hover:underline">Xem chi tiết</button>}>
              <ul className="space-y-2.5">
                {[
                  {
                    title: "Tăng trưởng lượt chạm",
                    desc: `${kpis?.deltas.touches ?? 0}%`,
                    note: `${fmt(kpis?.totalTouches)} lượt trong ${days} ngày`,
                    icon: TrendingUp,
                    tone: "from-emerald-500/15 to-emerald-500/0 text-emerald-600",
                  },
                  {
                    title: "Dự án hàng đầu",
                    desc: topProjects[0]?.name ?? "Chưa có",
                    note: `${topProjects[0]?.leads ?? 0} leads`,
                    icon: Building2,
                    tone: "from-blue-500/15 to-blue-500/0 text-blue-600",
                  },
                  {
                    title: "Nguồn hiệu quả nhất",
                    desc: sourceData[0]?.name ?? "—",
                    note: `${sourceData[0]?.count ?? 0} lượt chạm`,
                    icon: Radio,
                    tone: "from-amber-500/15 to-amber-500/0 text-amber-600",
                  },
                  {
                    title: "Gợi ý hành động",
                    desc: `${kpis?.leads ?? 0} leads mới`,
                    note: "Follow-up sớm để tăng tỷ lệ chuyển đổi",
                    icon: Sparkles,
                    tone: "from-primary/15 to-primary/0 text-primary",
                  },
                ].map((a, i) => (
                  <li key={i} className={["rounded-xl p-3 bg-gradient-to-br border border-border", a.tone].join(" ")}>
                    <div className="flex items-start gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-card grid place-items-center shrink-0">
                        <a.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11.5px] text-muted-foreground">{a.title}</div>
                        <div className="text-[13px] font-semibold text-foreground leading-tight truncate">{a.desc}</div>
                        <div className="text-[10.5px] text-muted-foreground mt-0.5">{a.note}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </div>

        {/* Right rail — UI-only quick access */}
        <aside className="space-y-4">
          <SectionCard title="Tạo mới nhanh">
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: IdCard, label: "Tạo danh thiếp" },
                { icon: QrCode, label: "Tạo QR Code" },
                { icon: Radio, label: "Tạo Link" },
                { icon: Plus, label: "Thêm lead" },
                { icon: Building2, label: "Tạo dự án" },
                { icon: Megaphone, label: "Gửi broadcast" },
              ].map((q) => (
                <button key={q.label} className="rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/40 p-3 flex flex-col items-center gap-1.5 transition">
                  <q.icon className="h-4 w-4 text-primary" />
                  <span className="text-[10.5px] font-medium leading-tight text-center">{q.label}</span>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Xem trước danh thiếp"
            action={<button className="text-[12px] text-primary font-medium hover:underline">Chỉnh sửa</button>}>
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-4 text-white shadow-glow">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-[14px] font-bold ring-2 ring-white/20">NA</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[14px] font-bold truncate">Nguyễn Văn A</div>
                  </div>
                  <div className="text-[10.5px] text-white/70">Chuyên viên tư vấn BĐS cao cấp</div>
                  <div className="text-[10.5px] text-white/60">{currentTenant?.name ?? "SaleBDS OS"}</div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mt-3.5">
                {[Phone, MessageCircle, MessageCircle, Mail, IdCard].map((I, i) => (
                  <button key={i} className="aspect-square rounded-lg bg-white/10 hover:bg-white/20 grid place-items-center transition">
                    <I className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              <button className="mt-3 w-full rounded-xl bg-white/95 text-slate-900 text-[12px] font-semibold py-2 hover:bg-white">
                Lưu liên hệ
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Wallet Card Mode" action={<button className="text-[12px] text-primary font-medium hover:underline">Xem hướng dẫn</button>}>
            <div className="flex gap-2 mb-3">
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-[11px] font-semibold hover:bg-muted">
                <Wallet className="h-3.5 w-3.5" /> Apple Wallet
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-[11px] font-semibold hover:bg-muted">
                <Wallet className="h-3.5 w-3.5" /> Google Wallet
              </button>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-4 text-white relative overflow-hidden">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-[12px] font-bold">NA</div>
                  <div>
                    <div className="text-[13px] font-bold">Nguyễn Văn A</div>
                    <div className="text-[10.5px] text-white/60">{currentTenant?.name ?? "SaleBDS OS"}</div>
                  </div>
                  <Radio className="ml-auto h-5 w-5 text-white/70" />
                </div>
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
