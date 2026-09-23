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
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { capabilityForPath, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { loading, session, tenants, tenantsLoaded, isPlatformAdmin } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      nav({ to: "/login", replace: true });
      return;
    }
    // Chỉ chuyển sang thiết lập khi đã tải xong và thật sự chưa có workspace.
    if (!tenantsLoaded) return;
    if (tenants.length === 0 && !isPlatformAdmin) {
      nav({ to: "/onboarding", replace: true });
    }
  }, [loading, session, tenantsLoaded, tenants.length, isPlatformAdmin, nav]);

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
      nav({ to: "/digital-card", replace: true });
    }
  }, [pathname, nav]);
}

/** Chặn truy cập trang khi vai trò không có quyền tương ứng. */
function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { can, isPlatformAdmin, currentRole } = useAuth();
  const cap = capabilityForPath(pathname);
  if (!cap || isPlatformAdmin || can(cap)) return <>{children}</>;
  return (
    <div className="mx-auto max-w-lg py-16 text-center space-y-3">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted">
        <Lock className="size-5 text-muted-foreground" />
      </div>
      <h1 className="text-lg font-semibold">Bạn không có quyền vào trang này</h1>
      <p className="text-sm text-muted-foreground">
        Vai trò hiện tại: <b>{currentRole ? ROLE_LABELS[currentRole] : "—"}</b>.{" "}
        {currentRole ? ROLE_DESCRIPTIONS[currentRole] : ""} Liên hệ quản trị viên nếu anh/chị cần thêm quyền.
      </p>
      <Button variant="outline" onClick={() => history.back()}>
        Quay lại
      </Button>
    </div>
  );
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
            <RouteGuard>
              <Outlet />
            </RouteGuard>
          </div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
