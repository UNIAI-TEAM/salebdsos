// Tách/ghép lô — kiểm tra phía client trước khi gọi RPC (logic thuần, dễ kiểm thử).

export type SplitChildDraft = {
  code: string;
  area: string;
  price: string;
  map_row: string;
  map_col: string;
};

export type TransformCheck = { ok: true } | { ok: false; error: string };

const num = (v: string) => {
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Kiểm tra bản nháp tách lô trước khi gửi server. */
export function validateSplitDraft(
  parent: { code: string | null; area: number | null; listing_status: string },
  children: SplitChildDraft[],
): TransformCheck {
  if (parent.listing_status !== "available") {
    return { ok: false, error: "Chỉ tách được lô đang trống" };
  }
  if (children.length < 2 || children.length > 20) {
    return { ok: false, error: "Tách thành 2 đến 20 lô con" };
  }
  const seen = new Set<string>();
  let total = 0;
  for (const c of children) {
    const code = c.code.trim();
    if (!code) return { ok: false, error: "Nhập mã cho từng lô con" };
    if (seen.has(code)) return { ok: false, error: `Mã lô con bị trùng: ${code}` };
    seen.add(code);
    const area = num(c.area);
    if (area == null || area <= 0) return { ok: false, error: `Diện tích lô ${code} phải lớn hơn 0` };
    total += area;
    const price = num(c.price);
    if (c.price.trim() && (price == null || price < 0)) {
      return { ok: false, error: `Giá lô ${code} không hợp lệ` };
    }
  }
  if (parent.area != null && total > parent.area + 0.0001) {
    return { ok: false, error: `Tổng diện tích lô con (${total} m²) vượt lô gốc (${parent.area} m²)` };
  }
  return { ok: true };
};

/** Kiểm tra bản nháp ghép lô trước khi gửi server. */
export function validateMergeDraft(
  parents: { code: string | null; listing_status: string; project_id: string | null }[],
  code: string,
): TransformCheck {
  if (parents.length < 2 || parents.length > 20) {
    return { ok: false, error: "Chọn 2 đến 20 lô để ghép" };
  }
  if (!code.trim()) return { ok: false, error: "Nhập mã cho lô mới" };
  const project = parents[0].project_id;
  for (const p of parents) {
    if (p.listing_status !== "available") {
      return { ok: false, error: `Lô ${p.code ?? ""} không còn trống` };
    }
    if (p.project_id !== project) {
      return { ok: false, error: "Các lô phải cùng một dự án" };
    }
  }
  return { ok: true };
}

/** Tổng diện tích và giá gợi ý khi ghép. */
export function mergeTotals(parents: { area: number | null; price: number }[]) {
  return {
    area: parents.reduce((s, p) => s + (p.area ?? 0), 0),
    price: parents.reduce((s, p) => s + (p.price ?? 0), 0),
  };
}
