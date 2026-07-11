// AI Follow-up — server functions: queue, history, status updates.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SCENARIOS = [
  "new_lead",
  "viewed_project",
  "downloaded_brochure",
  "booked_consultation",
  "high_score",
] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const SCENARIO_LABEL_VI: Record<Scenario, string> = {
  new_lead: "Lead mới",
  viewed_project: "Đã xem dự án",
  downloaded_brochure: "Đã tải brochure",
  booked_consultation: "Đã đặt lịch tư vấn",
  high_score: "AI Score cao",
};

export const FOLLOWUP_STATUSES = ["suggested", "sent", "dismissed", "draft"] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

const FU_SELECT =
  "id,tenant_id,lead_id,owner_user_id,project_id,scenario,channel,subject,output,prompt,model,status,sent_at,scheduled_at,created_at,updated_at";

// List follow-up suggestions / history with optional filters.
export const listFollowups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    tenantId: string;
    status?: FollowupStatus | "all";
    scenario?: Scenario | "all";
    leadId?: string;
    customerId?: string;
    page?: number;
    pageSize?: number;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const page = data.page ?? 1;
    const pageSize = Math.min(data.pageSize ?? 25, 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("ai_followups")
      .select(FU_SELECT, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.scenario && data.scenario !== "all") q = q.eq("scenario", data.scenario);
    if (data.leadId) q = q.eq("lead_id", data.leadId);

    const { data: items, error, count } = await q;
    if (error) throw new Error(error.message);

    // Hydrate lead minimal info
    const leadIds = Array.from(new Set((items ?? []).map((x) => x.lead_id).filter(Boolean) as string[]));
    let leads: Record<string, { full_name: string | null; phone: string | null; email: string | null; score: number | null }> = {};
    if (leadIds.length) {
      const { data: ls } = await supabase
        .from("leads")
        .select("id, full_name, phone, email, score")
        .in("id", leadIds);
      for (const l of ls ?? []) leads[l.id] = l;
    }

    return {
      items: (items ?? []).map((it) => ({
        ...it,
        lead: it.lead_id ? leads[it.lead_id] ?? null : null,
      })),
      total: count ?? 0,
      page,
      pageSize,
    };
  });

// Quick KPIs for the dashboard header.
export const getFollowupStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [allRes, suggestedRes, sentRes, recentRes] = await Promise.all([
      supabase.from("ai_followups").select("id", { count: "exact", head: true }).eq("tenant_id", data.tenantId).is("deleted_at", null),
      supabase.from("ai_followups").select("id", { count: "exact", head: true }).eq("tenant_id", data.tenantId).eq("status", "suggested").is("deleted_at", null),
      supabase.from("ai_followups").select("id", { count: "exact", head: true }).eq("tenant_id", data.tenantId).eq("status", "sent").is("deleted_at", null),
      supabase.from("ai_followups").select("id", { count: "exact", head: true }).eq("tenant_id", data.tenantId).gte("created_at", since).is("deleted_at", null),
    ]);
    return {
      total: allRes.count ?? 0,
      suggested: suggestedRes.count ?? 0,
      sent: sentRes.count ?? 0,
      last30d: recentRes.count ?? 0,
    };
  });

// Build the follow-up queue: leads needing attention by scenario.
// Heuristic for MVP: status, score, recency; excludes leads with a recent suggestion already.
export const getFollowupQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; scenario?: Scenario | "all"; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const limit = Math.min(data.limit ?? 30, 100);
    const scenario = data.scenario ?? "all";

    let q = supabase
      .from("leads")
      .select("id, full_name, phone, email, source, status, score, project_id, need_type, budget, timeline, tags, owner_user_id, created_at")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (scenario === "new_lead") q = q.eq("status", "new");
    else if (scenario === "viewed_project") q = q.in("status", ["new", "contacted"]).not("project_id", "is", null);
    else if (scenario === "downloaded_brochure") q = q.contains("tags", ["brochure"]);
    else if (scenario === "booked_consultation") q = q.eq("status", "consulting");
    else if (scenario === "high_score") q = q.gte("score", 75);

    const { data: leads, error } = await q;
    if (error) throw new Error(error.message);

    // Hydrate project name
    const pIds = Array.from(new Set((leads ?? []).map((l) => l.project_id).filter(Boolean) as string[]));
    let projects: Record<string, { name: string }> = {};
    if (pIds.length) {
      const { data: ps } = await supabase.from("projects").select("id, name").in("id", pIds);
      for (const p of ps ?? []) projects[p.id] = { name: p.name };
    }
    return {
      items: (leads ?? []).map((l) => ({
        ...l,
        project_name: l.project_id ? projects[l.project_id]?.name ?? null : null,
      })),
    };
  });

// Update status (mark sent / dismissed / etc).
export const updateFollowupStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: FollowupStatus }) =>
    z.object({ id: z.string().uuid(), status: z.enum(FOLLOWUP_STATUSES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: any = { status: data.status };
    if (data.status === "sent") patch.sent_at = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("ai_followups")
      .update(patch)
      .eq("id", data.id)
      .select(FU_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, followup: row };
  });

// Soft delete suggestion.
export const deleteFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("ai_followups")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
