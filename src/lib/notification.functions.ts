// Thông báo trong app (chuông): khách mới từ landing, v.v.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT = "id,tenant_id,user_id,type,title,body,link,lead_id,is_read,created_at";

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; limit?: number }) =>
    z.object({ tenantId: z.string().uuid(), limit: z.number().int().min(1).max(50).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: items, error } = await context.supabase
      .from("notifications")
      .select(SELECT)
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 20);
    if (error) throw new Error(error.message);
    const rows = items ?? [];
    return { items: rows, unread: rows.filter((r: any) => !r.is_read).length };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("tenant_id", data.tenantId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
