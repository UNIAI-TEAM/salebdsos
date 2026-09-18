// Hộp thoại hội thoại gộp theo khách + cuộc gọi có ghi âm
import { createServerFn, getRequest } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CHANNELS_KEY, channelSettingsSchema, parseChannelSettings } from "@/lib/channels";

const MANAGER_ROLES = new Set(["owner", "admin", "manager", "platform_admin"]);

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
    return {
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
  .inputValidator((d: { tenantId: string; channel?: string; search?: string; mine?: boolean }) =>
    z
      .object({
        tenantId: z.string().uuid(),
        channel: z.string().max(20).optional(),
        search: z.string().max(120).optional(),
        mine: z.boolean().optional(),
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
        "id, channel, contact_name, contact_phone, status, unread_count, last_message_at, last_message_preview, owner_user_id, lead_id, project_id",
      )
      .eq("tenant_id", data.tenantId)
      .order("last_message_at", { ascending: false })
      .limit(100);

    if (!canSeeAll || data.mine) query = query.eq("owner_user_id", userId);
    if (data.channel && data.channel !== "all") query = query.eq("channel", data.channel as never);
    if (data.search) {
      const term = `%${data.search}%`;
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
    await roles(supabase as never, data.tenantId, userId);

    const { data: conv, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .eq("id", data.conversationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conv) throw new Error("Không tìm thấy hội thoại");

    const [messagesQ, callsQ] = await Promise.all([
      supabase
        .from("conversation_messages")
        .select("id, channel, direction, body, attachment_url, sender_name, delivery_status, error_message, created_at")
        .eq("conversation_id", data.conversationId)
        .order("created_at", { ascending: true })
        .limit(300),
      supabase
        .from("call_logs")
        .select("id, provider, direction, phone, status, outcome, duration_seconds, recording_url, transcript, notes, started_at")
        .eq("conversation_id", data.conversationId)
        .order("started_at", { ascending: false })
        .limit(50),
    ]);
    if (messagesQ.error) throw new Error(messagesQ.error.message);

    if ((conv.unread_count ?? 0) > 0) {
      await supabase.from("conversations").update({ unread_count: 0 } as never).eq("id", conv.id);
    }

    return {
      conversation: {
        id: conv.id,
        channel: conv.channel as string,
        name: conv.contact_name || conv.contact_phone || "Khách ẩn danh",
        phone: conv.contact_phone,
        zaloId: conv.contact_zalo_id,
        status: conv.status,
        leadId: conv.lead_id,
        projectId: conv.project_id,
        ownerUserId: conv.owner_user_id,
      },
      messages: messagesQ.data ?? [],
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
        channel: z.enum(["web_chat", "zalo", "note", "sms", "email"]).optional(),
        subject: z.string().trim().max(160).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await roles(supabase as never, data.tenantId, userId);

    const { data: conv } = await supabase
      .from("conversations")
      .select("id, channel, contact_zalo_id, contact_phone, contact_name, lead_id")
      .eq("tenant_id", data.tenantId)
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv) throw new Error("Không tìm thấy hội thoại");

    const channel = data.channel ?? (conv.channel as string);
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

    if (channel === "zalo") {
      const result = await sendZaloMessage({
        tenantId: data.tenantId,
        zaloUserId: conv.contact_zalo_id,
        text: data.body,
      });
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
          settings,
          to: email,
          subject: data.subject || "Thông tin dự án",
          text: data.body,
          origin: new URL(getRequest().url).origin,
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
    await roles(supabase as never, data.tenantId, userId);

    const { loadChannelSettings, startProviderCall, appendMessage } = await import("@/lib/channels.server");
    const settings = await loadChannelSettings(data.tenantId);
    const result = await startProviderCall({
      provider: settings.telephony.provider,
      fromNumber: settings.telephony.hotline,
      toNumber: data.phone,
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
        phone: data.phone,
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
