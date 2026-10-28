import { describe, expect, it } from "vitest";
import {
  applicablePolicies, bestQuote, policyApplies, quoteDiscount, type DiscountPolicy,
} from "./payment-discount";

const pol = (over: Partial<DiscountPolicy>): DiscountPolicy => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  tenant_id: "t1",
  project_id: null,
  name: "CK nhanh",
  within_days: 7,
  discount_percent: 3,
  product_kinds: ["land_plot", "subdivision"],
  active: true,
  sort: 0,
  ...over,
});

describe("policyApplies", () => {
  it("chính sách toàn sàn áp dụng cho mọi dự án đúng loại hình", () => {
    expect(policyApplies(pol({}), { projectId: "p1", kind: "land_plot" })).toBe(true);
    expect(policyApplies(pol({}), { projectId: "p1", kind: "apartment" })).toBe(false);
  });
  it("chính sách theo dự án chỉ áp dụng đúng dự án đó", () => {
    const p = pol({ project_id: "p1" });
    expect(policyApplies(p, { projectId: "p1", kind: "land_plot" })).toBe(true);
    expect(policyApplies(p, { projectId: "p2", kind: "land_plot" })).toBe(false);
  });
  it("chính sách đã tắt không áp dụng", () => {
    expect(policyApplies(pol({ active: false }), { projectId: null, kind: "land_plot" })).toBe(false);
  });
});

describe("applicablePolicies", () => {
  it("sắp xếp % cao trước, hạn dài hơn sau", () => {
    const list = applicablePolicies(
      [pol({ id: "a", discount_percent: 2 }), pol({ id: "b", discount_percent: 5, within_days: 3 }), pol({ id: "c", discount_percent: 5, within_days: 10 })],
      { projectId: null, kind: "land_plot" },
    );
    expect(list.map((p) => p.id)).toEqual(["c", "b", "a"]);
  });
});

describe("quoteDiscount", () => {
  it("tính tiền giảm, giá net và hạn thanh toán", () => {
    const q = quoteDiscount(2_000_000_000, pol({ discount_percent: 3, within_days: 7 }), new Date("2026-10-28T00:00:00Z"));
    expect(q.amount).toBe(60_000_000);
    expect(q.net).toBe(1_940_000_000);
    expect(q.deadline.toISOString().slice(0, 10)).toBe("2026-11-04");
  });
  it("không bao giờ âm giá", () => {
    expect(quoteDiscount(100, pol({ discount_percent: 150 })).net).toBe(0);
  });
});

describe("bestQuote", () => {
  it("chọn chính sách tốt nhất hoặc null khi không có", () => {
    const best = bestQuote(1_000_000_000, [pol({ discount_percent: 2 }), pol({ discount_percent: 4 })], { projectId: null, kind: "land_plot" });
    expect(best?.policy.discount_percent).toBe(4);
    expect(best?.amount).toBe(40_000_000);
    expect(bestQuote(1_000_000_000, [], { projectId: null, kind: "land_plot" })).toBeNull();
  });
});
