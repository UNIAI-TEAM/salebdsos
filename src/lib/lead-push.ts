export const SLA_PUSH_WARNING_MINUTES = 5;
export type LeadPushState = { owner_user_id: string | null; status: string; deleted_at: string | null; meta: unknown };
export function shouldDeliverLeadPush(lead: LeadPushState, userId: string, kind: string, deadline: string | null, now = Date.now()): boolean {
  if (lead.deleted_at || lead.owner_user_id !== userId) return false;
  if (kind === "assigned") return true;
  const meta = lead.meta && typeof lead.meta === "object" ? lead.meta as Record<string, unknown> : {};
  if (meta["sla_response_at"] || ["contacted", "won", "lost"].includes(lead.status)) return false;
  const due = Date.parse(deadline ?? "");
  return meta["sla_due_at"] === deadline && Number.isFinite(due) && now >= due - SLA_PUSH_WARNING_MINUTES * 60_000 && now < due;
}
export const LEAD_PUSH_COPY = {
  assigned: "Khách mới được giao",
  warning: "Khách sắp quá hạn SLA",
  body: "Mở Tổng quan Sale để liên hệ khách ngay.",
};

export type AgencyPushTarget = { user_id: string; tenant_id: string; sla_due_at: string; responded_at: string | null; status: string };
export function shouldDeliverAgencyPush(target: AgencyPushTarget | null, userId: string, tenantId: string, kind: string, deadline: string | null, now = Date.now()): boolean {
  if (!target || target.user_id !== userId || target.tenant_id !== tenantId || target.status === "closed") return false;
  if (kind === "agency_assigned") return true;
  if (kind !== "agency_sla_warning" || target.status !== "assigned" || target.responded_at || target.sla_due_at !== deadline) return false;
  const due = Date.parse(target.sla_due_at);
  return Number.isFinite(due) && now >= due - SLA_PUSH_WARNING_MINUTES * 60_000 && now < due;
}
export const AGENCY_PUSH_COPY = {
  assigned: "Đại lý nhận khách mới",
  warning: "Khách đại lý sắp quá hạn SLA",
  body: "Mở Đại lý & phân phối để xử lý khách được giao.",
};