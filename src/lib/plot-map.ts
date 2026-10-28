// Sơ đồ lô đất nền / phân lô — logic thuần, dễ kiểm thử.
import {
  LISTING_STATUSES,
  OPEN_STATUSES,
  type ListingStatus,
} from "@/lib/property-types";

export type PlotUnit = {
  id: string;
  code: string | null;
  name: string | null;
  zone: string | null;
  area: number | null;
  direction: string | null;
  legal_status: string | null;
  price: number;
  currency: string;
  listing_status: ListingStatus;
  hold_expires_at: string | null;
  map_row: number | null;
  map_col: number | null;
  attributes?: Record<string, unknown> | null;
};

export type PlotCell = { row: number; col: number; unit: PlotUnit };
export type PlotZone = {
  zone: string;
  cells: PlotCell[];
  rowCount: number;
  colCount: number;
  /** Lô chưa đặt vị trí trên sơ đồ */
  unplaced: PlotUnit[];
};

/** Sắp xếp mã lô tự nhiên: K1-2 đứng trước K1-10. */
export function naturalCodeSort(a: string, b: string): number {
  const pa = a.split(/(\d+)/).filter(Boolean);
  const pb = b.split(/(\d+)/).filter(Boolean);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const xa = pa[i];
    const xb = pb[i];
    if (xa === undefined) return -1;
    if (xb === undefined) return 1;
    const na = Number(xa);
    const nb = Number(xb);
    const bothNum = Number.isFinite(na) && Number.isFinite(nb) && /^\d+$/.test(xa) && /^\d+$/.test(xb);
    if (bothNum) {
      if (na !== nb) return na - nb;
    } else {
      const c = xa.localeCompare(xb, "vi");
      if (c !== 0) return c;
    }
  }
  return 0;
}

/** Gom sản phẩm thành các khu, mỗi khu là lưới hàng × cột theo map_row/map_col. */
export function buildPlotGrid(units: PlotUnit[]): PlotZone[] {
  const byZone = new Map<string, PlotUnit[]>();
  for (const u of units) {
    const z = (u.zone ?? "").trim() || "Chung";
    const arr = byZone.get(z) ?? [];
    arr.push(u);
    byZone.set(z, arr);
  }
  const zones: PlotZone[] = [];
  for (const [zone, list] of [...byZone.entries()].sort((a, b) => naturalCodeSort(a[0], b[0]))) {
    const placed = list.filter((u) => u.map_row != null && u.map_col != null);
    const unplaced = list
      .filter((u) => u.map_row == null || u.map_col == null)
      .sort((a, b) => naturalCodeSort(a.code ?? a.name ?? "", b.code ?? b.name ?? ""));
    const cells: PlotCell[] = placed
      .map((u) => ({ row: u.map_row!, col: u.map_col!, unit: u }))
      .sort((a, b) => a.row - b.row || a.col - b.col);
    const rowCount = cells.reduce((m, c) => Math.max(m, c.row), 0);
    const colCount = cells.reduce((m, c) => Math.max(m, c.col), 0);
    zones.push({ zone, cells, rowCount, colCount, unplaced });
  }
  return zones;
}

export type PlotStats = {
  total: number;
  byStatus: Record<ListingStatus, number>;
  /** Tỷ lệ hấp thụ: (tổng - còn bán) / tổng */
  absorption: number;
  /** Tổng giá trị lô còn bán */
  openValue: number;
};

export function plotStats(units: PlotUnit[]): PlotStats {
  const byStatus = Object.fromEntries(LISTING_STATUSES.map((s) => [s, 0])) as Record<ListingStatus, number>;
  let openValue = 0;
  for (const u of units) {
    if (u.listing_status in byStatus) byStatus[u.listing_status] += 1;
    if (OPEN_STATUSES.includes(u.listing_status)) openValue += u.price || 0;
  }
  const total = units.length;
  const open = OPEN_STATUSES.reduce((s, k) => s + byStatus[k], 0);
  return {
    total,
    byStatus,
    absorption: total === 0 ? 0 : Math.round(((total - open) / total) * 100),
    openValue,
  };
}

/** Đơn giá / m² từ giá bán và diện tích. */
export function pricePerM2(price: number, area: number | null): number | null {
  if (!price || !area || area <= 0) return null;
  return Math.round(price / area);
}
