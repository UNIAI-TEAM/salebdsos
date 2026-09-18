// Chat khách trên landing dự án: POST gửi tin, GET lấy tin mới
// URL: /api/public/chat/<slug landing>?visitor=<key>
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { appendMessage, loadChannelSettings } from "@/lib/channels.server";
import { assignLeadOwner } from "@/lib/lead-routing.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const str = (value: unknown, max = 300) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

async function loadPage(slug: string) {
  const { data } = await supabaseAdmin
    .from("ai_sales_pages")
    .select("id, tenant_id, project_id, owner_user_id, is_published, deleted_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || !data.is_published || data.deleted_at) return null;
  return data;
}

export const Route = createFileRoute("/api/public/chat/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const visitor = str(url.searchParams.get("visitor"), 80);
        const page = await loadPage(params.slug);
        if (!page) return json({ error: "Trang không tồn tại." }, 404);
        const settings = await loadChannelSettings(page.tenant_id);
        if (!visitor)
          return json({ enabled: settings.webChat.enabled, config: settings.webChat, messages: [] });

        const { data: conv } = await supabaseAdmin
          .from("conversations")
          .select("id")
          .eq("tenant_id", page.tenant_id)
          .eq("visitor_key", visitor)
          .maybeSingle();
        if (!conv)
          return json({ enabled: settings.webChat.enabled, config: settings.webChat, messages: [] });

        const { data: messages } = await supabaseAdmin
          .from("conversation_messages")
          .select("id, direction, body, sender_name, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(100);

        return json({
          enabled: settings.webChat.enabled,
          config: settings.webChat,
          messages: messages ?? [],
        });
      },

      POST: async ({ request, params }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Dữ liệu không hợp lệ." }, 400);
        }

        const page = await loadPage(params.slug);
        if (!page) return json({ error: "Trang không tồn tại." }, 404);

        const settings = await loadChannelSettings(page.tenant_id);
        if (!settings.webChat.enabled) return json({ error: "Kênh chat đang tắt." }, 403);

        const visitor = str(body["visitor"], 80);
        const text = str(body["text"], 1000);
        const name = str(body["name"], 120);
        const phone = str(body["phone"], 40);
        if (!visitor) return json({ error: "Thiếu mã phiên." }, 400);
        if (!text) return json({ error: "Vui lòng nhập nội dung." }, 400);

        const { data: existing } = await supabaseAdmin
          .from("conversations")
          .select("id, contact_name, contact_phone, lead_id")
          .eq("tenant_id", page.tenant_id)
          .eq("visitor_key", visitor)
          .maybeSingle();

        let conversationId = existing?.id ?? null;
        if (!conversationId) {
          const assignment = await assignLeadOwner({
            tenantId: page.tenant_id,
            projectId: page.project_id,
            currentOwnerId: page.owner_user_id,
          });
          const { data: created, error } = await supabaseAdmin
            .from("conversations")
            .insert({
              tenant_id: page.tenant_id,
              project_id: page.project_id,
              owner_user_id: assignment.ownerUserId,
              channel: "web_chat",
              visitor_key: visitor,
              contact_name: name,
              contact_phone: phone,
              last_message_preview: text.slice(0, 160),
            } as never)
            .select("id")
            .single();
          if (error) return json({ error: "Không mở được hội thoại." }, 500);
          conversationId = created.id;

          await supabaseAdmin.from("notifications").insert({
            tenant_id: page.tenant_id,
            user_id: assignment.ownerUserId,
            title: "Khách đang chat trên landing dự án",
            body: text.slice(0, 200),
            kind: "info",
          } as never);
        } else if ((name && !existing?.contact_name) || (phone && !existing?.contact_phone)) {
          await supabaseAdmin
            .from("conversations")
            .update({
              contact_name: name ?? existing?.contact_name ?? null,
              contact_phone: phone ?? existing?.contact_phone ?? null,
            } as never)
            .eq("id", conversationId);
        }

        await appendMessage({
          tenantId: page.tenant_id,
          conversationId,
          channel: "web_chat",
          direction: "in",
          body: text,
          senderName: name ?? "Khách",
        });

        return json({ ok: true, conversationId });
      },
    },
  },
});
