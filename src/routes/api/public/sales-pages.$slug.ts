// Public lead capture from a published AI sales page: POST /api/public/sales-pages/<slug>
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const str = (v: unknown, max = 300) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export const Route = createFileRoute("/api/public/sales-pages/$slug")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Dữ liệu không hợp lệ." }, 400);
        }

        const full_name = str(body["full_name"], 200);
        const phone = str(body["phone"], 40);
        const email = str(body["email"], 200);
        if (!full_name) return json({ error: "Vui lòng nhập họ tên." }, 400);
        if (!phone) return json({ error: "Vui lòng nhập số điện thoại." }, 400);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          return json({ error: "Email không hợp lệ." }, 400);

        const { data: page } = await supabaseAdmin
          .from("ai_sales_pages")
          .select("id,tenant_id,project_id,owner_user_id")
          .eq("slug", params.slug)
          .eq("is_published", true)
          .is("deleted_at", null)
          .maybeSingle();
        if (!page) return json({ error: "Trang không tồn tại." }, 404);

        const { error } = await supabaseAdmin.from("leads").insert({
          tenant_id: page.tenant_id,
          project_id: page.project_id,
          owner_user_id: page.owner_user_id,
          full_name,
          phone,
          email,
          source: "Landing Page",
          status: "new",
          meta: { sales_page_id: page.id, sales_page_slug: params.slug },
        });
        if (error) {
          console.error("[sales-page] lead insert", error.message);
          return json({ error: "Không gửi được, vui lòng thử lại." }, 500);
        }
        return json({ ok: true });
      },
    },
  },
});
