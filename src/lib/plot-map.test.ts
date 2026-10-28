import { describe, expect, it } from "vitest";
import { buildPlotGrid, naturalCodeSort, plotStats, pricePerM2, type PlotUnit } from "./plot-map";

const unit = (over: Partial<PlotUnit>): PlotUnit => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  code: null,
  name: null,
  zone: null,
  area: null,
  direction: null,
  legal_status: null,
  price: 0,
  currency: "VND",
  listing_status: "available",
  hold_expires_at: null,
  map_row: null,
  map_col: null,
  ...over,
});

describe("naturalCodeSort", () => {
  it("sắp xếp số tự nhiên: K1-2 trước K1-10", () => {
    expect(["K1-10", "K1-2", "K1-1"].sort(naturalCodeSort)).toEqual(["K1-1", "K1-2", "K1-10"]);
  });
});

describe("buildPlotGrid", () => {
  it("gom theo khu, xếp ô theo hàng/cột, tách lô chưa đặt vị trí", () => {
    const grid = buildPlotGrid([
      unit({ code: "K1-02", zone: "K1", map_row: 1, map_col: 2 }),
      unit({ code: "K1-01", zone: "K1", map_row: 1, map_col: 1 }),
      unit({ code: "K1-11", zone: "K1" }),
      unit({ code: "K2-01", zone: "K2", map_row: 2, map_col: 3 }),
    ]);
    expect(grid.map((z) => z.zone)).toEqual(["K1", "K2"]);
    const k1 = grid[0];
    expect(k1.cells.map((c) => c.unit.code)).toEqual(["K1-01", "K1-02"]);
    expect(k1.rowCount).toBe(1);
    expect(k1.colCount).toBe(2);
    expect(k1.unplaced.map((u) => u.code)).toEqual(["K1-11"]);
    expect(grid[1].rowCount).toBe(2);
    expect(grid[1].colCount).toBe(3);
  });

  it("lô không có khu gom vào nhóm Chung", () => {
    const grid = buildPlotGrid([unit({ code: "L1" })]);
    expect(grid[0].zone).toBe("Chung");
    expect(grid[0].unplaced).toHaveLength(1);
  });
});

describe("plotStats", () => {
  it("đếm theo trạng thái, tính hấp thụ và giá trị còn bán", () => {
    const stats = plotStats([
      unit({ listing_status: "available", price: 1_000_000_000 }),
      unit({ listing_status: "reserved", price: 2_000_000_000 }),
      unit({ listing_status: "sold", price: 3_000_000_000 }),
      unit({ listing_status: "locked", price: 500_000_000 }),
    ]);
    expect(stats.total).toBe(4);
    expect(stats.byStatus.available).toBe(1);
    expect(stats.byStatus.sold).toBe(1);
    // còn bán = available + locked = 2/4 → hấp thụ 50%
    expect(stats.absorption).toBe(50);
    expect(stats.openValue).toBe(1_500_000_000);
  });

  it("danh sách rỗng không lỗi chia 0", () => {
    expect(plotStats([]).absorption).toBe(0);
  });
});

describe("pricePerM2", () => {
  it("tính đơn giá và trả null khi thiếu diện tích", () => {
    expect(pricePerM2(2_000_000_000, 100)).toBe(20_000_000);
    expect(pricePerM2(2_000_000_000, null)).toBeNull();
    expect(pricePerM2(0, 100)).toBeNull();
  });
});
