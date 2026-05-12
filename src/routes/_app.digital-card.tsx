import { createFileRoute } from "@tanstack/react-router";
import {
  Phone, MessageCircle, Mail, BadgeCheck, Building2, MapPin, Link2, Edit3,
  Monitor, Smartphone, Undo2, Redo2, Save, Upload, ChevronDown, ChevronRight,
  User, Share2, Image as ImageIcon, MousePointerClick, Settings2, QrCode,
  Wifi, Download, Printer, Plus, Type, Sparkles, Eye, Users2, Target,
  Heart, Globe2, Instagram, Facebook, Linkedin, Youtube, Copy, Check,
  Trash2, GripVertical, Layers, Layout, Languages, Lock, BarChart3, Bell,
  Clock, ArrowUpRight, RefreshCw,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/digital-card")({ component: DigitalCard });

const TEMPLATES = [
  { name: "Luxury Dark", tone: "from-slate-800 to-slate-900" },
  { name: "Skyline", tone: "from-sky-500 to-indigo-600" },
  { name: "Minimal", tone: "from-zinc-100 to-zinc-200", light: true },
  { name: "Premium", tone: "from-violet-700 to-fuchsia-700" },
];

const COLORS = ["#A855F7", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#1F2937", "#000000"];
const BACKGROUNDS = [
  { name: "Skyline đêm", tone: "from-slate-900 via-amber-900/40 to-slate-900" },
  { name: "Đại dương", tone: "from-blue-900 via-cyan-700 to-teal-700" },
  { name: "Hoàng hôn", tone: "from-orange-700 via-rose-600 to-purple-800" },
  { name: "Rừng xanh", tone: "from-emerald-900 to-teal-900" },
  { name: "Tinh khôi", tone: "from-slate-100 to-white", light: true },
];

type TabKey = "content" | "design" | "advanced";

function DigitalCard() {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [tab, setTab] = useState<TabKey>("content");
  const [templateIdx, setTemplateIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);
  const [bgIdx, setBgIdx] = useState(0);
  const [openBlock, setOpenBlock] = useState<string | null>("Thông tin cá nhân");
  const [copied, setCopied] = useState(false);
  const slug = "nguyenvana";

  const copyLink = async () => {
    await navigator.clipboard?.writeText(`https://nfcplatform.vn/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <span>Danh thiếp & Profile</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Thiết kế card</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight">Thiết kế danh thiếp</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Tạo danh thiếp điện tử chuyên nghiệp · cập nhật real-time trên mọi thiết bị.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-muted/40 text-[11.5px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Đã lưu lúc 14:32
          </div>
          <div className="inline-flex rounded-xl border border-border p-0.5 bg-muted/30">
            <button onClick={() => setDevice("desktop")}
              className={["h-8 w-9 grid place-items-center rounded-lg", device === "desktop" ? "bg-card shadow-soft text-primary" : "text-muted-foreground"].join(" ")}>
              <Monitor className="h-4 w-4" />
            </button>
            <button onClick={() => setDevice("mobile")}
              className={["h-8 w-9 grid place-items-center rounded-lg", device === "mobile" ? "bg-card shadow-soft text-primary" : "text-muted-foreground"].join(" ")}>
              <Smartphone className="h-4 w-4" />
            </button>
          </div>
          <div className="inline-flex rounded-xl border border-border p-0.5 bg-muted/30">
            <button className="h-8 w-9 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground"><Undo2 className="h-4 w-4" /></button>
            <button className="h-8 w-9 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground"><Redo2 className="h-4 w-4" /></button>
          </div>
          <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-muted/40">
            <Eye className="h-4 w-4" /> Xem trước
          </button>
          <button className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-muted/40">
            <Save className="h-4 w-4" /> Lưu nháp
          </button>
          <button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-soft">
            <Upload className="h-4 w-4" /> Lưu & Xuất bản
          </button>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniKpi icon={Eye} label="Lượt xem" value="2,486" delta="+12%" tone="bg-blue-50 text-blue-600" />
        <MiniKpi icon={Heart} label="Lưu liên hệ" value="346" delta="+8%" tone="bg-rose-50 text-rose-600" />
        <MiniKpi icon={Users2} label="Leads thu được" value="124" delta="+22%" tone="bg-violet-50 text-primary" />
        <MiniKpi icon={Target} label="Tỷ lệ chuyển đổi" value="4.99%" delta="+0.8%" tone="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Analytics charts */}
      <CardAnalytics />

      {/* AI Optimization */}
      <AiOptimizer />

      {/* QR & Wallet export */}
      <QrWalletExport slug={slug} />

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr_340px] gap-5">
        {/* ─── LEFT PANEL ─── */}
        <div className="rounded-2xl bg-card border border-border shadow-soft p-4 h-fit">
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted/40 rounded-xl mb-4">
            {([
              { k: "content", l: "Nội dung" },
              { k: "design", l: "Thiết kế" },
              { k: "advanced", l: "Nâng cao" },
            ] as const).map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={["h-8 rounded-lg text-[12.5px] font-semibold transition", tab === t.k ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"].join(" ")}>
                {t.l}
              </button>
            ))}
          </div>

          {tab === "content" && (
            <ContentTab openBlock={openBlock} setOpenBlock={setOpenBlock} />
          )}
          {tab === "design" && (
            <DesignTab bgIdx={bgIdx} setBgIdx={setBgIdx} />
          )}
          {tab === "advanced" && (
            <AdvancedTab slug={slug} copied={copied} onCopy={copyLink} />
          )}
        </div>

        {/* ─── CENTER ─── */}
        <div className="space-y-5 min-w-0">
          {/* Templates */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[13px] font-semibold">Chọn mẫu thiết kế</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">15+ mẫu chuyên nghiệp cho ngành BĐS</div>
              </div>
              <button className="text-[11.5px] font-semibold text-primary hover:underline inline-flex items-center gap-1">Xem tất cả <ArrowUpRight className="h-3 w-3" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {TEMPLATES.map((t, i) => (
                <button key={t.name} onClick={() => setTemplateIdx(i)}
                  className={["aspect-[16/10] rounded-xl bg-gradient-to-br relative overflow-hidden ring-2 transition group",
                    t.tone, templateIdx === i ? "ring-primary shadow-soft" : "ring-transparent hover:ring-border"].join(" ")}>
                  <div className="absolute inset-2 flex items-center gap-1.5">
                    <div className={["h-5 w-5 rounded-full", t.light ? "bg-slate-400/40" : "bg-white/30"].join(" ")} />
                    <div className="space-y-0.5">
                      <div className={["h-1 w-12 rounded-full", t.light ? "bg-slate-700/70" : "bg-white/70"].join(" ")} />
                      <div className={["h-1 w-8 rounded-full", t.light ? "bg-slate-500/50" : "bg-white/40"].join(" ")} />
                    </div>
                  </div>
                  <div className={["absolute bottom-1.5 left-2 text-[9.5px] font-bold tracking-wide", t.light ? "text-slate-700" : "text-white/90"].join(" ")}>{t.name}</div>
                  {templateIdx === i && (
                    <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary grid place-items-center"><Check className="h-2.5 w-2.5 text-white" /></span>
                  )}
                </button>
              ))}
              <button className="aspect-[16/10] rounded-xl border border-dashed border-border grid place-items-center text-muted-foreground hover:bg-muted/40 hover:text-primary transition">
                <div className="text-center">
                  <Layout className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-[10.5px] font-semibold">Xem tất cả</div>
                </div>
              </button>
            </div>
          </div>

          {/* Preview Card */}
          <CardPreview bg={BACKGROUNDS[bgIdx]} accent={COLORS[colorIdx]} />

          {/* Color + Font */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-semibold">Chọn màu chủ đạo</div>
                <button className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Tuỳ chỉnh</button>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {COLORS.map((c, i) => (
                  <button key={c} onClick={() => setColorIdx(i)} style={{ backgroundColor: c }}
                    className={["h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-card transition",
                      colorIdx === i ? "ring-primary scale-110" : "ring-transparent hover:ring-border"].join(" ")} />
                ))}
                <div className="h-8 px-2.5 rounded-full border border-dashed border-border text-[11px] font-medium text-muted-foreground inline-flex items-center gap-1">
                  HEX
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-semibold">Font chữ</div>
                <span className="text-[11px] text-muted-foreground">Cỡ chữ</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex-1 h-9 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center justify-between px-3 hover:bg-muted/40">
                  Inter <ChevronDown className="h-4 w-4 opacity-60" />
                </button>
                <div className="inline-flex rounded-xl border border-border p-0.5">
                  <button className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground text-[12px] font-bold">Aa</button>
                  <button className="h-8 w-8 grid place-items-center rounded-lg bg-muted/40 text-foreground text-[14px] font-bold">Aa</button>
                  <button className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground text-[16px] font-bold">Aa</button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[13px] font-semibold">Hoạt động gần đây trên danh thiếp</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Theo dõi ai đã xem & lưu thông tin của bạn</div>
              </div>
              <button className="text-[11.5px] font-semibold text-primary hover:underline">Xem tất cả</button>
            </div>
            <ul className="divide-y divide-border">
              {[
                { name: "Lê Thuỳ Linh", action: "đã lưu liên hệ", source: "NFC Tap", time: "5 phút trước", tone: "bg-rose-50 text-rose-600", icon: Heart },
                { name: "Nguyễn Quang Huy", action: "vừa xem profile", source: "Zalo", time: "12 phút trước", tone: "bg-cyan-50 text-cyan-700", icon: Eye },
                { name: "Khách lạ · iPhone 14 Pro", action: "quét QR", source: "QR Code", time: "32 phút trước", tone: "bg-blue-50 text-blue-700", icon: QrCode },
                { name: "Phạm Thanh Mai", action: "ấn nút Gọi điện", source: "AirDrop", time: "1 giờ trước", tone: "bg-emerald-50 text-emerald-700", icon: Phone },
              ].map((a, i) => (
                <li key={i} className="py-3 flex items-center gap-3">
                  <div className={["h-9 w-9 rounded-lg grid place-items-center shrink-0", a.tone].join(" ")}><a.icon className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px]"><span className="font-semibold">{a.name}</span> <span className="text-muted-foreground">{a.action}</span></div>
                    <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5"><Clock className="h-3 w-3" /> {a.time} · {a.source}</div>
                  </div>
                  <button className="h-8 px-2.5 rounded-lg border border-border text-[11.5px] font-semibold hover:bg-muted/40">Tạo lead</button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ─── RIGHT ─── */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-card border border-border shadow-soft p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold">Xem trước trên mobile</div>
              <button className="h-7 px-2.5 rounded-lg border border-border text-[11.5px] inline-flex items-center gap-1 text-muted-foreground hover:bg-muted/40">
                <RefreshCw className="h-3 w-3" /> Làm mới
              </button>
            </div>
            <PhonePreview accent={COLORS[colorIdx]} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="h-8 rounded-lg border border-border text-[11.5px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted/40">
                <Smartphone className="h-3.5 w-3.5" /> iPhone
              </button>
              <button className="h-8 rounded-lg border border-border text-[11.5px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted/40">
                <Smartphone className="h-3.5 w-3.5" /> Android
              </button>
            </div>
          </div>

          {/* Public link */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-4">
            <div className="text-[13px] font-semibold mb-2">Đường dẫn công khai</div>
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 h-10">
              <Globe2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-[12px] text-muted-foreground truncate">nfcplatform.vn/<span className="text-foreground font-semibold">{slug}</span></span>
              <button onClick={copyLink} className="ml-auto h-7 w-7 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground shrink-0">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Bảo vệ bằng mật khẩu (tuỳ chọn)</div>
          </div>

          {/* Share */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-4">
            <div className="text-[13px] font-semibold mb-3">Chia sẻ nhanh</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Wifi, label: "NFC Tap" },
                { icon: QrCode, label: "QR Code" },
                { icon: Link2, label: "Link" },
                { icon: Share2, label: "AirDrop" },
                { icon: MessageCircle, label: "Zalo" },
                { icon: Plus, label: "Khác" },
              ].map((s) => (
                <button key={s.label} className="aspect-square rounded-xl border border-border hover:border-primary hover:bg-primary-soft/30 transition flex flex-col items-center justify-center gap-1.5">
                  <s.icon className="h-4.5 w-4.5 text-primary" strokeWidth={2} />
                  <span className="text-[10.5px] font-semibold text-foreground">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* QR */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold">QR Code của bạn</div>
              <button className="text-[11.5px] font-semibold text-primary hover:underline">Tùy chỉnh</button>
            </div>
            <div className="aspect-square rounded-xl bg-muted/40 grid place-items-center p-4">
              <QrPattern />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button className="h-9 rounded-xl border border-border text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted/40"><Download className="h-4 w-4" /> Tải xuống</button>
              <button className="h-9 rounded-xl border border-border text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-muted/40"><Printer className="h-4 w-4" /> In QR</button>
            </div>
          </div>

          {/* AI tip */}
          <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-indigo-500/10 to-transparent border border-primary/20 p-4">
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/20 grid place-items-center shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-[12.5px] font-bold">AI gợi ý cải thiện danh thiếp</div>
                <p className="text-[11.5px] text-muted-foreground mt-1 leading-snug">
                  Thêm "Dự án nổi bật" sẽ tăng tỷ lệ lưu liên hệ ~18% theo dữ liệu của 1,200+ sales.
                </p>
                <button className="mt-2 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-[11.5px] font-semibold inline-flex items-center gap-1">
                  Áp dụng ngay <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Sub-components ───────── */

function MiniKpi({ icon: Icon, label, value, delta, tone }: { icon: typeof Eye; label: string; value: string; delta: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft p-4 flex items-center gap-3">
      <div className={["h-10 w-10 rounded-xl grid place-items-center shrink-0", tone].join(" ")}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px] text-muted-foreground font-medium">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[18px] font-bold tracking-tight">{value}</span>
          <span className="text-[11px] font-semibold text-emerald-600">{delta}</span>
        </div>
      </div>
    </div>
  );
}

const CONTENT_BLOCKS: { icon: typeof User; label: string; subLabel: string }[] = [
  { icon: User, label: "Thông tin cá nhân", subLabel: "Tên, chức danh, công ty" },
  { icon: Phone, label: "Liên hệ", subLabel: "SĐT, email, địa chỉ" },
  { icon: Share2, label: "Mạng xã hội", subLabel: "5 liên kết đã thêm" },
  { icon: Building2, label: "Dự án nổi bật", subLabel: "3 dự án" },
  { icon: ImageIcon, label: "Hình ảnh & Video", subLabel: "2 ảnh, 1 video" },
  { icon: MousePointerClick, label: "Nút hành động", subLabel: "Gọi, Zalo, Email, Lưu" },
  { icon: Settings2, label: "Tùy chỉnh khác", subLabel: "Theme, hiển thị" },
];

function ContentTab({ openBlock, setOpenBlock }: { openBlock: string | null; setOpenBlock: (k: string | null) => void }) {
  return (
    <div className="space-y-2">
      {CONTENT_BLOCKS.map((b) => {
        const open = openBlock === b.label;
        return (
          <div key={b.label} className={["rounded-xl border transition", open ? "border-primary/30 bg-primary-soft/30" : "border-border"].join(" ")}>
            <button onClick={() => setOpenBlock(open ? null : b.label)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 cursor-grab" />
              <b.icon className={["h-4 w-4", open ? "text-primary" : "text-muted-foreground"].join(" ")} />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold">{b.label}</div>
                {!open && <div className="text-[10.5px] text-muted-foreground">{b.subLabel}</div>}
              </div>
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
            {open && b.label === "Thông tin cá nhân" && (
              <div className="px-3 pb-3 space-y-3">
                <Field label="Họ và tên" value="Nguyễn Văn A" />
                <Field label="Chức danh" value="Chuyên viên tư vấn BĐS cao cấp" />
                <Field label="Công ty" value="ABC Real Estate" />
                <Field label="Slogan / Tiêu đề phụ" value="Kết nối giá trị – Kiến tạo tương lai" />
              </div>
            )}
            {open && b.label === "Liên hệ" && (
              <div className="px-3 pb-3 space-y-3">
                <Field label="Số điện thoại" value="0987 654 321" />
                <Field label="Email" value="nguyenvana@email.com" />
                <Field label="Website" value="nguyenvana.nfcplatform.vn" />
                <Field label="Địa chỉ" value="Vinhomes Ocean Park 2, Gia Lâm, Hà Nội" />
              </div>
            )}
            {open && b.label === "Mạng xã hội" && (
              <div className="px-3 pb-3 space-y-2">
                {[
                  { i: Facebook, l: "Facebook", v: "facebook.com/nguyenvana" },
                  { i: Linkedin, l: "LinkedIn", v: "linkedin.com/in/nguyenvana" },
                  { i: Instagram, l: "Instagram", v: "@nguyenvana" },
                  { i: Youtube, l: "YouTube", v: "@nguyenvana-bds" },
                  { i: MessageCircle, l: "Zalo", v: "0987 654 321" },
                ].map((s) => (
                  <div key={s.l} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
                    <s.i className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11.5px] font-medium shrink-0">{s.l}</span>
                    <span className="text-[11px] text-muted-foreground truncate flex-1">{s.v}</span>
                    <button className="h-6 w-6 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                <button className="w-full h-8 rounded-lg border border-dashed border-border text-[11.5px] font-semibold text-muted-foreground hover:bg-muted/40 inline-flex items-center justify-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Thêm mạng xã hội
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button className="w-full h-10 rounded-xl border border-dashed border-border text-[12.5px] font-semibold text-muted-foreground hover:bg-muted/40 hover:text-primary inline-flex items-center justify-center gap-1.5 transition">
        <Plus className="h-4 w-4" /> Thêm khối nội dung
      </button>
    </div>
  );
}

function DesignTab({ bgIdx, setBgIdx }: { bgIdx: number; setBgIdx: (n: number) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[12px] font-bold mb-2 inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" /> Hình nền danh thiếp</div>
        <div className="grid grid-cols-2 gap-2">
          {BACKGROUNDS.map((b, i) => (
            <button key={b.name} onClick={() => setBgIdx(i)}
              className={["aspect-[16/10] rounded-xl bg-gradient-to-br relative overflow-hidden ring-2 transition",
                b.tone, bgIdx === i ? "ring-primary" : "ring-transparent hover:ring-border"].join(" ")}>
              <div className={["absolute bottom-1.5 left-2 text-[10px] font-bold", b.light ? "text-slate-700" : "text-white"].join(" ")}>{b.name}</div>
              {bgIdx === i && <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary grid place-items-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
            </button>
          ))}
          <button className="aspect-[16/10] rounded-xl border-2 border-dashed border-border grid place-items-center text-muted-foreground hover:bg-muted/40">
            <div className="text-center">
              <Upload className="h-4 w-4 mx-auto mb-1" />
              <div className="text-[10px] font-semibold">Tải lên</div>
            </div>
          </button>
        </div>
      </div>

      <div>
        <div className="text-[12px] font-bold mb-2 inline-flex items-center gap-1.5"><Layout className="h-3.5 w-3.5 text-primary" /> Bố cục</div>
        <div className="grid grid-cols-3 gap-2">
          {["Cổ điển", "Hiện đại", "Tối giản"].map((l, i) => (
            <button key={l} className={["h-16 rounded-xl border-2 grid place-items-center text-[11px] font-semibold transition",
              i === 1 ? "border-primary bg-primary-soft/40 text-primary" : "border-border hover:bg-muted/40"].join(" ")}>{l}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[12px] font-bold mb-2 inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Hiệu ứng</div>
        {[
          { l: "Glassmorphism", on: true },
          { l: "Bóng đổ mềm", on: true },
          { l: "Hiệu ứng động khi mở", on: false },
          { l: "Parallax ảnh nền", on: false },
        ].map((e) => (
          <label key={e.l} className="flex items-center justify-between py-2 text-[12px] cursor-pointer">
            <span>{e.l}</span>
            <span className={["h-5 w-9 rounded-full transition relative", e.on ? "bg-primary" : "bg-muted"].join(" ")}>
              <span className={["absolute top-0.5 h-4 w-4 rounded-full bg-white transition shadow-soft", e.on ? "left-4" : "left-0.5"].join(" ")} />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function AdvancedTab({ slug, copied, onCopy }: { slug: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[12px] font-bold mb-2">URL tuỳ chỉnh</div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 h-9 text-[12px]">
          <span className="text-muted-foreground">nfcplatform.vn/</span>
          <input defaultValue={slug} className="flex-1 bg-transparent outline-none font-semibold" />
          <button onClick={onCopy} className="h-6 w-6 grid place-items-center rounded-md hover:bg-card text-muted-foreground">
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      <div>
        <div className="text-[12px] font-bold mb-2 inline-flex items-center gap-1.5"><Languages className="h-3.5 w-3.5 text-primary" /> Đa ngôn ngữ</div>
        <div className="grid grid-cols-3 gap-2">
          {[{ l: "VI", on: true }, { l: "EN", on: true }, { l: "JP", on: false }].map((x) => (
            <button key={x.l} className={["h-9 rounded-lg border text-[12px] font-bold transition",
              x.on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted/40"].join(" ")}>{x.l}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[12px] font-bold mb-2 inline-flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" /> Phân tích & Tracking</div>
        {[
          { l: "Google Analytics", on: true },
          { l: "Facebook Pixel", on: false },
          { l: "Pixel TikTok", on: false },
          { l: "Webhook tự động", on: true },
        ].map((e) => (
          <label key={e.l} className="flex items-center justify-between py-2 text-[12px] cursor-pointer">
            <span>{e.l}</span>
            <span className={["h-5 w-9 rounded-full transition relative", e.on ? "bg-primary" : "bg-muted"].join(" ")}>
              <span className={["absolute top-0.5 h-4 w-4 rounded-full bg-white transition shadow-soft", e.on ? "left-4" : "left-0.5"].join(" ")} />
            </span>
          </label>
        ))}
      </div>

      <div>
        <div className="text-[12px] font-bold mb-2 inline-flex items-center gap-1.5"><Bell className="h-3.5 w-3.5 text-primary" /> Thông báo</div>
        <p className="text-[11px] text-muted-foreground mb-2">Nhận email/Zalo khi có người mới xem hoặc lưu liên hệ.</p>
        <div className="flex gap-2">
          <button className="flex-1 h-8 rounded-lg border border-primary text-primary text-[11.5px] font-semibold">Email</button>
          <button className="flex-1 h-8 rounded-lg border border-border text-muted-foreground text-[11.5px] font-semibold hover:bg-muted/40">Zalo</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground font-medium mb-1">{label}</div>
      <input defaultValue={value} className="w-full h-9 px-3 rounded-lg bg-card border border-border text-[12.5px] outline-none focus:ring-2 focus:ring-primary/20" />
    </div>
  );
}

function CardPreview({ bg, accent }: { bg: { tone: string; light?: boolean }; accent: string }) {
  const dark = !bg.light;
  return (
    <div className={["relative rounded-2xl overflow-hidden bg-gradient-to-br shadow-card", bg.tone, dark ? "text-white" : "text-slate-900"].join(" ")}>
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.18),transparent_60%)]" />
      </div>
      <div className="relative p-7 md:p-10 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 items-center">
        {/* Avatar */}
        <div className="relative h-24 w-24 md:h-28 md:w-28 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 ring-4 ring-white/20 grid place-items-center shrink-0">
          <User className="h-12 w-12 text-white/70" />
          <button style={{ backgroundColor: accent }} className="absolute -top-1 -right-1 h-7 w-7 rounded-full grid place-items-center shadow-soft ring-2 ring-slate-900 text-white">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>
        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[26px] md:text-[30px] font-bold tracking-tight">Nguyễn Văn A</h3>
            <BadgeCheck className="h-6 w-6" style={{ color: accent }} />
          </div>
          <p className={["text-[13.5px] mt-1", dark ? "text-white/80" : "text-slate-600"].join(" ")}>Chuyên viên tư vấn BĐS cao cấp</p>
          <p className="text-[13px] font-semibold mt-0.5" style={{ color: accent }}>ABC Real Estate</p>

          <div className="mt-5 space-y-2.5 text-[13px]">
            <Row icon={Phone} text="0987 654 321" dark={dark} />
            <Row icon={Mail} text="nguyenvana@email.com" dark={dark} />
            <Row icon={Link2} text="nguyenvana.nfcplatform.vn" dark={dark} />
            <Row icon={MapPin} text={"Vinhomes Ocean Park 2\nGia Lâm, Hà Nội"} multi dark={dark} />
          </div>
        </div>
        {/* Right block */}
        <div className="flex flex-col items-end gap-5 shrink-0">
          <div className="text-right">
            <div className={["h-12 w-12 rounded-lg grid place-items-center ml-auto mb-1", dark ? "bg-white/10" : "bg-slate-900/10"].join(" ")}>
              <Building2 className={["h-7 w-7", dark ? "text-white" : "text-slate-900"].join(" ")} />
            </div>
            <div className="text-[10.5px] font-bold tracking-[0.2em]">ABC</div>
            <div className={["text-[9px] tracking-[0.3em]", dark ? "text-white/60" : "text-slate-500"].join(" ")}>REAL ESTATE</div>
          </div>
          <div className="flex items-center gap-2">
            {[Phone, MessageCircle, MessageCircle, Mail].map((I, i) => (
              <button key={i} className={["h-10 w-10 rounded-full grid place-items-center transition",
                dark ? "bg-white/10 hover:bg-white/20" : "bg-slate-900/10 hover:bg-slate-900/20"].join(" ")}>
                <I className="h-4 w-4" />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button style={{ backgroundColor: accent }} className="h-10 px-5 rounded-xl text-white text-[12.5px] font-semibold shadow-soft">Xem dự án</button>
            <button className={["h-10 px-5 rounded-xl border text-[12.5px] font-semibold",
              dark ? "border-white/30 text-white" : "border-slate-900/30 text-slate-900"].join(" ")}>Lưu liên hệ</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: I, text, multi, dark = true }: { icon: typeof Phone; text: string; multi?: boolean; dark?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={["h-7 w-7 rounded-full grid place-items-center shrink-0 mt-0.5", dark ? "bg-white/10" : "bg-slate-900/10"].join(" ")}>
        <I className="h-3.5 w-3.5" />
      </div>
      <span className={[dark ? "text-white/90" : "text-slate-800", multi ? "whitespace-pre-line leading-snug" : ""].join(" ")}>{text}</span>
    </div>
  );
}

function PhonePreview({ accent }: { accent: string }) {
  return (
    <div className="relative mx-auto w-[230px] aspect-[230/470] rounded-[36px] bg-slate-900 p-2 shadow-card">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 h-5 w-24 rounded-b-2xl bg-slate-900 z-10" />
      <div className="h-full w-full rounded-[28px] overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 text-white relative">
        <div className="absolute top-2 left-3 text-[9px] font-semibold">9:41</div>
        <div className="absolute top-2 right-3 flex items-center gap-1 text-[9px]">
          <div className="h-1.5 w-3 rounded-sm bg-white/80" />
        </div>
        <div className="pt-7 px-4 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 grid place-items-center mb-2 ring-2 ring-white/20">
            <User className="h-8 w-8 text-white/70" />
          </div>
          <div className="flex items-center gap-1">
            <div className="text-[12px] font-bold">Nguyễn Văn A</div>
            <BadgeCheck className="h-3 w-3" style={{ color: accent }} />
          </div>
          <div className="text-[8.5px] text-white/70 mt-0.5">Chuyên viên tư vấn BĐS cao cấp</div>
          <div className="text-[8.5px] font-semibold" style={{ color: accent }}>ABC Real Estate</div>

          <div className="mt-3 grid grid-cols-4 gap-1.5 w-full">
            {[
              { i: Phone, l: "Gọi điện" },
              { i: MessageCircle, l: "Zalo" },
              { i: MessageCircle, l: "Messenger" },
              { i: Mail, l: "Email" },
            ].map((b) => (
              <div key={b.l} className="flex flex-col items-center gap-1">
                <div className="h-7 w-7 rounded-full bg-white/10 grid place-items-center"><b.i className="h-3 w-3" /></div>
                <div className="text-[7.5px] text-white/70">{b.l}</div>
              </div>
            ))}
          </div>

          <button style={{ backgroundColor: accent }} className="mt-3 w-full h-7 rounded-lg text-[9px] font-semibold text-white">Xem dự án</button>
          <button className="mt-1.5 w-full h-7 rounded-lg border border-white/20 text-[9px] font-semibold">Lưu liên hệ</button>

          <div className="mt-3 w-full text-left">
            <div className="flex items-center justify-between text-[9px] mb-1.5">
              <span className="font-semibold">Dự án nổi bật</span>
              <span style={{ color: accent }}>Xem tất cả</span>
            </div>
            <div className="rounded-lg bg-white/5 p-1.5 flex items-center gap-2">
              <div className="h-8 w-10 rounded bg-gradient-to-br from-amber-300 to-rose-400" />
              <div>
                <div className="text-[8.5px] font-semibold">Vinhomes Ocean Park 2</div>
                <div className="text-[7.5px] text-white/60">3,245 lượt xem</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrPattern() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" fill="white" />
      {Array.from({ length: 400 }).map((_, i) => {
        const x = (i % 20) * 5;
        const y = Math.floor(i / 20) * 5;
        const filled = (x * y + i * 7) % 3 === 0;
        return filled ? <rect key={i} x={x} y={y} width="4" height="4" fill="#0F172A" /> : null;
      })}
      {[[0, 0], [80, 0], [0, 80]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="20" height="20" fill="white" />
          <rect x={x} y={y} width="20" height="20" fill="none" stroke="#0F172A" strokeWidth="3" />
          <rect x={x + 6} y={y + 6} width="8" height="8" fill="#0F172A" />
        </g>
      ))}
    </svg>
  );
}

/* ────────────── Analytics charts ────────────── */

const RANGE_DATA = {
  "7d": { labels: ["T2","T3","T4","T5","T6","T7","CN"], views: [180, 240, 210, 320, 290, 360, 410], saves: [22, 28, 30, 41, 38, 52, 60], conv: [4.1, 4.3, 4.0, 4.6, 4.8, 5.1, 5.3] },
  "30d": { labels: ["W1","W2","W3","W4"], views: [820, 1040, 1180, 1320], saves: [110, 142, 168, 196], conv: [4.0, 4.4, 4.7, 4.9] },
  "90d": { labels: ["T3","T4","T5"], views: [2400, 2860, 3210], saves: [310, 388, 462], conv: [3.9, 4.5, 5.0] },
} as const;

const SOURCES = [
  { name: "NFC Tap", value: 1042, color: "#A855F7" },
  { name: "QR Code", value: 686, color: "#3B82F6" },
  { name: "AirDrop", value: 312, color: "#8B5CF6" },
  { name: "Link chia sẻ", value: 268, color: "#10B981" },
  { name: "Wallet Card", value: 178, color: "#F59E0B" },
];

function CardAnalytics() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("7d");
  const data = RANGE_DATA[range];
  const totalSrc = SOURCES.reduce((s, x) => s + x.value, 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
      {/* Time-series */}
      <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Thống kê theo thời gian
            </h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">Lượt xem, lưu liên hệ và tỷ lệ chuyển đổi của danh thiếp.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted">
              {(["7d","30d","90d"] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className={["px-2.5 h-7 rounded-md text-[12px] font-medium transition", range === r ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"].join(" ")}>
                  {r === "7d" ? "7 ngày" : r === "30d" ? "30 ngày" : "90 ngày"}
                </button>
              ))}
            </div>
            <button className="h-7 px-2 rounded-md border border-border text-[11.5px] inline-flex items-center gap-1 hover:bg-muted">
              <Download className="h-3 w-3" /> Xuất
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11.5px] text-muted-foreground mb-3">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Lượt xem</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Lưu liên hệ</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-emerald-500" /> Tỷ lệ chuyển đổi (%)</span>
        </div>

        <TimeSeriesChart labels={data.labels as unknown as string[]} views={data.views as unknown as number[]} saves={data.saves as unknown as number[]} conv={data.conv as unknown as number[]} />

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
          <SumStat label="Tổng lượt xem" value={data.views.reduce((s,v)=>s+v,0).toLocaleString()} delta="+12.4%" tone="text-blue-600" />
          <SumStat label="Tổng lưu liên hệ" value={data.saves.reduce((s,v)=>s+v,0).toLocaleString()} delta="+18.2%" tone="text-rose-600" />
          <SumStat label="Chuyển đổi TB" value={`${(data.conv.reduce((s,v)=>s+v,0)/data.conv.length).toFixed(2)}%`} delta="+0.6pp" tone="text-emerald-600" />
        </div>
      </div>

      {/* Sources */}
      <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" /> Nguồn truy cập
            </h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">Phân bổ kênh dẫn người xem đến danh thiếp.</p>
          </div>
        </div>

        <div className="flex items-center justify-center mb-4">
          <DonutChart data={SOURCES} total={totalSrc} />
        </div>

        <div className="space-y-2">
          {SOURCES.map((s) => {
            const pct = (s.value / totalSrc) * 100;
            return (
              <div key={s.name} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-muted-foreground">{s.value.toLocaleString()} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 mt-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SumStat({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: string }) {
  return (
    <div>
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
      <div className="text-[18px] font-bold tracking-tight mt-0.5">{value}</div>
      <div className={["text-[11.5px] font-semibold mt-0.5 inline-flex items-center gap-0.5", tone].join(" ")}>
        <ArrowUpRight className="h-3 w-3" /> {delta}
      </div>
    </div>
  );
}

function TimeSeriesChart({ labels, views, saves, conv }: { labels: string[]; views: number[]; saves: number[]; conv: number[] }) {
  const W = 720, H = 220, P = { l: 36, r: 36, t: 14, b: 26 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const maxV = Math.max(...views) * 1.1;
  const maxC = Math.max(...conv) * 1.3;
  const x = (i: number) => P.l + (labels.length === 1 ? iw / 2 : (i * iw) / (labels.length - 1));
  const yV = (v: number) => P.t + ih - (v / maxV) * ih;
  const yC = (v: number) => P.t + ih - (v / maxC) * ih;
  const path = (arr: number[], y: (v: number) => number) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const area = (arr: number[]) => `${path(arr, yV)} L ${x(arr.length - 1)} ${P.t + ih} L ${x(0)} ${P.t + ih} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]">
        <defs>
          <linearGradient id="gradViews" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradSaves" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={P.l} x2={W - P.r} y1={P.t + ih * g} y2={P.t + ih * g} stroke="currentColor" className="text-border" strokeDasharray="3 4" />
        ))}
        {/* y axis labels (views) */}
        {[0, 0.5, 1].map((g) => (
          <text key={g} x={P.l - 6} y={P.t + ih * (1 - g) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">
            {Math.round(maxV * g)}
          </text>
        ))}
        {/* right axis (conv %) */}
        {[0, 0.5, 1].map((g) => (
          <text key={g} x={W - P.r + 6} y={P.t + ih * (1 - g) + 3} textAnchor="start" className="fill-muted-foreground text-[10px]">
            {(maxC * g).toFixed(1)}%
          </text>
        ))}
        {/* areas */}
        <path d={area(views)} fill="url(#gradViews)" />
        <path d={area(saves)} fill="url(#gradSaves)" />
        <path d={path(views, yV)} fill="none" stroke="#A855F7" strokeWidth="2" />
        <path d={path(saves, yV)} fill="none" stroke="#F43F5E" strokeWidth="2" />
        {/* conversion line */}
        <path d={path(conv, yC)} fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="5 4" />
        {/* points */}
        {views.map((v, i) => <circle key={`v${i}`} cx={x(i)} cy={yV(v)} r="3" fill="#fff" stroke="#A855F7" strokeWidth="2" />)}
        {saves.map((v, i) => <circle key={`s${i}`} cx={x(i)} cy={yV(v)} r="2.5" fill="#fff" stroke="#F43F5E" strokeWidth="2" />)}
        {conv.map((v, i) => <circle key={`c${i}`} cx={x(i)} cy={yC(v)} r="2.5" fill="#10B981" />)}
        {/* x labels */}
        {labels.map((l, i) => (
          <text key={l} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[10.5px]">{l}</text>
        ))}
      </svg>
    </div>
  );
}

function DonutChart({ data, total }: { data: { name: string; value: number; color: string }[]; total: number }) {
  const R = 70, r = 48, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="relative">
      <svg viewBox="0 0 180 180" className="h-[180px] w-[180px] -rotate-90">
        <circle cx="90" cy="90" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth={R - r} />
        {data.map((s) => {
          const len = (s.value / total) * C;
          const dash = `${len} ${C - len}`;
          const offset = -acc;
          acc += len;
          return (
            <circle key={s.name} cx="90" cy="90" r={R} fill="none" stroke={s.color} strokeWidth={R - r}
              strokeDasharray={dash} strokeDashoffset={offset} />
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[11px] text-muted-foreground">Tổng</div>
          <div className="text-[20px] font-bold tracking-tight">{total.toLocaleString()}</div>
          <div className="text-[10.5px] text-muted-foreground">lượt truy cập</div>
        </div>
      </div>
    </div>
  );
}

/* ────────────── AI Optimizer ────────────── */

const AI_SCHEDULE = [
  { day: "Thứ 2", slot: "08:00 – 09:00", score: 78, note: "Khách commute, mở Zalo cao" },
  { day: "Thứ 3", slot: "12:30 – 13:30", score: 84, note: "Giờ nghỉ trưa, peak lưu liên hệ" },
  { day: "Thứ 4", slot: "20:00 – 21:30", score: 92, note: "Khung vàng – chuyển đổi cao nhất", best: true },
  { day: "Thứ 5", slot: "19:00 – 20:00", score: 81, note: "Khách rảnh, đọc kỹ brochure" },
  { day: "Thứ 6", slot: "17:30 – 18:30", score: 73, note: "Tan làm, nhiều click số ĐT" },
  { day: "T7 / CN", slot: "10:00 – 11:30", score: 88, note: "Khách đi xem nhà mẫu" },
];

const AI_CHANNELS = [
  { name: "Zalo OA", icon: MessageCircle, currShare: 28, suggest: 38, lift: "+14%", reason: "CTR cao gấp 2.1× Email với khách BĐS", tone: "from-cyan-500 to-blue-500" },
  { name: "NFC Tap tại Showroom", icon: Wifi, currShare: 35, suggest: 42, lift: "+11%", reason: "Tỷ lệ lưu liên hệ 64% – cao nhất", tone: "from-violet-500 to-fuchsia-500" },
  { name: "QR trên Brochure", icon: QrCode, currShare: 22, suggest: 14, lift: "−8%", reason: "Quá tải, conversion giảm 3 tuần", tone: "from-amber-500 to-orange-500", down: true },
  { name: "AirDrop Sự kiện", icon: Share2, currShare: 9, suggest: 6, lift: "−3%", reason: "Chỉ hiệu quả khi có host on-site", tone: "from-rose-500 to-pink-500", down: true },
];

const AI_CTAS = [
  { label: "Hành động khẩn cấp", text: "Đặt lịch xem nhà mẫu trong 24h – Tặng voucher 5 triệu", uplift: "+22% conversion", tags: ["FOMO", "Ưu đãi"] },
  { label: "Cá nhân hoá", text: "Nhận tư vấn riêng từ Chuyên viên Nguyễn Văn A – chỉ 15 phút", uplift: "+17% lưu liên hệ", tags: ["1-1", "Tin cậy"] },
  { label: "Giá trị rõ ràng", text: "Tải bảng giá & chính sách thanh toán mới nhất Vinhomes Ocean Park 2", uplift: "+12% click", tags: ["Lead magnet"] },
];

function AiOptimizer() {
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedCtas, setAppliedCtas] = useState<number[]>([]);

  const apply = async (key: string) => {
    setApplying(key);
    setTimeout(() => setApplying(null), 900);
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-violet-50/60 via-card to-card shadow-soft overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 border-b border-border/70">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-gradient grid place-items-center shadow-glow shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-foreground">AI Tối ưu Danh thiếp</h3>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-gradient text-white text-[10px] font-bold">BETA</span>
            </div>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              Phân tích từ <span className="font-semibold text-foreground">2,486 lượt xem</span>, <span className="font-semibold text-foreground">346 lưu liên hệ</span> và <span className="font-semibold text-foreground">4.99% conversion</span> – cập nhật mỗi 6 giờ.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Clock className="h-3 w-3" /> Cập nhật 12 phút trước
          </span>
          <button onClick={() => apply("refresh")} className="h-8 px-2.5 rounded-md border border-border text-[12px] inline-flex items-center gap-1 hover:bg-muted">
            <RefreshCw className={["h-3.5 w-3.5", applying === "refresh" ? "animate-spin" : ""].join(" ")} /> Phân tích lại
          </button>
        </div>
      </div>

      {/* Insight banner */}
      <div className="mx-5 mt-5 rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3.5 flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-100 grid place-items-center shrink-0">
          <ArrowUpRight className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-emerald-900">
            Cơ hội tăng <span className="underline decoration-emerald-400 underline-offset-2">+31% leads / tuần</span> nếu áp dụng 3 đề xuất bên dưới
          </div>
          <div className="text-[11.5px] text-emerald-800/80 mt-0.5">
            Dựa trên hành vi khách BĐS phân khúc 3–6 tỷ trong 30 ngày qua tại HCM.
          </div>
        </div>
        <button className="h-8 px-3 rounded-md bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700 inline-flex items-center gap-1">
          Áp dụng tất cả <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-5">
        {/* Schedule */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 grid place-items-center">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[13px] font-semibold">Lịch chia sẻ tối ưu</div>
                <div className="text-[11px] text-muted-foreground">Khung giờ peak theo hành vi xem card</div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            {AI_SCHEDULE.map((s) => (
              <div key={s.day} className={[
                "flex items-center gap-3 px-2.5 py-2 rounded-lg transition",
                s.best ? "bg-primary-soft ring-1 ring-primary/30" : "hover:bg-muted/50",
              ].join(" ")}>
                <div className="w-12 text-[11.5px] font-semibold text-muted-foreground">{s.day}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-foreground flex items-center gap-1.5">
                    {s.slot}
                    {s.best && <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-bold">BEST</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{s.note}</div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold tabular-nums text-foreground">{s.score}</div>
                  <div className="h-1 w-12 mt-0.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-indigo-500" style={{ width: `${s.score}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => apply("schedule")} className="mt-3 w-full h-9 rounded-lg border border-border text-[12.5px] font-semibold hover:bg-muted inline-flex items-center justify-center gap-1.5">
            <Bell className="h-3.5 w-3.5" /> {applying === "schedule" ? "Đang lên lịch…" : "Lên lịch tự động"}
          </button>
        </div>

        {/* Channels */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-violet-50 text-primary grid place-items-center">
                <Share2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[13px] font-semibold">Phân bổ kênh chia sẻ</div>
                <div className="text-[11px] text-muted-foreground">So với hiệu suất hiện tại của bạn</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {AI_CHANNELS.map((c) => (
              <div key={c.name}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={["h-6 w-6 rounded-md grid place-items-center bg-gradient-to-br text-white", c.tone].join(" ")}>
                    <c.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 text-[12.5px] font-semibold text-foreground truncate">{c.name}</div>
                  <span className={["text-[11px] font-bold", c.down ? "text-rose-600" : "text-emerald-600"].join(" ")}>{c.lift}</span>
                </div>
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <div className="absolute top-0 left-0 h-full bg-muted-foreground/30" style={{ width: `${c.currShare}%` }} title={`Hiện tại ${c.currShare}%`} />
                  <div className={["absolute top-0 left-0 h-full bg-gradient-to-r", c.tone].join(" ")} style={{ width: `${c.suggest}%`, opacity: 0.95 }} title={`Đề xuất ${c.suggest}%`} />
                </div>
                <div className="flex items-center justify-between mt-1 text-[10.5px] text-muted-foreground">
                  <span>Hiện {c.currShare}% → Đề xuất <span className="font-semibold text-foreground">{c.suggest}%</span></span>
                  <span className="truncate ml-2">{c.reason}</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => apply("channels")} className="mt-3 w-full h-9 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary/90 inline-flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> {applying === "channels" ? "Đang áp dụng…" : "Áp dụng phân bổ"}
          </button>
        </div>

        {/* CTAs */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 grid place-items-center">
                <MousePointerClick className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[13px] font-semibold">CTA do AI viết</div>
                <div className="text-[11px] text-muted-foreground">3 bản nháp tối ưu cho khách BĐS</div>
              </div>
            </div>
            <button onClick={() => apply("regen")} className="h-7 px-2 rounded-md border border-border text-[11px] inline-flex items-center gap-1 hover:bg-muted">
              <RefreshCw className={["h-3 w-3", applying === "regen" ? "animate-spin" : ""].join(" ")} /> Viết lại
            </button>
          </div>

          <div className="space-y-2">
            {AI_CTAS.map((c, i) => {
              const applied = appliedCtas.includes(i);
              return (
                <div key={i} className={[
                  "rounded-lg border p-3 transition",
                  applied ? "border-primary bg-primary-soft/40" : "border-border hover:border-primary/50 hover:shadow-soft",
                ].join(" ")}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10.5px] uppercase tracking-wider font-bold text-muted-foreground">{c.label}</span>
                    <span className="text-[10.5px] font-bold text-emerald-600 inline-flex items-center gap-0.5">
                      <ArrowUpRight className="h-2.5 w-2.5" /> {c.uplift}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-foreground leading-snug font-medium">"{c.text}"</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      {c.tags.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="h-6 w-6 grid place-items-center rounded hover:bg-muted text-muted-foreground" title="Sao chép">
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setAppliedCtas((arr) => applied ? arr.filter((x) => x !== i) : [...arr, i])}
                        className={[
                          "h-6 px-2 rounded text-[10.5px] font-bold inline-flex items-center gap-1",
                          applied ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted",
                        ].join(" ")}
                      >
                        {applied ? <><Check className="h-3 w-3" /> Đã chọn</> : "Dùng"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────── QR & Wallet Export ────────────── */

const PROFILE = {
  fullName: "Nguyễn Văn A",
  title: "Senior Sales Consultant",
  org: "Vinhomes Ocean Park",
  phone: "+84 901 234 567",
  email: "nguyenvana@vinhomes.vn",
  website: "https://nfcplatform.vn",
  address: "Vinhomes Ocean Park, Gia Lâm, Hà Nội",
};

function QrWalletExport({ slug }: { slug: string }) {
  const [qrMode, setQrMode] = useState<"static" | "dynamic">("dynamic");
  const [size, setSize] = useState<256 | 512 | 1024>(512);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const baseUrl = `https://nfcplatform.vn/${slug}`;
  const dynamicUrl = `https://nfcplatform.vn/r/${slug}?utm_source=qr&utm_medium=card&utm_campaign=wallet`;
  const targetUrl = qrMode === "static" ? baseUrl : dynamicUrl;

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadQr = async (format: "png" | "svg") => {
    setBusy(`qr-${format}`);
    try {
      const ext = format === "svg" ? "svg" : "png";
      const api = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=${ext}&margin=2&data=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(api);
      const blob = await res.blob();
      downloadBlob(blob, `qr-${qrMode}-${slug}-${size}.${ext}`);
      flash(`Đã tải QR ${qrMode === "static" ? "tĩnh" : "động"} (${ext.toUpperCase()})`);
    } catch {
      flash("Không tải được QR – kiểm tra mạng");
    } finally {
      setBusy(null);
    }
  };

  const exportVCard = () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${PROFILE.fullName}`,
      `N:${PROFILE.fullName.split(" ").slice(-1)[0]};${PROFILE.fullName.split(" ").slice(0, -1).join(" ")};;;`,
      `ORG:${PROFILE.org}`,
      `TITLE:${PROFILE.title}`,
      `TEL;TYPE=CELL:${PROFILE.phone}`,
      `EMAIL;TYPE=WORK:${PROFILE.email}`,
      `ADR;TYPE=WORK:;;${PROFILE.address};;;;`,
      `URL:${PROFILE.website}/${slug}`,
      "END:VCARD",
    ].join("\r\n");
    downloadBlob(new Blob([vcf], { type: "text/vcard" }), `${slug}.vcf`);
    flash("Đã xuất vCard (.vcf)");
  };

  const exportApplePass = () => {
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: "pass.vn.nfcplatform.businesscard",
      serialNumber: `${slug}-${Date.now()}`,
      teamIdentifier: "REPLACE_WITH_TEAM_ID",
      organizationName: PROFILE.org,
      description: `Danh thiếp ${PROFILE.fullName}`,
      logoText: PROFILE.org,
      foregroundColor: "rgb(255,255,255)",
      backgroundColor: "rgb(30,30,46)",
      labelColor: "rgb(180,180,200)",
      barcodes: [
        { format: "PKBarcodeFormatQR", message: targetUrl, messageEncoding: "iso-8859-1", altText: `${slug}` },
      ],
      generic: {
        primaryFields: [{ key: "name", label: "Họ tên", value: PROFILE.fullName }],
        secondaryFields: [
          { key: "title", label: "Chức vụ", value: PROFILE.title },
          { key: "org", label: "Công ty", value: PROFILE.org },
        ],
        auxiliaryFields: [
          { key: "phone", label: "Điện thoại", value: PROFILE.phone },
          { key: "email", label: "Email", value: PROFILE.email },
        ],
        backFields: [
          { key: "address", label: "Địa chỉ", value: PROFILE.address },
          { key: "website", label: "Website", value: `${PROFILE.website}/${slug}` },
          { key: "note", label: "Ghi chú", value: "Quét QR hoặc tap NFC để xem danh thiếp đầy đủ." },
        ],
      },
    };
    downloadBlob(
      new Blob([JSON.stringify(passJson, null, 2)], { type: "application/json" }),
      `apple-wallet-${slug}.pass.json`,
    );
    flash("Đã xuất Apple Wallet pass.json");
  };

  const exportGoogleWallet = () => {
    const objectId = `3388000000022xxxxx.${slug}-${Date.now()}`;
    const payload = {
      iss: "wallet-issuer@nfcplatform.iam.gserviceaccount.com",
      aud: "google",
      typ: "savetowallet",
      origins: ["https://nfcplatform.vn"],
      payload: {
        genericObjects: [
          {
            id: objectId,
            classId: "3388000000022xxxxx.business_card_class",
            logo: { sourceUri: { uri: `${PROFILE.website}/logo.png` } },
            cardTitle: { defaultValue: { language: "vi-VN", value: PROFILE.org } },
            subheader: { defaultValue: { language: "vi-VN", value: PROFILE.title } },
            header: { defaultValue: { language: "vi-VN", value: PROFILE.fullName } },
            barcode: { type: "QR_CODE", value: targetUrl, alternateText: slug },
            hexBackgroundColor: "#1E1E2E",
            heroImage: { sourceUri: { uri: `${PROFILE.website}/${slug}/cover.jpg` } },
            textModulesData: [
              { id: "phone", header: "Điện thoại", body: PROFILE.phone },
              { id: "email", header: "Email", body: PROFILE.email },
              { id: "address", header: "Địa chỉ", body: PROFILE.address },
            ],
            linksModuleData: {
              uris: [
                { uri: `${PROFILE.website}/${slug}`, description: "Xem danh thiếp" },
                { uri: `tel:${PROFILE.phone}`, description: "Gọi ngay" },
              ],
            },
          },
        ],
      },
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      `google-wallet-${slug}.json`,
    );
    flash("Đã xuất Google Wallet payload");
  };

  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white">
              <QrCode className="h-4 w-4" />
            </div>
            <h3 className="text-[15px] font-semibold tracking-tight">Tải QR & Xuất Wallet Card</h3>
          </div>
          <p className="text-[12.5px] text-muted-foreground mt-1.5">
            QR & Wallet được sinh từ cấu hình hiện tại của danh thiếp · slug{" "}
            <span className="font-mono text-foreground">/{slug}</span>
          </p>
        </div>
        {toast && (
          <div className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-emerald-50 text-emerald-700 text-[11.5px] font-medium border border-emerald-200">
            <Check className="h-3.5 w-3.5" /> {toast}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* QR preview + mode */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="aspect-square rounded-lg bg-white border border-border p-3 grid place-items-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=${encodeURIComponent(targetUrl)}`}
              alt={`QR ${qrMode}`}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="inline-flex w-full rounded-lg border border-border p-0.5 bg-card">
            {(["dynamic", "static"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setQrMode(m)}
                className={[
                  "flex-1 h-8 rounded-md text-[12px] font-semibold",
                  qrMode === m ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {m === "dynamic" ? "QR động" : "QR tĩnh"}
              </button>
            ))}
          </div>
          <div className="text-[11.5px] text-muted-foreground leading-relaxed">
            {qrMode === "dynamic" ? (
              <>Chuyển hướng qua tracking link – đo được scan, đổi đích đến mà không in lại.</>
            ) : (
              <>Trỏ thẳng tới URL danh thiếp – không tracking, không thể đổi sau khi in.</>
            )}
          </div>
          <div className="rounded-lg bg-card border border-border p-2 text-[11px] font-mono text-muted-foreground break-all">
            {targetUrl}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-muted-foreground">Kích thước</span>
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-card">
              {([256, 512, 1024] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={[
                    "h-7 px-2.5 rounded-md text-[11.5px] font-semibold",
                    size === s ? "bg-muted text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ExportTile
            tone="from-violet-500 to-fuchsia-500"
            icon={Download}
            title="Tải QR – PNG"
            desc={`Ảnh PNG ${size}px, nền trắng, dùng in ấn & marketing.`}
            badge={qrMode === "dynamic" ? "Tracking" : "No-track"}
            loading={busy === "qr-png"}
            onClick={() => downloadQr("png")}
          />
          <ExportTile
            tone="from-blue-500 to-cyan-500"
            icon={Download}
            title="Tải QR – SVG"
            desc="Vector SVG, scale vô hạn cho brochure & standee."
            badge="Vector"
            loading={busy === "qr-svg"}
            onClick={() => downloadQr("svg")}
          />
          <ExportTile
            tone="from-zinc-800 to-zinc-900"
            icon={Smartphone}
            title="Apple Wallet (.pass.json)"
            desc="Mẫu pass.json đầy đủ field – ký bằng cert để tạo .pkpass."
            badge="iOS"
            onClick={exportApplePass}
          />
          <ExportTile
            tone="from-emerald-500 to-teal-600"
            icon={Smartphone}
            title="Google Wallet (JWT payload)"
            desc="Payload genericObject – ký JWT để tạo link Save to Wallet."
            badge="Android"
            onClick={exportGoogleWallet}
          />
          <ExportTile
            tone="from-amber-500 to-orange-500"
            icon={User}
            title="vCard (.vcf)"
            desc="Tệp danh bạ chuẩn – import nhanh vào iOS/Android/Outlook."
            badge="Universal"
            onClick={exportVCard}
          />
          <ExportTile
            tone="from-rose-500 to-pink-500"
            icon={Printer}
            title="Bản in A6 (PDF)"
            desc="Layout in card kèm QR & logo – phù hợp xưởng in offset."
            badge="Sắp ra mắt"
            disabled
            onClick={() => flash("Tính năng đang phát triển")}
          />
        </div>
      </div>

      <div className="rounded-xl bg-muted/30 border border-dashed border-border p-3 text-[11.5px] text-muted-foreground leading-relaxed">
        <span className="font-semibold text-foreground">Lưu ý kỹ thuật:</span>{" "}
        File Apple Wallet xuất ra là <span className="font-mono">pass.json</span> – cần ký bằng Apple Developer
        certificate (PassTypeID + WWDR) để đóng gói thành <span className="font-mono">.pkpass</span>. Google Wallet
        payload cần ký JWT bằng service account để tạo link{" "}
        <span className="font-mono">pay.google.com/gp/v/save/...</span>. Hai bước ký này thực hiện ở backend Lovable
        Cloud khi bật Wallet Provisioning.
      </div>
    </div>
  );
}

function ExportTile({
  icon: Icon, title, desc, badge, tone, onClick, loading, disabled,
}: {
  icon: typeof Download;
  title: string;
  desc: string;
  badge?: string;
  tone: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        "group text-left rounded-xl border border-border bg-card p-3.5 transition-all",
        "hover:border-primary/40 hover:shadow-soft",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${tone} grid place-items-center text-white shrink-0`}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold tracking-tight truncate">{title}</div>
            {badge && (
              <span className="text-[10px] font-semibold px-1.5 h-5 inline-flex items-center rounded-md bg-muted text-muted-foreground">
                {badge}
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">{desc}</div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
