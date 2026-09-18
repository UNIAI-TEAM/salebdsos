import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileSignature, Filter, PackageCheck, RefreshCw, TrendingDown, UserRoundCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFunnelReport, type FunnelRow } from "@/lib/funnel-report.functions";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/funnel-report")({
  head: () => ({
    meta: [
      { title: "Báo cáo phễu bán hàng — SaleBDS OS" },
      {
        name: "description",
        content: "Phễu khách gửi thông tin → giỏ hàng → hợp đồng, kèm tỷ lệ chuyển đổi theo từng dự án và nguồn khách.",
      },
      { property: "og:title", content: "Báo cáo phễu bán hàng — SaleBDS OS" },
      { property: "og:description", content: "Theo dõi tỷ lệ chuyển đổi từ khách gửi thông tin đến hợp đồng theo dự án và nguồn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FunnelReportPage,
});

const DAY_OPTIONS = [
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "180", label: "6 tháng" },
  { value: "365", label: "12 tháng" },
];

function Stage({
  icon: Icon,
  label,
  value,
  hint,
  rate,
}: {
  icon: typeof UserRoundCheck;
  label: string;
  value: number;
  hint: string;
  rate?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        {rate ? <Badge variant="outline" className="shrink-0 text-[10px]">{rate}</Badge> : null}
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

function FunnelTable({ rows, emptyText }: { rows: FunnelRow[]; emptyText: string }) {
  if (rows.length === 0) return <p className="py-7 text-center text-sm text-muted-foreground">{emptyText}</p>;
  const max = Math.max(...rows.map((row) => row.submitted), 1);
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Nhóm</th>
            <th className="py-2 pr-3 text-right font-medium">Gửi thông tin</th>
            <th className="py-2 pr-3 text-right font-medium">Giỏ hàng</th>
            <th className="py-2 pr-3 text-right font-medium">Hợp đồng</th>
            <th className="py-2 pr-3 text-right font-medium">Gửi → giỏ</th>
            <th className="py-2 text-right font-medium">Gửi → hợp đồng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-border/70 align-middle">
              <td className="min-w-[160px] py-3 pr-3">
                <p className="truncate font-medium">{row.label}</p>
                <div className="mt-1.5 max-w-[180px]"><Bar value={row.submitted} total={max} /></div>
              </td>
              <td className="py-3 pr-3 text-right font-semibold">{row.submitted}</td>
              <td className="py-3 pr-3 text-right">{row.cart}</td>
              <td className="py-3 pr-3 text-right">{row.contract}</td>
              <td className="py-3 pr-3 text-right text-muted-foreground">{row.submittedToCart}%</td>
              <td className="py-3 text-right font-medium">{row.submittedToContract}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FunnelReportPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const [days, setDays] = useState("30");
  const [projectId, setProjectId] = useState("all");
  const fetchReport = useServerFn(getFunnelReport);

  const query = useQuery({
    queryKey: ["funnel-report", tenantId, days, projectId],
    enabled: Boolean(tenantId),
    queryFn: () =>
      fetchReport({
        data: {
          tenantId: tenantId as string,
          days: Number(days),
          ...(projectId !== "all" ? { projectId } : {}),
        },
      }),
  });

  const data = query.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Báo cáo phễu bán hàng"
        description="Khách gửi thông tin → giỏ hàng → hợp đồng, kèm tỷ lệ chuyển đổi theo dự án và nguồn khách."
        action={
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1 text-[11px]"><Filter className="h-3 w-3" />Bộ lọc</Badge>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((option) => (
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
            {data.scope === "team" ? "Toàn sàn" : "Khách của tôi"}
          </Badge>
        ) : null}
      </div>

      {query.isLoading ? (
        <SectionCard title="Đang tải báo cáo"><p className="py-7 text-center text-sm text-muted-foreground">Đang tổng hợp số liệu…</p></SectionCard>
      ) : query.isError ? (
        <SectionCard title="Không tải được báo cáo">
          <p className="py-7 text-center text-sm text-destructive">{(query.error as Error).message}</p>
        </SectionCard>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stage icon={UserRoundCheck} label="Khách gửi thông tin" value={data.totals.submitted} hint={`Trong ${data.days} ngày gần nhất`} />
            <Stage
              icon={PackageCheck}
              label="Vào giỏ hàng"
              value={data.totals.cart}
              hint="Khách có giao dịch hoặc sản phẩm đang giữ chỗ"
              rate={`${data.totals.submittedToCart}%`}
            />
            <Stage
              icon={FileSignature}
              label="Ký hợp đồng"
              value={data.totals.contract}
              hint="Giao dịch Thành công hoặc sản phẩm đã ký / đã bán"
              rate={`${data.totals.cartToContract}% từ giỏ hàng`}
            />
            <Stage
              icon={TrendingDown}
              label="Tỷ lệ chốt toàn phễu"
              value={data.totals.submittedToContract}
              hint={`Giỏ hàng: ${data.inventory.held} sản phẩm đang giữ · ${data.inventory.contracted} đã ký/bán`}
              rate="%"
            />
          </div>

          <SectionCard
            title="Tỷ lệ chuyển đổi theo dự án"
            action={<Badge variant="outline" className="shrink-0 text-[10px]">{data.byProject.length} dự án</Badge>}
          >
            <FunnelTable rows={data.byProject} emptyText="Chưa có khách gửi thông tin trong khoảng thời gian này." />
          </SectionCard>

          <SectionCard
            title="Tỷ lệ chuyển đổi theo nguồn khách"
            action={<Badge variant="outline" className="shrink-0 text-[10px]">{data.bySource.length} nguồn</Badge>}
          >
            <FunnelTable rows={data.bySource} emptyText="Chưa có nguồn khách nào trong khoảng thời gian này." />
            <p className="mt-3 text-[11px] text-muted-foreground">
              Nguồn được gom theo cách khách đến: landing dự án, QR danh thiếp, chat trên trang, Zalo, biểu mẫu và nhập tay.
            </p>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
