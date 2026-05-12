import { createFileRoute } from "@tanstack/react-router";
import {
  Phone, MessageCircle, Mail, BadgeCheck, Building2, MapPin, Link2, Edit3,
  Monitor, Smartphone, Undo2, Redo2, Save, Upload, ChevronDown, ChevronRight,
  User, Share2, Image as ImageIcon, MousePointerClick, Settings2, QrCode,
  Wifi, Download, Printer, Eye, Plus, Type, Sparkles,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/digital-card")({ component: DigitalCard });

const TEMPLATES = [
  { name: "Luxury Dark", tone: "from-slate-800 to-slate-900", active: true },
  { name: "Skyline", tone: "from-sky-500 to-indigo-600" },
  { name: "Minimal", tone: "from-zinc-900 to-zinc-800" },
  { name: "Premium", tone: "from-violet-700 to-fuchsia-700" },
];

const COLORS = ["#A855F7", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#1F2937", "#000000"];

const CONTENT_BLOCKS: { icon: typeof User; label: string; open?: boolean }[] = [
  { icon: User, label: "Thông tin cá nhân", open: true },
  { icon: Phone, label: "Liên hệ" },
  { icon: Share2, label: "Mạng xã hội" },
  { icon: Building2, label: "Dự án nổi bật" },
  { icon: ImageIcon, label: "Hình ảnh & Video" },
  { icon: MousePointerClick, label: "Nút hành động" },
  { icon: Settings2, label: "Tùy chỉnh khác" },
];

function DigitalCard() {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

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
          <p className="text-[13px] text-muted-foreground mt-1">Tạo danh thiếp điện tử chuyên nghiệp của bạn</p>
        </div>
        <div className="flex items-center gap-2">
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
            <Save className="h-4 w-4" /> Lưu nháp
          </button>
          <button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-soft">
            <Upload className="h-4 w-4" /> Lưu & Xuất bản
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr_340px] gap-5">
        {/* Left: content panel */}
        <div className="rounded-2xl bg-card border border-border shadow-soft p-4">
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted/40 rounded-xl mb-4">
            {["Nội dung", "Thiết kế", "Nâng cao"].map((t, i) => (
              <button key={t}
                className={["h-8 rounded-lg text-[12.5px] font-semibold", i === 0 ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"].join(" ")}>
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {CONTENT_BLOCKS.map((b, i) => (
              <div key={b.label} className={["rounded-xl border", b.open ? "border-primary/30 bg-primary-soft/40" : "border-border"].join(" ")}>
                <button className="w-full flex items-center gap-2 px-3 py-2.5 text-[12.5px] font-semibold">
                  <b.icon className={["h-4 w-4", b.open ? "text-primary" : "text-muted-foreground"].join(" ")} />
                  <span className="flex-1 text-left">{b.label}</span>
                  {b.open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {b.open && (
                  <div className="px-3 pb-3 space-y-3">
                    <Field label="Họ và tên" value="Nguyễn Văn A" />
                    <Field label="Chức danh" value="Chuyên viên tư vấn BĐS cao cấp" />
                    <Field label="Công ty" value="ABC Real Estate" />
                    <Field label="Slogan / Tiêu đề phụ" value="Kết nối giá trị – Kiến tạo tương lai" />
                  </div>
                )}
              </div>
            ))}
            <button className="w-full h-10 rounded-xl border border-dashed border-border text-[12.5px] font-semibold text-muted-foreground hover:bg-muted/40 inline-flex items-center justify-center gap-1.5">
              <Plus className="h-4 w-4" /> Thêm khối
            </button>
          </div>
        </div>

        {/* Center: templates + preview + customization */}
        <div className="space-y-5 min-w-0">
          {/* Templates */}
          <div className="rounded-2xl bg-card border border-border shadow-soft p-4">
            <div className="text-[13px] font-semibold mb-3">Chọn mẫu thiết kế</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {TEMPLATES.map((t) => (
                <button key={t.name}
                  className={["aspect-[16/10] rounded-xl bg-gradient-to-br relative overflow-hidden ring-2 transition", t.tone, t.active ? "ring-primary" : "ring-transparent hover:ring-border"].join(" ")}>
                  <div className="absolute inset-2 flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-white/30" />
                    <div className="space-y-0.5">
                      <div className="h-1 w-12 bg-white/70 rounded-full" />
                      <div className="h-1 w-8 bg-white/40 rounded-full" />
                    </div>
                  </div>
                </button>
              ))}
              <button className="aspect-[16/10] rounded-xl border border-dashed border-border grid place-items-center text-muted-foreground hover:bg-muted/40">
                <div className="text-center">
                  <div className="grid grid-cols-2 gap-0.5 mb-1 mx-auto w-fit">
                    {[0, 1, 2, 3].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-sm bg-current opacity-60" />)}
                  </div>
                  <div className="text-[10.5px] font-semibold">Xem tất cả</div>
                </div>
              </button>
            </div>
          </div>

          {/* Preview Card */}
          <CardPreview />

          {/* Color + Font */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
              <div className="text-[13px] font-semibold mb-3">Chọn màu chủ đạo</div>
              <div className="flex items-center gap-2.5">
                {COLORS.map((c, i) => (
                  <button key={c} style={{ backgroundColor: c }}
                    className={["h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-card transition", i === 0 ? "ring-primary" : "ring-transparent hover:ring-border"].join(" ")} />
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border shadow-soft p-5">
              <div className="text-[13px] font-semibold mb-3">Font chữ</div>
              <div className="flex items-center gap-2">
                <button className="flex-1 h-9 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center justify-between px-3 hover:bg-muted/40">
                  Inter <ChevronDown className="h-4 w-4 opacity-60" />
                </button>
                <div className="inline-flex rounded-xl border border-border p-0.5">
                  <button className="h-8 w-8 grid place-items-center rounded-lg bg-muted/40 text-foreground font-bold text-[13px]">Aa</button>
                  <button className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground text-[15px] font-semibold">Aa</button>
                  <button className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground text-[17px] font-semibold">Aa</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: mobile preview + share + QR */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-card border border-border shadow-soft p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold">Xem trước trên mobile</div>
              <button className="h-7 px-2.5 rounded-lg border border-border text-[11.5px] inline-flex items-center gap-1 text-muted-foreground hover:bg-muted/40">
                <Edit3 className="h-3 w-3" /> Chỉnh sửa
              </button>
            </div>
            <PhonePreview />
          </div>

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
                <button key={s.label} className="aspect-square rounded-xl border border-border hover:border-primary hover:bg-primary-soft/30 grid place-items-center transition">
                  <s.icon className="h-5 w-5 text-primary mb-1" />
                  <div className="text-[10.5px] font-medium absolute mt-12">{s.label}</div>
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10.5px] text-muted-foreground font-medium">
              <span>NFC Tap</span><span>QR Code</span><span>Link</span>
              <span>AirDrop</span><span>Zalo</span><span>Khác</span>
            </div>
          </div>

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

function CardPreview() {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-card">
      {/* Skyline backdrop */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/30 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-[radial-gradient(ellipse_at_bottom,rgba(251,191,36,0.25),transparent_60%)]" />
      </div>
      <div className="relative p-7 md:p-10 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 items-center">
        {/* Avatar */}
        <div className="relative h-24 w-24 md:h-28 md:w-28 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 ring-4 ring-white/20 grid place-items-center">
          <User className="h-12 w-12 text-white/70" />
          <button className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-primary grid place-items-center shadow-soft ring-2 ring-slate-900">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
        </div>
        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[26px] md:text-[30px] font-bold tracking-tight">Nguyễn Văn A</h3>
            <BadgeCheck className="h-6 w-6 text-primary fill-primary/20" />
          </div>
          <p className="text-[13.5px] text-white/80 mt-1">Chuyên viên tư vấn BĐS cao cấp</p>
          <p className="text-[13px] text-primary font-semibold mt-0.5">ABC Real Estate</p>

          <div className="mt-5 space-y-2.5 text-[13px]">
            <Row icon={Phone} text="0987 654 321" />
            <Row icon={Mail} text="nguyenvana@email.com" />
            <Row icon={Link2} text="nguyenvana.nfcplatform.vn" />
            <Row icon={MapPin} text={"Vinhomes Ocean Park 2\nGia Lâm, Hà Nội"} multi />
          </div>
        </div>
        {/* Right block */}
        <div className="flex flex-col items-end gap-6">
          <div className="text-right">
            <div className="h-12 w-12 rounded-lg bg-white/10 grid place-items-center ml-auto mb-1">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div className="text-[10.5px] font-bold tracking-[0.2em] text-white">ABC</div>
            <div className="text-[9px] tracking-[0.3em] text-white/60">REAL ESTATE</div>
          </div>
          <div className="flex items-center gap-2">
            {[Phone, MessageCircle, MessageCircle, Mail].map((I, i) => (
              <button key={i} className="h-10 w-10 rounded-full bg-white/10 grid place-items-center hover:bg-white/20"><I className="h-4 w-4" /></button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold">Xem dự án</button>
            <button className="h-10 px-5 rounded-xl border border-white/30 text-[12.5px] font-semibold">Lưu liên hệ</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: I, text, multi }: { icon: typeof Phone; text: string; multi?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-7 w-7 rounded-full bg-white/10 grid place-items-center shrink-0 mt-0.5">
        <I className="h-3.5 w-3.5" />
      </div>
      <span className={["text-white/90", multi ? "whitespace-pre-line leading-snug" : ""].join(" ")}>{text}</span>
    </div>
  );
}

function PhonePreview() {
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
            <BadgeCheck className="h-3 w-3 text-primary" />
          </div>
          <div className="text-[8.5px] text-white/70 mt-0.5">Chuyên viên tư vấn BĐS cao cấp</div>
          <div className="text-[8.5px] text-primary font-semibold">ABC Real Estate</div>

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

          <button className="mt-3 w-full h-7 rounded-lg bg-primary text-[9px] font-semibold">Xem dự án</button>
          <button className="mt-1.5 w-full h-7 rounded-lg border border-white/20 text-[9px] font-semibold">Lưu liên hệ</button>

          <div className="mt-3 w-full text-left">
            <div className="flex items-center justify-between text-[9px] mb-1.5">
              <span className="font-semibold">Dự án nổi bật</span>
              <span className="text-primary">Xem tất cả</span>
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
