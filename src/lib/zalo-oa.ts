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

/* ---------------- Cửa sổ gửi tin tư vấn ---------------- */
// Độ dài cửa sổ theo chính sách Zalo hiện hành (cần đối chiếu developers.zalo.me khi chính sách thay đổi).
export const ZALO_WINDOW = { hours: 168, warnHours: 12 } as const;

export function zaloWindow(lastInboundAt: string | null, now = Date.now(), hours: number = ZALO_WINDOW.hours) {
  if (!lastInboundAt) return { open: false, endsAt: null as string | null, msLeft: 0, warn: false };
  const end = new Date(lastInboundAt).getTime() + hours * 3600_000;
  const msLeft = Math.max(0, end - now);
  return { open: msLeft > 0, endsAt: new Date(end).toISOString(), msLeft, warn: msLeft > 0 && msLeft < ZALO_WINDOW.warnHours * 3600_000 };
}

export function formatLeft(ms: number) {
  const h = Math.floor(ms / 3600_000), m = Math.floor((ms % 3600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)} ngày ${h % 24} giờ`;
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

/* ---------------- Gửi lại khi lỗi tạm thời ---------------- */
export const ZALO_RETRY = { maxAttempts: 3, delaysMs: [0, 1500, 4000] } as const;

/** Lỗi tạm thời (mạng, 5xx, quá tốc độ) mới thử lại; lỗi quyền/cửa sổ/người nhận thì dừng ngay. */
export function isTransientSendError(httpStatus: number | null, zaloCode?: number | null) {
  if (httpStatus === null) return true; // lỗi mạng
  if (httpStatus === 429 || httpStatus >= 500) return true;
  return zaloCode === -32; // -32: vượt giới hạn tốc độ
}

/* ---------------- Tệp đính kèm ---------------- */
export const ZALO_UPLOAD = {
  image: { maxBytes: 1_000_000, types: ["image/jpeg", "image/png"] },
  file: { maxBytes: 5_000_000, types: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
} as const;

export function attachmentKind(type: string, size: number): { kind: "image" | "file" } | { error: string } {
  if ((ZALO_UPLOAD.image.types as readonly string[]).includes(type)) return size <= ZALO_UPLOAD.image.maxBytes ? { kind: "image" } : { error: "Ảnh tối đa 1MB (JPG/PNG)" };
  if ((ZALO_UPLOAD.file.types as readonly string[]).includes(type)) return size <= ZALO_UPLOAD.file.maxBytes ? { kind: "file" } : { error: "Tệp tối đa 5MB" };
  return { error: "Zalo chỉ nhận ảnh JPG/PNG hoặc tệp PDF/DOC/DOCX" };
}
