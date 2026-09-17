// QR riêng của mỗi sale: tự tạo danh thiếp khi đăng nhập, lấy khách quét QR,
// và chuyển khách quét QR thành khách hàng (tự đồng bộ timeline).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const QR_SOURCES = ["QR danh thiếp", "qr_card", "qr"];

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Đảm bảo sale đang đăng nhập luôn có danh thiếp + QR riêng */
export const ensureMyQrCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("cards")
      .select("id, slug, display_name, title, avatar_url, is_published")
      .eq("tenant_id", data.tenantId)
      .eq("owner_user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing) return existing;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url, phone")
      .eq("user_id", userId)
      .maybeSingle();

    const baseName = profile?.full_name || profile?.email?.split("@")[0] || "sale";
    const baseSlug = slugify(baseName) || "sale";
    let slug = baseSlug;
    for (let i = 1; i < 50; i++) {
      const { data: clash } = await supabase.from("cards").select("id").eq("slug", slug).maybeSingle();
      if (!clash) break;
      slug = `${baseSlug}-${i}`;
    }

    const { data: created, error } = await supabase
      .from("cards")
      .insert({
        tenant_id: data.tenantId,
        owner_user_id: userId,
        slug,
        display_name: profile?.full_name || "Chuyên viên tư vấn",
        avatar_url: profile?.avatar_url ?? null,
        fields: profile?.phone
          ? [
              { type: "phone", label: "Gọi", value: profile.phone },
              { type: "zalo", label: "Zalo", value: profile.phone },
            ]
          : [],
        theme: { template: "luxury-dark", primary: "#A855F7", background: "skyline" },
        is_published: true,
      })
      .select("id, slug, display_name, title, avatar_url, is_published")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("audit_logs").insert({
      tenant_id: data.tenantId,
      actor_user_id: userId,
      action: "card.created",
      entity: "card",
      entity_id: created.id,
      diff: { display_name: created.display_name, slug: created.slug },
    });

    return created;
  });

/** Khách đã quét QR của tôi và để lại thông tin, chưa chuyển thành khách hàng */
export const listMyQrLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        limit: z.number().int().min(5).max(100).default(30),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("leads")
      .select("id, full_name, phone, email, source, status, notes, meta, created_at, project_id")
      .eq("tenant_id", data.tenantId)
      .eq("owner_user_id", userId)
      .in("source", QR_SOURCES)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const list = rows ?? [];
    const projectIds = [...new Set(list.map((l) => l.project_id).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (projectIds.length) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);
      (projects ?? []).forEach((p) => names.set(p.id, p.name));
    }

    return list.map((l) => ({
      id: l.id,
      full_name: l.full_name,
      phone: l.phone,
      email: l.email,
      created_at: l.created_at,
      project_name: l.project_id ? names.get(l.project_id) ?? null : null,
      converted_customer_id: ((l.meta as any)?.converted_customer_id as string | undefined) ?? null,
    }));
  });

/** Chuyển khách quét QR thành khách hàng — ghi timeline */
export const convertQrLeadToCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), leadId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, full_name, phone, email, notes, meta, project_id, tenant_id, owner_user_id")
      .eq("id", data.leadId)
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (leadErr) throw new Error(leadErr.message);
    if (!lead) throw new Error("Không tìm thấy khách này");

    const existingId = (lead.meta as any)?.converted_customer_id as string | undefined;
    if (existingId) return { customerId: existingId, created: false };

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        tenant_id: data.tenantId,
        owner_user_id: lead.owner_user_id ?? userId,
        full_name: lead.full_name || lead.phone || "Khách quét QR",
        phone: lead.phone,
        email: lead.email,
        notes: lead.notes,
        tags: ["QR danh thiếp"],
      })
      .select("id, full_name, phone")
      .single();
    if (error) throw new Error(error.message);

    await supabase
      .from("leads")
      .update({
        status: "contacted",
        meta: { ...((lead.meta as any) ?? {}), converted_customer_id: customer.id },
      })
      .eq("id", lead.id)
      .eq("tenant_id", data.tenantId);

    await supabase.from("audit_logs").insert({
      tenant_id: data.tenantId,
      actor_user_id: userId,
      action: "customer.created",
      entity: "customer",
      entity_id: customer.id,
      diff: { full_name: customer.full_name, phone: customer.phone, from: "QR danh thiếp" },
    });

    return { customerId: customer.id, created: true };
  });
