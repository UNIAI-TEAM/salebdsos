import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NURTURE_KEY, nurtureSettingsSchema, parseNurtureSettings } from "@/lib/nurture";

import { ADMIN_ROLES, SALE_ROLES } from "@/lib/permissions";

async function roles(context: any, tenantId: string) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  const list = (data ?? []).map((row: any) => row.role as string);
  if (!list.some((role: string) => SALE_ROLES.has(role))) {
    throw new Error("Bạn không có quyền xem quy trình nhắc khách của workspace này");
  }
  return { canManage: list.some((role: string) => ADMIN_ROLES.has(role)) };
}

export const getNurtureSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { canManage } = await roles(context, data.tenantId);
    const { supabase } = context;

    const [settingsQ, historyQ] = await Promise.all([
      supabase
        .from("settings")
        .select("value")
        .eq("tenant_id", data.tenantId)
        .eq("key", NURTURE_KEY)
        .maybeSingle(),
      supabase
        .from("nurture_messages")
        .select("id, lead_id, step_key, channel, status, body, error_message, sent_at")
        .eq("tenant_id", data.tenantId)
        .order("sent_at", { ascending: false })
        .limit(30),
    ]);

    const history = (historyQ.data ?? []) as any[];
    const leadIds = [...new Set(history.map((row) => row.lead_id).filter(Boolean))] as string[];
    const { data: leads } = leadIds.length
      ? await supabase.from("leads").select("id, full_name, phone").in("id", leadIds)
      : { data: [] as any[] };
    const leadById = new Map(((leads ?? []) as any[]).map((row) => [row.id, row]));

    return {
      canManage,
      settings: parseNurtureSettings(settingsQ.data?.value),
      history: history.map((row) => ({
        id: row.id as string,
        step: row.step_key as string,
        channel: row.channel as string,
        status: row.status as string,
        body: (row.body as string | null) ?? "",
        error: (row.error_message as string | null) ?? null,
        sentAt: row.sent_at as string,
        leadName: (leadById.get(row.lead_id)?.full_name as string | null) ?? "Khách",
        leadPhone: (leadById.get(row.lead_id)?.phone as string | null) ?? "",
      })),
    };
  });

export const saveNurtureSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), settings: nurtureSettingsSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { canManage } = await roles(context, data.tenantId);
    if (!canManage) throw new Error("Chỉ quản trị viên được đổi quy trình nhắc khách");

    const { error } = await context.supabase
      .from("settings")
      .upsert(
        {
          tenant_id: data.tenantId,
          key: NURTURE_KEY,
          value: data.settings as never,
          updated_by: context.userId,
        } as never,
        { onConflict: "tenant_id,key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runNurtureNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { canManage } = await roles(context, data.tenantId);
    if (!canManage) throw new Error("Chỉ quản trị viên được chạy nhắc khách");

    const { runNurture } = await import("@/lib/nurture.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    let origin: string | null = null;
    try {
      origin = new URL(getRequest().url).origin;
    } catch {
      origin = null;
    }
    return await runNurture({ tenantId: data.tenantId, origin, ignoreQuietHours: true });
  });
