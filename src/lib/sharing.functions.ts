// Advanced sharing — Wallet preview, dynamic QR, share analytics.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function gen(len = 7): string {
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export const listShareableCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("cards")
      .select("id,slug,display_name,title,company,avatar_url,theme,is_published,view_count")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return rows ?? [];
  });

// ───────── Dynamic QR ─────────
const QrInput = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  label: z.string().trim().min(1).max(120),
  target_url: z.string().trim().url().max(2000),
  is_active: z.boolean().optional(),
});

export const listDynamicQRs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("dynamic_qr_codes")
      .select("id,short_code,label,target_url,is_active,scan_count,created_at,updated_at")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const upsertDynamicQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => QrInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { data: row, error } = await supabase
        .from("dynamic_qr_codes")
        .update({
          label: data.label,
          target_url: data.target_url,
          is_active: data.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .eq("tenant_id", data.tenant_id)
        .select()
        .single();
      if (error) throw error;
      return row;
    }
    // Generate unique code
    let code = gen();
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await supabase
        .from("dynamic_qr_codes").select("id").eq("short_code", code).maybeSingle();
      if (!clash) break;
      code = gen();
    }
    const { data: row, error } = await supabase
      .from("dynamic_qr_codes")
      .insert({
        tenant_id: data.tenant_id,
        label: data.label,
        target_url: data.target_url,
        short_code: code,
        is_active: data.is_active ?? true,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteDynamicQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; tenantId: string }) =>
    z.object({ id: z.string().uuid(), tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("dynamic_qr_codes")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", data.id).eq("tenant_id", data.tenantId);
    if (error) throw error;
    return { ok: true };
  });

// ───────── Share analytics (sources for tenant cards) ─────────
export const getShareAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; days?: number }) =>
    z.object({ tenantId: z.string().uuid(), days: z.number().min(1).max(365).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

    const { data: cards } = await supabase
      .from("cards").select("id").eq("tenant_id", data.tenantId).is("deleted_at", null);
    const cardIds = (cards ?? []).map((c) => c.id);

    let nfc = 0, qr = 0, link = 0, social = 0, total = 0;
    if (cardIds.length) {
      const { data: agg } = await supabase
        .from("analytics_daily")
        .select("source,event_count")
        .in("card_id", cardIds)
        .gte("day", since);
      for (const r of agg ?? []) {
        const c = r.event_count || 0;
        total += c;
        const s = (r.source || "").toLowerCase();
        if (s === "nfc") nfc += c;
        else if (s === "qr") qr += c;
        else if (s === "social") social += c;
        else link += c;
      }
    }

    // Dynamic QR scans
    const { data: dq } = await supabase
      .from("dynamic_qr_codes")
      .select("scan_count")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null);
    const dynamicScans = (dq ?? []).reduce((s, r) => s + (r.scan_count || 0), 0);

    // Wallet installs
    const { data: w } = await supabase
      .from("wallet_cards")
      .select("install_count")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null);
    const walletInstalls = (w ?? []).reduce((s, r) => s + (r.install_count || 0), 0);

    return { total, nfc, qr, link, social, dynamicScans, walletInstalls };
  });
