import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { brandingSchema,validLogo,BRAND_COPY } from './tenant-branding';
import { ADMIN_ROLES } from './permissions';

export const SETTING_KEYS = ["general", "notifications", "branding", "business"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

const generalSchema = z.object({
  workspace_name: z.string().trim().max(120).optional().default(""),
  timezone: z.string().trim().max(64).optional().default("Asia/Ho_Chi_Minh"),
  locale: z.enum(["vi", "en"]).optional().default("vi"),
  currency: z.enum(["VND", "USD"]).optional().default("VND"),
});
const notificationsSchema = z.object({
  email_enabled: z.boolean().optional().default(true),
  push_enabled: z.boolean().optional().default(true),
  inapp_enabled: z.boolean().optional().default(true),
  digest_frequency: z.enum(["off", "daily", "weekly"]).optional().default("daily"),
});
async function brandingAccess(context:any,tenantId:string,write=false){
 const {data,error}=await context.supabase.from('user_roles').select('role').eq('tenant_id',tenantId).eq('user_id',context.userId);
 if(error||!data?.length||(write&&!data.some((r:any)=>ADMIN_ROLES.has(r.role))))throw new Error('Bạn không có quyền cấu hình thương hiệu sàn này.');
}
const businessSchema = z.object({
  working_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional().default("08:00"),
  working_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional().default("18:00"),
  lead_auto_assign: z.boolean().optional().default(false),
  default_lead_source: z.string().trim().max(64).optional().default(""),
});

export const SETTING_SCHEMAS = {
  general: generalSchema,
  notifications: notificationsSchema,
  branding: brandingSchema,
  business: businessSchema,
} as const;

export type SettingsMap = {
  general: z.infer<typeof generalSchema>;
  notifications: z.infer<typeof notificationsSchema>;
  branding: z.infer<typeof brandingSchema>;
  business: z.infer<typeof businessSchema>;
};

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) =>
    z.object({ tenantId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("settings")
      .select("key, value, updated_at, updated_by")
      .eq("tenant_id", data.tenantId)
      .in("key", SETTING_KEYS as unknown as string[]);
    if (error) throw new Error(error.message);
    const map: SettingsMap = {
      general: generalSchema.parse({}),
      notifications: notificationsSchema.parse({}),
      branding: brandingSchema.parse({}),
      business: businessSchema.parse({}),
    };
    let updatedAt: string | null = null;
    for (const row of rows ?? []) {
      const key = row.key as SettingKey;
      if (!SETTING_KEYS.includes(key)) continue;
      const schema = SETTING_SCHEMAS[key];
      const parsed = schema.safeParse(row.value ?? {});
      if (parsed.success) (map as Record<string, unknown>)[key] = parsed.data;
      if (!updatedAt || (row.updated_at && row.updated_at > updatedAt)) updatedAt = row.updated_at;
    }
    return { settings: map, updated_at: updatedAt };
  });

export const updateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; key: SettingKey; value: unknown }) => {
    const base = z.object({
      tenantId: z.string().uuid(),
      key: z.enum(SETTING_KEYS),
    }).parse({ tenantId: d.tenantId, key: d.key });
    const schema = SETTING_SCHEMAS[base.key];
    const value = schema.parse(d.value ?? {});
    return { ...base, value };
  })
  .handler(async ({ context, data }) => {
    await brandingAccess(context,data.tenantId,true);
    const { error } = await context.supabase
      .from("settings")
      .upsert(
        {
          tenant_id: data.tenantId,
          key: data.key,
          value: data.value,
          updated_by: context.userId,
        },
        { onConflict: "tenant_id,key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; key: SettingKey }) =>
    z.object({ tenantId: z.string().uuid(), key: z.enum(SETTING_KEYS) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await brandingAccess(context,data.tenantId,true);
    const { error } = await context.supabase
      .from("settings")
      .delete()
      .eq("tenant_id", data.tenantId)
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getTenantBranding=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({tenantId:z.string().uuid()}).parse(d)).handler(async({data,context})=>{
 await brandingAccess(context,data.tenantId);
 const {supabaseAdmin:sb}=await import('@/integrations/supabase/client.server');
 const {data:row,error}=await sb.from('settings').select('value').eq('tenant_id',data.tenantId).eq('key','branding').maybeSingle();
 if(error)throw new Error('Không tải được thương hiệu sàn.');
 const result=brandingSchema.safeParse(row?.value??{});return result.success?result.data:brandingSchema.parse({});
});
export const uploadTenantLogo=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({tenantId:z.string().uuid(),mime:z.enum(['image/png','image/jpeg','image/webp']),base64:z.string().max(2800000)}).parse(d)).handler(async({data,context})=>{
 await brandingAccess(context,data.tenantId,true);
 const bytes=Uint8Array.from(atob(data.base64),v=>v.charCodeAt(0));
 if(!validLogo(bytes,data.mime))throw new Error(BRAND_COPY.invalid);
 const {supabaseAdmin:sb}=await import('@/integrations/supabase/client.server');
 const extension=data.mime==='image/png'?'png':data.mime==='image/jpeg'?'jpg':'webp';
 const path=`${data.tenantId}/branding/${crypto.randomUUID()}.${extension}`;
 const {error}=await sb.storage.from('project-assets').upload(path,bytes,{contentType:data.mime,upsert:false});
 if(error)throw new Error('Không tải được logo.');
 // Browser-visible URLs must use the browser origin, never the server-local backend.
 const origin=import.meta.env.VITE_SUPABASE_URL;
 return {url:`${origin}/storage/v1/object/public/project-assets/${path}`};
});
