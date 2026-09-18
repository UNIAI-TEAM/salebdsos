// Đọc / lưu cấu hình phân phối lead cho quản lý sàn
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  LEAD_ROUTING_KEY,
  leadRoutingSchema,
  parseLeadRouting,
} from "@/lib/lead-routing";

const MANAGER_ROLES = new Set(["owner", "admin", "manager", "platform_admin"]);
const SALE_ROLES = new Set(["owner", "admin", "manager", "agent"]);

async function assertManager(
  supabase: { from: (t: "user_roles") => any },
  tenantId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const ok = (data ?? []).some((row: { role: string }) => MANAGER_ROLES.has(row.role));
  if (!ok) throw new Error("Bạn không có quyền cấu hình phân phối lead");
}

export const getLeadRouting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase as never, data.tenantId, userId);

    const [settingQ, rolesQ, projectsQ] = await Promise.all([
      supabase.from("settings").select("value,updated_at").eq("tenant_id", data.tenantId).eq("key", LEAD_ROUTING_KEY).maybeSingle(),
      supabase.from("user_roles").select("user_id,role").eq("tenant_id", data.tenantId),
      supabase.from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null).order("name"),
    ]);
    if (rolesQ.error) throw new Error(rolesQ.error.message);
    if (projectsQ.error) throw new Error(projectsQ.error.message);

    const roleRows = (rolesQ.data ?? []).filter((row) => SALE_ROLES.has(row.role));
    const ids = [...new Set(roleRows.map((row) => row.user_id))];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("user_id,full_name,email").in("user_id", ids)
      : { data: [] };

    const members = ids.map((id) => {
      const profile = profiles?.find((item) => item.user_id === id);
      const role = roleRows.find((row) => row.user_id === id)?.role ?? "agent";
      return {
        userId: id,
        name: profile?.full_name || profile?.email?.split("@")[0] || "Sale",
        role,
      };
    }).sort((a, b) => a.name.localeCompare(b.name, "vi"));

    return {
      config: parseLeadRouting(settingQ.data?.value),
      updatedAt: settingQ.data?.updated_at ?? null,
      members,
      projects: projectsQ.data ?? [],
    };
  });

export const saveLeadRouting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; config: unknown }) =>
    z.object({ tenantId: z.string().uuid(), config: leadRoutingSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase as never, data.tenantId, userId);

    const { error } = await supabase.from("settings").upsert(
      {
        tenant_id: data.tenantId,
        key: LEAD_ROUTING_KEY,
        value: data.config,
        updated_by: userId,
      },
      { onConflict: "tenant_id,key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
