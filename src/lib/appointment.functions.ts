// Appointments — CRUD server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT =
  "id,tenant_id,project_id,customer_id,lead_id,assigned_to,title,location,starts_at,ends_at,status,notes,reminder_minutes,is_published,created_by,created_at,updated_at";

const StatusEnum = z.enum(["scheduled", "completed", "canceled", "no_show"]);

const Input = z.object({
  title: z.string().trim().min(1, "Bắt buộc").max(200),
  location: z.string().trim().max(200).optional().nullable(),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  status: StatusEnum.default("scheduled"),
  notes: z.string().trim().max(2000).optional().nullable(),
  reminder_minutes: z.number().int().min(0).max(10080).optional().nullable(),
  customer_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  is_published: z.boolean().optional().default(false),
});

export const listAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenantId: string;
      from?: string;
      to?: string;
      status?: string;
      projectId?: string;
      page?: number;
      pageSize?: number;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(Math.max(1, data.pageSize ?? 50), 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("appointments")
      .select(SELECT + ",customers(full_name)", { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .order("starts_at", { ascending: true })
      .range(from, to);

    if (data.from) q = q.gte("starts_at", data.from);
    if (data.to) q = q.lte("starts_at", data.to);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.projectId) q = q.eq("project_id", data.projectId);

    const { data: items, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: items ?? [], total: count ?? 0, page, pageSize };
  });

export const createAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid() }).and(Input).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId, ...rest } = data;
    const { data: row, error } = await supabase
      .from("appointments")
      .insert({ tenant_id: tenantId, created_by: userId, ...rest })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).and(Input.partial()).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { data: row, error } = await supabase
      .from("appointments")
      .update(patch)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("appointments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
