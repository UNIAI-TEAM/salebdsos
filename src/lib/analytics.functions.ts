// Analytics dashboard — server functions reading from analytics_daily
// (aggregated table). Today's data falls back to live interaction_events.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Filters = z.object({
  tenantId: z.string().uuid(),
  days: z.number().int().min(1).max(365).default(30),
  source: z.string().optional(),
  cardId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
});

function dayStr(d: Date) { return d.toISOString().slice(0, 10); }

export const getDashboardKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Filters.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const days = data.days;
    const today = new Date();
    const sinceDate = new Date(today.getTime() - days * 86400_000);
    const since = dayStr(sinceDate);
    const prevSince = dayStr(new Date(sinceDate.getTime() - days * 86400_000));
    const todayStr = dayStr(today);

    // Filter cards by owner if requested
    let cardIdsFilter: string[] | null = null;
    if (data.ownerId || data.cardId) {
      let q = supabase.from("cards").select("id").eq("tenant_id", data.tenantId);
      if (data.ownerId) q = q.eq("owner_user_id", data.ownerId);
      if (data.cardId) q = q.eq("id", data.cardId);
      const { data: c } = await q;
      cardIdsFilter = (c ?? []).map((r: any) => r.id);
      if (cardIdsFilter.length === 0) cardIdsFilter = ["00000000-0000-0000-0000-000000000000"];
    }

    // Aggregated rows (analytics_daily)
    let aggQ = supabase.from("analytics_daily")
      .select("source, day, event_count, unique_visitors, card_id")
      .eq("tenant_id", data.tenantId).gte("day", prevSince);
    if (data.source) aggQ = aggQ.eq("source", data.source);
    if (cardIdsFilter) aggQ = aggQ.in("card_id", cardIdsFilter);
    const { data: agg, error: aggErr } = await aggQ;
    if (aggErr) throw aggErr;

    // Today's live events (not yet aggregated)
    let liveQ = supabase.from("interaction_events")
      .select("source, occurred_at, card_id, ip_hash")
      .eq("tenant_id", data.tenantId).gte("occurred_at", todayStr);
    if (data.source) liveQ = liveQ.eq("source", data.source);
    if (cardIdsFilter) liveQ = liveQ.in("card_id", cardIdsFilter);
    const { data: live } = await liveQ;

    type Row = { source: string; day: string; count: number; uniques: number; card_id: string };
    const rows: Row[] = (agg ?? []).map((r: any) => ({
      source: r.source, day: r.day, count: r.event_count,
      uniques: r.unique_visitors, card_id: r.card_id,
    }));
    // append today live as a synthetic row aggregated client-side
    const liveBySrcCard = new Map<string, { count: number; ips: Set<string> }>();
    for (const e of (live ?? []) as any[]) {
      const k = `${e.source}|${e.card_id}`;
      const ent = liveBySrcCard.get(k) ?? { count: 0, ips: new Set<string>() };
      ent.count++;
      if (e.ip_hash) ent.ips.add(e.ip_hash);
      liveBySrcCard.set(k, ent);
    }
    for (const [k, v] of liveBySrcCard) {
      const [source, card_id] = k.split("|");
      rows.push({ source, day: todayStr, count: v.count, uniques: v.ips.size, card_id });
    }

    const inWindow = rows.filter((r) => r.day >= since);
    const inPrev = rows.filter((r) => r.day < since);

    // Source totals (current window)
    const bySource = new Map<string, number>();
    for (const r of inWindow) bySource.set(r.source, (bySource.get(r.source) ?? 0) + r.count);

    // Daily series, with separate lines per known source
    const SOURCES = ["nfc", "qr", "link", "social", "direct"];
    const dayMap = new Map<string, Record<string, number>>();
    // initialise full window
    for (let i = 0; i < days; i++) {
      const d = dayStr(new Date(today.getTime() - i * 86400_000));
      dayMap.set(d, Object.fromEntries(SOURCES.map((s) => [s, 0])) as any);
    }
    for (const r of inWindow) {
      const slot = dayMap.get(r.day) ?? Object.fromEntries(SOURCES.map((s) => [s, 0]));
      slot[r.source] = (slot[r.source] ?? 0) + r.count;
      dayMap.set(r.day, slot);
    }
    const daily = Array.from(dayMap, ([day, vals]) => ({ day, ...vals, total: SOURCES.reduce((s, k) => s + (vals[k] ?? 0), 0) }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // Leads (current vs previous window)
    let leadsQ = supabase.from("leads").select("id, status, created_at, project_id, owner_user_id, card_id, source")
      .eq("tenant_id", data.tenantId).is("deleted_at", null)
      .gte("created_at", prevSince);
    if (data.projectId) leadsQ = leadsQ.eq("project_id", data.projectId);
    if (data.ownerId) leadsQ = leadsQ.eq("owner_user_id", data.ownerId);
    if (data.source) leadsQ = leadsQ.eq("source", data.source);
    const { data: leadsAll } = await leadsQ;
    const leadsCurr = (leadsAll ?? []).filter((l: any) => l.created_at >= since);
    const leadsPrev = (leadsAll ?? []).filter((l: any) => l.created_at < since);
    const wonCurr = leadsCurr.filter((l: any) => l.status === "won").length;

    const total = (m: Map<string, number>) => Array.from(m.values()).reduce((s, n) => s + n, 0);
    const prevSourceMap = new Map<string, number>();
    for (const r of inPrev) prevSourceMap.set(r.source, (prevSourceMap.get(r.source) ?? 0) + r.count);

    const totalCurr = total(bySource);
    const totalPrev = total(prevSourceMap);
    const pct = (curr: number, prev: number) =>
      prev === 0 ? (curr ? 100 : 0) : Math.round(((curr - prev) / prev) * 1000) / 10;

    return {
      window: { since, today: todayStr, days },
      kpis: {
        nfc: bySource.get("nfc") ?? 0,
        qr: bySource.get("qr") ?? 0,
        link: bySource.get("link") ?? 0,
        social: bySource.get("social") ?? 0,
        direct: bySource.get("direct") ?? 0,
        totalTouches: totalCurr,
        leads: leadsCurr.length,
        won: wonCurr,
        conversion: leadsCurr.length ? Math.round((wonCurr / leadsCurr.length) * 1000) / 10 : 0,
        deltas: {
          touches: pct(totalCurr, totalPrev),
          leads: pct(leadsCurr.length, leadsPrev.length),
          nfc: pct(bySource.get("nfc") ?? 0, prevSourceMap.get("nfc") ?? 0),
          qr: pct(bySource.get("qr") ?? 0, prevSourceMap.get("qr") ?? 0),
        },
      },
      daily,
      bySource: Array.from(bySource, ([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
      funnel: buildFunnel(totalCurr, leadsCurr),
    };
  });

function buildFunnel(touches: number, leads: any[]) {
  const contacted = leads.filter((l) => ["contacted","consulting","quoted","deposit","won"].includes(l.status)).length;
  const consulting = leads.filter((l) => ["consulting","quoted","deposit","won"].includes(l.status)).length;
  const quoted = leads.filter((l) => ["quoted","deposit","won"].includes(l.status)).length;
  const won = leads.filter((l) => l.status === "won").length;
  const stages = [
    { stage: "Lượt chạm (NFC/QR/Link)", v: touches },
    { stage: "Trở thành lead", v: leads.length },
    { stage: "Đã liên hệ", v: contacted },
    { stage: "Đang tư vấn", v: consulting },
    { stage: "Đã báo giá", v: quoted },
    { stage: "Chốt thành công", v: won },
  ];
  const max = stages[0].v || 1;
  return stages.map((s) => ({ ...s, pct: max ? Math.round((s.v / max) * 1000) / 10 : 0 }));
}

export const getTopRankings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Filters.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const since = dayStr(new Date(Date.now() - data.days * 86400_000));

    // top cards by aggregated event_count
    let aggQ = supabase.from("analytics_daily")
      .select("card_id, event_count")
      .eq("tenant_id", data.tenantId).gte("day", since);
    if (data.source) aggQ = aggQ.eq("source", data.source);
    const { data: agg } = await aggQ;
    const cardCount = new Map<string, number>();
    for (const r of (agg ?? []) as any[])
      cardCount.set(r.card_id, (cardCount.get(r.card_id) ?? 0) + r.event_count);

    const cardIds = Array.from(cardCount.keys());
    let cardsRows: any[] = [];
    if (cardIds.length) {
      const { data: rows } = await supabase
        .from("cards").select("id, display_name, owner_user_id, slug")
        .in("id", cardIds).is("deleted_at", null);
      cardsRows = rows ?? [];
    }
    const topCards = cardsRows
      .map((c) => ({ ...c, touches: cardCount.get(c.id) ?? 0 }))
      .sort((a, b) => b.touches - a.touches).slice(0, 10);

    // top projects by lead count
    const sinceISO = new Date(Date.now() - data.days * 86400_000).toISOString();
    const { data: leadsRows } = await supabase
      .from("leads").select("project_id, owner_user_id, status, created_at")
      .eq("tenant_id", data.tenantId).is("deleted_at", null).gte("created_at", sinceISO);
    const projCount = new Map<string, { leads: number; won: number }>();
    const ownerCount = new Map<string, { leads: number; won: number }>();
    for (const l of (leadsRows ?? []) as any[]) {
      if (l.project_id) {
        const e = projCount.get(l.project_id) ?? { leads: 0, won: 0 };
        e.leads++; if (l.status === "won") e.won++;
        projCount.set(l.project_id, e);
      }
      if (l.owner_user_id) {
        const e = ownerCount.get(l.owner_user_id) ?? { leads: 0, won: 0 };
        e.leads++; if (l.status === "won") e.won++;
        ownerCount.set(l.owner_user_id, e);
      }
    }
    const projIds = Array.from(projCount.keys());
    let projects: any[] = [];
    if (projIds.length) {
      const { data: r } = await supabase.from("projects")
        .select("id, name, cover_url").in("id", projIds);
      projects = (r ?? []).map((p: any) => ({
        ...p, leads: projCount.get(p.id)?.leads ?? 0, won: projCount.get(p.id)?.won ?? 0,
      })).sort((a, b) => b.leads - a.leads).slice(0, 10);
    }
    // top agents
    const ownerIds = Array.from(new Set([
      ...Array.from(ownerCount.keys()),
      ...cardsRows.map((c) => c.owner_user_id).filter(Boolean),
    ]));
    let agents: any[] = [];
    if (ownerIds.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("user_id, full_name, email, avatar_url").in("user_id", ownerIds);
      // also tally touches via owned cards
      const ownerTouches = new Map<string, number>();
      for (const c of cardsRows)
        ownerTouches.set(c.owner_user_id,
          (ownerTouches.get(c.owner_user_id) ?? 0) + (cardCount.get(c.id) ?? 0));
      agents = (profs ?? []).map((p: any) => ({
        user_id: p.user_id,
        name: p.full_name ?? p.email ?? "Thành viên",
        avatar_url: p.avatar_url,
        leads: ownerCount.get(p.user_id)?.leads ?? 0,
        won: ownerCount.get(p.user_id)?.won ?? 0,
        touches: ownerTouches.get(p.user_id) ?? 0,
      })).sort((a, b) => (b.leads + b.touches / 10) - (a.leads + a.touches / 10)).slice(0, 10);
    }

    return { topCards, topProjects: projects, topAgents: agents };
  });

export const listAnalyticsFilters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const [cards, projects, roles] = await Promise.all([
      context.supabase.from("cards").select("id, display_name")
        .eq("tenant_id", data.tenantId).is("deleted_at", null).order("display_name"),
      context.supabase.from("projects").select("id, name")
        .eq("tenant_id", data.tenantId).is("deleted_at", null).order("name"),
      context.supabase.from("user_roles").select("user_id").eq("tenant_id", data.tenantId),
    ]);
    const ownerIds = Array.from(new Set((roles.data ?? []).map((r: any) => r.user_id)));
    let owners: any[] = [];
    if (ownerIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles").select("user_id, full_name, email").in("user_id", ownerIds);
      owners = (profs ?? []).map((p: any) => ({
        user_id: p.user_id, name: p.full_name ?? p.email ?? "Thành viên",
      }));
    }
    return { cards: cards.data ?? [], projects: projects.data ?? [], owners };
  });
