import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, IdCard, Users2, UserSquare2, Building2, GitBranch, CalendarClock,
  Sparkles, Gauge, BarChart3, Megaphone, ShieldCheck, Package, FolderArchive,
  Wallet, QrCode, Globe2, Radio, Settings, ChevronDown, Crown, Send, Zap, LogOut, Check,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import { useAuth, type Role } from "@/hooks/use-auth";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Item = { to: string; label: string; icon: any; badge?: string; roles?: Role[]; platformOnly?: boolean };
type Group = { label: string; items: Item[] };

// roles undefined => all members can see; platform_admin always sees everything
const groups: Group[] = [
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
      { to: "/ai-lead-score", label: "AI Lead Score", icon: Gauge, roles: ["owner", "admin", "manager"] },
      { to: "/ai-sales-page", label: "AI Sales Page", icon: Globe2, roles: ["owner", "admin", "manager"] },
      { to: "/marketing", label: "Marketing & Campaign", icon: Megaphone, roles: ["owner", "admin", "manager"] },
      { to: "/analytics", label: "Báo cáo & Analytics", icon: BarChart3, roles: ["owner", "admin", "manager"] },
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
      { to: "/team", label: "Team Management", icon: Users2, roles: ["owner", "admin", "manager"] },
      { to: "/products", label: "Sản phẩm", icon: Package },
      { to: "/files", label: "Tài liệu & Brochure", icon: FolderArchive },
      { to: "/settings", label: "Cài đặt", icon: Settings, roles: ["owner", "admin"] },
      { to: "/auth-settings", label: "Bảo mật xác thực", icon: ShieldCheck, platformOnly: true },
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

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { tenants, currentTenant, currentRole, switchTenant, signOut, user, isPlatformAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();

  const can = (item: Item) => {
    if (item.platformOnly) return isPlatformAdmin;
    if (!item.roles) return true;
    if (isPlatformAdmin) return true;
    return currentRole !== null && currentRole !== "viewer" && (item.roles as string[]).includes(currentRole);
  };

  return (
    <TooltipProvider delayDuration={100}>
    <aside className={[
      "hidden lg:flex shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200",
      collapsed ? "w-[72px]" : "w-[260px]",
    ].join(" ")}>
      <div className={["pt-5 pb-4 flex items-center", collapsed ? "px-3 justify-center" : "px-5 justify-between"].join(" ")}>
        <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-brand-gradient grid place-items-center shadow-glow shrink-0">
            <Radio className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="text-[15px] font-bold text-white truncate">SaleBDS OS</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">Điều hành kinh doanh bằng điểm chạm</div>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-white transition"
            aria-label="Thu gọn menu"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={toggle}
            className="w-full grid place-items-center h-9 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-white transition"
            aria-label="Mở rộng menu"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Workspace switcher */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button className={[
            "mx-3 mb-3 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent transition flex items-center text-left",
            collapsed ? "p-2 justify-center" : "px-3 py-2.5 gap-2.5",
          ].join(" ")}>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center text-white text-[11px] font-bold shrink-0">
              {currentTenant ? initials(currentTenant.name) : "—"}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white truncate">
                    {currentTenant?.name ?? (isPlatformAdmin ? "Platform Admin" : "Chưa có workspace")}
                  </div>
                  <div className="text-[10.5px] text-sidebar-foreground/60">
                    {currentRole ? roleLabel[currentRole] : "—"}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
              </>
            )}
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
            <Link to="/onboarding">+ Tạo agency mới</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" /> Đăng xuất {user?.email ? `(${user.email})` : ""}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
        {groups.map((g) => {
          const items = g.items.filter(can);
          if (items.length === 0) return null;
          return (
            <div key={g.label} className="mb-3">
              {!collapsed && (
                <div className="px-3 pt-2 pb-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-sidebar-foreground/45">{g.label}</div>
              )}
              {collapsed && <div className="mx-3 my-2 border-t border-sidebar-border/60" />}
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active = pathname.startsWith(it.to);
                  const link = (
                    <Link
                      to={it.to}
                      className={[
                        "group flex items-center rounded-lg text-[13px] font-medium transition",
                        collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2",
                        active
                          ? "bg-sidebar-accent text-white"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                      ].join(" ")}
                    >
                      <it.icon className={["h-4 w-4 shrink-0", active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-white"].join(" ")} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{it.label}</span>
                          {it.badge && (
                            <span className={[
                              "text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                              it.badge === "AI"
                                ? "bg-brand-gradient text-white"
                                : "bg-sidebar-accent text-sidebar-foreground/80",
                            ].join(" ")}>{it.badge}</span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                  return (
                    <li key={it.to}>
                      {collapsed ? (
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

      {!collapsed && (
        <div className="p-3">
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/10 border border-primary/20 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Crown className="h-4 w-4 text-yellow-400" />
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                {currentTenant?.plan ?? "Free"}
              </div>
            </div>
            <p className="text-[11.5px] text-sidebar-foreground/70 leading-relaxed">
              Mở khoá AI Follow-up không giới hạn & báo cáo nâng cao.
            </p>
            <button className="mt-2.5 w-full rounded-lg bg-white text-sidebar text-[12px] font-semibold py-1.5 hover:bg-white/90 transition">
              Nâng cấp ngay
            </button>
          </div>
        </div>
      )}

    </aside>
    </TooltipProvider>
  );
}

