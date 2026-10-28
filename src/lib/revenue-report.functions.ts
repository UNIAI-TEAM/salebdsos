// Báo cáo doanh thu theo dự án: hợp đồng, giá trị, tiền đã thu, hoa hồng, KPI theo tháng.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { contractFinancials, reportContractDate, reportWindow } from "./reporting";
import { readReportRows, readReportRelated, reportScope, reportOwners } from "./reporting.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SALE_ROLES = new Set(["owner", "admin", "manager", "agent", "platform_admin"]);
const MANAGER_ROLES = new Set(["owner", "admin", "manager", "platform_admin"]);

const Input = z.object({
  tenantId: z.string().uuid(),
  months: z.number().int().min(1).max(24).default(6),
  projectId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  kind: z.enum(["sale", "rental"]).optional(),
});

export type RevenueRow = {
  key: string;
  label: string;
  contracts: number;
  contractValue: number;
  collected: number;
  outstanding: number;
  collectRate: number;
  commissionTotal: number;
  commissionUnpaid: number;
  commissionPaid: number;
};

export type RevenueMonthRow = RevenueRow & { month: string };

const rate = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

function emptyBucket(label: string): RevenueRow {
  return {
    key: label,
    label,
    contracts: 0,
    contractValue: 0,
    collected: 0,
    outstanding: 0,
    collectRate: 0,
    commissionTotal: 0,
    commissionUnpaid: 0,
    commissionPaid: 0,
  };
}

function finish(row: RevenueRow): RevenueRow {
  return {
    ...row,
    contractValue: Math.round(row.contractValue),
    collected: Math.round(row.collected),
    outstanding: Math.round(Math.max(0, row.contractValue - row.collected)),
    collectRate: rate(row.collected, row.contractValue),
    commissionTotal: Math.round(row.commissionTotal),
    commissionUnpaid: Math.round(row.commissionUnpaid),
    commissionPaid: Math.round(row.commissionPaid),
  };
}

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export const getRevenueReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { canManage, ownerFilter } = await reportScope(supabase, data.tenantId, userId, data.ownerId);

    const now = new Date(`${reportWindow(1).today}T00:00:00Z`);
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (data.months - 1), 1));
    const startIso = start.toISOString().slice(0, 10);
    const endDate = reportWindow(1).today;

    let contractQuery = supabase
      .from("contracts")
      .select("id,project_id,owner_user_id,code,net_price,status,signed_at,created_at,completed_at,contract_kind")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .in("status", ["active", "completed"])
      ;
    if (data.kind) contractQuery = contractQuery.eq("contract_kind", data.kind);
    if (data.projectId) contractQuery = contractQuery.eq("project_id", data.projectId);
    if (ownerFilter) contractQuery = contractQuery.eq("owner_user_id", ownerFilter);

    const [contractsQ, projectsQ] = await Promise.all([
      readReportRows(contractQuery),
      readReportRows(supabase.from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null)),
    ]);
    const contracts = contractsQ.filter((row) => { const date = reportContractDate(row); return date >= startIso && date <= endDate; });
    const projectName = new Map(projectsQ.map((row) => [row.id, row.name]));
    const owners = await reportOwners(supabase, data.tenantId, canManage);
    const ids = contracts.map((row) => row.id);

    const collectedByContract = new Map<string, number>();
    const valueByContract = new Map<string, number>();
    const commissionByContract = new Map<string, { total: number; unpaid: number; paid: number }>();

    if (ids.length) {
      const [installmentsQ, commissionsQ] = await Promise.all([
        readReportRelated(supabase, "contract_installments", "id,contract_id,amount,paid_amount", "contract_id", ids),
        readReportRelated(supabase, "contract_commissions", "id,contract_id,amount,status,beneficiary_user_id", "contract_id", ids),
      ]);
      for (const contract of contracts) {
        const financials = contractFinancials(contract, installmentsQ.filter((i) => i.contract_id === contract.id));
        collectedByContract.set(contract.id, financials.collected);
        valueByContract.set(contract.id, financials.value);
      }
      for (const row of commissionsQ) {
        if (ownerFilter && row.beneficiary_user_id !== ownerFilter) continue;
        const bucket = commissionByContract.get(row.contract_id) ?? { total: 0, unpaid: 0, paid: 0 };
        const amount = Number(row.amount ?? 0);
        bucket.total += amount;
        if (row.status === "paid") bucket.paid += amount;
        else bucket.unpaid += amount;
        commissionByContract.set(row.contract_id, bucket);
      }
    }

    const totals = emptyBucket("Tổng");
    const projectBuckets = new Map<string, RevenueRow>();
    const monthBuckets = new Map<string, RevenueRow>();

    // Khung tháng cố định để biểu đồ/bảng không bị khuyết tháng
    for (let i = 0; i < data.months; i += 1) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      const key = d.toISOString().slice(0, 7);
      monthBuckets.set(key, { ...emptyBucket(key), key });
    }

    for (const row of contracts) {
      const value = valueByContract.get(row.id) ?? 0;
      const collected = collectedByContract.get(row.id) ?? 0;
      const commission = commissionByContract.get(row.id) ?? { total: 0, unpaid: 0, paid: 0 };

      const apply = (bucket: RevenueRow) => {
        bucket.contracts += 1;
        bucket.contractValue += value;
        bucket.collected += collected;
        bucket.commissionTotal += commission.total;
        bucket.commissionUnpaid += commission.unpaid;
        bucket.commissionPaid += commission.paid;
      };

      apply(totals);

      const projectKey = row.project_id ?? "none";
      const projectLabel = row.project_id ? projectName.get(row.project_id) ?? "Dự án đã xoá" : "Chưa gắn dự án";
      const projectBucket = projectBuckets.get(projectKey) ?? { ...emptyBucket(projectLabel), key: projectKey };
      apply(projectBucket);
      projectBuckets.set(projectKey, projectBucket);

      const mk = reportContractDate(row).slice(0, 7);
      const monthBucket = monthBuckets.get(mk) ?? { ...emptyBucket(mk), key: mk };
      apply(monthBucket);
      monthBuckets.set(mk, monthBucket);
    }

    const byProject = [...projectBuckets.values()].map(finish).sort((a, b) => b.contractValue - a.contractValue);
    const byMonth: RevenueMonthRow[] = [...monthBuckets.values()]
      .map((row) => ({ ...finish(row), month: row.key }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      months: data.months,
      canManage,
      owners,
      period: { start: startIso, end: endDate },
      scope: ownerFilter ? "own" : "team",
      projects: projectsQ.map((row) => ({ id: row.id, name: row.name })),
      totals: finish(totals),
      byProject,
      byMonth,
    };
  });
