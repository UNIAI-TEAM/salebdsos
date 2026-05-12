import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import {
  Filter, Plus, Star, MoreHorizontal, Phone, Mail, MessageCircle, Users2,
  Target, Sparkles, X, Upload, List, LayoutGrid, ChevronDown, Calendar,
  Edit3, ChevronLeft, ChevronRight, DollarSign, UserPlus, TrendingUp, Heart,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/leads")({ component: LeadsPage });

type Status = "Mới" | "Đang liên hệ" | "Tư vấn" | "Đang tư vấn" | "Gửi báo giá" | "Đang chăm sóc";

const STATUS_TONE: Record<Status, string> = {
  "Mới": "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
  "Đang liên hệ": "bg-violet-50 text-violet-600 ring-1 ring-violet-100",
  "Tư vấn": "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  "Đang tư vấn": "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  "Gửi báo giá": "bg-orange-50 text-orange-600 ring-1 ring-orange-100",
  "Đang chăm sóc": "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
};

const SOURCE_TONE: Record<string, string> = {
  NFC: "bg-primary-soft text-primary",
  "QR Code": "bg-blue-50 text-blue-600",
  Link: "bg-emerald-50 text-emerald-600",
  "Facebook Ads": "bg-sky-50 text-sky-600",
  Zalo: "bg-cyan-50 text-cyan-700",
  "Sự kiện": "bg-rose-50 text-rose-600",
  Referral: "bg-fuchsia-50 text-fuchsia-600",
  Website: "bg-indigo-50 text-indigo-600",
};

const ALL_LEADS: {
  id: number; name: string; source: string; project: string; phone: string; email: string;
  status: Status; score: number; createdAt: string; owner: string; budget: string; need: string; timing: string;
}[] = [
  { id: 1, name: "Trần Minh Đức", source: "NFC", project: "Vinhomes Ocean Park 2", phone: "0987 654 321", email: "duc.tran@gmail.com", status: "Mới", score: 86, createdAt: "31/05/2024 10:30", owner: "Nguyễn Văn A", budget: "3 - 5 tỷ", need: "Mua để ở", timing: "Q3/2024" },
  { id: 2, name: "Lê Thu Hương", source: "QR Code", project: "Masteri Waterfront", phone: "0976 543 210", email: "huong.le@gmail.com", status: "Đang liên hệ", score: 78, createdAt: "31/05/2024 09:15", owner: "Lê Minh Hằng", budget: "2 - 3 tỷ", need: "Đầu tư", timing: "Q3/2024" },
  { id: 3, name: "Phạm Tuấn Anh", source: "Link", project: "Lumi Hanoi", phone: "0912 345 678", email: "tuananh.pham@gmail.com", status: "Tư vấn", score: 72, createdAt: "30/05/2024 16:20", owner: "Trần Thanh Long", budget: "4 - 6 tỷ", need: "Mua để ở", timing: "Q4/2024" },
  { id: 4, name: "Nguyễn Hải Yến", source: "NFC", project: "The Global City", phone: "0933 222 111", email: "haiyen.nguyen@gmail.com", status: "Đang tư vấn", score: 65, createdAt: "30/05/2024 14:05", owner: "Phạm Quốc Anh", budget: "5 - 7 tỷ", need: "Đầu tư", timing: "Q4/2024" },
  { id: 5, name: "Đỗ Quốc Bảo", source: "QR Code", project: "Eaton Park", phone: "0908 765 432", email: "baodo@gmail.com", status: "Gửi báo giá", score: 60, createdAt: "29/05/2024 11:45", owner: "Vũ Hải Yến", budget: "6 - 8 tỷ", need: "Mua để ở", timing: "Q3/2024" },
  { id: 6, name: "Bùi Thị Ngọc", source: "Facebook Ads", project: "Vinhomes Ocean Park 2", phone: "0823 456 789", email: "ngoc.bui@gmail.com", status: "Mới", score: 58, createdAt: "29/05/2024 10:10", owner: "Nguyễn Văn A", budget: "3 - 4 tỷ", need: "Đầu tư", timing: "2025" },
  { id: 7, name: "Hoàng Minh Long", source: "Zalo", project: "Masteri Waterfront", phone: "0919 888 666", email: "long.hoang@gmail.com", status: "Đang chăm sóc", score: 80, createdAt: "28/05/2024 15:30", owner: "Lê Minh Hằng", budget: "8 - 10 tỷ", need: "Mua để ở", timing: "Q3/2024" },
  { id: 8, name: "Lưu Thanh Tâm", source: "Sự kiện", project: "The Global City", phone: "0934 567 890", email: "tam.luu@gmail.com", status: "Tư vấn", score: 74, createdAt: "28/05/2024 09:20", owner: "Trần Thanh Long", budget: "5 - 6 tỷ", need: "Đầu tư", timing: "Q4/2024" },
  { id: 9, name: "Võ Hoàng Nam", source: "Referral", project: "Lumi Hanoi", phone: "0922 111 333", email: "nam.vo@gmail.com", status: "Gửi báo giá", score: 66, createdAt: "27/05/2024 17:00", owner: "Phạm Quốc Anh", budget: "4 - 5 tỷ", need: "Mua để ở", timing: "Q3/2024" },
  { id: 10, name: "Nguyễn Văn Tùng", source: "Website", project: "Vinhomes Ocean Park 2", phone: "0944 222 777", email: "tung.nguyen@gmail.com", status: "Đang liên hệ", score: 71, createdAt: "27/05/2024 11:25", owner: "Vũ Hải Yến", budget: "3 - 4 tỷ", need: "Đầu tư", timing: "Q4/2024" },
];

const initials = (n: string) => n.split(" ").pop()!.charAt(0);
const ownerInitials = (n: string) => n.split(" ").map((p) => p[0]).slice(-2).join("");

const TABS = ["Thông tin", "Lịch sử", "Hoạt động", "Ghi chú", "Tệp tin"] as const;

function LeadsPage() {
  const [openId, setOpenId] = useState<number | null>(1);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Thông tin");
  const lead = ALL_LEADS.find((l) => l.id === openId);

  return (
    <div className="space-y-6">
      <PageHeader title="Leads (CRM)" sub="Quản lý và chăm sóc khách hàng tiềm năng." />

      {/* KPI cards: 6 cards like reference */}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4">
        <KpiCard icon={Users2} label="Tổng leads" value="1,234" delta={18.2} tone="primary" />
        <KpiCard icon={UserPlus} label="Leads mới" value="246" delta={12.4} tone="blue" />
        <KpiCard icon={Heart} label="Đang chăm sóc" value="678" delta={8.6} tone="indigo" />
        <KpiCard icon={Target} label="Chuyển đổi" value="98" delta={15.3} tone="green" />
        <KpiCard icon={TrendingUp} label="Tỷ lệ chuyển đổi" value="7.94%" delta={11.2} tone="amber" />
        <KpiCard icon={DollarSign} label="Doanh thu dự kiến" value="28.6 tỷ" delta={14.7} tone="rose" />
      </div>

      {/* Main grid: table + slide-in detail */}
      <div className={[
        "grid gap-6 transition-all",
        openId ? "grid-cols-1 xl:grid-cols-[1fr_400px]" : "grid-cols-1",
      ].join(" ")}>
        <SectionCard className="overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-flex rounded-xl border border-border bg-muted/50 p-0.5">
              <button className="h-8 w-9 rounded-lg bg-card shadow-soft grid place-items-center"><List className="h-4 w-4" /></button>
              <button className="h-8 w-9 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground"><LayoutGrid className="h-4 w-4" /></button>
            </div>
            <FilterPill label="Tất cả nguồn" />
            <FilterPill icon={Calendar} label="01/05/2024 – 31/05/2024" />
            <FilterPill label="Tất cả dự án" />
            <FilterPill label="Tất cả trạng thái" />
            <button className="ml-auto h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-medium hover:bg-muted inline-flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground" /> Bộ lọc
            </button>
            <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-medium hover:bg-muted inline-flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-muted-foreground" /> Import
            </button>
            <button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-glow">
              <Plus className="h-4 w-4" /> Thêm lead
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto -mx-5 px-5 scrollbar-thin">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="font-semibold py-3 w-8"><input type="checkbox" className="accent-primary rounded" /></th>
                  <th className="font-semibold py-3">Họ và tên</th>
                  <th className="font-semibold py-3">Nguồn</th>
                  <th className="font-semibold py-3">Dự án quan tâm</th>
                  <th className="font-semibold py-3">SĐT</th>
                  <th className="font-semibold py-3">Email</th>
                  <th className="font-semibold py-3">Trạng thái</th>
                  <th className="font-semibold py-3 text-center">AI Score</th>
                  <th className="font-semibold py-3">Ngày tạo</th>
                  <th className="font-semibold py-3">Người phụ trách</th>
                  <th className="font-semibold py-3 w-8" />
                </tr>
              </thead>
              <tbody className="text-[12.5px]">
                {ALL_LEADS.map((l) => {
                  const active = openId === l.id;
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setOpenId(l.id)}
                      className={[
                        "border-b border-border/70 last:border-0 cursor-pointer transition group",
                        active ? "bg-primary-soft/30" : "hover:bg-muted/40",
                      ].join(" ")}
                    >
                      <td className="py-3.5"><input type="checkbox" className="accent-primary rounded" onClick={(e) => e.stopPropagation()} /></td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-indigo-400/30 grid place-items-center text-[11.5px] font-semibold text-primary">
                              {initials(l.name)}
                            </div>
                            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                          </div>
                          <span className="font-semibold text-foreground">{l.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={["text-[10.5px] px-2 py-1 rounded-md font-semibold", SOURCE_TONE[l.source] ?? "bg-muted text-muted-foreground"].join(" ")}>{l.source}</span>
                      </td>
                      <td className="py-3.5 text-foreground">{l.project}</td>
                      <td className="py-3.5 text-muted-foreground tabular-nums">{l.phone}</td>
                      <td className="py-3.5 text-muted-foreground">{l.email}</td>
                      <td className="py-3.5">
                        <span className={["text-[10.5px] px-2 py-1 rounded-md font-semibold", STATUS_TONE[l.status]].join(" ")}>{l.status}</span>
                      </td>
                      <td className="py-3.5 text-center">
                        <ScorePill score={l.score} />
                      </td>
                      <td className="py-3.5 text-muted-foreground tabular-nums">{l.createdAt}</td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[10px] font-bold">{ownerInitials(l.owner)}</div>
                          <span className="hidden 2xl:inline text-foreground">{l.owner}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <button onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-2 border-t border-border">
            <div className="text-[12px] text-muted-foreground">Hiển thị <span className="font-semibold text-foreground">1 – 10</span> của <span className="font-semibold text-foreground">1,234</span> leads</div>
            <div className="flex items-center gap-2">
              <button className="h-8 px-2.5 rounded-lg border border-border text-[12px] font-medium inline-flex items-center gap-1 hover:bg-muted">
                10 / trang <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-0.5">
                <PageBtn icon={ChevronLeft} />
                <PageBtn label="1" active />
                <PageBtn label="2" />
                <PageBtn label="3" />
                <PageBtn label="4" />
                <PageBtn label="5" />
                <span className="px-1 text-muted-foreground text-[12px]">…</span>
                <PageBtn label="124" />
                <PageBtn icon={ChevronRight} />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Detail panel */}
        {lead && (
          <aside className="rounded-2xl bg-card border border-border shadow-card overflow-hidden xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto scrollbar-thin">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
              <button onClick={() => setOpenId(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Star className="h-4 w-4" /></button>
                <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Profile */}
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[16px] font-bold">{initials(lead.name)}</div>
                  <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-bold truncate">{lead.name}</h3>
                    <span className={["text-[10px] px-1.5 py-0.5 rounded-md font-semibold", STATUS_TONE[lead.status]].join(" ")}>{lead.status}</span>
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">Khách hàng tiềm năng</div>
                  <div className="text-[12px] text-foreground mt-0.5 font-medium">{lead.project}</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-5 gap-1.5 mt-4">
                <ActionBtn icon={Phone} label="" />
                <ActionBtn icon={MessageCircle} label="Zalo" />
                <ActionBtn icon={MessageCircle} label="" />
                <ActionBtn icon={Mail} label="" />
                <ActionBtn icon={Edit3} label="" primary />
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 border-b border-border">
              <div className="flex gap-4 overflow-x-auto scrollbar-thin">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={[
                      "py-2.5 text-[12.5px] font-medium border-b-2 -mb-px whitespace-nowrap transition",
                      tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {tab === "Thông tin" && (
              <div className="px-5 py-4 space-y-5">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Thông tin cơ bản</div>
                  <dl className="space-y-2 text-[12.5px]">
                    {[
                      ["SĐT", <span key="p" className="inline-flex items-center gap-1.5 font-medium tabular-nums">{lead.phone}<Phone className="h-3 w-3 text-primary" /></span>],
                      ["Email", <span key="e" className="font-medium truncate">{lead.email}</span>],
                      ["Nguồn", <span key="s" className={["text-[10.5px] px-2 py-0.5 rounded-md font-semibold", SOURCE_TONE[lead.source]].join(" ")}>{lead.source}</span>],
                      ["Ngày tạo", <span key="d" className="font-medium tabular-nums">{lead.createdAt}</span>],
                      ["Người phụ trách",
                        <span key="o" className="inline-flex items-center gap-1.5 font-medium">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[8.5px] font-bold">{ownerInitials(lead.owner)}</div>
                          {lead.owner}
                        </span>],
                      ["Dự án quan tâm", <span key="pj" className="font-medium">{lead.project}</span>],
                      ["Ngân sách", <span key="b" className="font-medium">{lead.budget}</span>],
                      ["Nhu cầu", <span key="n" className="font-medium">{lead.need}</span>],
                      ["Thời gian dự kiến", <span key="t" className="font-medium">{lead.timing}</span>],
                    ].map(([k, v]) => (
                      <div key={k as string} className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* AI Lead Score */}
                <div className="rounded-2xl border border-border bg-gradient-to-br from-primary-soft/40 to-transparent p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[12.5px] font-bold inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI Lead Score</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <ScoreRing score={lead.score} />
                    <ul className="flex-1 text-[11.5px] space-y-1.5">
                      {[
                        { l: "Tương tác nhiều lần", v: 20, ok: true },
                        { l: "Quan tâm dự án phù hợp", v: 25, ok: true },
                        { l: "Ngân sách phù hợp", v: 15, ok: true },
                        { l: "Phản hồi nhanh", v: 10, ok: true },
                        { l: "Điểm trừ khác", v: -4, ok: false },
                      ].map((s) => (
                        <li key={s.l} className="flex items-center gap-2">
                          <span className={["h-1.5 w-1.5 rounded-full", s.ok ? "bg-emerald-500" : "bg-rose-500"].join(" ")} />
                          <span className="flex-1 text-foreground">{s.l}</span>
                          <span className={["font-bold tabular-nums", s.ok ? "text-emerald-600" : "text-rose-600"].join(" ")}>{s.v > 0 ? "+" : ""}{s.v}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button className="mt-3 text-[11.5px] text-primary font-semibold hover:underline">Xem chi tiết phân tích →</button>
                </div>

                {/* Stage selector */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Giai đoạn hiện tại</div>
                  <div className="flex items-center gap-2">
                    <span className={["text-[12px] px-2.5 py-1.5 rounded-lg font-semibold", STATUS_TONE[lead.status]].join(" ")}>{lead.status}</span>
                    <button className="ml-auto h-8 px-2.5 rounded-lg border border-border text-[11.5px] font-medium inline-flex items-center gap-1 hover:bg-muted">
                      Chuyển giai đoạn <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick note */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Ghi chú nhanh</div>
                  <textarea rows={3} placeholder="Nhập ghi chú…" className="w-full rounded-xl border border-border bg-muted/40 p-3 text-[12.5px] outline-none focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition resize-none" />
                </div>
              </div>
            )}

            {tab !== "Thông tin" && (
              <div className="px-5 py-10 text-center text-[12.5px] text-muted-foreground">
                Nội dung tab "{tab}" sẽ hiển thị tại đây.
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function FilterPill({ label, icon: Icon }: { label: string; icon?: any }) {
  return (
    <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-medium hover:bg-muted inline-flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      {label}
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}

function PageBtn({ label, active, icon: Icon }: { label?: string; active?: boolean; icon?: any }) {
  return (
    <button className={[
      "h-8 min-w-8 px-2 rounded-lg text-[12px] font-semibold inline-flex items-center justify-center transition",
      active ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground hover:bg-muted",
    ].join(" ")}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : label}
    </button>
  );
}

function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 80 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
    score >= 70 ? "bg-amber-50 text-amber-700 ring-amber-200" :
    score >= 60 ? "bg-orange-50 text-orange-700 ring-orange-200" :
                  "bg-slate-50 text-slate-700 ring-slate-200";
  return (
    <span className={["inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-md text-[11.5px] font-bold ring-1 tabular-nums", tone].join(" ")}>
      {score}
    </span>
  );
}

function ActionBtn({ icon: Icon, label, primary }: { icon: any; label?: string; primary?: boolean }) {
  return (
    <button className={[
      "h-11 rounded-xl border inline-flex items-center justify-center gap-1.5 text-[11.5px] font-semibold transition",
      primary ? "bg-primary border-primary text-primary-foreground shadow-glow hover:opacity-95"
              : "bg-card border-border text-foreground hover:border-primary hover:text-primary",
    ].join(" ")}>
      <Icon className="h-4 w-4" />
      {label && <span>{label}</span>}
    </button>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const tone = score >= 80 ? "stroke-emerald-500" : score >= 70 ? "stroke-amber-500" : "stroke-orange-500";
  const label = score >= 80 ? "Rất tốt" : score >= 70 ? "Tốt" : score >= 60 ? "Khá" : "Trung bình";
  return (
    <div className="shrink-0 text-center">
      <div className="relative h-[76px] w-[76px]">
        <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
          <circle cx="36" cy="36" r={r} className="fill-none stroke-muted" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} className={["fill-none transition-all", tone].join(" ")} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-[18px] font-bold tabular-nums">{score}</div>
        </div>
      </div>
      <div className="text-[11px] font-semibold text-emerald-600 mt-1">{label}</div>
      <div className="text-[10px] text-muted-foreground">Khả năng chuyển đổi cao</div>
    </div>
  );
}
