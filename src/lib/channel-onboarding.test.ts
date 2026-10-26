import { describe, it, expect } from "vitest";
import { onboardingInputSchema } from "./channel-onboarding";
import { parseChannelSettings } from "./channels";
const tenantId = "00000000-0000-4000-8000-000000000001";
describe("additional channel onboarding", () => {
  it("accepts Telegram bot identifiers without raw token", () => expect(onboardingInputSchema.safeParse({ tenantId, channel: "telegram", accountId: "12345" }).success).toBe(true));
  it("rejects raw Telegram token entry", () => expect(onboardingInputSchema.safeParse({ tenantId, channel: "telegram", accountId: "12345", token: "unsafe-placeholder-for-test" }).success).toBe(false));
  it("rejects raw WhatsApp token entry", () => expect(onboardingInputSchema.safeParse({ tenantId, channel: "whatsapp", accountId: "12345", token: "unsafe-placeholder-for-test" }).success).toBe(false));
  it("accepts Viber secure token field", () => expect(onboardingInputSchema.safeParse({ tenantId, channel: "viber", accountId: "approved-bot", token: "test-token-not-a-real-secret" }).success).toBe(true));
  it("does not claim verified channels for existing configurations", () => expect(parseChannelSettings({}).telegram.accountVerified).toBe(false));
});