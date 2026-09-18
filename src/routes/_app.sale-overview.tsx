import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, CalendarClock, CheckCircle2, FileSignature, QrCode, RefreshCw, ScanLine, UserRoundCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSaleOverview } from "@/lib/sale-overview.functions";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/sale-overview")({
  validateSearch: (search: Record<string, unknown>) => ({
    sale: typeof search.sale === "string" ? search.sale : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tổng quan Sale — SaleBDS OS" },
      { name: "description", content: "Lịch hẹn, sự kiện, khách đã quét và chỉ số bán hàng tự động của từng Sale." },
      { property: "og:title", content: "Tổng quan Sale — SaleBDS OS" },
      { property: "og:description", content: "Theo dõi lịch, khách quét QR và hiệu quả bán hàng theo từng Sale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SaleOverviewPage,
});

const ROLE_LABEL: Record<string, string> = {
  owner: "Giám đốc sàn", admin: "Quản trị sàn", manager: "Trưởng phòng kinh doanh", agent: "Chuyên viên kinh doanh",
};
const STATUS_LABEL: Record<string, string> = {
  new: "Mới", contacted: "Đã liên hệ", qualified: "Tiềm năng", consulting: "Đang tư vấn", quoted: "Đã báo giá", deposit: "Đặt cọc", won: "Thành công", lost: "Không thành công",
};

function formatTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Metric({ icon: Icon, label, value, hint }: { icon: typeof Activity; label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-7 text-center text-sm text-muted-foreground">{text}</p>;
}

function SaleOverviewPage() {
  const { currentTenant, user } = useAuth();
  const tenantId = currentTenant?.id;
  const { sale } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const fetchOverview = useServerFn(getSaleOverview);
  const ownerId = sale || user?.id;

  const query = useQuery({
    queryKey: ["sale-overview", tenantId, ownerId],
    enabled: Boolean(tenantId && ownerId),
    queryFn: () => {
      if (!tenantId || !ownerId) throw new Error("Chưa chọn workspace");
      return fetchOverview({ data: { tenantId, ownerId, days: 30 } });
    },
    refetchInterval: 30_000,
  });
  const data = query.data;

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <PageHeader
        title="Tổng quan Sale"
        sub="Lịch làm việc, khách đã quét và kết quả bán hàng được cập nhật tự động."
        action={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {data?.canManage ? (
              <Select value={data.ownerId} onValueChange={(value) => navigate({ search: { sale: value }, replace: true })}>
                <SelectTrigger className="h-9 min-w-0 flex-1 sm:w-56"><SelectValue placeholder="Chọn Sale" /></SelectTrigger>
                <SelectContent>{data.members.map((member) => <SelectItem key={member.userId} value={member.userId}>{member.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : null}
            <Button variant="outline" size="icon" onClick={() => query.refetch()} aria-label="Cập nhật dữ liệu" title="Cập nhật dữ liệu">
              <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
            </Button>
          </div>
        }
      />

      {query.isLoading ? <SectionCard><Empty text="Đang tổng hợp dữ liệu Sale…" /></SectionCard> : null}
      {query.isError ? <SectionCard><Empty text="Không tải được tổng quan Sale." /></SectionCard> : null}
      {data ? (
        <>
          <section className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
            {data.sale.avatarUrl ? <img src={data.sale.avatarUrl} alt={data.sale.name} className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">{data.sale.name.slice(0, 1).toUpperCase()}</div>}
            <div className="min-w-0 flex-1"><h2 className="truncate text-base font-bold">{data.sale.name}</h2><p className="truncate text-xs text-muted-foreground">{ROLE_LABEL[data.sale.role] ?? data.sale.role}{data.sale.phone ? ` · ${data.sale.phone}` : ""}</p></div>
            <Badge variant="secondary" className="shrink-0"><span className="mr-1 h-1.5 w-1.5 rounded-full bg-success" />Tự cập nhật</Badge>
          </section>

          <section aria-labelledby="sale-metrics-title">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="sale-metrics-title" className="text-base font-bold text-foreground">Chỉ số tổng hợp</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Số liệu thật từ khách gửi thông tin và giao dịch của Sale.</p>
              </div>
              <Badge variant="outline" className="shrink-0">Không tính trùng liên hệ</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Metric icon={ScanLine} label="Lượt tương tác" value={String(data.metrics.interactions)} hint="QR và Digital Card · 30 ngày" />
              <Metric icon={UserRoundCheck} label="Khách đã gửi thông tin" value={String(data.metrics.customersServed)} hint="Theo số điện thoại hoặc email" />
              <Metric icon={FileSignature} label="Hợp đồng đã ký" value={String(data.metrics.contractsSigned)} hint="Giao dịch thành công · toàn thời gian" />
              <Metric icon={Building2} label="Dự án đã bán" value={String(data.metrics.projectsSold)} hint="Dự án có giao dịch thành công" />
              <Metric icon={CheckCircle2} label="Tỷ lệ chuyển đổi" value={`${data.metrics.conversionRate}%`} hint="Hợp đồng trên khách gửi thông tin" />
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Lịch hẹn sắp tới" action={<Link to="/appointments" className="text-xs font-medium text-primary">Xem lịch</Link>}>
              {data.appointments.length === 0 ? <Empty text="Chưa có lịch hẹn sắp tới." /> : <ul className="space-y-2">{data.appointments.map((item) => <li key={item.id} className="flex min-w-0 gap-3 rounded-xl border border-border p-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{formatTime(item.startsAt)}</p><p className="truncate text-xs text-muted-foreground">{[item.customerName, item.projectName, item.location].filter(Boolean).join(" · ")}</p></div></li>)}</ul>}
            </SectionCard>
            <SectionCard title="Lịch sự kiện dự án">
              {data.events.length === 0 ? <Empty text="Chưa có sự kiện dự án sắp tới." /> : <ul className="space-y-2">{data.events.map((item) => <li key={item.id} className="flex min-w-0 gap-3 rounded-xl border border-border p-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/10 text-success"><CalendarClock className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{formatTime(item.startsAt)}</p><p className="truncate text-xs text-muted-foreground">{[item.projectName, item.location].filter(Boolean).join(" · ")}</p></div></li>)}</ul>}
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title={`Khách đã gửi thông tin · ${data.identified.length}`}>
              {data.identified.length === 0 ? <Empty text="Chưa có khách để lại thông tin." /> : <ul className="space-y-2">{data.identified.map((lead) => <li key={lead.id} className="rounded-xl border border-border p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{lead.name}</p><p className="truncate text-xs text-muted-foreground">{[lead.phone, lead.projectName].filter(Boolean).join(" · ")}</p></div><Badge variant="secondary" className="shrink-0 text-[10px]">{STATUS_LABEL[lead.status] ?? lead.status}</Badge></div><p className="mt-1 text-[11px] text-muted-foreground">{formatTime(lead.at)}{lead.source ? ` · ${lead.source}` : ""}</p></li>)}</ul>}
            </SectionCard>
            <SectionCard title={`Lượt quét ẩn danh · ${data.anonymous.length}`}>
              {data.anonymous.length === 0 ? <Empty text="Chưa có lượt quét ẩn danh." /> : <ul className="space-y-2">{data.anonymous.map((item) => <li key={item.id} className="flex min-w-0 gap-3 rounded-xl border border-border p-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><QrCode className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.projectName}</p><p className="truncate text-xs text-muted-foreground">{item.eventLabel}{item.channel ? ` · ${item.channel}` : ""}{item.device ? ` · ${item.device}` : ""}</p><p className="text-[11px] text-muted-foreground">{formatTime(item.at)}</p></div></li>)}</ul>}
            </SectionCard>
          </div>

          <SectionCard title="Hoạt động khách gần đây" action={<Link to="/journey" className="text-xs font-medium text-primary">Xem hành trình</Link>}>
            {data.recentActivity.length === 0 ? <Empty text="Chưa có hoạt động khách trong 30 ngày." /> : <ol className="space-y-3">{data.recentActivity.map((item) => <li key={item.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"><span className="h-2 w-2 rounded-full bg-primary" /><div className="min-w-0"><p className="truncate text-sm font-medium">{item.label}</p><p className="truncate text-xs text-muted-foreground">{item.projectName}{item.channel ? ` · ${item.channel}` : ""}</p></div><time className="text-[11px] text-muted-foreground">{formatTime(item.at)}</time></li>)}</ol>}
          </SectionCard>
          <p className="text-center text-[11px] text-muted-foreground">Cập nhật lúc {formatTime(data.updatedAt)} · tự làm mới mỗi 30 giây</p>
        </>
      ) : null}
    </div>
  );
}