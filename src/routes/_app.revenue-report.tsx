import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeDollarSign, Coins, FileSignature, Filter, RefreshCw, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getRevenueReport, type RevenueMonthRow, type RevenueRow } from "@/lib/revenue-report.functions";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/revenue-report")({
  head: () => ({
    meta: [
      { title: "Báo cáo doanh thu theo dự án — SaleBDS OS" },
      {
        name: "description",
        content: "Tổng hợp đồng, giá trị hợp đồng, tiền đã thu và hoa hồng theo từng dự án, kèm KPI theo tháng.",
      },
      { property: "og:title", content: "Báo cáo doanh thu theo dự án — SaleBDS OS" },
      { property: "og:description", content: "Doanh thu, tiền đã thu và hoa hồng theo dự án và theo tháng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RevenueReportPage,
});

const money = (value: number) =>
  value >= 1_000_000_000
    ? `${(value / 1_000_000_000).toFixed(1)} tỷ`
    : value >= 1_000_000
      ? `${Math.round(value / 1_000_000)} tr`
      : new Intl.NumberFormat("vi-VN").format(Math.round(value || 0));

const MONTH_OPTIONS = [
  { value: "3", label: "3 tháng" },
  { value: "6", label: "6 tháng" },
  { value: "12", label: "12 tháng" },
  { value: "24", label: "24 tháng" },
];

const monthLabel = (month: string) => {
  const [year, m] = month.split("-");
  return `Th${Number(m)}/${year.slice(2)}`;
};

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  badge,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  hint: string;
  badge?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        {badge ? <Badge variant="outline" className="shrink-0 text-[10px]">{badge}</Badge> : null}
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function Bar({ value, total }: { value: number; total: number }) {
  const width = total ? Math.max(4, Math.round((value / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
    </div>
  );
}

function RevenueCards({ rows, max, labelOf }: { rows: RevenueRow[]; max: number; labelOf: (row: RevenueRow) => string }) {
  return (
    <ul className="space-y-2 md:hidden">
      {rows.map((row) => (
        <li key={row.key} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{labelOf(row)}</p>
            <Badge variant="outline" className="shrink-0 text-[10px]">{row.collectRate}% đã thu</Badge>
          </div>
          <div className="mt-2"><Bar value={row.contractValue} total={max} /></div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-base font-bold">{row.contracts}</p>
              <p className="text-[10px] text-muted-foreground">Hợp đồng</p>
            </div>
            <div>
              <p className="text-base font-bold">{money(row.contractValue)}</p>
              <p className="text-[10px] text-muted-foreground">Giá trị</p>
            </div>
            <div>
              <p className="text-base font-bold">{money(row.collected)}</p>
              <p className="text-[10px] text-muted-foreground">Đã thu</p>
            </div>
          </div>
          <dl className="mt-3 space-y-1.5 border-t border-border/70 pt-3 text-xs">
            {[
              ["Còn phải thu", money(row.outstanding)],
              ["Hoa hồng", money(row.commissionTotal)],
              ["Hoa hồng chưa trả", money(row.commissionUnpaid)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}

function RevenueTable({
  rows,
  emptyText,
  firstColumn,
  labelOf,
}: {
  rows: RevenueRow[];
  emptyText: string;
  firstColumn: string;
  labelOf: (row: RevenueRow) => string;
}) {
  if (rows.length === 0) return <p className="py-7 text-center text-sm text-muted-foreground">{emptyText}</p>;
  const max = Math.max(...rows.map((row) => row.contractValue), 1);
  return (
    <>
      <RevenueCards rows={rows} max={max} labelOf={labelOf} />
      <div className="-mx-1 hidden overflow-x-auto px-1 md:block">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{firstColumn}</th>
              <th className="py-2 pr-3 text-right font-medium">Hợp đồng</th>
              <th className="py-2 pr-3 text-right font-medium">Giá trị HĐ</th>
              <th className="py-2 pr-3 text-right font-medium">Đã thu</th>
              <th className="py-2 pr-3 text-right font-medium">Còn phải thu</th>
              <th className="py-2 pr-3 text-right font-medium">Tỷ lệ thu</th>
              <th className="py-2 pr-3 text-right font-medium">Hoa hồng</th>
              <th className="py-2 text-right font-medium">HH chưa trả</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border/70 align-middle">
                <td className="min-w-[160px] py-3 pr-3">
                  <p className="truncate font-medium">{labelOf(row)}</p>
                  <div className="mt-1.5 max-w-[180px]"><Bar value={row.contractValue} total={max} /></div>
                </td>
                <td className="py-3 pr-3 text-right font-semibold">{row.contracts}</td>
                <td className="py-3 pr-3 text-right">{money(row.contractValue)}</td>
                <td className="py-3 pr-3 text-right">{money(row.collected)}</td>
                <td className="py-3 pr-3 text-right text-muted-foreground">{money(row.outstanding)}</td>
                <td className="py-3 pr-3 text-right font-medium">{row.collectRate}%</td>
                <td className="py-3 pr-3 text-right">{money(row.commissionTotal)}</td>
                <td className="py-3 text-right text-muted-foreground">{money(row.commissionUnpaid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RevenueReportPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const [months, setMonths] = useState("6");
  const [projectId, setProjectId] = useState("all");
  const fetchReport = useServerFn(getRevenueReport);

  const query = useQuery({
    queryKey: ["revenue-report", tenantId, months, projectId],
    enabled: Boolean(tenantId),
    queryFn: () =>
      fetchReport({
        data: {
          tenantId: tenantId as string,
          months: Number(months),
          ...(projectId !== "all" ? { projectId } : {}),
        },
      }),
  });

  const data = query.data;
  const monthRows: RevenueMonthRow[] = data?.byMonth ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Báo cáo doanh thu theo dự án"
        sub="Tổng hợp đồng, giá trị hợp đồng, tiền đã thu và hoa hồng theo từng dự án, kèm KPI theo tháng."
        action={
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1 text-[11px]"><Filter className="h-3 w-3" />Bộ lọc</Badge>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-9 w-[220px]"><SelectValue placeholder="Tất cả dự án" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả dự án</SelectItem>
            {(data?.projects ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data ? (
          <Badge variant="secondary" className="text-[11px]">
            {data.scope === "team" ? "Toàn sàn" : "Hợp đồng của tôi"}
          </Badge>
        ) : null}
      </div>

      {query.isLoading ? (
        <SectionCard title="Đang tải báo cáo">
          <p className="py-7 text-center text-sm text-muted-foreground">Đang tổng hợp doanh thu…</p>
        </SectionCard>
      ) : query.isError ? (
        <SectionCard title="Không tải được báo cáo">
          <p className="py-7 text-center text-sm text-destructive">{(query.error as Error).message}</p>
        </SectionCard>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={FileSignature}
              label="Hợp đồng"
              value={String(data.totals.contracts)}
              hint={`Hiệu lực hoặc hoàn tất trong ${data.months} tháng`}
            />
            <Kpi
              icon={BadgeDollarSign}
              label="Giá trị hợp đồng"
              value={money(data.totals.contractValue)}
              hint="Giá bán sau chiết khấu"
            />
            <Kpi
              icon={Wallet}
              label="Tiền đã thu"
              value={money(data.totals.collected)}
              hint={`Còn phải thu ${money(data.totals.outstanding)}`}
              badge={`${data.totals.collectRate}%`}
            />
            <Kpi
              icon={Coins}
              label="Hoa hồng"
              value={money(data.totals.commissionTotal)}
              hint={`Chưa trả ${money(data.totals.commissionUnpaid)} · đã trả ${money(data.totals.commissionPaid)}`}
            />
          </div>

          <SectionCard
            title="Doanh thu theo dự án"
            action={<Badge variant="outline" className="shrink-0 text-[10px]">{data.byProject.length} dự án</Badge>}
          >
            <RevenueTable
              rows={data.byProject}
              firstColumn="Dự án"
              labelOf={(row) => row.label}
              emptyText="Chưa có hợp đồng hiệu lực trong khoảng thời gian này."
            />
          </SectionCard>

          <SectionCard
            title="KPI theo tháng"
            action={<Badge variant="outline" className="shrink-0 text-[10px]">{data.months} tháng</Badge>}
          >
            <RevenueTable
              rows={monthRows}
              firstColumn="Tháng"
              labelOf={(row) => monthLabel(row.key)}
              emptyText="Chưa có dữ liệu theo tháng."
            />
            <p className="mt-3 text-[11px] text-muted-foreground">
              Tháng được tính theo ngày ký hợp đồng; hợp đồng chưa có ngày ký tính theo ngày lập.
            </p>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
