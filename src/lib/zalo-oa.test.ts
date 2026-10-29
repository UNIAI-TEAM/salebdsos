import { describe, expect, it } from "vitest";
import { canRunAutomation, canSend, displayStatus, needsRefresh, oaConnectionSummary, parseZaloWebhook, pickReplyIdentity, webhookFresh } from "./zalo-oa";

const now = new Date("2026-10-29T00:00:00Z");

describe("zalo oa rules", () => {
  it("multi-OA connection is verified only after an authenticated webhook", () => {
    expect(oaConnectionSummary([{ status: "connected", last_webhook_at: null }])).toEqual({ configured: true, enabled: true, verified: false });
    expect(oaConnectionSummary([{ status: "connected", last_webhook_at: now.toISOString() }])).toEqual({ configured: true, enabled: true, verified: true });
    expect(oaConnectionSummary([{ status: "expired", last_webhook_at: now.toISOString() }]).verified).toBe(false);
    expect(oaConnectionSummary([{ status: "disconnected", last_webhook_at: now.toISOString() }]).enabled).toBe(false);
  });
  it("preserves the real OA and sender IDs without rounding", () => {
    expect(parseZaloWebhook('{"oa_id":2788520716563342888,"sender":{"id":2788520716563342889},"timestamp":1793244000000}')).toEqual({ oa_id: "2788520716563342888", sender: { id: "2788520716563342889" }, timestamp: 1793244000000 });
  });
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

import { attachmentKind, isTransientSendError, zaloWindow } from "./zalo-oa";
describe("zalo window, retry, attachments", () => {
  const t = Date.parse("2026-10-29T00:00:00Z");
  it("send window lasts 168 hours after the last customer message and warns in the last 12 hours", () => {
    expect(zaloWindow("2026-10-22T01:00:00Z", t)).toMatchObject({ open: true, warn: true });
    expect(zaloWindow("2026-10-27T00:00:00Z", t)).toMatchObject({ open: true, warn: false });
    expect(zaloWindow("2026-10-21T23:00:00Z", t).open).toBe(false);
    expect(zaloWindow(null, t).open).toBe(false);
  });
  it("retries only network, 5xx and rate-limit errors", () => {
    expect(isTransientSendError(null)).toBe(true);
    expect(isTransientSendError(503)).toBe(true);
    expect(isTransientSendError(429)).toBe(true);
    expect(isTransientSendError(200, -32)).toBe(true);
    expect(isTransientSendError(200, -230)).toBe(false);
    expect(isTransientSendError(400)).toBe(false);
  });
  it("accepts JPG/PNG up to 1MB and PDF/DOC up to 5MB", () => {
    expect(attachmentKind("image/png", 900_000)).toEqual({ kind: "image" });
    expect("error" in attachmentKind("image/png", 1_200_000)).toBe(true);
    expect(attachmentKind("application/pdf", 4_000_000)).toEqual({ kind: "file" });
    expect("error" in attachmentKind("application/pdf", 6_000_000)).toBe(true);
    expect("error" in attachmentKind("image/gif", 100)).toBe(true);
  });
});
