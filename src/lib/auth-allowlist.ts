/**
 * Pure helpers for the auth domain allowlist + Google OAuth `hd` param.
 * Kept dependency-free so they can be unit-tested without DOM/network.
 */

export type AllowlistConfig = {
  allowed_email_domains: string[];
  enforce_domain_allowlist: boolean;
};

/** Returns true when the email is allowed to sign in under the given config. */
export function isEmailAllowed(email: string, cfg: AllowlistConfig): boolean {
  if (!cfg.enforce_domain_allowlist) return true;
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;
  const list = cfg.allowed_email_domains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return false; // enforce on + empty list = block all
  return list.includes(domain);
}

/**
 * Builds Google OAuth `extraParams`. `hd` is ONLY attached when the
 * allowlist is enforced AND contains exactly one domain — anything else
 * (disabled, 0, 2+ domains) must omit `hd` so multi-domain orgs still work.
 */
export function buildGoogleExtraParams(
  base: Record<string, string>,
  cfg: AllowlistConfig,
): Record<string, string> {
  const out: Record<string, string> = { ...base };
  if (cfg.enforce_domain_allowlist && cfg.allowed_email_domains.length === 1) {
    out.hd = cfg.allowed_email_domains[0];
  }
  return out;
}
