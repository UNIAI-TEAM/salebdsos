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

        if (payload.event_name !== "user_send_text") return json({ ok: true, ignored: payload.event_name });

        const zaloUserId = payload.sender?.id;
        const text = payload.message?.text?.slice(0, 2000);
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

        return json({ ok: true });
      },
    },
  },
});
