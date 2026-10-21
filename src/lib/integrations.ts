// Cấu hình nhận khách từ kênh ngoài (Zalo OA, Facebook Lead Ads, portal BĐS). Dùng được ở cả client và server.
import { z } from "zod";

export const INTEGRATIONS_KEY = "integrations";

export const PORTALS = [
  { value: "batdongsan", label: "Batdongsan.com.vn" },
  { value: "chotot", label: "Nhà Tốt / Chợ Tốt" },
  { value: "alonhadat", label: "Alonhadat" },
  { value: "homedy", label: "Homedy" },
  { value: "other", label: "Portal / CRM khác" },
] as const;

export const integrationSettingsSchema = z.object({
  defaultProjectId: z.string().uuid().nullable().default(null),
  portal: z
    .object({
      enabled: z.boolean().default(false),
      keyHash: z.string().nullable().default(null),
      keyHint: z.string().nullable().default(null),
      createdAt: z.string().nullable().default(null),
    })
    .default({ enabled: false, keyHash: null, keyHint: null, createdAt: null }),
  facebook: z
    .object({
      enabled: z.boolean().default(false),
      pageId: z.string().max(40).nullable().default(null),
      verifyToken: z.string().max(80).nullable().default(null),
      formProjects: z.record(z.string(), z.string().uuid()).default({}),
    })
    .default({ enabled: false, pageId: null, verifyToken: null, formProjects: {} }),
  zalo: z
    .object({
      leadFromChat: z.boolean().default(true),
    })
    .default({ leadFromChat: true }),
});

export type IntegrationSettings = z.infer<typeof integrationSettingsSchema>;

export function parseIntegrationSettings(value: unknown): IntegrationSettings {
  const parsed = integrationSettingsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : integrationSettingsSchema.parse({});
}

/** Tìm số điện thoại Việt Nam trong đoạn chat. */
export function extractVnPhone(text: string): string | null {
  const m = text.replace(/[.\s-]/g, "").match(/(?:\+?84|0)(3|5|7|8|9)\d{8}/);
  if (!m) return null;
  return m[0].replace(/^\+?84/, "0");
}
