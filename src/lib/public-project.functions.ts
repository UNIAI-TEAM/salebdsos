// Dữ liệu công khai cho trang quét QR dự án: /du-an/<code>
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicProjectSale = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type PublicProjectAppointmentLite = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
};

export const getPublicProjectByQr = createServerFn({ method: "GET" })
  .inputValidator((d: { code: string }) =>
    z.object({ code: z.string().trim().min(4).max(32) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: qr } = await supabaseAdmin
      .from("project_qr_codes")
      .select("id,code,channel,label,project_id,tenant_id,created_by,is_active")
      .eq("code", data.code)
      .maybeSingle();
    if (!qr || !qr.is_active) return null;

    const { data: project } = await supabaseAdmin
      .from("projects")
      .select(
        "id,name,developer,location,city,status,property_type,price_from,price_to,currency,description,cover_url,cover_mobile_url,gallery,gallery_mobile,brochure_url,brochure_name,sales_policy,unit_highlights,cta_phone",
      )
      .eq("id", qr.project_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!project) return null;

    const [{ data: sale }, { data: appointments }, { data: landing }] = await Promise.all([
      qr.created_by
        ? supabaseAdmin
            .from("profiles")
            .select("full_name,phone,email,avatar_url")
            .eq("user_id", qr.created_by)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from("appointments")
        .select("id,title,location,starts_at,ends_at")
        .eq("project_id", project.id)
        .eq("is_published", true)
        .eq("status", "scheduled")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(8),
      supabaseAdmin
        .from("ai_sales_pages")
        .select("slug")
        .eq("project_id", project.id)
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const highlights = Array.isArray(project.unit_highlights)
      ? (project.unit_highlights as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const gallery = Array.isArray(project.gallery)
      ? (project.gallery as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

    return {
      code: qr.code,
      channel: qr.channel,
      label: qr.label,
      tenantId: qr.tenant_id,
      project: {
        id: project.id,
        name: project.name,
        developer: project.developer,
        location: project.location ?? project.city,
        status: project.status,
        propertyType: project.property_type,
        priceFrom: project.price_from,
        priceTo: project.price_to,
        currency: project.currency ?? "VND",
        description: project.description,
        coverUrl: project.cover_url,
        coverMobileUrl: project.cover_mobile_url,
        gallery,
        galleryMobile: Array.isArray(project.gallery_mobile) ? (project.gallery_mobile as string[]) : [],
        brochureUrl: project.brochure_url,
        brochureName: project.brochure_name,
        salesPolicy: project.sales_policy,
        highlights,
        ctaPhone: project.cta_phone,
      },
      sale: (sale ?? null) as PublicProjectSale | null,
      appointments: (appointments ?? []) as PublicProjectAppointmentLite[],
      landingSlug: landing?.slug ?? null,
    };
  });

/** Khách để lại thông tin từ trang QR dự án → tạo lead gắn dự án + nguồn QR. */
export const submitProjectQrLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        code: z.string().trim().min(4).max(32),
        full_name: z.string().trim().min(1).max(120),
        phone: z.string().trim().min(6).max(30),
        note: z.string().trim().max(1000).optional(),
        session_id: z.string().trim().max(64).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: qr } = await supabaseAdmin
      .from("project_qr_codes")
      .select("id,project_id,tenant_id,channel,created_by,is_active")
      .eq("code", data.code)
      .maybeSingle();
    if (!qr || !qr.is_active) throw new Error("Mã QR không hợp lệ.");

    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .insert({
        tenant_id: qr.tenant_id,
        project_id: qr.project_id,
        owner_user_id: qr.created_by,
        full_name: data.full_name,
        phone: data.phone,
        notes: data.note ?? null,
        source: `qr:${qr.channel}`,
        status: "new",
        meta: { qr_code: data.code },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: tErr } = await supabaseAdmin.from("project_touchpoints").insert({
      tenant_id: qr.tenant_id,
      project_id: qr.project_id,
      qr_code_id: qr.id,
      lead_id: lead.id,
      session_id: data.session_id || lead.id,
      event_type: "form_submit",
      channel: qr.channel,
      meta: { code: data.code },
    });
    if (tErr) console.error("[qr-lead] touch", tErr.message);

    return { ok: true };
  });
