import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SALE_ROLES, TEAM_VIEW_ROLES } from "@/lib/permissions";
import { AGING_BUCKETS, agingBucket, daysOverdue, type AgingBucket } from "@/lib/debt-aging";

export type AgingItem = {
  installmentId: string;
  contractId: string;
  contractCode: string;
  customerName: string;
  projectName: string;
  ownerName: string;
  name: string;
  dueDate: string | null;
  outstanding: number;
  daysOverdue: number;
  bucket: AgingBucket;
};

export const getDebtAging = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), projectId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = (context as any).supabase;
    const { data: r } = await sb.from("user_roles").select("role").eq("tenant_id", data.tenantId).eq("user_id", context.userId);
    const roles = (r ?? []).map((x: any) => x.role as string);
    if (!roles.some((x: string) => SALE_ROLES.has(x))) throw new Error("Bạn không có quyền xem công nợ");
    const team = roles.some((x: string) => TEAM_VIEW_ROLES.has(x));

    let cq = sb
      .from("contracts")
      .select("id,code,project_id,customer_id,lead_id,owner_user_id")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .in("status", ["draft", "active"]);
    if (!team) cq = cq.eq("owner_user_id", context.userId);
    if (data.projectId) cq = cq.eq("project_id", data.projectId);
    const { data: contracts, error } = await cq.limit(2000);
    if (error) throw new Error(error.message);
    const ids = (contracts ?? []).map((c: any) => c.id);

    const [{ data: ins }, { data: projects }, { data: customers }, { data: leads }, { data: profiles }] = await Promise.all([
      ids.length ? sb.from("contract_installments").select("id,contract_id,name,amount,paid_amount,due_date").in("contract_id", ids) : { data: [] },
      sb.from("projects").select("id,name").eq("tenant_id", data.tenantId),
      sb.from("customers").select("id,full_name").eq("tenant_id", data.tenantId).limit(5000),
      sb.from("leads").select("id,full_name").eq("tenant_id", data.tenantId).limit(5000),
      sb.from("profiles").select("user_id,full_name,email"),
    ]);
    const pName = new Map((projects ?? []).map((p: any) => [p.id, p.name]));
    const cName = new Map((customers ?? []).map((p: any) => [p.id, p.full_name]));
    const lName = new Map((leads ?? []).map((p: any) => [p.id, p.full_name]));
    const uName = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name || p.email]));
    const cById = new Map((contracts ?? []).map((c: any) => [c.id, c]));
    const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10); // giờ Việt Nam

    const items: AgingItem[] = [];
    for (const i of ins ?? []) {
      const outstanding = Math.max(0, Number(i.amount) - Number(i.paid_amount ?? 0));
      if (outstanding <= 0) continue;
      const c: any = cById.get(i.contract_id);
      items.push({
        installmentId: i.id,
        contractId: c.id,
        contractCode: c.code,
        customerName: (cName.get(c.customer_id) as string) || (lName.get(c.lead_id) as string) || "—",
        projectName: (pName.get(c.project_id) as string) || "—",
        ownerName: (uName.get(c.owner_user_id) as string) || "—",
        name: i.name,
        dueDate: i.due_date,
        outstanding,
        daysOverdue: i.due_date ? daysOverdue(i.due_date, today) : 0,
        bucket: agingBucket(i.due_date, today),
      });
    }
    items.sort((a, b) => b.daysOverdue - a.daysOverdue);

    const totals = Object.fromEntries(AGING_BUCKETS.map((b) => [b, { amount: 0, count: 0 }])) as Record<AgingBucket, { amount: number; count: number }>;
    for (const it of items) { totals[it.bucket].amount += it.outstanding; totals[it.bucket].count += 1; }

    const byContract = new Map<string, { contractId: string; contractCode: string; customerName: string; projectName: string; ownerName: string; total: number; maxDays: number } & Record<AgingBucket, number>>();
    for (const it of items) {
      const row = byContract.get(it.contractId) ?? {
        contractId: it.contractId, contractCode: it.contractCode, customerName: it.customerName, projectName: it.projectName, ownerName: it.ownerName,
        total: 0, maxDays: 0, not_due: 0, due: 0, d1_15: 0, d16_30: 0, d30_plus: 0,
      };
      row[it.bucket] += it.outstanding;
      row.total += it.outstanding;
      row.maxDays = Math.max(row.maxDays, it.daysOverdue);
      byContract.set(it.contractId, row);
    }
    return {
      today,
      scope: team ? "team" : "own",
      projects: projects ?? [],
      totals,
      contracts: [...byContract.values()].sort((a, b) => b.maxDays - a.maxDays || b.total - a.total),
      items,
    };
  });
