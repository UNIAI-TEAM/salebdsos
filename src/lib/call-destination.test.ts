import { describe, expect, it } from "vitest";
import { matchedCallPhone } from "./call-destination";
describe("Call destination identity", () => {
  it("accepts the same complete customer number in local or country-code form", () => {
    expect(matchedCallPhone("+84 901 234 567", ["0901234567"])).toBe("0901234567");
  });
  it("rejects arbitrary numbers sharing only the customer number suffix", () => {
    for (const number of ["+199901234567", "1901234567", "0901234567;123"]) expect(() => matchedCallPhone(number, ["0901234567"])).toThrow();
  });
  it("rejects numbers missing from accessible customer records", () => {
    expect(() => matchedCallPhone("0901234567", ["0907654321"])).toThrow();
  });
});