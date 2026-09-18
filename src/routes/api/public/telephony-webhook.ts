// Nhận kết quả cuộc gọi + đường dẫn ghi âm từ tổng đài: POST /api/public/telephony-webhook
// Xác thực bằng chữ ký HMAC (header x-telephony-signature) với khoá TELEPHONY_WEBHOOK_SECRET.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { appendMessage } from "@/lib/channels.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const Route = createFileRoute("/api/public/telephony-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const secret = process.env["TELEPHONY_WEBHOOK_SECRET"];
        if (!secret) return json({ ok: true, skipped: "telephony_not_connected" });

        const signature = request.headers.get("x-telephony-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const ok =
          signature.length === expected.length &&
          timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        if (!ok) return json({ error: "Chữ ký không hợp lệ." }, 401);

        let payload: {
          call_id?: string;
          status?: string;
          duration?: number;
          recording_url?: string;
          to_number?: string;
        };
        try {
          payload = JSON.parse(raw);
        } catch {
          return json({ error: "Dữ liệu không hợp lệ." }, 400);
        }
        if (!payload.call_id) return json({ error: "Thiếu mã cuộc gọi." }, 400);

        const { data: call } = await supabaseAdmin
          .from("call_logs")
          .select("id, tenant_id, conversation_id, phone")
          .eq("external_call_id", payload.call_id)
          .maybeSingle();
        if (!call) return json({ ok: true, skipped: "call_not_found" });

        await supabaseAdmin
          .from("call_logs")
          .update({
            status: payload.status === "answered" ? "completed" : payload.status ?? "completed",
            outcome: payload.status === "answered" ? "connected" : payload.status ?? null,
            duration_seconds: Math.max(0, Math.round(payload.duration ?? 0)),
            recording_url: payload.recording_url ?? null,
            ended_at: new Date().toISOString(),
          } as never)
          .eq("id", call.id);

        if (call.conversation_id) {
          await appendMessage({
            tenantId: call.tenant_id,
            conversationId: call.conversation_id,
            channel: "call",
            direction: "out",
            body: `Cuộc gọi ${call.phone ?? ""} · ${Math.round((payload.duration ?? 0) / 1)}s${payload.recording_url ? " · có ghi âm" : ""}`,
            attachmentUrl: payload.recording_url ?? null,
            meta: { call_id: call.id },
          });
        }

        return json({ ok: true });
      },
    },
  },
});
