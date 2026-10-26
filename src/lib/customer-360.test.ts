import { describe, it, expect } from "vitest";
import { buildTimeline, summarize, normPhone, matchesCustomerIdentity } from "./customer-360";

describe("customer 360", () => {
  it("normalizes +84 phone", () => expect(normPhone("+84 912 345 678")).toBe("0912345678"));
  it("does not match partial phone suffixes", () => expect(matchesCustomerIdentity({phone:"0912345678"},{phone:"9912345678"})).toBe(false));
  it("does not attach an unreviewed channel identity", () => expect(matchesCustomerIdentity({phone:"0912345678"},{phone:"0912345678",meta:{identity_review_required:true}})).toBe(false));
  it("matches full normalized phones", () => expect(matchesCustomerIdentity({phone:"0912345678"},{phone:"+84 912 345 678"})).toBe(true));
  it("sorts newest first across sources", () => {
    const t = buildTimeline({
      leads: [{ id: "1", created_at: "2026-01-01T00:00:00Z", source: "landing" }],
      calls: [{ id: "2", created_at: "2026-03-01T00:00:00Z", direction: "out" }],
      tickets: [{ id: "3", created_at: "2026-02-01T00:00:00Z", checked_in_at: "2026-02-05T00:00:00Z", code: "A" }],
    });
    expect(t.map((e) => e.id)).toEqual(["c2", "tc3", "t3", "l1"]);
  });
  it("outstanding = contract value minus paid, excludes cancelled", () => {
    const s = summarize({
      contracts: [{ id: "a", net_price: 3000, status: "active" }, { id: "b", net_price: 999, status: "cancelled" }],
      installments: [{ contract_id: "a", paid_amount: 1800 }, { contract_id: "b", paid_amount: 500 }],
    });
    expect(s.outstanding).toBe(1200);
  });
});
