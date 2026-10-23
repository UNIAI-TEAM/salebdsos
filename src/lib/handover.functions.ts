import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { departmentScope, type Membership } from "./departments";
import { planHandover, canHandover } from "./handover";

async function ctx(sb: any, tenantId: string, userId: string) {
  const [r, t, m] = await Promise.all([
    sb.from("user_roles").select("role").eq("tenant_id", tenantId).eq("user_id", userId),
    sb.from("teams").select("id").eq("tenant_id", tenantId).is("deleted_at", null),
    sb.from("team_members").select("team_id,user_id,is_lead").eq("tenant_id", tenantId),
  ]);
  const roles = (r.data ?? []).map((x: any) => x.role);
  if (!roles.length) throw new Error("Bạn không thuộc workspace này");
  const members = (m.data ?? []) as Membership[];
  return { members, scope: departmentScope(roles, userId, members, (t.data ?? []).map((x: any) => x.id)) };
}

export const getHandoverData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { members, scope } = await ctx(sb, data.tenantId, context.userId);
    if (!scope.isAdmin && !scope.manageable.length) return { allowed: false, people: [], history: [] };
    const { data: roleRows } = await sb.from("user_roles").select("user_id").eq("tenant_id", data.tenantId);
    let ids: string[] = [...new Set<string>((roleRows ?? []).map((r: any) => r.user_id))];
    if (!scope.isAdmin) ids = ids.filter((u) => members.some((m) => scope.manageable.includes(m.team_id) && m.user_id === u));
    const [{ data: profs }, { data: leads }, { data: hist }] = await Promise.all([
      ids.length ? sb.from("profiles").select("user_id,full_name,email").in("user_id", ids) : { data: [] },
      ids.length ? sb.from("leads").select("owner_user_id").eq("tenant_id", data.tenantId).is("deleted_at", null).not("status", "in", "(won,lost)").in("owner_user_id", ids).limit(5000) : { data: [] },
      sb.from("handovers").select("*").eq("tenant_id", data.tenantId).order("created_at", { ascending: false }).limit(50),
    ]);
    const open: Record<string, number> = {};
    for (const l of leads ?? []) open[l.owner_user_id] = (open[l.owner_user_id] ?? 0) + 1;
    const name: Record<string, string> = {};
    for (const p of profs ?? []) name[p.user_id] = p.full_name || p.email || "Thành viên";
    const people = ids.map((u) => ({ user_id: u, name: name[u] ?? "Thành viên", openLeads: open[u] ?? 0 }));
    const history = (hist ?? [])
      .filter((h: any) => scope.isAdmin || ids.includes(h.from_user_id))
      .map((h: any) => ({ ...h, from_name: name[h.from_user_id] ?? "Thành viên", to_names: (h.to_user_ids ?? []).map((u: string) => name[u] ?? "Thành viên") }));
    return { allowed: true, people, history };
  });

export const runHandover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    tenantId: z.string().uuid(),
    fromUserId: z.string().uuid(),
    toUserIds: z.array(z.string().uuid()).min(1).max(20),
    reason: z.string().trim().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const t = data.tenantId;
    const { members, scope } = await ctx(sb, t, context.userId);
    if (!canHandover(scope, data.fromUserId, data.toUserIds, data.toUserIds.length ? members : []))
      throw new Error("Bạn không có quyền bàn giao giữa các Sale này");

    const { data: leads } = await sb.from("leads").select("id")
      .eq("tenant_id", t).eq("owner_user_id", data.fromUserId).is("deleted_at", null).not("status", "in", "(won,lost)").limit(5000);
    const { data: loadRows } = await sb.from("leads").select("owner_user_id")
      .eq("tenant_id", t).is("deleted_at", null).not("status", "in", "(won,lost)").in("owner_user_id", data.toUserIds).limit(5000);
    const load: Record<string, number> = {};
    for (const r of loadRows ?? []) load[r.owner_user_id] = (load[r.owner_user_id] ?? 0) + 1;
    const leadIds = (leads ?? []).map((l: any) => l.id);
    const plan = planHandover(leadIds, data.toUserIds, load);

    const { data: h, error: hErr } = await sb.from("handovers").insert({
      tenant_id: t, from_user_id: data.fromUserId, to_user_ids: data.toUserIds,
      reason: data.reason || null, created_by: context.userId,
    }).select("id").single();
    if (hErr) throw new Error(hErr.message);

    // Leads + the conversations / open deals tied to them follow the same new owner.
    const byTarget: Record<string, string[]> = {};
    for (const [lid, to] of Object.entries(plan)) (byTarget[to] ??= []).push(lid);
    let convs = 0, deals = 0;
    for (const [to, ids] of Object.entries(byTarget)) {
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        await sb.from("leads").update({ owner_user_id: to }).in("id", chunk);
        const c = await sb.from("conversations").update({ owner_user_id: to }, { count: "exact" }).eq("tenant_id", t).eq("owner_user_id", data.fromUserId).in("lead_id", chunk);
        const d = await sb.from("pipeline_deals").update({ owner_user_id: to }, { count: "exact" }).eq("tenant_id", t).eq("owner_user_id", data.fromUserId).eq("status", "open").in("lead_id", chunk);
        convs += c.count ?? 0; deals += d.count ?? 0;
      }
    }
    // Remaining items not tied to a moved lead go to the first target.
    const first = data.toUserIds[0];
    const cu = await sb.from("customers").update({ owner_user_id: first }, { count: "exact" }).eq("tenant_id", t).eq("owner_user_id", data.fromUserId).is("deleted_at", null);
    const dl = await sb.from("pipeline_deals").update({ owner_user_id: first }, { count: "exact" }).eq("tenant_id", t).eq("owner_user_id", data.fromUserId).eq("status", "open").is("deleted_at", null);
    const cv = await sb.from("conversations").update({ owner_user_id: first }, { count: "exact" }).eq("tenant_id", t).eq("owner_user_id", data.fromUserId).neq("status", "closed");
    const ap = await sb.from("appointments").update({ assigned_to: first }, { count: "exact" }).eq("tenant_id", t).eq("assigned_to", data.fromUserId).eq("status", "scheduled").gte("starts_at", new Date().toISOString());

    const counts = {
      leads: leadIds.length, customers: cu.count ?? 0, deals: deals + (dl.count ?? 0),
      conversations: convs + (cv.count ?? 0), appointments: ap.count ?? 0,
    };
    await sb.from("handovers").update({ counts }).eq("id", h.id);
    if (leadIds.length) {
      const rows = Object.entries(plan).map(([lid, to]) => ({
        tenant_id: t, actor_user_id: context.userId, action: "lead.handover", entity: "lead", entity_id: lid,
        diff: { from: data.fromUserId, to, handover_id: h.id },
      }));
      for (let i = 0; i < rows.length; i += 500) await sb.from("audit_logs").insert(rows.slice(i, i + 500));
    }
    return { id: h.id, counts };
  });
