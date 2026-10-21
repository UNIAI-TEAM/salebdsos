// Nhận tin nhắn từ Zalo OA: POST /api/public/zalo-webhook
// Xác thực bằng chữ ký X-ZEvent-Signature (mac = sha256(appId + data + timestamp + oaSecret))
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { appendMessage } from "@/lib/channels.server";
import { CHANNELS_KEY, parseChannelSettings } from "@/lib/channels";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const Route = createFileRoute("/api/public/zalo-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const secret = process.env["ZALO_OA_SECRET"];
        const appId = process.env["ZALO_APP_ID"];

        if (!secret || !appId) {
          // Chưa kết nối OA — không xử lý, nhưng không báo lỗi để Zalo không retry vô hạn.
          return json({ ok: true, skipped: "zalo_not_connected" });
        }

        const signature = request.headers.get("x-zevent-signature") ?? "";
        const timestamp = (() => {
          try {
            return String((JSON.parse(raw) as { timestamp?: string | number }).timestamp ?? "");
          } catch {
            return "";
          }
        })();
        const expected = `mac=${createHash("sha256").update(appId + raw + timestamp + secret).digest("hex")}`;
        if (signature !== expected) return json({ error: "Chữ ký không hợp lệ." }, 401);

        let payload: {
          event_name?: string;
          sender?: { id?: string };
          message?: { text?: string; msg_id?: string };
          oa_id?: string;
        };
        try {
          payload = JSON.parse(raw);
        } catch {
          return json({ error: "Dữ liệu không hợp lệ." }, 400);
        }

        if (payload.event_name !== "user_send_text" && payload.event_name !== "user_submit_info")
          return json({ ok: true, ignored: payload.event_name });

        const zaloUserId = payload.sender?.id;
        const info = (payload as any).info as { name?: string; phone?: string; address?: string } | undefined;
        const text = (
          payload.message?.text ??
          (info ? `Khách gửi thông tin: ${info.name ?? ""} ${info.phone ?? ""} ${info.address ?? ""}`.trim() : "")
        ).slice(0, 2000);
        if (!zaloUserId || !text) return json({ ok: true, ignored: "empty" });

        // Tìm workspace theo OA id đã cấu hình
        const { data: settingRows } = await supabaseAdmin
          .from("settings")
          .select("tenant_id,value")
          .eq("key", CHANNELS_KEY);
        const match = (settingRows ?? []).find((row) => {
          const config = parseChannelSettings(row.value);
          return config.zalo.enabled && config.zalo.oaId && config.zalo.oaId === payload.oa_id;
        });
        if (!match) return json({ ok: true, skipped: "oa_not_mapped" });

        const tenantId = match.tenant_id;
        const { data: existing } = await supabaseAdmin
          .from("conversations")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("contact_zalo_id", zaloUserId)
          .maybeSingle();

        let conversationId = existing?.id ?? null;
        if (!conversationId) {
          const { data: created, error } = await supabaseAdmin
            .from("conversations")
            .insert({
              tenant_id: tenantId,
              channel: "zalo",
              contact_zalo_id: zaloUserId,
              contact_name: "Khách Zalo",
              last_message_preview: text.slice(0, 160),
            } as never)
            .select("id")
            .single();
          if (error) return json({ error: "Không mở được hội thoại." }, 500);
          conversationId = created.id;
        }

        await appendMessage({
          tenantId,
          conversationId,
          channel: "zalo",
          direction: "in",
          body: text,
          senderName: "Khách Zalo",
          externalId: payload.message?.msg_id ?? null,
        });

        // Khách nhắn kèm số điện thoại / gửi form thông tin trên Zalo → tự tạo khách & chia Sale.
        try {
          const { extractVnPhone, parseIntegrationSettings, INTEGRATIONS_KEY } = await import("@/lib/integrations");
          const { data: integ } = await supabaseAdmin
            .from("settings").select("value").eq("tenant_id", tenantId).eq("key", INTEGRATIONS_KEY).maybeSingle();
          const cfg = parseIntegrationSettings(integ?.value);
          const info = (payload as any).info ?? null; // sự kiện user_submit_info
          const phone = info?.phone ? String(info.phone) : extractVnPhone(text);
          if (cfg.zalo.leadFromChat && phone) {
            const { ingestInboundLead } = await import("@/lib/inbound-leads.server");
            const code = text.match(/\b([A-Z]{1,3}-?\d{1,2}[.\-]\d{1,3})\b/i)?.[1] ?? null;
            const r = await ingestInboundLead({
              tenantId,
              source: "zalo_oa",
              sourceLabel: "Zalo OA",
              name: info?.name ? String(info.name) : null,
              phone,
              note: text.slice(0, 300),
              productCode: code,
              zaloUserId,
            });
            if (r.ok) {
              await supabaseAdmin.from("conversations").update({ lead_id: r.leadId, owner_user_id: r.ownerUserId } as never)
                .eq("id", conversationId).is("lead_id", null);
            }
          }
        } catch (e) {
          console.error("zalo lead ingest failed", e);
        }

        return json({ ok: true });
      },
    },
  },
});
