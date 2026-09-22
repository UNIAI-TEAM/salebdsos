import {
  COMMISSION_RULES_KEY,
  buildCommissionPlan,
  parseCommissionRules,
  type CommissionPlan,
  type CommissionRules,
} from "@/lib/commission-rules";

type Sb = any;

export async function loadCommissionRules(supabase: Sb, tenantId: string): Promise<CommissionRules> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", COMMISSION_RULES_KEY)
    .maybeSingle();
  return parseCommissionRules(data?.value);
}

async function nameOf(supabase: Sb, userId: string | null | undefined) {
  if (!userId) return null;
  const { data } = await supabase.from("profiles").select("full_name,email").eq("user_id", userId).maybeSingle();
  return data?.full_name || data?.email?.split("@")[0] || null;
}

/** Nhóm của một sale trong workspace (nhóm đầu tiên) + trưởng nhóm */
export async function resolveTeamContext(supabase: Sb, tenantId: string, userId: string | null | undefined) {
  if (!userId) return { teamId: null as string | null, teamLeadUserId: null as string | null };
  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id,is_lead")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);
  const teamId = memberships?.[0]?.team_id ?? null;
  if (!teamId) return { teamId: null, teamLeadUserId: null };
  const { data: leads } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("team_id", teamId)
    .eq("is_lead", true)
    .limit(1);
  return { teamId, teamLeadUserId: leads?.[0]?.user_id ?? null };
}

export async function planCommissionForContract(
  supabase: Sb,
  input: {
    tenantId: string;
    projectId: string | null;
    ownerUserId: string | null;
    netPrice: number;
    overridePercent?: number | null;
    rules?: CommissionRules;
  },
): Promise<CommissionPlan & { enabled: boolean }> {
  const rules = input.rules ?? (await loadCommissionRules(supabase, input.tenantId));
  const team = await resolveTeamContext(supabase, input.tenantId, input.ownerUserId);
  const [ownerName, leadName, managerName] = await Promise.all([
    nameOf(supabase, input.ownerUserId),
    nameOf(supabase, team.teamLeadUserId),
    nameOf(supabase, rules.manager_user_id),
  ]);
  const plan = buildCommissionPlan(rules, {
    netPrice: input.netPrice,
    projectId: input.projectId,
    teamId: team.teamId,
    ownerUserId: input.ownerUserId,
    ownerName,
    teamLeadUserId: team.teamLeadUserId,
    teamLeadName: leadName,
    managerName,
    overridePercent: input.overridePercent ?? null,
  });
  return { ...plan, enabled: rules.enabled };
}

/**
 * Ghi hoa hồng theo chính sách vào hợp đồng.
 * Giữ nguyên các dòng đã duyệt / đã trả, chỉ thay các dòng đang chờ.
 */
export async function applyCommissionPlan(
  supabase: Sb,
  input: {
    tenantId: string;
    contractId: string;
    projectId: string | null;
    ownerUserId: string | null;
    netPrice: number;
    overridePercent?: number | null;
    rules?: CommissionRules;
  },
) {
  const plan = await planCommissionForContract(supabase, input);
  if (!plan.enabled) return { applied: 0, skipped: true, plan };

  const { data: existing } = await supabase
    .from("contract_commissions")
    .select("id,status,amount")
    .eq("contract_id", input.contractId);
  const locked = (existing ?? []).filter((row: any) => row.status !== "pending");
  const lockedAmount = locked.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0);

  const pendingIds = (existing ?? []).filter((row: any) => row.status === "pending").map((row: any) => row.id);
  if (pendingIds.length) {
    await supabase.from("contract_commissions").delete().in("id", pendingIds);
  }

  // Quỹ còn lại sau khi trừ các dòng đã chốt
  const remaining = Math.max(0, plan.pool - lockedAmount);
  const scale = plan.pool > 0 ? remaining / plan.pool : 0;
  const rows = plan.rows
    .map((row) => ({ ...row, amount: Math.round(row.amount * scale) }))
    .filter((row) => row.amount > 0);

  if (rows.length) {
    const { error } = await supabase.from("contract_commissions").insert(
      rows.map((row) => ({
        tenant_id: input.tenantId,
        contract_id: input.contractId,
        beneficiary_user_id: row.beneficiary_user_id,
        beneficiary_name: row.beneficiary_name,
        role_label: row.role_label,
        percent: row.percent,
        amount: row.amount,
        status: "pending",
        note: `Tự tính theo ${plan.source.toLowerCase()} (${plan.percent}%)`,
      })),
    );
    if (error) throw new Error(error.message);
  }
  return { applied: rows.length, skipped: false, plan };
}
