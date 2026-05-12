import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, IdCard, Users2, UserSquare2, Building2, GitBranch, CalendarClock,
  Sparkles, Gauge, BarChart3, Megaphone, ShieldCheck, Package, FolderArchive,
  Wallet, QrCode, Globe2, Radio, Settings, ChevronDown, Crown, Send, Zap,
} from "lucide-react";

const groups: { label: string; items: { to: string; label: string; icon: any; badge?: string }[] }[] = [
  {
    label: "Tổng quan",
    items: [
      { to: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
      { to: "/digital-card", label: "Danh thiếp & Profile", icon: IdCard },
    ],
  },
  {
    label: "Bán hàng",
    items: [
      { to: "/leads", label: "Leads (CRM)", icon: Users2, badge: "24" },
      { to: "/lead-capture", label: "Tự động tạo Lead", icon: Zap, badge: "Auto" },
      { to: "/customers", label: "Khách hàng", icon: UserSquare2 },
      { to: "/projects", label: "Dự án", icon: Building2 },
      { to: "/pipeline", label: "Pipeline", icon: GitBranch },
      { to: "/appointments", label: "Lịch hẹn", icon: CalendarClock },
    ],
  },
  {
    label: "AI & Tăng trưởng",
    items: [
      { to: "/ai-followup", label: "AI Follow-up", icon: Sparkles, badge: "AI" },
      { to: "/ai-lead-score", label: "AI Lead Score", icon: Gauge },
      { to: "/ai-sales-page", label: "AI Sales Page", icon: Globe2 },
      { to: "/marketing", label: "Marketing & Campaign", icon: Megaphone },
      { to: "/analytics", label: "Báo cáo & Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Sharing",
    items: [
      { to: "/airdrop", label: "AirDrop chia sẻ", icon: Send, badge: "Live" },
      { to: "/wallet", label: "Wallet Card", icon: Wallet },
      { to: "/nfc-codes", label: "NFC & QR Codes", icon: QrCode, badge: "New" },
      { to: "/qr-sharing", label: "QR Sharing", icon: QrCode },
      { to: "/dynamic-qr", label: "Dynamic QR", icon: Radio },
    ],
  },
  {
    label: "Quản lý",
    items: [
      { to: "/team", label: "Team Management", icon: ShieldCheck },
      { to: "/products", label: "Sản phẩm", icon: Package },
      { to: "/files", label: "Tài liệu & Brochure", icon: FolderArchive },
      { to: "/settings", label: "Cài đặt", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-brand-gradient grid place-items-center shadow-glow">
            <Radio className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-white">NFC Platform</div>
            <div className="text-[11px] text-sidebar-foreground/60">Sales Growth · BĐS</div>
          </div>
        </Link>
      </div>

      {/* Workspace */}
      <div className="mx-3 mb-3 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition px-3 py-2.5 cursor-pointer flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center text-white text-[11px] font-bold">AB</div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white truncate">ABC Real Estate</div>
          <div className="text-[10.5px] text-sidebar-foreground/60">Pro Business · 24 thành viên</div>
        </div>
        <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <div className="px-3 pt-2 pb-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-sidebar-foreground/45">{g.label}</div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname.startsWith(it.to);
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={[
                        "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition",
                        active
                          ? "bg-sidebar-accent text-white"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                      ].join(" ")}
                    >
                      <it.icon className={["h-4 w-4 shrink-0", active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-white"].join(" ")} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge && (
                        <span className={[
                          "text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                          it.badge === "AI"
                            ? "bg-brand-gradient text-white"
                            : "bg-sidebar-accent text-sidebar-foreground/80",
                        ].join(" ")}>{it.badge}</span>
                      )}
                      {active && <span className="absolute left-0 h-5 w-0.5 bg-primary rounded-r-full" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Upgrade card */}
      <div className="p-3">
        <div className="rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/10 border border-primary/20 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="h-4 w-4 text-yellow-400" />
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/90">Pro Business</div>
          </div>
          <p className="text-[11.5px] text-sidebar-foreground/70 leading-relaxed">
            Mở khoá AI Follow-up không giới hạn & báo cáo nâng cao.
          </p>
          <button className="mt-2.5 w-full rounded-lg bg-white text-sidebar text-[12px] font-semibold py-1.5 hover:bg-white/90 transition">
            Nâng cấp ngay
          </button>
        </div>
      </div>
    </aside>
  );
}
