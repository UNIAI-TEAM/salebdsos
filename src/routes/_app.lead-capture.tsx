import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import {
  Radio, QrCode, Send, Zap, Users2, UserPlus, Clock, CheckCircle2, AlertTriangle,
  Settings, ChevronRight, Plus, Filter, Search, MoreHorizontal, ArrowRight,
  Smartphone, MapPin, Calendar, Sparkles, Shield, Bell, Activity, RefreshCw,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/lead-capture")({ component: LeadCapturePage });

type Channel = "NFC" | "QR" | "AirDrop";
type Status = "Mới" | "Đã gán" | "Đang xử lý" | "Đã liên hệ" | "Chuyển CRM" | "Bỏ qua";

const CHANNEL_META: Record<Channel, { icon: any; tone: string; label: string }> = {
  NFC: { icon: Radio, tone: "bg-primary-soft text-primary", label: "NFC Tap" },
  QR: { icon: QrCode, tone: "bg-blue-50 text-blue-600", label: "QR Scan" },
  AirDrop: { icon: Send, tone: "bg-violet-50 text-violet-600", label: "AirDrop" },
};

const STATUS_TONE: Record<Status, string> = {
  "Mới": "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  "Đã gán": "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  "Đang xử lý": "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  "Đã liên hệ": "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100",
  "Chuyển CRM": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  "Bỏ qua": "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

type Capture = {
  id: number;
  channel: Channel;
  card: string;
  visitor: string;
  device: string;
  location: string;
  capturedAt: string;
  duration: string;
  status: Status;
  owner?: string;
  score: number;
  saved: boolean;
};

const CAPTURES: Capture[] = [
  { id: 1, channel: "NFC", card: "Nguyễn Văn A · Sales Mgr", visitor: "Trần Minh Đức", device: "iPhone 15 Pro", location: "Showroom Q.1, HCM", capturedAt: "2 phút trước", duration: "3m 42s", status: "Mới", score: 86, saved: true },
  { id: 2, channel: "QR", card: "Lê Thu Hương · Sales", visitor: "Khách ẩn danh", device: "Samsung S24", location: "Sự kiện Vinhomes OP2", capturedAt: "8 phút trước", duration: "1m 18s", status: "Đã gán", owner: "Lê Thu Hương", score: 64, saved: false },
  { id: 3, channel: "AirDrop", card: "Phạm Tuấn Anh · Senior", visitor: "Nguyễn Hải Yến", device: "iPhone 14", location: "Coffee meet, Q.3", capturedAt: "15 phút trước", duration: "5m 02s", status: "Đang xử lý", owner: "Phạm Tuấn Anh", score: 78, saved: true },
  { id: 4, channel: "NFC", card: "Nguyễn Văn A · Sales Mgr", visitor: "Đỗ Quốc Bảo", device: "iPhone 13", location: "Showroom Q.7, HCM", capturedAt: "32 phút trước", duration: "2m 11s", status: "Đã liên hệ", owner: "Nguyễn Văn A", score: 71, saved: true },
  { id: 5, channel: "QR", card: "Bùi Thị Ngọc · CSKH", visitor: "Khách ẩn danh", device: "Xiaomi 13", location: "Brochure Lumi Hanoi", capturedAt: "1 giờ trước", duration: "0m 48s", status: "Bỏ qua", score: 32, saved: false },
  { id: 6, channel: "AirDrop", card: "Hoàng Minh Long · Marketing", visitor: "Lưu Thanh Tâm", device: "iPhone 15", location: "Open House Eaton Park", capturedAt: "2 giờ trước", duration: "4m 28s", status: "Chuyển CRM", owner: "Hoàng Minh Long", score: 82, saved: true },
  { id: 7, channel: "NFC", card: "Đỗ Quốc Bảo · Senior", visitor: "Võ Hoàng Nam", device: "iPhone 12", location: "Showroom Q.2, HCM", capturedAt: "3 giờ trước", duration: "6m 15s", status: "Đã gán", owner: "Đỗ Quốc Bảo", score: 74, saved: true },
  { id: 8, channel: "QR", card: "Lê Thu Hương · Sales", visitor: "Nguyễn Văn Tùng", device: "Pixel 8", location: "Standee Masteri WF", capturedAt: "4 giờ trước", duration: "2m 50s", status: "Đang xử lý", owner: "Lê Thu Hương", score: 69, saved: true },
];

const STAFF = ["Nguyễn Văn A", "Lê Thu Hương", "Phạm Tuấn Anh", "Đỗ Quốc Bảo", "Hoàng Minh Long", "Bùi Thị Ngọc"];

const RULES = [
  { id: 1, name: "NFC Tap → Sales Owner của card", channel: "NFC" as Channel, mode: "Theo chủ thẻ", active: true, hits: 124 },
  { id: 2, name: "QR Scan trên Brochure Lumi Hanoi", channel: "QR" as Channel, mode: "Round-robin · Phòng Kinh doanh 1", active: true, hits: 87 },
  { id: 3, name: "AirDrop tại Sự kiện Open House", channel: "AirDrop" as Channel, mode: "Gán cho host sự kiện", active: true, hits: 36 },
  { id: 4, name: "QR Scan ngoài giờ HC", channel: "QR" as Channel, mode: "Hàng đợi · Phân bổ sáng hôm sau", active: false, hits: 12 },
];

function ChannelChip({ channel }: { channel: Channel }) {
  const m = CHANNEL_META[channel];
  return (
    <span className={["inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold", m.tone].join(" ")}>
      <m.icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").slice(-2).map((s) => s[0]).join("");
  return (
    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/80 to-indigo-500 grid place-items-center text-white text-[10.5px] font-bold">
      {initials}
    </div>
  );
}

function LeadCapturePage() {
  const [items, setItems] = useState<Capture[]>(CAPTURES);
  const [tab, setTab] = useState<"all" | Channel>("all");
  const [openId, setOpenId] = useState<number | null>(1);
  const filtered = items.filter((c) => tab === "all" || c.channel === tab);
  const selected = items.find((c) => c.id === openId);

  const updateItem = (id: number, patch: Partial<Capture>) =>
    setItems((arr) => arr.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div>
      <PageHeader
        title="Tự động tạo Lead"
        sub="Mỗi lượt NFC Tap, QR Scan hay AirDrop xem danh thiếp đều tự động ghi nhận và phân bổ cho nhân viên phụ trách."
        action={
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted">
              <Settings className="h-4 w-4" /> Cấu hình quy tắc
            </button>
            <button className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Tạo quy tắc mới
            </button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        <KpiCard icon={Zap} label="Lead tự động hôm nay" value="38" delta={24.5} deltaLabel="so với hôm qua" tone="primary" />
        <KpiCard icon={Radio} label="NFC Tap" value="124" delta={12.3} tone="indigo" />
        <KpiCard icon={QrCode} label="QR Scan" value="87" delta={8.7} tone="blue" />
        <KpiCard icon={Send} label="AirDrop" value="36" delta={18.2} tone="rose" />
        <KpiCard icon={CheckCircle2} label="Tỷ lệ chuyển CRM" value="62.4%" delta={4.1} tone="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* Main column */}
        <div className="space-y-6">
          {/* Realtime feed */}
          <SectionCard
            title="Hoạt động ghi nhận"
            action={
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-emerald-600 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
                <button className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-border text-[12px] hover:bg-muted">
                  <RefreshCw className="h-3.5 w-3.5" /> Làm mới
                </button>
              </div>
            }
          >
            {/* Tabs + filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted">
                {([
                  { k: "all", label: "Tất cả" },
                  { k: "NFC", label: "NFC Tap" },
                  { k: "QR", label: "QR Scan" },
                  { k: "AirDrop", label: "AirDrop" },
                ] as const).map((t) => (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k as any)}
                    className={[
                      "px-3 h-7 rounded-md text-[12.5px] font-medium transition",
                      tab === t.k ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input placeholder="Tìm theo khách / thẻ" className="h-8 pl-7 pr-3 rounded-md border border-border bg-card text-[12.5px] w-56 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <button className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-border text-[12px] hover:bg-muted">
                  <Filter className="h-3.5 w-3.5" /> Bộ lọc
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-[13px]">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-4 py-2.5 font-medium">Khách / Thiết bị</th>
                    <th className="px-3 py-2.5 font-medium">Kênh</th>
                    <th className="px-3 py-2.5 font-medium">Danh thiếp</th>
                    <th className="px-3 py-2.5 font-medium">Score</th>
                    <th className="px-3 py-2.5 font-medium">Phụ trách</th>
                    <th className="px-3 py-2.5 font-medium">Trạng thái</th>
                    <th className="px-3 py-2.5 font-medium text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setOpenId(c.id)}
                      className={["cursor-pointer transition", openId === c.id ? "bg-primary-soft/40" : "hover:bg-muted/40"].join(" ")}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{c.visitor}</div>
                        <div className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Smartphone className="h-3 w-3" /> {c.device} · {c.duration}
                        </div>
                      </td>
                      <td className="px-3 py-3"><ChannelChip channel={c.channel} /></td>
                      <td className="px-3 py-3 text-foreground/80">{c.card}</td>
                      <td className="px-3 py-3">
                        <span className={[
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[11.5px] font-bold",
                          c.score >= 80 ? "bg-emerald-50 text-emerald-700" : c.score >= 60 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600",
                        ].join(" ")}>{c.score}</span>
                      </td>
                      <td className="px-3 py-3">
                        {c.owner ? (
                          <div className="inline-flex items-center gap-1.5"><Avatar name={c.owner} /><span className="text-[12.5px]">{c.owner}</span></div>
                        ) : (
                          <span className="text-[12px] text-muted-foreground italic">Chưa gán</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={["inline-flex px-2 py-0.5 rounded-md text-[11.5px] font-semibold", STATUS_TONE[c.status]].join(" ")}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-[12px] text-muted-foreground">{c.capturedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Rules */}
          <SectionCard
            title="Quy tắc tự động phân bổ"
            action={
              <button className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> Thêm quy tắc
              </button>
            }
          >
            <div className="space-y-2.5">
              {RULES.map((r) => (
                <div key={r.id} className="flex items-center gap-4 p-3.5 rounded-xl border border-border hover:border-primary/40 hover:shadow-soft transition">
                  <div className={["h-9 w-9 rounded-lg grid place-items-center", CHANNEL_META[r.channel].tone].join(" ")}>
                    {(() => { const I = CHANNEL_META[r.channel].icon; return <I className="h-4 w-4" />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold text-foreground truncate">{r.name}</div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1"><Users2 className="h-3 w-3" /> {r.mode}</span>
                      <span>·</span>
                      <span>{r.hits} lead đã tạo / 30 ngày</span>
                    </div>
                  </div>
                  <button
                    className={[
                      "relative h-5 w-9 rounded-full transition",
                      r.active ? "bg-primary" : "bg-slate-300",
                    ].join(" ")}
                    title="Bật/tắt"
                  >
                    <span className={["absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition", r.active ? "left-4" : "left-0.5"].join(" ")} />
                  </button>
                  <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Detail panel */}
        {selected ? (
          <aside className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden h-fit sticky top-4">
            <div className="p-5 border-b border-border bg-gradient-to-br from-primary-soft/60 to-card">
              <div className="flex items-center justify-between mb-3">
                <ChannelChip channel={selected.channel} />
                <span className={["inline-flex px-2 py-0.5 rounded-md text-[11.5px] font-semibold", STATUS_TONE[selected.status]].join(" ")}>
                  {selected.status}
                </span>
              </div>
              <div className="text-[18px] font-bold text-foreground">{selected.visitor}</div>
              <div className="text-[12.5px] text-muted-foreground mt-0.5">
                Đã xem danh thiếp <span className="font-medium text-foreground">{selected.card}</span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                <div className="flex items-start gap-2"><Smartphone className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><div className="text-muted-foreground">Thiết bị</div><div className="font-medium">{selected.device}</div></div></div>
                <div className="flex items-start gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><div className="text-muted-foreground">Thời lượng xem</div><div className="font-medium">{selected.duration}</div></div></div>
                <div className="flex items-start gap-2 col-span-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><div className="text-muted-foreground">Vị trí ghi nhận</div><div className="font-medium">{selected.location}</div></div></div>
                <div className="flex items-start gap-2 col-span-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><div className="text-muted-foreground">Ghi nhận lúc</div><div className="font-medium">{selected.capturedAt}</div></div></div>
              </div>

              {/* AI Score */}
              <div className="rounded-xl border border-border p-3.5 bg-gradient-to-br from-violet-50/50 to-card">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                  <div className="text-[12px] font-semibold text-foreground">AI Lead Score</div>
                  <div className="ml-auto text-[18px] font-bold text-violet-600">{selected.score}</div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-primary" style={{ width: `${selected.score}%` }} />
                </div>
                <div className="text-[11.5px] text-muted-foreground mt-2">
                  Tín hiệu: {selected.saved ? "Lưu danh bạ +25 · " : ""}Xem brochure +15 · Click số điện thoại +20
                </div>
              </div>

              {/* Assignment */}
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Gán nhân viên phụ trách</div>
                <div className="flex items-center gap-2">
                  <select
                    value={selected.owner ?? ""}
                    onChange={(e) => updateItem(selected.id, { owner: e.target.value, status: e.target.value ? "Đã gán" : "Mới" })}
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">— Chưa gán —</option>
                    {STAFF.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-muted" title="Tự động gán theo quy tắc">
                    <Zap className="h-4 w-4 text-primary" />
                  </button>
                </div>
              </div>

              {/* Status */}
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Trạng thái xử lý</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["Mới", "Đã gán", "Đang xử lý", "Đã liên hệ", "Chuyển CRM", "Bỏ qua"] as Status[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateItem(selected.id, { status: s })}
                      className={[
                        "h-8 rounded-lg text-[12px] font-medium transition border",
                        selected.status === s
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40",
                      ].join(" ")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-[12.5px] font-medium hover:bg-muted">
                  <Bell className="h-3.5 w-3.5" /> Nhắc lịch
                </button>
                <button className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary/90">
                  Chuyển sang CRM <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Mini timeline */}
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><Activity className="h-3 w-3" /> Nhật ký xử lý</div>
                <ol className="relative ml-2 border-l border-border space-y-3">
                  <li className="pl-3.5 relative">
                    <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                    <div className="text-[12.5px] font-medium">Tự động tạo lead từ {CHANNEL_META[selected.channel].label}</div>
                    <div className="text-[11.5px] text-muted-foreground">{selected.capturedAt} · {selected.location}</div>
                  </li>
                  {selected.owner && (
                    <li className="pl-3.5 relative">
                      <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-card" />
                      <div className="text-[12.5px] font-medium">Gán cho {selected.owner}</div>
                      <div className="text-[11.5px] text-muted-foreground">Theo quy tắc · NFC Owner</div>
                    </li>
                  )}
                  {selected.status === "Đã liên hệ" || selected.status === "Chuyển CRM" ? (
                    <li className="pl-3.5 relative">
                      <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                      <div className="text-[12.5px] font-medium">Đã liên hệ qua Zalo</div>
                      <div className="text-[11.5px] text-muted-foreground">Phản hồi tích cực, hẹn xem nhà mẫu</div>
                    </li>
                  ) : null}
                </ol>
              </div>
            </div>
          </aside>
        ) : (
          <aside className="rounded-2xl bg-card border border-border border-dashed p-8 text-center text-[13px] text-muted-foreground h-fit">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
            Chọn một lead để xem chi tiết và phân bổ.
          </aside>
        )}
      </div>
    </div>
  );
}
