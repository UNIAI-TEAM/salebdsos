import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, KpiCard } from "@/components/app/ui";
import {
  Users2, Sparkles, CheckCircle2, Crown, DollarSign, Search, Filter, Upload, Plus,
  Phone, MessageCircle, Mail, MoreHorizontal, Eye, ChevronDown, X, Star,
  CalendarClock, Activity, ArrowRight,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/customers")({ component: CustomersPage });

type Status = "Khách hàng hiện tại" | "Đang chăm sóc" | "Mới";
const STATUS_TONE: Record<Status, string> = {
  "Khách hàng hiện tại": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  "Đang chăm sóc": "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  "Mới": "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
};

type Tier = "VIP" | "Tiềm năng cao" | "Tiềm năng";
const TIER_TONE: Record<Tier, string> = {
  "VIP": "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  "Tiềm năng cao": "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  "Tiềm năng": "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

const SOURCE_TONE: Record<string, string> = {
  NFC: "bg-primary-soft text-primary",
  "QR Code": "bg-blue-50 text-blue-700",
  Website: "bg-indigo-50 text-indigo-700",
  "Giới thiệu": "bg-amber-50 text-amber-700",
  "Facebook Ads": "bg-sky-50 text-sky-700",
  Zalo: "bg-cyan-50 text-cyan-700",
};

const ROWS: {
  id: number; name: string; tier: Tier; project: string; phone: string; email: string;
  status: Status; score: number; value: string; source: string;
  dob: string; createdAt: string; owner: string; note: string;
}[] = [
  { id: 1, name: "Trần Minh Đức", tier: "VIP", project: "Vinhomes Ocean Park 2", phone: "0987 654 321", email: "duc.tran@gmail.com", status: "Khách hàng hiện tại", score: 86, value: "3.2 tỷ", source: "NFC", dob: "12/06/1988", createdAt: "15/05/2024 10:30", owner: "Nguyễn Văn A", note: "Khách hàng quan tâm căn 2PN view hồ" },
  { id: 2, name: "Lê Thu Hương", tier: "Tiềm năng cao", project: "Masteri Waterfront", phone: "0976 543 210", email: "huong.le@gmail.com", status: "Đang chăm sóc", score: 78, value: "2.8 tỷ", source: "QR Code", dob: "08/03/1990", createdAt: "14/05/2024 09:10", owner: "Lê Minh Hằng", note: "" },
  { id: 3, name: "Phạm Tuấn Anh", tier: "Tiềm năng cao", project: "Lumi Hanoi", phone: "0912 345 678", email: "tuananh.pham@gmail.com", status: "Đang chăm sóc", score: 72, value: "2.1 tỷ", source: "Website", dob: "21/11/1985", createdAt: "13/05/2024 14:20", owner: "Trần Thanh Long", note: "" },
  { id: 4, name: "Nguyễn Hải Yến", tier: "VIP", project: "The Global City", phone: "0933 222 111", email: "haiyen.nguyen@gmail.com", status: "Khách hàng hiện tại", score: 88, value: "5.6 tỷ", source: "Giới thiệu", dob: "02/09/1987", createdAt: "12/05/2024 11:00", owner: "Phạm Quốc Anh", note: "" },
  { id: 5, name: "Đỗ Quốc Bảo", tier: "Tiềm năng cao", project: "Eaton Park", phone: "0908 765 432", email: "baodo@gmail.com", status: "Mới", score: 60, value: "1.8 tỷ", source: "Facebook Ads", dob: "15/07/1992", createdAt: "11/05/2024 16:45", owner: "Vũ Hải Yến", note: "" },
  { id: 6, name: "Bùi Thị Ngọc", tier: "Tiềm năng", project: "Vinhomes Ocean Park 2", phone: "0823 456 789", email: "ngoc.bui@gmail.com", status: "Đang chăm sóc", score: 58, value: "1.6 tỷ", source: "Zalo", dob: "30/04/1991", createdAt: "10/05/2024 10:25", owner: "Nguyễn Văn A", note: "" },
  { id: 7, name: "Hoàng Minh Long", tier: "Tiềm năng", project: "Masteri Waterfront", phone: "0919 888 666", email: "long.hoang@gmail.com", status: "Mới", score: 64, value: "1.9 tỷ", source: "NFC", dob: "11/02/1989", createdAt: "09/05/2024 08:50", owner: "Lê Minh Hằng", note: "" },
  { id: 8, name: "Lưu Thanh Tâm", tier: "Tiềm năng cao", project: "The Global City", phone: "0934 567 890", email: "tam.luu@gmail.com", status: "Đang chăm sóc", score: 74, value: "2.3 tỷ", source: "Giới thiệu", dob: "25/12/1986", createdAt: "08/05/2024 13:15", owner: "Trần Thanh Long", note: "" },
  { id: 9, name: "Võ Hoàng Nam", tier: "Tiềm năng", project: "Lumi Hanoi", phone: "0922 111 333", email: "nam.vo@gmail.com", status: "Đang chăm sóc", score: 66, value: "2.0 tỷ", source: "Website", dob: "06/08/1993", createdAt: "07/05/2024 17:30", owner: "Phạm Quốc Anh", note: "" },
  { id: 10, name: "Nguyễn Văn Tú", tier: "Tiềm năng cao", project: "Vinhomes Grand Park", phone: "0944 222 777", email: "vantu.nguyen@gmail.com", status: "Khách hàng hiện tại", score: 82, value: "4.0 tỷ", source: "QR Code", dob: "18/01/1984", createdAt: "06/05/2024 11:40", owner: "Vũ Hải Yến", note: "" },
];

const TABS = ["Thông tin", "Lịch sử", "Dự án", "Hoạt động", "Ghi chú"] as const;

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(-2).join("");
const avatarTone = (i: number) => [
  "from-blue-300 to-indigo-400", "from-rose-300 to-fuchsia-400", "from-amber-300 to-orange-400",
  "from-emerald-300 to-teal-400", "from-violet-300 to-purple-400", "from-cyan-300 to-blue-400",
][i % 6];

const SCORE_TONE = (s: number) =>
  s >= 80 ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : s >= 70 ? "bg-blue-50 text-blue-700 ring-blue-100"
    : s >= 60 ? "bg-amber-50 text-amber-700 ring-amber-100"
    : "bg-slate-100 text-slate-600 ring-slate-200";

function ScoreRing({ value, label }: { value: number; label: string }) {
  const r = 36, c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div className="relative h-[100px] w-[100px]">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(16 185 129)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[22px] font-bold leading-none">{value}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}

function CustomersPage() {
  const [openId, setOpenId] = useState<number | null>(1);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Thông tin");
  const customer = ROWS.find((r) => r.id === openId);

  return (
    <div className="space-y-5">
      <PageHeader title="Khách hàng" sub="Quản lý và chăm sóc khách hàng hiện tại." />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-5 gap-4">
        <KpiCard icon={Users2} label="Tổng khách hàng" value="1,256" delta={15.3} tone="primary" />
        <KpiCard icon={Sparkles} label="Khách hàng tiềm năng" value="678" delta={12.6} tone="blue" />
        <KpiCard icon={CheckCircle2} label="Khách hàng hiện tại" value="432" delta={18.7} tone="green" />
        <KpiCard icon={Crown} label="Khách hàng VIP" value="146" delta={22.5} tone="amber" />
        <KpiCard icon={DollarSign} label="Doanh thu từ KH" value="28.6 tỷ" delta={20.1} tone="rose" />
      </div>

      <div className={["grid gap-5 transition-all", openId ? "grid-cols-1 xl:grid-cols-[1fr_400px]" : "grid-cols-1"].join(" ")}>
        {/* Table */}
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden min-w-0">
          <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted/40 border border-border text-[13px] outline-none focus:ring-2 focus:ring-primary/20" placeholder="Tìm kiếm khách hàng, SĐT, email…" />
            </div>
            <Pill label="Tất cả phân loại" />
            <Pill label="Tất cả dự án" />
            <Pill label="Tất cả trạng thái" />
            <button className="h-9 px-3 rounded-xl border border-border text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-muted/40">
              <Filter className="h-4 w-4" /> Bộ lọc
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button className="h-9 px-3 rounded-xl border border-border text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-muted/40">
                <Upload className="h-4 w-4" /> Import
              </button>
              <button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-soft">
                <Plus className="h-4 w-4" /> Thêm khách hàng
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                  <th className="px-5 py-3 font-semibold w-8"><input type="checkbox" className="h-3.5 w-3.5 rounded border-border" /></th>
                  <th className="px-3 py-3 font-semibold">Khách hàng</th>
                  <th className="px-3 py-3 font-semibold">Phân loại</th>
                  <th className="px-3 py-3 font-semibold">Dự án quan tâm</th>
                  <th className="px-3 py-3 font-semibold">SĐT</th>
                  <th className="px-3 py-3 font-semibold">Email</th>
                  <th className="px-3 py-3 font-semibold">Trạng thái</th>
                  <th className="px-3 py-3 font-semibold">AI Lead Score</th>
                  <th className="px-3 py-3 font-semibold">Giá trị tiềm năng</th>
                  <th className="px-3 py-3 font-semibold">Nguồn</th>
                  <th className="px-3 py-3 font-semibold text-right pr-5">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr key={r.id} onClick={() => setOpenId(r.id)}
                    className={["border-t border-border hover:bg-muted/30 transition cursor-pointer",
                      openId === r.id ? "bg-primary-soft/30" : ""].join(" ")}>
                    <td className="px-5 py-3"><input type="checkbox" className="h-3.5 w-3.5 rounded border-border" onClick={(e) => e.stopPropagation()} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={["h-9 w-9 rounded-full bg-gradient-to-br grid place-items-center text-white text-[11px] font-bold shrink-0", avatarTone(i)].join(" ")}>{initials(r.name)}</div>
                        <span className="font-semibold">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={["inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold", TIER_TONE[r.tier]].join(" ")}>{r.tier}</span>
                    </td>
                    <td className="px-3 py-3 text-foreground/90">{r.project}</td>
                    <td className="px-3 py-3 text-foreground/90">{r.phone}</td>
                    <td className="px-3 py-3 text-foreground/90">{r.email}</td>
                    <td className="px-3 py-3">
                      <span className={["inline-flex items-center px-2 py-1 rounded-md text-[11.5px] font-semibold", STATUS_TONE[r.status]].join(" ")}>{r.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={["inline-flex items-center justify-center h-6 min-w-[32px] px-1.5 rounded-md text-[11.5px] font-bold ring-1", SCORE_TONE(r.score)].join(" ")}>{r.score}</span>
                    </td>
                    <td className="px-3 py-3 font-semibold">{r.value}</td>
                    <td className="px-3 py-3">
                      <span className={["inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold", SOURCE_TONE[r.source] || "bg-muted text-foreground"].join(" ")}>{r.source}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1 pr-2" onClick={(e) => e.stopPropagation()}>
                        <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><Eye className="h-4 w-4" /></button>
                        <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-border text-[12.5px]">
            <div className="text-muted-foreground">Hiển thị 1 - 10 của 1,256 khách hàng</div>
            <div className="flex items-center gap-2">
              <button className="h-8 px-2.5 rounded-lg border border-border inline-flex items-center gap-1 text-[12px]">10 / trang <ChevronDown className="h-3.5 w-3.5 opacity-60" /></button>
              <div className="flex items-center gap-1">
                <button className="h-8 w-8 grid place-items-center rounded-lg border border-border text-muted-foreground">‹</button>
                <button className="h-8 w-8 grid place-items-center rounded-lg bg-primary text-primary-foreground font-semibold">1</button>
                {[2, 3, 4, 5].map((n) => <button key={n} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted">{n}</button>)}
                <span className="px-1 text-muted-foreground">…</span>
                <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted">126</button>
                <button className="h-8 w-8 grid place-items-center rounded-lg border border-border text-muted-foreground">›</button>
              </div>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {openId && customer && (
          <aside className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden h-fit sticky top-4">
            <div className="p-4 flex items-start justify-between">
              <button onClick={() => setOpenId(null)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
              <div className="flex items-center gap-1">
                <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><Star className="h-4 w-4" /></button>
                <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="px-5 pb-4 flex items-center gap-3">
              <div className="relative shrink-0">
                <div className={["h-14 w-14 rounded-full bg-gradient-to-br grid place-items-center text-white text-[14px] font-bold", avatarTone(0)].join(" ")}>{initials(customer.name)}</div>
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[15px] font-bold truncate">{customer.name}</h3>
                  <span className={["inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold", TIER_TONE[customer.tier]].join(" ")}>{customer.tier}</span>
                </div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5">{customer.status}</div>
                <div className="text-[11.5px] text-primary font-semibold">{customer.project}</div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="px-5 pb-4 grid grid-cols-5 gap-2 text-center">
              {[
                { i: Phone, l: "Gọi điện", t: "bg-primary-soft text-primary" },
                { i: MessageCircle, l: "Zalo", t: "bg-cyan-50 text-cyan-700" },
                { i: MessageCircle, l: "Messenger", t: "bg-blue-50 text-blue-700" },
                { i: Mail, l: "Email", t: "bg-violet-50 text-violet-700" },
                { i: MoreHorizontal, l: "Thêm", t: "bg-muted text-foreground" },
              ].map((q) => (
                <button key={q.l} className="flex flex-col items-center gap-1.5">
                  <div className={["h-10 w-10 rounded-full grid place-items-center", q.t].join(" ")}><q.i className="h-4 w-4" /></div>
                  <span className="text-[10.5px] font-medium">{q.l}</span>
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="px-5 border-b border-border flex items-center gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={["px-2.5 py-2 text-[12.5px] font-semibold whitespace-nowrap border-b-2 -mb-px",
                    tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"].join(" ")}>{t}</button>
              ))}
            </div>

            {/* Info */}
            <div className="p-5 space-y-4">
              <div>
                <div className="text-[12px] font-bold mb-2.5">Thông tin cơ bản</div>
                <dl className="space-y-2 text-[12.5px]">
                  <Info label="SĐT" value={customer.phone} />
                  <Info label="Email" value={customer.email} />
                  <Info label="Ngày sinh" value={customer.dob} />
                  <Info label="Nguồn" value={<span className={["inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold", SOURCE_TONE[customer.source] || "bg-muted"].join(" ")}>{customer.source}</span>} />
                  <Info label="Ngày tạo" value={customer.createdAt} />
                  <Info label="Sales phụ trách" value={
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-300 to-indigo-400" /> {customer.owner}
                    </span>
                  } />
                  <Info label="Phân loại" value={customer.tier} />
                  <Info label="AI Lead Score" value={
                    <span className={["inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold ring-1", SCORE_TONE(customer.score)].join(" ")}>
                      {customer.score} <span className="font-medium">Rất tốt</span>
                    </span>
                  } />
                  <Info label="Giá trị tiềm năng" value={<span className="font-semibold">{customer.value}</span>} />
                  <Info label="Ghi chú" value={
                    <span className="text-foreground/80 inline-flex items-center gap-1">
                      {customer.note || "—"} <button className="text-muted-foreground"><MoreHorizontal className="h-3 w-3" /></button>
                    </span>
                  } />
                </dl>
              </div>

              {/* AI Lead Score block */}
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[12px] font-bold">AI Lead Score</div>
                </div>
                <div className="flex items-center gap-4">
                  <ScoreRing value={customer.score} label="Rất tốt" />
                  <ul className="flex-1 space-y-1.5 text-[11.5px]">
                    <Signal pos label="Tương tác nhiều lần" delta="+20" />
                    <Signal pos label="Quan tâm dự án phù hợp" delta="+25" />
                    <Signal pos label="Ngân sách phù hợp" delta="+15" />
                    <Signal pos label="Phản hồi nhanh" delta="+10" />
                    <Signal label="Điểm trừ khác" delta="-4" />
                  </ul>
                </div>
                <button className="mt-3 w-full text-[12px] font-semibold text-primary hover:underline inline-flex items-center justify-center gap-1">
                  Xem chi tiết phân tích <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Activity */}
              <div>
                <div className="text-[12px] font-bold mb-3">Hoạt động gần đây</div>
                <ul className="space-y-3">
                  <ActivityItem icon={Mail} tone="bg-violet-50 text-violet-600" title="Email đã mở" desc="Mở email: Chính sách bán hàng T5/2024" time="Hôm nay, 09:15" />
                  <ActivityItem icon={Phone} tone="bg-emerald-50 text-emerald-600" title="Cuộc gọi đến" desc="Gọi tư vấn dự án Vinhomes Ocean Park 2" time="Hôm qua, 14:20" />
                  <ActivityItem icon={MessageCircle} tone="bg-cyan-50 text-cyan-600" title="Tin nhắn Zalo" desc="Trao đổi về tiến độ thanh toán" time="27/05/2024, 10:30" />
                </ul>
                <button className="mt-3 w-full text-[12px] font-semibold text-primary hover:underline inline-flex items-center justify-center gap-1">
                  Xem tất cả hoạt động <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <button className="h-9 px-3 rounded-xl border border-border text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-muted/40">
      {label} <ChevronDown className="h-3.5 w-3.5 opacity-60" />
    </button>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground shrink-0 w-[120px]">{label}</dt>
      <dd className="text-foreground text-right flex-1 min-w-0 break-words">{value}</dd>
    </div>
  );
}

function Signal({ label, delta, pos }: { label: string; delta: string; pos?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5">
        <span className={["h-1.5 w-1.5 rounded-full", pos ? "bg-emerald-500" : "bg-rose-500"].join(" ")} />
        {label}
      </span>
      <span className={["font-bold", pos ? "text-emerald-600" : "text-rose-600"].join(" ")}>{delta}</span>
    </li>
  );
}

function ActivityItem({ icon: Icon, tone, title, desc, time }: { icon: typeof Mail; tone: string; title: string; desc: string; time: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className={["h-9 w-9 rounded-lg grid place-items-center shrink-0", tone].join(" ")}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-semibold">{title}</span>
          <span className="text-[10.5px] text-muted-foreground shrink-0">{time}</span>
        </div>
        <div className="text-[11.5px] text-muted-foreground">{desc}</div>
      </div>
    </li>
  );
}
