// Lead capture forms — CRUD + submissions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT =
  "id,tenant_id,project_id,name,slug,description,fields,redirect_url,success_message,is_active,submit_count,created_at,updated_at";

export const FIELD_TYPES = ["text", "email", "phone", "textarea", "select"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FieldSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(120),
  type: z.enum(FIELD_TYPES).default("text"),
  required: z.boolean().default(false),
  placeholder: z.string().trim().max(160).optional().nullable(),
  options: z.array(z.string().max(80)).max(30).optional().nullable(),
});
export type LeadFormField = z.infer<typeof FieldSchema>;

export const DEFAULT_FIELDS: LeadFormField[] = [
  { key: "full_name", label: "Họ và tên", type: "text", required: true, placeholder: "Nguyễn Văn A", options: null },
  { key: "phone", label: "Số điện thoại", type: "phone", required: true, placeholder: "09xx xxx xxx", options: null },
  { key: "email", label: "Email", type: "email", required: false, placeholder: "email@domain.com", options: null },
  { key: "need_type", label: "Nhu cầu", type: "select", required: false, placeholder: null, options: ["Để ở", "Đầu tư", "Cho thuê"] },
  { key: "notes", label: "Ghi chú", type: "textarea", required: false, placeholder: "Bạn quan tâm điều gì?", options: null },
];

export const slugifyForm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const FormInput = z.object({
  name: z.string().trim().min(1, "Bắt buộc").max(160),
  slug: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(600).optional().nullable(),
  project_id: z.string().uuid().nullable().optional(),
  fields: z.array(FieldSchema).min(1).max(20),
  redirect_url: z.string().trim().max(500).optional().nullable(),
  success_message: z.string().trim().max(400).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const listLeadForms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) =>
    z.object({ tenantId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: items, error } = await context.supabase
      .from("lead_forms")
      .select(SELECT)
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: items ?? [] };
  });

export const createLeadForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid() }).and(FormInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tenantId, ...rest } = data;
    const base = slugifyForm(rest.slug || rest.name) || "form";
    const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    const { data: row, error } = await supabase
      .from("lead_forms")
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        name: rest.name,
        slug,
        description: rest.description || null,
        project_id: rest.project_id ?? null,
        fields: rest.fields,
        redirect_url: rest.redirect_url || null,
        success_message: rest.success_message || null,
        is_active: rest.is_active,
      })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateLeadForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).and(FormInput.partial()).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, slug, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest };
    if (slug !== undefined) patch.slug = slugifyForm(slug || "") || undefined;
    const { data: row, error } = await context.supabase
      .from("lead_forms")
      .update(patch as never)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) {
      if (/duplicate|unique/i.test(error.message))
        throw new Error("Đường dẫn này đã được dùng. Hãy chọn đường dẫn khác.");
      throw new Error(error.message);
    }
    return row;
  });

export const deleteLeadForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lead_forms")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listFormSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { tenantId: string; formId?: string | null; page?: number; pageSize?: number }) => d,
  )
  .handler(async ({ data, context }) => {
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(Math.max(1, data.pageSize ?? 20), 100);
    const from = (page - 1) * pageSize;
    let q = context.supabase
      .from("lead_submissions")
      .select("id,form_id,payload,created_lead_id,created_at,referrer", { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (data.formId) q = q.eq("form_id", data.formId);
    const { data: items, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: items ?? [], total: count ?? 0, page, pageSize };
  });

/** Public: read an active form's schema by slug (no auth). */
export const getPublicLeadForm = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().trim().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("lead_forms")
      .select("id,name,slug,description,fields,success_message,redirect_url,project_id")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    let projectName: string | null = null;
    if (row.project_id) {
      const { data: p } = await supabaseAdmin
        .from("projects")
        .select("name")
        .eq("id", row.project_id)
        .maybeSingle();
      projectName = p?.name ?? null;
    }
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      fields: (row.fields ?? []) as LeadFormField[],
      successMessage: row.success_message,
      redirectUrl: row.redirect_url,
      projectName,
    };
  });
