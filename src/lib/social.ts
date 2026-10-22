// Tự động hoá Fanpage + bộ trả lời nhanh / thẻ hội thoại. Pure, dùng được cả client và server.
import { z } from "zod";
import { extractVnPhone } from "@/lib/integrations";

export const SOCIAL_KEY = "social";

export const DEFAULT_TAGS = [
  { key: "surveying", label: "Đang khảo sát", tone: "blue" },
  { key: "vip", label: "VIP", tone: "amber" },
  { key: "site_visit", label: "Hẹn xem nhà mẫu", tone: "emerald" },
  { key: "callback", label: "Cần gọi lại", tone: "rose" },
] as const;

export const DEFAULT_QUICK_REPLIES = [
  { shortcut: "gia", text: "Dạ, giá căn hộ dự án {project} hiện từ ... tỷ/căn, đã gồm VAT. Anh/chị cho em xin SĐT để gửi bảng giá chi tiết nhé ạ." },
  { shortcut: "vitri", text: "Dạ, dự án {project} nằm tại ..., kết nối nhanh tới trung tâm. Em gửi anh/chị bản đồ vị trí ngay ạ." },
  { shortcut: "chinhsach", text: "Dạ, chính sách bán hàng tháng này: chiết khấu ...%, hỗ trợ vay 70% lãi suất 0% trong ... tháng ạ." },
];

const quickReply = z.object({
  shortcut: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{1,20}$/),
  text: z.string().trim().min(1).max(1000),
});

export const socialSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  hidePhone: z.boolean().default(true),
  hideKeywords: z.array(z.string().trim().min(1).max(40)).max(50).default(["zalo", "inbox giá", "sđt", "liên hệ"]),
  autoReply: z.boolean().default(true),
  replyTemplates: z.array(z.string().trim().min(1).max(500)).max(20).default([
    "{Dạ|Vâng} {name} ơi, em đã {gửi|inbox} thông tin {chi tiết|bảng giá} qua tin nhắn, {anh/chị|mình} kiểm tra giúp em nhé!",
  ]),
  autoMessage: z.boolean().default(true),
  messageText: z.string().trim().max(640).default("Chào {name}! Cảm ơn anh/chị đã quan tâm dự án {project}. Bấm nút dưới để xem bảng giá & mặt bằng mới nhất."),
  buttonLabel: z.string().trim().max(20).default("Xem dự án"),
  postProjects: z.record(z.string(), z.string().uuid()).default({}),
  quickReplies: z.array(quickReply).max(50).default(DEFAULT_QUICK_REPLIES),
});
export type SocialSettings = z.infer<typeof socialSettingsSchema>;

export function parseSocialSettings(v: unknown): SocialSettings {
  const r = socialSettingsSchema.safeParse(v ?? {});
  return r.success ? r.data : socialSettingsSchema.parse({});
}

const norm = (s: string) => s.toLowerCase().normalize("NFC");

/** Lý do cần ẩn bình luận, hoặc null nếu giữ nguyên. */
export function hideReason(text: string, cfg: Pick<SocialSettings, "hidePhone" | "hideKeywords">): "phone" | "keyword" | null {
  if (cfg.hidePhone && extractVnPhone(text)) return "phone";
  const t = norm(text);
  if (cfg.hideKeywords.some((k) => k && t.includes(norm(k)))) return "keyword";
  return null;
}

/** Xoay vòng nội dung: {a|b|c} → chọn 1 theo seed (ổn định cho cùng 1 bình luận). */
export function spin(text: string, seed: number): string {
  let i = 0;
  return text.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, body: string) => {
    const opts = body.split("|");
    return opts[Math.abs(seed + i++ * 7) % opts.length];
  });
}

export function seedOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/** Chọn mẫu xoay vòng rồi điền biến. */
export function buildReply(templates: string[], commentId: string, vars: Record<string, string>): string | null {
  if (!templates.length) return null;
  const seed = seedOf(commentId);
  return fill(spin(templates[seed % templates.length], seed), vars).trim();
}

/** "/gia" ở cuối ô soạn → nội dung mẫu. Trả null nếu không khớp. */
export function expandShortcut(draft: string, replies: { shortcut: string; text: string }[]): string | null {
  const m = draft.match(/(^|\s)\/([a-z0-9_]+)$/i);
  if (!m) return null;
  const hit = replies.find((r) => r.shortcut === m[2].toLowerCase());
  if (!hit) return null;
  return draft.slice(0, draft.length - m[2].length - 1) + hit.text;
}
