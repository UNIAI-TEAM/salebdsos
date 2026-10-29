import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { eventText, eventOaId, parseZaloWebhook, webhookFresh, ZALO_FOLLOW_EVENTS, ZALO_HANDLED_EVENTS } from "@/lib/zalo-oa";

const schema = z.object({
  event_name: z.string().max(80),
  timestamp: z.union([z.string(), z.number()]),
  app_id: z.union([z.string(), z.number()]).optional(),
  oa_id: z.union([z.string(), z.number()]).optional(),
  sender: z.object({ id: z.union([z.string(), z.number()]) }).optional(),
  recipient: z.object({ id: z.union([z.string(), z.number()]) }).optional(),
  follower: z.object({ id: z.union([z.string(), z.number()]) }).optional(),
  message: z.object({ text: z.string().max(20000).optional(), msg_id: z.string().max(300).optional(), attachments: z.array(z.object({ payload: z.object({ url: z.string().max(2000).optional() }).passthrough().optional() }).passthrough()).max(10).optional() }).passthrough().optional(),
  info: z.object({ name: z.string().max(120).optional(), phone: z.string().max(40).optional() }).passthrough().optional(),
}).passthrough();

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Zalo chỉ chấp nhận webhook khi luôn trả 200: yêu cầu bị từ chối vẫn trả 200 nhưng KHÔNG được xử lý.
// Webhook riêng cho từng OA: /api/public/zalo/<khóa ngẫu nhiên>. Xác minh chữ ký theo OA Secret trước mọi xử lý.
export const Route = createFileRoute("/api/public/zalo/$key")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!/^[a-f0-9]{32,64}$/.test(params.key)) return json({ error: "not found" }, 404);
        const raw = await request.text();
        if (raw.length > 200000) return json({ error: "payload too large" }, 413);
        const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
        const { data: oa } = await sb.from("zalo_oa_accounts").select("id,tenant_id,oa_id,app_id,status,project_id,app_secret_ct,app_secret_iv,oa_secret_ct,oa_secret_iv").eq("webhook_key", params.key).maybeSingle();
        if (!oa || oa.status === "disconnected") return json({ error: "not found" }, 404);
        const { decryptValue } = await import("@/lib/credentials.server");
        const { receiveChannelMessage } = await import("@/lib/omnichannel.server");
        const { verifyZaloSignature } = await import("@/lib/zalo-signature.server");
        const { logWebhook } = await import("@/lib/zalo-oa.server");
        let parsed;
        try { parsed = schema.safeParse(parseZaloWebhook(raw)); } catch { await logWebhook(oa.tenant_id, oa.id, "", false, "JSON không hợp lệ"); return json({ ok: false, rejected: "bad json" }); }
        if (!parsed.success) { await logWebhook(oa.tenant_id, oa.id, "", false, "Sự kiện sai định dạng"); return json({ ok: false, rejected: "invalid event" }); }
        const p = parsed.data;
        // Zalo gắn webhook theo ỨNG DỤNG, không theo OA: một địa chỉ có thể nhận sự kiện của mọi OA dùng chung
        // ứng dụng đó. Vì vậy thử khóa của mọi OA trong cùng sàn, rồi định tuyến theo mã OA của sự kiện.
        const COLS = "id,tenant_id,oa_id,app_id,status,project_id,app_secret_ct,app_secret_iv,oa_secret_ct,oa_secret_iv";
        const { data: siblings } = await sb.from("zalo_oa_accounts").select(COLS).eq("tenant_id", oa.tenant_id).neq("status", "disconnected");
        const pool = [oa, ...(siblings ?? []).filter((x) => x.id !== oa.id)];
        const sig = request.headers.get("x-zevent-signature") ?? "";
        const ts = String(p.timestamp);
        const payloadApp = p.app_id ? String(p.app_id) : "";
        let verifiedApp: string | null = null;
        let sawOaSecret = false;
        outer: for (const c of pool) {
          const secrets = [c.oa_secret_ct ? await decryptValue(c.oa_secret_ct, c.oa_secret_iv) : null, await decryptValue(c.app_secret_ct, c.app_secret_iv)];
          if (secrets[0]) sawOaSecret = true;
          for (const appId of new Set([payloadApp, c.app_id].filter(Boolean))) {
            for (const sec of secrets) if (sec && sig && verifyZaloSignature(sig, raw, appId, ts, sec)) { verifiedApp = appId; break outer; }
          }
        }
        if (!verifiedApp) {
          const hints: string[] = [];
          if (!sig) hints.push("thiếu header chữ ký");
          else if (!/^mac\s*=\s*[a-f0-9]{64}$/i.test(sig.trim())) hints.push("header chữ ký sai định dạng");
          if (!sawOaSecret) hints.push("chưa lưu OA Secret Key");
          else if (sig) hints.push(`không OA nào trong sàn có OA Secret Key khớp ứng dụng ${payloadApp || oa.app_id} — dán OA Secret Key trên trang Webhook của ứng dụng này vào Sửa cấu hình`);
          await logWebhook(oa.tenant_id, oa.id, p.event_name, false, `Sai chữ ký: ${hints.join("; ") || "không xác định"}`);
          return json({ ok: false, rejected: "invalid signature" });
        }
        if (!webhookFresh(p.timestamp)) { await logWebhook(oa.tenant_id, oa.id, p.event_name, false, "Sự kiện quá cũ"); return json({ ok: false, rejected: "stale event" }); }
        const eventOa = eventOaId(p) ? String(eventOaId(p)) : oa.oa_id;
        const target = pool.find((x) => x.oa_id === eventOa);
        if (!target) { await logWebhook(oa.tenant_id, oa.id, p.event_name, false, `OA ${eventOa} chưa được thêm vào sàn`); return json({ ok: false, rejected: "unknown OA" }); }
        if (target.id !== oa.id) Object.assign(oa, target);

        await sb.from("zalo_oa_accounts").update({ last_webhook_at: new Date().toISOString(), ...(oa.status === "webhook_error" ? { status: "connected" } : {}) }).eq("id", oa.id);

        if (ZALO_FOLLOW_EVENTS.has(p.event_name)) {
          await logWebhook(oa.tenant_id, oa.id, p.event_name, true, p.event_name === "unfollow" ? "Khách bỏ theo dõi OA" : "Khách theo dõi OA");
          return json({ ok: true });
        }
        if (!ZALO_HANDLED_EVENTS.has(p.event_name) || !p.sender) {
          await logWebhook(oa.tenant_id, oa.id, p.event_name, true, "Bỏ qua sự kiện chưa hỗ trợ");
          return json({ ok: true, ignored: true });
        }
        const userId = String(p.sender.id);
        const rawUrl = p.message?.attachments?.[0]?.payload?.url;
        const attachmentUrl = rawUrl && /^https:\/\//.test(rawUrl) ? rawUrl : undefined;
        const eventId = p.message?.msg_id ?? `${p.event_name}:${userId}:${p.timestamp}`;
        try {
          await receiveChannelMessage({ tenantId: oa.tenant_id, channel: "zalo", accountId: oa.oa_id, userId, eventId, body: eventText(p.event_name, p.message, p.info), name: p.info?.name, phone: p.info?.phone, projectId: oa.project_id, attachment: attachmentUrl });
          const { syncZaloContact } = await import("@/lib/zalo-contact.server");
          await syncZaloContact(oa.tenant_id, oa.oa_id, userId);
          await logWebhook(oa.tenant_id, oa.id, p.event_name, true);
          return json({ ok: true });
        } catch (e) {
          await logWebhook(oa.tenant_id, oa.id, p.event_name, false, (e as Error).message);
          return json({ error: "cannot save event" }, 503);
        }
      },
    },
  },
});
