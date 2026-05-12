import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const fieldSchema = z.object({
  type: z.enum(["phone", "email", "zalo", "messenger", "website", "address", "social", "cta", "link"]).default("link"),
  label: z.string().min(1).max(80),
  value: z.string().max(500).optional().nullable(),
  href: z.string().max(1000).optional().nullable(),
  icon: z.string().max(40).optional().nullable(),
});

const projectSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional().nullable(),
  image: z.string().max(1000).optional().nullable(),
  href: z.string().max(1000).optional().nullable(),
  price: z.string().max(80).optional().nullable(),
});

const themeSchema = z.object({
  template: z.string().max(40).optional(),
  primary: z.string().max(20).optional(),
  background: z.string().max(40).optional(),
  font: z.string().max(40).optional(),
}).partial();

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export const listMyCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) =>
    z.object({ tenantId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("cards")
      .select("id, slug, display_name, title, company, avatar_url, view_count, is_published, updated_at")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getOrCreateMyCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) =>
    z.object({ tenantId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("cards")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .eq("owner_user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing) return existing;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    const baseName = profile?.full_name || profile?.email?.split("@")[0] || "thanh-vien";
    let baseSlug = slugify(baseName) || "thanh-vien";
    let slug = baseSlug;
    for (let i = 1; i < 50; i++) {
      const { data: clash } = await supabase
        .from("cards")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${baseSlug}-${i}`;
    }

    const { data: created, error } = await supabase
      .from("cards")
      .insert({
        tenant_id: data.tenantId,
        owner_user_id: userId,
        slug,
        display_name: profile?.full_name || "Họ và tên",
        avatar_url: profile?.avatar_url,
        fields: [],
        theme: { template: "luxury-dark", primary: "#A855F7", background: "skyline" },
        is_published: true,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

const updateInput = z.object({
  id: z.string().uuid(),
  patch: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/, "slug không hợp lệ").min(2).max(50).optional(),
    display_name: z.string().min(1).max(120).optional(),
    title: z.string().max(120).nullable().optional(),
    company: z.string().max(120).nullable().optional(),
    bio: z.string().max(800).nullable().optional(),
    avatar_url: z.string().max(1000).nullable().optional(),
    is_published: z.boolean().optional(),
    fields: z.array(fieldSchema).max(50).optional(),
    theme: themeSchema.optional(),
  }),
});

export const updateMyCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof updateInput>) => updateInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("cards")
      .update(data.patch as any)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const checkSlugAvailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; excludeId?: string }) =>
    z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(50),
      excludeId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("cards").select("id").eq("slug", data.slug);
    if (data.excludeId) q = q.neq("id", data.excludeId);
    const { data: row } = await q.maybeSingle();
    return { available: !row };
  });
