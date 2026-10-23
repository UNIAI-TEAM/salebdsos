import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const TONES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  blue: "bg-info/10 text-info",
  green: "bg-success/10 text-success",
  amber: "bg-warning/10 text-warning",
  rose: "bg-destructive/10 text-destructive",
  indigo: "bg-primary/10 text-primary",
};

export function KpiCard({
  icon: Icon, label, value, delta, deltaLabel = "so với 30 ngày trước", tone = "primary",
}: {
  icon: LucideIcon; label: string; value: string; delta: number; deltaLabel?: string;
  tone?: "primary" | "blue" | "green" | "amber" | "rose" | "indigo";
}) {
  const up = delta >= 0;
  return (
    <div className="group min-w-0 rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:border-primary/30 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <span className="min-w-0 text-[11px] font-medium uppercase leading-snug tracking-wide text-muted-foreground sm:text-xs">{label}</span>
        <div className={["grid h-8 w-8 shrink-0 place-items-center rounded-lg", TONES[tone]].join(" ")}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mb-2 text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-[28px]">{value}</div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
        <span className={["inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium", up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"].join(" ")}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta)}%
        </span>
        <span className="min-w-0 truncate text-muted-foreground">{deltaLabel}</span>
      </div>
    </div>
  );
}

export function SectionCard({
  title, action, children, className = "",
}: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={["rounded-xl border border-border bg-card", className].join(" ")}>
      {title && (
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          {action}
        </div>
      )}
      <div className={title ? "p-4 sm:p-6" : "p-4 sm:p-6"}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border pb-6 sm:mb-8 sm:flex sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}
