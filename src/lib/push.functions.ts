// Đăng ký / quản lý thiết bị nhận thông báo đẩy của chuyên viên.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pushPublicKey, sendPushToUser } from "./push.server";

export const getPushConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("push_devices")
      .select("id,label,user_agent,enabled,last_seen_at,last_error,created_at")
      .order("created_at", { ascending: false });
    return {
      publicKey: pushPublicKey(),
      devices: (data ?? []) as {
        id: string;
        label: string | null;
        user_agent: string | null;
        enabled: boolean;
        last_seen_at: string | null;
        last_error: string | null;
        created_at: string;
      }[],
    };
  });

export const registerPushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid().optional(),
        endpoint: z.string().url(),
        p256dh: z.string().min(10),
        auth: z.string().min(5),
        label: z.string().max(80).optional(),
        userAgent: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_devices").upsert(
      {
        tenant_id: data.tenantId ?? null,
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        label: data.label ?? null,
        user_agent: data.userAgent ?? null,
        enabled: true,
        last_error: null,
        last_seen_at: new Date().toISOString(),
      } as never,
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPushDeviceEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_devices")
      .update({ enabled: data.enabled } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ endpoint: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_devices").delete().eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const result = await sendPushToUser({
      userId: context.userId,
      title: "SaleBDS OS",
      body: "Thông báo thử — nếu anh/chị thấy tin này thì thông báo đẩy đã hoạt động.",
      link: "/sale-overview",
      tag: "test",
    });
    return result;
  });
