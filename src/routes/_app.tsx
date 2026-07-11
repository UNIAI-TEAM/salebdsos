import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/app/sidebar";
import { AppTopbar } from "@/components/app/topbar";
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
    } else if (tenants.length === 0 && !isPlatformAdmin) {
      nav({ to: "/onboarding", replace: true });
    }
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
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
            <AppTopbar />
            <main className="flex-1 overflow-x-hidden">
              <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-[1600px] mx-auto w-full">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </MobileDrawerProvider>
    </SidebarCollapsedProvider>
  );
}
