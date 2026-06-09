import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAuthSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("auth_settings")
      .select("allowed_email_domains, google_oauth_mode, enforce_domain_allowlist, updated_at")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? {
      allowed_email_domains: [] as string[],
      google_oauth_mode: "managed" as "managed" | "custom",
      enforce_domain_allowlist: false,
      updated_at: null as string | null,
    };
  });

const domainRe = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export const updateAuthSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    allowed_email_domains: string[];
    google_oauth_mode: "managed" | "custom";
    enforce_domain_allowlist: boolean;
  }) =>
    z.object({
      allowed_email_domains: z.array(z.string().toLowerCase().regex(domainRe, "Domain không hợp lệ")).max(100),
      google_oauth_mode: z.enum(["managed", "custom"]),
      enforce_domain_allowlist: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Verify caller is platform admin
    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "platform_admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Forbidden: chỉ platform admin");

    const domains = Array.from(new Set(data.allowed_email_domains.map((d) => d.trim().toLowerCase()).filter(Boolean)));
    const { error } = await supabaseAdmin
      .from("auth_settings")
      .update({
        allowed_email_domains: domains,
        google_oauth_mode: data.google_oauth_mode,
        enforce_domain_allowlist: data.enforce_domain_allowlist,
        updated_by: context.userId,
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public-readable for login enforcement (no auth required). */
export const getPublicAllowlist = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("auth_settings")
    .select("allowed_email_domains, enforce_domain_allowlist")
    .eq("id", true)
    .maybeSingle();
  return {
    allowed_email_domains: (data?.allowed_email_domains ?? []) as string[],
    enforce_domain_allowlist: !!data?.enforce_domain_allowlist,
  };
});
