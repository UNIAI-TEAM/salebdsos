import { SALE_ROLES, TEAM_VIEW_ROLES } from "./permissions";

/** Every report read is paginated and fails closed instead of returning partial totals. */
export async function readReportRows(query: any, order = "id"): Promise<any[]> {
  const rows: any[] = [];
  const sorted = query.order(order);
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await sorted.range(offset, offset + 499);
    if (error || !Array.isArray(data)) throw new Error("Không thể tải đầy đủ số liệu báo cáo. Vui lòng thử lại.");
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

export async function reportScope(sb: any, tenantId: string, userId: string, requestedOwner?: string) {
  const roles = await readReportRows(sb.from("user_roles").select("id,role").eq("tenant_id", tenantId).eq("user_id", userId));
  if (!roles.some((r) => SALE_ROLES.has(r.role))) throw new Error("Bạn không có quyền xem báo cáo của sàn này.");
  const canManage = roles.some((r) => TEAM_VIEW_ROLES.has(r.role));
  return { canManage, ownerFilter: canManage ? requestedOwner || null : userId };
}

export async function reportOwners(sb: any, tenantId: string, canManage: boolean) {
  if (!canManage) return [];
  const members = await readReportRows(sb.from("user_roles").select("id,user_id").eq("tenant_id", tenantId));
  const ids = [...new Set(members.map((r) => r.user_id))];
  const profiles = await readReportRelated(sb, "profiles", "user_id,full_name,email", "user_id", ids, "user_id");
  return profiles.map((p) => ({ id: p.user_id, name: p.full_name || p.email || "Sale" }));
}

export async function readReportRelated(sb: any, table: string, select: string, column: string, ids: string[], order = "id") {
  const rows: any[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    rows.push(...await readReportRows(sb.from(table).select(select).in(column, ids.slice(i, i + 100)), order));
  }
  return rows;
}