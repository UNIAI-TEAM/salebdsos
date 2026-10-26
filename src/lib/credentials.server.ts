// Khoá bí mật theo sàn (Facebook App Secret, Page Access Token...). Mã hoá AES-GCM, chỉ máy chủ đọc được.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const CREDENTIAL_KEYS = ["fb_app_secret", "fb_page_token", "zalo_app_secret", "zalo_access_token", "viber_bot_token"] as const;
export type CredentialKey = (typeof CREDENTIAL_KEYS)[number];

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function aesKey() {
  const raw = process.env["CREDENTIALS_ENCRYPTION_KEY"];
  if (!raw) throw new Error("Thiếu khoá mã hoá hệ thống");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function saveCredential(tenantId: string, key: CredentialKey, value: string | null, userId: string) {
  if (!value) {
    await supabaseAdmin.from("tenant_credentials").delete().eq("tenant_id", tenantId).eq("key", key);
    return;
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), new TextEncoder().encode(value)));
  const { error } = await supabaseAdmin.from("tenant_credentials").upsert({
    tenant_id: tenantId, key, ciphertext: b64(ct), iv: b64(iv), updated_by: userId, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function getCredential(tenantId: string, key: CredentialKey): Promise<string | null> {
  const { data } = await supabaseAdmin.from("tenant_credentials").select("ciphertext,iv")
    .eq("tenant_id", tenantId).eq("key", key).maybeSingle();
  if (!data) return null;
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(data.iv) }, await aesKey(), unb64(data.ciphertext));
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}

/** Chỉ trạng thái — không bao giờ trả giá trị. */
export async function credentialStatus(tenantId: string) {
  const { data } = await supabaseAdmin.from("tenant_credentials").select("key,updated_at").eq("tenant_id", tenantId);
  const map = new Map((data ?? []).map((r) => [r.key, r.updated_at]));
  return Object.fromEntries(CREDENTIAL_KEYS.map((k) => [k, map.get(k) ?? null])) as Record<CredentialKey, string | null>;
}

/** Facebook: ưu tiên khoá của sàn, rồi mới tới khoá chung của hệ thống. */
export async function facebookCreds(tenantId: string) {
  const [secret, token] = await Promise.all([getCredential(tenantId, "fb_app_secret"), getCredential(tenantId, "fb_page_token")]);
  return {
    appSecret: secret ?? process.env["FB_APP_SECRET"] ?? null,
    pageToken: token ?? process.env["FB_PAGE_ACCESS_TOKEN"] ?? null,
  };
}

export async function zaloCreds(tenantId: string) {
  const [appSecret, accessToken] = await Promise.all([getCredential(tenantId, "zalo_app_secret"), getCredential(tenantId, "zalo_access_token")]);
  return { appSecret, accessToken };
}
