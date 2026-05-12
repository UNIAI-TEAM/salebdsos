import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Upload, RotateCcw, Download, Radio, QrCode,
  Phone, Mail, Building2, Palette, Type, ImageIcon, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DemoDialog } from "@/components/demo-dialog";

export const Route = createFileRoute("/customize")({
  head: () => ({
    meta: [
      { title: "Tuỳ biến mẫu danh thiếp NFC — NFC Platform" },
      { name: "description", content: "Đổi màu thương hiệu, logo, nội dung danh thiếp NFC và xem live preview ngay lập tức. Tạo danh thiếp số chuyên nghiệp trong vài phút." },
      { property: "og:title", content: "Tuỳ biến mẫu danh thiếp NFC — NFC Platform" },
      { property: "og:description", content: "Live preview chỉnh sửa danh thiếp NFC theo thương hiệu của bạn." },
    ],
  }),
  component: CustomizePage,
});

type Theme = "dark" | "light";

type State = {
  brand: string;
  name: string;
  role: string;
  city: string;
  phone: string;
  email: string;
  note: string;
  primary: string;   // background main
  accent: string;    // accent / chip
  textOnDark: Theme; // theme of the card
  logoDataUrl: string | null;
  showNfc: boolean;
  showQr: boolean;
};

const PRESETS: { id: string; label: string; primary: string; accent: string; theme: Theme }[] = [
  { id: "midnight", label: "Midnight Gold",  primary: "#0b1538", accent: "#fbbf24", theme: "dark" },
  { id: "emerald",  label: "Emerald Forest", primary: "#0f2418", accent: "#34d399", theme: "dark" },
  { id: "ocean",    label: "Royal Ocean",    primary: "#0a1340", accent: "#7dd3fc", theme: "dark" },
  { id: "ivory",    label: "Ivory Bronze",   primary: "#f5efe1", accent: "#b48e3a", theme: "light" },
  { id: "ruby",     label: "Ruby Velvet",    primary: "#3a0a12", accent: "#fde68a", theme: "dark" },
  { id: "violet",   label: "Violet Glow",    primary: "#1a0b3a", accent: "#f0abfc", theme: "dark" },
];

const DEFAULT_STATE: State = {
  brand: "ABC REAL ESTATE",
  name: "Nguyễn Văn A",
  role: "Chuyên viên tư vấn BĐS cao cấp",
  city: "Vinhomes Ocean Park 2 · Hà Nội",
  phone: "0987 654 321",
  email: "nguyenvana@abcreal.vn",
  note: "Quét QR hoặc chạm NFC để lưu liên hệ tự động.",
  primary: PRESETS[0].primary,
  accent: PRESETS[0].accent,
  textOnDark: PRESETS[0].theme,
  logoDataUrl: null,
  showNfc: true,
  showQr: true,
};

function CustomizePage() {
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof State>(k: K, v: State[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const onLogo = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("logoDataUrl", String(reader.result));
    reader.readAsDataURL(file);
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setState((s) => ({ ...s, primary: p.primary, accent: p.accent, textOnDark: p.theme }));
  };

  const reset = () => setState(DEFAULT_STATE);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" />
            Quay lại trang chủ
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="h-9 px-3 rounded-lg border border-border text-[12.5px] font-semibold hover:bg-muted transition inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Đặt lại
            </button>
            <DemoDialog>
              <button className="h-9 px-4 rounded-lg bg-foreground text-background text-[12.5px] font-semibold hover:opacity-90 transition inline-flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Đặt in mẫu này
              </button>
            </DemoDialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 lg:px-8 py-10 lg:py-14">
        {/* Hero */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary text-[11.5px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3" />
            Tuỳ biến mẫu của bạn
          </div>
          <h1 className="mt-3 text-[28px] sm:text-[36px] lg:text-[42px] font-bold tracking-tight leading-[1.1]">
            Đổi màu thương hiệu, logo & nội dung — <span className="text-primary">xem live preview</span> ngay
          </h1>
          <p className="mt-3 text-[14.5px] text-muted-foreground leading-relaxed">
            Chỉnh sửa từng chi tiết và thấy danh thiếp NFC của bạn cập nhật tức thì. Khi ưng ý, đặt lịch demo để đội ngũ in & kích hoạt thẻ.
          </p>
        </div>

        <div className="mt-10 grid lg:grid-cols-[1fr_minmax(0,520px)] gap-10 lg:gap-14 items-start">
          {/* ============== CONTROLS ============== */}
          <section className="space-y-8">
            {/* Brand color presets */}
            <Panel icon={<Palette className="h-4 w-4" />} title="Màu thương hiệu" subtitle="Chọn nhanh hoặc chỉnh tay">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESETS.map((p) => {
                  const active = p.primary === state.primary && p.accent === state.accent;
                  return (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p)}
                      className={cn(
                        "group relative h-14 rounded-xl border transition-all overflow-hidden",
                        active ? "border-foreground ring-2 ring-foreground/20" : "border-border hover:border-foreground/40",
                      )}
                      style={{ background: `linear-gradient(135deg, ${p.primary} 60%, ${p.accent} 100%)` }}
                      aria-label={p.label}
                      title={p.label}
                    >
                      <span className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white/90 drop-shadow">
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <ColorField label="Màu nền chính" value={state.primary} onChange={(v) => update("primary", v)} />
                <ColorField label="Màu điểm nhấn" value={state.accent} onChange={(v) => update("accent", v)} />
              </div>

              <div className="mt-3 flex gap-2">
                <ThemeToggle
                  value={state.textOnDark}
                  onChange={(t) => update("textOnDark", t)}
                />
              </div>
            </Panel>

            {/* Logo */}
            <Panel icon={<ImageIcon className="h-4 w-4" />} title="Logo thương hiệu" subtitle="PNG / SVG nền trong suốt sẽ đẹp nhất">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/40 overflow-hidden">
                  {state.logoDataUrl ? (
                    <img src={state.logoDataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onLogo(e.target.files?.[0] ?? null)}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="h-9 px-3 rounded-lg border border-border text-[12.5px] font-semibold hover:bg-muted transition inline-flex items-center gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Tải logo lên
                  </button>
                  {state.logoDataUrl && (
                    <button
                      onClick={() => update("logoDataUrl", null)}
                      className="h-9 px-3 rounded-lg border border-border text-[12.5px] font-semibold hover:bg-muted transition text-muted-foreground"
                    >
                      Xoá logo
                    </button>
                  )}
                </div>
              </div>
            </Panel>

            {/* Content */}
            <Panel icon={<Type className="h-4 w-4" />} title="Nội dung danh thiếp">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Tên thương hiệu">
                  <Input value={state.brand} onChange={(e) => update("brand", e.target.value)} />
                </Field>
                <Field label="Họ và tên">
                  <Input value={state.name} onChange={(e) => update("name", e.target.value)} />
                </Field>
                <Field label="Chức danh">
                  <Input value={state.role} onChange={(e) => update("role", e.target.value)} />
                </Field>
                <Field label="Khu vực / Dự án">
                  <Input value={state.city} onChange={(e) => update("city", e.target.value)} />
                </Field>
                <Field label="Số điện thoại">
                  <Input value={state.phone} onChange={(e) => update("phone", e.target.value)} />
                </Field>
                <Field label="Email">
                  <Input value={state.email} onChange={(e) => update("email", e.target.value)} />
                </Field>
                <Field label="Ghi chú mặt sau" className="sm:col-span-2">
                  <Textarea
                    rows={2}
                    value={state.note}
                    onChange={(e) => update("note", e.target.value)}
                  />
                </Field>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ToggleChip
                  active={state.showNfc}
                  onClick={() => update("showNfc", !state.showNfc)}
                  icon={<Radio className="h-3.5 w-3.5" />}
                  label="Hiển thị NFC"
                />
                <ToggleChip
                  active={state.showQr}
                  onClick={() => update("showQr", !state.showQr)}
                  icon={<QrCode className="h-3.5 w-3.5" />}
                  label="Hiển thị QR"
                />
              </div>
            </Panel>
          </section>

          {/* ============== LIVE PREVIEW ============== */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between mb-5">
                <div className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  Live preview
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang đồng bộ
                </div>
              </div>

              <CardPreview state={state} />

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Stat label="Mặt thẻ" value="1.7:1" />
                <Stat label="Định dạng" value="NFC + QR" />
                <Stat label="Thời gian" value="< 5 phút" />
              </div>

              <p className="mt-4 text-[11.5px] text-muted-foreground text-center">
                Khi ưng ý, đặt lịch demo để đội ngũ in & kích hoạt thẻ NFC vật lý.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ============== Sub components ============== */

function Panel({
  icon, title, subtitle, children,
}: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-8 w-8 rounded-lg bg-primary-soft text-primary inline-flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="text-[12px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ColorField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded-lg border border-border bg-transparent cursor-pointer"
          aria-label={label}
        />
        <Input
          value={value.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-[12.5px]"
        />
      </div>
    </div>
  );
}

function ThemeToggle({ value, onChange }: { value: Theme; onChange: (v: Theme) => void }) {
  return (
    <div className="inline-flex p-1 rounded-lg bg-muted text-[12px] font-semibold">
      {(["dark", "light"] as Theme[]).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "h-7 px-3 rounded-md transition",
            value === t ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t === "dark" ? "Chữ sáng" : "Chữ tối"}
        </button>
      ))}
    </div>
  );
}

function ToggleChip({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12px] font-semibold transition",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-background text-muted-foreground border-border hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <div className="text-[13px] font-semibold">{value}</div>
      <div className="text-[10.5px] text-muted-foreground">{label}</div>
    </div>
  );
}

/* ============== CARD PREVIEW ============== */

function CardPreview({ state }: { state: State }) {
  const isDark = state.textOnDark === "dark";
  const surfaceBg = useMemo(
    () => `linear-gradient(135deg, ${shade(state.primary, -8)}, ${state.primary} 55%, ${mix(state.primary, state.accent, 0.18)})`,
    [state.primary, state.accent],
  );
  const text = isDark ? "text-white" : "text-[#1a1408]";
  const sub = isDark ? "text-white/70" : "text-black/60";
  const brandStyle = { color: state.accent };
  const accentBgStyle = { background: state.accent, color: contrastOn(state.accent) };

  return (
    <div className="space-y-4">
      {/* Front */}
      <article
        className={cn(
          "relative aspect-[1.7/1] rounded-2xl overflow-hidden p-5 sm:p-6 shadow-[0_25px_60px_-25px_rgba(0,0,0,0.45)] border border-black/10 transition-all",
          text,
        )}
        style={{ background: surfaceBg }}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {state.logoDataUrl ? (
              <img src={state.logoDataUrl} alt="logo" className="h-8 w-8 object-contain rounded bg-white/10 p-1" />
            ) : (
              <span
                className="inline-flex items-center justify-center h-7 min-w-7 px-1.5 rounded-md text-[11px] font-bold"
                style={accentBgStyle}
              >
                {initials(state.brand)}
              </span>
            )}
            <span className="text-[10.5px] font-bold tracking-[0.18em]" style={brandStyle}>
              {state.brand || "BRAND"}
            </span>
          </div>
        </header>

        <div className="mt-4">
          <h3 className="text-[17px] sm:text-[19px] font-bold leading-tight tracking-tight">
            {state.name || "Họ và tên"}
          </h3>
          <p className={cn("text-[11px] mt-0.5", sub)}>{state.role || "Chức danh"}</p>
        </div>

        <ul className={cn("mt-3 space-y-1 text-[11px]", sub)}>
          {state.phone && (
            <li className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 opacity-80" /> {state.phone}
            </li>
          )}
          {state.email && (
            <li className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 opacity-80" /> <span className="truncate">{state.email}</span>
            </li>
          )}
          {state.city && (
            <li className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 opacity-80" /> <span className="truncate">{state.city}</span>
            </li>
          )}
        </ul>

        <div className="absolute right-4 bottom-4 flex items-end gap-2">
          {state.showNfc && (
            <div
              className="flex flex-col items-center justify-center h-14 w-12 rounded-lg"
              style={accentBgStyle}
              aria-label="NFC"
            >
              <Radio className="h-4 w-4" />
              <span className="text-[8px] font-bold mt-0.5">NFC</span>
            </div>
          )}
          {state.showQr && (
            <div
              className="flex flex-col items-center justify-center h-14 w-14 rounded-lg bg-white text-black p-1.5"
              aria-label="QR"
            >
              <QrCode className="h-7 w-7" strokeWidth={1.5} />
              <span className="text-[7.5px] font-semibold leading-tight mt-0.5 text-black/70">
                Quét xem
              </span>
            </div>
          )}
        </div>
      </article>

      {/* Back */}
      <article
        className={cn(
          "relative aspect-[1.7/1] rounded-2xl overflow-hidden p-5 sm:p-6 border border-black/10",
          text,
        )}
        style={{ background: surfaceBg }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 12px)",
        }} />
        <div className="relative h-full flex flex-col justify-between">
          <div className="text-[10.5px] font-bold tracking-[0.18em]" style={brandStyle}>
            {state.brand || "BRAND"} · BACK
          </div>
          <p className={cn("text-[12.5px] leading-relaxed", sub)}>
            {state.note || "Ghi chú mặt sau danh thiếp."}
          </p>
          <div className={cn("text-[10px] uppercase tracking-wider", sub)}>
            Powered by NFC Platform
          </div>
        </div>
      </article>
    </div>
  );
}

/* ============== utils ============== */

function initials(s: string) {
  return s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "B";
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number) {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function shade(hex: string, percent: number) {
  try {
    const [r, g, b] = hexToRgb(hex);
    const f = 1 + percent / 100;
    return rgbToHex(r * f, g * f, b * f);
  } catch { return hex; }
}
function mix(a: string, b: string, t: number) {
  try {
    const [r1, g1, b1] = hexToRgb(a);
    const [r2, g2, b2] = hexToRgb(b);
    return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  } catch { return a; }
}
function contrastOn(hex: string) {
  try {
    const [r, g, b] = hexToRgb(hex);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 160 ? "#111111" : "#ffffff";
  } catch { return "#111"; }
}
