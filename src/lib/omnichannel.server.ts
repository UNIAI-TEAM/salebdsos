import { createHash, createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin as sb } from "@/integrations/supabase/client.server";
import { getCredential, zaloCreds } from "./credentials.server";
import { loadChannelSettings } from "./channels.server";
import { parseIntegrationSettings } from "./integrations";
import { INBOX_COPY, messengerWindowOpen, uniqueChannelIdentity } from "./omnichannel";

export function signatureEquals(actual: string, expected: string) {
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const metaSignature = (raw: string, secret: string) => "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
export const zaloSignature = (raw: string, appId: string, timestamp: string, secret: string) => "mac=" + createHash("sha256").update(appId + raw + timestamp + secret).digest("hex");

export async function receiveChannelMessage(args: { tenantId: string; channel: "zalo" | "messenger"; accountId: string; userId: string; eventId: string; body: string; name?: string; phone?: string; attachment?: string }) {
  const { assignLeadOwner } = await import("./lead-routing.server");
  const { data: settings } = await sb.from("settings").select("value").eq("tenant_id", args.tenantId).eq("key", "integrations").maybeSingle();
  const projectId = parseIntegrationSettings(settings?.value).defaultProjectId;
  const { data: identity } = await sb.from("channel_identities").select("lead_id").eq("tenant_id", args.tenantId).eq("channel", args.channel).eq("account_id", args.accountId).eq("external_user_id", args.userId).maybeSingle();
  let owner: string | null = null;
  if (identity?.lead_id) {
    const { data: lead } = await sb.from("leads").select("owner_user_id").eq("id", identity.lead_id).eq("tenant_id", args.tenantId).maybeSingle();
    owner = lead?.owner_user_id ?? null;
  }
  const assignment = await assignLeadOwner({ tenantId: args.tenantId, projectId, currentOwnerId: owner });
  const { data, error } = await sb.rpc("ingest_channel_message", {
    p_tenant: args.tenantId, p_channel: args.channel, p_account: args.accountId, p_user: args.userId, p_event: args.eventId,
    p_body: args.body.slice(0, 2000), p_name: args.name ?? "", p_phone: args.phone ?? "", p_owner: assignment.ownerUserId as string,
    p_project: projectId as string, p_attachment: (args.attachment ?? null) as unknown as string,
  });
  if (error) throw new Error("Không lưu được tin nhắn");
  const { data: health } = await sb.from("settings").select("value").eq("tenant_id", args.tenantId).eq("key", "channel_health").maybeSingle();
  const state = (health?.value ?? {}) as Record<string, { ok?: boolean; checkedAt?: string; lastWebhookAt?: string }>;
  await sb.from("settings").upsert({ tenant_id: args.tenantId, key: "channel_health", value: { ...state, [args.channel]: { ...state[args.channel], lastWebhookAt: new Date().toISOString() } } }, { onConflict: "tenant_id,key" });
  const result = data as { duplicate?: boolean; ownerUserId?: string; leadId?: string };
  if (!result.duplicate && result.ownerUserId) {
    await sb.from("notifications").insert({ tenant_id: args.tenantId, user_id: result.ownerUserId, lead_id: result.leadId, type: "lead", title: `Tin nhắn mới · ${args.channel === "zalo" ? "Zalo OA" : "Messenger"}`, body: args.body.slice(0, 160), link: "/inbox" } as never);
    const { sendPushToUser } = await import("./push.server");
    await sendPushToUser({ userId: result.ownerUserId, title: `Tin nhắn mới · ${args.channel === "zalo" ? "Zalo OA" : "Messenger"}`, body: args.body.slice(0, 160), link: "/inbox" });
  }
  return result;
}

export async function sendMessengerMessage(tenantId: string, conversationId: string, text: string) {
  const config = await loadChannelSettings(tenantId);
  const { data: conv } = await sb.from("conversations").select("lead_id").eq("tenant_id", tenantId).eq("id", conversationId).maybeSingle();
  let identityQuery = sb.from("channel_identities").select("account_id,external_user_id,last_inbound_at").eq("tenant_id", tenantId);
  identityQuery = conv?.lead_id ? identityQuery.eq("lead_id", conv.lead_id) : identityQuery.eq("conversation_id", conversationId);
  const { data: identities } = await identityQuery.eq("channel", "messenger").eq("account_id", config.messenger.pageId).limit(2);
  const identity = uniqueChannelIdentity(identities ?? [], config.messenger.pageId);
  const token = await getCredential(tenantId, "fb_page_token");
  if (!config.messenger.enabled || !token) return { status: "failed" as const, externalId: null, error: INBOX_COPY.notConnected };
  if (!identity) return { status: "failed" as const, externalId: null, error: "Khách chưa có liên kết Messenger duy nhất." };
  if (!messengerWindowOpen(identity.last_inbound_at)) return { status: "failed" as const, externalId: null, error: INBOX_COPY.windowClosed };
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${identity.account_id}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: identity.external_user_id }, messaging_type: "RESPONSE", message: { text } }) });
    const payload = await response.json() as { message_id?: string; error?: unknown };
    if (!response.ok || payload.error || !payload.message_id) return { status: "failed" as const, externalId: null, error: `Messenger từ chối gửi [${response.status}]. Kiểm tra quyền pages_messaging và cửa sổ trả lời.` };
    return { status: "sent" as const, externalId: payload.message_id, error: null };
  } catch { return { status: "failed" as const, externalId: null, error: "Không kết nối được Messenger." }; }
}

export async function channelConnectionStatus(tenantId: string) {
  const config = await loadChannelSettings(tenantId);
  const { credentialStatus } = await import("./credentials.server");
  const s = await credentialStatus(tenantId);
  const { data: row } = await sb.from("settings").select("value").eq("tenant_id", tenantId).eq("key", "channel_health").maybeSingle();
  const health = (row?.value ?? {}) as Record<string, { ok?: boolean; checkedAt?: string; lastWebhookAt?: string }>;
  return [
    { channel: "web_chat", configured: config.webChat.enabled, enabled: config.webChat.enabled, verified: config.webChat.enabled, checkedAt: null },
    { channel: "zalo", configured: Boolean(config.zalo.oaId && config.zalo.appId && s.zalo_app_secret && s.zalo_access_token), enabled: config.zalo.enabled, verified: Boolean(health.zalo?.ok && health.zalo?.lastWebhookAt), checkedAt: health.zalo?.checkedAt ?? null },
    { channel: "messenger", configured: Boolean(config.messenger.pageId && s.fb_app_secret && s.fb_page_token), enabled: config.messenger.enabled, verified: Boolean(health.messenger?.ok && health.messenger?.lastWebhookAt), checkedAt: health.messenger?.checkedAt ?? null },
    { channel: "sms", configured: Boolean(config.sms.enabled && process.env.ESMS_API_KEY && process.env.ESMS_SECRET_KEY), enabled: config.sms.enabled, verified: false, checkedAt: null },
    { channel: "email", configured: config.email.enabled, enabled: config.email.enabled, verified: false, checkedAt: null },
  ];
}

export async function checkChannelConnection(tenantId: string, channel: "zalo" | "messenger") {
  const config = await loadChannelSettings(tenantId);
  let ok = false;
  if (channel === "zalo") {
    const creds = await zaloCreds(tenantId);
    if (!creds.accessToken || !creds.appSecret || !config.zalo.appId) throw new Error(INBOX_COPY.notConnected);
    const response = await fetch("https://openapi.zalo.me/v2.0/oa/getoa", { headers: { access_token: creds.accessToken } });
    const body = await response.json() as { error?: number; data?: { oa_id?: string | number } };
    ok = response.ok && body.error === 0 && String(body.data?.oa_id ?? "") === config.zalo.oaId;
  } else {
    const token = await getCredential(tenantId, "fb_page_token"), secret = await getCredential(tenantId, "fb_app_secret");
    if (!token || !secret || !config.messenger.pageId) throw new Error(INBOX_COPY.notConnected);
    const response = await fetch(`https://graph.facebook.com/v21.0/me?fields=id`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json() as { id?: string };
    const subscription = await fetch(`https://graph.facebook.com/v21.0/${config.messenger.pageId}/subscribed_apps`, { headers: { Authorization: `Bearer ${token}` } });
    const apps = await subscription.json() as { data?: { subscribed_fields?: string[] }[] };
    ok = response.ok && body.id === config.messenger.pageId && subscription.ok && Boolean(apps.data?.some(a => a.subscribed_fields?.includes("messages")));
  }
  const { data: previous } = await sb.from("settings").select("value").eq("tenant_id", tenantId).eq("key", "channel_health").maybeSingle();
  const previousHealth = (previous?.value ?? {}) as Record<string, { ok?: boolean; checkedAt?: string; lastWebhookAt?: string }>;
  await sb.from("settings").upsert({ tenant_id: tenantId, key: "channel_health", value: { ...previousHealth, [channel]: { ...previousHealth[channel], ok, checkedAt: new Date().toISOString() } } }, { onConflict: "tenant_id,key" });
  return { ok };
}