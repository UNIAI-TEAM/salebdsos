// Gửi tin nhắn ra kênh ngoài (Zalo OA) và khởi tạo cuộc gọi qua tổng đài.
// Khi chưa có khoá kết nối thì trả về trạng thái "pending" để hộp thoại vẫn lưu lịch sử.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CHANNELS_KEY, parseChannelSettings, type ChannelSettings } from "@/lib/channels";

export async function loadChannelSettings(tenantId: string): Promise<ChannelSettings> {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", CHANNELS_KEY)
    .maybeSingle();
  return parseChannelSettings(data?.value);
}

export type DispatchResult = {
  status: "sent" | "pending" | "failed";
  externalId: string | null;
  error: string | null;
};

/** Gửi tin nhắn Zalo OA. Chưa có OA access token → trả pending, không làm vỡ luồng. */
export async function sendZaloMessage(args: {
  tenantId: string;
  zaloUserId: string | null;
  text: string;
}): Promise<DispatchResult> {
  const token = process.env["ZALO_OA_ACCESS_TOKEN"];
  if (!token) {
    return {
      status: "pending",
      externalId: null,
      error: "Chưa kết nối Zalo OA — tin nhắn đã lưu, sẽ gửi sau khi kết nối.",
    };
  }
  if (!args.zaloUserId) {
    return { status: "failed", externalId: null, error: "Khách chưa có Zalo ID." };
  }
  try {
    const response = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: token },
      body: JSON.stringify({
        recipient: { user_id: args.zaloUserId },
        message: { text: args.text.slice(0, 2000) },
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: number;
      message?: string;
      data?: { message_id?: string };
    };
    if (!response.ok || (payload.error ?? 0) !== 0) {
      return {
        status: "failed",
        externalId: null,
        error: payload.message || `Zalo trả lỗi ${response.status}`,
      };
    }
    return { status: "sent", externalId: payload.data?.message_id ?? null, error: null };
  } catch (error) {
    return { status: "failed", externalId: null, error: (error as Error).message };
  }
}

/** Khởi tạo cuộc gọi qua tổng đài. Chưa có khoá → trả pending để Sale gọi tay và tải ghi âm. */
export async function startProviderCall(args: {
  provider: string;
  fromNumber: string;
  toNumber: string;
  recordCalls: boolean;
}): Promise<DispatchResult> {
  if (args.provider === "stringee") {
    const apiKeySid = process.env["STRINGEE_API_KEY_SID"];
    const accessToken = process.env["STRINGEE_ACCESS_TOKEN"];
    if (!apiKeySid || !accessToken) {
      return {
        status: "pending",
        externalId: null,
        error: "Chưa có khoá tổng đài Stringee — cuộc gọi đã ghi nhận, Sale gọi tay và tải ghi âm.",
      };
    }
    try {
      const response = await fetch("https://api.stringee.com/v1/call2/callout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-STRINGEE-AUTH": accessToken },
        body: JSON.stringify({
          from: { type: "external", number: args.fromNumber, alias: args.fromNumber },
          to: [{ type: "external", number: args.toNumber, alias: args.toNumber }],
          actions: [{ action: "record", eventUrl: process.env["TELEPHONY_WEBHOOK_URL"] ?? undefined }],
          record: args.recordCalls,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        call_id?: string;
        message?: string;
      };
      if (!response.ok) {
        return {
          status: "failed",
          externalId: null,
          error: payload.message || `Tổng đài trả lỗi ${response.status}`,
        };
      }
      return { status: "sent", externalId: payload.call_id ?? null, error: null };
    } catch (error) {
      return { status: "failed", externalId: null, error: (error as Error).message };
    }
  }

  return {
    status: "pending",
    externalId: null,
    error:
      args.provider === "manual"
        ? null
        : "Tổng đài này chưa được kết nối — cuộc gọi đã ghi nhận để Sale gọi tay.",
  };
}

/** Ghi tin nhắn + cập nhật tóm tắt hội thoại trong một bước (dùng cho cả luồng công khai). */
export async function appendMessage(args: {
  tenantId: string;
  conversationId: string;
  channel: string;
  direction: "in" | "out";
  body: string | null;
  senderUserId?: string | null;
  senderName?: string | null;
  attachmentUrl?: string | null;
  externalId?: string | null;
  deliveryStatus?: string;
  errorMessage?: string | null;
  meta?: Record<string, unknown>;
}) {
  const { data: message, error } = await supabaseAdmin
    .from("conversation_messages")
    .insert({
      tenant_id: args.tenantId,
      conversation_id: args.conversationId,
      channel: args.channel,
      direction: args.direction,
      body: args.body,
      sender_user_id: args.senderUserId ?? null,
      sender_name: args.senderName ?? null,
      attachment_url: args.attachmentUrl ?? null,
      external_id: args.externalId ?? null,
      delivery_status: args.deliveryStatus ?? "sent",
      error_message: args.errorMessage ?? null,
      meta: (args.meta ?? {}) as never,
    } as never)
    .select("id, created_at")
    .single();
  if (error) throw new Error(error.message);

  const preview = (args.body ?? "").slice(0, 160) || "[Tệp đính kèm]";
  const patch: Record<string, unknown> = {
    last_message_at: message.created_at,
    last_message_preview: preview,
    channel: args.channel,
  };
  if (args.direction === "in") {
    const { data: current } = await supabaseAdmin
      .from("conversations")
      .select("unread_count")
      .eq("id", args.conversationId)
      .maybeSingle();
    patch["unread_count"] = (current?.unread_count ?? 0) + 1;
    patch["status"] = "open";
  }
  await supabaseAdmin
    .from("conversations")
    .update(patch as never)
    .eq("id", args.conversationId);

  return message;
}
