import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SALE_ROLES, TEAM_VIEW_ROLES } from "@/lib/permissions";

async function access(context: any, tenantId: string) {
  const { data } = await context.supabase.from("user_roles").select("role").eq("tenant_id", tenantId).eq("user_id", context.userId);
  const r = (data ?? []).map((x: any) => x.role as string);
  if (!r.some((x: string) => SALE_ROLES.has(x))) throw new Error("Bạn không có quyền");
  return { canManage: r.some((x: string) => TEAM_VIEW_ROLES.has(x) && x !== "manager") };
}

const code = () => {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => a[b % a.length]).join("");
};

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { canManage } = await access(context, data.tenantId);
    const sb = (context as any).supabase;
    const [{ data: events }, { data: tickets }, { data: projects }, { data: leads }] = await Promise.all([
      sb.from("sales_events").select("id,project_id,title,kind,location,starts_at,ends_at,capacity,description,status").eq("tenant_id", data.tenantId).is("deleted_at", null).order("starts_at", { ascending: false }),
      sb.from("event_tickets").select("id,event_id,lead_id,guest_name,guest_phone,code,status,checked_in_at,invited_by").eq("tenant_id", data.tenantId).order("created_at", { ascending: false }).limit(2000),
      sb.from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null),
      sb.from("leads").select("id,full_name,phone,email,project_id").eq("tenant_id", data.tenantId).is("deleted_at", null).order("created_at", { ascending: false }).limit(300),
    ]);
    return { canManage, events: events ?? [], tickets: tickets ?? [], projects: projects ?? [], leads: leads ?? [] };
  });

export const saveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        id: z.string().uuid().optional(),
        title: z.string().trim().min(2).max(160),
        kind: z.enum(["launch", "site_tour", "workshop", "other"]),
        projectId: z.string().uuid().nullable(),
        location: z.string().trim().max(240).nullable(),
        startsAt: z.string().min(10),
        capacity: z.number().int().min(1).max(100000).nullable(),
        description: z.string().trim().max(2000).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { canManage } = await access(context, data.tenantId);
    if (!canManage) throw new Error("Chỉ quản trị viên được tạo sự kiện");
    const row = {
      tenant_id: data.tenantId,
      title: data.title,
      kind: data.kind,
      project_id: data.projectId,
      location: data.location,
      starts_at: new Date(data.startsAt).toISOString(),
      capacity: data.capacity,
      description: data.description,
      created_by: context.userId,
    };
    const sb = (context as any).supabase;
    const q = data.id ? sb.from("sales_events").update(row).eq("id", data.id) : sb.from("sales_events").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const inviteGuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        eventId: z.string().uuid(),
        leadId: z.string().uuid().nullable(),
        name: z.string().trim().min(1).max(120),
        phone: z.string().trim().max(30).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await access(context, data.tenantId);
    const sb = (context as any).supabase;
    const { data: ev } = await sb.from("sales_events").select("id,capacity").eq("id", data.eventId).eq("tenant_id", data.tenantId).single();
    if (!ev) throw new Error("Không tìm thấy sự kiện");
    if (ev.capacity) {
      const { count } = await sb.from("event_tickets").select("id", { count: "exact", head: true }).eq("event_id", ev.id).neq("status", "cancelled");
      if ((count ?? 0) >= ev.capacity) throw new Error("Sự kiện đã đủ chỗ");
    }
    const { data: t, error } = await sb
      .from("event_tickets")
      .insert({ tenant_id: data.tenantId, event_id: ev.id, lead_id: data.leadId, guest_name: data.name, guest_phone: data.phone || null, code: code(), invited_by: context.userId })
      .select("id,code")
      .single();
    if (error) throw new Error(error.code === "23505" ? "Khách này đã có vé" : error.message);
    return t;
  });

export const checkInTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), code: z.string().trim().min(4).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await access(context, data.tenantId);
    const raw = data.code.trim();
    const c = (raw.match(/[A-Z0-9]{8}$/i)?.[0] ?? raw).toUpperCase();
    const sb = (context as any).supabase;
    const { data: t } = await sb
      .from("event_tickets")
      .select("id,guest_name,status,checked_in_at,event_id,sales_events(title)")
      .eq("tenant_id", data.tenantId)
      .eq("code", c)
      .maybeSingle();
    if (!t) return { ok: false as const, message: "Vé không hợp lệ" };
    const eventTitle = (t as any).sales_events?.title ?? "";
    if (t.status === "cancelled") return { ok: false as const, message: "Vé đã huỷ", guest: t.guest_name, eventTitle };
    if (t.status === "checked_in") return { ok: true as const, already: true, guest: t.guest_name, eventTitle, at: t.checked_in_at };
    const now = new Date().toISOString();
    await sb.from("event_tickets").update({ status: "checked_in", checked_in_at: now, checked_in_by: context.userId }).eq("id", t.id);
    return { ok: true as const, already: false, guest: t.guest_name, eventTitle, at: now };
  });
