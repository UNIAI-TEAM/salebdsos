import { z } from "zod";
import { supabaseAdmin as sb } from "@/integrations/supabase/client.server";
import { receiveChannelMessage } from "./omnichannel.server";
import { loadChannelSettings } from "./channels.server";

const eventSchema = z.object({
  sender: z.object({ id: z.string().regex(/^\d+$/).max(80) }),
  recipient: z.object({ id: z.string().regex(/^\d+$/).max(80) }),
  timestamp: z.number().optional(),
  message: z.object({ mid: z.string().min(1).max(300), text: z.string().max(20000).optional(), is_echo: z.boolean().optional(), attachments: z.array(z.object({ type: z.string(), payload: z.object({ url: z.string().url().optional() }).passthrough() })).max(20).optional() }).optional(),
  delivery: z.object({ mids: z.array(z.string().max(300)).max(100).optional(), watermark: z.number().optional() }).optional(),
  read: z.object({ watermark: z.number() }).optional(),
});

export async function handleMessengerEvents(tenantId: string, pageId: string, payload: any) {
  const config = await loadChannelSettings(tenantId);
  if (!config.messenger.enabled || config.messenger.pageId !== pageId) return 0;
  let processed = 0;
  for (const raw of (payload.entry ?? []).flatMap((e: any) => e.messaging ?? [])) {
    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success) continue;
    const event = parsed.data;
    if (event.message?.is_echo) {
      await sb.from("conversation_messages").update({ delivery_status: "sent" }).eq("tenant_id", tenantId).eq("channel", "messenger").eq("direction", "out").eq("external_id", event.message.mid);
      continue;
    }
    if (event.recipient.id !== pageId) continue;
    if (event.delivery?.mids?.length) {
      await sb.from("conversation_messages").update({ delivery_status: "delivered" }).eq("tenant_id", tenantId).eq("channel", "messenger").eq("direction", "out").in("external_id", event.delivery.mids).neq("delivery_status", "read");
    }
    if (event.read) {
      const { data: identity } = await sb.from("channel_identities").select("conversation_id").eq("tenant_id", tenantId).eq("channel", "messenger").eq("account_id", pageId).eq("external_user_id", event.sender.id).maybeSingle();
      if (identity) await sb.from("conversation_messages").update({ delivery_status: "read" }).eq("tenant_id", tenantId).eq("conversation_id", identity.conversation_id).eq("channel", "messenger").eq("direction", "out").lte("created_at", new Date(event.read.watermark).toISOString()).in("delivery_status", ["sent", "delivered"]);
    }
    if (!event.message) continue;
    const attachment = event.message.attachments?.find(a => a.payload.url)?.payload.url;
    const text = event.message.text ?? (attachment ? "[Tệp đính kèm Messenger]" : "[Tin nhắn Messenger]");
    // Never infer customer identity from a phone typed in free text; Sale explicitly links an existing profile.
    await receiveChannelMessage({ tenantId, channel: "messenger", accountId: pageId, userId: event.sender.id, eventId: event.message.mid, body: text, attachment });
    processed++;
  }
  return processed;
}