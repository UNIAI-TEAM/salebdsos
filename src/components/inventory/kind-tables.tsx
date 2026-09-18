// Bảng giá và bảng trạng thái theo từng loại hình BĐS — dùng chung cho giỏ hàng (nội bộ) và landing (công khai).
import { useMemo } from "react";
import {
  KIND_CONFIG,
  KIND_PRICE_COLUMNS,
  LISTING_STATUSES,
  LISTING_STATUS_LABEL,
  LISTING_STATUS_TONE,
  PROPERTY_KINDS,
  type ListingStatus,
  type PriceColumn,
  type PropertyKind,
} from "@/lib/property-types";

export type UnitLike = {
  id: string;
  name?: string | null;
  code?: string | null;
  product_type?: string | null;
  zone?: string | null;
  floor?: number | null;
  area?: number | null;
  usable_area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  direction?: string | null;
  legal_status?: string | null;
  price?: number | null;
  currency?: string | null;
  listing_status?: string | null;
  attributes?: Record<string, unknown> | null;
};

export function formatMoneyShort(v?: number | null) {
  if (!v) return "—";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(v % 1_000_000_000 === 0 ? 0 : 1)} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} tr`;
  return v.toLocaleString("vi-VN");
}

const asKind = (v?: string | null): PropertyKind =>
  v && (PROPERTY_KINDS as readonly string[]).includes(v) ? (v as PropertyKind) : "apartment";

const asStatus = (v?: string | null): ListingStatus =>
  v && (LISTING_STATUSES as readonly string[]).includes(v) ? (v as ListingStatus) : "available";

/** Nhóm sản phẩm theo loại hình, giữ thứ tự loại hình khai báo. */
export function groupUnitsByKind<T extends UnitLike>(units: T[]) {
  const map = new Map<PropertyKind, T[]>();
  for (const u of units) {
    const k = asKind(u.product_type);
    const arr = map.get(k) ?? [];
    arr.push(u);
    map.set(k, arr);
  }
  return PROPERTY_KINDS.filter((k) => map.has(k)).map((k) => ({
    kind: k,
    label: KIND_CONFIG[k].label,
    items: map.get(k)!,
  }));
}

function cellValue(u: UnitLike, col: PriceColumn): string {
  if (col.store === "computed") {
    if (col.key === "unit_price") {
      const area = Number(u.area ?? 0);
      const price = Number(u.price ?? 0);
      if (!area || !price) return "—";
      const per = price / area;
      return per >= 1_000_000 ? `${(per / 1_000_000).toFixed(1)} tr/m²` : `${Math.round(per).toLocaleString("vi-VN")} đ/m²`;
    }
    return "—";
  }
  const raw =
    col.store === "attr"
      ? (u.attributes ?? {})[col.key]
      : (u as unknown as Record<string, unknown>)[col.key];
  if (raw == null || raw === "") return "—";
  if (col.key === "price") return formatMoneyShort(Number(raw));
  const text = typeof raw === "number" ? raw.toLocaleString("vi-VN") : String(raw);
  return col.suffix ? `${text} ${col.suffix}` : text;
}

function sortUnits<T extends UnitLike>(items: T[]) {
  return [...items].sort(
    (a, b) =>
      String(a.zone ?? "").localeCompare(String(b.zone ?? ""), "vi") ||
      (a.floor ?? 0) - (b.floor ?? 0) ||
      String(a.code ?? a.name ?? "").localeCompare(String(b.code ?? b.name ?? ""), "vi"),
  );
}

/** Bảng giá riêng theo loại hình. */
export function KindPriceTable({
  kind,
  items,
  showStatus = true,
  className,
}: {
  kind: PropertyKind;
  items: UnitLike[];
  showStatus?: boolean;
  className?: string;
}) {
  const cols = KIND_PRICE_COLUMNS[kind];
  const rows = useMemo(() => sortUnits(items), [items]);
  if (!rows.length) return null;
  return (
    <div className={`overflow-x-auto ${className ?? ""}`}>
      <table className="w-full min-w-[640px] text-[13px]">
        <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            {cols.map((c) => (
              <th key={c.key} className={`py-2 pr-3 font-medium ${c.align === "right" ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
            {showStatus ? <th className="py-2 text-right font-medium">Trạng thái</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-t border-border">
              {cols.map((c) => (
                <td
                  key={c.key}
                  className={`py-2 pr-3 ${c.align === "right" ? "text-right" : ""} ${
                    c.key === "code" ? "font-semibold" : c.key === "price" ? "font-semibold text-primary" : "text-muted-foreground"
                  }`}
                >
                  {c.key === "code" ? cellValue(u, c) === "—" ? u.name || "—" : cellValue(u, c) : cellValue(u, c)}
                </td>
              ))}
              {showStatus ? (
                <td className="py-2 text-right">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[11px] ${
                      LISTING_STATUS_TONE[asStatus(u.listing_status)]
                    }`}
                  >
                    {LISTING_STATUS_LABEL[asStatus(u.listing_status)]}
                  </span>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Bảng trạng thái (sơ đồ) riêng theo loại hình: chung cư theo tầng, đất nền/phân lô theo khu, nhà đất dạng danh sách. */
export function KindStatusBoard({
  kind,
  items,
  onSelect,
  className,
}: {
  kind: PropertyKind;
  items: UnitLike[];
  onSelect?: (u: UnitLike) => void;
  className?: string;
}) {
  const view = KIND_CONFIG[kind].view;
  const groups = useMemo(() => {
    const map = new Map<string, UnitLike[]>();
    for (const u of sortUnits(items)) {
      const key =
        view === "floor-grid"
          ? `${KIND_CONFIG[kind].zoneLabel} ${u.zone ?? "—"} • Tầng ${u.floor ?? "—"}`
          : view === "zone-grid"
            ? `${KIND_CONFIG[kind].zoneLabel} ${u.zone ?? "—"}`
            : "Danh sách sản phẩm";
      const arr = map.get(key) ?? [];
      arr.push(u);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [items, kind, view]);

  const counts = useMemo(() => {
    const c: Partial<Record<ListingStatus, number>> = {};
    for (const u of items) {
      const s = asStatus(u.listing_status);
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [items]);

  if (!items.length) return null;

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <div className="flex flex-wrap gap-1.5">
        {LISTING_STATUSES.filter((s) => counts[s]).map((s) => (
          <span key={s} className={`rounded-full border px-2.5 py-1 text-[11px] ${LISTING_STATUS_TONE[s]}`}>
            {LISTING_STATUS_LABEL[s]} · {counts[s]}
          </span>
        ))}
      </div>
      {groups.map(([group, units]) => (
        <div key={group} className="rounded-xl border border-border p-3">
          <div className="mb-2 text-[12px] font-semibold text-muted-foreground">{group}</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
            {units.map((u) => {
              const s = asStatus(u.listing_status);
              const inner = (
                <>
                  <div className="truncate text-[12.5px] font-semibold">{u.code || u.name}</div>
                  <div className="mt-0.5 text-[11px] opacity-80">
                    {u.area ? `${u.area} m²` : "—"}
                    {u.bedrooms ? ` · ${u.bedrooms}PN` : ""}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium">{formatMoneyShort(u.price)}</div>
                  <div className="mt-0.5 text-[10.5px] opacity-80">{LISTING_STATUS_LABEL[s]}</div>
                </>
              );
              return onSelect ? (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onSelect(u)}
                  className={`rounded-lg border p-2 text-left transition hover:shadow-sm ${LISTING_STATUS_TONE[s]}`}
                >
                  {inner}
                </button>
              ) : (
                <div key={u.id} className={`rounded-lg border p-2 ${LISTING_STATUS_TONE[s]}`}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
