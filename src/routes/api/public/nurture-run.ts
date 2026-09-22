// Cron gọi quy trình nhắc khách tự động: POST /api/public/nurture-run
// Bảo vệ bằng khoá NURTURE_CRON_SECRET (header x-cron-secret) khi khoá đã được thiết lập.
import { createFileRoute } from "@tanstack/react-router";
import { runNurture } from "@/lib/nurture.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const Route = createFileRoute("/api/public/nurture-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-secret") ?? "";
        const envSecret = process.env["NURTURE_CRON_SECRET"];
        let allowed = Boolean(envSecret) && provided === envSecret;
        if (!allowed && provided) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await (supabaseAdmin as any)
            .from("cron_tokens")
            .select("token")
            .eq("name", "nurture_run")
            .maybeSingle();
          allowed = Boolean(data?.token) && data.token === provided;
        }
        if (!allowed) return json({ error: "Không có quyền gọi." }, 401);

        let origin: string | null = null;
        try {
          origin = new URL(request.url).origin;
        } catch {
          origin = null;
        }

        try {
          const result = await runNurture({ origin });
          return json(result);
        } catch (error) {
          console.error("nurture-run failed", error);
          return json({ ok: false, error: (error as Error).message }, 500);
        }
      },
    },
  },
});
