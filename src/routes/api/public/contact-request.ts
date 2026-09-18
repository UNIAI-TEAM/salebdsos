// Khách yêu cầu liên hệ từ landing dự án hoặc danh thiếp số:
// tạo khách trong hệ thống, mở hội thoại, chia cho Sale theo luật phân phối,
// và gửi tin xác nhận qua SMS brandname / email khi kênh đã bật.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { appendMessage, loadChannelSettings, sendEmailMessage, sendSmsMessage } from "@/lib/channels.server";
import { assignLeadOwner } from "@/lib/lead-routing.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const str = (value: unknown, max = 200) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

const CHANNEL_LABEL: Record<string, string> = {
  call: "gọi lại",
  zalo: "nhắn Zalo",
  sms: "gửi SMS",
  email: "gửi email",
};

type Source =
  | { tenantId: string; projectId: string | null; ownerUserId: string | null; label: string; cardId: string | null };

async function resolveSource(kind: string, slug: string): Promise<Source | null> {
  if (kind === "card") {
    const { data } = await supabaseAdmin
      .from("cards")
      .select("id, tenant_id, owner_user_id, display_name")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return null;
    return {
      tenantId: data.tenant_id as string,
      projectId: null,
      ownerUserId: (data.owner_user_id as string | null) ?? null,
      label: `danh thiếp ${data.display_name ?? ""}`.trim(),
      cardId: data.id as string,
    };
  }
  const { data } = await supabaseAdmin
    .from("ai_sales_pages")
    .select("id, tenant_id, project_id, owner_user_id, title, is_published, deleted_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || !data.is_published || data.deleted_at) return null;
  return {
    tenantId: data.tenant_id as string,
    projectId: (data.project_id as string | null) ?? null,
    ownerUserId: (data.owner_user_id as string | null) ?? null,
    label: `trang dự án ${data.title ?? ""}`.trim(),
    cardId: null,
  };
}

export const Route = createFileRoute("/api/public/contact-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Dữ liệu không hợp lệ." }, 400);
        }

        const kind = str(body["kind"], 10) === "card" ? "card" : "page";
        const slug = str(body["slug"], 90);
        const name = str(body["name"], 120);
        const phone = str(body["phone"], 40);
        const email = str(body["email"], 160);
        const note = str(body["note"], 600);
        const channel = ["call", "zalo", "sms", "email"].includes(String(body["channel"]))
          ? (body["channel"] as string)
          : "call";

        if (!slug) return json({ error: "Thiếu mã trang." }, 400);
        if (!phone && !email) return json({ error: "Vui lòng để lại số điện thoại hoặc email." }, 400);

        const source = await resolveSource(kind, slug);
        if (!source) return json({ error: "Không tìm thấy trang." }, 404);

        const settings = await loadChannelSettings(source.tenantId);
        const assignment = await assignLeadOwner({
          tenantId: source.tenantId,
          projectId: source.projectId,
          currentOwnerId: source.ownerUserId,
        });

        const requestText = `Khách muốn được ${CHANNEL_LABEL[channel]}${note ? `: ${note}` : "."}`;

        // Khách trong hệ thống
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .insert({
            tenant_id: source.tenantId,
            project_id: source.projectId,
            owner_user_id: assignment.ownerUserId,
            card_id: source.cardId,
            full_name: name ?? "Khách để lại liên hệ",
            phone,
            email,
            notes: note,
            source: kind === "card" ? "digital_card" : "landing",
            status: "new",
            meta: {
              preferred_channel: channel,
              auto_assigned: assignment.autoAssigned,
              sla_minutes: assignment.slaMinutes,
              sla_due_at: assignment.slaDueAt,
            },
          } as never)
          .select("id")
          .single();

        // Hội thoại gộp theo khách
        const { data: conversation } = await supabaseAdmin
          .from("conversations")
          .insert({
            tenant_id: source.tenantId,
            project_id: source.projectId,
            card_id: source.cardId,
            lead_id: lead?.id ?? null,
            owner_user_id: assignment.ownerUserId,
            channel: channel === "zalo" ? "zalo" : channel === "email" ? "email" : channel === "sms" ? "sms" : "call",
            contact_name: name,
            contact_phone: phone,
            last_message_preview: requestText.slice(0, 160),
          } as never)
          .select("id")
          .single();

        if (conversation?.id) {
          await appendMessage({
            tenantId: source.tenantId,
            conversationId: conversation.id as string,
            channel: "note",
            direction: "in",
            body: `${requestText} (từ ${source.label})`,
            senderName: name ?? "Khách",
          });
        }

        if (assignment.ownerUserId) {
          await supabaseAdmin.from("notifications").insert({
            tenant_id: source.tenantId,
            user_id: assignment.ownerUserId,
            title: `Khách yêu cầu ${CHANNEL_LABEL[channel]}`,
            body: `${name ?? "Khách"}${phone ? ` · ${phone}` : ""} — liên hệ trong ${assignment.slaMinutes} phút`,
            kind: "warning",
          } as never);
        }

        // Xác nhận tự động cho khách
        const warnings: string[] = [];
        if (settings.sms.enabled && phone) {
          const text = (settings.sms.template || "").replace("{brand}", settings.sms.brandname || "SaleBDS");
          const result = await sendSmsMessage({ settings, phone, text });
          if (result.error) warnings.push(result.error);
          if (conversation?.id) {
            await appendMessage({
              tenantId: source.tenantId,
              conversationId: conversation.id as string,
              channel: "sms",
              direction: "out",
              body: text,
              senderName: settings.sms.brandname || "SMS tự động",
              deliveryStatus: result.status,
              errorMessage: result.error,
              externalId: result.externalId,
            });
          }
        }
        if (settings.email.enabled && settings.email.autoConfirm && email) {
          const text = `Cảm ơn ${name ?? "anh/chị"} đã quan tâm. Chuyên viên sẽ liên hệ trong ${assignment.slaMinutes} phút.`;
          const result = await sendEmailMessage({
            settings,
            to: email,
            subject: "Đã nhận yêu cầu tư vấn",
            text,
            origin: new URL(request.url).origin,
          });
          if (result.error) warnings.push(result.error);
          if (conversation?.id) {
            await appendMessage({
              tenantId: source.tenantId,
              conversationId: conversation.id as string,
              channel: "email",
              direction: "out",
              body: text,
              senderName: settings.email.senderName || "Email tự động",
              deliveryStatus: result.status,
              errorMessage: result.error,
            });
          }
        }

        return json({
          ok: true,
          slaMinutes: assignment.slaMinutes,
          zaloLink: settings.zalo.enabled ? settings.zalo.oaLink || null : null,
          warnings,
        });
      },
    },
  },
});
