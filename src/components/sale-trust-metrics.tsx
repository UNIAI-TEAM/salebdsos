import { BadgeCheck, Eye } from "lucide-react";
import type { PublicSaleMetrics } from "@/lib/public-sale-metrics.server";

type Props = {
  metrics: PublicSaleMetrics;
  variant?: "digital" | "standard";
  className?: string;
};

const formatter = new Intl.NumberFormat("vi-VN");

export function SaleTrustMetrics({ metrics, variant = "standard", className = "" }: Props) {
  const digital = variant === "digital";
  const stats = [
    [metrics.customersServed, "Khách hàng", "phục vụ"],
    [metrics.contractsSigned, "Hợp đồng", "đã ký"],
    [metrics.projectsSold, "Dự án", "đã bán"],
  ] as const;

  return (
    <section
      aria-label="Số liệu uy tín đã xác thực"
      className={`${digital ? "border-digital-ink/10 bg-digital-glass text-digital-ink" : "border-border bg-card text-card-foreground shadow-card"} overflow-hidden rounded-2xl border p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-success">
          <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-[10px] font-semibold uppercase">Dữ liệu xác thực hệ thống</span>
        </div>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
      </div>

      <div className="mt-6 grid grid-cols-3">
        {stats.map(([value, first, second], index) => (
          <div key={first} className={`${index ? digital ? "border-l border-digital-ink/10 pl-4" : "border-l border-border pl-4" : "pr-3"} min-w-0`}>
            <strong className="block text-2xl font-bold tabular-nums">{formatter.format(value)}</strong>
            <span className={`${digital ? "text-digital-ink/55" : "text-muted-foreground"} mt-1 block text-[10px] font-medium uppercase leading-tight`}>
              {first}<br />{second}
            </span>
          </div>
        ))}
      </div>

      <div className={`${digital ? "border-digital-ink/10 text-digital-ink/50" : "border-border text-muted-foreground"} mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4`}>
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <Eye className="h-4 w-4" />
          {formatter.format(metrics.interactions30d)} lượt tương tác · 30 ngày
        </span>
        <span className="text-[10px] font-semibold uppercase">Tự động cập nhật</span>
      </div>
    </section>
  );
}