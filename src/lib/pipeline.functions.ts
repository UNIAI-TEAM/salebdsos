// Sales Pipeline — server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEAL_SELECT =
  "id,tenant_id,stage_id,lead_id,project_id,owner_user_id,title,value,currency,status,expected_close_date,closed_at,next_action,next_action_at,last_activity_at,meta,created_at,updated_at";

const DealInput = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  lead_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  owner_user_id: z.string().uuid().optional().nullable(),
  value: z.number().nonnegative().optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  expected_close_date: z.string().optional().nullable(),
  next_action: z.string().max(500).optional().nullable(),
  next_action_at: z.string().optional().nullable(),
});

function clean<T extends Record<string, any>>(o: T) {
  const out: Record<string, any> = {};
  for (const k in o) out[k] = o[k] === "" ? null : o[k];
  return out;
}

async function seedDefaultStages(supabase: any, tenantId: string): Promise<void> {
  const { count } = await supabase
    .from("pipeline_stages")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);
  if ((count ?? 0) > 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("pipeline_stages").insert([
    { tenant_id: tenantId, name: "Mới", position: 0, win_probability: 5 },
    { tenant_id: tenantId, name: "Đã liên hệ", position: 1, win_probability: 15 },
    { tenant_id: tenantId, name: "Đang tư vấn", position: 2, win_probability: 35 },
    { tenant_id: tenantId, name: "Đã báo giá", position: 3, win_probability: 55 },
    { tenant_id: tenantId, name: "Đặt cọc", position: 4, win_probability: 80 },
    { tenant_id: tenantId, name: "Thành công", position: 5, win_probability: 100 },
    { tenant_id: tenantId, name: "Thất bại", position: 6, win_probability: 0 },
  ]);
}

export const ensurePipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    await seedDefaultStages(context.supabase, data.tenantId);
    return { ok: true };
  });

export const getPipeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    await seedDefaultStages(context.supabase, data.tenantId);


    const [stagesQ, dealsQ, leadsQ, projectsQ, rolesQ] = await Promise.all([
      context.supabase.from("pipeline_stages")
        .select("id,name,position,win_probability")
        .eq("tenant_id", data.tenantId).is("deleted_at", null)
        .order("position", { ascending: true }),
      context.supabase.from("pipeline_deals")
        .select(DEAL_SELECT)
        .eq("tenant_id", data.tenantId).is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(500),
      context.supabase.from("leads")
        .select("id, full_name, phone, email")
        .eq("tenant_id", data.tenantId).is("deleted_at", null).limit(500),
      context.supabase.from("projects")
        .select("id, name").eq("tenant_id", data.tenantId)
        .is("deleted_at", null).order("name"),
      context.supabase.from("user_roles").select("user_id").eq("tenant_id", data.tenantId),
    ]);
    if (stagesQ.error) throw stagesQ.error;
    if (dealsQ.error) throw dealsQ.error;

    const ownerIds = Array.from(new Set((rolesQ.data ?? []).map((r: any) => r.user_id)));
    let owners: any[] = [];
    if (ownerIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles").select("user_id, full_name, email, avatar_url").in("user_id", ownerIds);
      owners = (profs ?? []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name ?? p.email ?? "Thành viên",
        email: p.email,
        avatar_url: p.avatar_url,
      }));
    }
    return {
      stages: stagesQ.data ?? [],
      deals: dealsQ.data ?? [],
      leads: leadsQ.data ?? [],
      projects: projectsQ.data ?? [],
      owners,
    };
  });

export const upsertDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DealInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload: any = clean(data);
    if (!payload.id) delete payload.id;
    payload.last_activity_at = new Date().toISOString();
    if (!payload.currency) payload.currency = "VND";
    const { data: row, error } = await context.supabase
      .from("pipeline_deals").upsert(payload, { onConflict: "id" }).select(DEAL_SELECT).single();
    if (error) throw error;
    return row;
  });

export const moveDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), stage_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pipeline_deals")
      .update({ stage_id: data.stage_id, last_activity_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pipeline_deals").update({ deleted_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Pipeline stages CRUD
// ---------------------------------------------------------------------------
const STAGE_SELECT = "id,tenant_id,name,position,win_probability,created_at,updated_at";

export const createStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
        win_probability: z.number().int().min(0).max(100).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: last } = await supabase
      .from("pipeline_stages")
      .select("position")
      .eq("tenant_id", data.tenant_id)
      .is("deleted_at", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: row, error } = await supabase
      .from("pipeline_stages")
      .insert({
        tenant_id: data.tenant_id,
        name: data.name,
        win_probability: data.win_probability ?? null,
        position: (last?.position ?? -1) + 1,
      })
      .select(STAGE_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(80).optional(),
        win_probability: z.number().int().min(0).max(100).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("pipeline_stages")
      .update(patch)
      .eq("id", id)
      .select(STAGE_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const reorderStages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        ids: z.array(z.string().uuid()).min(1).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await supabase
        .from("pipeline_stages")
        .update({ position: i })
        .eq("id", data.ids[i])
        .eq("tenant_id", data.tenant_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Soft-delete a stage. Deals are moved to `moveDealsTo` (or blocked if omitted). */
export const deleteStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        moveDealsTo: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { count } = await supabase
      .from("pipeline_deals")
      .select("id", { count: "exact", head: true })
      .eq("stage_id", data.id)
      .is("deleted_at", null);
    if ((count ?? 0) > 0) {
      if (!data.moveDealsTo)
        throw new Error(`Giai đoạn còn ${count} deal. Hãy chọn giai đoạn để chuyển sang.`);
      const { error: mErr } = await supabase
        .from("pipeline_deals")
        .update({ stage_id: data.moveDealsTo })
        .eq("stage_id", data.id)
        .is("deleted_at", null);
      if (mErr) throw new Error(mErr.message);
    }
    const { error } = await supabase
      .from("pipeline_stages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, moved: count ?? 0 };
  });
