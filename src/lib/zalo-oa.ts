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

/** Multi-OA health is independent of the deprecated single-OA settings. */
export function oaConnectionSummary(accounts: { status: OaStatus; last_webhook_at: string | null }[]) {
  const active = accounts.filter((a) => canSend(a.status));
  return {
    configured: accounts.some((a) => a.status !== "disconnected"),
    enabled: active.length > 0,
    verified: active.some((a) => Boolean(a.last_webhook_at)),
  };
}

/** Rejected foreign-OA/delivery events cannot erase proven connection evidence. */
export function oaReceiveHealth(accounts: { status: OaStatus; last_webhook_at: string | null }[], latest: { ok: boolean; detail: string | null; created_at: string } | null) {
  const summary = oaConnectionSummary(accounts);
  const lastAccepted = Math.max(0, ...accounts.filter(a => canSend(a.status)).map(a => Date.parse(a.last_webhook_at ?? "") || 0));
  const authRejected = Boolean(latest && !latest.ok && /^Sai chữ ký|^Sai App ID/.test(latest.detail ?? "") && Date.parse(latest.created_at) > lastAccepted);
  return { ...summary, verified: summary.verified && !authRejected, authRejected };
}

/** Preserve provider identifiers beyond JavaScript's safe integer range. Verify the original body, not this normalized JSON. */
export function parseZaloWebhook(raw: string): unknown {
  return JSON.parse(raw.replace(/"(id|oa_id|app_id)"\s*:\s*(\d+)/g, '"$1":"$2"'));
}

/** OA is the recipient for inbound messages, sender for outbound/delivery events. */
export function eventOaId(p: { event_name: string; oa_id?: string | number; sender?: { id: string | number }; recipient?: { id: string | number } }) {
  const inbound = ZALO_HANDLED_EVENTS.has(p.event_name);
  const id = p.oa_id ?? (inbound ? p.recipient?.id : p.sender?.id);
  return id == null ? null : String(id);
}

export function zaloSendError(message: string) {
  return /upgrade OA Tier Package/i.test(message)
    ? "Zalo từ chối gửi: OA cần nâng cấp gói dịch vụ để dùng tính năng nhắn tin qua API. Quản trị OA cần kiểm tra gói trên Zalo OA; gửi lại không khắc phục được lỗi này."
    : message;
}

/* ---------------- OA ID có thể chưa biết khi tạo ---------------- */
// Admin không phải lúc nào cũng tìm thấy OA ID. Khi để trống, hàng đợi mang mã "pending:" theo
// webhook_key riêng (không đụng hàng) rồi Zalo xác nhận mã thật trong phiên cấp quyền.
export const PENDING_OA_PREFIX = "pending:";
export const pendingOaId = (webhookKey: string) => `${PENDING_OA_PREFIX}${webhookKey}`;
export const isPendingOaId = (oaId: string) => oaId.startsWith(PENDING_OA_PREFIX);

/**
 * Mã OA sau phiên cấp quyền. `callback` là mã Zalo trả trên URL callback; `authoritative` là mã do
 * chính Access Token xác nhận (getoa). OA chưa có mã sẽ lấy mã do token xác nhận, vì URL có thể bị sửa.
 */
export function resolveOaAfterGrant(
  current: string, callback: string | null, authoritative: string | null,
): { action: "keep" } | { action: "assign"; oaId: string } | { action: "error"; message: string } {
  if (isPendingOaId(current)) {
    const got = authoritative ?? callback;
    return got
      ? { action: "assign", oaId: got }
      : { action: "error", message: "Zalo không trả về mã OA trong phiên cấp quyền. Anh/chị hãy bấm Cấp quyền lại và chọn đúng OA." };
  }
  if (callback && callback !== current) return { action: "error", message: "Anh/chị đã chọn OA khác với OA đang cấu hình." };
  if (authoritative && authoritative !== current) {
    return { action: "error", message: `Access Token thuộc OA ${authoritative}, không phải OA ${current} đang cấu hình.` };
  }
  return { action: "keep" };
}

export function readZaloProfile(meta: unknown) {
  const m = meta && typeof meta === "object" ? meta as Record<string, unknown> : {};
  const p = m.zaloProfile && typeof m.zaloProfile === "object" ? m.zaloProfile as Record<string, unknown> : {};
  return { name: typeof p.name === "string" ? p.name : null, avatar: typeof p.avatar === "string" && p.avatar.startsWith("https://") ? p.avatar : null };
}

export function zaloProfileFailure(code: number | undefined, message: string, http: number) {
  if (code === -212) return "Zalo chưa cho ứng dụng dùng API lấy tên/ảnh (mã -212). Trong Zalo Developers → Đăng ký API → Official Account API, đăng ký API truy xuất chi tiết người dùng và kiểm tra quyền quản lý thông tin người dùng.";
  if (/upgrade OA Tier Package/i.test(message)) return "Zalo từ chối lấy tên/ảnh: OA cần nâng cấp gói dịch vụ để dùng tính năng này.";
  return `Zalo từ chối lấy tên/ảnh (mã ${code ?? http}). Kiểm tra quyền quản lý thông tin người dùng của ứng dụng.`;
}

export function zaloContactName(name: string | null, meta: unknown) {
  const profile = readZaloProfile(meta);
  return !name || ["Khách Zalo", "Khách ẩn danh"].includes(name) ? profile.name || name : name;
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

/** Extract a Zalo domain-verification code from a filename, file content or raw code. */
export function parseZaloVerifier(input: string): string | null {
  const s = input.trim();
  const meta = s.match(/zalo-platform-site-verification"\s+content="([A-Za-z0-9_-]{8,80})"/);
  if (meta) return meta[1];
  const file = s.match(/zalo_verifier([A-Za-z0-9_-]{8,80})\.html/);
  if (file) return file[1];
  return /^[A-Za-z0-9_-]{8,80}$/.test(s) ? s : null;
}
export const ZALO_VERIFIER_PATH = /^\/zalo_verifier([A-Za-z0-9_-]{8,80})\.html$/;
export function zaloVerifierHtml(code: string) {
  return `<!DOCTYPE html>\n<html lang="en">\n\n<head>\n    <meta property="zalo-platform-site-verification" content="${code}" />\n</head>\n\n<body>\nThere Is No Limit To What You Can Accomplish Using Zalo!\n</body>\n\n</html>`;
}
