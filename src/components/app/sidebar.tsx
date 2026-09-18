import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, IdCard, Users2, UserSquare2, Building2, GitBranch, CalendarClock,
  Sparkles, Gauge, BarChart3, Megaphone, ShieldCheck, Package, FolderArchive,
  Wallet, QrCode, Globe2, Radio, Settings, ChevronDown, Crown, Send, Zap, LogOut, Check,
  PanelLeftClose, PanelLeftOpen, X, BookMarked, Activity, Route as RouteIcon, ContactRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, type Role } from "@/hooks/use-auth";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { useMobileDrawer } from "@/hooks/use-mobile-drawer";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Item = { to: string; label: string; icon: any; badge?: string; roles?: Role[]; platformOnly?: boolean };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: "Tổng quan",
    items: [
      { to: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
      { to: "/sale-overview", label: "Tổng quan Sale", icon: ContactRound },
      { to: "/digital-card", label: "Danh thiếp", icon: IdCard },
      { to: "/profile", label: "Profile", icon: UserSquare2 },
      { to: "/digital-card/edit", label: "Sửa danh thiếp", icon: Settings },
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
      { to: "/ai-lead-score", label: "AI Lead Score", icon: Gauge, roles: ["owner", "admin", "manager"] },
      { to: "/ai-sales-page", label: "AI Sales Page", icon: Globe2, roles: ["owner", "admin", "manager"] },
      { to: "/landings", label: "Landing công khai", icon: Globe2, roles: ["owner", "admin", "manager", "agent"] },
      { to: "/content-library", label: "Kho nội dung", icon: BookMarked, roles: ["owner", "admin", "manager", "agent"] },
      { to: "/prompt-library", label: "Thư viện prompt", icon: BookMarked, roles: ["owner", "admin", "manager", "agent"] },
      { to: "/marketing", label: "Marketing & Campaign", icon: Megaphone, roles: ["owner", "admin", "manager"] },
      { to: "/analytics", label: "Báo cáo & Analytics", icon: BarChart3, roles: ["owner", "admin", "manager"] },
      { to: "/journey", label: "Hành trình khách hàng", icon: RouteIcon, roles: ["owner", "admin", "manager", "agent"] },
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
      { to: "/members", label: "Thành viên & Vai trò", icon: ShieldCheck, roles: ["owner", "admin"] },
      { to: "/sales-directory", label: "Quản lý Sale", icon: IdCard, roles: ["owner", "admin", "manager"] },
      { to: "/team", label: "Team Management", icon: Users2, roles: ["owner", "admin", "manager"] },
      { to: "/products", label: "Sản phẩm", icon: Package },
      { to: "/files", label: "Tài liệu & Brochure", icon: FolderArchive },
      { to: "/settings", label: "Cài đặt", icon: Settings, roles: ["owner", "admin"] },
      { to: "/auth-settings", label: "Bảo mật xác thực", icon: ShieldCheck, platformOnly: true },
    ],
  },
];

/** PWA trên điện thoại: chỉ giữ công cụ Sale phụ và khu quản trị theo quyền. */
const saleMobileGroups: Group[] = [
  {
    label: "Sale",
    items: [
      { to: "/landings", label: "Landing công khai", icon: Globe2 },
      { to: "/journey", label: "Hành trình khách hàng", icon: RouteIcon },
      { to: "/content-library", label: "Kho nội dung", icon: BookMarked },
      { to: "/airdrop", label: "Chia sẻ danh thiếp", icon: Send },
    ],
  },
  {
    label: "Quản trị",
    items: [
      { to: "/sales-directory", label: "Quản lý Sale", icon: IdCard, roles: ["owner", "admin", "manager"] },
      { to: "/members", label: "Thành viên & vai trò", icon: ShieldCheck, roles: ["owner", "admin"] },
      { to: "/analytics", label: "Báo cáo", icon: BarChart3, roles: ["owner", "admin", "manager"] },
      { to: "/settings", label: "Cài đặt", icon: Settings, roles: ["owner", "admin"] },
    ],
  },
];

const roleLabel: Record<Role, string> = {
  platform_admin: "Platform Admin",
  owner: "Agency Owner",
  admin: "Agency Admin",
  manager: "Sales Manager",
  agent: "Sales Agent",
  viewer: "Viewer",
};

function initials(s: string) {
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/**
 * Shared content for both desktop aside and mobile drawer.
 * - `collapsed`: desktop icon-only mode (mobile always renders expanded).
 * - `onNavigate`: called when a nav link is tapped (used to close mobile drawer).
 * - `variant`: 'desktop' shows the collapse toggle; 'mobile' shows a close button.
 */
function SidebarBody({
  collapsed,
  onNavigate,
  variant,
  onCollapseToggle,
  onClose,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  variant: "desktop" | "mobile";
  onCollapseToggle?: () => void;
  onClose?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { tenants, currentTenant, currentRole, switchTenant, signOut, user, isPlatformAdmin } = useAuth();
  const [wsOpen, setWsOpen] = useState(false);

  const can = (item: Item) => {
    if (item.platformOnly) return isPlatformAdmin;
    if (!item.roles) return true;
    if (isPlatformAdmin) return true;
    return currentRole !== null && currentRole !== "viewer" && (item.roles as string[]).includes(currentRole);
  };

  // Mobile: bigger tap targets, always expanded, no tooltip wrapping.
  const isMobile = variant === "mobile";
  const showLabels = isMobile || !collapsed;

  return (
    <TooltipProvider delayDuration={100}>
      {/* Header */}
      <div className={["pt-5 pb-4 flex items-center", showLabels ? "px-5 justify-between" : "px-3 justify-center"].join(" ")}>
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 min-w-0"
        >
          <div className="h-9 w-9 rounded-xl bg-brand-gradient grid place-items-center shadow-glow shrink-0">
            <Radio className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className={[
            "leading-tight min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            showLabels ? "opacity-100 max-w-[180px] translate-x-0" : "opacity-0 max-w-0 -translate-x-2",
          ].join(" ")}>
            <div className="text-[15px] font-bold text-sidebar-foreground truncate">SaleBDS OS</div>
            <div className="text-[11px] text-sidebar-foreground/60 truncate">Điều hành kinh doanh bằng điểm chạm</div>
          </div>
        </Link>

        {variant === "desktop" && (
          <button
            onClick={onCollapseToggle}
            className={[
              "rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              collapsed ? "opacity-0 scale-90 pointer-events-none w-0 p-0 overflow-hidden" : "opacity-100 scale-100 p-1.5",
            ].join(" ")}
            aria-label="Thu gọn menu"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
        {variant === "mobile" && (
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl hover:bg-sidebar-accent active:scale-95 text-sidebar-foreground/80 hover:text-sidebar-foreground transition"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Expand button when desktop collapsed */}
      {variant === "desktop" && (
        <div className={[
          "px-3 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
          collapsed ? "opacity-100 max-h-16 pb-2" : "opacity-0 max-h-0 pb-0",
        ].join(" ")}>
          <button
            onClick={onCollapseToggle}
            className="w-full grid place-items-center h-9 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition"
            aria-label="Mở rộng menu"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Workspace switcher */}
      <DropdownMenu open={wsOpen} onOpenChange={setWsOpen}>
        <DropdownMenuTrigger asChild>
          <button className={[
            "mx-3 mb-3 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition flex items-center text-left",
            showLabels ? (isMobile ? "px-3 py-3 gap-2.5" : "px-3 py-2.5 gap-2.5") : "p-2 justify-center",
          ].join(" ")}>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-primary-foreground text-[11px] font-bold shrink-0">
              {currentTenant ? initials(currentTenant.name) : "—"}
            </div>
            <div className={[
              "flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              showLabels ? "opacity-100 max-w-[180px] translate-x-0" : "opacity-0 max-w-0 -translate-x-2",
            ].join(" ")}>
              <div className="text-[13px] font-semibold text-sidebar-foreground truncate">
                {currentTenant?.name ?? (isPlatformAdmin ? "Platform Admin" : "Chưa có workspace")}
              </div>
              <div className="text-[10.5px] text-sidebar-foreground/60">
                {currentRole ? roleLabel[currentRole] : "—"}
              </div>
            </div>
            <div className={[
              "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
              showLabels ? "opacity-100 max-w-4" : "opacity-0 max-w-0",
            ].join(" ")}>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {tenants.map((t) => (
            <DropdownMenuItem key={t.id} onClick={() => switchTenant(t.id)} className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-muted grid place-items-center text-[10px] font-bold">
                {initials(t.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.name}</div>
                <div className="text-[10px] text-muted-foreground">{roleLabel[t.role]}</div>
              </div>
              {currentTenant?.id === t.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/onboarding" onClick={onNavigate}>+ Tạo agency mới</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" /> Đăng xuất {user?.email ? `(${user.email})` : ""}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
        {(isMobile ? saleMobileGroups : groups).map((g) => {
          const items = g.items.filter(can);
          if (items.length === 0) return null;
          return (
            <div key={g.label} className="mb-3">
              <div className={[
                "px-3 pt-2 pb-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-sidebar-foreground/45 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                showLabels ? "opacity-100 max-h-8" : "opacity-0 max-h-0 py-0",
              ].join(" ")}>{g.label}</div>
              <div className={[
                "border-t border-sidebar-border/60 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                showLabels ? "opacity-0 max-h-0 my-0 mx-3" : "opacity-100 my-2 mx-3",
              ].join(" ")} />
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active = pathname.startsWith(it.to);
                  const iconOnly = variant === "desktop" && collapsed;
                  const link = (
                    <Link
                      to={it.to}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "group relative flex items-center rounded-lg text-[13px] font-medium transition active:scale-[0.98]",
                        showLabels
                          ? (isMobile ? "gap-3 px-3 py-3 min-h-11" : "gap-2.5 px-3 py-2")
                          : "justify-center p-2.5",
                        active
                          ? (iconOnly
                              ? "bg-sidebar-accent text-sidebar-foreground ring-1 ring-primary/50 shadow-[0_0_0_1px_oklch(0.62_0.18_285/0.25),0_6px_18px_-6px_oklch(0.62_0.18_285/0.55)]"
                              : "bg-sidebar-accent text-sidebar-foreground")
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 active:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                      ].join(" ")}
                    >
                      {/* Active indicator bar — visible in both expanded and icon-only modes */}
                      {active && (
                        <span
                          aria-hidden
                          className={[
                            "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-primary",
                            iconOnly ? "h-6" : "h-5",
                          ].join(" ")}
                        />
                      )}
                      <it.icon className={["h-4 w-4 shrink-0 transition-transform duration-300", active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground", showLabels ? "scale-100" : "scale-110"].join(" ")} />
                      <span className={[
                        "flex-1 truncate transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
                        showLabels ? "opacity-100 max-w-[180px] translate-x-0" : "opacity-0 max-w-0 -translate-x-2",
                        isMobile ? "text-[14px]" : "",
                      ].join(" ")}>{it.label}</span>
                      {/* Active dot when icon-only (in place of hidden badge) */}
                      {iconOnly && active && (
                        <span aria-hidden className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_oklch(0.62_0.18_285)]" />
                      )}
                      {it.badge && (
                        <span className={[
                          "text-[10px] px-1.5 py-0.5 rounded-md font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
                          it.badge === "AI"
                            ? "bg-brand-gradient text-primary-foreground"
                            : "bg-sidebar-accent text-sidebar-foreground/80",
                          showLabels ? "opacity-100 max-w-12 scale-100" : "opacity-0 max-w-0 scale-75",
                        ].join(" ")}>{it.badge}</span>
                      )}
                    </Link>
                  );
                  return (
                    <li key={it.to}>
                      {variant === "desktop" && collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right" className="flex items-center gap-2">
                            {it.label}
                            {it.badge && <span className="text-[10px] opacity-70">{it.badge}</span>}
                          </TooltipContent>
                        </Tooltip>
                      ) : link}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className={[
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
        showLabels ? "opacity-100 max-h-[240px] p-3" : "opacity-0 max-h-0 p-0",
      ].join(" ")}
      style={isMobile ? { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" } : undefined}
      >
        <div className="rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/10 border border-primary/20 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="h-4 w-4 text-accent" />
            <div className="text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/90">
              {currentTenant?.plan ?? "Free"}
            </div>
          </div>
          <p className="text-[11.5px] text-sidebar-foreground/70 leading-relaxed">
            Mở khoá AI Follow-up không giới hạn & báo cáo nâng cao.
          </p>
          <button className={[
            "mt-2.5 w-full rounded-lg bg-foreground text-background text-[12px] font-semibold hover:bg-foreground/90 active:scale-[0.98] transition",
            isMobile ? "py-2.5" : "py-1.5",
          ].join(" ")}>
            Nâng cấp ngay
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function AppSidebar() {
  const { collapsed, toggle } = useSidebarCollapsed();
  const { open, setOpen, close } = useMobileDrawer();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Auto-close mobile drawer whenever the route changes.
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Prevent body scroll when mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={[
        "hidden lg:flex shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width]",
        collapsed ? "w-[72px]" : "w-[260px]",
      ].join(" ")}>
        <SidebarBody variant="desktop" collapsed={collapsed} onCollapseToggle={toggle} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={[
          "lg:hidden fixed inset-0 z-50 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={close}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        {/* Panel */}
        <aside
          role="dialog"
          aria-modal="true"
          className={[
            "absolute inset-y-0 left-0 flex flex-col w-[86%] max-w-[320px] bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-2xl",
            "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform",
            open ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <SidebarBody
            variant="mobile"
            collapsed={false}
            onNavigate={() => setOpen(false)}
            onClose={close}
          />
        </aside>
      </div>
    </>
  );
}
