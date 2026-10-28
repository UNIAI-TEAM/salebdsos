import { describe, expect, it } from "vitest";
import { canAccessConversation, messengerWindowOpen, replyChannel, visibleVisitorChannel, uniqueChannelIdentity, canSendPendingChannel } from "./omnichannel";
describe("two-way inbox rules", () => {
  it("routes Telegram replies to Telegram", () => expect(replyChannel("telegram")).toBe("telegram"));
  it("blocks WhatsApp sends without a Business account", () => expect(canSendPendingChannel("whatsapp")).toBe(false));
  it("blocks Viber sends without an approved bot", () => expect(canSendPendingChannel("viber")).toBe(false));
  it("replies through Messenger rather than web chat", () => expect(replyChannel("messenger")).toBe("messenger"));
  it("replies through Zalo", () => expect(replyChannel("zalo")).toBe("zalo"));
  it("does not send internal notes to visitors", () => expect(visibleVisitorChannel("note")).toBe(false));
  it("allows Messenger replies inside 24 hours", () => expect(messengerWindowOpen("2026-10-26T00:00:00Z", Date.parse("2026-10-26T23:59:59Z"))).toBe(true));
  it("blocks Messenger replies at 24 hours", () => expect(messengerWindowOpen("2026-10-26T00:00:00Z", Date.parse("2026-10-27T00:00:00Z"))).toBe(false));
  it("blocks Messenger without inbound history", () => expect(messengerWindowOpen(null)).toBe(false));
  it("Sale cannot access another Sale's conversation", () => expect(canAccessConversation(["agent"], "other", "sale")).toBe(false));
  it("Sale cannot send unassigned conversations", () => expect(canAccessConversation(["agent"], null, "sale")).toBe(false));
  it("never resolves a user from another OA", () => expect(uniqueChannelIdentity([{ account_id: "old-oa", external_user_id: "person" }], "new-oa")).toBeNull());
  it("blocks multiple users on one customer profile", () => expect(uniqueChannelIdentity([{ account_id: "oa", external_user_id: "one" }, { account_id: "oa", external_user_id: "two" }], "oa")).toBeNull());
  it("resolves exactly one scoped user", () => expect(uniqueChannelIdentity([{ account_id: "oa", external_user_id: "one" }], "oa")?.external_user_id).toBe("one"));
});