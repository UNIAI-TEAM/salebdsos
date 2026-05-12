import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, KpiCard } from "@/components/app/ui";
import {
  Building2, Database, TrendingUp, Users2, Target, Plus, Download, Filter,
  Search, List, LayoutGrid, ChevronDown, MoreHorizontal, BarChart3, Sparkles, X,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/projects")({ component: ProjectsPage });

type ProjectStatus = "Đang mở bán" | "Sắp mở bán" | "Đang triển khai" | "Đã bàn giao" | "Tạm dừng";

const STATUS_TONE: Record<ProjectStatus, string> = {
  "Đang mở bán": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  "Sắp mở bán": "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  "Đang triển khai": "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  "Đã bàn giao": "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  "Tạm dừng": "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
};

const PROJECTS: {
  name: string; code: string; hot?: boolean; investor: string; loc: string;
  type: string; price: string; status: ProjectStatus; interested: number; conv: number;
  tone: string;
}[] = [
  { name: "Vinhomes Ocean Park 2", code: "VOP2", hot: true, investor: "Vinhomes", loc: "Hưng Yên", type: "Khu đô thị", price: "1.2 - 4.8 tỷ", status: "Đang mở bán", interested: 324, conv: 8.62, tone: "from-sky-300 via-indigo-300 to-violet-400" },
  { name: "Masteri Waterfront", code: "MWF", hot: true, investor: "Masterise Homes", loc: "Hải Phòng", type: "Căn hộ cao cấp", price: "2.1 - 7.6 tỷ", status: "Đang mở bán", interested: 198, conv: 7.21, tone: "from-cyan-300 via-blue-300 to-indigo-400" },
  { name: "Lumi Hanoi", code: "LH01", investor: "CapitaLand", loc: "Hà Nội", type: "Căn hộ cao cấp", price: "3.6 - 9.8 tỷ", status: "Sắp mở bán", interested: 156, conv: 6.35, tone: "from-amber-300 via-rose-300 to-fuchsia-400" },
  { name: "The Global City", code: "TGC", investor: "Masterise Homes", loc: "TP. Thủ Đức", type: "Khu đô thị", price: "8.0 - 25 tỷ", status: "Sắp mở bán", interested: 143, conv: 5.92, tone: "from-violet-300 via-fuchsia-300 to-pink-400" },
  { name: "Eaton Park", code: "EP01", investor: "Gamuda Land", loc: "TP. Thủ Đức", type: "Căn hộ cao cấp", price: "6.2 - 15.6 tỷ", status: "Đang triển khai", interested: 112, conv: 4.78, tone: "from-emerald-300 via-teal-300 to-cyan-400" },
  { name: "Vinhomes Grand Park", code: "VGP", investor: "Vinhomes", loc: "TP. Thủ Đức", type: "Khu đô thị", price: "1.1 - 3.2 tỷ", status: "Đã bàn giao", interested: 98, conv: 3.45, tone: "from-blue-300 via-indigo-300 to-purple-400" },
  { name: "Sunshine Skyline", code: "SSL", investor: "Sunshine Group", loc: "Hà Nội", type: "Căn hộ cao cấp", price: "2.8 - 8.9 tỷ", status: "Tạm dừng", interested: 56, conv: 2.11, tone: "from-orange-300 via-amber-300 to-yellow-400" },
  { name: "Meyhomes Capital", code: "MCC", investor: "Tân Á Đại Thành", loc: "Phú Quốc", type: "Biệt thự nghỉ dưỡng", price: "4.5 - 12 tỷ", status: "Đã bàn giao", interested: 45, conv: 1.98, tone: "from-rose-300 via-pink-300 to-fuchsia-400" },
];

const TOP_REVENUE = [
  { name: "Vinhomes Ocean Park 2", value: "12.6 tỷ", pct: 100 },
  { name: "Masteri Waterfornt", value: "7.8 tỷ", pct: 62 },
  { name: "Lumi Hanoi", value: "5.2 tỷ", pct: 41 },
  { name: "The Global City", value: "4.1 tỷ", pct: 32 },
  { name: "Eaton Park", value: "3.2 tỷ", pct: 25 },
];

const SOURCES = [
  { label: "NFC Tap", count: "476 khách hàng", pct: 38.6, color: "bg-primary" },
  { label: "QR Code", count: "350 khách hàng", pct: 28.4, color: "bg-blue-500" },
  { label: "Website", count: "220 khách hàng", pct: 17.8, color: "bg-emerald-500" },
  { label: "Mạng xã hội", count: "188 khách hàng", pct: 15.2, color: "bg-amber-500" },
];

const DONUT = [
  { name: "Vinhomes Ocean Park 2", pct: 32, count: 114, color: "#6D5EF6" },
  { name: "Masteri Waterfront", pct: 22, count: 78, color: "#22C55E" },
  { name: "Lumi Hanoi", pct: 16, count: 57, color: "#F59E0B" },
  { name: "The Global City", pct: 14, count: 50, color: "#06B6D4" },
  { name: "Khác", pct: 16, count: 57, color: "#F43F5E" },
];

function Donut() {
  const r = 60, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative h-[180px] w-[180px] mx-auto">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        {DONUT.map((d) => {
          const len = (d.pct / 100) * c;
          const dasharray = `${len} ${c - len}`;
          const dashoffset = -acc;
          acc += len;
          return (
            <circle key={d.name} cx="80" cy="80" r={r} fill="none"
              stroke={d.color} strokeWidth="22"
              strokeDasharray={dasharray} strokeDashoffset={dashoffset} />
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[22px] font-bold leading-none">356</div>
          <div className="text-[11px] text-muted-foreground mt-1">Giao dịch</div>
        </div>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const [view, setView] = useState<"list" | "grid">("list");
  const [showAi, setShowAi] = useState(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dự án"
        sub="Quản lý và theo dõi toàn bộ dự án bất động sản."
        action={
          <div className="flex items-center gap-2">
            <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-muted/40">
              <Download className="h-4 w-4" /> Xuất báo cáo <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            <button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-soft">
              <Plus className="h-4 w-4" /> Thêm dự án
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6 min-w-0">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-5 gap-4">
            <KpiCard icon={Building2} label="Tổng dự án" value="24" delta={2} tone="indigo" deltaLabel="dự án mới" />
            <KpiCard icon={Database} label="Tổng giá trị" value="28.6 tỷ" delta={12.5} tone="blue" />
            <KpiCard icon={TrendingUp} label="Tổng giao dịch" value="356" delta={18.7} tone="green" />
            <KpiCard icon={Users2} label="Khách hàng quan tâm" value="1,234" delta={16.3} tone="amber" />
            <KpiCard icon={Target} label="Tỷ lệ chuyển đổi TB" value="7.94%" delta={1.2} tone="rose" />
          </div>

          {/* Toolbar + Table */}
          <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted/40 border border-border text-[13px] outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Tìm kiếm dự án, chủ đầu tư, vị trí…"
                />
              </div>
              <FilterPill label="Trạng thái: Tất cả" />
              <FilterPill label="Loại hình: Tất cả" />
              <FilterPill label="Khu vực: Tất cả" />
              <button className="h-9 px-3 rounded-xl border border-border text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-muted/40">
                <Filter className="h-4 w-4" /> Bộ lọc
              </button>
              <div className="ml-auto inline-flex rounded-xl border border-border p-0.5 bg-muted/30">
                <button onClick={() => setView("list")}
                  className={["h-8 w-8 grid place-items-center rounded-lg", view === "list" ? "bg-card shadow-soft text-primary" : "text-muted-foreground"].join(" ")}>
                  <List className="h-4 w-4" />
                </button>
                <button onClick={() => setView("grid")}
                  className={["h-8 w-8 grid place-items-center rounded-lg", view === "grid" ? "bg-card shadow-soft text-primary" : "text-muted-foreground"].join(" ")}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>

            {view === "list" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                      <th className="px-5 py-3 font-semibold">Dự án</th>
                      <th className="px-3 py-3 font-semibold">Chủ đầu tư</th>
                      <th className="px-3 py-3 font-semibold">Vị trí</th>
                      <th className="px-3 py-3 font-semibold">Loại hình</th>
                      <th className="px-3 py-3 font-semibold">Giá bán</th>
                      <th className="px-3 py-3 font-semibold">Trạng thái</th>
                      <th className="px-3 py-3 font-semibold">Khách quan tâm</th>
                      <th className="px-3 py-3 font-semibold">Tỷ lệ chuyển đổi</th>
                      <th className="px-3 py-3 font-semibold text-right pr-5">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROJECTS.map((p) => (
                      <tr key={p.code} className="border-t border-border hover:bg-muted/30 transition">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={["h-12 w-16 rounded-lg bg-gradient-to-br shrink-0 relative overflow-hidden", p.tone].join(" ")}>
                              <Building2 className="absolute bottom-1 right-1 h-4 w-4 text-white/70" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground truncate">{p.name}</span>
                                {p.hot && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold ring-1 ring-rose-100">Hot</span>}
                              </div>
                              <div className="text-[11.5px] text-muted-foreground mt-0.5">Mã dự án: {p.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-foreground/90">{p.investor}</td>
                        <td className="px-3 py-3 text-foreground/90">{p.loc}</td>
                        <td className="px-3 py-3 text-foreground/90">{p.type}</td>
                        <td className="px-3 py-3 font-medium">{p.price}</td>
                        <td className="px-3 py-3">
                          <span className={["inline-flex items-center px-2 py-1 rounded-md text-[11.5px] font-semibold", STATUS_TONE[p.status]].join(" ")}>{p.status}</span>
                        </td>
                        <td className="px-3 py-3 font-semibold">{p.interested}</td>
                        <td className="px-3 py-3 font-semibold text-emerald-600">{p.conv}%</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1 pr-2">
                            <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><BarChart3 className="h-4 w-4" /></button>
                            <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {PROJECTS.map((p) => (
                  <div key={p.code} className="rounded-2xl border border-border overflow-hidden hover:shadow-card transition">
                    <div className={["aspect-[16/9] bg-gradient-to-br relative", p.tone].join(" ")}>
                      <Building2 className="absolute bottom-3 left-3 h-8 w-8 text-white/70" />
                      {p.hot && <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded bg-white/90 text-rose-600 font-bold">Hot</span>}
                    </div>
                    <div className="p-4">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[11.5px] text-muted-foreground mt-0.5">{p.investor} · {p.loc}</div>
                      <div className="mt-3 flex items-center justify-between text-[12.5px]">
                        <span className="font-semibold">{p.price}</span>
                        <span className={["inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold", STATUS_TONE[p.status]].join(" ")}>{p.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border text-[12.5px]">
              <div className="text-muted-foreground">Hiển thị 1 - 8 của 24 dự án</div>
              <div className="flex items-center gap-2">
                <button className="h-8 px-2.5 rounded-lg border border-border inline-flex items-center gap-1 text-[12px]">10 / trang <ChevronDown className="h-3.5 w-3.5 opacity-60" /></button>
                <div className="flex items-center gap-1">
                  <button className="h-8 w-8 grid place-items-center rounded-lg border border-border text-muted-foreground">‹</button>
                  <button className="h-8 w-8 grid place-items-center rounded-lg bg-primary text-primary-foreground font-semibold">1</button>
                  <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted">2</button>
                  <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted">3</button>
                  <span className="px-1 text-muted-foreground">…</span>
                  <button className="h-8 w-8 grid place-items-center rounded-lg border border-border text-muted-foreground">›</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Performance donut */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold">Hiệu suất dự án</h3>
              <button className="h-7 px-2.5 rounded-lg border border-border text-[11.5px] inline-flex items-center gap-1 text-muted-foreground">30 ngày qua <ChevronDown className="h-3 w-3" /></button>
            </div>
            <Donut />
            <div className="mt-4 space-y-2">
              {DONUT.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="font-semibold">{d.pct}%</span>
                  <span className="text-muted-foreground">({d.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top revenue */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold">Top dự án theo doanh thu</h3>
              <button className="h-7 px-2.5 rounded-lg border border-border text-[11.5px] inline-flex items-center gap-1 text-muted-foreground">30 ngày qua <ChevronDown className="h-3 w-3" /></button>
            </div>
            <div className="space-y-3.5">
              {TOP_REVENUE.map((t, i) => (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="text-[12px] text-muted-foreground w-3">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[12.5px] mb-1">
                      <span className="truncate">{t.name}</span>
                      <span className="font-semibold">{t.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full" style={{ width: `${t.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full text-[12.5px] text-primary font-semibold hover:underline">Xem báo cáo chi tiết →</button>
          </div>

          {/* Sources */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold">Nguồn khách hàng quan tâm</h3>
              <button className="h-7 px-2.5 rounded-lg border border-border text-[11.5px] inline-flex items-center gap-1 text-muted-foreground">30 ngày qua <ChevronDown className="h-3 w-3" /></button>
            </div>
            <div className="space-y-3.5">
              {SOURCES.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-[12.5px] mb-1">
                    <div>
                      <div className="font-medium">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground">{s.count}</div>
                    </div>
                    <span className="font-semibold">{s.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={["h-full rounded-full", s.color].join(" ")} style={{ width: `${s.pct * 2}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Card */}
          {showAi && (
            <div className="relative rounded-2xl p-5 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white shadow-card overflow-hidden">
              <button onClick={() => setShowAi(false)} className="absolute top-3 right-3 h-7 w-7 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20"><X className="h-4 w-4" /></button>
              <div className="flex items-center gap-2 text-[13px] font-bold">
                <Sparkles className="h-4 w-4" /> AI gợi ý dự án tiềm năng
              </div>
              <p className="text-[12px] text-white/80 mt-2 leading-relaxed pr-12">
                AI đã phân tích và gợi ý các dự án phù hợp cho tệp khách hàng của bạn.
              </p>
              <button className="mt-4 h-9 px-4 rounded-xl bg-white text-primary text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-white/90">
                <Sparkles className="h-4 w-4" /> Xem gợi ý
              </button>
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPill({ label }: { label: string }) {
  return (
    <button className="h-9 px-3 rounded-xl border border-border text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-muted/40">
      {label} <ChevronDown className="h-3.5 w-3.5 opacity-60" />
    </button>
  );
}
