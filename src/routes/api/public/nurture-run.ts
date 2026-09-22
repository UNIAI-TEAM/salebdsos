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
        const secret = process.env["NURTURE_CRON_SECRET"];
        if (secret && request.headers.get("x-cron-secret") !== secret) {
          return json({ error: "Không có quyền gọi." }, 401);
        }

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
