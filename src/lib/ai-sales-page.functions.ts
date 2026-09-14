// AI Sales Page — generation via Lovable AI + history CRUD
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SELECT =
  "id,tenant_id,owner_user_id,lead_id,customer_id,project_id,title,audience,tone,cta,prompt,output,model,tokens,status,slug,is_published,views_count,created_at,updated_at";

export const TONES = ["professional", "friendly", "luxury", "urgent"] as const;
export const TONE_LABEL_VI: Record<(typeof TONES)[number], string> = {
  professional: "Chuyên nghiệp",
  friendly: "Thân thiện",
  luxury: "Sang trọng",
  urgent: "Khẩn cấp",
};

export const listSalesPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; leadId?: string; customerId?: string; page?: number; pageSize?: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const page = data.page ?? 1;
    const pageSize = Math.min(data.pageSize ?? 20, 50);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let q = supabase
      .from("ai_sales_pages")
      .select(SELECT, { count: "exact" })
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.leadId) q = q.eq("lead_id", data.leadId);
    if (data.customerId) q = q.eq("customer_id", data.customerId);
    const { data: items, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: items ?? [], total: count ?? 0, page, pageSize };
  });

export const getSalesPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ai_sales_pages")
      .select(SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSalesPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_sales_pages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const GenerateSchema = z.object({
  tenantId: z.string().uuid(),
  leadId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  title: z.string().trim().max(200).optional(),
  audience: z.string().trim().max(400).optional(),
  tone: z.enum(TONES).default("professional"),
  cta: z.string().trim().max(200).optional(),
  extra: z.string().trim().max(2000).optional(),
  /** Prompt do người dùng xem trước / chỉnh sửa. Nếu có sẽ dùng thay prompt tự sinh. */
  promptOverride: z.string().trim().max(8000).optional().nullable(),
  /** Tạo xong xuất bản luôn thành landing công khai. */
  autoPublish: z.boolean().optional().default(false),
  /** Đường dẫn công khai mong muốn (tuỳ chọn). */
  slug: z.string().trim().max(80).optional().nullable(),
});

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3.8-flash";

function aiHeaders() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI Gateway chưa được cấu hình.");
  return {
    "Lovable-API-Key": apiKey,
    "Content-Type": "application/json",
  } as Record<string, string>;
}

function aiStatusError(status: number, body: string) {
  if (status === 429) return new Error("Vượt giới hạn AI, thử lại sau ít phút.");
  if (status === 402) return new Error("Hết credit AI. Vui lòng nạp thêm.");
  if (status === 403) return new Error("Tính năng AI đang bị khoá cho workspace này.");
  return new Error(`AI lỗi: ${status} ${body}`);
}

type Ctx = { leadCtx: string; projectCtx: string; projectId?: string | null };

async function hydrateContext(
  supabase: any,
  data: { leadId?: string | null; customerId?: string | null; projectId?: string | null },
): Promise<Ctx> {
  let leadCtx = "";
  let projectId = data.projectId ?? null;
  if (data.leadId) {
    const { data: l } = await supabase
      .from("leads")
      .select("full_name,phone,email,source,status,need_type,budget,timeline,score,project_id")
      .eq("id", data.leadId)
      .maybeSingle();
    if (l) {
      leadCtx = `Khách hàng tiềm năng: ${l.full_name || "?"}. Nguồn: ${l.source || "?"}. Nhu cầu: ${l.need_type || "?"}. Ngân sách: ${l.budget || "?"}. Thời gian: ${l.timeline || "?"}. Điểm AI: ${l.score ?? "?"}.`;
      if (!projectId && l.project_id) projectId = l.project_id;
    }
  }
  if (!leadCtx && data.customerId) {
    const { data: c } = await supabase
      .from("customers")
      .select("full_name,phone,email,tags,notes")
      .eq("id", data.customerId)
      .maybeSingle();
    if (c)
      leadCtx = `Khách hàng: ${c.full_name || "?"}. Tags: ${(c.tags || []).join(", ")}. Ghi chú: ${c.notes || "?"}.`;
  }
  let projectCtx = "";
  if (projectId) {
    const { data: p } = await supabase
      .from("projects")
      .select("name,location,city,description,price_from,price_to,currency,unit_highlights")
      .eq("id", projectId)
      .maybeSingle();
    if (p) {
      const price =
        p.price_from || p.price_to
          ? `${p.price_from ?? "?"} - ${p.price_to ?? "?"} ${p.currency || ""}`
          : "?";
      const hl = Array.isArray(p.unit_highlights) ? p.unit_highlights.join("; ") : "";
      projectCtx = `Dự án: ${p.name}. Vị trí: ${p.location || p.city || "?"}. Giá: ${price}. Mô tả: ${p.description || "?"}. Điểm nhấn: ${hl}.`;
    }
  }
  return { leadCtx, projectCtx, projectId };
}

function buildPrompt(
  ctx: Ctx,
  data: { tone: (typeof TONES)[number]; audience?: string; cta?: string; extra?: string },
) {
  const toneLabel = TONE_LABEL_VI[data.tone];
  return `Bạn là copywriter bất động sản. Viết nội dung LANDING PAGE bán hàng cá nhân hoá bằng tiếng Việt, giọng ${toneLabel}.
${ctx.leadCtx}
${ctx.projectCtx}
${data.audience ? `Đối tượng: ${data.audience}.` : ""}
${data.cta ? `CTA mong muốn: ${data.cta}.` : ""}
${data.extra ? `Yêu cầu thêm: ${data.extra}.` : ""}

Trả về JSON với các trường:
- headline: tiêu đề chính, ngắn gọn có cảm xúc
- subheadline: 1 câu mô tả
- benefits: mảng 3-5 lợi ích (mỗi cái 1 câu)
- offer: chuỗi mô tả ưu đãi giới hạn
- social_proof: 1 câu chứng thực xã hội
- cta_primary: nút CTA chính
- cta_secondary: nút CTA phụ
- form_intro: 1 câu mời để lại thông tin
Chỉ trả về JSON hợp lệ, không kèm chú thích.`;
}

/** Từ yêu cầu tự do của khách hàng → tự sinh tham số + prompt để xem trước. */
export const draftSalesBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        request: z.string().trim().min(5).max(4000),
        leadId: z.string().uuid().optional().nullable(),
        customerId: z.string().uuid().optional().nullable(),
        projectId: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = await hydrateContext(context.supabase, data);

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Bạn là chuyên gia brief marketing bất động sản. Từ yêu cầu tự do của khách hàng, hãy suy luận ra tham số chiến dịch. Chỉ trả JSON hợp lệ.",
          },
          {
            role: "user",
            content: `Yêu cầu của khách hàng:\n"""${data.request}"""\n${ctx.leadCtx}\n${ctx.projectCtx}\n\nTrả JSON: {"title": string, "audience": string, "tone": "professional"|"friendly"|"luxury"|"urgent", "cta": string, "extra": string}. "extra" tóm tắt các yêu cầu đặc thù (ưu đãi, điểm nhấn, ràng buộc) bằng tiếng Việt.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw aiStatusError(res.status, await res.text().catch(() => ""));
    const json: any = await res.json();
    let brief: any = {};
    try {
      brief = JSON.parse(json.choices?.[0]?.message?.content || "{}");
    } catch {
      brief = {};
    }
    const tone = (TONES as readonly string[]).includes(brief.tone)
      ? (brief.tone as (typeof TONES)[number])
      : "professional";
    const draft = {
      title: typeof brief.title === "string" ? brief.title.slice(0, 200) : "",
      audience: typeof brief.audience === "string" ? brief.audience.slice(0, 400) : "",
      tone,
      cta: typeof brief.cta === "string" ? brief.cta.slice(0, 200) : "",
      extra: typeof brief.extra === "string" ? brief.extra.slice(0, 2000) : data.request.slice(0, 2000),
    };
    return { ...draft, prompt: buildPrompt(ctx, draft) };
  });

/** Xem trước prompt sẽ gửi cho AI (không gọi model). */
export const previewSalesPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = await hydrateContext(context.supabase, data);
    return { prompt: buildPrompt(ctx, data) };
  });


export const generateSalesPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const ctx = await hydrateContext(supabase, data);
    if (!data.projectId && ctx.projectId) data.projectId = ctx.projectId;
    const prompt = data.promptOverride?.trim() || buildPrompt(ctx, data);

    const model = AI_MODEL;
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: aiHeaders(),
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw aiStatusError(res.status, await res.text().catch(() => ""));
    const json = await res.json();

    const text: string = json.choices?.[0]?.message?.content || "{}";
    let output: any;
    try {
      output = JSON.parse(text);
    } catch {
      output = { headline: "", subheadline: "", benefits: [], raw: text };
    }
    const tokens: number | null = json.usage?.total_tokens ?? null;

    const { data: row, error } = await supabase
      .from("ai_sales_pages")
      .insert({
        tenant_id: data.tenantId,
        owner_user_id: userId,
        lead_id: data.leadId ?? null,
        customer_id: data.customerId ?? null,
        project_id: data.projectId ?? null,
        title: data.title || output?.headline || "AI Sales Page",
        audience: data.audience ?? null,
        tone: data.tone,
        cta: data.cta ?? null,
        prompt,
        output,
        model,
        tokens,
        status: "generated",
      })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);

    // Luôn gán slug cố định ngay khi lưu (link không đổi về sau).
    const base =
      slugify(data.slug || row.title || output?.headline || "trang-ban-hang") || "trang-ban-hang";
    let saved = row;
    let lastErr = "";
    for (let i = 0; i < 5; i++) {
      const slug = i === 0 ? `${base}-${row.id.slice(0, 6)}` : `${base}-${row.id.slice(0, 6)}-${i}`;
      const { data: p, error: pErr } = await supabase
        .from("ai_sales_pages")
        .update({
          slug,
          is_published: data.autoPublish,
          status: data.autoPublish ? "published" : "generated",
        })
        .eq("id", row.id)
        .select(SELECT)
        .single();
      if (!pErr && p) return { ok: true, page: p, published: data.autoPublish };
      lastErr = pErr?.message ?? "";
      if (!/duplicate|unique/i.test(lastErr)) break;
    }
    return { ok: true, page: saved, published: false, publishError: lastErr };

  });

// ---------------------------------------------------------------------------
// Editing + publishing
// ---------------------------------------------------------------------------
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export type SalesPageOutput = {
  headline?: string | null;
  subheadline?: string | null;
  benefits?: string[] | null;
  offer?: string | null;
  social_proof?: string | null;
  cta_primary?: string | null;
  cta_secondary?: string | null;
  form_intro?: string | null;
};

const OutputSchema = z.object({
  headline: z.string().max(300).optional().nullable(),
  subheadline: z.string().max(600).optional().nullable(),
  benefits: z.array(z.string().max(400)).max(10).optional().nullable(),
  offer: z.string().max(600).optional().nullable(),
  social_proof: z.string().max(600).optional().nullable(),
  cta_primary: z.string().max(120).optional().nullable(),
  cta_secondary: z.string().max(120).optional().nullable(),
  form_intro: z.string().max(400).optional().nullable(),
});

export const updateSalesPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        slug: z.string().trim().max(80).optional().nullable(),
        output: OutputSchema.optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    if (data.title !== undefined) patch.title = data.title;
    if (data.output !== undefined) patch.output = data.output;
    if (data.slug !== undefined)
      patch.slug = data.slug ? slugify(data.slug) || null : null;
    const { data: row, error } = await context.supabase
      .from("ai_sales_pages")
      .update(patch as never)
      .eq("id", data.id)
      .select(SELECT)
      .single();
    if (error) {
      if (error.code === "23505" || /duplicate|unique/i.test(error.message))
        throw new Error("Đường dẫn này đã được dùng. Hãy chọn đường dẫn khác.");
      throw new Error(error.message);
    }
    return row;
  });

export const setSalesPagePublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        is_published: z.boolean(),
        slug: z.string().trim().max(80).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: current, error: cErr } = await supabase
      .from("ai_sales_pages")
      .select("id,slug,title")
      .eq("id", data.id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!current) throw new Error("Không tìm thấy trang.");

    let slug = current.slug;
    if (data.slug) slug = slugify(data.slug);
    if (data.is_published && !slug)
      slug = `${slugify(current.title || "trang-ban-hang")}-${current.id.slice(0, 6)}`;

    const { data: row, error } = await supabase
      .from("ai_sales_pages")
      .update({ is_published: data.is_published, slug, status: data.is_published ? "published" : "generated" })
      .eq("id", data.id)
      .select(SELECT)
      .single();
    if (error) {
      if (/duplicate|unique/i.test(error.message))
        throw new Error("Đường dẫn này đã được dùng. Hãy chọn đường dẫn khác.");
      throw new Error(error.message);
    }
    return row;
  });

/** Public read of a published sales page — safe columns only, no auth. */
export const getPublicSalesPage = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().trim().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("ai_sales_pages")
      .select("id,tenant_id,title,output,cta,slug,views_count,project_id")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    void supabaseAdmin
      .from("ai_sales_pages")
      .update({ views_count: (row.views_count ?? 0) + 1 })
      .eq("id", row.id)
      .then(({ error: e }) => {
        if (e) console.error("[sales-page] view count", e.message);
      });

    let project: { name: string; location: string | null; cover_url: string | null } | null = null;
    if (row.project_id) {
      const { data: p } = await supabaseAdmin
        .from("projects")
        .select("name,location,cover_url")
        .eq("id", row.project_id)
        .maybeSingle();
      project = p ?? null;
    }
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      cta: row.cta,
      slug: row.slug,
      output: (row.output ?? {}) as SalesPageOutput,
      project,
    };
  });

// ---------------------------------------------------------------------------
// SEO article generated from the sales prompt
// ---------------------------------------------------------------------------
export type SeoArticle = {
  seo_title?: string | null;
  meta_description?: string | null;
  sections?: Array<{ heading: string; body: string }> | null;
  keywords?: string[] | null;
  public_url?: string | null;
  generated_at?: string | null;
};

/** Sinh bài viết SEO từ prompt bán hàng của trang, tự xuất bản để có link /p/... */
export const generateSeoArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), origin: z.string().trim().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: page, error: pErr } = await supabase
      .from("ai_sales_pages")
      .select("id,title,prompt,output,tone,slug,is_published")
      .eq("id", data.id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!page) throw new Error("Không tìm thấy trang.");

    // Bảo đảm đã có đường dẫn công khai để chèn vào bài viết
    let slug = page.slug as string | null;
    if (!slug || !page.is_published) {
      const base = slugify(page.title || "trang-ban-hang") || "trang-ban-hang";
      slug = slug || `${base}-${page.id.slice(0, 6)}`;
      const { error: upErr } = await supabase
        .from("ai_sales_pages")
        .update({ slug, is_published: true, status: "published" })
        .eq("id", page.id);
      if (upErr && !/duplicate|unique/i.test(upErr.message)) throw new Error(upErr.message);
    }
    const origin = (data.origin || "").replace(/\/+$/, "");
    const publicUrl = origin ? `${origin}/p/${slug}` : `/p/${slug}`;

    const out: any = page.output ?? {};
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: aiHeaders(),
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Bạn là chuyên gia SEO content bất động sản tại Việt Nam. Viết bài chuẩn SEO tiếng Việt, tự nhiên, không nhồi từ khoá. Chỉ trả JSON hợp lệ.",
          },
          {
            role: "user",
            content: `Dựa trên brief bán hàng sau, viết một BÀI VIẾT SEO (800-1200 từ) để thu hút khách hàng và dẫn về landing page.

BRIEF/PROMPT:
"""${page.prompt || ""}"""

NỘI DUNG LANDING (tham khảo):
${JSON.stringify(out).slice(0, 3000)}

Link landing công khai: ${publicUrl}

Trả JSON:
{
 "seo_title": tiêu đề SEO dưới 60 ký tự,
 "meta_description": mô tả dưới 155 ký tự,
 "keywords": mảng 5-8 từ khoá,
 "sections": mảng 5-8 phần, mỗi phần {"heading": tiêu đề H2, "body": 2-4 đoạn văn, phân tách bằng "\\n\\n"}
}
Phần cuối phải là lời kêu gọi hành động có chèn link ${publicUrl}.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw aiStatusError(res.status, await res.text().catch(() => ""));
    const json: any = await res.json();
    let art: any = {};
    try {
      art = JSON.parse(json.choices?.[0]?.message?.content || "{}");
    } catch {
      art = {};
    }
    const article: SeoArticle = {
      seo_title: typeof art.seo_title === "string" ? art.seo_title.slice(0, 120) : page.title,
      meta_description:
        typeof art.meta_description === "string" ? art.meta_description.slice(0, 300) : null,
      keywords: Array.isArray(art.keywords)
        ? art.keywords.filter((k: unknown) => typeof k === "string").slice(0, 12)
        : [],
      sections: Array.isArray(art.sections)
        ? art.sections
            .filter((s: any) => s && typeof s.heading === "string" && typeof s.body === "string")
            .slice(0, 12)
            .map((s: any) => ({ heading: s.heading.slice(0, 200), body: s.body.slice(0, 6000) }))
        : [],
      public_url: publicUrl,
      generated_at: new Date().toISOString(),
    };

    const { data: row, error } = await supabase
      .from("ai_sales_pages")
      .update({ output: { ...out, seo_article: article } } as never)
      .eq("id", page.id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, page: row, article };
  });
