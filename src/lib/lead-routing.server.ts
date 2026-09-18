// Phân phối lead tự động theo dự án (chạy trong các route công khai nhận lead)
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LEAD_ROUTING_KEY, parseLeadRouting, type LeadRoutingConfig } from "@/lib/lead-routing";

const SALE_ROLES = new Set(["owner", "admin", "manager", "agent"]);

export async function loadLeadRouting(tenantId: string): Promise<LeadRoutingConfig> {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", LEAD_ROUTING_KEY)
    .maybeSingle();
  return parseLeadRouting(data?.value);
}

export type LeadAssignment = {
  ownerUserId: string | null;
  slaMinutes: number;
  slaDueAt: string | null;
  autoAssigned: boolean;
};

/**
 * Chọn Sale nhận lead theo luật của dự án (luân phiên theo tải: ai đang ít lead hơn thì nhận trước).
 * Nếu lead đã có chủ (ví dụ lead từ danh thiếp) thì giữ nguyên, chỉ tính hạn SLA.
 */
export async function assignLeadOwner(input: {
  tenantId: string;
  projectId?: string | null;
  currentOwnerId?: string | null;
}): Promise<LeadAssignment> {
  const config = await loadLeadRouting(input.tenantId);
  const slaMinutes = config.slaMinutes;
  const slaDueAt = config.enabled
    ? new Date(Date.now() + slaMinutes * 60_000).toISOString()
    : null;

  if (input.currentOwnerId) {
    return { ownerUserId: input.currentOwnerId, slaMinutes, slaDueAt, autoAssigned: false };
  }
  if (!config.enabled) {
    return { ownerUserId: null, slaMinutes, slaDueAt: null, autoAssigned: false };
  }

  const rule = input.projectId
    ? config.projectRules.find((item) => item.projectId === input.projectId)
    : undefined;
  const pool = (rule?.userIds.length ? rule.userIds : config.fallbackUserIds).filter(Boolean);
  if (!pool.length) {
    return { ownerUserId: null, slaMinutes, slaDueAt, autoAssigned: false };
  }

  // Chỉ nhận thành viên còn vai Sale trong workspace
  const { data: roleRows } = await supabaseAdmin
    .from("user_roles")
    .select("user_id,role")
    .eq("tenant_id", input.tenantId)
    .in("user_id", pool);
  const eligible = pool.filter((id) =>
    (roleRows ?? []).some((row) => row.user_id === id && SALE_ROLES.has(row.role)),
  );
  if (!eligible.length) {
    return { ownerUserId: null, slaMinutes, slaDueAt, autoAssigned: false };
  }

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  let query = supabaseAdmin
    .from("leads")
    .select("owner_user_id")
    .eq("tenant_id", input.tenantId)
    .in("owner_user_id", eligible)
    .is("deleted_at", null)
    .gte("created_at", since);
  if (input.projectId) query = query.eq("project_id", input.projectId);
  const { data: recent } = await query;

  const load = new Map<string, number>(eligible.map((id) => [id, 0]));
  for (const row of recent ?? []) {
    if (row.owner_user_id && load.has(row.owner_user_id)) {
      load.set(row.owner_user_id, (load.get(row.owner_user_id) ?? 0) + 1);
    }
  }
  let ownerUserId = eligible[0]!;
  for (const id of eligible) {
    if ((load.get(id) ?? 0) < (load.get(ownerUserId) ?? 0)) ownerUserId = id;
  }

  return { ownerUserId, slaMinutes, slaDueAt, autoAssigned: true };
}
