import { createFileRoute } from "@tanstack/react-router";
import { KpiCard, SectionCard } from "@/components/app/ui";
import {
  Radio, Users2, Target, DollarSign, CalendarClock, Building2, ChevronRight,
  Sparkles, Phone, MessageCircle, Mail, Plus, Filter, Calendar, ArrowUpRight,
  Wallet, QrCode, IdCard, Megaphone, TrendingUp,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const trafficData = Array.from({ length: 12 }).map((_, i) => ({
  day: `${(i + 1) * 2 < 10 ? "0" : ""}${(i + 1) * 2}/05`,
  taps: 600 + Math.round(Math.sin(i / 1.4) * 350 + i * 60 + Math.random() * 120),
  leads: 80 + Math.round(Math.sin(i / 1.6) * 50 + i * 6 + Math.random() * 30),
}));

const sourceData = [
  { name: "NFC", value: 45, count: "5,605", color: "oklch(0.59 0.22 285)" },
  { name: "QR Code", value: 30, count: "3,734", color: "oklch(0.65 0.16 240)" },
  { name: "Link", value: 15, count: "1,868", color: "oklch(0.68 0.16 152)" },
  { name: "Khác", value: 10, count: "1,249", color: "oklch(0.78 0.16 75)" },
];

const projects = [
  { name: "Vinhomes Ocean Park 2", views: "3,245", growth: 24, img: "🏙️" },
  { name: "Masteri Waterfront", views: "2,156", growth: 18, img: "🌊" },
  { name: "Lumi Hanoi", views: "1,365", growth: 16, img: "🏢" },
  { name: "The Global City", views: "1,245", growth: 12, img: "🌆" },
  { name: "Eaton Park", views: "987", growth: 9, img: "🌳" },
];

const leads = [
  { name: "Trần Minh Đức", source: "NFC", project: "Vinhomes Ocean Park 2", time: "10 phút trước", score: 86 },
  { name: "Lê Thu Hương", source: "QR Code", project: "Masteri Waterfront", time: "15 phút trước", score: 78 },
  { name: "Phạm Tuấn Anh", source: "Link", project: "Lumi Hanoi", time: "32 phút trước", score: 72 },
  { name: "Nguyễn Hải Yến", source: "NFC", project: "The Global City", time: "1 giờ trước", score: 65 },
  { name: "Đỗ Quốc Bảo", source: "QR Code", project: "Eaton Park", time: "2 giờ trước", score: 60 },
];

const performanceData = Array.from({ length: 12 }).map((_, i) => ({
  day: `${(i + 1) * 2}/05`,
  taps: 8 + Math.round(Math.random() * 14 + i * 0.6),
  leads: 4 + Math.round(Math.random() * 8 + i * 0.4),
}));

const aiInsights = [
  { title: "Lead tiềm năng cao", desc: "23 leads", note: "Tăng 15% so với tuần trước", icon: TrendingUp, tone: "from-emerald-500/15 to-emerald-500/0 text-emerald-600" },
  { title: "Khách hàng quan tâm nhiều nhất", desc: "Vinhomes Ocean Park 2", note: "Tổng 125 lượt xem", icon: Building2, tone: "from-blue-500/15 to-blue-500/0 text-blue-600" },
  { title: "Thời điểm hiệu quả nhất", desc: "Thứ 7 (10:00 - 11:00)", note: "Tỷ lệ phản hồi cao nhất", icon: CalendarClock, tone: "from-amber-500/15 to-amber-500/0 text-amber-600" },
  { title: "Gợi ý hành động", desc: "Bạn có 8 lead chưa liên hệ", note: "Nên follow-up ngay để tăng tỷ lệ chuyển đổi", icon: Sparkles, tone: "from-primary/15 to-primary/0 text-primary" },
];

function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex items-center justify-end gap-2">
        <button className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-card border border-border text-[12.5px] font-medium hover:bg-muted">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          01/05/2024 – 31/05/2024
        </button>
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
            <KpiCard icon={Radio} label="Lượt chạm NFC/QR" value="12,456" delta={24.5} tone="primary" />
            <KpiCard icon={Users2} label="Leads mới" value="1,234" delta={18.2} tone="blue" />
            <KpiCard icon={Target} label="Tỷ lệ chuyển đổi" value="12.6%" delta={8.6} tone="green" />
            <KpiCard icon={DollarSign} label="Doanh thu ước tính" value="28.6 tỷ" delta={22.1} tone="amber" />
            <KpiCard icon={CalendarClock} label="Lượt hẹn" value="856" delta={16.7} tone="indigo" />
            <KpiCard icon={Building2} label="Dự án quan tâm" value="2,345" delta={19.3} tone="rose" />
          </div>

          {/* Traffic + Source + Top projects */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Biểu đồ lượt chạm & Leads" className="lg:col-span-1"
              action={<select className="text-[12px] bg-muted rounded-lg px-2 py-1 border border-border">
                <option>30 ngày qua</option><option>7 ngày qua</option>
              </select>}>
              <div className="h-[220px]">
                <ResponsiveContainer>
                  <AreaChart data={trafficData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.59 0.22 285)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="oklch(0.59 0.22 285)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.68 0.16 152)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="oklch(0.68 0.16 152)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="oklch(0.93 0.008 265)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "oklch(0.52 0.02 265)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.02 265)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.93 0.008 265)", fontSize: 12 }} />
                    <Area dataKey="taps" stroke="oklch(0.59 0.22 285)" strokeWidth={2.2} fill="url(#g1)" name="Lượt chạm" />
                    <Area dataKey="leads" stroke="oklch(0.68 0.16 152)" strokeWidth={2.2} fill="url(#g2)" name="Leads" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Nguồn lượt chạm">
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
                      <div className="text-[20px] font-bold">12,456</div>
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
            </SectionCard>

            <SectionCard title="Top dự án được quan tâm" action={<button className="text-[12px] text-primary font-medium hover:underline">Xem tất cả</button>}>
              <ul className="space-y-3">
                {projects.map((p) => (
                  <li key={p.name} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 grid place-items-center text-lg">{p.img}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">{p.views} lượt xem</div>
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[11.5px] font-semibold">
                      <ArrowUpRight className="h-3 w-3" /> {p.growth}%
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>

          {/* Leads + Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <SectionCard title="Leads mới" className="lg:col-span-2"
              action={<button className="text-[12px] text-primary font-medium hover:underline">Xem tất cả</button>}>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="font-semibold py-2">Khách hàng</th>
                    <th className="font-semibold py-2">Nguồn</th>
                    <th className="font-semibold py-2 hidden sm:table-cell">Thời gian</th>
                    <th className="font-semibold py-2 text-right">AI Score</th>
                  </tr>
                </thead>
                <tbody className="text-[12.5px]">
                  {leads.map((l) => (
                    <tr key={l.name} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-indigo-400/30 grid place-items-center text-[10.5px] font-semibold">
                            {l.name.split(" ").pop()![0]}
                          </div>
                          <span className="font-medium">{l.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className={[
                          "text-[11px] px-2 py-0.5 rounded-md font-semibold",
                          l.source === "NFC" ? "bg-primary-soft text-primary" :
                          l.source === "QR Code" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600",
                        ].join(" ")}>{l.source}</span>
                      </td>
                      <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{l.time}</td>
                      <td className="py-2.5 text-right font-semibold">{l.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>

            <SectionCard title="Pipeline bán hàng" className="lg:col-span-3"
              action={<button className="text-[12px] text-primary font-medium hover:underline">Xem chi tiết</button>}>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                {[
                  { stage: "Mới", count: 28, total: "8.6 tỷ", color: "bg-slate-100 text-slate-700" },
                  { stage: "Đang tư vấn", count: 36, total: "12.4 tỷ", color: "bg-blue-100 text-blue-700" },
                  { stage: "Đàm phán", count: 18, total: "9.5 tỷ", color: "bg-amber-100 text-amber-700" },
                  { stage: "Chốt cọc", count: 8, total: "4.8 tỷ", color: "bg-violet-100 text-violet-700" },
                  { stage: "Thành công", count: 12, total: "16.2 tỷ", color: "bg-emerald-100 text-emerald-700" },
                ].map((s) => (
                  <div key={s.stage} className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-semibold text-muted-foreground">{s.stage}</div>
                      <span className={["text-[10.5px] px-1.5 py-0.5 rounded font-bold", s.color].join(" ")}>{s.count}</span>
                    </div>
                    <div className="text-[14px] font-bold">{s.total}</div>
                    <div className="mt-2 space-y-1.5">
                      {[0, 1].map((i) => (
                        <div key={i} className="rounded-lg bg-card border border-border p-2 hover:border-primary/40 cursor-pointer transition">
                          <div className="text-[11.5px] font-semibold truncate">Khách hàng {i + 1}</div>
                          <div className="text-[10.5px] text-muted-foreground">{(Math.random() * 4 + 1).toFixed(1)} tỷ</div>
                        </div>
                      ))}
                      <button className="w-full text-[10.5px] text-primary font-semibold py-1 rounded hover:bg-primary-soft">+ Thêm lead</button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Performance + Activity + AI */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Hiệu suất của bạn" action={<button className="text-[12px] text-primary font-medium hover:underline">Xem báo cáo</button>}>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { l: "Lượt chạm", v: "12,456", d: 24.5 },
                  { l: "Leads", v: "1,234", d: 18.2 },
                  { l: "Tỷ lệ", v: "12.6%", d: 8.6 },
                  { l: "Doanh thu", v: "28.6 tỷ", d: 22.1 },
                ].map((m) => (
                  <div key={m.l}>
                    <div className="text-[10.5px] text-muted-foreground">{m.l}</div>
                    <div className="text-[14px] font-bold leading-tight">{m.v}</div>
                    <div className="text-[10.5px] text-emerald-600 font-semibold">↑ {m.d}%</div>
                  </div>
                ))}
              </div>
              <div className="h-[160px]">
                <ResponsiveContainer>
                  <BarChart data={performanceData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid stroke="oklch(0.93 0.008 265)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid oklch(0.93 0.008 265)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="taps" fill="oklch(0.59 0.22 285)" radius={[4, 4, 0, 0]} name="Lượt chạm" />
                    <Bar dataKey="leads" fill="oklch(0.68 0.16 152)" radius={[4, 4, 0, 0]} name="Leads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Hoạt động gần đây">
              <ul className="space-y-3">
                {[
                  { icon: Users2, text: "Bạn vừa nhận được 1 lead mới từ QR Code", time: "10 phút trước", tone: "text-blue-600 bg-blue-50" },
                  { icon: Building2, text: "Trần Minh Đức đã xem dự án Vinhomes Ocean Park 2", time: "15 phút trước", tone: "text-primary bg-primary-soft" },
                  { icon: Mail, text: "AI Follow-up đã gửi email cho Lê Thu Hương", time: "32 phút trước", tone: "text-emerald-600 bg-emerald-50" },
                  { icon: CalendarClock, text: "Bạn có lịch hẹn với Phạm Tuấn Anh hôm nay 14:00", time: "Hôm nay", tone: "text-amber-600 bg-amber-50" },
                  { icon: IdCard, text: "Đỗ Quốc Bảo đã tải tài liệu báo giá", time: "Hôm qua, 16:30", tone: "text-rose-600 bg-rose-50" },
                ].map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={["h-8 w-8 rounded-lg grid place-items-center shrink-0", a.tone].join(" ")}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12.5px] leading-snug">{a.text}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{a.time}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="AI Insights"
              action={<button className="text-[12px] text-primary font-medium hover:underline">Xem chi tiết</button>}>
              <ul className="space-y-2.5">
                {aiInsights.map((a, i) => (
                  <li key={i} className={["rounded-xl p-3 bg-gradient-to-br border border-border", a.tone].join(" ")}>
                    <div className="flex items-start gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-card grid place-items-center shrink-0">
                        <a.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11.5px] text-muted-foreground">{a.title}</div>
                        <div className="text-[13px] font-semibold text-foreground leading-tight">{a.desc}</div>
                        <div className="text-[10.5px] text-muted-foreground mt-0.5">{a.note}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </div>

        {/* Right rail */}
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
                    <div className="h-3.5 w-3.5 rounded-full bg-blue-400 grid place-items-center text-[8px]">✓</div>
                  </div>
                  <div className="text-[10.5px] text-white/70">Chuyên viên tư vấn BĐS cao cấp</div>
                  <div className="text-[10.5px] text-white/60">ABC Real Estate</div>
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
                    <div className="text-[10.5px] text-white/60">ABC Real Estate</div>
                  </div>
                  <Radio className="ml-auto h-5 w-5 text-white/70" />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="QR Code của bạn" action={<button className="text-[12px] text-primary font-medium hover:underline">Tuỳ chỉnh</button>}>
            <div className="rounded-2xl bg-muted/40 p-5 grid place-items-center">
              <div className="h-40 w-40 rounded-xl bg-white border border-border p-2 grid place-items-center">
                <div className="h-full w-full rounded-lg" style={{
                  backgroundImage: "linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)",
                  backgroundSize: "12px 12px",
                  backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
                }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              {["Tải xuống", "Chia sẻ", "In mã QR"].map((t) => (
                <button key={t} className="text-[11px] font-medium py-1.5 rounded-lg border border-border bg-card hover:bg-muted">{t}</button>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
