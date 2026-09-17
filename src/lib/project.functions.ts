// Real Estate Project Management — server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProjectInput = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  developer: z.string().max(200).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  property_type: z.string().max(80).optional().nullable(),
  status: z.string().max(40).optional().nullable(),
  price_from: z.number().nonnegative().optional().nullable(),
  price_to: z.number().nonnegative().optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  cover_url: z.string().url().max(1000).optional().nullable(),
  cover_mobile_url: z.string().url().max(1000).optional().nullable(),
  brochure_url: z.string().url().max(1000).optional().nullable(),
  brochure_name: z.string().max(255).optional().nullable(),
  sales_policy: z.string().max(5000).optional().nullable(),
  cta_phone: z.string().max(40).optional().nullable(),
  cta_form_enabled: z.boolean().optional(),
  unit_highlights: z.array(z.string().min(1).max(200)).max(20).optional(),
  gallery: z.array(z.string().url().max(1000)).max(40).optional(),
  gallery_mobile: z.array(z.string().url().max(1000)).max(40).optional(),
});

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; q?: string; status?: string }) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("projects")
      .select("id,name,developer,location,city,property_type,status,price_from,price_to,currency,cover_url,cover_mobile_url,created_at")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: p, error } = await context.supabase
      .from("projects").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!p) throw new Error("Project not found");
    const { data: links } = await context.supabase
      .from("card_projects")
      .select("card_id, position, cards:card_id(id, display_name, slug, avatar_url, is_published)")
      .eq("project_id", data.id);
    return { project: p, cards: (links ?? []).map((l: any) => ({ ...l.cards, position: l.position })) };
  });

async function ensureGeneralQr(supabase: any, row: any, userId: string) {
  if (!row?.id) return;
  const { data: existing } = await supabase
    .from("project_qr_codes").select("id").eq("project_id", row.id).limit(1);
  if (existing && existing.length > 0) return;
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let code = "";
    for (let i = 0; i < 8; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    const { error: qrErr } = await supabase.from("project_qr_codes").insert({
      tenant_id: row.tenant_id,
      project_id: row.id,
      code,
      channel: "general",
      label: "QR chung",
      created_by: userId,
    });
    if (!qrErr) break;
    if (!/duplicate|unique/i.test(qrErr.message)) {
      console.error("[project] auto QR", qrErr.message);
      break;
    }
  }
}

const slugifyVi = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const money = (v: number | null, cur: string) =>
  v == null ? null : `${new Intl.NumberFormat("vi-VN").format(v)} ${cur}`;

/**
 * Tự sinh landing công khai cho dự án nếu chưa có, để mã QR trỏ trực tiếp
 * vào landing thay vì sale phải tạo & gán tay.
 */
async function ensureProjectLanding(supabase: any, row: any, userId: string) {
  if (!row?.id) return;
  const { data: existing } = await supabase
    .from("ai_sales_pages")
    .select("id,slug,is_published")
    .eq("project_id", row.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.slug && existing.is_published) return;
  if (existing?.id) {
    // Đã có landing nhưng chưa công khai / chưa có link → hoàn thiện.
    const base = slugifyVi(row.name || "du-an") || "du-an";
    const slug = existing.slug || `${base}-${existing.id.slice(0, 6)}`;
    const { error } = await supabase
      .from("ai_sales_pages")
      .update({ slug, is_published: true, status: "published" })
      .eq("id", existing.id);
    if (error) console.error("[project] auto landing publish", error.message);
    return;
  }

  const cur = row.currency || "VND";
  const highlights = Array.isArray(row.unit_highlights)
    ? (row.unit_highlights as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const gallery = Array.isArray(row.gallery)
    ? (row.gallery as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const priceLine =
    money(row.price_from ?? null, cur) && money(row.price_to ?? null, cur)
      ? `Giá từ ${money(row.price_from, cur)} đến ${money(row.price_to, cur)}`
      : money(row.price_from ?? null, cur)
        ? `Giá từ ${money(row.price_from, cur)}`
        : null;

  const output = {
    headline: row.name,
    subheadline:
      [row.developer, row.location ?? row.city, row.property_type].filter(Boolean).join(" • ") ||
      "Dự án bất động sản",
    benefits: highlights.length
      ? highlights.slice(0, 6)
      : [priceLine, row.location ?? row.city, row.status].filter(Boolean),
    offer: priceLine,
    cta_primary: "Nhận tư vấn ngay",
    form_intro: "Để lại thông tin, chuyên viên sẽ liên hệ tư vấn chi tiết.",
    hero_image_url: row.cover_url ?? null,
    hero_image_mobile_url: row.cover_mobile_url ?? null,
    gallery,
    gallery_mobile: Array.isArray(row.gallery_mobile) ? row.gallery_mobile : [],
    brochure_url: row.brochure_url ?? null,
    brochure_name: row.brochure_name ?? null,
    auto_generated: true,
  };

  const { data: page, error } = await supabase
    .from("ai_sales_pages")
    .insert({
      tenant_id: row.tenant_id,
      owner_user_id: userId,
      project_id: row.id,
      title: row.name,
      tone: "professional",
      cta: "Nhận tư vấn ngay",
      output,
      status: "generated",
    })
    .select("id")
    .single();
  if (error || !page) {
    console.error("[project] auto landing", error?.message);
    return;
  }

  const base = slugifyVi(row.name || "du-an") || "du-an";
  for (let i = 0; i < 5; i += 1) {
    const slug = i === 0 ? `${base}-${page.id.slice(0, 6)}` : `${base}-${page.id.slice(0, 6)}-${i}`;
    const { error: pErr } = await supabase
      .from("ai_sales_pages")
      .update({ slug, is_published: true, status: "published" })
      .eq("id", page.id);
    if (!pErr) return;
    if (!/duplicate|unique/i.test(pErr.message)) {
      console.error("[project] auto landing slug", pErr.message);
      return;
    }
  }
}

export const upsertProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ProjectInput.parse(i))
  .handler(async ({ data, context }) => {
    const payload = { ...data, unit_highlights: data.unit_highlights ?? [], gallery: data.gallery ?? [], gallery_mobile: data.gallery_mobile ?? [] };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("projects").update(payload).eq("id", data.id).select().single();
      if (error) throw error;
      await ensureGeneralQr(context.supabase, row, context.userId);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("projects").insert(payload).select().single();
    if (error) throw error;
    await ensureGeneralQr(context.supabase, row, context.userId);
    return row;
  });

export const softDeleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const attachCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; cardId: string; tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("card_projects").upsert({
      project_id: data.projectId, card_id: data.cardId, tenant_id: data.tenantId,
    }, { onConflict: "card_id,project_id" });
    if (error) throw error;
    return { ok: true };
  });

export const detachCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; cardId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("card_projects").delete()
      .eq("project_id", data.projectId).eq("card_id", data.cardId);
    if (error) throw error;
    return { ok: true };
  });

// Performance: top-viewed projects + leads per project (tenant-scoped)
export const getProjectPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; days?: number }) => d)
  .handler(async ({ data, context }) => {
    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

    const { data: projects } = await context.supabase
      .from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null);
    const list = projects ?? [];
    if (list.length === 0) return { topViewed: [], leadsByProject: [] };

    // Views: project -> linked cards -> sum analytics_daily.event_count
    const { data: links } = await context.supabase
      .from("card_projects").select("project_id, card_id").eq("tenant_id", data.tenantId);
    const cardToProject = new Map<string, string>();
    (links ?? []).forEach((l) => cardToProject.set(l.card_id, l.project_id));
    const cardIds = Array.from(cardToProject.keys());

    const viewsByProject = new Map<string, number>();
    if (cardIds.length) {
      const { data: agg } = await context.supabase
        .from("analytics_daily").select("card_id, event_count, day")
        .in("card_id", cardIds).gte("day", since);
      (agg ?? []).forEach((r) => {
        const pid = cardToProject.get(r.card_id);
        if (pid) viewsByProject.set(pid, (viewsByProject.get(pid) ?? 0) + r.event_count);
      });
    }

    // Leads count
    const { data: leads } = await context.supabase
      .from("leads").select("project_id").eq("tenant_id", data.tenantId).not("project_id", "is", null);
    const leadsByProject = new Map<string, number>();
    (leads ?? []).forEach((l) => {
      if (l.project_id) leadsByProject.set(l.project_id, (leadsByProject.get(l.project_id) ?? 0) + 1);
    });

    const topViewed = list
      .map((p) => ({ id: p.id, name: p.name, views: viewsByProject.get(p.id) ?? 0 }))
      .sort((a, b) => b.views - a.views).slice(0, 10);
    const leadsList = list
      .map((p) => ({ id: p.id, name: p.name, leads: leadsByProject.get(p.id) ?? 0 }))
      .sort((a, b) => b.leads - a.leads).slice(0, 10);

    return { topViewed, leadsByProject: leadsList };
  });

export const getMyCardsForAttach = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: cards } = await context.supabase
      .from("cards").select("id, display_name, slug, avatar_url")
      .eq("tenant_id", data.tenantId).is("deleted_at", null).order("created_at", { ascending: false });
    return cards ?? [];
  });
