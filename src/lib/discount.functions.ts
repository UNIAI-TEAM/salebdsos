// Chính sách chiết khấu thanh toán nhanh — server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_ROLES, SALE_ROLES } from "@/lib/permissions";

async function roles(context: any, tenantId: string) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  const list: string[] = (data ?? []).map((r: { role: string }) => r.role);
  if (!list.some((r: string) => SALE_ROLES.has(r))) {
    throw new Error("Bạn không có quyền xem chính sách chiết khấu của workspace này");
  }
  return { canManage: list.some((r: string) => ADMIN_ROLES.has(r)) };
}

const PolicyInput = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(120),
  within_days: z.number().int().min(1).max(365),
  discount_percent: z.number().min(0).max(100),
  product_kinds: z.array(z.string().trim().max(40)).min(1).max(10),
  active: z.boolean().default(true),
  sort: z.number().int().default(0),
});

export const listDiscountPolicies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), projectId: z.string().uuid().nullish() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { canManage } = await roles(context, data.tenantId);
    let q = context.supabase
      .from("payment_discount_policies")
      .select("id,tenant_id,project_id,name,within_days,discount_percent,product_kinds,active,sort,created_at")
      .eq("tenant_id", data.tenantId)
      .order("sort")
      .order("discount_percent", { ascending: false })
      .limit(100);
    if (data.projectId) q = q.or(`project_id.is.null,project_id.eq.${data.projectId}`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { policies: rows ?? [], canManage };
  });

export const saveDiscountPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid() }).and(PolicyInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { canManage } = await roles(context, data.tenantId);
    if (!canManage) throw new Error("Chỉ quản lý mới sửa chính sách chiết khấu");
    const { tenantId, id, ...body } = data;
    const q = id
      ? context.supabase.from("payment_discount_policies").update(body as never).eq("id", id).eq("tenant_id", tenantId)
      : context.supabase.from("payment_discount_policies").insert({ tenant_id: tenantId, ...body } as never);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDiscountPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { canManage } = await roles(context, data.tenantId);
    if (!canManage) throw new Error("Chỉ quản lý mới xoá chính sách chiết khấu");
    const { error } = await context.supabase
      .from("payment_discount_policies")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
