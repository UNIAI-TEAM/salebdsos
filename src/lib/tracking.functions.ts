// Server functions for source analytics + NFC short-code management.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---- Source analytics (last N days, grouped by source) -----------------------
export const getSourceAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cardId?: string; days?: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

    // Owner scope
    const cardsQ = supabase.from("digital_cards").select("id").eq("owner_user_id", userId);
    const { data: cards } = data.cardId ? await cardsQ.eq("id", data.cardId) : await cardsQ;
    const cardIds = (cards ?? []).map((c) => c.id);
    if (cardIds.length === 0) return { bySource: [], daily: [], total: 0 };

    const { data: agg } = await supabase
      .from("analytics_daily")
      .select("source, day, event_count, unique_visitors, card_id")
      .in("card_id", cardIds)
      .gte("day", since);

    // Today's data isn't aggregated yet → fall back to live events for today.
    const today = new Date().toISOString().slice(0, 10);
    const { data: live } = await supabase
      .from("interaction_events")
      .select("source, occurred_at")
      .in("card_id", cardIds)
      .gte("occurred_at", today);

    const bySource = new Map<string, number>();
    (agg ?? []).forEach((r) => bySource.set(r.source, (bySource.get(r.source) ?? 0) + r.event_count));
    (live ?? []).forEach((r) => bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1));

    const dailyMap = new Map<string, number>();
    (agg ?? []).forEach((r) => dailyMap.set(r.day, (dailyMap.get(r.day) ?? 0) + r.event_count));
    dailyMap.set(today, (dailyMap.get(today) ?? 0) + (live?.length ?? 0));

    return {
      bySource: Array.from(bySource, ([source, count]) => ({ source, count })),
      daily: Array.from(dailyMap, ([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
      total: Array.from(bySource.values()).reduce((s, n) => s + n, 0),
    };
  });

// ---- Short-code management ---------------------------------------------------
const NewCodeSchema = z.object({
  cardId: z.string().uuid(),
  source: z.enum(["nfc", "qr", "link", "social"]),
  label: z.string().min(1).max(100).optional(),
  code: z.string().min(4).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

function genCode(len = 8): string {
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export const createShortCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => NewCodeSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: card } = await supabase
      .from("digital_cards")
      .select("id, tenant_id")
      .eq("id", data.cardId)
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (!card) throw new Error("Card not found or not owned by user");

    let code = data.code ?? genCode();
    // collision retry (admin client to bypass RLS for uniqueness check)
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabaseAdmin
        .from("nfc_short_codes")
        .select("code")
        .eq("code", code)
        .maybeSingle();
      if (!existing) break;
      if (data.code) throw new Error("Code already taken");
      code = genCode();
    }

    const { data: row, error } = await supabase
      .from("nfc_short_codes")
      .insert({
        code,
        card_id: card.id,
        tenant_id: card.tenant_id,
        source: data.source,
        label: data.label ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const listShortCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cardId?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cardsQ = supabase.from("digital_cards").select("id").eq("owner_user_id", userId);
    const { data: cards } = data.cardId ? await cardsQ.eq("id", data.cardId) : await cardsQ;
    const ids = (cards ?? []).map((c) => c.id);
    if (ids.length === 0) return [];
    const { data: codes } = await supabase
      .from("nfc_short_codes")
      .select("*")
      .in("card_id", ids)
      .order("created_at", { ascending: false });
    return codes ?? [];
  });

export const toggleShortCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; isActive: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("nfc_short_codes")
      .update({ is_active: data.isActive })
      .eq("code", data.code);
    if (error) throw error;
    return { ok: true };
  });
