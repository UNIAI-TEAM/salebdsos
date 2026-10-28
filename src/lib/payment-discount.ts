// Chính sách chiết khấu thanh toán nhanh — logic thuần, dễ kiểm thử.

export type DiscountPolicy = {
  id: string;
  tenant_id: string;
  project_id: string | null;
  name: string;
  within_days: number;
  discount_percent: number;
  product_kinds: string[];
  active: boolean;
  sort: number;
};

export type DiscountQuote = {
  policy: DiscountPolicy;
  /** Số tiền được giảm */
  amount: number;
  /** Giá sau chiết khấu */
  net: number;
  /** Hạn thanh toán để được hưởng (tính từ fromDate) */
  deadline: Date;
};

/** Chính sách áp dụng được cho một sản phẩm: đang bật, đúng dự án (hoặc toàn sàn), đúng loại hình. */
export function policyApplies(
  p: DiscountPolicy,
  ctx: { projectId: string | null; kind: string | null },
): boolean {
  if (!p.active) return false;
  if (p.project_id && p.project_id !== ctx.projectId) return false;
  if (ctx.kind && p.product_kinds.length > 0 && !p.product_kinds.includes(ctx.kind)) return false;
  return true;
}

/** Liệt kê chính sách áp dụng được, ưu tiên % cao trước, sau đó hạn dài hơn. */
export function applicablePolicies(
  policies: DiscountPolicy[],
  ctx: { projectId: string | null; kind: string | null },
): DiscountPolicy[] {
  return policies
    .filter((p) => policyApplies(p, ctx))
    .sort((a, b) => b.discount_percent - a.discount_percent || b.within_days - a.within_days || a.sort - b.sort);
}

/** Tính tiền chiết khấu cho một mức giá. */
export function quoteDiscount(
  price: number,
  policy: DiscountPolicy,
  fromDate: Date = new Date(),
): DiscountQuote {
  const amount = Math.round((price * policy.discount_percent) / 100);
  const deadline = new Date(fromDate.getTime() + policy.within_days * 86_400_000);
  return { policy, amount, net: Math.max(0, price - amount), deadline };
}

/** Gợi ý tốt nhất cho Sale khi tư vấn: chính sách % cao nhất áp dụng được. */
export function bestQuote(
  price: number,
  policies: DiscountPolicy[],
  ctx: { projectId: string | null; kind: string | null },
): DiscountQuote | null {
  const [best] = applicablePolicies(policies, ctx);
  return best ? quoteDiscount(price, best) : null;
}
