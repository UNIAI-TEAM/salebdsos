// Chạy bot kịch bản trên hội thoại thật. Chỉ gọi sau khi tin khách đã được lưu.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { appendMessage } from "./channels.server";
import { BOT_LIVE_CHANNELS, CHAT_FLOWS_KEY, parseChatFlows, stepBot, type BotState } from "./chat-flows";

type BotMeta = { flowId?: string; nodeId?: string; handoff?: boolean; tags?: string[] };

export async function runChatBot(args: { tenantId: string; conversationId: string; channel: string; text: string; vars?: Record<string, string> }) {
  if (!(BOT_LIVE_CHANNELS as readonly string[]).includes(args.channel)) return { replied: false };
  const sb = supabaseAdmin;
  const [{ data: cfg }, { data: conv }, { data: human }, { count }] = await Promise.all([
    sb.from("settings").select("value").eq("tenant_id", args.tenantId).eq("key", CHAT_FLOWS_KEY).maybeSingle(),
    sb.from("conversations").select("meta, owner_user_id, lead_id").eq("tenant_id", args.tenantId).eq("id", args.conversationId).maybeSingle(),
    sb.from("conversation_messages").select("id").eq("tenant_id", args.tenantId).eq("conversation_id", args.conversationId).eq("direction", "out").not("sender_user_id", "is", null).limit(1),
    sb.from("conversation_messages").select("id", { count: "exact", head: true }).eq("tenant_id", args.tenantId).eq("conversation_id", args.conversationId).eq("direction", "in"),
  ]);
  if (!conv) return { replied: false };
  const meta = (conv.meta ?? {}) as Record<string, unknown>;
  const bot = (meta.bot ?? {}) as BotMeta;
  // Sale đã trả lời hoặc bot đã chuyển giao → bot im lặng, không giành lại hội thoại.
  if ((human ?? []).length > 0 || bot.handoff) return { replied: false };
  const flows = parseChatFlows(cfg?.value).flows;
  const state: BotState = bot.flowId && bot.nodeId ? { flowId: bot.flowId, nodeId: bot.nodeId } : null;
  const step = stepBot(flows, state, args.text, (count ?? 0) <= 1, args.vars ?? {});
  if (step.reason === "idle") return { replied: false };

  if (step.reply) {
    await appendMessage({ tenantId: args.tenantId, conversationId: args.conversationId, channel: args.channel, direction: "out", body: step.reply, senderName: "Trợ lý tự động", deliveryStatus: "sent", meta: { bot: true, flow_id: step.state?.flowId ?? state?.flowId ?? null } });
  }
  const tags = Array.from(new Set([...(bot.tags ?? []), ...(step.tag ? [step.tag] : [])]));
  const nextBot: BotMeta = step.handoff ? { handoff: true, tags } : step.state ? { ...step.state, tags } : { tags };
  await sb.from("conversations").update({ meta: { ...meta, bot: nextBot } } as never).eq("id", args.conversationId).eq("tenant_id", args.tenantId);

  if (step.handoff && conv.owner_user_id) {
    await sb.from("notifications").insert({ tenant_id: args.tenantId, user_id: conv.owner_user_id, lead_id: conv.lead_id, type: "lead", title: "Khách cần chuyên viên tiếp nhận", body: args.text.slice(0, 160), link: "/inbox" } as never);
    const { sendPushToUser } = await import("./push.server");
    await sendPushToUser({ tenantId: args.tenantId, userId: conv.owner_user_id, title: "Khách cần chuyên viên tiếp nhận", body: args.text.slice(0, 160), link: "/inbox" }).catch(() => undefined);
  }
  return { replied: Boolean(step.reply), handoff: step.handoff };
}
