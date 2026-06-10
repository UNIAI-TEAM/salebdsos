import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type VerifyStatus = "pending" | "verified" | "not_found" | "error";

export const checkEmailVerification = createServerFn({ method: "GET" })
  .inputValidator((d: { email: string }) =>
    z.object({ email: z.string().email().max(254) }).parse(d),
  )
  .handler(async ({ data }): Promise<{
    status: VerifyStatus;
    confirmedAt: string | null;
    message?: string;
  }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const email = data.email.toLowerCase();
      // Page through admin.listUsers to find this email (small projects)
      let page = 1;
      const perPage = 200;
      // Safety cap
      for (let i = 0; i < 25; i++) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (error) return { status: "error", confirmedAt: null, message: error.message };
        const u = list.users.find((x) => (x.email ?? "").toLowerCase() === email);
        if (u) {
          const confirmedAt = u.email_confirmed_at ?? (u as any).confirmed_at ?? null;
          return {
            status: confirmedAt ? "verified" : "pending",
            confirmedAt,
          };
        }
        if (list.users.length < perPage) break;
        page += 1;
      }
      return { status: "not_found", confirmedAt: null };
    } catch (e: any) {
      return { status: "error", confirmedAt: null, message: e?.message ?? "Unknown error" };
    }
  });

export const resendVerificationEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; redirectTo?: string }) =>
    z.object({
      email: z.string().email().max(254),
      redirectTo: z.string().url().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.auth.resend({
        type: "signup",
        email: data.email.toLowerCase(),
        options: data.redirectTo ? { emailRedirectTo: data.redirectTo } : undefined,
      });
      if (error) return { ok: false as const, message: error.message };
      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, message: e?.message ?? "Unknown error" };
    }
  });
