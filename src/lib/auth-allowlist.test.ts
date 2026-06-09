import { describe, it, expect } from "vitest";
import { isEmailAllowed, buildGoogleExtraParams } from "./auth-allowlist";

describe("isEmailAllowed", () => {
  it("allows anything when enforcement is off", () => {
    expect(isEmailAllowed("x@anywhere.com", { allowed_email_domains: [], enforce_domain_allowlist: false })).toBe(true);
    expect(isEmailAllowed("x@anywhere.com", { allowed_email_domains: ["congty.vn"], enforce_domain_allowlist: false })).toBe(true);
  });

  it("blocks all when enforcement on but list empty", () => {
    expect(isEmailAllowed("x@congty.vn", { allowed_email_domains: [], enforce_domain_allowlist: true })).toBe(false);
  });

  it("allows only listed domains when enforced", () => {
    const cfg = { allowed_email_domains: ["congty.vn", "partner.com"], enforce_domain_allowlist: true };
    expect(isEmailAllowed("a@congty.vn", cfg)).toBe(true);
    expect(isEmailAllowed("a@PARTNER.com", cfg)).toBe(true);
    expect(isEmailAllowed("a@other.com", cfg)).toBe(false);
  });

  it("rejects malformed emails", () => {
    const cfg = { allowed_email_domains: ["congty.vn"], enforce_domain_allowlist: true };
    expect(isEmailAllowed("noatsign", cfg)).toBe(false);
    expect(isEmailAllowed("a@", cfg)).toBe(false);
  });
});

describe("buildGoogleExtraParams", () => {
  const base = { prompt: "select_account" };

  it("does NOT add hd when enforcement is off", () => {
    const out = buildGoogleExtraParams(base, { allowed_email_domains: ["congty.vn"], enforce_domain_allowlist: false });
    expect(out.hd).toBeUndefined();
    expect(out.prompt).toBe("select_account");
  });

  it("does NOT add hd when list is empty even if enforced", () => {
    const out = buildGoogleExtraParams(base, { allowed_email_domains: [], enforce_domain_allowlist: true });
    expect(out.hd).toBeUndefined();
  });

  it("adds hd ONLY when enforced and exactly 1 domain", () => {
    const out = buildGoogleExtraParams(base, { allowed_email_domains: ["congty.vn"], enforce_domain_allowlist: true });
    expect(out.hd).toBe("congty.vn");
  });

  it("does NOT add hd when 2+ domains (multi-tenant orgs)", () => {
    const out = buildGoogleExtraParams(base, {
      allowed_email_domains: ["congty.vn", "partner.com"],
      enforce_domain_allowlist: true,
    });
    expect(out.hd).toBeUndefined();
  });

  it("does not mutate the base object", () => {
    const b = { prompt: "select_account" };
    buildGoogleExtraParams(b, { allowed_email_domains: ["x.vn"], enforce_domain_allowlist: true });
    expect(b).toEqual({ prompt: "select_account" });
  });
});
