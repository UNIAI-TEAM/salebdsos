// Campaigns — server functions: list/create/update/soft-delete.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT =
  "id,tenant_id,name,channel,status,template,audience,stats,scheduled_at,created_at,updated_at";

const CHANNELS = ["email", "zalo", "sms", "push"] as const;
const STATUSES = ["draft", "scheduled", "running", "paused", "completed"] as const;

const CampaignInput = z.object({
  name: z.string().trim().min(1, "Bắt buộc"),
  channel: z.enum(CHANNELS),
  status: z.enum(STATUSES).optional(),
  subject: z.string().trim().optional().nullable(),
  content: z.string().trim().optional().nullable(),
  audience_note: z.string().trim().optional().nullable(),
  scheduled_at: z.string().datetime().nullable().optional(),
});

export type CampaignFormInput = z.infer<typeof CampaignInput>;

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { tenantId: string; search?: string; status?: string; channel?: string; page?: number; pageSize?: number }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(Math.max(1, data.pageSize ?? 10), 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("campaigns")
      .select(SELECT, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    const s = (data.search ?? "").trim();
    if (s) {
      const like = `%${s.replace(/[%_]/g, (m) => "\\" + m)}%`;
      q = q.ilike("name", like);
    }
    if (data.status) q = q.eq("status", data.status);
    if (data.channel) q = q.eq("channel", data.channel);

    const { data: items, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: items ?? [], total: count ?? 0, page, pageSize };
  });

export const campaignStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("campaigns")
      .select("status,stats")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const total = rows?.length ?? 0;
    const active = rows?.filter((r) => r.status === "running" || r.status === "scheduled").length ?? 0;
    let sent = 0, opened = 0, clicked = 0;
    for (const r of rows ?? []) {
      const s = (r.stats ?? {}) as { sent?: number; opened?: number; clicked?: number };
      sent += Number(s.sent ?? 0);
      opened += Number(s.opened ?? 0);
      clicked += Number(s.clicked ?? 0);
    }
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const ctr = opened > 0 ? (clicked / opened) * 100 : 0;
    return { total, active, sent, opened, clicked, openRate, ctr };
  });

function toDbPayload(input: CampaignFormInput) {
  const template = {
    subject: input.subject || null,
    content: input.content || null,
  };
  const audience = {
    note: input.audience_note || null,
  };
  return {
    name: input.name,
    channel: input.channel,
    status: input.status ?? "draft",
    template,
    audience,
    scheduled_at: input.scheduled_at || null,
  };
}

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid() }).and(CampaignInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { tenantId, ...rest } = data;
    const insert = { tenant_id: tenantId, ...toDbPayload(rest) };
    const { data: row, error } = await supabase.from("campaigns").insert(insert).select(SELECT).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).and(CampaignInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...rest } = data;
    const patch = toDbPayload(rest);
    const { data: row, error } = await supabase
      .from("campaigns").update(patch).eq("id", id).select(SELECT).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(STATUSES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("campaigns").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("campaigns")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
