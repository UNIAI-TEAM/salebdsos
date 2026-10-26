import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CHANNELS_KEY, parseChannelSettings } from "@/lib/channels";

const schema = z.object({ event_name: z.string().max(80), timestamp: z.union([z.string(), z.number()]), app_id: z.union([z.string(), z.number()]).optional(), oa_id: z.string().max(80).optional(), sender: z.object({ id: z.string().min(1).max(80) }), recipient: z.object({ id: z.string().max(80) }).optional(), message: z.object({ text: z.string().max(20000).optional(), msg_id: z.string().max(300).optional(), attachments: z.array(z.unknown()).optional() }).optional(), info: z.object({ name: z.string().max(120).optional(), phone: z.string().max(40).optional() }).optional() });
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const Route = createFileRoute("/api/public/zalo-webhook")({ server: { handlers: {
 POST: async ({ request }) => {
  const raw = await request.text();
  if (raw.length > 200000) return json({ error: "payload too large" }, 413);
  let parsed;
  try { parsed = schema.safeParse(JSON.parse(raw)); } catch { return json({ error: "bad json" }, 400); }
  if (!parsed.success) return json({ error: "invalid event" }, 400);
  const p = parsed.data, accountId = p.oa_id ?? p.recipient?.id;
  if (!accountId) return json({ error: "missing OA" }, 400);
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await sb.from("settings").select("tenant_id,value").eq("key", CHANNELS_KEY).eq("value->zalo->>oaId", accountId).limit(2);
  if (rows?.length !== 1) return json({ error: "unknown OA" }, 401);
  const row = rows[0], config = parseChannelSettings(row.value);
  const { zaloCreds } = await import("@/lib/credentials.server");
  const { signatureEquals, zaloSignature, receiveChannelMessage } = await import("@/lib/omnichannel.server");
  const { appSecret } = await zaloCreds(row.tenant_id);
  if (!config.zalo.enabled || !config.zalo.appId || !appSecret) return json({ error: "OA not connected" }, 401);
  if (p.app_id && String(p.app_id) !== config.zalo.appId) return json({ error: "wrong app" }, 401);
  if (!signatureEquals(request.headers.get("x-zevent-signature") ?? "", zaloSignature(raw, config.zalo.appId, String(p.timestamp), appSecret))) return json({ error: "invalid signature" }, 401);
  if (!["user_send_text", "user_submit_info", "user_send_image", "user_send_file", "user_send_audio"].includes(p.event_name)) return json({ ok: true, ignored: true });
  const text = p.message?.text ?? (p.info ? `Thông tin khách: ${p.info.name ?? ""} ${p.info.phone ?? ""}` : "[Tệp đính kèm Zalo]");
  const eventId = p.message?.msg_id ?? `${p.event_name}:${p.sender.id}:${p.timestamp}`;
  try {
   await receiveChannelMessage({ tenantId: row.tenant_id, channel: "zalo", accountId, userId: p.sender.id, eventId, body: text, name: p.info?.name });
   return json({ ok: true });
  } catch { return json({ error: "cannot save event" }, 500); }
 }
} } });
