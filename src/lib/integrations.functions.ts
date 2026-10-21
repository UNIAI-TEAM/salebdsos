import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { INTEGRATIONS_KEY, parseIntegrationSettings } from "@/lib/integrations";
import { ADMIN_ROLES } from "@/lib/permissions";

async function assertAdmin(context: any, tenantId: string) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  if (!(data ?? []).some((r: any) => ADMIN_ROLES.has(r.role))) throw new Error("Chỉ quản trị viên được cấu hình tích hợp");
}

async function load(context: any, tenantId: string) {
  const { data } = await context.supabase
    .from("settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", INTEGRATIONS_KEY)
    .maybeSingle();
  return parseIntegrationSettings(data?.value);
}

async function save(context: any, tenantId: string, value: unknown) {
  const { error } = await context.supabase
    .from("settings")
    .upsert({ tenant_id: tenantId, key: INTEGRATIONS_KEY, value, updated_by: context.userId } as never, {
      onConflict: "tenant_id,key",
    });
  if (error) throw new Error(error.message);
}

const randomToken = (bytes: number) => {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
};

export const getIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context, data.tenantId);
    const cfg = await load(context, data.tenantId);
    const [{ data: projects }, { data: recent }] = await Promise.all([
      context.supabase.from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null).order("name"),
      context.supabase
        .from("leads")
        .select("id,full_name,phone,source,status,created_at")
        .eq("tenant_id", data.tenantId)
        .or("source.eq.zalo_oa,source.eq.facebook_lead_ads,source.like.portal:*")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);
    return {
      config: { ...cfg, portal: { ...cfg.portal, keyHash: cfg.portal.keyHash ? "set" : null } },
      projects: projects ?? [],
      recent: recent ?? [],
      env: {
        facebook: Boolean(process.env["FB_APP_SECRET"] && process.env["FB_PAGE_ACCESS_TOKEN"]),
        zalo: Boolean(process.env["ZALO_OA_SECRET"] && process.env["ZALO_APP_ID"]),
      },
    };
  });

export const saveIntegrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        defaultProjectId: z.string().uuid().nullable(),
        portalEnabled: z.boolean(),
        facebookEnabled: z.boolean(),
        facebookPageId: z.string().trim().regex(/^\d*$/).max(40).nullable(),
        formProjects: z.record(z.string().regex(/^\d+$/), z.string().uuid()).default({}),
        zaloLeadFromChat: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context, data.tenantId);
    const cfg = await load(context, data.tenantId);
    const next = {
      ...cfg,
      defaultProjectId: data.defaultProjectId,
      portal: { ...cfg.portal, enabled: data.portalEnabled },
      facebook: {
        ...cfg.facebook,
        enabled: data.facebookEnabled,
        pageId: data.facebookPageId || null,
        verifyToken: cfg.facebook.verifyToken ?? `sbds_${randomToken(16)}`,
        formProjects: data.formProjects,
      },
      zalo: { leadFromChat: data.zaloLeadFromChat },
    };
    await save(context, data.tenantId, next);
    return { ok: true };
  });

/** Tạo khoá API mới cho portal — chỉ hiện đúng một lần. */
export const rotatePortalKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context, data.tenantId);
    const { sha256 } = await import("@/lib/inbound-leads.server");
    const cfg = await load(context, data.tenantId);
    const key = `sbds_live_${randomToken(24)}`;
    await save(context, data.tenantId, {
      ...cfg,
      portal: { enabled: true, keyHash: sha256(key), keyHint: key.slice(-4), createdAt: new Date().toISOString() },
    });
    return { key };
  });
