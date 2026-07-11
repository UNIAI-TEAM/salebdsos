// Products — CRUD server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT =
  "id,tenant_id,sku,name,category,price,currency,unit,status,description,image_url,attributes,created_at,updated_at";

const StatusEnum = z.enum(["draft", "active", "archived"]);

const Input = z.object({
  sku: z.string().trim().max(80).optional().nullable(),
  name: z.string().trim().min(1, "Bắt buộc").max(200),
  category: z.string().trim().max(80).optional().nullable(),
  price: z.number().nonnegative().default(0),
  currency: z.string().trim().max(8).default("VND"),
  unit: z.string().trim().max(40).optional().nullable(),
  status: StatusEnum.default("active"),
  description: z.string().trim().max(4000).optional().nullable(),
  image_url: z.string().trim().max(2000).optional().nullable(),
});

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenantId: string;
      search?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(Math.max(1, data.pageSize ?? 20), 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("products")
      .select(SELECT, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const s = (data.search ?? "").trim();
    if (s) {
      const like = `%${s.replace(/[%_]/g, (m) => "\\" + m)}%`;
      q = q.or(`name.ilike.${like},sku.ilike.${like},category.ilike.${like}`);
    }

    const { data: items, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: items ?? [], total: count ?? 0, page, pageSize };
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid() }).and(Input).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId, ...rest } = data;
    const insert = {
      tenant_id: tenantId,
      created_by: userId,
      ...rest,
      sku: rest.sku || null,
      category: rest.category || null,
      unit: rest.unit || null,
      description: rest.description || null,
      image_url: rest.image_url || null,
    };
    const { data: row, error } = await supabase
      .from("products")
      .insert(insert)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).and(Input.partial()).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { data: row, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
