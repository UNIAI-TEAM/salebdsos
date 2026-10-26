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