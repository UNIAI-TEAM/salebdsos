import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function KpiCard({
  icon: Icon, label, value, delta, deltaLabel = "so với 30 ngày trước", tone = "primary",
}: {
  icon: LucideIcon; label: string; value: string; delta: number; deltaLabel?: string;
  tone?: "primary" | "blue" | "green" | "amber" | "rose" | "indigo";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  const up = delta >= 0;
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft hover:shadow-card transition">
      <div className="flex items-start justify-between mb-4">
        <div className={["h-10 w-10 rounded-xl grid place-items-center", tones[tone]].join(" ")}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-[12.5px] text-muted-foreground font-medium mb-1.5">{label}</div>
      <div className="text-[26px] font-bold tracking-tight text-foreground leading-none mb-2">{value}</div>
      <div className="flex items-center gap-1.5 text-[11.5px]">
        <span className={["inline-flex items-center gap-0.5 font-semibold", up ? "text-emerald-600" : "text-rose-600"].join(" ")}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta)}%
        </span>
        <span className="text-muted-foreground">{deltaLabel}</span>
      </div>
    </div>
  );
}

export function SectionCard({
  title, action, children, className = "",
}: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={["rounded-2xl bg-card border border-border shadow-soft", className].join(" ")}>
      {title && (
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
          {action}
        </div>
      )}
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>
        {sub && <p className="text-[13px] text-muted-foreground mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
