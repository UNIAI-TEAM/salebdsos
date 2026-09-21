// Gửi thông báo đẩy (Web Push / RFC 8291) tới thiết bị của chuyên viên.
// Chạy trên server, dùng khoá VAPID trong biến môi trường.
import { buildPushPayload } from "@block65/webcrypto-web-push";

type PushInput = {
  userId: string | null | undefined;
  title: string;
  body?: string | null;
  link?: string | null;
  tag?: string | null;
};

function vapid() {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"] || "mailto:no-reply@salebdsos.vn";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function pushConfigured(): boolean {
  return vapid() !== null;
}

export function pushPublicKey(): string | null {
  return process.env["VAPID_PUBLIC_KEY"] || null;
}

/**
 * Gửi thông báo đẩy tới mọi thiết bị đang bật của một người.
 * Không throw: lỗi gửi chỉ được ghi lại để không làm hỏng luồng chính.
 */
export async function sendPushToUser(input: PushInput): Promise<{ sent: number; failed: number }> {
  const keys = vapid();
  if (!keys || !input.userId) return { sent: 0, failed: 0 };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: devices } = await supabaseAdmin
    .from("push_devices")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", input.userId)
    .eq("enabled", true)
    .limit(20);

  const rows = (devices ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[];
  if (rows.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    rows.map(async (device) => {
      const subscription = {
        endpoint: device.endpoint,
        expirationTime: null,
        keys: { p256dh: device.p256dh, auth: device.auth },
      };
      try {
        const payload = await buildPushPayload(
          {
            data: {
              title: input.title,
              body: input.body ?? "",
              link: input.link ?? "/dashboard",
              tag: input.tag ?? "salebds",
            },
            options: { urgency: "high", ttl: 60 * 60 * 12 },
          },
          subscription,
          keys,
        );
        const res = await fetch(device.endpoint, {
          method: payload.method,
          headers: payload.headers as unknown as Record<string, string>,
          body: payload.body as unknown as BodyInit,
        });
        if (res.ok) {
          sent += 1;
          await supabaseAdmin
            .from("push_devices")
            .update({ last_seen_at: new Date().toISOString(), last_error: null } as never)
            .eq("id", device.id);
          return;
        }
        failed += 1;
        // 404/410: thiết bị đã gỡ đăng ký → tắt để không gửi nữa
        const disable = res.status === 404 || res.status === 410;
        await supabaseAdmin
          .from("push_devices")
          .update({
            ...(disable ? { enabled: false } : {}),
            last_error: `HTTP ${res.status}`,
          } as never)
          .eq("id", device.id);
      } catch (error) {
        failed += 1;
        await supabaseAdmin
          .from("push_devices")
          .update({ last_error: (error as Error).message.slice(0, 200) } as never)
          .eq("id", device.id);
      }
    }),
  );

  return { sent, failed };
}
