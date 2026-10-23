import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { departmentScope, canReassign, type Membership } from "./departments";

async function load(sb: any, tenantId: string, userId: string) {
  const [rolesQ, teamsQ, memQ] = await Promise.all([
    sb.from("user_roles").select("role").eq("tenant_id", tenantId).eq("user_id", userId),
    sb.from("teams").select("id,name,description,created_at").eq("tenant_id", tenantId).is("deleted_at", null).order("name"),
    sb.from("team_members").select("team_id,user_id,is_lead").eq("tenant_id", tenantId),
  ]);
  const roles = (rolesQ.data ?? []).map((r: any) => r.role as string);
  if (!roles.length) throw new Error("Bạn không thuộc workspace này");
  const teams = teamsQ.data ?? [];
  const members = (memQ.data ?? []) as Membership[];
  const scope = departmentScope(roles, userId, members, teams.map((t: any) => t.id));
  return { roles, teams, members, scope };
}

export const getDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { teams, members, scope } = await load(sb, data.tenantId, context.userId);
    const { data: roleRows } = await sb.from("user_roles").select("user_id,role").eq("tenant_id", data.tenantId);
    const ids = [...new Set((roleRows ?? []).map((r: any) => r.user_id))];
    const { data: profs } = ids.length
      ? await sb.from("profiles").select("user_id,full_name,email").in("user_id", ids) : { data: [] };
    const people = (profs ?? []).map((p: any) => ({ user_id: p.user_id as string, name: (p.full_name || p.email || "Thành viên") as string }));

    const visible = teams.filter((t: any) => scope.viewable.includes(t.id));
    const memberIds = [...new Set(members.filter((m) => scope.viewable.includes(m.team_id)).map((m) => m.user_id))];
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const { data: leads } = memberIds.length
      ? await sb.from("leads").select("id,full_name,phone,status,owner_user_id,created_at,team_id")
          .eq("tenant_id", data.tenantId).is("deleted_at", null).in("owner_user_id", memberIds)
          .order("created_at", { ascending: false }).limit(500)
      : { data: [] };
    const { data: ctr } = memberIds.length
      ? await sb.from("contracts").select("owner_user_id,net_price,status,signed_at")
          .eq("tenant_id", data.tenantId).is("deleted_at", null).neq("status", "cancelled").in("owner_user_id", memberIds)
      : { data: [] };

    const depts = visible.map((t: any) => {
      const mem = members.filter((m) => m.team_id === t.id);
      const uids = new Set(mem.map((m) => m.user_id));
      const dl = (leads ?? []).filter((l: any) => uids.has(l.owner_user_id));
      const dc = (ctr ?? []).filter((c: any) => uids.has(c.owner_user_id));
      return {
        ...t,
        members: mem.map((m) => ({ ...m, name: people.find((p: any) => p.user_id === m.user_id)?.name ?? "Thành viên" })),
        stats: {
          leads30: dl.filter((l: any) => l.created_at >= since).length,
          won: dl.filter((l: any) => l.status === "won").length,
          contracts: dc.length,
          revenue: dc.reduce((s: number, c: any) => s + Number(c.net_price ?? 0), 0),
        },
        leads: dl.slice(0, 100),
      };
    });
    return { isAdmin: scope.isAdmin, departments: depts, people: scope.isAdmin ? people : [] };
  });

const mustAdmin = async (sb: any, tenantId: string, userId: string) => {
  const s = await load(sb, tenantId, userId);
  if (!s.scope.isAdmin) throw new Error("Chỉ quản trị viên được thay đổi phòng ban");
  return s;
};

export const saveDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    tenantId: z.string().uuid(), id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(100), description: z.string().trim().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await mustAdmin(sb, data.tenantId, context.userId);
    const row = { tenant_id: data.tenantId, name: data.name, description: data.description || null };
    const q = data.id ? sb.from("teams").update(row).eq("id", data.id).eq("tenant_id", data.tenantId) : sb.from("teams").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    await sb.from("audit_logs").insert({ tenant_id: data.tenantId, actor_user_id: context.userId, action: data.id ? "department.updated" : "department.created", entity: "team", entity_id: data.id ?? null, diff: row });
    return { ok: true };
  });

export const deleteDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await mustAdmin(sb, data.tenantId, context.userId);
    const { error } = await sb.from("teams").update({ deleted_at: new Date().toISOString() }).eq("id", data.id).eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    await sb.from("team_members").delete().eq("team_id", data.id).eq("tenant_id", data.tenantId);
    return { ok: true };
  });

export const setDepartmentMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    tenantId: z.string().uuid(), teamId: z.string().uuid(), userId: z.string().uuid(),
    action: z.enum(["add", "remove", "lead", "unlead"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { teams } = await mustAdmin(sb, data.tenantId, context.userId);
    if (!teams.some((t: any) => t.id === data.teamId)) throw new Error("Không tìm thấy phòng ban");
    const base = sb.from("team_members");
    let r;
    if (data.action === "add") r = await base.upsert({ tenant_id: data.tenantId, team_id: data.teamId, user_id: data.userId, is_lead: false }, { onConflict: "team_id,user_id" });
    else if (data.action === "remove") r = await base.delete().eq("team_id", data.teamId).eq("user_id", data.userId);
    else r = await base.update({ is_lead: data.action === "lead" }).eq("team_id", data.teamId).eq("user_id", data.userId);
    if (r.error) throw new Error(r.error.message);
    await sb.from("audit_logs").insert({ tenant_id: data.tenantId, actor_user_id: context.userId, action: `department.member_${data.action}`, entity: "team", entity_id: data.teamId, diff: { user_id: data.userId } });
    return { ok: true };
  });

export const reassignDepartmentLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    tenantId: z.string().uuid(), teamId: z.string().uuid(), leadId: z.string().uuid(), toUserId: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { scope, members } = await load(sb, data.tenantId, context.userId);
    if (!canReassign(scope, data.teamId, data.toUserId, members)) throw new Error("Chỉ được chuyển khách cho Sale trong phòng của bạn");
    const { data: lead } = await sb.from("leads").select("id,owner_user_id").eq("id", data.leadId).eq("tenant_id", data.tenantId).maybeSingle();
    if (!lead || !members.some((m) => m.team_id === data.teamId && m.user_id === lead.owner_user_id))
      throw new Error("Khách này không thuộc phòng ban");
    const { error } = await sb.from("leads").update({ owner_user_id: data.toUserId, team_id: data.teamId }).eq("id", data.leadId);
    if (error) throw new Error(error.message);
    await sb.from("audit_logs").insert({ tenant_id: data.tenantId, actor_user_id: context.userId, action: "lead.reassigned", entity: "lead", entity_id: data.leadId, diff: { from: lead.owner_user_id, to: data.toUserId, team_id: data.teamId } });
    return { ok: true };
  });
