import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_ROLES } from "./permissions";
import { canAccessConversation } from "./omnichannel";
import { CHANNELS_KEY, parseChannelSettings } from "./channels";
import { parseIntegrationSettings } from "./integrations";
import { onboardingInputSchema, onboardingChannelSchema } from "./channel-onboarding";
import { INBOX_COPY as copy } from "./omnichannel";

async function tenantRoles(context: any, tenantId: string) {
  const { data, error } = await context.supabase.from("user_roles").select("role").eq("tenant_id", tenantId).eq("user_id", context.userId);
  if (error || !data?.length) throw new Error("Bạn không thuộc sàn này");
  return data.map((r: { role: string }) => r.role) as string[];
}
async function admin(context: any, tenantId: string) {
  if (!(await tenantRoles(context, tenantId)).some(r => ADMIN_ROLES.has(r))) throw new Error("Chỉ quản trị viên được kết nối kênh");
}

export const saveChatConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), channel: z.enum(["zalo", "messenger"]), accountId: z.string().trim().regex(/^\d+$/).max(60), appId: z.string().trim().regex(/^\d*$/).max(60).optional(), secret: z.string().trim().min(16).max(1000).optional(), token: z.string().trim().min(20).max(4000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await admin(context, data.tenantId);
    const { saveCredential } = await import("./credentials.server");
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const [{ data: setting }, { data: integration }] = await Promise.all([
      sb.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", CHANNELS_KEY).maybeSingle(),
      sb.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", "integrations").maybeSingle(),
    ]);
    const config = parseChannelSettings(setting?.value);
    const integrations = parseIntegrationSettings(integration?.value);
    const mapping = data.channel === "zalo" ? "value->zalo->>oaId" : "value->messenger->>pageId";
    const { data: others } = await sb.from("settings").select("tenant_id").eq("key", CHANNELS_KEY).eq(mapping, data.accountId).neq("tenant_id", data.tenantId);
    if (others?.length) throw new Error("Tài khoản này đã được gắn với một sàn khác.");
    if (data.channel === "zalo") {
      if (!data.appId && !config.zalo.appId) throw new Error("Vui lòng nhập Zalo App ID.");
      if (data.token) {
        const response = await fetch("https://openapi.zalo.me/v2.0/oa/getoa", { headers: { access_token: data.token } });
        const result = await response.json() as { error?: number; data?: { oa_id?: string | number } };
        if (!response.ok || result.error !== 0 || String(result.data?.oa_id ?? "") !== data.accountId) throw new Error("Access Token không thuộc OA này hoặc đã hết hạn.");
      }
      config.zalo = { ...config.zalo, enabled: true, oaId: data.accountId, appId: data.appId || config.zalo.appId };
      if (data.secret) await saveCredential(data.tenantId, "zalo_app_secret", data.secret, context.userId);
      if (data.token) await saveCredential(data.tenantId, "zalo_access_token", data.token, context.userId);
    } else {
      const { data: mapped } = await sb.from("settings").select("tenant_id").eq("key", "integrations").eq("value->facebook->>pageId", data.accountId).neq("tenant_id", data.tenantId);
      if (mapped?.length) throw new Error("Fanpage này đã thuộc sàn khác.");
      if (integrations.facebook.pageId && integrations.facebook.pageId !== data.accountId) throw new Error("Fanpage khác với trang đã cấu hình cho Lead Ads; cập nhật tại Tích hợp trước.");
      if (data.token) {
        const response = await fetch("https://graph.facebook.com/v21.0/me?fields=id", { headers: { Authorization: `Bearer ${data.token}` } });
        const result = await response.json() as { id?: string };
        if (!response.ok || result.id !== data.accountId) throw new Error("Page Access Token không thuộc Fanpage này hoặc đã hết hạn.");
      }
      config.messenger = { ...config.messenger, enabled: true, pageId: data.accountId };
      if (data.secret) await saveCredential(data.tenantId, "fb_app_secret", data.secret, context.userId);
      if (data.token) await saveCredential(data.tenantId, "fb_page_token", data.token, context.userId);
      integrations.facebook.pageId = data.accountId;
      integrations.facebook.verifyToken ??= "sbds_" + Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, "0")).join("");
      const { error } = await sb.from("settings").upsert({ tenant_id: data.tenantId, key: "integrations", value: integrations, updated_by: context.userId }, { onConflict: "tenant_id,key" });
      if (error) throw new Error("Không lưu được cấu hình Messenger.");
    }
    const { error } = await sb.from("settings").upsert({ tenant_id: data.tenantId, key: CHANNELS_KEY, value: config, updated_by: context.userId }, { onConflict: "tenant_id,key" });
    if (error) throw new Error("Không lưu được cấu hình kênh.");
    const { data: health } = await sb.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", "channel_health").maybeSingle();
    await sb.from("settings").upsert({ tenant_id: data.tenantId, key: "channel_health", value: { ...(health?.value as object ?? {}), [data.channel]: { ok: false } } }, { onConflict: "tenant_id,key" });
    return { ok: true };
  });

export const getChatConnectionSetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await admin(context, data.tenantId);
    const { data: row } = await context.supabase.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", "integrations").maybeSingle();
    return { verifyToken: parseIntegrationSettings(row?.value).facebook.verifyToken };
  });

export const verifyChatConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), channel: z.enum(["zalo", "messenger"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await admin(context, data.tenantId);
    const { checkChannelConnection } = await import("./omnichannel.server");
    return checkChannelConnection(data.tenantId, data.channel);
  });

export const linkConversationLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), conversationId: z.string().uuid(), leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const roles = await tenantRoles(context, data.tenantId);
    const [{ data: conv }, { data: lead }] = await Promise.all([
      context.supabase.from("conversations").select("owner_user_id,lead_id").eq("tenant_id", data.tenantId).eq("id", data.conversationId).maybeSingle(),
      context.supabase.from("leads").select("id,full_name,phone,owner_user_id,project_id").eq("tenant_id", data.tenantId).eq("id", data.leadId).is("deleted_at", null).maybeSingle(),
    ]);
    if (!conv || !lead || !canAccessConversation(roles, conv.owner_user_id, context.userId) || !canAccessConversation(roles, lead.owner_user_id, context.userId)) throw new Error("Bạn không có quyền gắn hồ sơ này.");
    const { error } = await context.supabase.rpc("link_channel_profile", { p_tenant: data.tenantId, p_conversation: data.conversationId, p_lead: data.leadId });
    if (error) { console.error("link_channel_profile", error.code, error.message); throw new Error("Không gắn được hồ sơ."); }
    return { ok: true };
  });

export const inboxLeadChoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), search: z.string().max(100).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const roles = await tenantRoles(context, data.tenantId);
    let q = context.supabase.from("leads").select("id,full_name,phone").eq("tenant_id", data.tenantId).is("deleted_at", null).order("created_at", { ascending: false }).limit(30);
    if (!roles.some(r => ADMIN_ROLES.has(r))) q = q.eq("owner_user_id", context.userId);
    const term = data.search?.replace(/[,()*%\\:."']/g, "").trim();
    if (term) q = q.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error("Không tải được hồ sơ khách.");
    return rows ?? [];
  });

export const saveAdditionalConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => onboardingInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await admin(context, data.tenantId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { saveCredential } = await import("./credentials.server");
    if (data.channel === "viber" && data.token) {
      const { inspectChannelAccount } = await import("./channel-onboarding.server");
      await inspectChannelAccount(data.channel, data.accountId, data.token);
    }
    const { data: row, error: readError } = await sb.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", CHANNELS_KEY).maybeSingle();
    if (readError) throw new Error(copy.checkFailed);
    const config = parseChannelSettings(row?.value);
    config[data.channel] = { accountId: data.accountId, accountName: "", accountVerified: false, checkedAt: null };
    if (data.token) await saveCredential(data.tenantId, "viber_bot_token", data.token, context.userId);
    const { error } = await sb.from("settings").upsert({ tenant_id: data.tenantId, key: CHANNELS_KEY, value: config, updated_by: context.userId }, { onConflict: "tenant_id,key" });
    if (error) throw new Error(copy.checkFailed);
    return { ok: true };
  });

export const verifyAdditionalConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), channel: onboardingChannelSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await admin(context, data.tenantId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { getCredential } = await import("./credentials.server");
    const { inspectChannelAccount } = await import("./channel-onboarding.server");
    const { data: row, error: readError } = await sb.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", CHANNELS_KEY).maybeSingle();
    if (readError) throw new Error(copy.checkFailed);
    const config = parseChannelSettings(row?.value);
    if (!config[data.channel].accountId) throw new Error(copy.missingAccount);
    let verified = false;
    try {
      const result = await inspectChannelAccount(data.channel, config[data.channel].accountId, data.channel === "viber" ? await getCredential(data.tenantId, "viber_bot_token") : null);
      config[data.channel].accountName = result.name;
      verified = true;
    } finally {
      config[data.channel].accountVerified = verified;
      config[data.channel].checkedAt = new Date().toISOString();
      const { error } = await sb.from("settings").upsert({ tenant_id: data.tenantId, key: CHANNELS_KEY, value: config, updated_by: context.userId }, { onConflict: "tenant_id,key" });
      if (error) throw new Error(copy.checkFailed);
    }
    return { ok: verified };
  });