import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/app/sidebar";
import { AppTopbar } from "@/components/app/topbar";
import { OfflineBanner } from "@/components/app/offline-banner";
import { MobileTabBar } from "@/components/app/mobile-tabbar";
import { useAuth } from "@/hooks/use-auth";
import { SidebarCollapsedProvider } from "@/hooks/use-sidebar-collapsed";
import { MobileDrawerProvider } from "@/hooks/use-mobile-drawer";
import { useSidebarShortcut } from "@/hooks/use-sidebar-shortcut";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { loading, session, tenants, isPlatformAdmin } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      nav({ to: "/login", replace: true });
      return;
    }
    if (tenants.length > 0 || isPlatformAdmin) return;
    // Wait briefly for tenants to load before deciding to redirect to onboarding.
    const t = setTimeout(() => {
      if (tenants.length === 0 && !isPlatformAdmin) {
        nav({ to: "/onboarding", replace: true });
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [loading, session, tenants.length, isPlatformAdmin, nav]);

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  return (
    <SidebarCollapsedProvider>
      <MobileDrawerProvider>
        <AppLayoutShell />
      </MobileDrawerProvider>
    </SidebarCollapsedProvider>
  );
}

/** Trên điện thoại, sale chỉ dùng landing / danh thiếp / timeline → không vào Tổng quan. */
function useSaleMobileRedirect() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (isMobile && (pathname === "/dashboard" || pathname === "/")) {
      nav({ to: "/timeline", replace: true });
    }
  }, [pathname, nav]);
}

function AppLayoutShell() {
  useSidebarShortcut();
  useSaleMobileRedirect();
  return (
    <div className="min-h-screen flex w-full bg-background">
      <OfflineBanner />
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
        <AppTopbar />
        <main className="flex-1 overflow-x-hidden">
          <div className="px-4 lg:px-8 py-6 lg:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
