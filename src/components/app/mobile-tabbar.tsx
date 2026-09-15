import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { IdCard, Plus, Send, QrCode, X, Globe2, Activity, Building2 } from "lucide-react";
import { useEffect, useState } from "react";

type Tab = { to: string; label: string; icon: any };

// Chế độ Sale trên điện thoại: landing công khai, dự án, danh thiếp và timeline.
const tabs: Tab[] = [
  { to: "/landings", label: "Landing", icon: Globe2 },
  { to: "/sale-projects", label: "Dự án", icon: Building2 },
  { to: "/digital-card", label: "Danh thiếp", icon: IdCard },
  { to: "/timeline", label: "Timeline", icon: Activity },
];

const quickActions: Tab[] = [
  { to: "/sale-projects", label: "Dự án của tôi", icon: Building2 },
  { to: "/landings", label: "Landing công khai", icon: Globe2 },
  { to: "/digital-card", label: "Danh thiếp của tôi", icon: IdCard },
  { to: "/airdrop", label: "Chia sẻ AirDrop", icon: Send },
  { to: "/nfc-codes", label: "NFC & QR", icon: QrCode },
];

export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Quick action sheet */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
        <div
          className={`absolute left-0 right-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mx-3 rounded-2xl border border-border bg-card/95 p-2 shadow-2xl transition-all duration-200 ${
            open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tác vụ nhanh
            </span>
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {quickActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  nav({ to: a.to });
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent active:scale-[0.99]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <a.icon className="h-4.5 w-4.5" />
                </span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav
        aria-label="Điều hướng chính"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      >
        <div className="relative grid grid-cols-5 items-end px-1">
          {tabs.slice(0, 2).map((t) => (
            <TabLink key={t.to} tab={t} active={pathname.startsWith(t.to)} />
          ))}

          <div className="flex justify-center">
            <button
              type="button"
              aria-label="Tác vụ nhanh"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform duration-200 active:scale-95"
            >
              <Plus className={`h-6 w-6 transition-transform duration-200 ${open ? "rotate-45" : ""}`} />
            </button>
          </div>

          {tabs.slice(2).map((t) => (
            <TabLink key={t.to} tab={t} active={pathname.startsWith(t.to)} />
          ))}
          <span aria-hidden />
        </div>
      </nav>
    </>
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
