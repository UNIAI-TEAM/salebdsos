import { describe, expect, it } from "vitest";
import { mergeTotals, validateMergeDraft, validateSplitDraft, type SplitChildDraft } from "./plot-transform";

const parent = { code: "K1-08", area: 200, listing_status: "available" };
const child = (over: Partial<SplitChildDraft> = {}): SplitChildDraft => ({
  code: "K1-08-A", area: "100", price: "1000000000", map_row: "", map_col: "", ...over,
});

describe("validateSplitDraft", () => {
  it("chấp nhận tách hợp lệ 2 lô con đủ diện tích", () => {
    const r = validateSplitDraft(parent, [child(), child({ code: "K1-08-B" })]);
    expect(r.ok).toBe(true);
  });

  it("từ chối khi lô gốc không còn trống", () => {
    const r = validateSplitDraft({ ...parent, listing_status: "reserved" }, [child(), child({ code: "B" })]);
    expect(r).toEqual({ ok: false, error: "Chỉ tách được lô đang trống" });
  });

  it("từ chối khi tổng diện tích vượt lô gốc", () => {
    const r = validateSplitDraft(parent, [child({ area: "150" }), child({ code: "B", area: "100" })]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("vượt lô gốc");
  });

  it("từ chối mã lô con trùng nhau", () => {
    const r = validateSplitDraft(parent, [child(), child()]);
    expect(r).toEqual({ ok: false, error: "Mã lô con bị trùng: K1-08-A" });
  });

  it("từ chối khi chỉ có 1 lô con", () => {
    const r = validateSplitDraft(parent, [child()]);
    expect(r.ok).toBe(false);
  });
});

describe("validateMergeDraft", () => {
  const p = (over: Partial<{ code: string; listing_status: string; project_id: string }> = {}) => ({
    code: "K1-01", listing_status: "available", project_id: "p1", ...over,
  });

  it("chấp nhận ghép 2 lô trống cùng dự án", () => {
    expect(validateMergeDraft([p(), p({ code: "K1-02" })], "K1-G").ok).toBe(true);
  });

  it("từ chối khi một lô không còn trống", () => {
    const r = validateMergeDraft([p(), p({ code: "K1-02", listing_status: "sold" })], "K1-G");
    expect(r).toEqual({ ok: false, error: "Lô K1-02 không còn trống" });
  });

  it("từ chối khi khác dự án", () => {
    const r = validateMergeDraft([p(), p({ code: "K1-02", project_id: "p2" })], "K1-G");
    expect(r).toEqual({ ok: false, error: "Các lô phải cùng một dự án" });
  });

  it("từ chối khi thiếu mã lô mới", () => {
    expect(validateMergeDraft([p(), p({ code: "K1-02" })], " ")).toEqual({ ok: false, error: "Nhập mã cho lô mới" });
  });
});

describe("mergeTotals", () => {
  it("cộng diện tích và giá, bỏ qua giá trị null", () => {
    expect(mergeTotals([{ area: 100, price: 1e9 }, { area: null, price: 5e8 }])).toEqual({ area: 100, price: 1.5e9 });
  });
});
