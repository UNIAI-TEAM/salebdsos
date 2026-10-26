import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CHAT_FLOWS_KEY, chatFlowsSchema, parseChatFlows } from "@/lib/chat-flows";
import { ADMIN_ROLES, TEAM_VIEW_ROLES } from "@/lib/permissions";

async function myRoles(context: any, tenantId: string): Promise<string[]> {
  const { data } = await context.supabase.from("user_roles").select("role").eq("tenant_id", tenantId).eq("user_id", context.userId);
  return (data ?? []).map((r: any) => r.role as string);
}

export const getChatFlows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const roles = await myRoles(context, data.tenantId);
    if (!roles.some((r) => TEAM_VIEW_ROLES.has(r))) throw new Error("Bạn không có quyền xem kịch bản");
    const { data: row } = await (context as any).supabase.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", CHAT_FLOWS_KEY).maybeSingle();
    return { ...parseChatFlows(row?.value), canEdit: roles.some((r) => ADMIN_ROLES.has(r) || r === "manager") };
  });

export const saveChatFlows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), value: chatFlowsSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const roles = await myRoles(context, data.tenantId);
    if (!roles.some((r) => ADMIN_ROLES.has(r) || r === "manager")) throw new Error("Chỉ quản lý được sửa kịch bản");
    const { error } = await (context as any).supabase.from("settings").upsert(
      { tenant_id: data.tenantId, key: CHAT_FLOWS_KEY, value: data.value, updated_by: context.userId },
      { onConflict: "tenant_id,key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
