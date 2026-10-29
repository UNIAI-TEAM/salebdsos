// Chọn OA/danh tính Zalo cho một hội thoại và gửi tin (chữ, ảnh, tệp) qua đúng OA đó.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { pickReplyIdentity, zaloWindow } from "./zalo-oa";
import type { OutgoingFile } from "./zalo-oa.server";

export async function resolveZaloTarget(supabase: any, tenantId: string, conv: { lead_id: string | null }, conversationId: string) {
  let q = supabase.from("channel_identities").select("account_id,external_user_id,conversation_id,last_inbound_at").eq("tenant_id", tenantId).eq("channel", "zalo");
  q = conv.lead_id ? q.or(`lead_id.eq.${conv.lead_id},conversation_id.eq.${conversationId}`) : q.eq("conversation_id", conversationId);
  const { data: ids } = await q.limit(20);
  const identity = pickReplyIdentity((ids ?? []) as { account_id: string; external_user_id: string; conversation_id: string; last_inbound_at: string | null }[], conversationId);
  if (!identity) throw new Error("Chưa xác định duy nhất tài khoản Zalo; cần kiểm tra hồ sơ trước khi gửi.");
  const { data: oa } = await supabaseAdmin.from("zalo_oa_accounts").select("id,status").eq("tenant_id", tenantId).eq("oa_id", identity.account_id).maybeSingle();
  return { identity, oa };
}

export async function sendZaloForConversation(supabase: any, tenantId: string, conv: { lead_id: string | null }, conversationId: string, text: string, file?: OutgoingFile) {
  const { identity, oa } = await resolveZaloTarget(supabase, tenantId, conv, conversationId);
  if (!zaloWindow(identity.last_inbound_at).open) throw new Error("Đã quá hạn gửi tin tư vấn Zalo cho khách này — chỉ gửi được tin mẫu/ZNS.");
  if (oa) {
    if (oa.status === "disconnected") throw new Error("OA của hội thoại này đã ngắt kết nối — không gửi được.");
    const { sendFromOa } = await import("./zalo-oa.server");
    return sendFromOa(oa.id, identity.external_user_id, text, file);
  }
  // OA cấu hình đơn cũ: chỉ hỗ trợ chữ.
  const { loadChannelSettings, sendZaloMessage } = await import("./channels.server");
  const config = await loadChannelSettings(tenantId);
  if (identity.account_id !== config.zalo.oaId) throw new Error("OA của hội thoại này đã ngắt kết nối — không gửi được.");
  if (file) throw new Error("Chuyển OA cũ vào danh sách Zalo OA để gửi ảnh/tệp.");
  return { ...(await sendZaloMessage({ tenantId, zaloUserId: identity.external_user_id, text })), attempts: 1 };
}

export const INBOX_MEDIA_BUCKET = "inbox-media";
export const isStoredMedia = (u: string | null) => Boolean(u && u.startsWith(INBOX_MEDIA_BUCKET + "/"));

export async function signMedia<T extends { attachment_url: string | null }>(rows: T[]) {
  const paths = rows.filter((r) => isStoredMedia(r.attachment_url)).map((r) => r.attachment_url!.slice(INBOX_MEDIA_BUCKET.length + 1));
  if (!paths.length) return rows;
  const { data } = await supabaseAdmin.storage.from(INBOX_MEDIA_BUCKET).createSignedUrls(paths, 3600);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => (isStoredMedia(r.attachment_url) ? { ...r, attachment_url: map.get(r.attachment_url!.slice(INBOX_MEDIA_BUCKET.length + 1)) ?? null } : r));
}

/** Tên OA theo hội thoại (Sale không đọc bảng OA trực tiếp; chỉ trả tên/OA ID trong sàn). */
export async function oaLabels(supabase: any, tenantId: string, conversationIds: string[]) {
  const { data: accounts } = await supabaseAdmin.from("zalo_oa_accounts").select("oa_id,name,status").eq("tenant_id", tenantId).neq("status", "disconnected").order("created_at");
  const names = new Map((accounts ?? []).map((a) => [a.oa_id, a.name || `OA ${a.oa_id}`]));
  const byConversation = new Map<string, string>();
  if (conversationIds.length) {
    const { data: ids } = await supabase.from("channel_identities").select("conversation_id,account_id").eq("tenant_id", tenantId).eq("channel", "zalo").in("conversation_id", conversationIds);
    for (const r of (ids ?? []) as { conversation_id: string; account_id: string }[]) byConversation.set(r.conversation_id, names.get(r.account_id) ?? `OA ${r.account_id}`);
  }
  return { byConversation, accounts: (accounts ?? []).map((a) => ({ oaId: a.oa_id, name: a.name || `OA ${a.oa_id}` })) };
}
