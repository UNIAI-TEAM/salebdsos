import { createFileRoute } from "@tanstack/react-router";

const page = (title: string, body: string, status = 200) =>
  new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui;max-width:480px;margin:64px auto;padding:0 16px;line-height:1.5"><h2>${title}</h2><p>${body}</p><p><a href="/integrations">Quay lại Tích hợp</a></p></body>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

// Zalo chuyển về đây sau khi admin đồng ý cấp quyền. Chỉ chấp nhận state đã tạo, còn hạn và dùng một lần.
export const Route = createFileRoute("/api/public/zalo/oauth-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const state = url.searchParams.get("state") ?? "", code = url.searchParams.get("code") ?? "";
        if (!/^[a-f0-9]{48}$/.test(state) || !code || code.length > 2000) return page("Không hợp lệ", "Liên kết cấp quyền không hợp lệ.", 400);
        try {
          const { completeOAuth } = await import("@/lib/zalo-oa.server");
          await completeOAuth(state, code, url.searchParams.get("oa_id"));
          return page("Đã kết nối Zalo OA", "Có thể đóng trang này và quay lại ứng dụng.");
        } catch (e) {
          return page("Chưa kết nối được", esc((e as Error).message), 400);
        }
      },
    },
  },
});
