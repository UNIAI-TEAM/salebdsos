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

const DEFAULT_STAGES = [
  { name: "Mới", position: 0, win_probability: 5 },
  { name: "Đã liên hệ", position: 1, win_probability: 15 },
  { name: "Đang tư vấn", position: 2, win_probability: 35 },
  { name: "Đã báo giá", position: 3, win_probability: 55 },
  { name: "Đặt cọc", position: 4, win_probability: 80 },
  { name: "Thành công", position: 5, win_probability: 100 },
  { name: "Thất bại", position: 6, win_probability: 0 },
];

async function firstStageId(tenantId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("pipeline_stages")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (data?.id) return data.id;
  const { data: seeded } = await supabaseAdmin
    .from("pipeline_stages")
    .insert(DEFAULT_STAGES.map((s) => ({ ...s, tenant_id: tenantId })))
    .select("id,position");
  const sorted = (seeded ?? []).sort((a: any, b: any) => a.position - b.position);
  return sorted[0]?.id ?? null;
}

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
        const need_type = str(body["need_type"], 60);
        const budget = str(body["budget"], 60);
        const timeline = str(body["timeline"], 60);
        const note = str(body["note"], 1000);
        if (!full_name) return json({ error: "Vui lòng nhập họ tên." }, 400);
        if (!phone) return json({ error: "Vui lòng nhập số điện thoại." }, 400);
        if (!/^[0-9+()\s.-]{8,20}$/.test(phone))
          return json({ error: "Số điện thoại không hợp lệ." }, 400);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          return json({ error: "Email không hợp lệ." }, 400);

        const { data: page } = await supabaseAdmin
          .from("ai_sales_pages")
          .select("id,tenant_id,project_id,owner_user_id,title")
          .eq("slug", params.slug)
          .eq("is_published", true)
          .is("deleted_at", null)
          .maybeSingle();
        if (!page) return json({ error: "Trang không tồn tại." }, 404);

        const { data: lead, error } = await supabaseAdmin
          .from("leads")
          .insert({
            tenant_id: page.tenant_id,
            project_id: page.project_id,
            owner_user_id: page.owner_user_id,
            full_name,
            phone,
            email,
            need_type,
            budget,
            timeline,
            notes: note,
            source: "Landing Page",
            status: "new",
            tags: ["landing"],
            meta: { sales_page_id: page.id, sales_page_slug: params.slug },
          })
          .select("id")
          .single();
        if (error || !lead) {
          console.error("[sales-page] lead insert", error?.message);
          return json({ error: "Không gửi được, vui lòng thử lại." }, 500);
        }

        // Timeline: ghi nhận nguồn gốc lead
        const { error: aErr } = await supabaseAdmin.from("audit_logs").insert({
          tenant_id: page.tenant_id,
          action: "landing_submit",
          entity: "lead",
          entity_id: lead.id,
          diff: {
            source: "Landing Page",
            sales_page_slug: params.slug,
            sales_page_title: page.title,
            need_type,
            budget,
            timeline,
            note,
          },
          user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
        });
        if (aErr) console.error("[sales-page] timeline", aErr.message);

        // Pipeline: tạo deal ở giai đoạn đầu tiên
        try {
          const stage_id = await firstStageId(page.tenant_id);
          if (stage_id) {
            await supabaseAdmin.from("pipeline_deals").insert({
              tenant_id: page.tenant_id,
              stage_id,
              lead_id: lead.id,
              project_id: page.project_id,
              owner_user_id: page.owner_user_id,
              title: `${full_name} · ${page.title || "Landing"}`,
              status: "open",
              next_action: "Gọi tư vấn lần đầu",
              meta: { source: "landing", sales_page_slug: params.slug },
            });
          }
        } catch (e) {
          console.error("[sales-page] deal", e instanceof Error ? e.message : e);
        }

        // Ghi nhận chuyển đổi theo ngày để vẽ biểu đồ
        const { error: bErr } = await supabaseAdmin.rpc("bump_sales_page_conversion", {
          _page_id: page.id,
          _tenant_id: page.tenant_id,
        });
        if (bErr) console.error("[sales-page] conversion", bErr.message);

        return json({ ok: true });
      },
    },
  },
});
