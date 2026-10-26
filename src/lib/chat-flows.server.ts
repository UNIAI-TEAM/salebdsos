// Chạy bot kịch bản trên hội thoại thật. Chỉ gọi sau khi tin khách đã được lưu.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { appendMessage } from "./channels.server";
import { BOT_LIVE_CHANNELS, CHAT_FLOWS_KEY, appointmentSlot, parseChatFlows, stepBot, type BotState } from "./chat-flows";

type BotMeta = { flowId?: string; nodeId?: string; handoff?: boolean; tags?: string[]; appointmentId?: string };

export async function runChatBot(args: { tenantId: string; conversationId: string; channel: string; text: string; vars?: Record<string, string> }) {
  if (!(BOT_LIVE_CHANNELS as readonly string[]).includes(args.channel)) return { replied: false };
  const sb = supabaseAdmin;
  const [{ data: cfg }, { data: conv }, { data: human }, { count }] = await Promise.all([
    sb.from("settings").select("value").eq("tenant_id", args.tenantId).eq("key", CHAT_FLOWS_KEY).maybeSingle(),
    sb.from("conversations").select("meta, owner_user_id, lead_id, customer_id, project_id").eq("tenant_id", args.tenantId).eq("id", args.conversationId).maybeSingle(),
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

  for (const m of step.media) {
    await appendMessage({ tenantId: args.tenantId, conversationId: args.conversationId, channel: args.channel, direction: "out", body: m.caption || null, attachmentUrl: m.url, senderName: "Trợ lý tự động", deliveryStatus: "sent", meta: { bot: true, media_type: m.type } });
  }
  if (step.reply) {
    await appendMessage({ tenantId: args.tenantId, conversationId: args.conversationId, channel: args.channel, direction: "out", body: step.reply, senderName: "Trợ lý tự động", deliveryStatus: "sent", meta: { bot: true, flow_id: step.state?.flowId ?? state?.flowId ?? null } });
  }
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (m, k: string) => args.vars?.[k] ?? (k === "project" ? "dự án" : m)).trim();
  let appointmentId = bot.appointmentId;
  // Tạo lịch hẹn một lần cho mỗi hội thoại, giao Sale phụ trách.
  if (step.appointment && !appointmentId) {
    const slot = appointmentSlot(step.appointment);
    const { data: appt } = await sb.from("appointments").insert({
      tenant_id: args.tenantId, title: fill(step.appointment.title).slice(0, 200), location: step.appointment.location || null,
      starts_at: slot.startsAt, ends_at: slot.endsAt, status: "scheduled", lead_id: conv.lead_id, customer_id: conv.customer_id,
      project_id: conv.project_id, assigned_to: conv.owner_user_id, notes: "Tạo tự động từ kịch bản chat — cần Sale gọi xác nhận.",
    } as never).select("id").maybeSingle();
    appointmentId = (appt as { id?: string } | null)?.id;
    if (appointmentId && conv.owner_user_id) {
      await sb.from("notifications").insert({ tenant_id: args.tenantId, user_id: conv.owner_user_id, lead_id: conv.lead_id, type: "lead", title: "Bot vừa tạo lịch hẹn", body: fill(step.appointment.title).slice(0, 160), link: "/appointments" } as never);
    }
  }
  if (step.need) await saveNeed(args.tenantId, conv, step.need);
  const tags = Array.from(new Set([...(bot.tags ?? []), ...(step.tag ? [step.tag] : [])]));
  const nextBot: BotMeta = step.handoff ? { handoff: true, tags, appointmentId } : step.state ? { ...step.state, tags, appointmentId } : { tags, appointmentId };
  await sb.from("conversations").update({ meta: { ...meta, bot: nextBot } } as never).eq("id", args.conversationId).eq("tenant_id", args.tenantId);

  if (step.handoff && conv.owner_user_id) {
    await sb.from("notifications").insert({ tenant_id: args.tenantId, user_id: conv.owner_user_id, lead_id: conv.lead_id, type: "lead", title: "Khách cần chuyên viên tiếp nhận", body: args.text.slice(0, 160), link: "/inbox" } as never);
    const { sendPushToUser } = await import("./push.server");
    await sendPushToUser({ tenantId: args.tenantId, userId: conv.owner_user_id, title: "Khách cần chuyên viên tiếp nhận", body: args.text.slice(0, 160), link: "/inbox" }).catch(() => undefined);
  }
  return { replied: Boolean(step.reply), handoff: step.handoff };
}

/** Ghi nhu cầu khách vào lead (need_type/budget/notes) và hồ sơ khách (meta.need). Chỉ ghi trường có giá trị. */
async function saveNeed(tenantId: string, conv: { lead_id: string | null; customer_id: string | null }, need: { needType: string; budget: string; note: string }) {
  const sb = supabaseAdmin;
  const stamp = new Date().toISOString().slice(0, 10);
  const line = [need.needType, need.budget, need.note].filter(Boolean).join(" · ");
  if (!line) return;
  if (conv.lead_id) {
    const { data: lead } = await sb.from("leads").select("notes").eq("tenant_id", tenantId).eq("id", conv.lead_id).maybeSingle();
    const patch: Record<string, unknown> = { notes: [lead?.notes, `[Bot ${stamp}] ${line}`].filter(Boolean).join("\n").slice(-4000) };
    if (need.needType) patch.need_type = need.needType;
    if (need.budget) patch.budget = need.budget;
    await sb.from("leads").update(patch as never).eq("tenant_id", tenantId).eq("id", conv.lead_id);
  }
  if (conv.customer_id) {
    const { data: c } = await sb.from("customers").select("meta").eq("tenant_id", tenantId).eq("id", conv.customer_id).maybeSingle();
    const meta = (c?.meta ?? {}) as Record<string, any>;
    const prev = (meta.need ?? {}) as Record<string, string>;
    const nextNeed = { ...prev, ...(need.needType ? { needType: need.needType } : {}), ...(need.budget ? { budget: need.budget } : {}), ...(need.note ? { note: need.note } : {}), updatedAt: new Date().toISOString() };
    await sb.from("customers").update({ meta: { ...meta, need: nextNeed } } as never).eq("tenant_id", tenantId).eq("id", conv.customer_id);
  }
}
