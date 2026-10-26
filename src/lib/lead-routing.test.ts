import { describe, expect, it, vi } from "vitest";
import { DEFAULT_LEAD_ROUTING, leadSlaDeadline, leastLoadedOwner, routingPool } from "./lead-routing";

describe("lead assignment rules", () => {
  it("selects the smallest 30-day load", () => {
    expect(leastLoadedOwner(["a", "b", "c"], new Map([["a", 20], ["b", 4], ["c", 9]]))).toBe("b");
  });
  it("uses only the configured project pool", () => {
    expect(routingPool({ ...DEFAULT_LEAD_ROUTING, fallbackUserIds: ["fallback"], projectRules: [{ projectId: "p", userIds: ["project-sale"] }] }, "p")).toEqual(["project-sale"]);
  });
  it("uses fallback when no project team is configured", () => {
    expect(routingPool({ ...DEFAULT_LEAD_ROUTING, fallbackUserIds: ["fallback"] }, "p")).toEqual(["fallback"]);
  });
  it("keeps the deadline recorded at entry despite subsequent config changes", () => {
    expect(leadSlaDeadline({ created_at: "2026-10-26T02:00:00Z", meta: { sla_due_at: "2026-10-26T02:15:00Z" } }, 30)).toBe(Date.parse("2026-10-26T02:15:00Z"));
  });
  it("uses 30 minutes for legacy leads", () => {
    expect(leadSlaDeadline({ created_at: "2026-10-26T02:00:00Z" }, 30)).toBe(Date.parse("2026-10-26T02:30:00Z"));
  });
  it("stops the first-response clock once a Sale responds", () => {
    expect(leadSlaDeadline({ created_at: "2026-10-26T02:00:00Z", meta: { sla_due_at: "2026-10-26T02:15:00Z", sla_response_at: "2026-10-26T02:05:00Z" } }, 30)).toBeNull();
  });
});

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: vi.fn() } }));
describe("personal channel routing", () => {
  it("retains the personal Sale and starts a 15-minute SLA even when common routing is off", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { value: { enabled: false, slaMinutes: 15 } }, error: null }) };
    vi.mocked(supabaseAdmin.from).mockReturnValue(query as never);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T02:00:00Z"));
    try {
      const { assignLeadOwner } = await import("./lead-routing.server");
      expect(await assignLeadOwner({ tenantId: "tenant", currentOwnerId: "personal-sale" })).toEqual({ ownerUserId: "personal-sale", slaMinutes: 15, slaDueAt: "2026-10-26T02:15:00.000Z", autoAssigned: false });
    } finally { vi.useRealTimers(); }
  });
});