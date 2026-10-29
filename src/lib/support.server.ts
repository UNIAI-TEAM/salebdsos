// Ticket tự động + đánh giá hài lòng cho mọi kênh. Chỉ gọi từ máy chủ sau khi tin khách đã được lưu.
import { supabaseAdmin as sb } from "@/integrations/supabase/client.server";
import { appendMessage } from "./channels.server";
import { canAutoSend, parseRating, parseSupportConfig, renderSurvey, shouldReopen, shouldCreateSupportTicket, SUPPORT_KEY, surveyOpen, ticketDueAt, type SupportConfig } from "./support";
import { wantsHuman } from "./chat-flows";

export async function loadSupportConfig(tenantId: string): Promise<SupportConfig> {
  const { data } = await sb.from("settings").select("value").eq("tenant_id", tenantId).eq("key", SUPPORT_KEY).maybeSingle();
  return parseSupportConfig(data?.value);
}

/** Gửi tin tự động qua đúng kênh rồi lưu vào hội thoại. Kênh chưa kiểm chứng: không gửi. */
export async function sendAutoMessage(tenantId: string, conversationId: string, channel: string, text: string, meta: Record<string, unknown> = {}) {
  if (!canAutoSend(channel)) return { sent: false };
  let status = "sent", externalId: string | null = null, error: string | null = null;
  try {
    if (channel === "zalo") {
      const { data: conv } = await sb.from("conversations").select("lead_id").eq("tenant_id", tenantId).eq("id", conversationId).single();
      const { sendZaloForConversation, resolveZaloTarget } = await import("./inbox-zalo.server");
      const target = await resolveZaloTarget(sb, tenantId, { lead_id: conv?.lead_id ?? null }, conversationId);
      if (!target.oa || target.oa.status !== "connected") return { sent: false };
      const r = await sendZaloForConversation(sb, tenantId, { lead_id: conv?.lead_id ?? null }, conversationId, text);
      status = r.status; externalId = r.externalId ?? null; error = r.error ?? null;
    } else if (channel === "telegram") {
      const { sendTelegramMessage } = await import("./telegram.server");
      const r = await sendTelegramMessage(tenantId, conversationId, text);
      externalId = r.externalId;
    }
  } catch (e) { status = "failed"; error = (e as Error).message.slice(0, 300); }
  await appendMessage({ tenantId, conversationId, channel, direction: "out", body: text, senderName: "Trợ lý tự động", deliveryStatus: status, externalId, errorMessage: error, meta: { bot: true, ...meta } });
  return { sent: status === "sent" };
}

/** Xử lý tin khách cho ticket/CSAT. consumed = tin là câu trả lời đánh giá (không chạy bot, không mở ticket). */
export async function handleInboundSupport(args: { tenantId: string; conversationId: string; channel: string; text: string; contactName?: string | null }, handoff = false) {
  const cfg = await loadSupportConfig(args.tenantId);
  const now = new Date();

  // 1) Câu trả lời khảo sát hài lòng
  const { data: pending } = await sb.from("message_tickets").select("id,assignee_user_id,csat_requested_at,csat_rated_at,code")
    .eq("tenant_id", args.tenantId).eq("conversation_id", args.conversationId).not("csat_requested_at", "is", null).is("csat_rated_at", null)
    .order("csat_requested_at", { ascending: false }).limit(1).maybeSingle();
  if (pending && surveyOpen(cfg, pending.csat_requested_at, pending.csat_rated_at, now)) {
    const rating = parseRating(args.text);
    if (rating) {
      const { data: rated, error: ratingError } = await sb.from("message_tickets").update({ csat_score: rating.score, csat_comment: rating.comment || null, csat_rated_at: now.toISOString() }).eq("tenant_id", args.tenantId).eq("id", pending.id).is("csat_rated_at", null).select("id");
      if (ratingError) throw new Error("Không lưu được đánh giá");
      if (!rated?.length) return { consumed: true };
      await sendAutoMessage(args.tenantId, args.conversationId, args.channel, rating.score <= 2 && cfg.csat.lowScoreFollowup ? `${cfg.csat.thanks}\n${cfg.csat.lowScoreFollowup}` : cfg.csat.thanks, { csat: true });
      if (rating.score <= 2 && pending.assignee_user_id) {
        await sb.from("notifications").insert({ tenant_id: args.tenantId, user_id: pending.assignee_user_id, type: "system", title: `Khách đánh giá thấp (${rating.score}/5) · ${pending.code}`, body: rating.comment || "Cần liên hệ lại khách", link: "/inbox-tickets" } as never);
      }
      return { consumed: true };
    }
  }

  // 2) Tự tạo / mở lại ticket
  if (!shouldCreateSupportTicket(cfg, handoff)) return { consumed: false };
  const { data: active } = await sb.from("message_tickets").select("id").eq("tenant_id", args.tenantId).eq("conversation_id", args.conversationId).in("status", ["open", "assigned"]).limit(1).maybeSingle();
  if (active) return { consumed: false };
  const { data: conv } = await sb.from("conversations").select("owner_user_id,contact_name").eq("tenant_id", args.tenantId).eq("id", args.conversationId).maybeSingle();
  const owner = conv?.owner_user_id ?? null;
  const { data: last } = await sb.from("message_tickets").select("id,resolved_at,reopened_count,status")
    .eq("tenant_id", args.tenantId).eq("conversation_id", args.conversationId).eq("status", "resolved").order("resolved_at", { ascending: false }).limit(1).maybeSingle();
  if (last && shouldReopen(cfg, last.resolved_at, now)) {
    await sb.from("message_tickets").update({ status: owner ? "assigned" : "open", resolved_at: null, due_at: ticketDueAt(cfg, now), reopened_count: (last.reopened_count ?? 0) + 1, assignee_user_id: owner, csat_requested_at: null, csat_rated_at: null, csat_score: null, csat_comment: null }).eq("tenant_id", args.tenantId).eq("id", last.id).eq("status", "resolved");
    return { consumed: false, reopened: true };
  }
  const name = args.contactName || conv?.contact_name || "Khách";
  const { error } = await sb.from("message_tickets").insert({
    tenant_id: args.tenantId, conversation_id: args.conversationId, title: `Tin nhắn từ ${name}: ${args.text.slice(0, 120)}`.slice(0, 200),
    source: args.channel, kind: "Chăm sóc khách hàng", priority: cfg.ticket.priority, assignee_user_id: owner,
    status: owner ? "assigned" : "open", due_at: ticketDueAt(cfg, now), auto_created: true,
  });
  // Trùng (hai tin đến cùng lúc) bị chỉ mục duy nhất chặn — bỏ qua.
  if (error && !/duplicate|unique/i.test(error.message)) console.error("auto ticket failed", error.message);
  return { consumed: false, created: !error };
}

/** Sau khi ticket đóng: gửi khảo sát hài lòng một lần qua đúng kênh. */
export async function requestCsat(tenantId: string, ticketId: string) {
  const cfg = await loadSupportConfig(tenantId);
  if (!cfg.csat.enabled) return { sent: false };
  const { data: t } = await sb.from("message_tickets").select("id,conversation_id,csat_requested_at,status").eq("tenant_id", tenantId).eq("id", ticketId).maybeSingle();
  if (!t?.conversation_id || t.status !== "resolved" || t.csat_requested_at) return { sent: false };
  const { data: conv } = await sb.from("conversations").select("channel").eq("tenant_id", tenantId).eq("id", t.conversation_id).maybeSingle();
  if (!conv || !canAutoSend(conv.channel as string)) return { sent: false };
  const { data: claimed } = await sb.from("message_tickets").update({ csat_requested_at: new Date().toISOString() }).eq("id", t.id).is("csat_requested_at", null).select("id");
  if (!claimed?.length) return { sent: false };
  return sendAutoMessage(tenantId, t.conversation_id, conv.channel as string, renderSurvey(cfg), { csat_request: t.id });
}

/** CSAT → chatbot → chỉ tạo/giao ticket khi khách hoặc kịch bản cần nhân viên. */
export async function afterInbound(args: { tenantId: string; conversationId: string; channel: string; text: string; contactName?: string | null; vars?: Record<string, string>; entry?: string | null }) {
  try {
    const r = await handleInboundSupport(args);
    if (r.consumed) return;
  } catch (e) { console.error("support handling failed", e); }
  let handoff = wantsHuman(args.text);
  try {
    const { runChatBot } = await import("./chat-flows.server");
    const bot = await runChatBot(args);
    handoff = handoff || bot.handoff === true;
  } catch (e) { console.error("chat bot failed", e); }
  if (handoff) {
    try { await handleInboundSupport(args, true); } catch (e) { console.error("ticket handoff failed", e); }
  }
}
