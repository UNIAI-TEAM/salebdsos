import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COMMISSION_RULES_KEY, commissionRulesSchema } from "@/lib/commission-rules";

const MANAGER_ROLES = new Set(["owner", "admin", "manager", "platform_admin"]);
const SALE_ROLES = new Set(["owner", "admin", "manager", "agent", "platform_admin"]);

async function roles(context: any, tenantId: string) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  const list = (data ?? []).map((row: any) => row.role);
  if (!list.some((role: string) => SALE_ROLES.has(role))) {
    throw new Error("Bạn không có quyền xem chính sách hoa hồng của workspace này");
  }
  return { canManage: list.some((role: string) => MANAGER_ROLES.has(role)) };
}

export const getCommissionRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { canManage } = await roles(context, data.tenantId);
    const { supabase } = context;
    const { loadCommissionRules } = await import("@/lib/commission.server");
    const rules = await loadCommissionRules(supabase, data.tenantId);

    const [projectsQ, teamsQ, rolesQ, membersQ] = await Promise.all([
      supabase.from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null).order("name"),
      supabase.from("teams").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null).order("name"),
      supabase.from("user_roles").select("user_id,role").eq("tenant_id", data.tenantId),
      supabase.from("team_members").select("team_id,user_id,is_lead").eq("tenant_id", data.tenantId),
    ]);

    const saleRoles = (rolesQ.data ?? []).filter((row: any) => SALE_ROLES.has(row.role));
    const ids = [...new Set(saleRoles.map((row: any) => row.user_id))] as string[];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("user_id,full_name,email").in("user_id", ids)
      : { data: [] as any[] };
    const teamByUser = new Map<string, string>();
    for (const row of membersQ.data ?? []) if (!teamByUser.has(row.user_id)) teamByUser.set(row.user_id, row.team_id);

    const members = saleRoles.map((row: any) => {
      const profile = (profiles ?? []).find((p: any) => p.user_id === row.user_id);
      return {
        user_id: row.user_id,
        name: profile?.full_name || profile?.email?.split("@")[0] || "Thành viên",
        role: row.role,
        team_id: teamByUser.get(row.user_id) ?? null,
      };
    });

    return {
      canManage,
      rules,
      projects: projectsQ.data ?? [],
      teams: (teamsQ.data ?? []).map((team: any) => ({
        ...team,
        leadUserId: (membersQ.data ?? []).find((m: any) => m.team_id === team.id && m.is_lead)?.user_id ?? null,
        memberCount: (membersQ.data ?? []).filter((m: any) => m.team_id === team.id).length,
      })),
      members,
    };
  });

export const saveCommissionRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), rules: commissionRulesSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { canManage } = await roles(context, data.tenantId);
    if (!canManage) throw new Error("Chỉ quản lý mới được sửa chính sách hoa hồng");
    const { error } = await context.supabase
      .from("settings")
      .upsert(
        {
          tenant_id: data.tenantId,
          key: COMMISSION_RULES_KEY,
          value: data.rules,
          updated_by: context.userId,
        } as never,
        { onConflict: "tenant_id,key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recalcContractCommissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ contractId: z.string().uuid(), overridePercent: z.number().min(0).max(100).nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: contract, error } = await supabase
      .from("contracts")
      .select("id,tenant_id,project_id,owner_user_id,net_price")
      .eq("id", data.contractId)
      .single();
    if (error) throw new Error(error.message);
    const { canManage } = await roles(context, contract.tenant_id);
    if (!canManage) throw new Error("Chỉ quản lý mới được tính lại hoa hồng");

    const { applyCommissionPlan } = await import("@/lib/commission.server");
    const result = await applyCommissionPlan(supabase, {
      tenantId: contract.tenant_id,
      contractId: contract.id,
      projectId: contract.project_id,
      ownerUserId: contract.owner_user_id,
      netPrice: Number(contract.net_price ?? 0),
      overridePercent: data.overridePercent ?? null,
    });
    return { ok: true, applied: result.applied, percent: result.plan.percent, source: result.plan.source };
  });

export const recalcTenantCommissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { canManage } = await roles(context, data.tenantId);
    if (!canManage) throw new Error("Chỉ quản lý mới được tính lại hoa hồng");
    const { supabase } = context;
    const { data: contracts, error } = await supabase
      .from("contracts")
      .select("id,tenant_id,project_id,owner_user_id,net_price")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .in("status", ["draft", "active", "completed"]);
    if (error) throw new Error(error.message);

    const { applyCommissionPlan, loadCommissionRules } = await import("@/lib/commission.server");
    const rules = await loadCommissionRules(supabase, data.tenantId);
    let updated = 0;
    for (const contract of contracts ?? []) {
      const result = await applyCommissionPlan(supabase, {
        tenantId: data.tenantId,
        contractId: contract.id,
        projectId: contract.project_id,
        ownerUserId: contract.owner_user_id,
        netPrice: Number(contract.net_price ?? 0),
        rules,
      });
      if (!result.skipped) updated += 1;
    }
    return { ok: true, contracts: contracts?.length ?? 0, updated };
  });
