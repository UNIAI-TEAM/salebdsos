import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_ROLES } from "./permissions";
import { displayStatus, webhookPath, type OaStatus } from "./zalo-oa";

async function requireAdmin(context: { supabase: any; userId: string }, tenantId: string) {
  const { data, error } = await context.supabase.from("user_roles").select("role").eq("tenant_id", tenantId).eq("user_id", context.userId);
  if (error || !data?.length) throw new Error("Bạn không thuộc sàn này");
  if (!data.some((r: { role: string }) => ADMIN_ROLES.has(r.role))) throw new Error("Chỉ quản trị viên được quản lý Zalo OA");
}
async function ownRow(tenantId: string, id: string) {
  const { loadOa } = await import("./zalo-oa.server");
  const a = await loadOa(id);
  if (!a || a.tenant_id !== tenantId) throw new Error("Không tìm thấy OA");
  return a;
}
const tenant = z.object({ tenantId: z.string().uuid() });
const one = tenant.extend({ id: z.string().uuid() });
const digits = z.string().trim().regex(/^\d{3,40}$/, "Chỉ gồm chữ số");

export const listZaloOas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenant.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context, data.tenantId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { publicOrigin, oauthRedirectUri } = await import("./zalo-oa.server");
    const { loadChannelSettings } = await import("./channels.server");
    const [{ data: rows }, config] = await Promise.all([
      sb.from("zalo_oa_accounts").select("id,oa_id,name,avatar_url,project_id,app_id,webhook_key,status,token_expires_at,refresh_expires_at,last_webhook_at,last_error,created_at,refresh_token_ct").eq("tenant_id", data.tenantId).order("created_at"),
      loadChannelSettings(data.tenantId),
    ]);
    const list = rows ?? [];
    const counts = await Promise.all(list.map((r) => sb.from("channel_identities").select("id", { count: "exact", head: true }).eq("tenant_id", data.tenantId).eq("channel", "zalo").eq("account_id", r.oa_id)));
    const origin = publicOrigin();
    return {
      redirectUri: oauthRedirectUri(),
      legacyOaId: config.zalo.oaId && !list.some((r) => r.oa_id === config.zalo.oaId) ? config.zalo.oaId : null,
      accounts: list.map((r, i) => ({
        id: r.id, oaId: r.oa_id, name: r.name, avatarUrl: r.avatar_url, projectId: r.project_id, appId: r.app_id,
        status: r.status as OaStatus,
        displayStatus: displayStatus({ status: r.status as OaStatus, refresh_expires_at: r.refresh_expires_at }),
        hasTokens: Boolean(r.refresh_token_ct),
        tokenExpiresAt: r.token_expires_at, refreshExpiresAt: r.refresh_expires_at,
        lastWebhookAt: r.last_webhook_at, lastError: r.last_error, createdAt: r.created_at,
        webhookUrl: origin + webhookPath(r.webhook_key),
        conversations: counts[i].count ?? 0,
      })),
    };
  });

export const createZaloOa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenant.extend({
    name: z.string().trim().min(1).max(120), oaId: digits, appId: digits.optional(),
    appSecret: z.string().trim().min(10).max(500).optional(), reuseFromId: z.string().uuid().optional(),
    projectId: z.string().uuid().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context, data.tenantId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { encryptValue } = await import("./credentials.server");
    const { audit } = await import("./zalo-oa.server");
    const { data: taken } = await sb.from("zalo_oa_accounts").select("tenant_id").eq("oa_id", data.oaId).maybeSingle();
    if (taken) throw new Error(taken.tenant_id === data.tenantId ? "OA này đã có trong danh sách." : "OA này đã được một sàn khác kết nối.");
    let appId = data.appId, ct: string | null = null, iv: string | null = null;
    if (data.reuseFromId) {
      const src = await ownRow(data.tenantId, data.reuseFromId);
      appId = src.app_id; ct = src.app_secret_ct; iv = src.app_secret_iv;
    } else {
      if (!appId || !data.appSecret) throw new Error("Cần App ID và Secret Key của ứng dụng Zalo.");
      ({ ct, iv } = await encryptValue(data.appSecret));
    }
    const webhookKey = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
    const { data: row, error } = await sb.from("zalo_oa_accounts").insert({
      tenant_id: data.tenantId, oa_id: data.oaId, name: data.name, app_id: appId!, app_secret_ct: ct, app_secret_iv: iv,
      project_id: data.projectId ?? null, webhook_key: webhookKey, created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.code === "23505" ? "OA này đã được kết nối." : "Không lưu được OA");
    await audit(data.tenantId, row.id, context.userId, "created", { oaId: data.oaId, reuse: Boolean(data.reuseFromId) });
    return { id: row.id };
  });

export const updateZaloOa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => one.extend({
    name: z.string().trim().min(1).max(120).optional(), projectId: z.string().uuid().nullable().optional(),
    paused: z.boolean().optional(), appSecret: z.string().trim().min(10).max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context, data.tenantId);
    const a = await ownRow(data.tenantId, data.id);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { encryptValue } = await import("./credentials.server");
    const { audit } = await import("./zalo-oa.server");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) patch.name = data.name;
    if (data.projectId !== undefined) patch.project_id = data.projectId;
    if (data.paused !== undefined) {
      if (data.paused && a.status !== "connected") throw new Error("Chỉ tạm dừng được OA đang kết nối.");
      if (!data.paused && a.status !== "paused") throw new Error("OA không ở trạng thái tạm dừng.");
      patch.status = data.paused ? "paused" : "connected";
    }
    if (data.appSecret) { const v = await encryptValue(data.appSecret); patch.app_secret_ct = v.ct; patch.app_secret_iv = v.iv; }
    const { error } = await sb.from("zalo_oa_accounts").update(patch as never).eq("id", a.id);
    if (error) throw new Error("Không lưu được thay đổi");
    await audit(data.tenantId, a.id, context.userId, "updated", { fields: Object.keys(patch).filter((k) => !k.startsWith("app_secret") && k !== "updated_at"), secretReplaced: Boolean(data.appSecret) });
    return { ok: true };
  });

export const authorizeZaloOa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => one.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context, data.tenantId);
    const a = await ownRow(data.tenantId, data.id);
    if (!a.app_secret_ct) throw new Error("Thiếu Secret Key của ứng dụng.");
    const { buildAuthorizeUrl, audit } = await import("./zalo-oa.server");
    await audit(data.tenantId, a.id, context.userId, "oauth_started");
    return { url: await buildAuthorizeUrl(a) };
  });

export const saveZaloOaTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => one.extend({ accessToken: z.string().trim().min(20).max(4000), refreshToken: z.string().trim().min(20).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context, data.tenantId);
    const a = await ownRow(data.tenantId, data.id);
    const r = await fetch("https://openapi.zalo.me/v2.0/oa/getoa", { headers: { access_token: data.accessToken } });
    const raw = (await r.text().catch(() => "{}")).replace(/"oa_id"\s*:\s*(\d+)/g, '"oa_id":"$1"');
    let b: { error?: number; message?: string; data?: { oa_id?: string; name?: string } } = {};
    try { b = JSON.parse(raw); } catch { /* giữ rỗng */ }
    if (b.error !== 0) throw new Error(`Zalo từ chối Access Token (${b.error ?? "?"}: ${b.message ?? "không rõ"}). Token có thể đã hết hạn — lấy token mới rồi dán lại.`);
    const got = String(b.data?.oa_id ?? "");
    if (got !== a.oa_id) throw new Error(`Access Token thuộc OA ${got}${b.data?.name ? ` (${b.data.name})` : ""}, không phải OA ${a.oa_id} đang cấu hình.`);
    const { saveManualTokens, audit } = await import("./zalo-oa.server");
    await saveManualTokens(a.id, data.accessToken, data.refreshToken);
    await audit(data.tenantId, a.id, context.userId, "tokens_saved");
    return { ok: true };
  });

export const checkZaloOa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => one.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context, data.tenantId);
    await ownRow(data.tenantId, data.id);
    const { checkOa } = await import("./zalo-oa.server");
    return checkOa(data.id);
  });

export const disconnectZaloOa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => one.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context, data.tenantId);
    const a = await ownRow(data.tenantId, data.id);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { audit } = await import("./zalo-oa.server");
    // Xóa token, giữ lịch sử hội thoại; OA không còn nhận/gửi tin.
    await sb.from("zalo_oa_accounts").update({ status: "disconnected", access_token_ct: null, access_token_iv: null, refresh_token_ct: null, refresh_token_iv: null, token_expires_at: null, refresh_expires_at: null, oauth_state: null }).eq("id", a.id);
    await audit(data.tenantId, a.id, context.userId, "disconnected");
    return { ok: true };
  });

export const zaloOaLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => one.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context, data.tenantId);
    await ownRow(data.tenantId, data.id);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const [{ data: logs }, { data: audits }] = await Promise.all([
      sb.from("zalo_webhook_logs").select("event_name,ok,detail,created_at").eq("oa_account_id", data.id).order("created_at", { ascending: false }).limit(20),
      sb.from("zalo_oa_audit").select("action,actor_user_id,created_at").eq("oa_account_id", data.id).order("created_at", { ascending: false }).limit(20),
    ]);
    return { logs: logs ?? [], audits: audits ?? [] };
  });

/** Chuyển cấu hình Zalo OA đơn cũ thành OA đầu tiên trong danh sách (giữ hội thoại vì cùng OA ID). */
export const importLegacyZalo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenant.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context, data.tenantId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { loadChannelSettings } = await import("./channels.server");
    const { zaloCreds, encryptValue } = await import("./credentials.server");
    const { audit } = await import("./zalo-oa.server");
    const config = await loadChannelSettings(data.tenantId);
    if (!config.zalo.oaId || !config.zalo.appId) throw new Error("Không có cấu hình Zalo OA cũ.");
    const { data: taken } = await sb.from("zalo_oa_accounts").select("id").eq("oa_id", config.zalo.oaId).maybeSingle();
    if (taken) throw new Error("OA này đã có trong danh sách.");
    const { appSecret } = await zaloCreds(data.tenantId);
    const secret = appSecret ? await encryptValue(appSecret) : null;
    const webhookKey = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
    const { data: row, error } = await sb.from("zalo_oa_accounts").insert({
      tenant_id: data.tenantId, oa_id: config.zalo.oaId, name: "Zalo OA", app_id: config.zalo.appId,
      app_secret_ct: secret?.ct ?? null, app_secret_iv: secret?.iv ?? null, webhook_key: webhookKey, created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error("Không chuyển được OA cũ");
    await audit(data.tenantId, row.id, context.userId, "imported_legacy");
    return { id: row.id };
  });
