import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, KpiCard } from "@/components/app/ui";
import {
  Inbox, Activity, Send, MessageSquare, Target, Percent, Plus, Filter, Search,
  Mail, MessageCircle, Smartphone, Eye, MoreHorizontal, ChevronDown, Sparkles,
  Users2, Clock, ArrowRight,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/ai-followup")({ component: AiFollowupPage });

const TABS = ["Tất cả", "Đang chăm sóc", "Chờ phản hồi", "Đã phản hồi", "Đã chuyển đổi", "Tạm dừng"] as const;

type Status = "Đang chăm sóc" | "Chờ phản hồi" | "Đã phản hồi" | "Tạm dừng";
const STATUS_TONE: Record<Status, string> = {
  "Đang chăm sóc": "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  "Chờ phản hồi": "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  "Đã phản hồi": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  "Tạm dừng": "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

type Channel = "Email" | "Zalo" | "SMS" | "Messenger";
const CHANNEL_TONE: Record<Channel, { bg: string; icon: typeof Mail }> = {
  Email: { bg: "bg-violet-50 text-violet-600", icon: Mail },
  Zalo: { bg: "bg-cyan-50 text-cyan-700", icon: MessageCircle },
  SMS: { bg: "bg-emerald-50 text-emerald-700", icon: Smartphone },
  Messenger: { bg: "bg-blue-50 text-blue-700", icon: MessageSquare },
};

const ROWS: {
  name: string; phone: string; email: string; channel: Channel;
  campaign: string; series: string; steps: number;
  status: Status; current: string; lastAt: string;
  score: number; reply: string; replyAt?: string;
}[] = [
  { name: "Trần Minh Đức", phone: "0987 654 321", email: "duc.tran@gmail.com", channel: "Email", campaign: "Dự án Vinhomes Ocean Park 2", series: "Email Series", steps: 5, status: "Đang chăm sóc", current: "Bước 2: Gửi thông tin dự án", lastAt: "1 giờ trước", score: 86, reply: "Chưa phản hồi" },
  { name: "Lê Thu Hương", phone: "0976 543 210", email: "huong.le@gmail.com", channel: "Zalo", campaign: "Masteri Waterfront", series: "Zalo Series", steps: 4, status: "Chờ phản hồi", current: "Bước 3: Gửi chính sách bán hàng", lastAt: "3 giờ trước", score: 78, reply: "Đã mở tin nhắn", replyAt: "2 giờ trước" },
  { name: "Phạm Tuấn Anh", phone: "0912 345 678", email: "tuananh.pham@gmail.com", channel: "SMS", campaign: "Lumi Hanoi", series: "SMS Series", steps: 3, status: "Đã phản hồi", current: "Bước 2: Tư vấn chuyên sâu", lastAt: "5 giờ trước", score: 72, reply: "Quan tâm", replyAt: "5 giờ trước" },
  { name: "Nguyễn Hải Yến", phone: "0933 222 111", email: "haiyen.nguyen@gmail.com", channel: "Email", campaign: "The Global City", series: "Email Series", steps: 5, status: "Đang chăm sóc", current: "Bước 1: Giới thiệu dự án", lastAt: "1 ngày trước", score: 65, reply: "Chưa phản hồi" },
  { name: "Đỗ Quốc Bảo", phone: "0908 765 432", email: "baodo@gmail.com", channel: "Messenger", campaign: "Eaton Park", series: "Messenger Series", steps: 4, status: "Đã phản hồi", current: "Bước 4: Gửi ưu đãi đặc biệt", lastAt: "1 ngày trước", score: 60, reply: "Quan tâm", replyAt: "1 ngày trước" },
  { name: "Bùi Thị Ngọc", phone: "0823 456 789", email: "ngoc.bui@gmail.com", channel: "Email", campaign: "Vinhomes Ocean Park 2", series: "Email Series", steps: 5, status: "Tạm dừng", current: "Chờ thời điểm phù hợp", lastAt: "2 ngày trước", score: 58, reply: "Chưa phản hồi" },
  { name: "Hoàng Minh Long", phone: "0919 888 666", email: "long.hoang@gmail.com", channel: "Zalo", campaign: "Masteri Waterfront", series: "Zalo Series", steps: 4, status: "Đang chăm sóc", current: "Bước 2: Gửi thông tin dự án", lastAt: "2 ngày trước", score: 80, reply: "Đã mở tin nhắn", replyAt: "1 ngày trước" },
  { name: "Lưu Thanh Tâm", phone: "0934 567 890", email: "tam.luu@gmail.com", channel: "SMS", campaign: "Lumi Hanoi", series: "SMS Series", steps: 3, status: "Chờ phản hồi", current: "Bước 3: Gửi bảng giá", lastAt: "3 ngày trước", score: 74, reply: "Chưa phản hồi" },
  { name: "Võ Hoàng Nam", phone: "0922 111 333", email: "nam.vo@gmail.com", channel: "Email", campaign: "The Global City", series: "Email Series", steps: 5, status: "Đang chăm sóc", current: "Bước 5: Follow-up", lastAt: "3 ngày trước", score: 66, reply: "Chưa phản hồi" },
  { name: "Nguyễn Văn Tùng", phone: "0944 222 777", email: "tung.nguyen@gmail.com", channel: "Messenger", campaign: "Eaton Park", series: "Messenger Series", steps: 4, status: "Đã phản hồi", current: "Bước 4: Gửi ưu đãi đặc biệt", lastAt: "4 ngày trước", score: 71, reply: "Quan tâm", replyAt: "4 ngày trước" },
];

const SCORE_TONE = (s: number) =>
  s >= 80 ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : s >= 70 ? "bg-blue-50 text-blue-700 ring-blue-100"
    : s >= 60 ? "bg-amber-50 text-amber-700 ring-amber-100"
    : "bg-slate-100 text-slate-600 ring-slate-200";

const REPLY_TONE = (r: string) =>
  r === "Quan tâm" ? "text-emerald-600"
    : r === "Đã mở tin nhắn" ? "text-blue-600"
    : "text-muted-foreground";

const DONUT = [
  { name: "Quan tâm", count: 48, pct: 39, color: "#6D5EF6" },
  { name: "Tư vấn", count: 35, pct: 28, color: "#22C55E" },
  { name: "Không quan tâm", count: 25, pct: 20, color: "#F59E0B" },
  { name: "Khác", count: 15, pct: 13, color: "#F43F5E" },
];

const CHANNEL_STATS = [
  { name: "Email", count: "456 leads", pct: 42, color: "bg-violet-500" },
  { name: "Zalo", count: "324 leads", pct: 28, color: "bg-cyan-500" },
  { name: "SMS", count: "210 leads", pct: 18, color: "bg-emerald-500" },
  { name: "Messenger", count: "156 leads", pct: 12, color: "bg-blue-500" },
];

function Donut() {
  const r = 60, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative h-[170px] w-[170px] mx-auto">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        {DONUT.map((d) => {
          const len = (d.pct / 100) * c;
          const arr = `${len} ${c - len}`;
          const off = -acc; acc += len;
          return <circle key={d.name} cx="80" cy="80" r={r} fill="none" stroke={d.color} strokeWidth="20" strokeDasharray={arr} strokeDashoffset={off} />;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[22px] font-bold leading-none">123</div>
          <div className="text-[11px] text-muted-foreground mt-1">Phản hồi</div>
        </div>
      </div>
    </div>
  );
}

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(-2).join("");
const avatarTone = (i: number) => [
  "from-blue-300 to-indigo-400", "from-rose-300 to-fuchsia-400", "from-amber-300 to-orange-400",
  "from-emerald-300 to-teal-400", "from-violet-300 to-purple-400", "from-cyan-300 to-blue-400",
][i % 6];

function AiFollowupPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Tất cả");

  return (
    <div className="space-y-5">
      <PageHeader title="AI Follow-up" sub="Tự động chăm sóc & nuôi dưỡng khách hàng bằng AI." />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5 min-w-0">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4">
            <KpiCard icon={Inbox} label="Tổng leads trong AI" value="1,234" delta={18.2} tone="primary" />
            <KpiCard icon={Activity} label="Đang chăm sóc" value="678" delta={12.4} tone="blue" />
            <KpiCard icon={Send} label="Đã liên hệ" value="456" delta={15.6} tone="rose" />
            <KpiCard icon={MessageSquare} label="Phản hồi" value="123" delta={21.3} tone="amber" />
            <KpiCard icon={Target} label="Chuyển đổi" value="48" delta={16.8} tone="green" />
            <KpiCard icon={Percent} label="Tỷ lệ phản hồi" value="27.0%" delta={4.2} tone="indigo" />
          </div>

          {/* Tabs */}
          <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={["px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition",
                  tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"].join(" ")}>
                {t}
              </button>
            ))}
          </div>

          {/* Toolbar + table */}
          <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted/40 border border-border text-[13px] outline-none focus:ring-2 focus:ring-primary/20" placeholder="Tìm kiếm lead, email, SDT…" />
              </div>
              <Pill label="Tất cả chiến dịch" />
              <Pill label="Tất cả kênh" />
              <Pill label="Trạng thái: Tất cả" />
              <button className="h-9 px-3 rounded-xl border border-border text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-muted/40">
                <Filter className="h-4 w-4" /> Bộ lọc
              </button>
              <button className="ml-auto h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-soft">
                <Plus className="h-4 w-4" /> Tạo chiến dịch
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                    <th className="px-5 py-3 font-semibold">Lead</th>
                    <th className="px-3 py-3 font-semibold">Kênh</th>
                    <th className="px-3 py-3 font-semibold">Chiến dịch</th>
                    <th className="px-3 py-3 font-semibold">Trạng thái</th>
                    <th className="px-3 py-3 font-semibold">Bước hiện tại</th>
                    <th className="px-3 py-3 font-semibold">Lần liên hệ cuối</th>
                    <th className="px-3 py-3 font-semibold">AI Score</th>
                    <th className="px-3 py-3 font-semibold">Phản hồi</th>
                    <th className="px-3 py-3 font-semibold text-right pr-5">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r, i) => {
                    const ch = CHANNEL_TONE[r.channel];
                    return (
                      <tr key={r.email} className="border-t border-border hover:bg-muted/30 transition">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={["h-9 w-9 rounded-full bg-gradient-to-br shrink-0 grid place-items-center text-white text-[11.5px] font-bold", avatarTone(i)].join(" ")}>{initials(r.name)}</div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{r.name}</div>
                              <div className="text-[11px] text-muted-foreground">{r.phone}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{r.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className={["h-8 w-8 rounded-lg grid place-items-center", ch.bg].join(" ")}>
                              <ch.icon className="h-4 w-4" />
                            </div>
                            <span className="text-[10.5px] text-muted-foreground">{r.channel}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{r.campaign}</div>
                          <div className="text-[11px] text-muted-foreground">{r.series} · {r.steps} bước</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={["inline-flex items-center px-2 py-1 rounded-md text-[11.5px] font-semibold", STATUS_TONE[r.status]].join(" ")}>{r.status}</span>
                        </td>
                        <td className="px-3 py-3 text-foreground/90">{r.current}</td>
                        <td className="px-3 py-3 text-muted-foreground">{r.lastAt}</td>
                        <td className="px-3 py-3">
                          <span className={["inline-flex items-center justify-center h-6 min-w-[32px] px-1.5 rounded-md text-[11.5px] font-bold ring-1", SCORE_TONE(r.score)].join(" ")}>{r.score}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className={["text-[12.5px] font-medium", REPLY_TONE(r.reply)].join(" ")}>{r.reply}</div>
                          {r.replyAt && <div className="text-[11px] text-muted-foreground">{r.replyAt}</div>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1 pr-2">
                            <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><Eye className="h-4 w-4" /></button>
                            <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><MessageCircle className="h-4 w-4" /></button>
                            <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-border text-[12.5px]">
              <div className="text-muted-foreground">Hiển thị 1 - 10 của 1,234 leads</div>
              <div className="flex items-center gap-2">
                <button className="h-8 px-2.5 rounded-lg border border-border inline-flex items-center gap-1 text-[12px]">10 / trang <ChevronDown className="h-3.5 w-3.5 opacity-60" /></button>
                <div className="flex items-center gap-1">
                  <button className="h-8 w-8 grid place-items-center rounded-lg border border-border text-muted-foreground">‹</button>
                  <button className="h-8 w-8 grid place-items-center rounded-lg bg-primary text-primary-foreground font-semibold">1</button>
                  {[2, 3, 4, 5].map((n) => <button key={n} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted">{n}</button>)}
                  <span className="px-1 text-muted-foreground">…</span>
                  <button className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted">124</button>
                  <button className="h-8 w-8 grid place-items-center rounded-lg border border-border text-muted-foreground">›</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* AI suggestions */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> AI đề xuất hành động</h3>
              <button className="text-[11.5px] font-semibold text-primary hover:underline">Xem tất cả</button>
            </div>
            <div className="space-y-3">
              <SuggestionCard
                icon={Users2} tone="bg-primary-soft text-primary"
                title="Ưu tiên liên hệ lại với 5 leads"
                desc="có AI Score cao nhưng chưa phản hồi"
                actionLabel="Xem danh sách"
                count={5}
              />
              <SuggestionCard
                icon={Target} tone="bg-emerald-50 text-emerald-600"
                title="Gửi chính sách ưu đãi mới"
                desc="cho 78 leads quan tâm dự án"
                actionLabel="Tạo chiến dịch"
                count={75}
              />
              <SuggestionCard
                icon={Clock} tone="bg-amber-50 text-amber-600"
                title="Thời điểm vàng để follow-up"
                desc="với nhóm leads đã mở email 2 lần"
                actionLabel="Xem chi tiết"
              />
            </div>
          </div>

          {/* Donut */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold">Hiệu quả AI Follow-up</h3>
              <button className="h-7 px-2.5 rounded-lg border border-border text-[11.5px] inline-flex items-center gap-1 text-muted-foreground">30 ngày qua <ChevronDown className="h-3 w-3" /></button>
            </div>
            <Donut />
            <div className="mt-4 space-y-2">
              {DONUT.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="text-muted-foreground">({d.count})</span>
                  <span className="font-semibold">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Channel stats */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold">Thống kê theo kênh</h3>
              <button className="h-7 px-2.5 rounded-lg border border-border text-[11.5px] inline-flex items-center gap-1 text-muted-foreground">30 ngày qua <ChevronDown className="h-3 w-3" /></button>
            </div>
            <div className="space-y-3.5">
              {CHANNEL_STATS.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-[12.5px] mb-1">
                    <div>
                      <div className="font-medium">{s.name}</div>
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

          {/* Active campaigns */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold">Chiến dịch hoạt động</h3>
              <button className="text-[11.5px] font-semibold text-primary hover:underline">Xem tất cả</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-100 p-3">
                <div className="text-[11px] text-emerald-700 font-semibold">Đang chạy</div>
                <div className="text-[18px] font-bold text-emerald-800 mt-1">8 chiến dịch</div>
              </div>
              <div className="rounded-xl bg-amber-50 ring-1 ring-amber-100 p-3">
                <div className="text-[11px] text-amber-700 font-semibold">Sắp chạy</div>
                <div className="text-[18px] font-bold text-amber-800 mt-1">3 chiến dịch</div>
              </div>
            </div>
          </div>
        </div>
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

function SuggestionCard({
  icon: Icon, tone, title, desc, actionLabel, count,
}: { icon: typeof Users2; tone: string; title: string; desc: string; actionLabel: string; count?: number }) {
  return (
    <div className="rounded-xl border border-border p-3.5 hover:bg-muted/30 transition">
      <div className="flex items-start gap-3">
        <div className={["h-9 w-9 rounded-xl grid place-items-center shrink-0", tone].join(" ")}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold">{title}</div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5">{desc}</div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            {count ? (
              <div className="flex items-center -space-x-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={["h-6 w-6 rounded-full bg-gradient-to-br ring-2 ring-card", avatarTone(i)].join(" ")} />
                ))}
                <span className="ml-2.5 text-[11px] font-semibold text-muted-foreground">+{count - 3}</span>
              </div>
            ) : <span />}
            <button className="h-7 px-2.5 rounded-lg bg-card border border-border text-[11.5px] font-semibold inline-flex items-center gap-1 hover:bg-muted/40">
              {actionLabel} <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
