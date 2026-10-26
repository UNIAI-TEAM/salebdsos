import { describe, expect, it } from "vitest";
import { canAccessConversation, messengerWindowOpen, replyChannel, visibleVisitorChannel } from "./omnichannel";
describe("two-way inbox rules", () => {
  it("replies through Messenger rather than web chat", () => expect(replyChannel("messenger")).toBe("messenger"));
  it("replies through Zalo", () => expect(replyChannel("zalo")).toBe("zalo"));
  it("does not send internal notes to visitors", () => expect(visibleVisitorChannel("note")).toBe(false));
  it("allows Messenger replies inside 24 hours", () => expect(messengerWindowOpen("2026-10-26T00:00:00Z", Date.parse("2026-10-26T23:59:59Z"))).toBe(true));
  it("blocks Messenger replies at 24 hours", () => expect(messengerWindowOpen("2026-10-26T00:00:00Z", Date.parse("2026-10-27T00:00:00Z"))).toBe(false));
  it("blocks Messenger without inbound history", () => expect(messengerWindowOpen(null)).toBe(false));
  it("Sale cannot access another Sale's conversation", () => expect(canAccessConversation(["agent"], "other", "sale")).toBe(false));
  it("Sale cannot send unassigned conversations", () => expect(canAccessConversation(["agent"], null, "sale")).toBe(false));
});