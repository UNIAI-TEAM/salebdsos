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

/** Chức danh mặc định theo vai trò trong workspace */
const ROLE_TITLE: Record<string, string> = {
  owner: "Giám đốc sàn",
  admin: "Quản trị sàn",
  manager: "Trưởng phòng kinh doanh",
  agent: "Chuyên viên kinh doanh",
  viewer: "Thành viên",
  platform_admin: "Platform Admin",
};

export const getOrCreateMyCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) =>
    z.object({ tenantId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const [{ data: existing }, { data: profile }, { data: roleRow }, { data: tenant }] = await Promise.all([
      supabase
        .from("cards")
        .select("*")
        .eq("tenant_id", data.tenantId)
        .eq("owner_user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from("profiles").select("full_name, email, phone, avatar_url").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("tenant_id", data.tenantId).eq("user_id", userId).limit(1).maybeSingle(),
      supabase.from("tenants").select("name").eq("id", data.tenantId).maybeSingle(),
    ]);

    const autoName = profile?.full_name || profile?.email?.split("@")[0] || "Họ và tên";
    const autoTitle = ROLE_TITLE[roleRow?.role ?? "agent"] ?? "Chuyên viên kinh doanh";
    const autoCompany = tenant?.name ?? null;
    const autoAvatar = profile?.avatar_url ?? null;

    if (existing) {
      // Tự đồng bộ từ hồ sơ, trừ các trường sale đã tự sửa (theme.locked)
      const theme = (existing.theme ?? {}) as Record<string, unknown>;
      const locked = new Set(Array.isArray(theme.locked) ? (theme.locked as string[]) : []);
      const patch: Record<string, unknown> = {};
      if (!locked.has("display_name") && autoName && existing.display_name !== autoName) patch.display_name = autoName;
      if (!locked.has("title") && existing.title !== autoTitle) patch.title = autoTitle;
      if (!locked.has("company") && autoCompany && existing.company !== autoCompany) patch.company = autoCompany;
      if (!locked.has("avatar_url") && autoAvatar && existing.avatar_url !== autoAvatar) patch.avatar_url = autoAvatar;
      if (!Object.keys(patch).length) return existing;
      const { data: synced } = await supabase
        .from("cards")
        .update(patch as never)
        .eq("id", existing.id)
        .select("*")
        .single();
      return synced ?? existing;
    }

    let baseSlug = slugify(autoName) || "thanh-vien";
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
        display_name: autoName,
        title: autoTitle,
        company: autoCompany,
        avatar_url: autoAvatar,
        fields: [
          ...(profile?.phone ? [{ type: "phone", label: "Gọi điện", value: profile.phone, href: `tel:${profile.phone}` }] : []),
          ...(profile?.email ? [{ type: "email", label: "Email", value: profile.email, href: `mailto:${profile.email}` }] : []),
        ],
        theme: { template: "professional-dark", primary: "#2F6BFF", background: "skyline" },
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

/* ===================== Nhiều danh thiếp: tạo / xoá ===================== */

export const createCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        displayName: z.string().trim().min(1).max(120),
        title: z.string().trim().max(120).optional(),
        company: z.string().trim().max(120).optional(),
        templateId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const base = slugify(data.displayName) || "danh-thiep";
    let slug = base;
    for (let i = 1; i < 60; i++) {
      const { data: clash } = await supabase.from("cards").select("id").eq("slug", slug).maybeSingle();
      if (!clash) break;
      slug = `${base}-${i}`;
    }
    let theme: Record<string, unknown> = { template: "luxury-dark", primary: "#A855F7", background: "skyline" };
    if (data.templateId) {
      const { data: tpl } = await supabase
        .from("card_templates")
        .select("theme")
        .eq("id", data.templateId)
        .maybeSingle();
      if (tpl?.theme) theme = tpl.theme as Record<string, unknown>;
    }
    const { data: row, error } = await supabase
      .from("cards")
      .insert({
        tenant_id: data.tenantId,
        owner_user_id: userId,
        slug,
        display_name: data.displayName,
        title: data.title ?? null,
        company: data.company ?? null,
        fields: [],
        theme,
        template_id: data.templateId ?? null,
        is_published: false,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("cards")
      .update({ deleted_at: new Date().toISOString(), is_published: false } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("cards")
      .select("*")
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/* ===================== Khối nội dung (card_blocks) ===================== */

export const BLOCK_TYPES = ["about", "projects", "gallery", "video", "testimonial", "form", "links", "map"] as const;

export const BLOCK_TYPE_LABEL_VI: Record<(typeof BLOCK_TYPES)[number], string> = {
  about: "Giới thiệu",
  projects: "Dự án",
  gallery: "Thư viện ảnh",
  video: "Video",
  testimonial: "Nhận xét khách hàng",
  form: "Form nhận thông tin",
  links: "Liên kết",
  map: "Bản đồ",
};

const BLOCK_SELECT = "id,tenant_id,card_id,block_type,position,config,is_visible,created_at,updated_at";

export const listCardBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cardId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("card_blocks")
      .select(BLOCK_SELECT)
      .eq("card_id", data.cardId)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const upsertCardBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        tenantId: z.string().uuid(),
        cardId: z.string().uuid(),
        blockType: z.enum(BLOCK_TYPES),
        position: z.number().int().min(0).max(200).optional(),
        isVisible: z.boolean().optional(),
        config: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    if (data.id) {
      const patch: Record<string, unknown> = {
        block_type: data.blockType,
        config: data.config,
      };
      if (data.position !== undefined) patch.position = data.position;
      if (data.isVisible !== undefined) patch.is_visible = data.isVisible;
      const { data: row, error } = await supabase
        .from("card_blocks")
        .update(patch as never)
        .eq("id", data.id)
        .select(BLOCK_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    let position = data.position;
    if (position === undefined) {
      const { data: last } = await supabase
        .from("card_blocks")
        .select("position")
        .eq("card_id", data.cardId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      position = (last?.position ?? -1) + 1;
    }
    const { data: row, error } = await supabase
      .from("card_blocks")
      .insert({
        tenant_id: data.tenantId,
        card_id: data.cardId,
        block_type: data.blockType,
        position,
        config: data.config,
        is_visible: data.isVisible ?? true,
      } as never)
      .select(BLOCK_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCardBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("card_blocks")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderCardBlocks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ order: z.array(z.object({ id: z.string().uuid(), position: z.number().int().min(0) })).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    for (const item of data.order) {
      const { error } = await context.supabase
        .from("card_blocks")
        .update({ position: item.position } as never)
        .eq("id", item.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* ===================== Mẫu danh thiếp (card_templates) ===================== */

const TPL_SELECT = "id,tenant_id,name,description,preview_url,theme,is_global,created_at,updated_at";

export const listCardTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("card_templates")
      .select(TPL_SELECT)
      .or(`tenant_id.eq.${data.tenantId},is_global.eq.true`)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const saveCardTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        tenantId: z.string().uuid(),
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(400).optional(),
        theme: themeSchema,
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const payload = {
      tenant_id: data.tenantId,
      name: data.name,
      description: data.description ?? null,
      theme: data.theme,
      is_global: false,
    };
    const q = data.id
      ? context.supabase.from("card_templates").update(payload as never).eq("id", data.id)
      : context.supabase.from("card_templates").insert(payload as never);
    const { data: row, error } = await q.select(TPL_SELECT).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCardTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("card_templates")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const applyCardTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cardId: z.string().uuid(), templateId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: tpl, error: tplErr } = await supabase
      .from("card_templates")
      .select("theme")
      .eq("id", data.templateId)
      .maybeSingle();
    if (tplErr) throw new Error(tplErr.message);
    if (!tpl) throw new Error("Không tìm thấy mẫu");
    const { data: row, error } = await supabase
      .from("cards")
      .update({ theme: tpl.theme, template_id: data.templateId } as never)
      .eq("id", data.cardId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
