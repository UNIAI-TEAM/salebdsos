import { describe, it, expect } from "vitest";
import { shouldDeliverLeadPush, SLA_PUSH_WARNING_MINUTES } from "./lead-push";
import { shouldDeliverAgencyPush } from "./lead-push";
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

const referral = { user_id: "partner-sale", tenant_id: "partner", sla_due_at: due, responded_at: null, status: "assigned" };
const warningTime = Date.parse("2026-10-26T02:55:00Z");
describe("agency push", () => {
  it("sends assignment only to the receiving agency Sale and tenant", () => {
    expect(shouldDeliverAgencyPush(referral, "partner-sale", "partner", "agency_assigned", null)).toBe(true);
    expect(shouldDeliverAgencyPush(referral, "master-sale", "partner", "agency_assigned", null)).toBe(false);
    expect(shouldDeliverAgencyPush(referral, "partner-sale", "master", "agency_assigned", null)).toBe(false);
  });
  it("warns five minutes before SLA, not early or expired", () => {
    expect(shouldDeliverAgencyPush(referral, "partner-sale", "partner", "agency_sla_warning", due, warningTime - 1)).toBe(false);
    expect(shouldDeliverAgencyPush(referral, "partner-sale", "partner", "agency_sla_warning", due, warningTime)).toBe(true);
    expect(shouldDeliverAgencyPush(referral, "partner-sale", "partner", "agency_sla_warning", due, Date.parse(due))).toBe(false);
  });
  it("stops reminders once Sale responds or closes the referral", () => {
    expect(shouldDeliverAgencyPush({ ...referral, responded_at: due }, "partner-sale", "partner", "agency_sla_warning", due, warningTime)).toBe(false);
    expect(shouldDeliverAgencyPush({ ...referral, status: "contacted" }, "partner-sale", "partner", "agency_sla_warning", due, warningTime)).toBe(false);
    expect(shouldDeliverAgencyPush({ ...referral, status: "closed" }, "partner-sale", "partner", "agency_assigned", null)).toBe(false);
  });
  it("rejects revoked grants, deleted leads and paused agencies represented by no target", () => {
    expect(shouldDeliverAgencyPush(null, "partner-sale", "partner", "agency_assigned", null)).toBe(false);
  });
  it("handover preserves SLA and blocks the old recipient", () => {
    const moved = { ...referral, user_id: "new-sale", tenant_id: "new-partner" };
    expect(shouldDeliverAgencyPush(moved, "partner-sale", "partner", "agency_sla_warning", due, warningTime)).toBe(false);
    expect(shouldDeliverAgencyPush(moved, "new-sale", "new-partner", "agency_sla_warning", due, warningTime)).toBe(true);
    expect(shouldDeliverAgencyPush(moved, "new-sale", "new-partner", "agency_sla_warning", "2026-10-26T03:05:00Z", warningTime)).toBe(false);
  });
});