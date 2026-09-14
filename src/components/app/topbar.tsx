import { Bell, HelpCircle, Search, ChevronDown, Menu, PanelLeft } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { useMobileDrawer } from "@/hooks/use-mobile-drawer";

const titles: Record<string, { title: string; sub: string }> = {
  "/dashboard": { title: "Tổng quan", sub: "Chào mừng bạn quay trở lại hệ thống" },
  "/digital-card": { title: "Danh thiếp & Profile", sub: "Chỉnh sửa & chia sẻ danh thiếp số của bạn" },
  "/leads": { title: "Leads (CRM)", sub: "Quản lý & chăm sóc khách hàng tiềm năng" },
  "/customers": { title: "Khách hàng", sub: "Cơ sở dữ liệu khách hàng đã chuyển đổi" },
  "/projects": { title: "Dự án", sub: "Danh mục dự án bất động sản" },
  "/pipeline": { title: "Sales Pipeline", sub: "Theo dõi cơ hội bán hàng theo giai đoạn" },
  "/appointments": { title: "Lịch hẹn", sub: "Lịch gặp khách & follow-up" },
  "/ai-followup": { title: "AI Follow-up", sub: "AI tự động chăm sóc lead 24/7" },
  "/ai-lead-score": { title: "AI Lead Score", sub: "Chấm điểm lead bằng trí tuệ nhân tạo" },
  "/ai-sales-page": { title: "AI Sales Page", sub: "Landing page cá nhân hoá bằng AI" },
  "/marketing": { title: "Marketing & Campaign", sub: "Chiến dịch đa kênh thông minh" },
  "/analytics": { title: "Báo cáo & Analytics", sub: "Phân tích sâu hiệu suất bán hàng" },
  "/wallet": { title: "Wallet Card", sub: "Apple Wallet & Google Wallet" },
  "/qr-sharing": { title: "QR Sharing", sub: "Chia sẻ danh thiếp qua QR" },
  "/dynamic-qr": { title: "Dynamic QR", sub: "QR động theo chiến dịch" },
  "/team": { title: "Team Management", sub: "Quản lý đội ngũ & phân quyền" },
  "/products": { title: "Sản phẩm", sub: "Catalog sản phẩm & dịch vụ" },
  "/files": { title: "Tài liệu & Brochure", sub: "Thư viện brochure, hợp đồng" },
  "/settings": { title: "Cài đặt", sub: "Tuỳ chỉnh tài khoản & workspace" },
};

export function AppTopbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const meta = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] ?? titles["/dashboard"];
  const { collapsed, toggle } = useSidebarCollapsed();
  const { toggle: toggleDrawer } = useMobileDrawer();

  return (
    <header className="sticky top-0 z-30 glass border-b border-border">
      <div className="flex items-center gap-2 lg:gap-4 px-3 lg:px-8 h-16">
        <button
          onClick={toggleDrawer}
          className="lg:hidden inline-flex items-center justify-center h-11 w-11 rounded-xl hover:bg-muted active:bg-muted active:scale-95 transition text-foreground"
          aria-label="Mở menu (Ctrl+B)"
          title="Mở menu (Ctrl+B)"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={toggle}
          className="hidden lg:inline-flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-all duration-200 active:scale-95 text-muted-foreground hover:text-foreground"
          aria-label="Thu gọn / mở rộng menu (Ctrl+B)"
          title="Thu gọn / mở rộng menu (Ctrl+B)"
        >
          <PanelLeft className={["h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", collapsed ? "rotate-180" : ""].join(" ")} />
          <kbd className="hidden xl:inline-flex items-center gap-0.5 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground">
            <span className="text-[11px]">⌘</span>B
          </kbd>
        </button>
        <div className="hidden md:block min-w-0">
          <h1 className="text-[17px] font-bold text-foreground leading-tight truncate">{meta.title}</h1>
          <p className="text-[12px] text-muted-foreground leading-tight truncate">{meta.sub}</p>
        </div>

        <div className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Tìm kiếm leads, dự án, khách hàng..."
              className="w-full h-10 rounded-xl bg-muted/60 border border-transparent focus:bg-card focus:border-border focus:ring-2 focus:ring-primary/20 pl-10 pr-16 text-[13px] outline-none transition"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-[10px] text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded">⌘ K</kbd>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button className="relative p-2 rounded-lg hover:bg-muted transition">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          </button>
          <button className="p-2 rounded-lg hover:bg-muted transition">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="ml-2 flex items-center gap-2 pl-2 border-l border-border cursor-pointer hover:bg-muted rounded-lg pr-2 py-1 transition">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-primary-foreground text-[13px] font-semibold">NA</div>
            <div className="hidden md:block leading-tight">
              <div className="text-[13px] font-semibold">Nguyễn Văn A</div>
              <div className="text-[11px] text-muted-foreground">Sales Manager</div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
          </div>
        </div>
      </div>
    </header>
  );
}
