// Danh sách sale của workspace: danh thiếp riêng + QR dự án đang gắn.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SALE_ROLES = ["owner", "admin", "manager", "agent"] as const;
const MANAGE_ROLES = ["owner", "admin", "manager", "platform_admin"];
const ADMIN_ROLES = ["owner", "admin", "platform_admin"];

type AdminClient = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function assertSaleAdmin(supabase: any, userId: string, tenantId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!(data ?? []).some((row: any) => ADMIN_ROLES.includes(row.role))) {
    throw new Error("Bạn không có quyền quản lý Sale của workspace này");
  }
}

async function ensureSaleCard(
  admin: AdminClient,
  input: { tenantId: string; userId: string; name: string; role: string; company: string | null; avatarUrl?: string | null },
) {
  const { data: card } = await admin
    .from("cards")
    .select("id,slug,display_name,title,company,avatar_url,theme,deleted_at")
    .eq("tenant_id", input.tenantId)
    .eq("owner_user_id", input.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const title = ROLE_TITLE_VI[input.role] ?? "Chuyên viên kinh doanh";
  if (card) {
    const theme = (card.theme ?? {}) as Record<string, unknown>;
    const locked = new Set(Array.isArray(theme.locked) ? theme.locked as string[] : []);
    const patch: Record<string, unknown> = { deleted_at: null, is_published: true };
    if (!locked.has("display_name")) patch.display_name = input.name;
    if (!locked.has("title")) patch.title = title;
    if (!locked.has("company") && input.company) patch.company = input.company;
    if (!locked.has("avatar_url") && input.avatarUrl) patch.avatar_url = input.avatarUrl;
    const { error } = await admin.from("cards").update(patch as never).eq("id", card.id);
    if (error) throw new Error(error.message);
    return { id: card.id, created: false };
  }
  const base = slugify(input.name) || "sale";
  let slug = base;
  for (let i = 1; i < 60; i += 1) {
    const { data: clash } = await admin.from("cards").select("id").eq("slug", slug).maybeSingle();
    if (!clash) break;
    slug = `${base}-${i}`;
  }
  const { data: created, error } = await admin.from("cards").insert({
    tenant_id: input.tenantId,
    owner_user_id: input.userId,
    slug,
    display_name: input.name,
    title,
    company: input.company,
    avatar_url: input.avatarUrl ?? null,
    fields: [],
    theme: { template: "professional-dark" },
    is_published: true,
  }).select("id").single();
  if (error || !created) throw new Error(error?.message ?? "Không tạo được danh thiếp");
  return { id: created.id, created: true };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export const ROLE_TITLE_VI: Record<string, string> = {
  owner: "Giám đốc sàn",
  admin: "Quản trị sàn",
  manager: "Trưởng phòng kinh doanh",
  agent: "Chuyên viên kinh doanh",
  viewer: "Người xem",
  platform_admin: "Platform Admin",
};

export const listSalesDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("user_id, role, created_at")
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);

    const sales = (roles ?? []).filter((r) => (SALE_ROLES as readonly string[]).includes(r.role));
    const userIds = Array.from(new Set(sales.map((r) => r.user_id)));
    if (!userIds.length) return { sales: [] as any[] };

    const [{ data: profiles }, { data: cards }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email, phone, avatar_url").in("user_id", userIds),
      supabase
        .from("cards")
        .select("id, slug, owner_user_id, display_name, title, company, bio, avatar_url, fields, theme, is_published, view_count, updated_at")
        .eq("tenant_id", data.tenantId)
        .is("deleted_at", null)
        .in("owner_user_id", userIds)
        .order("created_at", { ascending: true }),
    ]);

    const cardIds = (cards ?? []).map((c) => c.id);
    let links: any[] = [];
    let projects: any[] = [];
    let qrs: any[] = [];
    if (cardIds.length) {
      const { data: cp } = await supabase
        .from("card_projects")
        .select("card_id, project_id, position")
        .in("card_id", cardIds)
        .order("position", { ascending: true });
      links = cp ?? [];
      const projectIds = Array.from(new Set(links.map((l) => l.project_id)));
      if (projectIds.length) {
        const [{ data: ps }, { data: qs }] = await Promise.all([
          supabase.from("projects").select("id, name, city, cover_url").in("id", projectIds),
          supabase
            .from("project_qr_codes")
            .select("id, project_id, code, channel, label, is_active, scan_count")
            .eq("tenant_id", data.tenantId)
            .in("project_id", projectIds)
            .eq("is_active", true)
            .order("created_at", { ascending: true }),
        ]);
        projects = ps ?? [];
        qrs = qs ?? [];
      }
    }

    const { data: pendingInvites } = await supabase
      .from("invitations")
      .select("id,email,role,status,expires_at,created_at,token")
      .eq("tenant_id", data.tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return {
      sales: userIds.map((uid) => {
        const p = profiles?.find((x) => x.user_id === uid);
        const role = sales.find((r) => r.user_id === uid)?.role ?? "agent";
        const card = (cards ?? []).find((c) => c.owner_user_id === uid) ?? null;
        const myLinks = card ? links.filter((l) => l.card_id === card.id) : [];
        return {
          userId: uid,
          role,
          fullName: p?.full_name ?? p?.email?.split("@")[0] ?? "Chưa đặt tên",
          email: p?.email ?? null,
          phone: p?.phone ?? null,
          avatarUrl: card?.avatar_url ?? p?.avatar_url ?? null,
          card: card
            ? {
                id: card.id,
                slug: card.slug,
                displayName: card.display_name,
                title: card.title,
                company: card.company,
                bio: card.bio,
                avatarUrl: card.avatar_url,
                fields: card.fields,
                theme: card.theme,
                isPublished: card.is_published,
                viewCount: card.view_count,
                updatedAt: card.updated_at,
              }
            : null,
          projects: myLinks.map((l) => {
            const pr = projects.find((x) => x.id === l.project_id);
            const qr = qrs.find((q) => q.project_id === l.project_id && q.channel === "general")
              ?? qrs.find((q) => q.project_id === l.project_id);
            return {
              projectId: l.project_id,
              name: pr?.name ?? "Dự án",
              city: pr?.city ?? null,
              coverUrl: pr?.cover_url ?? null,
              qrCode: qr?.code ?? null,
              qrScans: qr?.scan_count ?? 0,
            };
          }),
        };
      }),
      invitations: pendingInvites ?? [],
    };
  });

const saleRoleSchema = z.enum(["manager", "agent"]);

export const inviteSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    tenantId: z.string().uuid(),
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(30).optional(),
    role: saleRoleSchema,
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSaleAdmin(context.supabase, context.userId, data.tenantId);
    const { data: invitation, error } = await context.supabase.from("invitations").insert({
      tenant_id: data.tenantId,
      email: data.email.toLowerCase(),
      role: data.role,
      invited_by: context.userId,
    }).select("id,token,email,role,expires_at").single();
    if (error || !invitation) throw new Error(error?.message ?? "Không tạo được lời mời");
    return { ...invitation, fullName: data.fullName, phone: data.phone ?? null };
  });

const managedFieldSchema = z.object({
  type: z.enum(["phone", "email", "zalo", "messenger", "website", "address", "social", "cta", "link"]),
  label: z.string().min(1).max(80),
  value: z.string().max(500).nullable().optional(),
  href: z.string().max(1000).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
});

export const updateManagedSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    tenantId: z.string().uuid(),
    targetUserId: z.string().uuid(),
    profile: z.object({
      fullName: z.string().trim().min(2).max(120),
      phone: z.string().trim().max(30).nullable(),
      avatarUrl: z.string().trim().max(1000).nullable(),
      role: saleRoleSchema,
    }),
    card: z.object({
      id: z.string().uuid(),
      slug: z.string().regex(/^[a-z0-9-]+$/, "Đường dẫn không hợp lệ").min(2).max(50),
      displayName: z.string().trim().min(1).max(120),
      title: z.string().trim().max(120).nullable(),
      company: z.string().trim().max(120).nullable(),
      bio: z.string().trim().max(800).nullable(),
      avatarUrl: z.string().trim().max(1000).nullable(),
      isPublished: z.boolean(),
      fields: z.array(managedFieldSchema).max(20),
    }),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSaleAdmin(context.supabase, context.userId, data.tenantId);
    const { data: membership } = await context.supabase.from("user_roles")
      .select("id,role").eq("tenant_id", data.tenantId).eq("user_id", data.targetUserId).maybeSingle();
    if (!membership) throw new Error("Sale không thuộc workspace này");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ error: profileError }, { error: roleError }, { data: currentCard }] = await Promise.all([
      supabaseAdmin.from("profiles").update({ full_name: data.profile.fullName, phone: data.profile.phone, avatar_url: data.profile.avatarUrl } as never).eq("user_id", data.targetUserId),
      supabaseAdmin.from("user_roles").update({ role: data.profile.role } as never).eq("id", membership.id),
      supabaseAdmin.from("cards").select("theme").eq("id", data.card.id).eq("tenant_id", data.tenantId).eq("owner_user_id", data.targetUserId).maybeSingle(),
    ]);
    if (profileError) throw new Error(profileError.message);
    if (roleError) throw new Error(roleError.message);
    if (!currentCard) throw new Error("Không tìm thấy danh thiếp của Sale");
    const theme = (currentCard.theme ?? {}) as Record<string, unknown>;
    const locked = new Set(Array.isArray(theme.locked) ? theme.locked as string[] : []);
    ["display_name", "title", "company", "avatar_url"].forEach((key) => locked.add(key));
    const { error: cardError } = await supabaseAdmin.from("cards").update({
      slug: data.card.slug,
      display_name: data.card.displayName,
      title: data.card.title,
      company: data.card.company,
      bio: data.card.bio,
      avatar_url: data.card.avatarUrl,
      is_published: data.card.isPublished,
      fields: data.card.fields,
      theme: { ...theme, locked: Array.from(locked) },
    } as never).eq("id", data.card.id).eq("tenant_id", data.tenantId).eq("owner_user_id", data.targetUserId);
    if (cardError) throw new Error(cardError.message);
    return { ok: true };
  });

export const deactivateSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), targetUserId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSaleAdmin(context.supabase, context.userId, data.tenantId);
    if (context.userId === data.targetUserId) throw new Error("Bạn không thể ngừng hoạt động chính mình");
    const { data: target } = await context.supabase.from("user_roles")
      .select("id,role").eq("tenant_id", data.tenantId).eq("user_id", data.targetUserId).maybeSingle();
    if (!target) throw new Error("Sale không thuộc workspace này");
    if (target.role === "owner") {
      const { count } = await context.supabase.from("user_roles")
        .select("id", { count: "exact", head: true }).eq("tenant_id", data.tenantId).eq("role", "owner");
      if ((count ?? 0) <= 1) throw new Error("Không thể ngừng Owner cuối cùng của workspace");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const [{ error: cardError }, { error: roleError }] = await Promise.all([
      supabaseAdmin.from("cards").update({ deleted_at: now, is_published: false } as never)
        .eq("tenant_id", data.tenantId).eq("owner_user_id", data.targetUserId).is("deleted_at", null),
      supabaseAdmin.from("user_roles").delete().eq("id", target.id),
    ]);
    if (cardError) throw new Error(cardError.message);
    if (roleError) throw new Error(roleError.message);
    return { ok: true };
  });

/**
 * Đồng bộ danh thiếp cho toàn bộ sale: tạo danh thiếp còn thiếu và cập nhật
 * tên/chức danh theo hồ sơ + vai trò hiện tại.
 */
export const syncSalesCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: myRoles, error: rErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("tenant_id", data.tenantId)
      .eq("user_id", userId);
    if (rErr) throw new Error(rErr.message);
    if (!(myRoles ?? []).some((r) => MANAGE_ROLES.includes(r.role))) {
      throw new Error("Bạn không có quyền đồng bộ danh thiếp của workspace");
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", data.tenantId)
      .maybeSingle();

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("tenant_id", data.tenantId);
    const sales = (roles ?? []).filter((r) => (SALE_ROLES as readonly string[]).includes(r.role));
    const userIds = Array.from(new Set(sales.map((r) => r.user_id)));
    if (!userIds.length) return { created: 0, updated: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name, email, avatar_url")
      .in("user_id", userIds);
    let created = 0;
    let updated = 0;
    for (const uid of userIds) {
      const p = profiles?.find((x) => x.user_id === uid);
      const role = sales.find((r) => r.user_id === uid)?.role ?? "agent";
      const name = p?.full_name || p?.email?.split("@")[0] || "Chuyên viên";
      const company = tenant?.name ?? null;
      const result = await ensureSaleCard(supabaseAdmin, { tenantId: data.tenantId, userId: uid, name, role, company, avatarUrl: p?.avatar_url });
      if (result.created) created += 1;
      else updated += 1;
    }
    return { created, updated };
  });
