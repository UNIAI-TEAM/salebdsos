/**
 * Orchestrators for sign-in flows. Pure / DI-friendly so we can E2E-test
 * the allowlist + Google `hd` behavior without a real browser or Google.
 */
import { isEmailAllowed, buildGoogleExtraParams, type AllowlistConfig } from "./auth-allowlist";

export type OAuthResult =
  | { redirected: true; error?: undefined }
  | { redirected?: false; error?: { message: string } | null; tokens?: unknown };

export type GoogleSignInFn = (
  provider: "google",
  opts: { redirect_uri: string; extraParams: Record<string, string> },
) => Promise<OAuthResult>;

export type PasswordSignInFn = (args: {
  email: string;
  password: string;
}) => Promise<{ error: { message: string } | null }>;

export async function signInWithGoogleFlow(deps: {
  fetchAllowlist: () => Promise<AllowlistConfig>;
  signInWithOAuth: GoogleSignInFn;
  redirectUri: string;
}): Promise<{ ok: boolean; redirected?: boolean; error?: string; extraParams: Record<string, string> }> {
  const cfg = await deps.fetchAllowlist();
  const extraParams = buildGoogleExtraParams({ prompt: "select_account" }, cfg);
  const result = await deps.signInWithOAuth("google", {
    redirect_uri: deps.redirectUri,
    extraParams,
  });
  if (result.error) return { ok: false, error: result.error.message, extraParams };
  return { ok: true, redirected: !!result.redirected, extraParams };
}

export async function signInWithPasswordFlow(deps: {
  email: string;
  password: string;
  fetchAllowlist: () => Promise<AllowlistConfig>;
  signInWithPassword: PasswordSignInFn;
}): Promise<{ ok: boolean; error?: string; calledSupabase: boolean }> {
  const cfg = await deps.fetchAllowlist();
  if (!isEmailAllowed(deps.email, cfg)) {
    return { ok: false, error: "Email không thuộc domain được phép đăng nhập.", calledSupabase: false };
  }
  const { error } = await deps.signInWithPassword({ email: deps.email, password: deps.password });
  if (error) return { ok: false, error: error.message, calledSupabase: true };
  return { ok: true, calledSupabase: true };
}
