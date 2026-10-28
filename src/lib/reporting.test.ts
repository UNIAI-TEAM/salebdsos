import { describe, it, expect } from "vitest";
import { contractFinancials, reportWindow, reportContractDate, reportCsv } from "./reporting";
import { readReportRows, reportScope } from "./reporting.server";

describe("report consistency", () => {
  it("includes exactly seven Vietnamese calendar days", () => {
    const w = reportWindow(7, new Date("2026-10-27T18:00:00Z"));
    expect(w.today).toBe("2026-10-28");
    expect(w.since).toBe("2026-10-22");
    expect(w.startIso).toBe("2026-10-21T17:00:00.000Z");
  });
  it("uses signature date even for contracts created earlier", () => {
    expect(reportContractDate({ signed_at: "2026-10-01", created_at: "2026-01-01T00:00:00Z" })).toBe("2026-10-01");
  });
  it("uses all rental installments, not one month's net_price", () => {
    const schedule = [{ amount: 30_000_000, paid_amount: 30_000_000 }, ...Array.from({ length: 12 }, () => ({ amount: 15_000_000, paid_amount: 0 }))];
    expect(contractFinancials({ contract_kind: "rental", net_price: 15_000_000 }, schedule)).toEqual({ value: 210_000_000, collected: 30_000_000, outstanding: 180_000_000 });
  });
  it("preserves discounted sale value and paid amounts", () => {
    expect(contractFinancials({ contract_kind: "sale", net_price: 1_940_000_000 }, [{ amount: 1_940_000_000, paid_amount: 60_000_000 }])).toEqual({ value: 1_940_000_000, collected: 60_000_000, outstanding: 1_880_000_000 });
  });
  it("escapes spreadsheet formulas and exact amounts", () => {
    expect(reportCsv(["Dự án", "Giá trị"], [["=1+1", 1940000000]])).toContain("'=1+1,1940000000");
  });
  it("reads rows beyond the first page", async () => {
    const q = { order: () => q, range: async (a: number, b: number) => ({ data: Array.from({ length: Math.max(0, Math.min(501, b + 1) - a) }, (_, i) => ({ id: a + i })), error: null }) };
    expect(await readReportRows(q)).toHaveLength(501);
  });
  it("rejects a failed later page instead of partial totals", async () => {
    const q = { order: () => q, range: async (a: number) => a ? { data: null, error: {} } : { data: Array(500).fill({}), error: null } };
    await expect(readReportRows(q)).rejects.toThrow("Không thể tải đầy đủ");
  });
  it("Sale cannot request another Sale's reports", async () => {
    const q = { select: () => q, eq: () => q, order: () => q, range: async () => ({ data: [{ role: "agent" }], error: null }) };
    expect(await reportScope({ from: () => q }, "tenant", "sale-a", "sale-b")).toEqual({ canManage: false, ownerFilter: "sale-a" });
  });
  it("manager can filter a Sale without granting editing rights", async () => {
    const q = { select: () => q, eq: () => q, order: () => q, range: async () => ({ data: [{ role: "manager" }], error: null }) };
    expect(await reportScope({ from: () => q }, "tenant", "manager", "sale-b")).toEqual({ canManage: true, ownerFilter: "sale-b" });
  });
  it("denies access without a business role", async () => {
    const q = { select: () => q, eq: () => q, order: () => q, range: async () => ({ data: [], error: null }) };
    await expect(reportScope({ from: () => q }, "other-tenant", "sale-a")).rejects.toThrow("không có quyền");
  });
});