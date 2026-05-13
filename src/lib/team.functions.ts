// Team Management — server functions for performance, leaderboard, assignment.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Member = {
  userId: string;
  roleRowId: string;
  role: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  // Performance
  leadsTotal: number;
  leadsWon: number;
  leadsLost: number;
  conversionRate: number; // 0..1
  dealsOpen: number;
  dealsWon: number;
  revenue: number; // sum of won deal value
  pipelineValue: number; // sum of open deal value
  cardsCount: number;
  nfcQrInteractions: number;
  lastActivityAt: string | null;
};

export const getTeamPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; days?: number }) =>
    z.object({
      tenantId: z.string().uuid(),
      days: z.number().int().min(1).max(365).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const tenantId = data.tenantId;
    const sinceDays = data.days ?? 30;
    const sinceISO = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
    const sinceDate = sinceISO.slice(0, 10);

    const [rolesQ, profilesAllQ, leadsQ, dealsQ, cardsQ, analyticsQ] = await Promise.all([
      supabase.from("user_roles")
        .select("id, user_id, role, created_at")
        .eq("tenant_id", tenantId),
      supabase.from("profiles").select("user_id, email, full_name, avatar_url"),
      supabase.from("leads")
        .select("id, owner_user_id, status, created_at, updated_at")
        .eq("tenant_id", tenantId).is("deleted_at", null),
      supabase.from("pipeline_deals")
        .select("id, owner_user_id, value, status, last_activity_at, closed_at")
        .eq("tenant_id", tenantId).is("deleted_at", null),
      supabase.from("cards")
        .select("id, owner_user_id")
        .eq("tenant_id", tenantId).is("deleted_at", null),
      supabase.from("analytics_daily")
        .select("card_id, source, event_count, day")
        .eq("tenant_id", tenantId)
        .gte("day", sinceDate),
    ]);

    if (rolesQ.error) throw new Error(rolesQ.error.message);

    const roles = rolesQ.data ?? [];
    const profiles = profilesAllQ.data ?? [];
    const leads = leadsQ.data ?? [];
    const deals = dealsQ.data ?? [];
    const cards = cardsQ.data ?? [];
    const analytics = analyticsQ.data ?? [];

    // Card -> owner map for analytics attribution
    const cardOwner = new Map<string, string>();
    for (const c of cards) cardOwner.set(c.id as string, (c.owner_user_id as string) ?? "");

    // Aggregate analytics per owner (NFC + QR)
    const nfcQrByOwner = new Map<string, number>();
    for (const a of analytics) {
      const src = (a.source as string) ?? "";
      if (src !== "nfc" && src !== "qr") continue;
      const owner = cardOwner.get(a.card_id as string);
      if (!owner) continue;
      nfcQrByOwner.set(owner, (nfcQrByOwner.get(owner) ?? 0) + (a.event_count as number));
    }

    // Aggregate cards per owner
    const cardsByOwner = new Map<string, number>();
    for (const c of cards) {
      const o = (c.owner_user_id as string) ?? "";
      if (!o) continue;
      cardsByOwner.set(o, (cardsByOwner.get(o) ?? 0) + 1);
    }

    // Aggregate leads per owner
    const leadStats = new Map<string, { total: number; won: number; lost: number; lastAt: string | null }>();
    for (const l of leads) {
      const o = (l.owner_user_id as string) ?? "";
      if (!o) continue;
      const cur = leadStats.get(o) ?? { total: 0, won: 0, lost: 0, lastAt: null };
      cur.total += 1;
      if (l.status === "won") cur.won += 1;
      if (l.status === "lost") cur.lost += 1;
      const u = (l.updated_at as string) ?? null;
      if (u && (!cur.lastAt || u > cur.lastAt)) cur.lastAt = u;
      leadStats.set(o, cur);
    }

    // Aggregate deals per owner
    const dealStats = new Map<string, { open: number; won: number; revenue: number; pipeline: number; lastAt: string | null }>();
    for (const d of deals) {
      const o = (d.owner_user_id as string) ?? "";
      if (!o) continue;
      const cur = dealStats.get(o) ?? { open: 0, won: 0, revenue: 0, pipeline: 0, lastAt: null };
      const val = Number(d.value ?? 0);
      if (d.status === "won") {
        cur.won += 1;
        cur.revenue += val;
      } else if (d.status === "open") {
        cur.open += 1;
        cur.pipeline += val;
      }
      const u = (d.last_activity_at as string) ?? null;
      if (u && (!cur.lastAt || u > cur.lastAt)) cur.lastAt = u;
      dealStats.set(o, cur);
    }

    const members: Member[] = roles.map((r) => {
      const userId = r.user_id as string;
      const p = profiles.find((x) => x.user_id === userId);
      const ls = leadStats.get(userId) ?? { total: 0, won: 0, lost: 0, lastAt: null };
      const ds = dealStats.get(userId) ?? { open: 0, won: 0, revenue: 0, pipeline: 0, lastAt: null };
      const conv = ls.total > 0 ? ls.won / ls.total : 0;
      const lastActivityAt =
        ls.lastAt && ds.lastAt ? (ls.lastAt > ds.lastAt ? ls.lastAt : ds.lastAt) : (ls.lastAt ?? ds.lastAt);
      return {
        userId,
        roleRowId: r.id as string,
        role: r.role as string,
        email: p?.email ?? null,
        fullName: p?.full_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
        joinedAt: r.created_at as string,
        leadsTotal: ls.total,
        leadsWon: ls.won,
        leadsLost: ls.lost,
        conversionRate: conv,
        dealsOpen: ds.open,
        dealsWon: ds.won,
        revenue: ds.revenue,
        pipelineValue: ds.pipeline,
        cardsCount: cardsByOwner.get(userId) ?? 0,
        nfcQrInteractions: nfcQrByOwner.get(userId) ?? 0,
        lastActivityAt,
      };
    });

    // Totals
    const totals = members.reduce(
      (acc, m) => {
        acc.leads += m.leadsTotal;
        acc.dealsWon += m.dealsWon;
        acc.dealsOpen += m.dealsOpen;
        acc.revenue += m.revenue;
        acc.pipeline += m.pipelineValue;
        acc.nfcQr += m.nfcQrInteractions;
        return acc;
      },
      { leads: 0, dealsWon: 0, dealsOpen: 0, revenue: 0, pipeline: 0, nfcQr: 0 },
    );
    const avgConv =
      members.filter((m) => m.leadsTotal > 0).reduce((s, m) => s + m.conversionRate, 0) /
      Math.max(1, members.filter((m) => m.leadsTotal > 0).length);

    return {
      members,
      totals: {
        ...totals,
        memberCount: members.length,
        activeMembers: members.filter((m) => m.leadsTotal + m.dealsOpen + m.dealsWon > 0).length,
        avgConversion: avgConv,
      },
    };
  });

export const getTeamLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; metric?: "revenue" | "deals" | "leads" | "conversion"; limit?: number }) =>
    z.object({
      tenantId: z.string().uuid(),
      metric: z.enum(["revenue", "deals", "leads", "conversion"]).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: members, error } = await context.supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    const userIds = (members ?? []).map((m) => m.user_id as string);
    if (!userIds.length) return { rows: [] };

    const [profilesQ, leadsQ, dealsQ] = await Promise.all([
      context.supabase.from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds),
      context.supabase.from("leads")
        .select("owner_user_id, status")
        .eq("tenant_id", data.tenantId).is("deleted_at", null),
      context.supabase.from("pipeline_deals")
        .select("owner_user_id, status, value")
        .eq("tenant_id", data.tenantId).is("deleted_at", null),
    ]);

    const profiles = profilesQ.data ?? [];
    const leads = leadsQ.data ?? [];
    const deals = dealsQ.data ?? [];

    const rows = userIds.map((uid) => {
      const p = profiles.find((x) => x.user_id === uid);
      const myLeads = leads.filter((l) => l.owner_user_id === uid);
      const myDeals = deals.filter((d) => d.owner_user_id === uid);
      const wonLeads = myLeads.filter((l) => l.status === "won").length;
      const wonDeals = myDeals.filter((d) => d.status === "won");
      const revenue = wonDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);
      const conversion = myLeads.length ? wonLeads / myLeads.length : 0;
      return {
        userId: uid,
        fullName: p?.full_name ?? null,
        email: p?.email ?? null,
        avatarUrl: p?.avatar_url ?? null,
        leads: myLeads.length,
        dealsWon: wonDeals.length,
        revenue,
        conversion,
      };
    });

    const metric = data.metric ?? "revenue";
    rows.sort((a, b) => {
      switch (metric) {
        case "deals": return b.dealsWon - a.dealsWon;
        case "leads": return b.leads - a.leads;
        case "conversion": return b.conversion - a.conversion;
        default: return b.revenue - a.revenue;
      }
    });

    return { rows: rows.slice(0, data.limit ?? 10) };
  });

export const assignLeadsToMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; leadIds: string[]; ownerUserId: string | null }) =>
    z.object({
      tenantId: z.string().uuid(),
      leadIds: z.array(z.string().uuid()).min(1).max(500),
      ownerUserId: z.string().uuid().nullable(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("leads")
      .update({ owner_user_id: data.ownerUserId })
      .in("id", data.leadIds)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.leadIds.length };
  });

export const assignCardsToMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; cardIds: string[]; ownerUserId: string }) =>
    z.object({
      tenantId: z.string().uuid(),
      cardIds: z.array(z.string().uuid()).min(1).max(200),
      ownerUserId: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("cards")
      .update({ owner_user_id: data.ownerUserId })
      .in("id", data.cardIds)
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.cardIds.length };
  });

export const listTenantCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) =>
    z.object({ tenantId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("cards")
      .select("id, display_name, slug, owner_user_id, is_published")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { cards: rows ?? [] };
  });

export const getTeamActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; limit?: number }) =>
    z.object({
      tenantId: z.string().uuid(),
      limit: z.number().int().min(1).max(50).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const limit = data.limit ?? 10;
    const [leadsQ, dealsQ, profilesQ] = await Promise.all([
      context.supabase.from("leads")
        .select("id, full_name, status, owner_user_id, updated_at")
        .eq("tenant_id", data.tenantId).is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(limit),
      context.supabase.from("pipeline_deals")
        .select("id, title, status, value, owner_user_id, last_activity_at")
        .eq("tenant_id", data.tenantId).is("deleted_at", null)
        .order("last_activity_at", { ascending: false })
        .limit(limit),
      context.supabase.from("user_roles")
        .select("user_id, profiles:user_id(full_name, email, avatar_url)")
        .eq("tenant_id", data.tenantId),
    ]);

    const profileMap = new Map<string, { name: string | null; email: string | null; avatarUrl: string | null }>();
    for (const r of profilesQ.data ?? []) {
      const p = (r as any).profiles;
      profileMap.set(r.user_id as string, {
        name: p?.full_name ?? null,
        email: p?.email ?? null,
        avatarUrl: p?.avatar_url ?? null,
      });
    }

    const leadActs = (leadsQ.data ?? []).map((l) => ({
      kind: "lead" as const,
      id: l.id as string,
      title: l.full_name as string,
      status: l.status as string,
      ownerUserId: l.owner_user_id as string | null,
      ownerName: l.owner_user_id ? profileMap.get(l.owner_user_id as string)?.name ?? null : null,
      occurredAt: l.updated_at as string,
      value: null as number | null,
    }));
    const dealActs = (dealsQ.data ?? []).map((d) => ({
      kind: "deal" as const,
      id: d.id as string,
      title: d.title as string,
      status: d.status as string,
      ownerUserId: d.owner_user_id as string | null,
      ownerName: d.owner_user_id ? profileMap.get(d.owner_user_id as string)?.name ?? null : null,
      occurredAt: d.last_activity_at as string,
      value: Number(d.value ?? 0),
    }));

    const all = [...leadActs, ...dealActs]
      .sort((a, b) => (b.occurredAt > a.occurredAt ? 1 : -1))
      .slice(0, limit);

    return { activities: all };
  });
