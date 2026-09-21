// Khách quét QR danh thiếp để lại thông tin: POST /api/public/card-leads/<slug>
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assignLeadOwner } from "@/lib/lead-routing.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const str = (v: unknown, max = 300) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export const Route = createFileRoute("/api/public/card-leads/$slug")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Dữ liệu không hợp lệ." }, 400);
        }

        const { data: card } = await supabaseAdmin
          .from("cards")
          .select("id, tenant_id, owner_user_id, display_name, is_published, deleted_at")
          .eq("slug", params.slug)
          .maybeSingle();
        if (!card || !card.is_published || card.deleted_at)
          return json({ error: "Danh thiếp không tồn tại." }, 404);

        const fullName = str(body["full_name"], 120);
        const phone = str(body["phone"], 40);
        const notes = str(body["notes"], 1000);
        let projectId = str(body["project_id"], 40);
        if (!fullName) return json({ error: "Vui lòng nhập họ tên." }, 400);
        if (!phone || phone.replace(/\D/g, "").length < 8)
          return json({ error: "Vui lòng nhập số điện thoại hợp lệ." }, 400);

        if (projectId) {
          const { data: linked } = await supabaseAdmin
            .from("card_projects")
            .select("project_id")
            .eq("card_id", card.id)
            .eq("project_id", projectId)
            .maybeSingle();
          if (!linked) projectId = null;
        }

        const assignment = await assignLeadOwner({
          tenantId: card.tenant_id,
          projectId: projectId,
          currentOwnerId: card.owner_user_id,
        });

        const { data: lead, error: leadErr } = await supabaseAdmin
          .from("leads")
          .insert({
            tenant_id: card.tenant_id,
            owner_user_id: assignment.ownerUserId,
            card_id: card.id,
            project_id: projectId,
            full_name: fullName,
            phone,
            notes,
            source: "QR danh thiếp",
            status: "new",
            meta: {
              card_slug: params.slug,
              sla_minutes: assignment.slaMinutes,
              sla_due_at: assignment.slaDueAt,
            },
          })
          .select("id")
          .single();
        if (leadErr) {
          console.error("[card-lead] insert", leadErr.message);
          return json({ error: "Không gửi được, vui lòng thử lại." }, 500);
        }

        const { error: nErr } = await supabaseAdmin.from("notifications").insert({
          tenant_id: card.tenant_id,
          user_id: assignment.ownerUserId,
          type: "lead_new",
          title: "Khách mới từ QR danh thiếp",
          body: [fullName, phone].filter(Boolean).join(" · "),
          link: `/leads?lead=${lead.id}`,
          lead_id: lead.id,
        });
        if (nErr) console.error("[card-lead] notification", nErr.message);

        {
          const { sendPushToUser } = await import("@/lib/push.server");
          await sendPushToUser({
            userId: assignment.ownerUserId,
            title: "Khách mới từ QR danh thiếp",
            body: [fullName, phone].filter(Boolean).join(" · ") || "Có khách để lại thông tin",
            link: `/leads?lead=${lead.id}`,
          });
        }

        await supabaseAdmin.from("interaction_events").insert({
          card_id: card.id,
          tenant_id: card.tenant_id,
          source: "qr_card_lead",
          user_agent: (request.headers.get("user-agent") || "").slice(0, 500),
          referrer: request.headers.get("referer"),
        });

        return json({ ok: true, message: "Cảm ơn bạn! Tôi sẽ liên hệ ngay." });
      },
    },
  },
});
