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

export const ensurePipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    await context.supabase.rpc("ensure_default_pipeline_stages", { _tenant: data.tenantId });
    return { ok: true };
  });

export const getPipeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    // Auto-seed if empty
    await context.supabase.rpc("ensure_default_pipeline_stages", { _tenant: data.tenantId });

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
