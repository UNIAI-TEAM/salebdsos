// Hộp thoại hội thoại gộp theo khách + cuộc gọi có ghi âm
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CHANNELS_KEY, channelSettingsSchema, parseChannelSettings } from "@/lib/channels";

import { canAccessConversation, replyChannel } from "./omnichannel";
import { ADMIN_ROLES as MANAGER_ROLES } from "@/lib/permissions";
import { matchedCallPhone } from "./call-destination";

async function roles(
  supabase: { from: (t: "user_roles") => any },
  tenantId: string,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const list = (data ?? []).map((row: { role: string }) => row.role);
  if (!list.length) throw new Error("Bạn không thuộc workspace này");
  return list;
}

async function assertManager(supabase: never, tenantId: string, userId: string) {
  const list = await roles(supabase as never, tenantId, userId);
  if (!list.some((role) => MANAGER_ROLES.has(role)))
    throw new Error("Bạn không có quyền cấu hình kênh liên lạc");
}

/* ------------------------------- Cấu hình kênh ------------------------------ */

export const getChannelSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roleList = await roles(supabase as never, data.tenantId, userId);
    const { data: row } = await supabase
      .from("settings")
      .select("value,updated_at")
      .eq("tenant_id", data.tenantId)
      .eq("key", CHANNELS_KEY)
      .maybeSingle();
    const { channelConnectionStatus } = await import("./omnichannel.server");
    return {
      connections: await channelConnectionStatus(data.tenantId),
      config: parseChannelSettings(row?.value),
      updatedAt: row?.updated_at ?? null,
      canManage: roleList.some((role) => MANAGER_ROLES.has(role)),
    };
  });

export const saveChannelSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; config: unknown }) =>
    z.object({ tenantId: z.string().uuid(), config: channelSettingsSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase as never, data.tenantId, userId);
    const { error } = await supabase.from("settings").upsert(
      { tenant_id: data.tenantId, key: CHANNELS_KEY, value: data.config, updated_by: userId },
      { onConflict: "tenant_id,key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------- Danh sách hội thoại --------------------------- */

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; channel?: string; search?: string; mine?: boolean; tag?: string }) =>
    z
      .object({
        tenantId: z.string().uuid(),
        channel: z.string().max(20).optional(),
        search: z.string().max(120).optional(),
        mine: z.boolean().optional(),
        tag: z.string().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roleList = await roles(supabase as never, data.tenantId, userId);
    const canSeeAll = roleList.some((role) => MANAGER_ROLES.has(role));

    let query = supabase
      .from("conversations")
      .select(
        "id, channel, contact_name, contact_phone, status, unread_count, last_message_at, last_message_preview, owner_user_id, lead_id, project_id, meta",
      )
      .eq("tenant_id", data.tenantId)
      .order("last_message_at", { ascending: false })
      .limit(100);

    if (!canSeeAll || data.mine) query = query.eq("owner_user_id", userId);
    if (data.tag) query = query.contains("meta", { tags: [data.tag] } as never);
    if (data.channel && data.channel !== "all") query = query.eq("channel", data.channel as never);
    const safeSearch = (data.search ?? "").replace(/[,()*%\\:."']/g, " ").trim();
    if (safeSearch) {
      const term = `%${safeSearch}%`;
      query = query.or(`contact_name.ilike.${term},contact_phone.ilike.${term}`);
    }

    const [convQ, projectsQ] = await Promise.all([
      query,
      supabase.from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null),
    ]);
    if (convQ.error) throw new Error(convQ.error.message);

    const projectNames = new Map((projectsQ.data ?? []).map((p) => [p.id, p.name]));
    const items = (convQ.data ?? []).map((row) => ({
      id: row.id,
      channel: row.channel as string,
      name: row.contact_name || row.contact_phone || "Khách ẩn danh",
      phone: row.contact_phone,
      status: row.status,
      unread: row.unread_count,
      lastAt: row.last_message_at,
      preview: row.last_message_preview,
      projectName: row.project_id ? projectNames.get(row.project_id) ?? null : null,
      leadId: row.lead_id,
      tags: (((row as any).meta ?? {}).tags ?? []) as string[],
    }));

    return {
      items,
      canSeeAll,
      unreadTotal: items.reduce((sum, item) => sum + (item.unread ?? 0), 0),
    };
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; conversationId: string }) =>
    z.object({ tenantId: z.string().uuid(), conversationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roleList = await roles(supabase as never, data.tenantId, userId);

    const { data: conv, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .eq("id", data.conversationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conv) throw new Error("Không tìm thấy hội thoại");
    if (!canAccessConversation(roleList, conv.owner_user_id, userId)) throw new Error("Bạn chỉ được xem khách mình phụ trách");
    let conversationIds = [conv.id];
    if (conv.lead_id) {
      let siblings = supabase.from("conversations").select("id").eq("tenant_id", data.tenantId).eq("lead_id", conv.lead_id);
      if (!roleList.some(r => MANAGER_ROLES.has(r))) siblings = siblings.eq("owner_user_id", userId);
      const { data: linked } = await siblings;
      conversationIds = [...new Set([conv.id, ...(linked ?? []).map(c => c.id)])];
    }
    const { data: identities } = await supabase.from("channel_identities").select("channel,last_inbound_at").eq("tenant_id", data.tenantId).in("conversation_id", conversationIds);

    const [messagesQ, callsQ] = await Promise.all([
      supabase
        .from("conversation_messages")
        .select("id, channel, direction, body, attachment_url, sender_name, sender_user_id, delivery_status, error_message, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true })
        .limit(300),
      supabase
        .from("call_logs")
        .select("id, provider, direction, phone, status, outcome, duration_seconds, recording_url, transcript, notes, started_at")
        .in("conversation_id", conversationIds)
        .order("started_at", { ascending: false })
        .limit(50),
    ]);
    if (messagesQ.error) throw new Error(messagesQ.error.message);

    if ((conv.unread_count ?? 0) > 0) {
      await supabase.from("conversations").update({ unread_count: 0 } as never).eq("id", conv.id);
    }

    const convMeta = (conv.meta ?? {}) as Record<string, unknown>;
    const bot = (convMeta.bot ?? {}) as { flowId?: string; handoff?: boolean };
    const msgs = messagesQ.data ?? [];
    // Bot tạm ngừng khi đã chuyển giao, hoặc khi Sale đã trực tiếp trả lời trong lúc flow còn hoạt động
    const humanReplied = msgs.some((m) => m.direction === "out" && m.sender_user_id);
    const botPaused = bot.handoff === true || (Boolean(bot.flowId) && humanReplied);

    let ownerName: string | null = null;
    if (conv.owner_user_id) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", conv.owner_user_id)
        .maybeSingle();
      ownerName = ownerProfile?.full_name || ownerProfile?.email || null;
    }

    return {
      conversation: {
        id: conv.id,
        channel: conv.channel as string,
        name: conv.contact_name || conv.contact_phone || "Khách ẩn danh",
        phone: conv.contact_phone,
        zaloId: conv.contact_zalo_id,
        identities: identities ?? [],
        status: conv.status,
        leadId: conv.lead_id,
        customerId: conv.customer_id,
        needsIdentityReview: (conv.meta as { identity_review_required?: boolean } | null)?.identity_review_required === true,
        projectId: conv.project_id,
        ownerUserId: conv.owner_user_id,
        ownerName,
        botPaused,
        botActive: Boolean(bot.flowId) && !botPaused,
        tags: (convMeta.tags ?? []) as string[],
      },
      messages: msgs,
      calls: callsQ.data ?? [],
    };
  });

/* ------------------------------ Gửi tin nhắn ------------------------------ */

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; conversationId: string; body: string; channel?: string; subject?: string }) =>
    z
      .object({
        tenantId: z.string().uuid(),
        conversationId: z.string().uuid(),
        body: z.string().trim().min(1).max(2000),
        channel: z.enum(["web_chat", "zalo", "messenger", "telegram", "note", "sms", "email"]).optional(),
        subject: z.string().trim().max(160).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roleListSend = await roles(supabase as never, data.tenantId, userId);

    const { data: conv } = await supabase
      .from("conversations")
      .select("id, channel, contact_zalo_id, contact_phone, contact_name, lead_id, owner_user_id")
      .eq("tenant_id", data.tenantId)
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv) throw new Error("Không tìm thấy hội thoại");
    if (!canAccessConversation(roleListSend, conv.owner_user_id, userId))
      throw new Error("Bạn chỉ được nhắn khách mình phụ trách");

    const channel = data.channel ?? replyChannel(conv.channel as string);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,email")
      .eq("user_id", userId)
      .maybeSingle();
    const senderName = profile?.full_name || profile?.email?.split("@")[0] || "Chuyên viên";

    const { appendMessage, sendZaloMessage, sendSmsMessage, sendEmailMessage, loadChannelSettings } =
      await import("@/lib/channels.server");
    let status = "sent";
    let externalId: string | null = null;
    let errorMessage: string | null = null;

    if (channel === "telegram") {
      const { sendTelegramMessage } = await import("./telegram.server");
      const result = await sendTelegramMessage(data.tenantId, data.conversationId, data.body);
      status = result.status; externalId = result.externalId; errorMessage = result.error;
    }
    if (channel === "messenger") {
      const { sendMessengerMessage } = await import("./omnichannel.server");
      const result = await sendMessengerMessage(data.tenantId, data.conversationId, data.body);
      status = result.status; externalId = result.externalId; errorMessage = result.error;
    }
    if (channel === "zalo") {
      const { loadChannelSettings } = await import("./channels.server");
      const { pickReplyIdentity } = await import("./zalo-oa");
      const config = await loadChannelSettings(data.tenantId);
      let identityQuery = supabase.from("channel_identities").select("account_id,external_user_id,conversation_id").eq("tenant_id", data.tenantId).eq("channel", "zalo");
      identityQuery = conv.lead_id ? identityQuery.or(`lead_id.eq.${conv.lead_id},conversation_id.eq.${data.conversationId}`) : identityQuery.eq("conversation_id", data.conversationId);
      const { data: ids } = await identityQuery.limit(20);
      const identity = pickReplyIdentity(ids ?? [], data.conversationId);
      if (!identity) throw new Error("Chưa xác định duy nhất tài khoản Zalo; cần kiểm tra hồ sơ trước khi gửi.");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: oa } = await supabaseAdmin.from("zalo_oa_accounts").select("id").eq("tenant_id", data.tenantId).eq("oa_id", identity.account_id).neq("status", "disconnected").maybeSingle();
      let result;
      if (oa) {
        const { sendFromOa } = await import("./zalo-oa.server");
        result = await sendFromOa(oa.id, identity.external_user_id, data.body);
      } else {
        if (identity.account_id !== config.zalo.oaId) throw new Error("OA của hội thoại này đã ngắt kết nối — không gửi được.");
        result = await sendZaloMessage({ tenantId: data.tenantId, zaloUserId: identity.external_user_id, text: data.body });
      }
      status = result.status;
      externalId = result.externalId;
      errorMessage = result.error;
    }

    if (channel === "sms" || channel === "email") {
      const settings = await loadChannelSettings(data.tenantId);
      if (channel === "sms") {
        const result = await sendSmsMessage({
          settings,
          phone: conv.contact_phone as string | null,
          text: data.body,
        });
        status = result.status;
        externalId = result.externalId;
        errorMessage = result.error;
      } else {
        let email: string | null = null;
        if (conv.lead_id) {
          const { data: lead } = await supabase
            .from("leads")
            .select("email")
            .eq("id", conv.lead_id as string)
            .maybeSingle();
          email = (lead?.email as string | null) ?? null;
        }
        const result = await sendEmailMessage({
          tenantId: data.tenantId,
          settings,
          to: email,
          subject: data.subject || "Thông tin dự án",
          text: data.body,
          origin: await (async () => {
            const { getRequest } = await import("@tanstack/react-start/server");
            try {
              return new URL(getRequest().url).origin;
            } catch {
              return null;
            }
          })(),
        });
        status = result.status;
        externalId = result.externalId;
        errorMessage = result.error;
      }
    }

    const message = await appendMessage({
      tenantId: data.tenantId,
      conversationId: data.conversationId,
      channel,
      direction: "out",
      body: data.body,
      senderUserId: userId,
      senderName,
      externalId,
      deliveryStatus: status,
      errorMessage,
    });

    return { ok: true, messageId: message.id, status, warning: errorMessage };
  });

/* ------------------------------- Cuộc gọi -------------------------------- */

export const startCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; conversationId?: string; leadId?: string; phone: string }) =>
    z
      .object({
        tenantId: z.string().uuid(),
        conversationId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
        phone: z.string().trim().min(6).max(40),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roleListCall = await roles(supabase as never, data.tenantId, userId);
    const digits = data.phone.replace(/\D/g, "").slice(-9);
    if (digits.length < 8) throw new Error("Số điện thoại không hợp lệ");
    const sbAny = supabase as any;
    const [{ data: leadHit }, { data: convHit }, { data: custHit }] = await Promise.all([
      sbAny.from("leads").select("id,owner_user_id,phone").eq("tenant_id", data.tenantId).ilike("phone", `%${digits}`).limit(5),
      sbAny.from("conversations").select("id,owner_user_id,contact_phone").eq("tenant_id", data.tenantId).ilike("contact_phone", `%${digits}`).limit(5),
      sbAny.from("customers").select("id,owner_user_id,phone").eq("tenant_id", data.tenantId).ilike("phone", `%${digits}`).limit(5),
    ]);
    const hits = [...(leadHit ?? []), ...(convHit ?? []), ...(custHit ?? [])] as any[];
    if (!hits.length) throw new Error("Chỉ gọi được số của khách trong workspace");
    if (!roleListCall.some((r) => MANAGER_ROLES.has(r)) && !hits.some((h) => !h.owner_user_id || h.owner_user_id === userId))
      throw new Error("Bạn chỉ được gọi khách mình phụ trách");

    const destination = matchedCallPhone(data.phone, hits.map((h) => h.phone ?? h.contact_phone));
    if (data.leadId && !(leadHit ?? []).some((h: any) => h.id === data.leadId && matchedCallPhone(destination, [h.phone]))) throw new Error("Khách liên kết không khớp số gọi");
    if (data.conversationId && !(convHit ?? []).some((h: any) => h.id === data.conversationId && matchedCallPhone(destination, [h.contact_phone]))) throw new Error("Hội thoại không khớp số gọi");

    const { loadChannelSettings, startProviderCall, appendMessage } = await import("@/lib/channels.server");
    const settings = await loadChannelSettings(data.tenantId);
    const result = await startProviderCall({
      provider: settings.telephony.provider,
      fromNumber: settings.telephony.hotline,
      toNumber: destination,
      recordCalls: settings.telephony.recordCalls,
    });

    const { data: call, error } = await supabase
      .from("call_logs")
      .insert({
        tenant_id: data.tenantId,
        conversation_id: data.conversationId ?? null,
        lead_id: data.leadId ?? null,
        agent_user_id: userId,
        provider: settings.telephony.provider,
        external_call_id: result.externalId,
        direction: "out",
        phone: destination,
        status: result.status === "sent" ? "ringing" : result.status === "pending" ? "manual" : "failed",
      } as never)
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);

    if (data.conversationId) {
      await appendMessage({
        tenantId: data.tenantId,
        conversationId: data.conversationId,
        channel: "call",
        direction: "out",
        body: `Gọi ra ${data.phone}`,
        senderUserId: userId,
        deliveryStatus: result.status,
        errorMessage: result.error,
        meta: { call_id: call.id },
      });
    }

    return {
      ok: true,
      callId: call.id,
      status: call.status,
      provider: settings.telephony.provider,
      warning: result.error,
    };
  });

export const saveCallResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenantId: string;
      callId: string;
      outcome?: string;
      durationSeconds?: number;
      recordingUrl?: string;
      notes?: string;
    }) =>
      z
        .object({
          tenantId: z.string().uuid(),
          callId: z.string().uuid(),
          outcome: z.string().max(40).optional(),
          durationSeconds: z.number().int().min(0).max(36000).optional(),
          recordingUrl: z.string().url().max(600).optional(),
          notes: z.string().max(2000).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await roles(supabase as never, data.tenantId, userId);

    const patch: Record<string, unknown> = { status: "completed", ended_at: new Date().toISOString() };
    if (data.outcome) patch["outcome"] = data.outcome;
    if (typeof data.durationSeconds === "number") patch["duration_seconds"] = data.durationSeconds;
    if (data.recordingUrl) patch["recording_url"] = data.recordingUrl;
    if (data.notes) patch["notes"] = data.notes;

    const { data: call, error } = await supabase
      .from("call_logs")
      .update(patch as never)
      .eq("tenant_id", data.tenantId)
      .eq("id", data.callId)
      .select("id, conversation_id, phone, outcome, duration_seconds, recording_url")
      .single();
    if (error) throw new Error(error.message);

    if (call.conversation_id) {
      const { appendMessage } = await import("@/lib/channels.server");
      await appendMessage({
        tenantId: data.tenantId,
        conversationId: call.conversation_id,
        channel: "call",
        direction: "out",
        body: `Kết quả cuộc gọi ${call.phone ?? ""}: ${data.outcome ?? "đã gọi"}${data.notes ? ` — ${data.notes}` : ""}`,
        senderUserId: userId,
        attachmentUrl: call.recording_url,
        meta: { call_id: call.id, duration_seconds: call.duration_seconds },
      });
    }
    return { ok: true };
  });

/* ------------------- Tạo hội thoại từ lead / khách sẵn có ------------------ */

export const openConversationForLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; leadId: string }) =>
    z.object({ tenantId: z.string().uuid(), leadId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await roles(supabase as never, data.tenantId, userId);

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("tenant_id", data.tenantId)
      .eq("lead_id", data.leadId)
      .maybeSingle();
    if (existing) return { ok: true, conversationId: existing.id };

    const { data: lead } = await supabase
      .from("leads")
      .select("id, full_name, phone, project_id, owner_user_id")
      .eq("tenant_id", data.tenantId)
      .eq("id", data.leadId)
      .maybeSingle();
    if (!lead) throw new Error("Không tìm thấy khách hàng");

    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        tenant_id: data.tenantId,
        lead_id: lead.id,
        project_id: lead.project_id,
        owner_user_id: lead.owner_user_id ?? userId,
        channel: "call",
        contact_name: lead.full_name,
        contact_phone: lead.phone,
        last_message_preview: "Hội thoại mới",
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, conversationId: conv.id };
  });

/* ------------------------- Trả lời nhanh & thẻ hội thoại ------------------------- */

export const getInboxKit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await roles(supabase as never, data.tenantId, userId);
    const { SOCIAL_KEY, parseSocialSettings, DEFAULT_TAGS } = await import("@/lib/social");
    const { data: row } = await supabase.from("settings").select("value")
      .eq("tenant_id", data.tenantId).eq("key", SOCIAL_KEY).maybeSingle();
    return { quickReplies: parseSocialSettings(row?.value).quickReplies, tags: DEFAULT_TAGS.map((t) => ({ ...t })) };
  });

export const setConversationTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), conversationId: z.string().uuid(), tags: z.array(z.string().max(40)).max(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const list = await roles(supabase as never, data.tenantId, userId);
    const { data: conv } = await supabase.from("conversations").select("id,meta,owner_user_id")
      .eq("tenant_id", data.tenantId).eq("id", data.conversationId).maybeSingle();
    if (!conv) throw new Error("Không tìm thấy hội thoại");
    if (!list.some((r) => MANAGER_ROLES.has(r)) && conv.owner_user_id !== userId)
      throw new Error("Chỉ gắn thẻ hội thoại bạn phụ trách");
    const { DEFAULT_TAGS } = await import("@/lib/social");
    const allowed = new Set<string>(DEFAULT_TAGS.map((t) => t.key));
    const tags = [...new Set(data.tags.filter((t) => allowed.has(t)))];
    const meta = { ...((conv.meta ?? {}) as Record<string, unknown>), tags };
    const { error } = await supabase.from("conversations").update({ meta } as never).eq("id", conv.id);
    if (error) throw new Error(error.message);
    return { tags };
  });

/* ----------------- Giao phụ trách & đóng/mở hội thoại ----------------- */

export const assignConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      conversationId: z.string().uuid(),
      userId: z.string().uuid().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const list = await roles(supabase as never, data.tenantId, userId);
    const isManager = list.some((r) => MANAGER_ROLES.has(r));
    // Sale chỉ được tự nhận hoặc rời hội thoại của mình; gán cho người khác cần quản lý
    if (!isManager && data.userId !== userId && data.userId !== null)
      throw new Error("Chỉ quản lý được giao hội thoại cho người khác");

    const { data: conv } = await supabase.from("conversations").select("id, owner_user_id")
      .eq("tenant_id", data.tenantId).eq("id", data.conversationId).maybeSingle();
    if (!conv) throw new Error("Không tìm thấy hội thoại");
    if (!isManager && data.userId === null && conv.owner_user_id !== userId)
      throw new Error("Chỉ rời được hội thoại bạn đang phụ trách");

    const { error } = await supabase.from("conversations")
      .update({ owner_user_id: data.userId } as never).eq("id", conv.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      conversationId: z.string().uuid(),
      status: z.enum(["open", "closed"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const list = await roles(supabase as never, data.tenantId, userId);
    const { data: conv } = await supabase.from("conversations").select("id, owner_user_id")
      .eq("tenant_id", data.tenantId).eq("id", data.conversationId).maybeSingle();
    if (!conv) throw new Error("Không tìm thấy hội thoại");
    if (!list.some((r) => MANAGER_ROLES.has(r)) && conv.owner_user_id !== userId)
      throw new Error("Chỉ đóng/mở hội thoại bạn phụ trách");
    const { error } = await supabase.from("conversations")
      .update({ status: data.status } as never).eq("id", conv.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------- Tạo hồ sơ khách mới từ hội thoại ----------------- */

export const createCustomerFromConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      conversationId: z.string().uuid(),
      fullName: z.string().trim().min(2).max(120),
      phone: z.string().trim().max(20).optional(),
      email: z.string().trim().email().max(120).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const list = await roles(supabase as never, data.tenantId, userId);
    const { data: conv } = await supabase.from("conversations")
      .select("id, owner_user_id, customer_id, contact_name, contact_phone, project_id")
      .eq("tenant_id", data.tenantId).eq("id", data.conversationId).maybeSingle();
    if (!conv) throw new Error("Không tìm thấy hội thoại");
    if (!list.some((r) => MANAGER_ROLES.has(r)) && conv.owner_user_id !== userId)
      throw new Error("Chỉ tạo hồ sơ từ hội thoại bạn phụ trách");
    if (conv.customer_id) throw new Error("Hội thoại đã gắn hồ sơ khách hàng");

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        tenant_id: data.tenantId,
        owner_user_id: conv.owner_user_id ?? userId,
        full_name: data.fullName,
        phone: data.phone || conv.contact_phone || null,
        email: data.email || null,
        notes: `Tạo từ hội thoại ${conv.contact_name ?? ""}`.trim(),
      } as never)
      .select("id, full_name")
      .single();
    if (error) throw new Error(error.message);

    const { error: linkErr } = await supabase.from("conversations")
      .update({ customer_id: customer.id } as never).eq("id", conv.id);
    if (linkErr) throw new Error(linkErr.message);
    return { ok: true, customerId: customer.id, name: customer.full_name };
  });
