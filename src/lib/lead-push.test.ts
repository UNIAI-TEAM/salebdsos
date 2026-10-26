import { describe, it, expect } from "vitest";
import { shouldDeliverLeadPush, SLA_PUSH_WARNING_MINUTES } from "./lead-push";
const due = "2026-10-26T03:00:00Z";
const lead = { owner_user_id: "sale-a", status: "new", deleted_at: null, meta: { sla_due_at: due } };
describe("lead push delivery", () => {
  it("notifies only assigned Sale", () => {
    expect(shouldDeliverLeadPush(lead, "sale-a", "assigned", null)).toBe(true);
    expect(shouldDeliverLeadPush(lead, "sale-b", "assigned", null)).toBe(false);
  });
  it("warns within five minutes, never early or after expiry", () => {
    expect(SLA_PUSH_WARNING_MINUTES).toBe(5);
    expect(shouldDeliverLeadPush(lead, "sale-a", "sla_warning", due, Date.parse("2026-10-26T02:54:59Z"))).toBe(false);
    expect(shouldDeliverLeadPush(lead, "sale-a", "sla_warning", due, Date.parse("2026-10-26T02:55:00Z"))).toBe(true);
    expect(shouldDeliverLeadPush(lead, "sale-a", "sla_warning", due, Date.parse(due))).toBe(false);
  });
  it("stops SLA warnings after a response", () => {
    expect(shouldDeliverLeadPush({ ...lead, meta: { sla_due_at: due, sla_response_at: "2026-10-26T02:50:00Z" } }, "sale-a", "sla_warning", due, Date.parse("2026-10-26T02:56:00Z"))).toBe(false);
  });
  it("rejects changed deadlines and deleted leads", () => {
    expect(shouldDeliverLeadPush(lead, "sale-a", "sla_warning", "2026-10-26T03:01:00Z", Date.parse("2026-10-26T02:56:00Z"))).toBe(false);
    expect(shouldDeliverLeadPush({ ...lead, deleted_at: due }, "sale-a", "assigned", null)).toBe(false);
  });
});