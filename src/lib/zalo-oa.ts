// Quy tắc thuần cho nhiều Zalo OA — dùng chung giữa server và giao diện, có test.

export const ZALO_OA_DEFAULTS = {
  /** Làm mới access token trước khi hết hạn bao nhiêu phút */
  refreshBeforeMinutes: 15,
  /** Cảnh báo "sắp hết hạn" khi refresh token còn ít hơn số ngày này */
  refreshWarnDays: 7,
  /** Giữ khóa làm mới tối đa bao nhiêu giây */
  refreshLockSeconds: 60,
  /** Từ chối sự kiện webhook cũ hơn số phút này (chống phát lại) */
  webhookMaxAgeMinutes: 15,
} as const;

export type OaStatus = "pending" | "connected" | "expired" | "webhook_error" | "paused" | "disconnected";
export type OaDisplayStatus = OaStatus | "expiring";

export const OA_STATUS_LABEL: Record<OaDisplayStatus, string> = {
  pending: "Chờ cấp quyền",
  connected: "Đã kết nối",
  expiring: "Sắp hết hạn token",
  expired: "Hết hạn token",
  webhook_error: "Lỗi webhook",
  paused: "Tạm dừng",
  disconnected: "Đã ngắt kết nối",
};

/** Trạng thái hiển thị: "Sắp hết hạn" khi refresh token còn ít ngày. */
export function displayStatus(a: { status: OaStatus; refresh_expires_at: string | null }, now = new Date()): OaDisplayStatus {
  if (a.status !== "connected") return a.status;
  if (a.refresh_expires_at) {
    const left = new Date(a.refresh_expires_at).getTime() - now.getTime();
    if (left <= 0) return "expired";
    if (left < ZALO_OA_DEFAULTS.refreshWarnDays * 86400_000) return "expiring";
  }
  return "connected";
}

/** Cần làm mới access token chưa? */
export function needsRefresh(tokenExpiresAt: string | null, now = new Date(), beforeMinutes: number = ZALO_OA_DEFAULTS.refreshBeforeMinutes) {
  if (!tokenExpiresAt) return true;
  return new Date(tokenExpiresAt).getTime() - now.getTime() <= beforeMinutes * 60_000;
}

/** OA có được gửi tin không (Tạm dừng vẫn cho Sale trả lời tay; chỉ chặn bot/CSAT). */
export function canSend(status: OaStatus) {
  return status === "connected" || status === "paused" || status === "webhook_error";
}
export function canRunAutomation(status: OaStatus) {
  return status === "connected";
}

/** Sự kiện webhook còn mới không (timestamp của Zalo tính bằng mili giây). */
export function webhookFresh(timestamp: string | number, now = Date.now(), maxAgeMinutes: number = ZALO_OA_DEFAULTS.webhookMaxAgeMinutes) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(now - ts) <= maxAgeMinutes * 60_000;
}

/**
 * Chọn OA để trả lời: đúng OA khách đã nhắn trong hội thoại này.
 * Nhiều danh tính trên cùng hội thoại → không đoán, trả lỗi.
 */
export function pickReplyIdentity<T extends { account_id: string; conversation_id?: string | null }>(identities: T[], conversationId: string): T | null {
  const own = identities.filter((i) => i.conversation_id === conversationId);
  if (own.length === 1) return own[0];
  if (own.length > 1) return null;
  const accounts = new Set(identities.map((i) => i.account_id));
  return identities.length === 1 && accounts.size === 1 ? identities[0] : null;
}

export const ZALO_HANDLED_EVENTS = new Set([
  "user_send_text", "user_send_image", "user_send_file", "user_send_audio", "user_send_video",
  "user_send_location", "user_send_sticker", "user_send_gif", "user_submit_info", "user_send_link",
]);
export const ZALO_FOLLOW_EVENTS = new Set(["follow", "unfollow"]);

export function eventText(eventName: string, message?: { text?: string }, info?: { name?: string; phone?: string }) {
  if (message?.text) return message.text;
  switch (eventName) {
    case "user_submit_info": return `Thông tin khách: ${info?.name ?? ""} ${info?.phone ?? ""}`.trim();
    case "user_send_image": return "[Ảnh]";
    case "user_send_file": return "[Tệp đính kèm]";
    case "user_send_audio": return "[Tin nhắn thoại]";
    case "user_send_video": return "[Video]";
    case "user_send_location": return "[Vị trí]";
    case "user_send_sticker": case "user_send_gif": return "[Sticker]";
    case "user_send_link": return "[Liên kết]";
    default: return "[Tin nhắn Zalo]";
  }
}

export function webhookPath(key: string) {
  return `/api/public/zalo/${key}`;
}
export const OAUTH_CALLBACK_PATH = "/api/public/zalo/oauth-callback";
