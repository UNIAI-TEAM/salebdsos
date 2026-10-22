import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SOCIAL_KEY, parseSocialSettings, socialSettingsSchema } from "@/lib/social";
import { ADMIN_ROLES, TEAM_VIEW_ROLES } from "@/lib/permissions";

async function myRoles(context: any, tenantId: string): Promise<string[]> {
  const { data } = await context.supabase.from("user_roles").select("role")
    .eq("tenant_id", tenantId).eq("user_id", context.userId);
  return (data ?? []).map((r: any) => r.role as string);
}

export const getSocialAutomation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const roles = await myRoles(context, data.tenantId);
    if (!roles.some((r) => TEAM_VIEW_ROLES.has(r))) throw new Error("Bạn không có quyền xem tự động hoá Fanpage");
    const sb = (context as any).supabase;
    const [settingsQ, integQ, logsQ, projectsQ] = await Promise.all([
      sb.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", SOCIAL_KEY).maybeSingle(),
      sb.from("settings").select("value").eq("tenant_id", data.tenantId).eq("key", "integrations").maybeSingle(),
      sb.from("social_comment_logs").select("id,post_id,author_name,message,phone,hidden,replied,messaged,lead_id,errors,created_at")
        .eq("tenant_id", data.tenantId).order("created_at", { ascending: false }).limit(50),
      sb.from("projects").select("id,name").eq("tenant_id", data.tenantId).order("name"),
    ]);
    const logs = (logsQ.data ?? []) as any[];
    const { facebookCreds } = await import("@/lib/credentials.server");
    const fb = await facebookCreds(data.tenantId);
    return {
      settings: parseSocialSettings(settingsQ.data?.value),
      pageId: (integQ.data?.value as any)?.facebook?.pageId ?? null,
      connected: Boolean(fb.appSecret && fb.pageToken),
      canEdit: roles.some((r) => ADMIN_ROLES.has(r)),
      projects: (projectsQ.data ?? []) as { id: string; name: string }[],
      logs,
      totals: {
        comments: logs.length,
        hidden: logs.filter((l) => l.hidden).length,
        leads: logs.filter((l) => l.lead_id).length,
        messaged: logs.filter((l) => l.messaged).length,
      },
    };
  });

export const saveSocialAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), settings: socialSettingsSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const roles = await myRoles(context, data.tenantId);
    if (!roles.some((r) => ADMIN_ROLES.has(r))) throw new Error("Chỉ quản trị viên được cấu hình");
    const { error } = await (context as any).supabase.from("settings").upsert(
      { tenant_id: data.tenantId, key: SOCIAL_KEY, value: data.settings, updated_by: context.userId },
      { onConflict: "tenant_id,key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
