// Quy trình nhắc khách tự động: khách gửi thông tin → vào giỏ hàng → nhắc chốt hợp đồng.
// Dùng chung client/server.
import { z } from "zod";

export const NURTURE_KEY = "nurture";
export const NURTURE_LOCK_KEY = "nurture_run";

export const NURTURE_STEPS = [
  {
    key: "followup_submitted",
    label: "Khách gửi thông tin nhưng chưa vào giỏ hàng",
    hint: "Nhắc khách xem căn / chọn sản phẩm sau khi để lại thông tin.",
    delayLabel: "Gửi sau khi khách gửi thông tin",
  },
  {
    key: "cart_close",
    label: "Khách đã vào giỏ hàng nhưng chưa có hợp đồng",
    hint: "Nhắc khách chốt hợp đồng cho căn/lô đang giữ.",
    delayLabel: "Gửi sau khi khách vào giỏ hàng",
  },
  {
    key: "hold_expiring",
    label: "Sắp hết hạn giữ chỗ",
    hint: "Nhắc khách trước khi căn/lô hết hạn giữ chỗ.",
    delayLabel: "Gửi trước khi hết hạn giữ chỗ",
  },
] as const;

export type NurtureStepKey = (typeof NURTURE_STEPS)[number]["key"];

const stepSchema = z.object({
  enabled: z.boolean().default(true),
  delayHours: z.number().min(1).max(720).default(24),
  channel: z.enum(["auto", "zalo", "sms", "email", "note"]).default("auto"),
  template: z.string().max(600).default(""),
});

export const nurtureSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  /** Số tin tối đa mỗi lượt chạy để không gửi ồ ạt */
  maxPerRun: z.number().min(1).max(200).default(40),
  /** Chỉ gửi trong khung giờ này (giờ Việt Nam) */
  quietStartHour: z.number().min(0).max(23).default(8),
  quietEndHour: z.number().min(1).max(24).default(21),
  signature: z.string().max(120).default(""),
  steps: z
    .object({
      followup_submitted: stepSchema.default({}),
      cart_close: stepSchema.default({}),
      hold_expiring: stepSchema.default({}),
    })
    .default({}),
});

export type NurtureSettings = z.infer<typeof nurtureSettingsSchema>;

const DEFAULT_TEMPLATES: Record<NurtureStepKey, string> = {
  followup_submitted:
    "Chao {name}, em la {agent} phu trach du an {project}. Em gui anh/chi bang gia va can con trong, minh hen xem can trong tuan nay nhe?",
  cart_close:
    "Chao {name}, can {product} du an {project} dang giu cho anh/chi. Em chuan bi hop dong de minh chot trong hom nay nhe? Lien he: {hotline}",
  hold_expiring:
    "Chao {name}, can {product} sap het han giu cho ({deadline}). Anh/chi xac nhan de em giu tiep hoac lam hop dong nhe.",
};

export const DEFAULT_NURTURE_SETTINGS: NurtureSettings = nurtureSettingsSchema.parse({
  steps: {
    followup_submitted: { delayHours: 24, template: DEFAULT_TEMPLATES.followup_submitted },
    cart_close: { delayHours: 48, template: DEFAULT_TEMPLATES.cart_close },
    hold_expiring: { delayHours: 24, template: DEFAULT_TEMPLATES.hold_expiring },
  },
});

export function parseNurtureSettings(value: unknown): NurtureSettings {
  const parsed = nurtureSettingsSchema.safeParse(value ?? {});
  const data = parsed.success ? parsed.data : DEFAULT_NURTURE_SETTINGS;
  for (const step of NURTURE_STEPS) {
    const item = data.steps[step.key];
    if (!item.template.trim()) item.template = DEFAULT_TEMPLATES[step.key];
  }
  return data;
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => vars[key] ?? "").replace(/\s+/g, " ").trim();
}

export const NURTURE_CHANNEL_OPTIONS = [
  { value: "auto", label: "Tự chọn (Zalo → SMS → Email)" },
  { value: "zalo", label: "Zalo OA" },
  { value: "sms", label: "SMS brandname" },
  { value: "email", label: "Email" },
  { value: "note", label: "Chỉ nhắc chuyên viên (không gửi khách)" },
] as const;
