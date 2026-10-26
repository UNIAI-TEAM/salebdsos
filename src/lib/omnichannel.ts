export const INBOX_COPY = {
  title: "Hộp thoại đa kênh", connected: "Đã kết nối", configured: "Đã cấu hình · chưa xác minh", disconnected: "Chưa kết nối", disabled: "Đang tắt",
  review: "Chưa xác nhận hồ sơ khách", identityMissing: "Chưa xác định duy nhất tài khoản khách trên kênh này; cần kiểm tra liên kết trước khi gửi.",
  twoWay: "Gửi & nhận", outboundOnly: "Chỉ gửi đi · chưa đồng bộ phản hồi", smsOutbound: "SMS · chỉ gửi đi", emailOutbound: "Email · chỉ gửi đi", channelStatus: "Trạng thái & khả năng của kênh",
  settings: "Kết nối kênh", check: "Kiểm tra kết nối", save: "Lưu bảo mật", link: "Gắn hồ sơ khách", unlinked: "Chưa gắn hồ sơ", pending: "Chưa gửi", sent: "Đã gửi", delivered: "Đã giao", read: "Đã đọc", failed: "Gửi lỗi",
  account: "Mã tài khoản", appId: "Zalo App ID", secret: "App Secret", token: "Access Token", webhook: "Đường dẫn webhook", verifyToken: "Mã xác minh webhook", messenger: "Messenger", zalo: "Zalo OA",
  windowClosed: "Đã hết cửa sổ trả lời 24 giờ của Messenger. Chờ khách nhắn lại.", notConnected: "Kênh chưa kết nối. Tin chưa được gửi.",
  newChannels: "Kênh chờ thiết lập", notActivated: "Chưa bật gửi/nhận",
  telegramSetup: "Chờ chọn bot Telegram qua kết nối bảo mật và đăng ký nhận tin.",
  whatsappSetup: "Chờ số WhatsApp Business, xác minh email/số điện thoại và Meta duyệt tài khoản.",
  whatsappCosts: "WhatsApp Business: phản hồi hỗ trợ miễn phí trong cửa sổ dịch vụ; tin marketing có phí. Ngoài cửa sổ dịch vụ cần mẫu được duyệt.",
  viberSetup: "Chờ bot doanh nghiệp được Viber hoặc đối tác chính thức duyệt theo điều khoản thương mại.",
  setupRequired: "Cần hoàn tất tài khoản và kết nối trước khi Sale gửi hoặc nhận tin.",
} as const;

export const PENDING_INBOX_CHANNELS = [
  { channel: "telegram", label: "Telegram", reason: INBOX_COPY.telegramSetup, active: false },
  { channel: "whatsapp", label: "WhatsApp Business", reason: INBOX_COPY.whatsappSetup, active: false },
  { channel: "viber", label: "Viber", reason: INBOX_COPY.viberSetup, active: false },
] as const;

export function canSendPendingChannel(channel: string) {
  return !PENDING_INBOX_CHANNELS.some(c => c.channel === channel && !c.active);
}

export function replyChannel(channel: string) {
  return ["web_chat", "zalo", "messenger", "sms", "email"].includes(channel) ? channel : "note";
}
export function messengerWindowOpen(lastInbound: string | null, now = Date.now()) {
  if (!lastInbound) return false;
  const elapsed = now - new Date(lastInbound).getTime();
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 24 * 3600_000;
}
export function canAccessConversation(roles: string[], owner: string | null, user: string) {
  return roles.some((r) => ["owner", "admin", "platform_admin"].includes(r)) || owner === user;
}
export function visibleVisitorChannel(channel: string) { return channel === "web_chat"; }

export function uniqueChannelIdentity<T extends { account_id: string; external_user_id: string }>(items: T[], account: string): T | null {
  const scoped = items.filter(i => i.account_id === account);
  return scoped.length === 1 ? scoped[0] : null;
}