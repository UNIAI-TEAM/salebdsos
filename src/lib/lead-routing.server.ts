// Phân phối lead tự động theo dự án (chạy trong các route công khai nhận lead)
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LEAD_ROUTING_KEY, parseLeadRouting, routingPool, leastLoadedOwner, type LeadRoutingConfig } from "@/lib/lead-routing";

const SALE_ROLES = new Set(["owner", "admin", "manager", "agent"]);

export async function loadLeadRouting(tenantId: string): Promise<LeadRoutingConfig> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", LEAD_ROUTING_KEY)
    .maybeSingle();
  if (error) throw new Error("Không đọc được cấu hình phân phối khách");
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
  const slaDueAt = new Date(Date.now() + slaMinutes * 60_000).toISOString();

  if (input.currentOwnerId) {
    return { ownerUserId: input.currentOwnerId, slaMinutes, slaDueAt, autoAssigned: false };
  }
  if (!config.enabled) {
    return { ownerUserId: null, slaMinutes, slaDueAt, autoAssigned: false };
  }

  const pool = routingPool(config, input.projectId).filter(Boolean);
  if (!pool.length) {
    return { ownerUserId: null, slaMinutes, slaDueAt, autoAssigned: false };
  }

  // Chỉ nhận thành viên còn vai Sale trong workspace
  const { data: roleRows, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("user_id,role")
    .eq("tenant_id", input.tenantId)
    .in("user_id", pool);
  if (roleError) throw new Error("Không xác minh được nhóm Sale");
  const eligible = pool.filter((id) =>
    (roleRows ?? []).some((row) => row.user_id === id && SALE_ROLES.has(row.role)),
  );
  if (!eligible.length) {
    return { ownerUserId: null, slaMinutes, slaDueAt, autoAssigned: false };
  }

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  // Exact counts across all projects: never let a 1,000-row response cap skew load.
  const counts = await Promise.all(eligible.map(async (id) => {
    const { count, error } = await supabaseAdmin.from("leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", input.tenantId).eq("owner_user_id", id)
      .is("deleted_at", null).gte("created_at", since);
    if (error) throw new Error("Không tính được tải khách của Sale");
    return [id, count ?? 0] as const;
  }));
  const ownerUserId = leastLoadedOwner(eligible, new Map(counts));

  return { ownerUserId, slaMinutes, slaDueAt, autoAssigned: true };
}
