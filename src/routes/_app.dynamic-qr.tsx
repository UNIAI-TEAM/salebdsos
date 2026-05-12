import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { Radio, QrCode, Plus, BarChart3, Eye, MousePointerClick, Calendar, Edit3, Copy, Download } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/dynamic-qr")({ component: DynamicQR });

const data = Array.from({ length: 14 }).map((_, i) => ({ d: `D${i + 1}`, scans: 80 + Math.round(Math.random() * 200 + i * 12) }));

const campaigns = [
  { name: "Vinhomes Ocean Park 2 — Mở bán", scans: 3456, leads: 312, ctr: "9.0%", status: "Đang chạy" },
  { name: "Masteri Waterfront — Open House", scans: 2189, leads: 198, ctr: "9.0%", status: "Đang chạy" },
  { name: "Lumi Hanoi — Khai trương nhà mẫu", scans: 1456, leads: 124, ctr: "8.5%", status: "Đang chạy" },
  { name: "Eaton Park — Roadshow Q4", scans: 987, leads: 76, ctr: "7.7%", status: "Tạm dừng" },
];

function DynamicQR() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dynamic QR Campaigns" sub="Tạo, cá nhân hoá và đo lường QR động theo từng chiến dịch."
        action={<button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Tạo chiến dịch</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={QrCode} label="QR đang chạy" value="42" delta={12.4} tone="primary" />
        <KpiCard icon={MousePointerClick} label="Lượt quét" value="18,234" delta={26.8} tone="blue" />
        <KpiCard icon={Eye} label="Lượt xem trang" value="14,562" delta={22.1} tone="indigo" />
        <KpiCard icon={BarChart3} label="Tỷ lệ chuyển" value="9.2%" delta={3.4} tone="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Lượt quét theo ngày" className="lg:col-span-2">
          <div className="h-[240px]">
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="qrg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.59 0.22 285)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.59 0.22 285)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.93 0.008 265)" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid oklch(0.93 0.008 265)" }} />
                <Area dataKey="scans" stroke="oklch(0.59 0.22 285)" strokeWidth={2.5} fill="url(#qrg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Xem trước QR">
          <div className="rounded-2xl bg-gradient-to-br from-primary-soft to-indigo-50 p-5 grid place-items-center">
            <div className="h-44 w-44 bg-white rounded-2xl border border-border p-3 grid place-items-center shadow-soft">
              <div className="h-full w-full rounded-lg" style={{
                backgroundImage: "linear-gradient(45deg, oklch(0.18 0.03 265) 25%, transparent 25%), linear-gradient(-45deg, oklch(0.18 0.03 265) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, oklch(0.18 0.03 265) 75%), linear-gradient(-45deg, transparent 75%, oklch(0.18 0.03 265) 75%)",
                backgroundSize: "10px 10px",
              }} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[{i:Download,l:"Tải PNG"},{i:Copy,l:"Copy link"},{i:Edit3,l:"Tuỳ chỉnh"}].map((b) => (
              <button key={b.l} className="text-[11px] font-medium py-1.5 rounded-lg border border-border bg-card hover:bg-muted inline-flex items-center justify-center gap-1"><b.i className="h-3 w-3" /> {b.l}</button>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Chiến dịch QR động">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="py-2.5 font-semibold">Chiến dịch</th>
              <th className="py-2.5 font-semibold">Lượt quét</th>
              <th className="py-2.5 font-semibold">Leads</th>
              <th className="py-2.5 font-semibold">CTR</th>
              <th className="py-2.5 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="text-[12.5px]">
            {campaigns.map((c) => (
              <tr key={c.name} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary grid place-items-center"><Radio className="h-4 w-4" /></div>
                    <div className="font-semibold">{c.name}</div>
                  </div>
                </td>
                <td className="py-3 font-semibold">{c.scans.toLocaleString()}</td>
                <td className="py-3">{c.leads}</td>
                <td className="py-3 text-emerald-600 font-semibold">{c.ctr}</td>
                <td className="py-3">
                  <span className={["text-[11px] px-2 py-0.5 rounded-md font-semibold",
                    c.status === "Đang chạy" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"].join(" ")}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
