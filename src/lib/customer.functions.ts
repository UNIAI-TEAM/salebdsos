// Customers — server functions: list/create/update/soft-delete.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT = "id,tenant_id,full_name,email,phone,company,tags,notes,created_at,updated_at";

const CustomerInput = z.object({
  full_name: z.string().trim().min(1, "Bắt buộc"),
  email: z.string().trim().email().or(z.literal("")).nullable().optional(),
  phone: z.string().trim().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; search?: string; page?: number; pageSize?: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(Math.max(1, data.pageSize ?? 10), 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("customers")
      .select(SELECT, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    const s = (data.search ?? "").trim();
    if (s) {
      const like = `%${s.replace(/[%_]/g, (m) => "\\" + m)}%`;
      q = q.or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like},company.ilike.${like}`);
    }

    const { data: items, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: items ?? [], total: count ?? 0, page, pageSize };
  });

export const createCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const parsed = z.object({ tenantId: z.string().uuid() }).and(CustomerInput).parse(d);
    return parsed;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId, ...rest } = data;
    const insert = {
      tenant_id: tenantId,
      owner_user_id: userId,
      full_name: rest.full_name,
      email: rest.email || null,
      phone: rest.phone || null,
      company: rest.company || null,
      notes: rest.notes || null,
      tags: rest.tags ?? null,
    };
    const { data: row, error } = await supabase.from("customers").insert(insert).select(SELECT).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const bulkCreateCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      rows: z.array(CustomerInput).min(1).max(1000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const inserts = data.rows.map((r) => ({
      tenant_id: data.tenantId,
      owner_user_id: userId,
      full_name: r.full_name,
      email: r.email || null,
      phone: r.phone || null,
      company: r.company || null,
      notes: r.notes || null,
      tags: r.tags ?? null,
    }));
    const { data: rows, error } = await supabase.from("customers").insert(inserts).select("id");
    if (error) throw new Error(error.message);
    return { inserted: rows?.length ?? 0 };
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).and(CustomerInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...rest } = data;
    const patch = {
      full_name: rest.full_name,
      email: rest.email || null,
      phone: rest.phone || null,
      company: rest.company || null,
      notes: rest.notes || null,
      tags: rest.tags ?? null,
    };
    const { data: row, error } = await supabase
      .from("customers").update(patch).eq("id", id).select(SELECT).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("customers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
