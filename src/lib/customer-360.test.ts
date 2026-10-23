import { describe, it, expect } from "vitest";
import { buildTimeline, summarize, normPhone } from "./customer-360";

describe("customer 360", () => {
  it("normalizes +84 phone", () => expect(normPhone("+84 912 345 678")).toBe("0912345678"));
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
      contracts: [{ net_price: 3000, status: "active" }, { net_price: 999, status: "cancelled" }],
      installments: [{ paid_amount: 1800 }],
    });
    expect(s.outstanding).toBe(1200);
  });
});
