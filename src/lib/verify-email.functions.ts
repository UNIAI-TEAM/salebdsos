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
    serverTime: string;
    nextCheckAt: string;
    pollSeconds: number;
    user?: {
      email: string;
      username: string | null;
      fullName: string | null;
      createdAt: string | null;
      lastSignInAt: string | null;
    } | null;
  }> => {
    const POLL_SECONDS = 5;
    const now = new Date();
    const serverTime = now.toISOString();
    const nextCheckAt = new Date(now.getTime() + POLL_SECONDS * 1000).toISOString();
    const base = { serverTime, nextCheckAt, pollSeconds: POLL_SECONDS };
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const email = data.email.toLowerCase();
      let page = 1;
      const perPage = 200;
      for (let i = 0; i < 25; i++) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) return { ...base, status: "error", confirmedAt: null, message: error.message };
        const u = list.users.find((x) => (x.email ?? "").toLowerCase() === email);
        if (u) {
          const confirmedAt = u.email_confirmed_at ?? (u as any).confirmed_at ?? null;
          const meta = (u.user_metadata ?? {}) as Record<string, any>;
          return {
            ...base,
            status: confirmedAt ? "verified" : "pending",
            confirmedAt,
            user: {
              email: u.email ?? email,
              username: meta.username ?? meta.user_name ?? null,
              fullName: meta.full_name ?? meta.name ?? null,
              createdAt: u.created_at ?? null,
              lastSignInAt: u.last_sign_in_at ?? null,
            },
          };
        }
        if (list.users.length < perPage) break;
        page += 1;
      }
      return { ...base, status: "not_found", confirmedAt: null, user: null };
    } catch (e: any) {
      return { ...base, status: "error", confirmedAt: null, message: e?.message ?? "Unknown error" };
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
    const MIN_INTERVAL_SEC = 45;
    const HOURLY_LIMIT = 5;
    const IP_HOURLY_LIMIT = 20;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const email = data.email.toLowerCase();

      let ip: string | null = null;
      try {
        const { getRequestHeader } = await import("@tanstack/react-start/server");
        const fwd = getRequestHeader("x-forwarded-for") ?? getRequestHeader("cf-connecting-ip") ?? "";
        ip = (fwd.split(",")[0] || "").trim() || null;
      } catch {}

      const now = Date.now();
      const sinceHour = new Date(now - 60 * 60 * 1000).toISOString();

      const { data: emailRows, error: qErr } = await supabaseAdmin
        .from("verification_resend_log")
        .select("sent_at")
        .eq("email", email)
        .gte("sent_at", sinceHour)
        .order("sent_at", { ascending: false })
        .limit(HOURLY_LIMIT);
      if (qErr) return { ok: false as const, message: qErr.message };

      if (emailRows && emailRows.length > 0) {
        const last = new Date(emailRows[0].sent_at).getTime();
        const waitSec = Math.ceil((MIN_INTERVAL_SEC * 1000 - (now - last)) / 1000);
        if (waitSec > 0) {
          return { ok: false as const, retryAfter: waitSec, message: `Vui lòng đợi ${waitSec}s trước khi gửi lại.` };
        }
        if (emailRows.length >= HOURLY_LIMIT) {
          const oldest = new Date(emailRows[emailRows.length - 1].sent_at).getTime();
          const retry = Math.ceil((60 * 60 * 1000 - (now - oldest)) / 1000);
          return { ok: false as const, retryAfter: retry, message: `Đã đạt giới hạn ${HOURLY_LIMIT} email/giờ. Thử lại sau ${Math.ceil(retry / 60)} phút.` };
        }
      }

      if (ip) {
        const { count: ipCount } = await supabaseAdmin
          .from("verification_resend_log")
          .select("id", { count: "exact", head: true })
          .eq("ip", ip)
          .gte("sent_at", sinceHour);
        if ((ipCount ?? 0) >= IP_HOURLY_LIMIT) {
          return { ok: false as const, retryAfter: 3600, message: "Quá nhiều yêu cầu từ địa chỉ này. Thử lại sau." };
        }
      }

      const { error } = await supabaseAdmin.auth.resend({
        type: "signup",
        email,
        options: data.redirectTo ? { emailRedirectTo: data.redirectTo } : undefined,
      });
      if (error) return { ok: false as const, message: error.message };

      await supabaseAdmin.from("verification_resend_log").insert({ email, ip });
      return { ok: true as const, minIntervalSec: MIN_INTERVAL_SEC };
    } catch (e: any) {
      return { ok: false as const, message: e?.message ?? "Unknown error" };
    }
  });
