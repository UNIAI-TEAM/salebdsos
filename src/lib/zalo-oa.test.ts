import { describe, expect, it } from "vitest";
import { canRunAutomation, canSend, displayStatus, needsRefresh, pickReplyIdentity, webhookFresh } from "./zalo-oa";

const now = new Date("2026-10-29T00:00:00Z");

describe("zalo oa rules", () => {
  it("refreshes access token 15 minutes before expiry", () => {
    expect(needsRefresh("2026-10-29T00:14:00Z", now)).toBe(true);
    expect(needsRefresh("2026-10-29T00:16:00Z", now)).toBe(false);
    expect(needsRefresh(null, now)).toBe(true);
  });
  it("warns when refresh token has under 7 days left and marks expired after", () => {
    expect(displayStatus({ status: "connected", refresh_expires_at: "2026-11-03T00:00:00Z" }, now)).toBe("expiring");
    expect(displayStatus({ status: "connected", refresh_expires_at: "2026-12-29T00:00:00Z" }, now)).toBe("connected");
    expect(displayStatus({ status: "connected", refresh_expires_at: "2026-10-28T00:00:00Z" }, now)).toBe("expired");
  });
  it("paused OA still allows manual replies but no automation", () => {
    expect(canSend("paused")).toBe(true);
    expect(canRunAutomation("paused")).toBe(false);
    expect(canSend("expired")).toBe(false);
    expect(canSend("disconnected")).toBe(false);
  });
  it("rejects webhook events older than 15 minutes", () => {
    const t = now.getTime();
    expect(webhookFresh(t - 14 * 60_000, t)).toBe(true);
    expect(webhookFresh(t - 16 * 60_000, t)).toBe(false);
    expect(webhookFresh("abc", t)).toBe(false);
  });
  it("replies from the OA of this conversation, never guesses", () => {
    const ids = [{ account_id: "oa1", conversation_id: "c1" }, { account_id: "oa2", conversation_id: "c2" }];
    expect(pickReplyIdentity(ids, "c2")?.account_id).toBe("oa2");
    expect(pickReplyIdentity(ids, "c3")).toBeNull();
    expect(pickReplyIdentity([{ account_id: "oa1", conversation_id: "c1" }, { account_id: "oa2", conversation_id: "c1" }], "c1")).toBeNull();
  });
});
