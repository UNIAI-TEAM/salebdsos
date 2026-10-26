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
  telegram: "Telegram", whatsapp: "WhatsApp Business", viber: "Viber",
  botId: "Telegram Bot ID", phoneNumberId: "WhatsApp Phone Number ID", viberUri: "Viber Bot URI", botToken: "Viber Bot Token",
  accountVerified: "Đã xác minh tài khoản · chưa bật gửi/nhận", savedOnly: "Đã lưu cấu hình · chưa xác minh tài khoản",
  secureLinked: "Telegram và WhatsApp dùng kết nối bảo mật trong Lovable. Chọn kết nối cho dự án trước, sau đó nhập mã tài khoản và kiểm tra tại đây; không nhập token gốc vào ứng dụng.",
  viberSecure: "Nhập Bot Token do Viber cấp sau khi bot được duyệt. Khoá được mã hoá theo sàn và không hiện lại.",
  noWebhook: "Chưa triển khai nhận tin cho kênh này; việc kiểm tra chỉ xác minh tài khoản, không đăng ký nhận tin hoặc gửi tin khách.",
  saved: "Đã lưu bảo mật. Chưa bật gửi/nhận.", verifyAccount: "Kiểm tra tài khoản", missingAccount: "Vui lòng nhập mã tài khoản.",
  checkFailed: "Không kiểm tra được kết nối.", linkedMissing: "Chưa có kết nối cho dự án. Hoàn tất thẻ kết nối Telegram/WhatsApp trong Lovable trước.",
  mismatch: "Khoá kết nối không thuộc tài khoản đã nhập.", viberMissing: "Chưa lưu Viber Bot Token.",
  clearSetup: "Xoá cấu hình kênh", confirmClear: "Xoá cấu hình và khoá đã lưu của kênh này?", cleared: "Đã xoá cấu hình kênh.",
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