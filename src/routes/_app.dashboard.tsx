import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Users2, FileSignature, Wallet, Coins, AlertTriangle, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { getRevenueReport } from "@/lib/revenue-report.functions";
import { getFunnelReport } from "@/lib/funnel-report.functions";
import { getDebtAging } from "@/lib/debt-aging.functions";
import { REPORT_COPY, REPORT_META, downloadReport } from "@/lib/reporting";
import { ReportActions, ReportOwnerFilter } from "@/components/app/report-actions";
import { KpiCard, PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: REPORT_META(REPORT_COPY.overview, "Theo dõi hợp đồng bán và cho thuê, tiền đã thu, hoa hồng, phễu khách hàng và công nợ của sàn.") }),
  component: Dashboard,
});
const money = (v: number) => v >= 1e9 ? `${(v / 1e9).toFixed(2)} tỷ` : v >= 1e6 ? `${(v / 1e6).toFixed(1)} tr` : v.toLocaleString("vi-VN");

function Dashboard() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const [months, setMonths] = useState("6");
  const [projectId, setProjectId] = useState("all");
  const [ownerId, setOwnerId] = useState("all");
  const revenueFn = useServerFn(getRevenueReport);
  const funnelFn = useServerFn(getFunnelReport);
  const debtFn = useServerFn(getDebtAging);
  const filters = { tenantId: tenantId || "", ...(projectId !== "all" ? { projectId } : {}), ...(ownerId !== "all" ? { ownerId } : {}) };
  const revenue = useQuery({ queryKey: ["report-overview-revenue", filters, months], enabled: Boolean(tenantId), queryFn: () => revenueFn({ data: { ...filters, months: Number(months) } }) });
  const funnel = useQuery({ queryKey: ["report-overview-funnel", filters], enabled: Boolean(tenantId), queryFn: () => funnelFn({ data: { ...filters, days: 30 } }) });
  const debt = useQuery({ queryKey: ["report-overview-debt", filters], enabled: Boolean(tenantId), queryFn: () => debtFn({ data: filters }) });
  const r = revenue.data;
  const d = debt.data;
  const f = funnel.data;
  const busy = revenue.isFetching || funnel.isFetching || debt.isFetching;
  const error = revenue.isError || funnel.isError || debt.isError;
  const overdue = d ? d.totals.d1_15.amount + d.totals.d16_30.amount + d.totals.d30_plus.amount : 0;
  const refresh = () => { void revenue.refetch(); void funnel.refetch(); void debt.refetch(); };
  const exportData = () => { if (!r) return; downloadReport("tong-quan-bao-cao", ["Dự án", "Hợp đồng", "Giá trị (VND)", "Đã thu (VND)", "Còn phải thu (VND)", "Hoa hồng (VND)"], r.byProject.map(p => [p.label, p.contracts, p.contractValue, p.collected, p.outstanding, p.commissionTotal])); };
  return <div className="min-w-0 space-y-4">
    <PageHeader compact title={REPORT_COPY.overview} action={<ReportActions busy={busy} ready={Boolean(r) && !error} refresh={refresh} exportData={exportData} />} />
    <div className="flex flex-wrap gap-2">
      <Select value={months} onValueChange={setMonths}><SelectTrigger className="h-9 w-36" aria-label="Kỳ doanh thu"><SelectValue /></SelectTrigger><SelectContent>{[3, 6, 12, 24].map(n => <SelectItem key={n} value={String(n)}>{n} tháng</SelectItem>)}</SelectContent></Select>
      <Select value={projectId} onValueChange={setProjectId}><SelectTrigger className="h-9 w-52" aria-label="Dự án"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả dự án</SelectItem>{r?.projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
      <ReportOwnerFilter value={ownerId} onChange={setOwnerId} owners={r?.owners ?? []} />
    </div>
    {error ? <div role="alert" className="flex flex-wrap items-center gap-3 border border-destructive/30 p-4 text-sm text-destructive">{REPORT_COPY.error}<Button variant="outline" onClick={refresh}>{REPORT_COPY.refresh}</Button></div> : !r || !f || !d ? <p className="py-12 text-center text-muted-foreground">{REPORT_COPY.loading}</p> : <>
      <p className="text-xs text-muted-foreground">{r.period.start} — {r.period.end} · {r.scope === "team" ? "Toàn sàn" : "Sale đã chọn"}</p>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard compact icon={FileSignature} label="Hợp đồng hiệu lực" value={String(r.totals.contracts)} />
        <KpiCard compact icon={BarChart3} label="Giá trị hợp đồng" value={money(r.totals.contractValue)} tone="blue" />
        <KpiCard compact icon={Wallet} label="Đã thu theo hợp đồng" value={money(r.totals.collected)} tone="green" />
        <KpiCard compact icon={Coins} label="Hoa hồng" value={money(r.totals.commissionTotal)} tone="amber" />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border py-3 text-sm">
        <span>Còn phải thu <strong>{money(r.totals.outstanding)}</strong></span><span>Tỷ lệ thu <strong>{r.totals.collectRate}%</strong></span><span>Hoa hồng chưa trả <strong>{money(r.totals.commissionUnpaid)}</strong></span>
      </div>
      <SectionCard compact title="Giá trị hợp đồng & tiền đã thu theo tháng">
        <div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={r.byMonth} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} /><YAxis tickFormatter={money} width={64} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} /><Tooltip formatter={(v: number) => `${v.toLocaleString("vi-VN")} VND`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} /><Legend /><Bar dataKey="contractValue" name="Giá trị hợp đồng" fill="var(--chart-1)" radius={[3, 3, 0, 0]} /><Bar dataKey="collected" name="Đã thu theo hợp đồng" fill="var(--chart-2)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </SectionCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard compact title="Phễu khách mới · 30 ngày" action={<Button asChild variant="ghost" size="icon" aria-label="Mở phễu"><Link to="/funnel-report"><ArrowUpRight className="h-4 w-4" /></Link></Button>}>
          <div className="grid grid-cols-3 gap-3">{[["Khách mới", f.totals.submitted], ["Vào giỏ", f.totals.cart], ["Có hợp đồng", f.totals.contract]].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div><p className="mt-3 text-sm text-success">Tỷ lệ chốt {f.totals.submittedToContract}%</p>
        </SectionCard>
        <SectionCard compact title="Công nợ hiện tại · mọi kỳ" action={<Button asChild variant="ghost" size="icon" aria-label="Mở công nợ"><Link to="/debt-aging"><ArrowUpRight className="h-4 w-4" /></Link></Button>}>
          <div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-destructive" /><div><p className="text-xs text-muted-foreground">Quá hạn</p><p className="text-2xl font-semibold text-destructive">{money(overdue)}</p></div></div><p className="mt-3 text-sm text-muted-foreground">Đến hạn trong 7 ngày: <strong className="text-foreground">{money(d.totals.due.amount)}</strong> · {d.totals.due.count} đợt</p>
        </SectionCard>
      </div>
      <SectionCard compact title="So sánh dự án" action={<Button asChild variant="ghost" size="icon" aria-label="Mở doanh thu"><Link to="/revenue-report"><ArrowUpRight className="h-4 w-4" /></Link></Button>}>
        {!r.byProject.length ? <p className="py-6 text-center text-sm text-muted-foreground">Chưa có hợp đồng trong kỳ này.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2">Dự án</th><th className="text-right">Hợp đồng</th><th className="text-right">Giá trị</th><th className="text-right">Đã thu</th><th className="text-right">Còn phải thu</th></tr></thead><tbody>{r.byProject.map(p => <tr key={p.key} className="border-b border-border"><td className="py-3 font-medium">{p.label}</td><td className="text-right">{p.contracts}</td><td className="text-right">{money(p.contractValue)}</td><td className="text-right">{money(p.collected)}</td><td className="text-right">{money(p.outstanding)}</td></tr>)}</tbody></table></div>}
      </SectionCard>
    </>}
  </div>;
}
