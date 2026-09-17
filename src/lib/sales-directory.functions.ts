// Danh sách sale của workspace: danh thiếp riêng + QR dự án đang gắn.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SALE_ROLES = ["owner", "admin", "manager", "agent"] as const;
const MANAGE_ROLES = ["owner", "admin", "manager", "platform_admin"];

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
        .select("id, slug, owner_user_id, display_name, title, company, avatar_url, is_published, view_count, updated_at")
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
    };
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
    const { data: cards } = await supabaseAdmin
      .from("cards")
      .select("id, owner_user_id, display_name, title, company, avatar_url")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .in("owner_user_id", userIds);

    let created = 0;
    let updated = 0;
    for (const uid of userIds) {
      const p = profiles?.find((x) => x.user_id === uid);
      const role = sales.find((r) => r.user_id === uid)?.role ?? "agent";
      const name = p?.full_name || p?.email?.split("@")[0] || "Chuyên viên";
      const title = ROLE_TITLE_VI[role] ?? "Chuyên viên kinh doanh";
      const company = tenant?.name ?? null;
      const card = cards?.find((c) => c.owner_user_id === uid);

      if (!card) {
        let base = slugify(name) || "sale";
        let slug = base;
        for (let i = 1; i < 60; i += 1) {
          const { data: clash } = await supabaseAdmin.from("cards").select("id").eq("slug", slug).maybeSingle();
          if (!clash) break;
          slug = `${base}-${i}`;
        }
        const { error } = await supabaseAdmin.from("cards").insert({
          tenant_id: data.tenantId,
          owner_user_id: uid,
          slug,
          display_name: name,
          title,
          company,
          avatar_url: p?.avatar_url ?? null,
          fields: [],
          theme: { template: "professional-dark" },
          is_published: true,
        });
        if (!error) created += 1;
        continue;
      }

      const patch: Record<string, any> = {};
      if (p?.full_name && card.display_name !== p.full_name) patch['display_name'] = p.full_name;
      if (!card.title) patch['title'] = title;
      if (!card.company && company) patch['company'] = company;
      if (!card.avatar_url && p?.avatar_url) patch['avatar_url'] = p.avatar_url;
      if (Object.keys(patch).length) {
        const { error } = await supabaseAdmin.from("cards").update(patch as any).eq("id", card.id);
        if (!error) updated += 1;
      }
    }
    return { created, updated };
  });
