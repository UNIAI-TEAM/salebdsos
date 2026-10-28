import { ReportActions, ReportOwnerFilter } from "@/components/app/report-actions";
import { downloadReport } from "@/lib/reporting";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getDebtAging } from "@/lib/debt-aging.functions";
import type { AgingBucket } from "@/lib/debt-aging";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/debt-aging")({
  head: () => ({
    meta: [
      { title: "Báo cáo tuổi nợ hợp đồng — SaleBDS OS" },
      { name: "description", content: "Công nợ theo hợp đồng: đến hạn, quá hạn 1–15, 16–30 và trên 30 ngày." },
      { property: "og:title", content: "Báo cáo tuổi nợ hợp đồng — SaleBDS OS" },
      { property: "og:description", content: "Theo dõi khoản đến hạn và quá hạn theo từng hợp đồng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DebtAgingPage,
});

const money = (v: number) =>
  v >= 1e9 ? `${(v / 1e9).toFixed(2).replace(/\.?0+$/, "")} tỷ` : v >= 1e6 ? `${Math.round(v / 1e6)} tr` : new Intl.NumberFormat("vi-VN").format(Math.round(v || 0));

const COLS: { key: AgingBucket; label: string; tone: string }[] = [
  { key: "due", label: "Đến hạn (7 ngày)", tone: "text-primary" },
  { key: "d1_15", label: "Quá hạn 1–15 ngày", tone: "text-warning" },
  { key: "d16_30", label: "Quá hạn 16–30 ngày", tone: "text-warning" },
  { key: "d30_plus", label: "Quá hạn trên 30 ngày", tone: "text-destructive" },
  { key: "not_due", label: "Chưa đến hạn", tone: "text-muted-foreground" },
];

function DebtAgingPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const [projectId, setProjectId] = useState("all");
  const [ownerId, setOwnerId] = useState("all");
  const fetchAging = useServerFn(getDebtAging);
  const q = useQuery({
    queryKey: ["debt-aging", tenantId, projectId, ownerId],
    enabled: !!tenantId,
    queryFn: () => { if (!tenantId) throw new Error("Chưa chọn sàn"); return fetchAging({ data: { tenantId, projectId: projectId === "all" ? undefined : projectId, ownerId: ownerId === "all" ? undefined : ownerId } }); },
  });
  const [bucket, setBucket] = useState<AgingBucket | "all">("all");

  if (!q.data) return <div className="p-6 text-sm text-muted-foreground">{q.error ? (q.error as Error).message : "Đang tải…"}</div>;
  const { totals, contracts, items, projects, scope, owners } = q.data;
  const overdue = totals.d1_15.amount + totals.d16_30.amount + totals.d30_plus.amount;
  const list = bucket === "all" ? items : items.filter((i) => i.bucket === bucket);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader compact
        title="Tuổi nợ hợp đồng"
        sub={`${scope === "own" ? "Hợp đồng của bạn" : "Toàn sàn"} · Tổng quá hạn ${money(overdue)}`}
        action={
          <ReportActions busy={q.isFetching} ready={Boolean(q.data)} refresh={() => { void q.refetch(); }} exportData={() => downloadReport("cong-no", ["Hợp đồng", "Khách", "Dự án", "Sale", "Đợt", "Ngày đến hạn", "Còn nợ (VND)", "Số ngày quá hạn"], list.map(i => [i.contractCode, i.customerName, i.projectName, i.ownerName, i.name, i.dueDate, i.outstanding, i.daysOverdue]))} />
        }
      />

      <div className="my-3 flex flex-wrap gap-2"><Select value={projectId} onValueChange={setProjectId}><SelectTrigger className="h-9 w-52" aria-label="Lọc dự án"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả dự án</SelectItem>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><ReportOwnerFilter value={ownerId} onChange={setOwnerId} owners={owners} /></div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {COLS.map((c) => (
          <Button variant="outline"
            key={c.key}
            onClick={() => setBucket(bucket === c.key ? "all" : c.key)}
            className={["h-auto items-start flex-col rounded-lg border bg-card p-3 text-left shadow-soft transition", bucket === c.key ? "border-primary ring-1 ring-primary" : "border-border"].join(" ")}
          >
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={["mt-1 text-xl font-bold", c.tone].join(" ")}>{money(totals[c.key].amount)}</p>
            <p className="text-[11px] text-muted-foreground">{totals[c.key].count} đợt</p>
          </Button>
        ))}
      </div>

      <SectionCard compact title="Theo hợp đồng" className="mb-6">
        {contracts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Không còn khoản phải thu nào.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {contracts.filter(c => bucket === "all" || c[bucket] > 0).map((c) => (
                <div key={c.contractId} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between"><p className="font-semibold">{c.contractCode}</p><p className="font-bold">{money(c.total)}</p></div>
                  <p className="text-xs text-muted-foreground">{c.customerName} · {c.projectName}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    {COLS.filter((k) => c[k.key] > 0).map((k) => <span key={k.key} className={k.tone}>{k.label}: {money(c[k.key])}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Hợp đồng</th><th className="pr-3">Khách</th><th className="pr-3">Sale</th>
                    {COLS.map((c) => <th key={c.key} className="pr-3 text-right">{c.label}</th>)}
                    <th className="text-right">Tổng còn nợ</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.filter(c => bucket === "all" || c[bucket] > 0).map((c) => (
                    <tr key={c.contractId} className="border-b border-border hover:bg-muted/40">
                      <td className="py-2.5 pr-3"><p className="font-medium">{c.contractCode}</p><p className="text-xs text-muted-foreground">{c.projectName}</p></td>
                      <td className="pr-3">{c.customerName}</td><td className="pr-3">{c.ownerName}</td>
                      {COLS.map((k) => <td key={k.key} className={["pr-3 text-right", c[k.key] ? k.tone : "text-muted-foreground"].join(" ")}>{c[k.key] ? money(c[k.key]) : "—"}</td>)}
                      <td className="text-right font-semibold">{money(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard compact title={bucket === "all" ? "Chi tiết từng đợt" : `Chi tiết: ${COLS.find((c) => c.key === bucket)?.label}`}>
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Không có đợt nào.</p>
        ) : (
          <div className="divide-y divide-border">
            {list.map((i) => {
              const col = COLS.find((c) => c.key === i.bucket) ?? COLS[0];
              return (
                <div key={i.installmentId} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.contractCode} · {i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.customerName} · hạn {i.dueDate ? new Date(i.dueDate).toLocaleDateString("vi-VN") : "chưa đặt"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{money(i.outstanding)}</p>
                    <Badge variant="outline" className={col.tone}>{i.daysOverdue > 0 ? `Quá ${i.daysOverdue} ngày` : col.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
