// Máy chủ: token, làm mới có khóa, gửi tin cho từng Zalo OA. Không bao giờ trả token ra trình duyệt.
import { createHash } from "crypto";
import { supabaseAdmin as sb } from "@/integrations/supabase/client.server";
import { decryptValue, encryptValue } from "./credentials.server";
import { canSend, isTransientSendError, needsRefresh, OAUTH_CALLBACK_PATH, ZALO_OA_DEFAULTS, ZALO_RETRY, zaloSendError, type OaStatus } from "./zalo-oa";

const OAUTH = "https://oauth.zaloapp.com/v4/oa";
const REFRESH_TOKEN_DAYS = 90;

export function publicOrigin() {
  return new URL(process.env["ZALO_PUBLIC_ORIGIN"] ?? "https://salebdsos.lovable.app").origin;
}
export const oauthRedirectUri = () => publicOrigin() + OAUTH_CALLBACK_PATH;

export type OaRow = {
  id: string; tenant_id: string; oa_id: string; app_id: string; status: OaStatus;
  app_secret_ct: string | null; app_secret_iv: string | null;
  access_token_ct: string | null; access_token_iv: string | null;
  refresh_token_ct: string | null; refresh_token_iv: string | null;
  token_expires_at: string | null;
};
const COLS = "id,tenant_id,oa_id,app_id,status,app_secret_ct,app_secret_iv,access_token_ct,access_token_iv,refresh_token_ct,refresh_token_iv,token_expires_at";

export async function loadOa(id: string) {
  const { data } = await sb.from("zalo_oa_accounts").select(COLS).eq("id", id).maybeSingle();
  return data as OaRow | null;
}
export const appSecretOf = (a: OaRow) => decryptValue(a.app_secret_ct, a.app_secret_iv);

export async function audit(tenantId: string, accountId: string | null, actor: string | null, action: string, detail: Record<string, unknown> = {}) {
  await sb.from("zalo_oa_audit").insert({ tenant_id: tenantId, oa_account_id: accountId, actor_user_id: actor, action, detail: detail as never });
}

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: string | number; error?: number; error_name?: string; error_description?: string; message?: string };

async function tokenRequest(appId: string, secret: string, form: Record<string, string>) {
  const response = await fetch(`${OAUTH}/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", secret_key: secret },
    body: new URLSearchParams({ app_id: appId, ...form }),
  });
  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !body.access_token || !body.refresh_token) {
    throw new Error(body.error_description || body.error_name || body.message || `Zalo trả lỗi ${response.status}`);
  }
  return body;
}

/** Lưu access + refresh token mới trong cùng một lần ghi (refresh token Zalo chỉ dùng một lần). */
async function storeTokens(id: string, t: TokenResponse) {
  if (!t.access_token || !t.refresh_token) throw new Error("Thiếu token Zalo");
  const [a, r] = await Promise.all([encryptValue(t.access_token), encryptValue(t.refresh_token)]);
  const seconds = Number(t.expires_in ?? 90000) || 90000;
  const { error } = await sb.from("zalo_oa_accounts").update({
    access_token_ct: a.ct, access_token_iv: a.iv, refresh_token_ct: r.ct, refresh_token_iv: r.iv,
    token_expires_at: new Date(Date.now() + seconds * 1000).toISOString(),
    refresh_expires_at: new Date(Date.now() + REFRESH_TOKEN_DAYS * 86400_000).toISOString(),
    status: "connected", last_error: null, refresh_lock_until: null, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error("Không lưu được token mới");
}

/** PKCE: tạo URL cấp quyền Zalo. */
export async function buildAuthorizeUrl(a: OaRow) {
  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 43);
  const challenge = createHash("sha256").update(verifier).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const state = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  const v = await encryptValue(verifier);
  await sb.from("zalo_oa_accounts").update({ oauth_state: state, oauth_verifier_ct: v.ct, oauth_verifier_iv: v.iv, oauth_expires_at: new Date(Date.now() + 10 * 60_000).toISOString() }).eq("id", a.id);
  const url = new URL(`${OAUTH}/permission`);
  url.searchParams.set("app_id", a.app_id);
  url.searchParams.set("redirect_uri", oauthRedirectUri());
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function completeOAuth(state: string, code: string, oaId: string | null) {
  const { data } = await sb.from("zalo_oa_accounts").select(COLS + ",oauth_verifier_ct,oauth_verifier_iv,oauth_expires_at").eq("oauth_state", state).maybeSingle();
  const row = data as (OaRow & { oauth_verifier_ct: string; oauth_verifier_iv: string; oauth_expires_at: string }) | null;
  if (!row || !row.oauth_expires_at || new Date(row.oauth_expires_at) < new Date()) throw new Error("Phiên cấp quyền đã hết hạn, vui lòng thử lại.");
  if (oaId && oaId !== row.oa_id) throw new Error("Anh/chị đã chọn OA khác với OA đang cấu hình.");
  const [verifier, secret] = await Promise.all([decryptValue(row.oauth_verifier_ct, row.oauth_verifier_iv), appSecretOf(row)]);
  await sb.from("zalo_oa_accounts").update({ oauth_state: null, oauth_verifier_ct: null, oauth_verifier_iv: null, oauth_expires_at: null }).eq("id", row.id);
  if (!verifier || !secret) throw new Error("Thiếu khóa ứng dụng.");
  const t = await tokenRequest(row.app_id, secret, { code, grant_type: "authorization_code", code_verifier: verifier });
  await storeTokens(row.id, t);
  if (t.access_token) await syncProfile(row.id, t.access_token);
  await audit(row.tenant_id, row.id, null, "oauth_connected");
  return row;
}

/** Nhập token tay (dự phòng khi không dùng được luồng cấp quyền). */
export async function saveManualTokens(id: string, accessToken: string, refreshToken: string) {
  await storeTokens(id, { access_token: accessToken, refresh_token: refreshToken, expires_in: 90000 });
}

export async function syncProfile(id: string, token: string) {
  try {
    const r = await fetch("https://openapi.zalo.me/v2.0/oa/getoa", { headers: { access_token: token } });
    // oa_id vượt quá Number.MAX_SAFE_INTEGER → đọc dạng chuỗi trước khi JSON.parse làm tròn số.
    const raw = (await r.text()).replace(/"oa_id"\s*:\s*(\d+)/g, '"oa_id":"$1"');
    const b = JSON.parse(raw) as { error?: number; message?: string; data?: { oa_id?: string; name?: string; avatar?: string } };
    if (b.error === 0 && b.data) await sb.from("zalo_oa_accounts").update({ ...(b.data.name ? { name: b.data.name } : {}), avatar_url: b.data.avatar ?? null }).eq("id", id);
    return b;
  } catch { return null; }
}

/** Làm mới token có khóa theo OA. Thất bại → Hết hạn token, báo admin. */
export async function refreshOa(id: string, force = false): Promise<boolean> {
  const a = await loadOa(id);
  if (!a || a.status === "disconnected" || !a.refresh_token_ct) return false;
  if (!force && !needsRefresh(a.token_expires_at)) return true;
  const { data: claimed } = await sb.rpc("claim_zalo_token_refresh", { p_account: id, p_seconds: ZALO_OA_DEFAULTS.refreshLockSeconds });
  if (!claimed) return false; // tiến trình khác đang làm mới
  try {
    const [secret, refresh] = await Promise.all([appSecretOf(a), decryptValue(a.refresh_token_ct, a.refresh_token_iv)]);
    if (!secret || !refresh) throw new Error("Thiếu khóa ứng dụng hoặc refresh token");
    const t = await tokenRequest(a.app_id, secret, { refresh_token: refresh, grant_type: "refresh_token" });
    await storeTokens(id, t);
    return true;
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    await sb.from("zalo_oa_accounts").update({ status: "expired", last_error: msg, refresh_lock_until: null }).eq("id", id);
    await notifyAdmins(a.tenant_id, "Zalo OA cần cấp quyền lại", `OA ${a.oa_id}: ${msg}`);
    await audit(a.tenant_id, id, null, "refresh_failed", { error: msg });
    return false;
  }
}

async function notifyAdmins(tenantId: string, title: string, body: string) {
  const { data } = await sb.from("user_roles").select("user_id").eq("tenant_id", tenantId).in("role", ["owner", "admin"]);
  const ids = [...new Set((data ?? []).map((r) => r.user_id))];
  if (ids.length) await sb.from("notifications").insert(ids.map((user_id) => ({ tenant_id: tenantId, user_id, type: "system", title, body, link: "/integrations" })) as never);
}

async function validToken(id: string) {
  let a = await loadOa(id);
  if (!a) return null;
  if (needsRefresh(a.token_expires_at)) { await refreshOa(id); a = await loadOa(id); }
  return a ? { a, token: await decryptValue(a.access_token_ct, a.access_token_iv) } : null;
}

export type SendResult = { status: "sent" | "failed"; externalId: string | null; error: string | null; attempts: number };

export async function getOaUserProfile(accountId: string, userId: string) {
  const v = await validToken(accountId);
  if (!v?.token) return { name: null, avatar: null, error: "Chưa có token hợp lệ để lấy thông tin người gửi." };
  try {
    const url = new URL("https://openapi.zalo.me/v3.0/oa/user/detail");
    url.searchParams.set("data", JSON.stringify({ user_id: userId }));
    const r = await fetch(url, { headers: { access_token: v.token }, signal: AbortSignal.timeout(6000) });
    const body = await r.json() as { error?: number; data?: { display_name?: string; avatar?: string; avatars?: Record<string, string> } };
    if (!r.ok || body.error !== 0 || !body.data) return { name: null, avatar: null, error: "Zalo chưa cho phép lấy tên/ảnh người gửi. Kiểm tra quyền quản lý thông tin người dùng của ứng dụng khi cấp quyền OA." };
    const avatar = body.data.avatar || body.data.avatars?.["240"] || body.data.avatars?.["120"];
    return { name: body.data.display_name?.slice(0, 120) || null, avatar: avatar?.startsWith("https://") ? avatar : null, error: null };
  } catch { return { name: null, avatar: null, error: "Chưa lấy được tên/ảnh từ Zalo; hệ thống sẽ thử lại sau." }; }
}
export type OutgoingFile = { bytes: Uint8Array; name: string; type: string; kind: "image" | "file" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function zaloCall(token: string, url: string, init: RequestInit) {
  try {
    const r = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), access_token: token } });
    const body = (await r.json().catch(() => ({}))) as { error?: number; message?: string; data?: { message_id?: string; attachment_id?: string; token?: string } };
    return { http: r.status as number | null, ok: r.ok && (body.error ?? 0) === 0, body };
  } catch (e) {
    return { http: null as number | null, ok: false, body: { message: (e as Error).message } as { error?: number; message?: string; data?: { message_id?: string; attachment_id?: string; token?: string } } };
  }
}

/** Gửi tin tư vấn (chữ/ảnh/tệp) từ đúng OA. Lỗi token → làm mới 1 lần; lỗi tạm thời → thử lại tối đa 3 lần, cách quãng tăng dần. */
export async function sendFromOa(accountRowId: string, zaloUserId: string, text: string, file?: OutgoingFile): Promise<SendResult> {
  let v = await validToken(accountRowId);
  if (!v || !canSend(v.a.status) || !v.token) return { status: "failed", externalId: null, error: "OA chưa kết nối hoặc hết hạn token — cần cấp quyền lại.", attempts: 0 };
  let lastError = "Zalo từ chối gửi tin", refreshed = false;
  for (let i = 0; i < ZALO_RETRY.maxAttempts; i++) {
    if (ZALO_RETRY.delaysMs[i]) await sleep(ZALO_RETRY.delaysMs[i]);
    if (!v?.token) return { status: "failed", externalId: null, error: "Không lấy được token sau khi làm mới.", attempts: i + 1 };
    const token = v.token;
    let message: Record<string, unknown> = { text: text.slice(0, 2000) };
    if (file) {
      const form = new FormData();
      form.append("file", new Blob([file.bytes as BlobPart], { type: file.type }), file.name);
      const up = await zaloCall(token, `https://openapi.zalo.me/v2.0/oa/upload/${file.kind}`, { method: "POST", body: form });
      if (!up.ok) {
        lastError = zaloSendError(up.body.message || `Tải tệp lên Zalo lỗi ${up.http ?? "mạng"}`);
        if (!refreshed && (up.body.error === -216 || up.body.error === -124)) { refreshed = true; if (await refreshOa(accountRowId, true)) { v = await validToken(accountRowId); i--; continue; } }
        if (isTransientSendError(up.http, up.body.error)) continue;
        return { status: "failed", externalId: null, error: lastError, attempts: i + 1 };
      }
      message = file.kind === "image"
        ? { ...(text ? { text: text.slice(0, 2000) } : {}), attachment: { type: "template", payload: { template_type: "media", elements: [{ media_type: "image", attachment_id: up.body.data?.attachment_id }] } } }
        : { attachment: { type: "file", payload: { token: up.body.data?.token } } };
    }
    const res = await zaloCall(token, "https://openapi.zalo.me/v3.0/oa/message/cs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { user_id: zaloUserId }, message }) });
    if (res.ok) return { status: "sent", externalId: res.body.data?.message_id ?? null, error: null, attempts: i + 1 };
    lastError = zaloSendError(res.body.message || `Zalo trả lỗi ${res.http ?? "mạng"}`);
    if (!refreshed && (res.body.error === -216 || res.body.error === -124)) {
      refreshed = true;
      if (await refreshOa(accountRowId, true)) { v = await validToken(accountRowId); if (v?.token) { i--; continue; } }
    }
    if (!isTransientSendError(res.http, res.body.error)) return { status: "failed", externalId: null, error: lastError, attempts: i + 1 };
  }
  return { status: "failed", externalId: null, error: `${lastError} (đã thử ${ZALO_RETRY.maxAttempts} lần)`, attempts: ZALO_RETRY.maxAttempts };
}

export async function checkOa(id: string) {
  const v = await validToken(id);
  if (!v?.token) return { ok: false, error: "Chưa có token hợp lệ" };
  const b = await syncProfile(id, v.token);
  const ok = b?.error === 0 && String(b.data?.oa_id ?? "") === v.a.oa_id;
  if (!ok) await sb.from("zalo_oa_accounts").update({ last_error: "Token không thuộc OA này" }).eq("id", id);
  return { ok, error: ok ? null : "Token không thuộc OA này hoặc đã hết hạn" };
}

export async function logWebhook(tenantId: string, accountId: string, eventName: string, ok: boolean, detail?: string) {
  await sb.from("zalo_webhook_logs").insert({ tenant_id: tenantId, oa_account_id: accountId, event_name: eventName.slice(0, 80), ok, detail: detail?.slice(0, 300) ?? null });
}
