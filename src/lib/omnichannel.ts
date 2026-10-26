export const INBOX_COPY = {
  title: "Hộp thoại đa kênh", connected: "Đã kết nối", configured: "Đã cấu hình · chưa xác minh", disconnected: "Chưa kết nối", disabled: "Đang tắt",
  twoWay: "Gửi & nhận", outboundOnly: "Chỉ gửi đi · chưa đồng bộ phản hồi", smsOutbound: "SMS · chỉ gửi đi", emailOutbound: "Email · chỉ gửi đi", channelStatus: "Trạng thái & khả năng của kênh",
  settings: "Kết nối kênh", check: "Kiểm tra kết nối", save: "Lưu bảo mật", link: "Gắn hồ sơ khách", unlinked: "Chưa gắn hồ sơ", pending: "Chưa gửi", sent: "Đã gửi", delivered: "Đã giao", read: "Đã đọc", failed: "Gửi lỗi",
  account: "Mã tài khoản", appId: "Zalo App ID", secret: "App Secret", token: "Access Token", webhook: "Đường dẫn webhook", verifyToken: "Mã xác minh webhook", messenger: "Messenger", zalo: "Zalo OA",
  windowClosed: "Đã hết cửa sổ trả lời 24 giờ của Messenger. Chờ khách nhắn lại.", notConnected: "Kênh chưa kết nối. Tin chưa được gửi.",
} as const;

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