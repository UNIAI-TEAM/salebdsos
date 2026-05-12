import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { BarChart3, Users2, Target, DollarSign, Radio, QrCode, Link2, Share2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";
import { getSourceAnalytics } from "@/lib/tracking.functions";

export const Route = createFileRoute("/_app/analytics")({ component: AnalyticsPage });

const SOURCE_META: Record<string, { label: string; color: string; icon: any }> = {
  nfc: { label: "NFC Tap", color: "oklch(0.59 0.22 285)", icon: Radio },
  qr: { label: "QR Code", color: "oklch(0.65 0.16 240)", icon: QrCode },
  link: { label: "Direct Link", color: "oklch(0.68 0.16 152)", icon: Link2 },
  social: { label: "Social Bio", color: "oklch(0.74 0.17 60)", icon: Share2 },
  direct: { label: "Direct", color: "oklch(0.6 0.02 265)", icon: Link2 },
};

function SourceAnalyticsBlock() {
  const fetchSrc = useServerFn(getSourceAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["source-analytics", 30],
    queryFn: () => fetchSrc({ data: { days: 30 } }),
  });

  const bySource = (data?.bySource ?? []).map((r) => ({
    ...r,
    label: SOURCE_META[r.source]?.label ?? r.source,
    color: SOURCE_META[r.source]?.color ?? "oklch(0.6 0.02 265)",
  }));
  const total = data?.total ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SectionCard title="Lượt chạm theo nguồn (30 ngày)" className="lg:col-span-2">
        {isLoading ? (
          <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">Đang tải…</div>
        ) : total === 0 ? (
          <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">
            Chưa có lượt chạm. Tạo NFC/QR ở mục “NFC & QR” để bắt đầu thu dữ liệu.
          </div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer>
              <LineChart data={data?.daily ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="oklch(0.93 0.008 265)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid oklch(0.93 0.008 265)" }} />
                <Line type="monotone" dataKey="count" stroke="oklch(0.59 0.22 285)" strokeWidth={2.4} dot={false} name="Lượt chạm" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Phân bổ kênh">
        {total === 0 ? (
          <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">—</div>
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
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
                  <span className="font-semibold">{s.count.toLocaleString()} <span className="text-muted-foreground font-normal">· {Math.round((s.count / total) * 100)}%</span></span>
                </li>
              ))}
            </ul>
          </>
        )}
      </SectionCard>
    </div>
  );
}

const funnel = [
  { stage: "Lượt chạm NFC/QR", v: 12456, w: "100%" },
  { stage: "Xem profile", v: 9842, w: "79%" },
  { stage: "Tương tác", v: 4231, w: "34%" },
  { stage: "Lưu liên hệ", v: 2456, w: "20%" },
  { stage: "Trở thành lead", v: 1234, w: "10%" },
  { stage: "Chuyển đổi", v: 156, w: "1.3%" },
];

const trend = Array.from({ length: 12 }).map((_, i) => ({
  m: `T${i + 1}`,
  nfc: 200 + Math.round(Math.random() * 300 + i * 30),
  qr: 150 + Math.round(Math.random() * 240 + i * 20),
}));

const team = [
  { n: "Nguyễn Văn A", l: 312, c: 38 },
  { n: "Lê Minh Hằng", l: 286, c: 32 },
  { n: "Trần Thanh Long", l: 254, c: 28 },
  { n: "Phạm Quốc Anh", l: 218, c: 24 },
  { n: "Vũ Hải Yến", l: 198, c: 22 },
];

function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Báo cáo & Analytics" sub="Phân tích sâu hiệu quả NFC, QR, AI follow-up và đội ngũ bán hàng." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users2} label="Lead mới" value="1,234" delta={18.2} tone="primary" />
        <KpiCard icon={Target} label="Tỷ lệ chuyển đổi" value="12.6%" delta={8.6} tone="green" />
        <KpiCard icon={DollarSign} label="Doanh thu" value="28.6 tỷ" delta={22.1} tone="amber" />
        <KpiCard icon={BarChart3} label="ROI chiến dịch" value="3.4x" delta={14.2} tone="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Funnel chuyển đổi" className="lg:col-span-2">
          <ul className="space-y-2.5">
            {funnel.map((f, i) => (
              <li key={f.stage}>
                <div className="flex items-center justify-between text-[12.5px] mb-1">
                  <span className="font-medium">{f.stage}</span>
                  <span className="font-semibold">{f.v.toLocaleString()} <span className="text-muted-foreground font-normal">· {f.w}</span></span>
                </div>
                <div className="h-7 rounded-lg bg-muted overflow-hidden">
                  <div className="h-full bg-brand-gradient rounded-lg flex items-center px-3 text-white text-[10.5px] font-bold" style={{ width: f.w, opacity: 1 - i * 0.1 }}>
                    {f.w}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="NFC vs QR (12 tháng)">
          <div className="h-[260px]">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="oklch(0.93 0.008 265)" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid oklch(0.93 0.008 265)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="nfc" stroke="oklch(0.59 0.22 285)" strokeWidth={2.4} dot={false} name="NFC" />
                <Line type="monotone" dataKey="qr" stroke="oklch(0.65 0.16 240)" strokeWidth={2.4} dot={false} name="QR" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Hiệu suất theo nhân sự">
          <div className="h-[280px]">
            <ResponsiveContainer>
              <BarChart data={team} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 0 }}>
                <CartesianGrid stroke="oklch(0.93 0.008 265)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="n" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid oklch(0.93 0.008 265)" }} />
                <Bar dataKey="l" fill="oklch(0.59 0.22 285)" radius={[0, 6, 6, 0]} name="Leads" />
                <Bar dataKey="c" fill="oklch(0.68 0.16 152)" radius={[0, 6, 6, 0]} name="Chốt thành công" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Heatmap thời gian quét QR">
          <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-0.5">
            {["T2","T3","T4","T5","T6","T7","CN"].map((d) => (
              <>
                <div key={d} className="text-[10px] text-muted-foreground py-1.5 pr-1 text-right">{d}</div>
                {Array.from({ length: 24 }).map((_, h) => {
                  const v = Math.random();
                  const op = v < 0.2 ? 0.06 : v < 0.5 ? 0.25 : v < 0.8 ? 0.5 : 0.85;
                  return <div key={`${d}-${h}`} className="aspect-square rounded-sm bg-primary" style={{ opacity: op }} />;
                })}
              </>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10.5px] text-muted-foreground">
            Ít <div className="h-2.5 w-2.5 rounded-sm bg-primary" style={{opacity:.1}} /><div className="h-2.5 w-2.5 rounded-sm bg-primary" style={{opacity:.3}} /><div className="h-2.5 w-2.5 rounded-sm bg-primary" style={{opacity:.6}} /><div className="h-2.5 w-2.5 rounded-sm bg-primary" /> Nhiều
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
