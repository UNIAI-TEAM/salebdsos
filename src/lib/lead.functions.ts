// Lead CRM — server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "consulting",
  "quoted",
  "deposit",
  "won",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

const StatusEnum = z.enum(LEAD_STATUSES);

const LeadInput = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable().or(z.literal("")),
  source: z.string().trim().max(80).optional().nullable().or(z.literal("")),
  status: StatusEnum.default("new"),
  project_id: z.string().uuid().optional().nullable(),
  owner_user_id: z.string().uuid().optional().nullable(),
  budget: z.string().trim().max(120).optional().nullable().or(z.literal("")),
  need_type: z.enum(["buy", "rent", "invest"]).optional().nullable(),
  timeline: z.string().trim().max(120).optional().nullable().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().nullable().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  score: z.number().int().min(0).max(100).optional().nullable(),
});

const SELECT = "id,tenant_id,full_name,email,phone,source,status,project_id,owner_user_id,budget,need_type,timeline,notes,tags,score,created_at,updated_at";

function clean<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  for (const k in obj) {
    const v = obj[k];
    out[k] = v === "" ? null : v;
  }
  return out;
}

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    tenantId: string;
    q?: string;
    status?: string;
    source?: string;
    projectId?: string;
    ownerId?: string;
    page?: number;
    pageSize?: number;
  }) => d)
  .handler(async ({ data, context }) => {
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, data.pageSize ?? 20));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let q = context.supabase
      .from("leads")
      .select(SELECT, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.status) q = q.eq("status", data.status as LeadStatus);
    if (data.source) q = q.eq("source", data.source);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.ownerId) q = q.eq("owner_user_id", data.ownerId);
    if (data.q) {
      const term = data.q.replace(/[%,]/g, " ").trim();
      if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
    }
    const { data: rows, error, count } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, page, pageSize };
  });

export const getLeadStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [total, recent, byStatus] = await Promise.all([
      context.supabase.from("leads").select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId).is("deleted_at", null),
      context.supabase.from("leads").select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId).is("deleted_at", null).gte("created_at", since),
      context.supabase.from("leads").select("status")
        .eq("tenant_id", data.tenantId).is("deleted_at", null),
    ]);
    const counts: Record<string, number> = {};
    for (const r of (byStatus.data ?? []) as { status: string }[]) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    return {
      total: total.count ?? 0,
      last30: recent.count ?? 0,
      won: counts["won"] ?? 0,
      lost: counts["lost"] ?? 0,
      counts,
    };
  });

export const upsertLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => LeadInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload: any = clean(data);
    if (!payload.id) delete payload.id;
    if (!payload.tags) payload.tags = [];
    const { data: row, error } = await context.supabase
      .from("leads")
      .upsert(payload, { onConflict: "id" })
      .select(SELECT)
      .single();
    if (error) throw error;
    return row;
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: StatusEnum }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: prev } = await context.supabase
      .from("leads").select("status, tenant_id").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase
      .from("leads").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    if (prev?.tenant_id && prev.status !== data.status) {
      await context.supabase.from("audit_logs").insert({
        tenant_id: prev.tenant_id,
        actor_user_id: context.userId,
        action: "status_change",
        entity: "lead",
        entity_id: data.id,
        diff: { from: prev.status, to: data.status },
      });
    }
    return { ok: true };
  });

export const updateLeadNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    notes: z.string().trim().max(5000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: prev } = await context.supabase
      .from("leads").select("tenant_id").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase
      .from("leads").update({ notes: data.notes || null }).eq("id", data.id);
    if (error) throw error;
    if (prev?.tenant_id) {
      await context.supabase.from("audit_logs").insert({
        tenant_id: prev.tenant_id,
        actor_user_id: context.userId,
        action: "notes_update",
        entity: "lead",
        entity_id: data.id,
        diff: { preview: (data.notes || "").slice(0, 160) },
      });
    }
    return { ok: true };
  });

export const getLeadTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leadId: string; tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const [audits, follows] = await Promise.all([
      context.supabase
        .from("audit_logs")
        .select("id, action, diff, occurred_at")
        .eq("tenant_id", data.tenantId)
        .eq("entity", "lead")
        .eq("entity_id", data.leadId)
        .order("occurred_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("ai_followups")
        .select("id, channel, scenario, subject, output, status, scheduled_at, sent_at, created_at")
        .eq("tenant_id", data.tenantId)
        .eq("lead_id", data.leadId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const events: Array<{
      id: string; kind: "audit" | "followup"; at: string; title: string; detail?: string; meta?: any;
    }> = [];
    for (const a of (audits.data ?? []) as any[]) {
      events.push({
        id: `a-${a.id}`,
        kind: "audit",
        at: a.occurred_at,
        title: a.action as string,
        meta: a.diff,
      });
    }
    for (const f of (follows.data ?? []) as any[]) {
      events.push({
        id: `f-${f.id}`,
        kind: "followup",
        at: f.sent_at || f.scheduled_at || f.created_at,
        title: `Follow-up · ${f.channel || "—"}`,
        detail: f.subject || (f.output ? String(f.output).slice(0, 200) : undefined),
        meta: { status: f.status, scenario: f.scenario, channel: f.channel },
      });
    }
    events.sort((a, b) => (a.at < b.at ? 1 : -1));
    return events;
  });

export const softDeleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("leads").update({ deleted_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const importLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      tenant_id: z.string().uuid(),
      rows: z.array(LeadInput.omit({ tenant_id: true })).min(1).max(500),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const payload = data.rows.map((r) => {
      const c: any = clean(r);
      delete c.id;
      c.tenant_id = data.tenant_id;
      if (!c.status) c.status = "new";
      if (!c.tags) c.tags = [];
      return c;
    });
    const { data: rows, error } = await context.supabase
      .from("leads").insert(payload).select("id");
    if (error) throw error;
    return { inserted: rows?.length ?? 0 };
  });

export const listTenantOwners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: roles, error } = await context.supabase
      .from("user_roles").select("user_id, role").eq("tenant_id", data.tenantId);
    if (error) throw error;
    const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    if (!ids.length) return [];
    const { data: profs } = await context.supabase
      .from("profiles").select("user_id, full_name, email, avatar_url").in("user_id", ids);
    const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    return ids.map((id) => {
      const p: any = map.get(id) ?? {};
      return {
        user_id: id,
        full_name: p.full_name ?? p.email ?? "Thành viên",
        email: p.email ?? null,
        avatar_url: p.avatar_url ?? null,
      };
    });
  });

export const listProjectsLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("projects")
      .select("id, name")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("name");
    if (error) throw error;
    return rows ?? [];
  });
