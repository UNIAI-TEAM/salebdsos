import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { User, Bell, Lock, CreditCard, Globe2, Palette } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const groups = [
    { i: User, t: "Tài khoản", d: "Hồ sơ, mật khẩu, xác thực 2 yếu tố" },
    { i: Bell, t: "Thông báo", d: "Email, push, in-app" },
    { i: Lock, t: "Bảo mật & quyền riêng tư", d: "Phiên đăng nhập, log truy cập" },
    { i: CreditCard, t: "Thanh toán & gói", d: "Pro Business · gia hạn 12/2025" },
    { i: Globe2, t: "Ngôn ngữ & khu vực", d: "Tiếng Việt · GMT+7" },
    { i: Palette, t: "Giao diện", d: "Theme & màu thương hiệu" },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" sub="Tuỳ chỉnh tài khoản và workspace của bạn." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <SectionCard key={g.t} className="cursor-pointer hover:border-primary/40 transition">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0"><g.i className="h-5 w-5" /></div>
              <div>
                <div className="text-[14px] font-semibold">{g.t}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{g.d}</div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
