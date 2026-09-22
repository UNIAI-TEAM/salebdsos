// Báo cáo doanh thu theo dự án: hợp đồng, giá trị, tiền đã thu, hoa hồng, KPI theo tháng.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SALE_ROLES = new Set(["owner", "admin", "manager", "agent", "platform_admin"]);
const MANAGER_ROLES = new Set(["owner", "admin", "manager", "platform_admin"]);

const Input = z.object({
  tenantId: z.string().uuid(),
  months: z.number().int().min(1).max(24).default(6),
  projectId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
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

    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("tenant_id", data.tenantId)
      .eq("user_id", userId);
    if (roleError) throw new Error(roleError.message);
    const roleList = (roles ?? []).map((row) => row.role);
    if (!roleList.some((role) => SALE_ROLES.has(role))) {
      throw new Error("Bạn không có quyền xem báo cáo doanh thu của workspace này");
    }
    const canManage = roleList.some((role) => MANAGER_ROLES.has(role));
    const ownerFilter = canManage ? data.ownerId ?? null : userId;

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (data.months - 1), 1));
    const startIso = start.toISOString();

    let contractQuery = supabase
      .from("contracts")
      .select("id,project_id,owner_user_id,code,net_price,status,signed_at,created_at,completed_at")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .in("status", ["active", "completed"])
      .gte("created_at", startIso);
    if (data.projectId) contractQuery = contractQuery.eq("project_id", data.projectId);
    if (ownerFilter) contractQuery = contractQuery.eq("owner_user_id", ownerFilter);

    const [contractsQ, projectsQ] = await Promise.all([
      contractQuery,
      supabase.from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null),
    ]);
    if (contractsQ.error) throw new Error(contractsQ.error.message);
    if (projectsQ.error) throw new Error(projectsQ.error.message);

    const contracts = contractsQ.data ?? [];
    const projectName = new Map((projectsQ.data ?? []).map((row) => [row.id, row.name]));
    const ids = contracts.map((row) => row.id);

    const collectedByContract = new Map<string, number>();
    const commissionByContract = new Map<string, { total: number; unpaid: number; paid: number }>();

    if (ids.length) {
      const [installmentsQ, commissionsQ] = await Promise.all([
        supabase.from("contract_installments").select("contract_id,paid_amount").in("contract_id", ids),
        supabase.from("contract_commissions").select("contract_id,amount,status").in("contract_id", ids),
      ]);
      if (installmentsQ.error) throw new Error(installmentsQ.error.message);
      if (commissionsQ.error) throw new Error(commissionsQ.error.message);
      for (const row of installmentsQ.data ?? []) {
        collectedByContract.set(
          row.contract_id,
          (collectedByContract.get(row.contract_id) ?? 0) + Number(row.paid_amount ?? 0),
        );
      }
      for (const row of commissionsQ.data ?? []) {
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
      const value = Number(row.net_price ?? 0);
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

      const mk = monthKey((row.signed_at ? `${row.signed_at}T00:00:00.000Z` : row.created_at) as string);
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
      scope: ownerFilter ? "own" : "team",
      projects: (projectsQ.data ?? []).map((row) => ({ id: row.id, name: row.name })),
      totals: finish(totals),
      byProject,
      byMonth,
    };
  });
