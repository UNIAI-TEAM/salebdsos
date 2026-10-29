// Cấu hình hỗ trợ khách: tự tạo ticket, đánh giá hài lòng (CSAT), kịch bản chào mừng. Pure — dùng chung UI và máy chủ.
import { z } from "zod";

export const SUPPORT_KEY = "support_config";
/** Kênh gửi được tin tự động thật (đã kiểm chứng gửi đi). */
export const AUTO_SEND_CHANNELS = ["web_chat", "zalo", "telegram"] as const;

export const supportSchema = z.object({
  ticket: z.object({
    autoCreate: z.boolean().default(true),
    slaMinutes: z.number().int().min(5).max(10080).default(30),
    reopenHours: z.number().int().min(0).max(720).default(24),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  }).default({}),
  csat: z.object({
    enabled: z.boolean().default(true),
    question: z.string().trim().min(5).max(400).default("Cảm ơn anh/chị đã liên hệ. Anh/chị đánh giá chất lượng hỗ trợ lần này thế nào ạ? Trả lời bằng một số:"),
    labels: z.array(z.string().trim().min(1).max(30)).length(5).default(["Rất tệ", "Chưa tốt", "Bình thường", "Tốt", "Rất tốt"]),
    thanks: z.string().trim().min(2).max(300).default("Cảm ơn anh/chị đã đánh giá! Chúng tôi sẽ tiếp tục cải thiện."),
    lowScoreFollowup: z.string().trim().max(300).default("Rất tiếc vì trải nghiệm chưa tốt. Anh/chị có thể chia sẻ thêm để chúng tôi khắc phục không ạ?"),
    expireHours: z.number().int().min(1).max(168).default(48),
  }).default({}),
  welcome: z.object({
    flowId: z.string().max(40).default(""),
    channels: z.array(z.enum(AUTO_SEND_CHANNELS)).default(["web_chat"]),
  }).default({}),
});
export type SupportConfig = z.infer<typeof supportSchema>;

export function parseSupportConfig(v: unknown): SupportConfig {
  const r = supportSchema.safeParse(v ?? {});
  return r.success ? r.data : supportSchema.parse({});
}

export function ticketDueAt(cfg: SupportConfig, now = new Date()) {
  return new Date(now.getTime() + cfg.ticket.slaMinutes * 60_000).toISOString();
}

/** Ticket đã xử lý gần đây → mở lại thay vì tạo mới. */
export function shouldReopen(cfg: SupportConfig, resolvedAt: string | null, now = new Date()) {
  if (!resolvedAt || cfg.ticket.reopenHours === 0) return false;
  return now.getTime() - Date.parse(resolvedAt) <= cfg.ticket.reopenHours * 3600_000;
}

export function renderSurvey(cfg: SupportConfig) {
  return `${cfg.csat.question}\n\n${cfg.csat.labels.map((l, i) => `${i + 1}. ${l}`).join("\n")}`;
}

/** Đọc điểm 1–5 từ tin khách: "5", "5 sao", "4 tốt"... Trả null nếu không phải đánh giá. */
export function parseRating(text: string): { score: number; comment: string } | null {
  const m = /^\s*([1-5])(?:\s*(?:sao|\*|⭐|điểm|diem))?(?:[\s.,:\-–]+(.*))?$/is.exec(text);
  if (!m) return null;
  return { score: Number(m[1]), comment: (m[2] ?? "").trim().slice(0, 500) };
}

export function surveyOpen(cfg: SupportConfig, requestedAt: string | null, ratedAt: string | null, now = new Date()) {
  if (!requestedAt || ratedAt) return false;
  return now.getTime() - Date.parse(requestedAt) <= cfg.csat.expireHours * 3600_000;
}

export const canAutoSend = (channel: string) => (AUTO_SEND_CHANNELS as readonly string[]).includes(channel);
