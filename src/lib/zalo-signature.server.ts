import { createHash, timingSafeEqual } from "crypto";

/** Accept Zalo's documented mac = notation without weakening the digest check. */
export function verifyZaloSignature(actual: string, raw: string, appId: string, timestamp: string, secret: string) {
  const match = /^mac\s*=\s*([a-f0-9]{64})$/i.exec(actual.trim());
  if (!match) return false;
  const received = Buffer.from(match[1], "hex");
  const expected = createHash("sha256").update(appId + raw + timestamp + secret).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}