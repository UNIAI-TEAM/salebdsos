// Cấu hình kênh liên lạc (Zalo OA, tổng đài gọi điện) — dùng chung client/server
import { z } from "zod";

export const CHANNELS_KEY = "channels";

export const TELEPHONY_PROVIDERS = [
  { value: "manual", label: "Gọi bằng điện thoại (tự tải ghi âm)" },
  { value: "stringee", label: "Stringee" },
  { value: "viettel", label: "Viettel Cloud Contact Center" },
  { value: "cmc", label: "CMC Contact Center" },
] as const;

export const SMS_PROVIDERS = [
  { value: "none", label: "Chưa kết nối" },
  { value: "esms", label: "eSMS.vn" },
  { value: "vnpt", label: "VNPT SMS" },
  { value: "viettel", label: "Viettel SMS" },
] as const;

export type SmsProvider = (typeof SMS_PROVIDERS)[number]["value"];

export type TelephonyProvider = (typeof TELEPHONY_PROVIDERS)[number]["value"];

export const channelSettingsSchema = z.object({
  zalo: z.object({
    enabled: z.boolean().default(false),
    oaId: z.string().max(60).default(""),
    oaName: z.string().max(120).default(""),
    /** Link mở Zalo OA cho khách trên landing (zalo.me/...) */
    oaLink: z.string().max(300).default(""),
    /** Đã cấu hình khoá kết nối OA ở phần khoá bảo mật chưa */
    tokenConfigured: z.boolean().default(false),
    welcomeText: z.string().max(500).default("Chào anh/chị, em có thể tư vấn dự án nào ạ?"),
  }).default({}),
  webChat: z.object({
    enabled: z.boolean().default(true),
    title: z.string().max(120).default("Chat với chuyên viên"),
    greeting: z.string().max(500).default("Anh/chị cần tư vấn căn nào ạ? Em phản hồi ngay."),
  }).default({}),
  telephony: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(["manual", "stringee", "viettel", "cmc"]).default("manual"),
    /** Số hotline hiển thị cho khách */
    hotline: z.string().max(40).default(""),
    /** Đã cấu hình khoá tổng đài chưa (khoá lưu ở phần bảo mật, không lưu ở đây) */
    credentialsConfigured: z.boolean().default(false),
    recordCalls: z.boolean().default(true),
    /** Tự bóc băng ghi âm bằng AI */
    autoTranscribe: z.boolean().default(false),
  }).default({}),
  sms: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(["none", "esms", "vnpt", "viettel"]).default("none"),
    /** Brandname hiển thị khi khách nhận tin */
    brandname: z.string().max(40).default(""),
    credentialsConfigured: z.boolean().default(false),
    /** Mẫu tin gửi khách sau khi để lại thông tin */
    template: z.string().max(300).default("{brand}: Cam on anh/chi da quan tam du an. Chuyen vien se lien he ngay."),
  }).default({}),
  email: z.object({
    enabled: z.boolean().default(false),
    senderName: z.string().max(120).default(""),
    replyTo: z.string().max(160).default(""),
    /** Tự gửi email xác nhận khi khách để lại thông tin */
    autoConfirm: z.boolean().default(true),
  }).default({}),
});

export type ChannelSettings = z.infer<typeof channelSettingsSchema>;

export const DEFAULT_CHANNEL_SETTINGS: ChannelSettings = channelSettingsSchema.parse({});

export function parseChannelSettings(value: unknown): ChannelSettings {
  const parsed = channelSettingsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : DEFAULT_CHANNEL_SETTINGS;
}

export const CHANNEL_LABEL: Record<string, string> = {
  web_chat: "Chat trên trang",
  zalo: "Zalo OA",
  call: "Gọi điện",
  sms: "SMS",
  email: "Email",
  note: "Ghi chú nội bộ",
};

export const CALL_OUTCOMES = [
  { value: "connected", label: "Đã nói chuyện" },
  { value: "no_answer", label: "Không nghe máy" },
  { value: "busy", label: "Máy bận" },
  { value: "wrong_number", label: "Sai số" },
  { value: "callback", label: "Hẹn gọi lại" },
] as const;

export const CALL_OUTCOME_LABEL: Record<string, string> = Object.fromEntries(
  CALL_OUTCOMES.map((item) => [item.value, item.label]),
);

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}
