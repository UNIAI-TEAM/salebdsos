import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TOUCH_LABEL } from "@/lib/journey.functions";
import { LEAD_ROUTING_KEY, parseLeadRouting, WORKING_LEAD_STATUSES } from "@/lib/lead-routing";

const MANAGER_ROLES = new Set(["owner", "admin", "manager", "platform_admin"]);
const SALE_ROLES = new Set(["owner", "admin", "manager", "agent"]);

const Input = z.object({
  tenantId: z.string().uuid(),
  ownerId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  days: z.number().int().min(1).max(180).default(30),
});

function submittedContactKey(row: { phone?: string | null; email?: string | null }) {
  const phone = row.phone?.replace(/\D/g, "");
  const email = row.email?.trim().toLowerCase();
  return phone || email || null;
}

function isCustomerSubmission(row: { source?: string | null; meta?: unknown }) {
  const source = row.source?.trim().toLowerCase() ?? "";
  const meta = row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
    ? row.meta as Record<string, unknown>
    : {};
  return source === "landing page" || source === "qr danh thiếp" || source.startsWith("qr:") ||
    Boolean(meta["sales_page_id"] || meta["sales_page_slug"] || meta["card_slug"] || meta["qr_code"] || meta["lead_form_id"] || meta["submitted_form"]);
}

export const getSaleOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: callerRoles, error: callerRoleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("tenant_id", data.tenantId)
      .eq("user_id", userId);
    if (callerRoleError) throw new Error(callerRoleError.message);

    const canManage = (callerRoles ?? []).some((row) => MANAGER_ROLES.has(row.role));
    const ownerId = canManage && data.ownerId ? data.ownerId : userId;
    const { data: targetRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("tenant_id", data.tenantId)
      .eq("user_id", ownerId)
      .limit(1)
      .maybeSingle();
    if (!targetRole || !SALE_ROLES.has(targetRole.role)) throw new Error("Không tìm thấy Sale trong workspace này");

    const since = new Date(Date.now() - data.days * 86400_000).toISOString();
    const now = new Date();
    const scheduleEnd = new Date(now.getTime() + 60 * 86400_000).toISOString();

    const [profileQ, membersQ, cardsQ, dealsQ, leadsQ, appointmentsQ, routingQ, ownedQrQ] = await Promise.all([
      supabase.from("profiles").select("user_id,full_name,email,phone,avatar_url").eq("user_id", ownerId).maybeSingle(),
      canManage
        ? supabase.from("user_roles").select("user_id,role").eq("tenant_id", data.tenantId)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("cards").select("id,slug").eq("tenant_id", data.tenantId).eq("owner_user_id", ownerId).is("deleted_at", null),
      supabase.from("pipeline_deals").select("id,project_id,customer_id,value,currency,status,closed_at").eq("tenant_id", data.tenantId).eq("owner_user_id", ownerId).is("deleted_at", null),
      supabase.from("leads").select("id,full_name,phone,email,source,status,project_id,card_id,created_at,updated_at,meta").eq("tenant_id", data.tenantId).eq("owner_user_id", ownerId).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("appointments").select("id,project_id,customer_id,lead_id,title,location,starts_at,ends_at,status,is_published,assigned_to,created_by,customers(full_name)").eq("tenant_id", data.tenantId).or(`assigned_to.eq.${ownerId},created_by.eq.${ownerId}`).gte("starts_at", now.toISOString()).lte("starts_at", scheduleEnd).order("starts_at", { ascending: true }).limit(100),
      supabase.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", LEAD_ROUTING_KEY).maybeSingle(),
      supabase.from("project_qr_codes").select("id,project_id,code,label,channel").eq("tenant_id", data.tenantId).eq("created_by", ownerId).eq("is_active", true),
    ]);
    const firstError = [profileQ.error, cardsQ.error, dealsQ.error, leadsQ.error, appointmentsQ.error, ownedQrQ.error].find(Boolean);
    if (firstError) throw new Error(firstError.message);

    const cards = cardsQ.data ?? [];
    const cardIds = cards.map((card) => card.id);
    const cardSlugs = new Set(cards.map((card) => card.slug));
    const { data: links, error: linksError } = cardIds.length
      ? await supabase.from("card_projects").select("project_id").in("card_id", cardIds)
      : { data: [], error: null };
    if (linksError) throw new Error(linksError.message);
    const projectIds = [...new Set([
      ...(links ?? []).map((link) => link.project_id),
      ...(ownedQrQ.data ?? []).map((qr) => qr.project_id),
      ...(dealsQ.data ?? []).map((deal) => deal.project_id).filter((id): id is string => Boolean(id)),
      ...(leadsQ.data ?? []).map((lead) => lead.project_id).filter((id): id is string => Boolean(id)),
      ...(appointmentsQ.data ?? []).map((item) => item.project_id).filter((id): id is string => Boolean(id)),
    ])];

    const [projectsQ, touchesQ, cardEventsQ, projectEventsQ] = await Promise.all([
      projectIds.length
        ? supabase.from("projects").select("id,name").in("id", projectIds)
        : Promise.resolve({ data: [], error: null }),
      projectIds.length
        ? supabase.from("project_touchpoints").select("id,project_id,qr_code_id,lead_id,session_id,event_type,channel,device_type,occurred_at,meta").eq("tenant_id", data.tenantId).in("project_id", projectIds).gte("occurred_at", since).order("occurred_at", { ascending: false }).limit(8000)
        : Promise.resolve({ data: [], error: null }),
      cardIds.length
        ? supabase.from("interaction_events").select("id,card_id,source,device_type,country,occurred_at").in("card_id", cardIds).gte("occurred_at", since).order("occurred_at", { ascending: false }).limit(4000)
        : Promise.resolve({ data: [], error: null }),
      projectIds.length
        ? supabase.from("appointments").select("id,project_id,title,location,starts_at,ends_at,status").eq("tenant_id", data.tenantId).eq("is_published", true).in("project_id", projectIds).gte("starts_at", now.toISOString()).lte("starts_at", scheduleEnd).order("starts_at", { ascending: true }).limit(100)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const secondError = [projectsQ.error, touchesQ.error, cardEventsQ.error, projectEventsQ.error].find(Boolean);
    if (secondError) throw new Error(secondError.message);

    const projects = (projectsQ.data ?? []).sort((a, b) => a.name.localeCompare(b.name, "vi"));
    const projectNames = new Map(projects.map((project) => [project.id, project.name]));
    if (data.projectId && !projectNames.has(data.projectId)) throw new Error("Dự án không thuộc Sale này");
    const ownedQrIds = new Set((ownedQrQ.data ?? []).map((qr) => qr.id));
    const relevantTouches = (touchesQ.data ?? []).filter((touch) => {
      const meta = (touch.meta ?? {}) as Record<string, unknown>;
      return (touch.qr_code_id && ownedQrIds.has(touch.qr_code_id)) ||
        (typeof meta["card_slug"] === "string" && cardSlugs.has(meta["card_slug"]));
    });

    const interactionCount = (touches: typeof relevantTouches) => {
      const keys = new Set<string>();
      for (const touch of touches) {
        if (["qr_scan", "card_view"].includes(touch.event_type)) {
          keys.add(`${touch.session_id}:${touch.event_type}:${touch.occurred_at}`);
        }
      }
      return keys;
    };
    const activeTouches = data.projectId
      ? relevantTouches.filter((touch) => touch.project_id === data.projectId)
      : relevantTouches;
    const interactionKeys = interactionCount(activeTouches);
    if (!data.projectId) {
      for (const event of cardEventsQ.data ?? []) interactionKeys.add(`card:${event.id}`);
    }

    const leads = leadsQ.data ?? [];
    const activeLeads = data.projectId ? leads.filter((lead) => lead.project_id === data.projectId) : leads;
    const submittedLeads = activeLeads.filter(isCustomerSubmission);
    const servedKeys = new Set(
      submittedLeads.map(submittedContactKey).filter((key): key is string => Boolean(key)),
    );
    const allWonDeals = (dealsQ.data ?? []).filter((deal) => deal.status === "won");
    const wonDeals = data.projectId ? allWonDeals.filter((deal) => deal.project_id === data.projectId) : allWonDeals;
    const wonProjects = new Set(wonDeals.map((deal) => deal.project_id).filter(Boolean));

    const projectComparison = projects.map((project) => {
      const projectTouches = relevantTouches.filter((touch) => touch.project_id === project.id);
      const projectLeads = leads.filter((lead) => lead.project_id === project.id && isCustomerSubmission(lead));
      const customerKeys = new Set(
        projectLeads.map(submittedContactKey).filter((key): key is string => Boolean(key)),
      );
      const contractsSigned = allWonDeals.filter((deal) => deal.project_id === project.id).length;
      return {
        projectId: project.id,
        name: project.name,
        interactions: interactionCount(projectTouches).size,
        customersServed: customerKeys.size,
        contractsSigned,
        conversionRate: customerKeys.size ? Math.round((contractsSigned / customerKeys.size) * 1000) / 10 : 0,
      };
    }).sort((a, b) => b.interactions - a.interactions || b.customersServed - a.customersServed || a.name.localeCompare(b.name, "vi"));

    const identified = submittedLeads
      .filter((lead) => Boolean(submittedContactKey(lead)))
      .filter((lead) => cardIds.includes(lead.card_id ?? "") || /qr|landing/i.test(lead.source ?? ""))
      .slice(0, 20)
      .map((lead) => ({
        id: lead.id,
        name: lead.full_name || lead.phone || lead.email || "Khách hàng",
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        status: lead.status,
        projectName: lead.project_id ? projectNames.get(lead.project_id) ?? null : null,
        at: lead.created_at,
      }));

    const identifiedLeadIds = new Set(identified.map((lead) => lead.id));
    const anonymousBySession = new Map<string, typeof relevantTouches[number]>();
    for (const touch of activeTouches) {
      if (touch.lead_id && identifiedLeadIds.has(touch.lead_id)) continue;
      if (!anonymousBySession.has(touch.session_id)) anonymousBySession.set(touch.session_id, touch);
    }
    const anonymous = [...anonymousBySession.values()].slice(0, 20).map((touch) => ({
      id: touch.session_id,
      projectName: projectNames.get(touch.project_id) ?? "Dự án",
      eventLabel: TOUCH_LABEL[touch.event_type] ?? touch.event_type,
      channel: touch.channel,
      device: touch.device_type,
      at: touch.occurred_at,
    }));

    const appointments = (appointmentsQ.data ?? []).filter((item) => !item.is_published && (!data.projectId || item.project_id === data.projectId)).slice(0, 12).map((item) => ({
      id: item.id,
      title: item.title,
      location: item.location,
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      status: item.status,
      customerName: Array.isArray(item.customers) ? item.customers[0]?.full_name ?? null : item.customers?.full_name ?? null,
      projectName: item.project_id ? projectNames.get(item.project_id) ?? null : null,
    }));
    const events = (projectEventsQ.data ?? []).filter((item) => !data.projectId || item.project_id === data.projectId).slice(0, 12).map((item) => ({
      id: item.id,
      title: item.title,
      location: item.location,
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      status: item.status,
      projectName: item.project_id ? projectNames.get(item.project_id) ?? null : null,
    }));

    const routing = parseLeadRouting(routingQ.data?.value);
    const workingStatuses = new Set<string>(WORKING_LEAD_STATUSES);
    const nowMs = now.getTime();
    const slaMs = routing.slaMinutes * 60_000;
    const coldMs = routing.coldDays * 86400_000;

    const leadRef = (lead: typeof leads[number]) => ({
      id: lead.id,
      name: lead.full_name || lead.phone || lead.email || "Khách hàng",
      phone: lead.phone,
      source: lead.source,
      projectName: lead.project_id ? projectNames.get(lead.project_id) ?? null : null,
    });

    const slaAlerts = activeLeads
      .filter((lead) => lead.status === "new" && nowMs - new Date(lead.created_at).getTime() > slaMs)
      .slice(0, 20)
      .map((lead) => ({
        ...leadRef(lead),
        at: lead.created_at,
        overdueMinutes: Math.round((nowMs - new Date(lead.created_at).getTime() - slaMs) / 60_000),
      }))
      .sort((a, b) => b.overdueMinutes - a.overdueMinutes);

    const slaDueSoon = activeLeads.filter((lead) => {
      const age = nowMs - new Date(lead.created_at).getTime();
      return lead.status === "new" && age <= slaMs;
    }).length;

    const coldLeads = activeLeads
      .filter((lead) => workingStatuses.has(lead.status) &&
        nowMs - new Date(lead.updated_at ?? lead.created_at).getTime() > coldMs)
      .slice(0, 20)
      .map((lead) => ({
        ...leadRef(lead),
        status: lead.status,
        at: lead.updated_at ?? lead.created_at,
        idleDays: Math.floor((nowMs - new Date(lead.updated_at ?? lead.created_at).getTime()) / 86400_000),
      }))
      .sort((a, b) => b.idleDays - a.idleDays);

    const recentActivity = activeTouches.slice(0, 25).map((touch) => ({
      id: String(touch.id),
      label: TOUCH_LABEL[touch.event_type] ?? touch.event_type,
      projectName: projectNames.get(touch.project_id) ?? "Dự án",
      channel: touch.channel,
      at: touch.occurred_at,
    }));

    let members: Array<{ userId: string; name: string; role: string; avatarUrl: string | null }> = [];
    if (canManage) {
      const memberRows = (membersQ.data ?? []).filter((row) => SALE_ROLES.has(row.role));
      const memberIds = [...new Set(memberRows.map((row) => row.user_id))];
      const { data: memberProfiles } = memberIds.length
        ? await supabase.from("profiles").select("user_id,full_name,email,avatar_url").in("user_id", memberIds)
        : { data: [] };
      members = memberRows.map((row) => {
        const profile = memberProfiles?.find((item) => item.user_id === row.user_id);
        return {
          userId: row.user_id,
          name: profile?.full_name || profile?.email?.split("@")[0] || "Sale",
          role: row.role,
          avatarUrl: profile?.avatar_url ?? null,
        };
      }).sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }

    // Hoa hồng tính theo chính sách của sàn (theo sale / nhóm / dự án)
    const { data: commissionRows } = await supabase
      .from("contract_commissions")
      .select("amount,status,contract_id")
      .eq("tenant_id", data.tenantId)
      .eq("beneficiary_user_id", ownerId);
    const commission = { total: 0, pending: 0, approved: 0, paid: 0 };
    for (const row of commissionRows ?? []) {
      const amount = Number(row.amount ?? 0);
      commission.total += amount;
      if (row.status === "paid") commission.paid += amount;
      else if (row.status === "approved") commission.approved += amount;
      else commission.pending += amount;
    }
    const { loadCommissionRules } = await import("@/lib/commission.server");
    const commissionRules = await loadCommissionRules(supabase, data.tenantId);
    const { resolveCommissionPercent } = await import("@/lib/commission-rules");
    const { data: ownerTeam } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("tenant_id", data.tenantId)
      .eq("user_id", ownerId)
      .limit(1)
      .maybeSingle();
    const commissionPolicy = resolveCommissionPercent(commissionRules, {
      projectId: data.projectId ?? null,
      teamId: ownerTeam?.team_id ?? null,
      userId: ownerId,
    });

    return {
      canManage,
      ownerId,
      sale: {
        name: profileQ.data?.full_name || profileQ.data?.email?.split("@")[0] || "Sale",
        email: profileQ.data?.email ?? null,
        phone: profileQ.data?.phone ?? null,
        avatarUrl: profileQ.data?.avatar_url ?? null,
        role: targetRole.role,
      },
      members,
      projects,
      selectedProjectId: data.projectId ?? null,
      selectedProjectName: data.projectId ? projectNames.get(data.projectId) ?? null : null,
      projectComparison,
      metrics: {
        interactions: interactionKeys.size,
        customersServed: servedKeys.size,
        contractsSigned: wonDeals.length,
        projectsSold: wonProjects.size,
        conversionRate: servedKeys.size ? Math.round((wonDeals.length / servedKeys.size) * 1000) / 10 : 0,
        commissionTotal: Math.round(commission.total),
        commissionPaid: Math.round(commission.paid),
        commissionApproved: Math.round(commission.approved),
        commissionPending: Math.round(commission.pending),
      },
      commissionPolicy: {
        enabled: commissionRules.enabled,
        percent: commissionPolicy.percent,
        source: commissionPolicy.source,
        salePercent: commissionRules.splits.sale,
      },
      routing: {
        enabled: routing.enabled,
        slaMinutes: routing.slaMinutes,
        coldDays: routing.coldDays,
      },
      slaAlerts,
      slaDueSoon,
      coldLeads,
      appointments,
      events,
      identified,
      anonymous,
      recentActivity,
      updatedAt: new Date().toISOString(),
    };
  });