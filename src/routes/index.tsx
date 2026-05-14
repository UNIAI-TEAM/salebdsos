import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Radio, ArrowRight, Sparkles, Zap, ShieldCheck, Wallet, QrCode, Send, Smartphone,
  Users2, BarChart3, Gauge, Globe2, Building2, Crown, Check, Star, Phone, Mail,
  IdCard, Brain, Target, TrendingUp, Activity, ChevronRight, Play, Plus, Minus,
  Apple, Layers, MessageSquare, Calendar,
} from "lucide-react";
import { useState } from "react";
import { BookingDialog } from "@/components/booking-dialog";
import { DemoDialog } from "@/components/demo-dialog";
import { LandingChatbot } from "@/components/landing-chatbot";
import { DesignCarousel } from "@/components/design-carousel";
import nfcPlatformOverview from "@/assets/nfc-platform-overview.jpg";

const SITE_URL = "https://nfcplatform.vn";

const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: "SaleBDS OS là gì?", a: "Là nền tảng all-in-one giúp Sale BĐS chia sẻ danh thiếp số (NFC, QR, Wallet), tự động tạo lead, dùng AI follow-up và quản lý CRM trên một hệ thống duy nhất." },
  { q: "Tôi có cần thẻ NFC vật lý không?", a: "Không bắt buộc. Bạn vẫn có thể dùng QR động, Wallet Card, link sharing và mobile app. Thẻ NFC vật lý là tuỳ chọn premium." },
  { q: "AI có hỗ trợ tiếng Việt không?", a: "Có. AI được fine-tune trên dữ liệu hành vi khách hàng BĐS Việt Nam và hiểu ngữ cảnh giao tiếp địa phương." },
  { q: "Dữ liệu của tôi có an toàn không?", a: "Chúng tôi tuân thủ chuẩn ISO 27001, mã hoá end-to-end và lưu trữ tại data center cấp Enterprise. Phân quyền và audit log đầy đủ." },
  { q: "Có hỗ trợ tích hợp CRM khác không?", a: "Có. Chúng tôi hỗ trợ tích hợp với Salesforce, HubSpot, Zalo OA, Google Workspace, và webhook tuỳ chỉnh." },
  { q: "Có dùng thử miễn phí không?", a: "Có. Gói Business cho dùng thử 14 ngày miễn phí, không cần thẻ tín dụng. Gói Starter miễn phí trọn đời." },
];

const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SaleBDS OS",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.ico`,
  description: "Sales Growth Platform for Real Estate — NFC + AI + CRM cho đội Sale Bất động sản.",
  sameAs: [
    "https://www.facebook.com/nfcplatform",
    "https://www.linkedin.com/company/nfcplatform",
  ],
  contactPoint: [{
    "@type": "ContactPoint",
    contactType: "sales",
    email: "hello@nfcplatform.vn",
    areaServed: "VN",
    availableLanguage: ["Vietnamese", "English"],
  }],
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SaleBDS OS — Sales Growth Platform for Real Estate" },
      { name: "description", content: "Nền tảng tăng trưởng toàn diện cho Sale Bất động sản: NFC + AI + CRM giúp kết nối khách hàng, tạo lead và chốt deal nhanh hơn." },
      { property: "og:title", content: "SaleBDS OS — Sales Growth Platform for Real Estate" },
      { property: "og:description", content: "Một profile – đa nền tảng – đa cách chia sẻ. AI Follow-up, AI Lead Score, CRM, Analytics dành riêng cho BĐS." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(ORGANIZATION_LD) },
      { type: "application/ld+json", children: JSON.stringify(FAQ_LD) },
    ],
  }),
  component: LandingPage,
});

/* ============================ NAV ============================ */
function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-background/70 border-b border-border/60">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-brand-gradient grid place-items-center shadow-glow">
            <Radio className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">SaleBDS OS</div>
            <div className="text-[10.5px] text-muted-foreground">Điều hành kinh doanh bằng điểm chạm</div>
          </div>
        </Link>
        <nav className="hidden lg:flex items-center gap-7 text-[13.5px] text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Tính năng</a>
          <a href="#platform" className="hover:text-foreground transition">Nền tảng</a>
          <a href="#ai" className="hover:text-foreground transition">AI</a>
          <a href="#pricing" className="hover:text-foreground transition">Bảng giá</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="hidden sm:inline-flex h-9 px-3.5 rounded-lg text-[13px] font-medium text-foreground/80 hover:text-foreground items-center">Đăng nhập</Link>
          <DemoDialog>
            <button type="button" className="h-9 px-3.5 rounded-lg bg-foreground text-background text-[13px] font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition">
              Trải nghiệm demo <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </DemoDialog>
        </div>
      </div>
    </header>
  );
}

/* ============================ HERO ============================ */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft glow background */}
      <div className="absolute inset-0 -z-10 bg-grid-soft opacity-60" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[640px] w-[1100px] rounded-full bg-gradient-to-br from-primary/25 via-indigo-500/15 to-blue-500/10 blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 lg:pt-24 pb-20 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          {/* Copy */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft border border-primary/15 text-[12px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI-native · Mobile-first · Enterprise
            </div>
            <h1 className="mt-5 text-[44px] sm:text-[56px] lg:text-[64px] leading-[1.05] font-bold tracking-tight">
              Nền tảng tăng trưởng <br />
              <span className="text-brand-gradient">cho Bất động sản</span>
            </h1>
            <p className="mt-5 text-[16px] lg:text-[17.5px] text-muted-foreground leading-relaxed max-w-xl">
              Nền tảng tăng trưởng toàn diện giúp Sale Bất động sản kết nối, tạo lead, chăm sóc khách hàng và chốt deal bằng <span className="text-foreground font-semibold">NFC + AI + CRM</span>.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <DemoDialog>
                <button type="button" className="h-12 px-5 rounded-xl bg-foreground text-background text-[14px] font-semibold inline-flex items-center gap-2 hover:opacity-90 transition">
                  Trải nghiệm demo <ArrowRight className="h-4 w-4" />
                </button>
              </DemoDialog>
              <BookingDialog>
                <button type="button" className="h-12 px-5 rounded-xl border border-border bg-card text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-muted/40 transition">
                  <Calendar className="h-4 w-4" /> Đặt lịch tư vấn
                </button>
              </BookingDialog>
            </div>
            {/* Trust */}
            <div className="mt-8 flex items-center gap-6 text-[12px] text-muted-foreground">
              <div className="flex -space-x-2">
                {["A", "B", "C", "D"].map((c, i) => (
                  <div key={i} className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[10.5px] font-bold ring-2 ring-background">{c}</div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                  <span className="ml-1.5 text-foreground font-semibold">4.9/5</span>
                </div>
                <div>Tin dùng bởi <span className="font-semibold text-foreground">2,400+</span> sale BĐS</div>
              </div>
            </div>

            {/* KPI strip */}
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-lg">
              {[
                { k: "+312%", v: "Lead growth" },
                { k: "8.2x", v: "Faster follow-up" },
                { k: "62%", v: "Tỷ lệ chuyển đổi" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-[24px] font-bold tracking-tight text-brand-gradient">{s.k}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative h-[560px] lg:h-[620px] animate-scale-in">
      {/* Dashboard mock */}
      <div className="absolute right-0 top-4 w-[460px] max-w-[92%] rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        <div className="h-9 bg-muted/40 border-b border-border flex items-center gap-1.5 px-3">
          {["bg-rose-400", "bg-amber-400", "bg-emerald-400"].map((c) => <div key={c} className={["h-2.5 w-2.5 rounded-full", c].join(" ")} />)}
          <div className="ml-3 text-[10.5px] text-muted-foreground">app.nfcplatform.vn/dashboard</div>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: "Lead mới", v: "248", c: "from-primary/15" },
              { l: "Deal", v: "38", c: "from-blue-500/15" },
              { l: "Doanh thu", v: "8.6 tỷ", c: "from-emerald-500/15" },
            ].map((k) => (
              <div key={k.l} className={["rounded-xl bg-gradient-to-br to-transparent p-2.5 border border-border/60", k.c].join(" ")}>
                <div className="text-[10px] text-muted-foreground">{k.l}</div>
                <div className="text-[15px] font-bold tracking-tight">{k.v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11.5px] font-semibold">Lượt xem profile</div>
              <span className="text-[10px] text-emerald-600 font-bold">+24.5%</span>
            </div>
            <svg viewBox="0 0 300 80" className="w-full h-16">
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="oklch(0.59 0.22 285)" stopOpacity="0.4" />
                  <stop offset="1" stopColor="oklch(0.59 0.22 285)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,60 C30,40 60,50 90,30 C120,10 150,40 180,25 C210,10 240,30 270,15 L300,20 L300,80 L0,80 Z" fill="url(#g1)" />
              <path d="M0,60 C30,40 60,50 90,30 C120,10 150,40 180,25 C210,10 240,30 270,15 L300,20" stroke="oklch(0.59 0.22 285)" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <div className="rounded-xl border border-border p-3 space-y-2">
            {[
              { n: "Trần Minh Đức", s: "Hot lead · 92", t: "Vinhomes Ocean Park" },
              { n: "Lê Thu Hương", s: "Warm · 78", t: "Masteri Waterfront" },
            ].map((l) => (
              <div key={l.n} className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[10px] font-bold">{l.n.split(" ").pop()![0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-semibold truncate">{l.n}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{l.t}</div>
                </div>
                <span className="text-[10px] font-bold text-primary">{l.s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phone mock */}
      <div className="absolute left-2 bottom-0 w-[230px] rounded-[36px] bg-gradient-to-br from-slate-900 to-slate-800 p-2 shadow-glow ring-1 ring-white/10">
        <div className="rounded-[28px] bg-card overflow-hidden h-[440px] relative">
          <div className="h-32 bg-brand-gradient relative">
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full ring-4 ring-card bg-gradient-to-br from-amber-400 to-rose-500 grid place-items-center text-white text-[18px] font-bold">A</div>
          </div>
          <div className="pt-10 px-4 text-center">
            <div className="text-[13px] font-bold">Nguyễn Văn A</div>
            <div className="text-[10.5px] text-muted-foreground">Senior Sales · Vinhomes</div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[Phone, Mail, QrCode, Send].map((I, i) => (
                <div key={i} className="h-9 rounded-xl bg-muted/60 grid place-items-center"><I className="h-3.5 w-3.5 text-foreground/70" /></div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-border p-2.5 text-left">
              <div className="text-[10px] text-muted-foreground">Sản phẩm nổi bật</div>
              <div className="text-[11.5px] font-semibold">Vinhomes Ocean Park 2</div>
              <div className="text-[10px] text-primary font-bold mt-0.5">Từ 2.8 tỷ</div>
            </div>
            <button className="mt-3 w-full h-9 rounded-xl bg-foreground text-background text-[11.5px] font-semibold">Lưu liên hệ</button>
          </div>
        </div>
      </div>

      {/* NFC card */}
      <div className="absolute left-[170px] top-2 w-[220px] aspect-[1.6/1] rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-primary p-4 shadow-glow ring-1 ring-white/10 rotate-[-8deg] hover:rotate-[-4deg] transition-transform">
        <div className="flex items-start justify-between">
          <Radio className="h-5 w-5 text-white/80" />
          <div className="text-[9.5px] text-white/60 font-mono">NFC · TAP</div>
        </div>
        <div className="mt-7">
          <div className="text-[14px] font-bold text-white tracking-tight">Nguyễn Văn A</div>
          <div className="text-[10px] text-white/70">Senior Sales · BĐS</div>
        </div>
        <div className="absolute bottom-3 right-3 h-8 w-8 rounded-md bg-white/95 grid place-items-center">
          <QrCode className="h-5 w-5 text-slate-900" />
        </div>
      </div>

      {/* AI floating card */}
      <div className="hidden lg:block absolute right-[-10px] bottom-8 w-[260px] rounded-2xl bg-card border border-border shadow-card p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-lg bg-brand-gradient grid place-items-center"><Brain className="h-3.5 w-3.5 text-white" /></div>
          <div className="text-[11.5px] font-bold">AI Insight</div>
          <span className="ml-auto text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">Live</span>
        </div>
        <p className="text-[11.5px] text-muted-foreground leading-relaxed">
          3 lead có khả năng chốt cao trong 48h. Đề xuất gọi <span className="font-semibold text-foreground">Trần Minh Đức</span> trước 17:00.
        </p>
      </div>
    </div>
  );
}

/* ============================ LOGO STRIP ============================ */
function LogoStrip() {
  const logos = ["Vinhomes", "Masteri", "Sun Group", "Novaland", "Ecopark", "Gamuda", "MIK Group"];
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-7">
        <div className="text-center text-[11.5px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">
          Tin dùng bởi các đội Sales hàng đầu BĐS
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 opacity-70">
          {logos.map((l) => <div key={l} className="text-[15px] font-bold tracking-tight text-foreground/60">{l}</div>)}
        </div>
      </div>
    </section>
  );
}

/* ============================ PROBLEM / SOLUTION ============================ */
function Problem() {
  const problems = [
    { icon: Users2, t: "Mất khách hàng", d: "Lead rò rỉ giữa các kênh, không ai chốt." },
    { icon: MessageSquare, t: "Follow-up thủ công", d: "Quên nhắn, quên gọi, quên gửi tài liệu." },
    { icon: BarChart3, t: "Không đo được hiệu quả", d: "Không biết kênh nào ra deal." },
    { icon: IdCard, t: "Thiếu công cụ chuyên nghiệp", d: "Danh thiếp giấy, profile rời rạc." },
    { icon: Layers, t: "CRM rời rạc", d: "Excel, Zalo, email… mỗi người một kiểu." },
    { icon: Brain, t: "Không có AI hỗ trợ", d: "Sale tự phán đoán, mất giờ vàng." },
  ];
  const solutions = [
    { icon: Zap, t: "Tự động tạo lead", d: "Mỗi NFC tap / QR scan tạo lead ngay." },
    { icon: Sparkles, t: "AI Follow-up 24/7", d: "Gợi ý nội dung, thời điểm, kịch bản." },
    { icon: Gauge, t: "AI Lead Score", d: "Chấm điểm khách nóng/lạnh real-time." },
    { icon: BarChart3, t: "Analytics chi tiết", d: "Theo dõi mọi chạm, mọi conversion." },
    { icon: Layers, t: "CRM hợp nhất", d: "Tất cả khách – mọi kênh – một nơi." },
    { icon: ShieldCheck, t: "Enterprise-grade", d: "Phân quyền, audit, bảo mật cấp DN." },
  ];
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <SectionHeading
          eyebrow="Vấn đề & Giải pháp"
          title={<>Đội Sales BĐS đang <span className="text-brand-gradient">lãng phí cơ hội</span> mỗi ngày</>}
          sub="Chúng tôi xây dựng một nền tảng duy nhất giải quyết toàn bộ chuỗi tăng trưởng — từ chạm đầu tiên tới chốt deal."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
          <div className="rounded-3xl bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <div className="text-[12px] font-bold uppercase tracking-wider text-rose-600">Trước đây</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {problems.map((p) => (
                <div key={p.t} className="rounded-xl border border-border p-3.5 hover:bg-muted/40 transition">
                  <p.icon className="h-4 w-4 text-rose-500 mb-2" />
                  <div className="text-[13px] font-semibold">{p.t}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{p.d}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-primary/8 via-indigo-500/5 to-transparent border border-primary/20 p-6 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/15 blur-3xl" />
            <div className="flex items-center gap-2 mb-5 relative">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <div className="text-[12px] font-bold uppercase tracking-wider text-primary">Với SaleBDS OS</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              {solutions.map((p) => (
                <div key={p.t} className="rounded-xl bg-card border border-border p-3.5 hover:shadow-soft transition">
                  <p.icon className="h-4 w-4 text-primary mb-2" />
                  <div className="text-[13px] font-semibold">{p.t}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{p.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ MULTI-ENTRY ============================ */
function MultiEntry() {
  const items = [
    { icon: Radio, t: "NFC Tap", d: "Chạm 1 giây – mở profile" },
    { icon: QrCode, t: "QR Code", d: "In ấn, biển hiệu, tài liệu" },
    { icon: Globe2, t: "Link Sharing", d: "Chia sẻ qua Zalo, SMS" },
    { icon: Apple, t: "Apple Wallet", d: "Lưu vào ví Apple" },
    { icon: Wallet, t: "Google Wallet", d: "Lưu vào ví Google" },
    { icon: Smartphone, t: "Mobile App", d: "App native iOS/Android" },
    { icon: Phone, t: "Lock Screen", d: "Hiện ngay màn khóa" },
    { icon: Send, t: "AirDrop Share", d: "Gửi tức thì gần bạn" },
    { icon: Activity, t: "Social Bio", d: "Link-in-bio TikTok/IG" },
  ];
  return (
    <section id="connect" className="py-20 lg:py-28 bg-muted/30 border-y border-border">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <SectionHeading
          eyebrow="Multi-entry Connection"
          title={<>Kết nối <span className="text-brand-gradient">mọi lúc, mọi nơi</span></>}
          sub="Một profile – đa nền tảng – đa cách chia sẻ."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 mt-10">
          {items.map((it, i) => (
            <div key={it.t} className="group rounded-2xl bg-card border border-border p-5 hover:border-primary/40 hover:shadow-card transition relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition" />
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center mb-3 group-hover:bg-brand-gradient group-hover:text-white transition">
                  <it.icon className="h-5 w-5" />
                </div>
                <div className="text-[14px] font-semibold">{it.t}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{it.d}</div>
                <div className="mt-3 text-[10.5px] text-primary font-bold opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 transition">
                  Tìm hiểu <ArrowRight className="h-3 w-3" />
                </div>
                <div className="absolute -bottom-1 -right-1 text-[60px] font-black text-primary/5 leading-none">{String(i + 1).padStart(2, "0")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ FEATURES ============================ */
function Features() {
  const feats = [
    { icon: IdCard, t: "Digital Identity", d: "Profile thương hiệu cá nhân chuyên nghiệp." },
    { icon: Radio, t: "Dynamic QR", d: "QR động đổi đích đến không cần in lại." },
    { icon: Wallet, t: "Wallet Card", d: "Apple/Google Wallet — luôn trong ví khách." },
    { icon: Smartphone, t: "Mobile Card", d: "Danh thiếp số mobile-first, đẹp như app." },
    { icon: Sparkles, t: "AI Follow-up", d: "AI nhắc gọi, soạn tin, gửi tài liệu đúng lúc." },
    { icon: Gauge, t: "AI Lead Score", d: "Chấm điểm nóng/lạnh, ưu tiên khách chất." },
    { icon: Users2, t: "CRM hợp nhất", d: "Toàn bộ pipeline, cuộc gọi, lịch hẹn một nơi." },
    { icon: BarChart3, t: "Analytics", d: "Báo cáo deep-funnel & cohort theo dự án." },
    { icon: ShieldCheck, t: "Team Management", d: "Phân quyền, KPI, ranking, audit log." },
    { icon: Globe2, t: "AI Sales Page", d: "Tự sinh landing page bán hàng dự án." },
  ];
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <SectionHeading
          eyebrow="Tính năng"
          title={<>Tất cả công cụ <span className="text-brand-gradient">tăng trưởng</span> trong một nền tảng</>}
          sub="Được thiết kế riêng cho ngành Bất động sản — từ Sale cá nhân tới đội nhóm enterprise."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {feats.map((f) => (
            <div key={f.t} className="group rounded-2xl bg-card border border-border p-5 hover:shadow-card hover:-translate-y-0.5 transition">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white mb-3 group-hover:scale-110 transition">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="text-[14.5px] font-semibold">{f.t}</div>
              <div className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ PLATFORM SHOWCASE ============================ */
function PlatformShowcase() {
  const tabs = ["CRM", "AI Follow-up", "Analytics", "Team"];
  const [tab, setTab] = useState(0);
  return (
    <section id="platform" className="py-20 lg:py-28 bg-gradient-to-b from-slate-950 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-[1000px] bg-primary/20 blur-3xl rounded-full" />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 relative">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11.5px] font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Platform Showcase
          </div>
          <h2 className="mt-4 text-[32px] lg:text-[44px] font-bold tracking-tight leading-tight">
            Một sản phẩm SaaS <span className="text-brand-gradient">production-ready</span>
          </h2>
          <p className="mt-3 text-white/60 text-[14.5px]">Giao diện được tinh chỉnh tới từng pixel — mượt, nhanh, dễ dùng.</p>
        </div>

        <div className="flex justify-center gap-1.5 mt-8">
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={["px-4 h-9 rounded-full text-[12.5px] font-semibold transition",
                tab === i ? "bg-white text-slate-900" : "bg-white/5 text-white/70 hover:bg-white/10"].join(" ")}>{t}</button>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm p-3 lg:p-4 shadow-2xl">
          <div className="rounded-2xl bg-background text-foreground overflow-hidden">
            <div className="h-9 bg-muted/50 border-b border-border flex items-center gap-1.5 px-3">
              {["bg-rose-400", "bg-amber-400", "bg-emerald-400"].map((c) => <div key={c} className={["h-2.5 w-2.5 rounded-full", c].join(" ")} />)}
              <div className="ml-3 text-[10.5px] text-muted-foreground">app.nfcplatform.vn / {tabs[tab].toLowerCase()}</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] min-h-[420px]">
              <div className="hidden lg:block bg-sidebar text-sidebar-foreground p-3 space-y-1">
                {["Tổng quan", "Danh thiếp", "Leads", "Pipeline", "AI Follow-up", "Analytics", "Team"].map((m, i) => (
                  <div key={m} className={["text-[11.5px] px-2.5 py-1.5 rounded-md",
                    i === 2 ? "bg-sidebar-accent text-white font-semibold" : "text-sidebar-foreground/70"].join(" ")}>{m}</div>
                ))}
              </div>
              <div className="p-5">
                {tab === 0 && <CrmMock />}
                {tab === 1 && <AiMock />}
                {tab === 2 && <AnalyticsMock />}
                {tab === 3 && <TeamMock />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CrmMock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[15px] font-bold">Leads (CRM)</div>
          <div className="text-[11.5px] text-muted-foreground">248 lead · 38 deal đang mở</div>
        </div>
        <button className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11.5px] font-semibold">+ Thêm lead</button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {["Mới", "Liên hệ", "Quan tâm", "Chốt"].map((s, i) => (
          <div key={s} className="rounded-xl border border-border p-2.5">
            <div className="text-[10.5px] text-muted-foreground">{s}</div>
            <div className="text-[16px] font-bold">{[68, 84, 42, 18][i]}</div>
            <div className="h-1 rounded-full bg-muted mt-1.5"><div className="h-full rounded-full bg-primary" style={{ width: `${[60, 75, 40, 25][i]}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-[11.5px]">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>{["Khách hàng", "Dự án", "Score", "Trạng thái"].map((h) => <th key={h} className="text-left font-medium px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {[
              { n: "Trần Minh Đức", p: "Vinhomes Ocean Park", s: 92, st: "Hot", c: "bg-rose-100 text-rose-700" },
              { n: "Lê Thu Hương", p: "Masteri Waterfront", s: 78, st: "Warm", c: "bg-amber-100 text-amber-700" },
              { n: "Phạm Tuấn Anh", p: "Lumi Hanoi", s: 64, st: "Đang chăm", c: "bg-blue-100 text-blue-700" },
              { n: "Nguyễn Hải Yến", p: "Sun Grand", s: 88, st: "Hot", c: "bg-rose-100 text-rose-700" },
            ].map((r) => (
              <tr key={r.n} className="border-t border-border">
                <td className="px-3 py-2 font-semibold">{r.n}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.p}</td>
                <td className="px-3 py-2 font-bold text-primary">{r.s}</td>
                <td className="px-3 py-2"><span className={["text-[10px] px-1.5 py-0.5 rounded-md font-bold", r.c].join(" ")}>{r.st}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AiMock() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-primary" />
          <div className="text-[13px] font-bold">AI Recommendations</div>
        </div>
        {[
          "Gọi Trần Minh Đức trước 17:00 — khách đang xem profile lần 3",
          "Gửi brochure Ocean Park 2 cho Lê Thu Hương",
          "Tạo follow-up sequence cho 12 lead 'warm'",
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-2 py-2 border-t border-border/60 first:border-0">
            <div className="h-5 w-5 rounded-full bg-primary-soft text-primary grid place-items-center text-[10px] font-bold shrink-0">{i + 1}</div>
            <div className="text-[12px] text-muted-foreground">{s}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="text-[13px] font-bold">AI Soạn tin nhắn</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-[11.5px] text-muted-foreground leading-relaxed">
          "Chào anh Đức, em thấy anh đang quan tâm Vinhomes Ocean Park 2. Em vừa cập nhật bảng giá đợt mới với ưu đãi 15% cho 5 căn cuối. Anh có rảnh 15 phút chiều nay để em gửi chi tiết không ạ?"
        </div>
        <div className="mt-3 flex gap-2">
          <button className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-[11.5px] font-semibold">Gửi Zalo</button>
          <button className="h-8 px-3 rounded-lg border border-border text-[11.5px]">Soạn lại</button>
        </div>
      </div>
    </div>
  );
}

function AnalyticsMock() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[
          { l: "Lượt xem", v: "12.4k", d: "+24%" },
          { l: "Lưu liên hệ", v: "3.8k", d: "+18%" },
          { l: "CTR", v: "31%", d: "+6%" },
          { l: "Chuyển đổi", v: "7.9%", d: "+1.2%" },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-border p-2.5">
            <div className="text-[10.5px] text-muted-foreground">{k.l}</div>
            <div className="text-[16px] font-bold">{k.v}</div>
            <div className="text-[10px] text-emerald-600 font-bold">{k.d}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border p-4">
        <div className="text-[12px] font-semibold mb-2">Lượt xem theo nguồn</div>
        <svg viewBox="0 0 400 140" className="w-full h-32">
          <defs>
            <linearGradient id="ga" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="oklch(0.59 0.22 285)" stopOpacity="0.4" />
              <stop offset="1" stopColor="oklch(0.59 0.22 285)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,100 C40,80 80,90 120,60 C160,30 200,70 240,40 C280,15 320,50 360,30 L400,35 L400,140 L0,140 Z" fill="url(#ga)" />
          <path d="M0,100 C40,80 80,90 120,60 C160,30 200,70 240,40 C280,15 320,50 360,30 L400,35" stroke="oklch(0.59 0.22 285)" strokeWidth="2" fill="none" />
        </svg>
      </div>
    </div>
  );
}

function TeamMock() {
  return (
    <div className="space-y-2">
      {[
        { n: "Nguyễn Văn A", r: "Sales Manager", d: 38, rev: "8.6 tỷ", t: 24, b: Crown, tone: "text-amber-500" },
        { n: "Lê Minh Hằng", r: "Senior Sales", d: 32, rev: "7.2 tỷ", t: 18 },
        { n: "Trần Thanh Long", r: "Senior Sales", d: 28, rev: "6.4 tỷ", t: 12 },
        { n: "Phạm Quốc Anh", r: "Sales", d: 24, rev: "5.8 tỷ", t: 8 },
      ].map((r, i) => (
        <div key={r.n} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
          <div className="text-[13px] font-bold w-5 text-center text-muted-foreground">{i + 1}</div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[10.5px] font-bold">{r.n.split(" ").pop()![0]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="text-[12.5px] font-semibold truncate">{r.n}</div>
              {r.b && <r.b className={["h-3.5 w-3.5", r.tone].join(" ")} />}
            </div>
            <div className="text-[10.5px] text-muted-foreground">{r.r}</div>
          </div>
          <div className="text-[11px]"><span className="text-muted-foreground">Deal: </span><span className="font-bold">{r.d}</span></div>
          <div className="text-[11px] font-bold text-primary">{r.rev}</div>
          <span className="text-[10.5px] font-bold text-emerald-600 w-10 text-right">+{r.t}%</span>
        </div>
      ))}
    </div>
  );
}

/* ============================ AI SECTION ============================ */
function AiSection() {
  const items = [
    { icon: Sparkles, t: "AI Follow-up", d: "Soạn tin, kịch bản, lịch nhắc tự động." },
    { icon: Gauge, t: "AI Lead Score", d: "Chấm điểm khách dựa trên hành vi & profile." },
    { icon: Brain, t: "AI Recommendations", d: "Gợi ý hành động tiếp theo cho mỗi lead." },
    { icon: Globe2, t: "AI Sales Page", d: "Tự sinh landing dự án trong 30 giây." },
    { icon: Activity, t: "AI Insights", d: "Phát hiện xu hướng, kênh, dự án hot." },
    { icon: Target, t: "Conversion Prediction", d: "Dự đoán xác suất chốt deal real-time." },
  ];
  return (
    <section id="ai" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
          <div>
            <SectionHeading
              align="left"
              eyebrow="AI Native"
              title={<>AI dành riêng cho <span className="text-brand-gradient">Sale BĐS</span></>}
              sub="Không phải chatbot chung chung — AI được fine-tune trên dữ liệu hành vi khách BĐS Việt Nam."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
              {items.map((it) => (
                <div key={it.t} className="rounded-xl border border-border p-4 hover:border-primary/40 transition">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white mb-2.5">
                    <it.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-[13.5px] font-semibold">{it.t}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{it.d}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-br from-primary/20 via-indigo-500/10 to-transparent blur-3xl rounded-full" />
            <div className="relative rounded-3xl bg-card border border-border shadow-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-xl bg-brand-gradient grid place-items-center"><Brain className="h-4.5 w-4.5 text-white" /></div>
                <div>
                  <div className="text-[13.5px] font-bold">AI Sales Assistant</div>
                  <div className="text-[10.5px] text-emerald-600 font-semibold flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Online · Phân tích 248 lead</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl bg-muted/40 p-3 text-[12px]">
                  <div className="font-semibold mb-1">🔥 3 lead nóng cần hành động ngay:</div>
                  {["Trần Minh Đức · 92 điểm · Xem profile lần 3", "Nguyễn Hải Yến · 88 điểm · Lưu liên hệ", "Bùi Thị Ngọc · 85 điểm · Click brochure"].map((l) => (
                    <div key={l} className="flex items-center gap-2 py-1.5">
                      <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-muted-foreground">{l}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary-soft p-3">
                  <div className="text-[11px] font-bold text-primary mb-1">AI ĐỀ XUẤT</div>
                  <div className="text-[12.5px] font-semibold">Tạo chiến dịch follow-up cho 12 lead 'warm' với template Vinhomes Ocean Park 2</div>
                  <button className="mt-2.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11.5px] font-semibold inline-flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Chạy ngay
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[{ l: "Conversion +", v: "62%" }, { l: "Time saved", v: "4.2h/d" }, { l: "Auto reply", v: "98%" }].map((k) => (
                    <div key={k.l} className="rounded-lg border border-border py-2">
                      <div className="text-[14px] font-bold text-primary">{k.v}</div>
                      <div className="text-[9.5px] text-muted-foreground">{k.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ MOBILE EXPERIENCE ============================ */
function MobileExperience() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30 border-y border-border">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative h-[520px] order-2 lg:order-1">
            <div className="absolute -inset-10 bg-gradient-to-br from-primary/15 to-blue-500/10 blur-3xl rounded-full" />
            {/* Phone 1 */}
            <div className="absolute left-4 top-0 w-[230px] rounded-[36px] bg-slate-900 p-2 shadow-glow ring-1 ring-white/10">
              <div className="rounded-[28px] bg-card overflow-hidden h-[460px]">
                <div className="bg-gradient-to-b from-slate-900 to-slate-700 p-4 text-white relative h-44">
                  <div className="text-[10px] opacity-70">Lock Screen</div>
                  <div className="text-[26px] font-light tracking-tight mt-1">14:32</div>
                  <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/15 backdrop-blur p-3 flex items-center gap-2">
                    <QrCode className="h-7 w-7 text-white" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10.5px] font-semibold">NFC Profile</div>
                      <div className="text-[9.5px] opacity-70 truncate">Tap to share danh thiếp</div>
                    </div>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="rounded-xl border border-border p-2.5">
                    <div className="text-[10.5px] text-muted-foreground">Hôm nay</div>
                    <div className="text-[12px] font-semibold">3 lead mới · 12 lượt xem</div>
                  </div>
                  <div className="rounded-xl bg-brand-gradient text-white p-2.5">
                    <div className="text-[10px] opacity-80">AI nhắc</div>
                    <div className="text-[11px] font-semibold">Gọi anh Đức trước 17:00</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Phone 2 — wallet */}
            <div className="absolute right-4 bottom-0 w-[230px] rounded-[36px] bg-slate-900 p-2 shadow-glow ring-1 ring-white/10 rotate-3">
              <div className="rounded-[28px] bg-slate-100 overflow-hidden h-[460px]">
                <div className="p-3 text-center text-[11px] text-slate-500 font-semibold">Wallet</div>
                <div className="px-3 space-y-2">
                  <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 p-3.5 text-white">
                    <div className="flex items-center justify-between">
                      <Radio className="h-4 w-4 opacity-80" />
                      <span className="text-[9px] opacity-70">NFC Card</span>
                    </div>
                    <div className="mt-8 text-[12.5px] font-bold">Nguyễn Văn A</div>
                    <div className="text-[10px] opacity-70">Senior Sales · BĐS</div>
                    <div className="mt-3 h-10 w-10 rounded bg-white grid place-items-center">
                      <QrCode className="h-7 w-7 text-slate-900" />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-soft">
                    <div className="text-[10px] text-slate-500">Apple Wallet</div>
                    <div className="text-[11.5px] font-semibold text-slate-900">Đã thêm vào ví</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              align="left"
              eyebrow="Mobile-first"
              title={<>Mobile-first <span className="text-brand-gradient">Sales Platform</span></>}
              sub="Chia sẻ danh thiếp, theo dõi lead, gọi khách — tất cả từ một chiếc điện thoại."
            />
            <ul className="mt-8 space-y-4">
              {[
                { i: IdCard, t: "Mobile Business Card", d: "Profile đẹp như app, chia sẻ 1 chạm." },
                { i: Wallet, t: "Wallet Card", d: "Apple/Google Wallet — luôn sẵn trong ví." },
                { i: Phone, t: "Lock Screen QR", d: "Khách quét ngay từ màn khoá điện thoại." },
                { i: Send, t: "One-tap Share", d: "AirDrop, Zalo, SMS — gửi tức thì." },
                { i: BarChart3, t: "Mobile CRM & Analytics", d: "Theo dõi lead & doanh số mọi nơi." },
              ].map((it) => (
                <li key={it.t} className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-card border border-border grid place-items-center text-primary shrink-0">
                    <it.i className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">{it.t}</div>
                    <div className="text-[12.5px] text-muted-foreground">{it.d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ ENTERPRISE BENEFITS ============================ */
function Benefits() {
  const segs = [
    { i: Users2, t: "Sale cá nhân", d: "Công cụ chuyên nghiệp, AI hỗ trợ 24/7.", k: "+3.2x lead" },
    { i: Building2, t: "Đại lý BĐS", d: "Quản lý team, ranking, KPI minh bạch.", k: "+62% conversion" },
    { i: Crown, t: "Chủ đầu tư", d: "Phân phối đa kênh, đo lường ROI từng dự án.", k: "+45% ROI" },
    { i: ShieldCheck, t: "Enterprise", d: "SSO, audit, white-label, SLA cấp DN.", k: "99.9% uptime" },
  ];
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <SectionHeading
          eyebrow="Enterprise Benefits"
          title={<>Giá trị cho <span className="text-brand-gradient">mọi quy mô</span></>}
          sub="Từ một sale cá nhân đến đội ngũ 1,000+ người — nền tảng scale theo tăng trưởng của bạn."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {segs.map((s) => (
            <div key={s.t} className="rounded-2xl bg-card border border-border p-5 hover:shadow-card transition">
              <div className="h-11 w-11 rounded-xl bg-primary-soft text-primary grid place-items-center mb-3"><s.i className="h-5 w-5" /></div>
              <div className="text-[15px] font-semibold">{s.t}</div>
              <div className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">{s.d}</div>
              <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" /> {s.k}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ TESTIMONIALS ============================ */
function Testimonials() {
  const tests = [
    { n: "Anh Hoàng Long", r: "Sales Director · Vinhomes", q: "Sau 3 tháng dùng SaleBDS OS, đội tôi tăng 312% lead chất lượng và rút ngắn 60% thời gian follow-up." },
    { n: "Chị Mai Phương", r: "CEO · ABC Real Estate", q: "AI Lead Score giúp tôi biết chính xác khách nào nên gọi trước. Tỷ lệ chốt deal tăng gấp đôi." },
    { n: "Anh Tuấn Anh", r: "Manager · Masteri Group", q: "Wallet Card và NFC khiến đội ngũ trông cực kỳ chuyên nghiệp. Khách nhớ chúng tôi ngay từ lần gặp đầu." },
  ];
  return (
    <section className="py-20 lg:py-28 bg-muted/30 border-y border-border">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <SectionHeading
          eyebrow="Khách hàng nói gì"
          title={<>Được tin dùng bởi <span className="text-brand-gradient">các đội Sales hàng đầu</span></>}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          {tests.map((t) => (
            <div key={t.n} className="rounded-2xl bg-card border border-border p-6 hover:shadow-card transition">
              <div className="flex items-center gap-1 text-amber-500 mb-3">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
              </div>
              <p className="text-[13.5px] leading-relaxed">"{t.q}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white font-bold">{t.n.split(" ").pop()![0]}</div>
                <div>
                  <div className="text-[13px] font-semibold">{t.n}</div>
                  <div className="text-[11px] text-muted-foreground">{t.r}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ PRICING ============================ */
function Pricing() {
  const plans = [
    { name: "Starter", price: "0", desc: "Cho sale mới bắt đầu", feats: ["1 NFC card", "Profile cơ bản", "Dynamic QR", "100 lead/tháng"], cta: "Dùng miễn phí" },
    { name: "Professional", price: "299k", desc: "Cho sale chuyên nghiệp", feats: ["Tất cả Starter", "Wallet Card", "AI Follow-up cơ bản", "CRM cá nhân", "Analytics chi tiết"], cta: "Bắt đầu", pop: true },
    { name: "Business", price: "1.490k", desc: "Cho team 10–50 người", feats: ["Tất cả Pro", "Team Management", "AI Lead Score", "AI Sales Page", "Phân quyền nâng cao"], cta: "Dùng thử 14 ngày" },
    { name: "Enterprise", price: "Liên hệ", desc: "Cho doanh nghiệp lớn", feats: ["Tất cả Business", "SSO & Audit log", "White-label", "SLA 99.9%", "CSM riêng"], cta: "Đặt demo" },
  ];
  return (
    <section id="pricing" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <SectionHeading
          eyebrow="Bảng giá"
          title={<>Phù hợp với <span className="text-brand-gradient">mọi giai đoạn</span> tăng trưởng</>}
          sub="Dùng thử miễn phí 14 ngày trên gói Business. Không cần thẻ tín dụng."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {plans.map((p) => (
            <div key={p.name} className={["relative rounded-2xl p-6 border transition",
              p.pop ? "bg-foreground text-background border-foreground shadow-card scale-[1.02]" : "bg-card border-border hover:shadow-soft"].join(" ")}>
              {p.pop && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-gradient text-white text-[10.5px] font-bold tracking-wider">PHỔ BIẾN</div>}
              <div className="text-[14px] font-semibold opacity-80">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <div className="text-[32px] font-bold tracking-tight">{p.price}</div>
                {p.price !== "Liên hệ" && <div className={["text-[12px]", p.pop ? "opacity-70" : "text-muted-foreground"].join(" ")}>/tháng</div>}
              </div>
              <div className={["text-[12px] mt-1", p.pop ? "opacity-70" : "text-muted-foreground"].join(" ")}>{p.desc}</div>
              <button className={["mt-5 w-full h-10 rounded-xl text-[13px] font-semibold transition",
                p.pop ? "bg-background text-foreground hover:opacity-90" : "bg-primary text-primary-foreground hover:opacity-90"].join(" ")}>
                {p.cta}
              </button>
              <ul className="mt-5 space-y-2.5">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px]">
                    <Check className={["h-4 w-4 mt-0.5 shrink-0", p.pop ? "text-emerald-400" : "text-primary"].join(" ")} />
                    <span className={p.pop ? "opacity-90" : ""}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ FAQ ============================ */
function Faq() {
  return (
    <section id="faq" className="py-20 lg:py-28 bg-muted/30 border-y border-border">
      <div className="max-w-3xl mx-auto px-5 lg:px-8">
        <SectionHeading eyebrow="Câu hỏi thường gặp" title={<>Mọi điều bạn cần biết</>} />
        <div
          className="mt-10 space-y-2"
          itemScope
          itemType="https://schema.org/FAQPage"
        >
          {FAQ_ITEMS.map((it, i) => (
            <details
              key={i}
              open={i === 0}
              className="group rounded-xl bg-card border border-border overflow-hidden [&_summary::-webkit-details-marker]:hidden"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                <h3 className="text-[14px] font-semibold m-0" itemProp="name">{it.q}</h3>
                <Plus className="h-4 w-4 text-muted-foreground transition-transform group-open:hidden" />
                <Minus className="h-4 w-4 text-primary hidden group-open:block" />
              </summary>
              <div
                className="px-4 pb-4 text-[13px] text-muted-foreground leading-relaxed"
                itemScope
                itemProp="acceptedAnswer"
                itemType="https://schema.org/Answer"
              >
                <div itemProp="text">{it.a}</div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================ CTA ============================ */
function CtaFooter() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-10 lg:p-16 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11.5px] font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Bắt đầu ngay hôm nay
              </div>
              <h2 className="mt-4 text-[32px] lg:text-[44px] font-bold tracking-tight leading-tight">
                Bắt đầu tăng trưởng đội Sales <br /><span className="text-brand-gradient">của bạn ngay hôm nay</span>
              </h2>
              <p className="mt-4 text-white/70 text-[14.5px] max-w-xl">Dùng thử miễn phí 14 ngày. Không cần thẻ. Hỗ trợ onboarding 1-1.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <DemoDialog>
                  <button type="button" className="h-12 px-5 rounded-xl bg-white text-slate-900 text-[13.5px] font-semibold inline-flex items-center gap-2">
                    <Play className="h-4 w-4" /> Xem demo
                  </button>
                </DemoDialog>
                <BookingDialog>
                  <button type="button" className="h-12 px-5 rounded-xl bg-brand-gradient text-white text-[13.5px] font-semibold inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Đặt lịch tư vấn
                  </button>
                </BookingDialog>
                <a href="#pricing" className="h-12 px-5 rounded-xl border border-white/20 text-white text-[13.5px] font-semibold inline-flex items-center gap-2 hover:bg-white/10 transition">
                  Dùng thử miễn phí
                </a>
              </div>
            </div>
            <div className="relative grid place-items-center">
              <div className="rounded-2xl bg-white p-5 shadow-glow">
                <div className="h-44 w-44 rounded-xl bg-slate-900 grid place-items-center">
                  <QrCode className="h-32 w-32 text-white" />
                </div>
                <div className="text-center text-[11px] text-slate-500 font-semibold mt-3">Quét để mở demo</div>
              </div>
              <div className="absolute -bottom-4 -right-2 w-44 aspect-[1.6/1] rounded-xl bg-gradient-to-br from-slate-900 to-indigo-900 ring-1 ring-white/20 p-3 rotate-6">
                <Radio className="h-4 w-4 text-white/80" />
                <div className="mt-7 text-[11px] font-bold text-white">Nguyễn Văn A</div>
                <div className="text-[9px] text-white/60">Senior Sales · BĐS</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ FOOTER ============================ */
function Footer() {
  const cols = [
    { t: "Sản phẩm", l: ["Digital Card", "Dynamic QR", "Wallet Card", "AI Follow-up", "CRM"] },
    { t: "Tính năng", l: ["AI Lead Score", "Analytics", "Team Management", "AI Sales Page", "Mobile App"] },
    { t: "Tài nguyên", l: ["Blog", "Case studies", "Tài liệu", "API docs", "Trạng thái"] },
    { t: "Công ty", l: ["Về chúng tôi", "Tuyển dụng", "Liên hệ", "Đối tác", "Báo chí"] },
  ];
  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-8">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-brand-gradient grid place-items-center"><Radio className="h-4.5 w-4.5 text-white" /></div>
              <div>
                <div className="text-[15px] font-bold tracking-tight">SaleBDS OS</div>
                <div className="text-[10.5px] text-muted-foreground">Điều hành kinh doanh bằng điểm chạm</div>
              </div>
            </Link>
            <p className="mt-4 text-[12.5px] text-muted-foreground max-w-xs leading-relaxed">
              Nền tảng tăng trưởng cho Sale Bất động sản — NFC + AI + CRM trong một sản phẩm.
            </p>
            <div className="mt-4 flex gap-2">
              {[Phone, Mail, Globe2, Send].map((I, i) => (
                <a key={i} href="#" className="h-9 w-9 rounded-lg border border-border grid place-items-center text-muted-foreground hover:text-primary hover:border-primary transition">
                  <I className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.t}>
              <div className="text-[12.5px] font-bold mb-3">{c.t}</div>
              <ul className="space-y-2">
                {c.l.map((x) => (
                  <li key={x}><a href="#" className="text-[12.5px] text-muted-foreground hover:text-foreground transition">{x}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-muted-foreground">
          <div>© 2026 SaleBDS OS. All rights reserved.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground">Điều khoản</a>
            <a href="#" className="hover:text-foreground">Bảo mật</a>
            <a href="#" className="hover:text-foreground">Cookie</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================ HELPERS ============================ */
function SectionHeading({
  eyebrow, title, sub, align = "center",
}: { eyebrow?: string; title: React.ReactNode; sub?: string; align?: "center" | "left" }) {
  const a = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={["max-w-2xl", a].join(" ")}>
      {eyebrow && (
        <div className={["inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary text-[11.5px] font-bold uppercase tracking-wider", align === "center" ? "" : ""].join(" ")}>
          {eyebrow}
        </div>
      )}
      <h2 className="mt-3 text-[28px] sm:text-[36px] lg:text-[44px] font-bold tracking-tight leading-[1.1]">{title}</h2>
      {sub && <p className="mt-3 text-[14.5px] text-muted-foreground leading-relaxed">{sub}</p>}
    </div>
  );
}

/* ============================ DESIGN GALLERY ============================ */
function DesignGallery() {
  return (
    <section id="designs" className="py-24 lg:py-32 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <SectionHeading
          eyebrow="Thư viện thiết kế"
          title={<>Mẫu danh thiếp NFC & nền tảng <span className="text-primary">cho Sale BĐS</span></>}
          sub="Hơn 30+ mẫu danh thiếp NFC + QR thiết kế sẵn theo ngành Bất động sản. Tuỳ biến nhanh trong vài phút, đồng bộ với toàn bộ nền tảng Sales Growth."
        />

        <DesignCarousel />

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/customize"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-foreground text-background text-[13px] font-semibold hover:opacity-90 transition shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Tuỳ biến mẫu của bạn
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-[12.5px] text-muted-foreground">
            Đổi màu thương hiệu, logo, nội dung — xem live preview
          </span>
        </div>

        <div className="mt-14">
          <figure className="group relative rounded-3xl overflow-hidden border border-border/60 bg-card shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] hover:shadow-[0_40px_100px_-30px_rgba(79,70,229,0.35)] transition-all duration-500">
            <div className="absolute top-5 left-5 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur border border-border text-[11.5px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Sales Growth Platform · Tổng quan
            </div>
            <img
              src={nfcPlatformOverview}
              alt="Sales Growth Platform cho Real Estate – tổng quan tính năng"
              loading="lazy"
              className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.01]"
            />
            <figcaption className="px-6 py-5 border-t border-border/60 bg-muted/30 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[15px] font-semibold">Một nền tảng – tất cả entry point</div>
                <div className="text-[12.5px] text-muted-foreground">NFC · Dynamic QR · Wallet · Mobile App · Lock Screen · AirDrop · AI Sales Page</div>
              </div>
              <a
                href="#pricing"
                className="h-9 px-4 rounded-lg border border-border text-[12.5px] font-semibold hover:bg-muted transition inline-flex items-center"
              >
                Xem bảng giá
              </a>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

/* ============================ PAGE ============================ */
function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      <Nav />
      <Hero />
      <LogoStrip />
      <Problem />
      <MultiEntry />
      <Features />
      <PlatformShowcase />
      <DesignGallery />
      <AiSection />
      <MobileExperience />
      <Benefits />
      <Testimonials />
      <Pricing />
      <Faq />
      <CtaFooter />
      <Footer />
      <LandingChatbot />
    </div>
  );
}
