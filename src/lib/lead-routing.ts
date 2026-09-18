// Cấu hình phân phối lead tự động theo dự án + SLA gọi khách (dùng chung client/server)
import { z } from "zod";

export const LEAD_ROUTING_KEY = "lead_routing";

export const leadRoutingRuleSchema = z.object({
  projectId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).default([]),
});

export const leadRoutingSchema = z.object({
  enabled: z.boolean().default(false),
  slaMinutes: z.number().int().min(5).max(1440).default(30),
  coldDays: z.number().int().min(1).max(60).default(3),
  fallbackUserIds: z.array(z.string().uuid()).default([]),
  projectRules: z.array(leadRoutingRuleSchema).default([]),
});

export type LeadRoutingConfig = z.infer<typeof leadRoutingSchema>;

export const DEFAULT_LEAD_ROUTING: LeadRoutingConfig = leadRoutingSchema.parse({});

export function parseLeadRouting(value: unknown): LeadRoutingConfig {
  const parsed = leadRoutingSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : DEFAULT_LEAD_ROUTING;
}

/** Trạng thái lead đang trong quá trình chăm sóc (dùng để cảnh báo lead nguội). */
export const WORKING_LEAD_STATUSES = [
  "contacted",
  "qualified",
  "consulting",
  "proposal",
  "quoted",
  "deposit",
] as const;

export const SLA_MINUTE_OPTIONS = [5, 15, 30, 60, 120, 240, 480] as const;
export const COLD_DAY_OPTIONS = [1, 2, 3, 5, 7, 14, 30] as const;

export function slaLabel(minutes: number) {
  if (minutes < 60) return `${minutes} phút`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} giờ` : `${minutes} phút`;
}
