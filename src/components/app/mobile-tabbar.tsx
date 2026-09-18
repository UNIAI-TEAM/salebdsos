import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { IdCard, QrCode, Building2, Users, LayoutDashboard } from "lucide-react";

type Tab = { to: string; label: string; icon: any };

// Chế độ Sale trên điện thoại: chỉ 4 việc chính, nút giữa để đưa khách quét ngay.
const tabs: Tab[] = [
  { to: "/digital-card", label: "Danh thiếp", icon: IdCard },
  { to: "/sale-projects", label: "Dự án", icon: Building2 },
  { to: "/sale-customers", label: "Khách", icon: Users },
  { to: "/sale-overview", label: "Tổng quan", icon: LayoutDashboard },
];

export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="relative grid grid-cols-5 items-end px-1">
        {tabs.slice(0, 2).map((t) => (
          <TabLink key={t.to} tab={t} active={pathname.startsWith(t.to)} />
        ))}

        <div className="flex flex-col items-center">
          <button
            type="button"
            aria-label="Đưa khách quét danh thiếp"
            onClick={() => nav({ to: "/digital-card" })}
            className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform duration-200 active:scale-95"
          >
            <QrCode className="h-6 w-6" />
          </button>
          <span className="pb-2.5 pt-1 text-[10px] font-medium leading-none text-muted-foreground">
            Đưa khách quét
          </span>
        </div>

        {tabs.slice(2).map((t) => (
          <TabLink key={t.to} tab={t} active={pathname.startsWith(t.to)} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      to={tab.to}
      className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <span
        className={`grid h-8 w-12 place-items-center rounded-xl transition-colors ${
          active ? "bg-primary/10" : ""
        }`}
      >
        <tab.icon className="h-5 w-5" />
      </span>
      <span className="leading-none">{tab.label}</span>
    </Link>
  );
}
