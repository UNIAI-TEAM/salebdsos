import { z } from "zod";

export const onboardingChannelSchema = z.enum(["telegram", "whatsapp", "viber"]);
export type OnboardingChannel = z.infer<typeof onboardingChannelSchema>;
export const onboardingInputSchema = z.object({
  tenantId: z.string().uuid(), channel: onboardingChannelSchema,
  accountId: z.string().trim().min(1).max(120),
  token: z.string().trim().min(16).max(4000).optional(),
}).superRefine((d, ctx) => {
  if (d.channel !== "viber" && !/^\d+$/.test(d.accountId)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accountId"], message: "Mã tài khoản chỉ gồm số." });
  if (d.channel !== "viber" && d.token) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["token"], message: "Telegram và WhatsApp dùng kết nối bảo mật của Lovable; không nhập token tại đây." });
});
export const onboardingSettingsSchema = z.object({
  accountId: z.string().max(120).default(""), accountName: z.string().max(160).default(""),
  checkedAt: z.string().nullable().default(null), accountVerified: z.boolean().default(false),
}).default({});