import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { startCall } from "@/lib/inbox.functions";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlarmClock, Building2, CalendarClock, CheckCircle2, FileSignature, PhoneCall, QrCode, RefreshCw, ScanLine, UserRoundCheck, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSaleOverview } from "@/lib/sale-overview.functions";
import { TodayWork } from "@/components/app/today-work";
import { TODAY_COPY as C, vietnamDay, mergeCallLeads, type WorkItem } from "@/lib/today-work";
import { getDebtAging } from "@/lib/debt-aging.functions";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/sale-overview")({
  validateSearch: (search: Record<string, unknown>) => ({
    sale: typeof search.sale === "string" ? search.sale : undefined,
    project: typeof search.project === "string" ? search.project : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tổng quan Sale — SaleBDS OS" },
      { name: "description", content: "Việc hôm nay: khách cần gọi, lịch hẹn, SLA và công nợ của từng Sale." },
      { property: "og:title", content: "Tổng quan Sale — SaleBDS OS" },
      { property: "og:description", content: "Gom việc hôm nay, theo dõi khách cần gọi, lịch hẹn, SLA và công nợ." },
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
    <div className="min-w-0 rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:border-primary/30 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <p className="min-w-0 text-[11px] font-medium uppercase leading-snug tracking-wide text-muted-foreground sm:text-xs">{label}</p>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
      </div>
      <p className="text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums">{value}</p>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground"><CheckCircle2 className="h-5 w-5" /></div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function SaleOverviewPage() {
  const { currentTenant, user } = useAuth();
  const tenantId = currentTenant?.id;
  const { sale, project } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const fetchOverview = useServerFn(getSaleOverview);
  const startCallFn = useServerFn(startCall);
  const callMutation = useMutation({
    mutationFn: (phone: string) => {
      if (!tenantId) throw new Error("Chưa chọn workspace");
      return startCallFn({ data: { tenantId, phone } });
    },
    onSuccess: (result) => {
      toast[result.warning ? "info" : "success"](
        result.warning ?? "Đã bắt đầu cuộc gọi qua tổng đài, ghi âm sẽ lưu vào hộp thoại.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const callLead = (phone: string) => callMutation.mutate(phone);
  const ownerId = sale || user?.id;

  const query = useQuery({
    queryKey: ["sale-overview", tenantId, ownerId, project],
    enabled: Boolean(tenantId && ownerId),
    queryFn: () => {
      if (!tenantId || !ownerId) throw new Error("Chưa chọn workspace");
      return fetchOverview({ data: { tenantId, ownerId, projectId: project, days: 30 } });
    },
    refetchInterval: 30_000,
  });
  const data = query.data;
  const fetchDebt = useServerFn(getDebtAging);
  const debtQuery = useQuery({
    queryKey: ["sale-overview-debt", tenantId, ownerId, project],
    enabled: Boolean(tenantId && ownerId),
    queryFn: () => {
      if (!tenantId || !ownerId) throw new Error("Chưa chọn workspace");
      return fetchDebt({ data: { tenantId, projectId: project, ownerId } });
    },
    refetchInterval: 60_000,
  });
  const today = vietnamDay(new Date());
  const work: WorkItem[] = [];
  if (data) {
    const calls: WorkItem[] = [
      ...data.slaAlerts.map(lead => ({id:lead.id, kind:"calls" as const, name:lead.name, detail:[lead.phone,lead.projectName].filter(Boolean).join(" · "), status:`${C.late} ${lead.overdueMinutes} ${C.minutes}`, urgent:true, phone:lead.phone, leadId:lead.id, order:-lead.overdueMinutes})),
      ...data.slaPending.map(lead => ({id:lead.id, kind:"calls" as const, name:lead.name, detail:[lead.phone,lead.projectName].filter(Boolean).join(" · "), status:`${C.remaining} ${lead.remainingMinutes} ${C.minutes}`, urgent:false, phone:lead.phone, leadId:lead.id, order:lead.remainingMinutes})),
      ...data.coldLeads.filter(lead=>!data.slaAlerts.some(l=>l.id===lead.id)&&!data.slaPending.some(l=>l.id===lead.id)).map(lead => ({id:lead.id, kind:"calls" as const, name:lead.name, detail:[lead.phone,lead.projectName].filter(Boolean).join(" · "), status:`${C.cold} ${lead.idleDays} ${C.days}`, urgent:false, phone:lead.phone, leadId:lead.id, order:100+lead.idleDays})),
    ];
    work.push(...mergeCallLeads(calls).map(item=>({...item,id:`call-${item.id}`})));
    work.push(...calls.filter(item=>data.slaAlerts.some(lead=>lead.id===item.leadId)||data.slaPending.some(lead=>lead.id===item.leadId)).map(item=>({...item,kind:"sla" as const,id:`sla-${item.id}`,order:item.order-10000})));
    work.push(...data.appointments.filter(item=>item.status==="scheduled" && vietnamDay(item.startsAt)===today).map(item=>({id:`appointment-${item.id}`,kind:"appointments" as const,name:item.title,detail:[item.customerName,item.projectName,item.location].filter(Boolean).join(" · "),status:new Date(item.startsAt).toLocaleTimeString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",hour:"2-digit",minute:"2-digit"}),urgent:false,order:500+new Date(item.startsAt).getHours()})));
  }
  work.push(...(debtQuery.data?.items??[]).filter(item=>item.daysOverdue>0||item.dueDate?.slice(0,10)===today).map(item=>({id:`debt-${item.installmentId}`,kind:"debt" as const,name:item.customerName,detail:[item.contractCode,item.name,item.projectName].join(" · "),status:item.daysOverdue>0?`${C.overdue} ${item.daysOverdue} ${C.days}`:C.due,urgent:item.daysOverdue>0,amount:item.outstanding,order:1000-item.daysOverdue})));

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <PageHeader
        title="Tổng quan Sale"
        sub="Khách cần gọi, lịch hẹn, SLA và công nợ."
        action={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {data?.canManage ? (
              <Select value={data.ownerId} onValueChange={(value) => navigate({ search: { sale: value, project: undefined }, replace: true })}>
                <SelectTrigger className="h-9 min-w-0 flex-1 sm:w-56"><SelectValue placeholder="Chọn Sale" /></SelectTrigger>
                <SelectContent>{data.members.map((member) => <SelectItem key={member.userId} value={member.userId}>{member.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : null}
            <Button variant="outline" size="icon" onClick={() => { void query.refetch(); void debtQuery.refetch(); }} aria-label="Cập nhật dữ liệu" title="Cập nhật dữ liệu">
              <RefreshCw className={query.isFetching || debtQuery.isFetching ? "animate-spin" : ""} />
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

          <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Dự án đang xem</p>
              <p className="truncate text-xs text-muted-foreground">Lọc chỉ số, lịch và hành trình khách theo dự án.</p>
            </div>
            <Select value={data.selectedProjectId ?? "all"} onValueChange={(value) => navigate({ search: { sale, project: value === "all" ? undefined : value }, replace: true })}>
              <SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Chọn dự án" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả dự án</SelectItem>
                {data.projects.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </section>

          <TodayWork items={work} onCall={callLead} calling={callMutation.isPending} debtLoading={debtQuery.isLoading} debtError={debtQuery.isError} />
          {data.canManage ? <div className="flex gap-4"><Link to="/leads" search={{ lead: undefined }} className="text-xs font-medium text-primary">Gán lại Sale</Link><Link to="/handover" className="text-xs font-medium text-primary">Bàn giao khách</Link></div> : null}

          <section aria-labelledby="sale-metrics-title">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="sale-metrics-title" className="text-base font-bold text-foreground">{data.selectedProjectName ? `Chỉ số · ${data.selectedProjectName}` : "Chỉ số tổng hợp"}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Số liệu thật từ khách gửi thông tin và giao dịch của Sale.</p>
              </div>
              <Badge variant="outline" className="shrink-0">Không tính trùng liên hệ</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
              <Metric icon={ScanLine} label="Lượt tương tác" value={String(data.metrics.interactions)} hint="QR và Digital Card · 30 ngày" />
              <Metric icon={UserRoundCheck} label="Khách đã gửi thông tin" value={String(data.metrics.customersServed)} hint="Theo số điện thoại hoặc email" />
              <Metric icon={FileSignature} label="Hợp đồng đã ký" value={String(data.metrics.contractsSigned)} hint="Giao dịch thành công · toàn thời gian" />
              <Metric icon={Building2} label="Dự án đã bán" value={String(data.metrics.projectsSold)} hint="Dự án có giao dịch thành công" />
              <Metric icon={CheckCircle2} label="Tỷ lệ chuyển đổi" value={`${data.metrics.conversionRate}%`} hint="Hợp đồng trên khách gửi thông tin" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border bg-card p-4 text-sm shadow-soft">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Hoa hồng tự tính</p>
                <p className="mt-0.5 text-lg font-bold">
                  {new Intl.NumberFormat("vi-VN").format(data.metrics.commissionTotal)} đ
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Đã trả {new Intl.NumberFormat("vi-VN").format(data.metrics.commissionPaid)} đ · Đã duyệt{" "}
                {new Intl.NumberFormat("vi-VN").format(data.metrics.commissionApproved)} đ · Chờ duyệt{" "}
                {new Intl.NumberFormat("vi-VN").format(data.metrics.commissionPending)} đ
              </p>
              <Badge variant="outline" className="shrink-0 text-[11px]">
                {data.commissionPolicy.percent}% quỹ hoa hồng · {data.commissionPolicy.source}
              </Badge>
            </div>
          </section>


          <SectionCard title="Hiệu quả theo dự án">
            {data.projectComparison.length === 0 ? <Empty text="Sale chưa có dự án để so sánh." /> : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="py-2 pr-3 font-medium">Dự án</th><th className="px-3 py-2 text-right font-medium">Tương tác</th><th className="px-3 py-2 text-right font-medium">Khách</th><th className="px-3 py-2 text-right font-medium">Hợp đồng</th><th className="py-2 pl-3 text-right font-medium">Chuyển đổi</th></tr></thead>
                    <tbody>{data.projectComparison.map((item) => <tr key={item.projectId} className="border-b border-border/70 last:border-0"><td className="max-w-80 py-3 pr-3 font-medium"><span className="line-clamp-1">{item.name}</span></td><td className="px-3 py-3 text-right tabular-nums">{item.interactions}</td><td className="px-3 py-3 text-right tabular-nums">{item.customersServed}</td><td className="px-3 py-3 text-right tabular-nums">{item.contractsSigned}</td><td className="py-3 pl-3 text-right font-semibold tabular-nums">{item.conversionRate}%</td></tr>)}</tbody>
                  </table>
                </div>
                <ul className="space-y-2 md:hidden">{data.projectComparison.map((item) => <li key={item.projectId} className="rounded-xl border border-border p-3"><p className="truncate text-sm font-semibold">{item.name}</p><div className="mt-3 grid grid-cols-4 gap-2 text-center"><div><p className="text-base font-bold tabular-nums">{item.interactions}</p><p className="text-[10px] text-muted-foreground">Tương tác</p></div><div><p className="text-base font-bold tabular-nums">{item.customersServed}</p><p className="text-[10px] text-muted-foreground">Khách</p></div><div><p className="text-base font-bold tabular-nums">{item.contractsSigned}</p><p className="text-[10px] text-muted-foreground">Hợp đồng</p></div><div><p className="text-base font-bold tabular-nums">{item.conversionRate}%</p><p className="text-[10px] text-muted-foreground">Chuyển đổi</p></div></div></li>)}</ul>
              </>
            )}
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Lịch hẹn sắp tới" action={<Link to="/appointments" className="text-xs font-medium text-primary">Xem lịch</Link>}>
              {data.appointments.filter(item=>item.status==="scheduled" && vietnamDay(item.startsAt)!==today).length === 0 ? <Empty text="Chưa có lịch hẹn sắp tới." /> : <ul className="space-y-2">{data.appointments.filter(item=>item.status==="scheduled" && vietnamDay(item.startsAt)!==today).map((item) => <li key={item.id} className="flex min-w-0 gap-3 rounded-xl border border-border p-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{formatTime(item.startsAt)}</p><p className="truncate text-xs text-muted-foreground">{[item.customerName, item.projectName, item.location].filter(Boolean).join(" · ")}</p></div></li>)}</ul>}
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