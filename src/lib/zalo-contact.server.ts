import { supabaseAdmin as sb } from "@/integrations/supabase/client.server";
import { readZaloProfile } from "./zalo-oa";

/** Enrich only the exact authenticated OA identity; never infer CRM links. */
export async function syncZaloContact(tenantId: string, accountId: string, userId: string) {
  const { data: identity } = await sb.from("channel_identities").select("conversation_id")
    .eq("tenant_id", tenantId).eq("channel", "zalo").eq("account_id", accountId).eq("external_user_id", userId).maybeSingle();
  if (!identity) return null;
  const { data: conv } = await sb.from("conversations").select("meta,updated_at")
    .eq("tenant_id", tenantId).eq("id", identity.conversation_id).maybeSingle();
  if (!conv) return null;
  const meta = conv.meta && typeof conv.meta === "object" && !Array.isArray(conv.meta) ? conv.meta : {};
  const cached = (meta.zaloProfile ?? {}) as { checkedAt?: string; error?: string };
  if (cached.checkedAt && Date.now() - Date.parse(cached.checkedAt) < 10 * 60_000) return { ...readZaloProfile(meta), error: cached.error ?? null };
  const { data: oa } = await sb.from("zalo_oa_accounts").select("id,status")
    .eq("tenant_id", tenantId).eq("oa_id", accountId).maybeSingle();
  if (!oa || oa.status === "disconnected") return null;
  const { getOaUserProfile } = await import("./zalo-oa.server");
  const profile = await getOaUserProfile(oa.id, userId);
  const previous = readZaloProfile(meta);
  const saved = { name: profile.name || previous.name, avatar: profile.avatar || previous.avatar, error: profile.error, checkedAt: new Date().toISOString() };
  // Optimistic check prevents replacing tags/bot state modified during the API call.
  await sb.from("conversations").update({ meta: { ...meta, zaloProfile: saved } })
    .eq("tenant_id", tenantId).eq("id", identity.conversation_id).eq("updated_at", conv.updated_at);
  return saved;
}