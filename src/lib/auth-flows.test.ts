import { describe, it, expect, vi } from "vitest";
import { signInWithGoogleFlow, signInWithPasswordFlow } from "./auth-flows";
import type { AllowlistConfig } from "./auth-allowlist";

const cfg = (enforce: boolean, domains: string[]): AllowlistConfig => ({
  enforce_domain_allowlist: enforce,
  allowed_email_domains: domains,
});

describe("E2E: Google OAuth + allowlist", () => {
  it("attaches hd ONLY when enforce=on and exactly 1 domain", async () => {
    const oauth = vi.fn().mockResolvedValue({ redirected: true });
    const res = await signInWithGoogleFlow({
      fetchAllowlist: async () => cfg(true, ["congty.vn"]),
      signInWithOAuth: oauth,
      redirectUri: "https://app.test/dashboard",
    });
    expect(res.ok).toBe(true);
    expect(res.redirected).toBe(true);
    expect(oauth).toHaveBeenCalledWith("google", {
      redirect_uri: "https://app.test/dashboard",
      extraParams: { prompt: "select_account", hd: "congty.vn" },
    });
  });

  it("omits hd when enforce=off (even with 1 domain configured)", async () => {
    const oauth = vi.fn().mockResolvedValue({ redirected: true });
    await signInWithGoogleFlow({
      fetchAllowlist: async () => cfg(false, ["congty.vn"]),
      signInWithOAuth: oauth,
      redirectUri: "https://app.test/",
    });
    const params = oauth.mock.calls[0][1].extraParams;
    expect(params.hd).toBeUndefined();
    expect(params.prompt).toBe("select_account");
  });

  it("omits hd when enforce=on but 2+ domains", async () => {
    const oauth = vi.fn().mockResolvedValue({ redirected: true });
    await signInWithGoogleFlow({
      fetchAllowlist: async () => cfg(true, ["a.vn", "b.com"]),
      signInWithOAuth: oauth,
      redirectUri: "https://app.test/",
    });
    expect(oauth.mock.calls[0][1].extraParams.hd).toBeUndefined();
  });

  it("omits hd when enforce=on but domain list empty", async () => {
    const oauth = vi.fn().mockResolvedValue({ redirected: true });
    await signInWithGoogleFlow({
      fetchAllowlist: async () => cfg(true, []),
      signInWithOAuth: oauth,
      redirectUri: "https://app.test/",
    });
    expect(oauth.mock.calls[0][1].extraParams.hd).toBeUndefined();
  });

  it("surfaces OAuth provider errors", async () => {
    const oauth = vi.fn().mockResolvedValue({ error: { message: "popup blocked" } });
    const res = await signInWithGoogleFlow({
      fetchAllowlist: async () => cfg(true, ["congty.vn"]),
      signInWithOAuth: oauth,
      redirectUri: "https://app.test/",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("popup blocked");
  });
});

describe("E2E: email/password + allowlist", () => {
  it("blocks disallowed domain BEFORE calling supabase", async () => {
    const signIn = vi.fn();
    const res = await signInWithPasswordFlow({
      email: "intruder@evil.com",
      password: "x",
      fetchAllowlist: async () => cfg(true, ["congty.vn"]),
      signInWithPassword: signIn,
    });
    expect(res.ok).toBe(false);
    expect(res.calledSupabase).toBe(false);
    expect(signIn).not.toHaveBeenCalled();
    expect(res.error).toMatch(/domain/i);
  });

  it("allows listed domain and calls supabase", async () => {
    const signIn = vi.fn().mockResolvedValue({ error: null });
    const res = await signInWithPasswordFlow({
      email: "user@congty.vn",
      password: "secret",
      fetchAllowlist: async () => cfg(true, ["congty.vn"]),
      signInWithPassword: signIn,
    });
    expect(res.ok).toBe(true);
    expect(signIn).toHaveBeenCalledWith({ email: "user@congty.vn", password: "secret" });
  });

  it("allows any domain when enforce=off", async () => {
    const signIn = vi.fn().mockResolvedValue({ error: null });
    const res = await signInWithPasswordFlow({
      email: "anyone@gmail.com",
      password: "p",
      fetchAllowlist: async () => cfg(false, ["congty.vn"]),
      signInWithPassword: signIn,
    });
    expect(res.ok).toBe(true);
    expect(signIn).toHaveBeenCalled();
  });

  it("blocks ALL when enforce=on and list empty", async () => {
    const signIn = vi.fn();
    const res = await signInWithPasswordFlow({
      email: "owner@congty.vn",
      password: "p",
      fetchAllowlist: async () => cfg(true, []),
      signInWithPassword: signIn,
    });
    expect(res.ok).toBe(false);
    expect(signIn).not.toHaveBeenCalled();
  });
});
