import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyZaloSignature } from "./zalo-signature.server";

describe("Zalo signature verification", () => {
  const raw = '{"event_name":"user_send_text","timestamp":"1793244000000"}';
  const app = "123456", timestamp = "1793244000000", fixtureSecret = "synthetic-test-only";
  const digest = createHash("sha256").update(app + raw + timestamp + fixtureSecret).digest("hex");
  it("accepts both mac= and documented mac = header formatting", () => {
    expect(verifyZaloSignature(`mac=${digest}`, raw, app, timestamp, fixtureSecret)).toBe(true);
    expect(verifyZaloSignature(`mac = ${digest}`, raw, app, timestamp, fixtureSecret)).toBe(true);
  });
  it("rejects tampering and missing or malformed signatures", () => {
    expect(verifyZaloSignature(`mac=${digest}`, raw + " ", app, timestamp, fixtureSecret)).toBe(false);
    expect(verifyZaloSignature(`mac=${digest}`, raw, app, timestamp, "different-test-key")).toBe(false);
    expect(verifyZaloSignature("", raw, app, timestamp, fixtureSecret)).toBe(false);
    expect(verifyZaloSignature("mac=invalid", raw, app, timestamp, fixtureSecret)).toBe(false);
  });
});