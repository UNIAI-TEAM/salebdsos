import { createFileRoute } from "@tanstack/react-router";

// Cron mỗi giờ: làm mới trước các OA hết hạn trong 75 phút tới (gửi tin cũng tự làm mới khi cần). Chỉ làm mới các OA sắp hết hạn access token (idempotent, có khóa theo OA). Không trả dữ liệu.
export const Route = createFileRoute("/api/public/zalo/refresh-tokens")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!request.headers.get("authorization")?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
        const { refreshOa } = await import("@/lib/zalo-oa.server");
        const soon = new Date(Date.now() + 75 * 60_000).toISOString();
        const { data } = await sb.from("zalo_oa_accounts").select("id").in("status", ["connected", "paused", "webhook_error"]).lte("token_expires_at", soon).limit(50);
        let ok = 0;
        for (const r of data ?? []) if (await refreshOa(r.id, true)) ok++;
        return Response.json({ checked: data?.length ?? 0, refreshed: ok });
      },
    },
  },
});
