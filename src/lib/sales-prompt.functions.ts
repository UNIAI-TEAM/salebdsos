import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PROMPT_CATEGORIES = [
  "general",
  "apartment",
  "land",
  "villa",
  "investment",
  "promotion",
  "followup",
] as const;

export const PROMPT_CATEGORY_LABEL_VI: Record<(typeof PROMPT_CATEGORIES)[number], string> = {
  general: "Tổng quát",
  apartment: "Căn hộ",
  land: "Đất nền",
  villa: "Biệt thự / Nhà phố",
  investment: "Đầu tư",
  promotion: "Ưu đãi / Khuyến mãi",
  followup: "Chăm sóc & follow-up",
};

const SELECT =
  "id,tenant_id,name,category,industry,tags,request,prompt,tone,audience,cta,source_page_id,stage_id,variables,use_count,last_used_at,created_by,created_at,updated_at";

export const listSalesPrompts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        search: z.string().trim().max(200).optional(),
        category: z.string().trim().max(50).optional(),
        industry: z.string().trim().max(50).optional(),
        stageId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("sales_prompts")
      .select(SELECT)
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data.category && data.category !== "all") q = q.eq("category", data.category);
    if (data.industry && data.industry !== "all") q = q.eq("industry", data.industry);
    if (data.stageId) q = q.eq("stage_id", data.stageId);
    if (data.search) q = q.or(`name.ilike.%${data.search}%,prompt.ilike.%${data.search}%`);
    const { data: items, error } = await q;
    if (error) throw new Error(error.message);
    return { items: items ?? [] };
  });

const SaveSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(50).default("general"),
  industry: z.string().trim().max(50).nullable().optional(),
  tags: z.array(z.string().trim().max(40)).max(12).default([]),
  request: z.string().trim().max(4000).optional(),
  prompt: z.string().trim().min(10).max(20000),
  tone: z.string().trim().max(40).optional(),
  audience: z.string().trim().max(300).optional(),
  cta: z.string().trim().max(300).optional(),
  sourcePageId: z.string().uuid().optional(),
  stageId: z.string().uuid().nullable().optional(),
  variables: z.record(z.string(), z.string().max(2000)).optional(),
});

export const saveSalesPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      tenant_id: data.tenantId,
      name: data.name,
      category: data.category || "general",
      industry: data.industry ?? null,
      tags: data.tags,
      request: data.request ?? null,
      prompt: data.prompt,
      tone: data.tone ?? null,
      audience: data.audience ?? null,
      cta: data.cta ?? null,
      source_page_id: data.sourcePageId ?? null,
      stage_id: data.stageId ?? null,
      variables: data.variables ?? {},
    };

    if (data.id) {
      const { data: row, error } = await supabase
        .from("sales_prompts")
        .update(payload as never)
        .eq("id", data.id)
        .select(SELECT)
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, item: row };
    }

    const { data: row, error } = await supabase
      .from("sales_prompts")
      .insert({ ...payload, created_by: userId } as never)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, item: row };
  });

export const deleteSalesPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sales_prompts")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Ghi nhận một lần tái sử dụng prompt (tăng bộ đếm + thêm lịch sử). */
export const useSalesPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        tenantId: z.string().uuid(),
        pageId: z.string().uuid().optional(),
        note: z.string().trim().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: current, error: cErr } = await supabase
      .from("sales_prompts")
      .select("use_count")
      .eq("id", data.id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);

    const { error } = await supabase
      .from("sales_prompts")
      .update({
        use_count: (current?.use_count ?? 0) + 1,
        last_used_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.from("sales_prompt_uses").insert({
      tenant_id: data.tenantId,
      prompt_id: data.id,
      used_by: userId,
      page_id: data.pageId ?? null,
      note: data.note ?? null,
    } as never);

    return { ok: true };
  });

export const listSalesPromptUses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ promptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: items, error } = await context.supabase
      .from("sales_prompt_uses")
      .select("id,prompt_id,used_by,page_id,note,used_at")
      .eq("prompt_id", data.promptId)
      .order("used_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { items: items ?? [] };
  });


// ---------------------------------------------------------------------------
// Biến giai đoạn + tự chọn prompt theo stage của deal
// ---------------------------------------------------------------------------

/** Các biến hệ thống có thể dùng trong prompt dưới dạng {{ten_bien}}. */
export const STAGE_VARIABLES = [
  "stage",
  "deal_title",
  "deal_value",
  "deal_currency",
  "next_action",
  "expected_close_date",
  "lead_name",
  "lead_phone",
  "project_name",
] as const;

export const STAGE_VARIABLE_LABEL_VI: Record<(typeof STAGE_VARIABLES)[number], string> = {
  stage: "Giai đoạn hiện tại",
  deal_title: "Tên deal",
  deal_value: "Giá trị deal",
  deal_currency: "Đơn vị tiền",
  next_action: "Hành động kế tiếp",
  expected_close_date: "Ngày dự kiến chốt",
  lead_name: "Tên khách hàng",
  lead_phone: "Điện thoại khách",
  project_name: "Dự án",
};

/** Thay thế {{bien}} bằng giá trị thực; biến thiếu sẽ bị xoá khỏi prompt. */
export function renderPromptTemplate(
  template: string,
  vars: Record<string, string | null | undefined>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v === null || v === undefined || v === "" ? "" : String(v);
  });
}

/**
 * Tự chọn prompt phù hợp nhất với giai đoạn của deal:
 * 1) prompt gán đúng stage  2) prompt cùng nhóm "followup"  3) prompt tổng quát.
 * Trả về prompt đã điền biến giai đoạn từ dữ liệu deal.
 */
export const suggestPromptForDeal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), dealId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: deal, error: dErr } = await supabase
      .from("pipeline_deals")
      .select(
        "id,stage_id,title,value,currency,next_action,expected_close_date,lead_id,project_id",
      )
      .eq("id", data.dealId)
      .eq("tenant_id", data.tenantId)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!deal) throw new Error("Không tìm thấy deal");

    const [stageR, leadR, projectR] = await Promise.all([
      supabase.from("pipeline_stages").select("id,name").eq("id", deal.stage_id).maybeSingle(),
      deal.lead_id
        ? supabase.from("leads").select("full_name,phone").eq("id", deal.lead_id).maybeSingle()
        : Promise.resolve({ data: null }),
      deal.project_id
        ? supabase.from("projects").select("name").eq("id", deal.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const vars: Record<string, string> = {
      stage: stageR.data?.name ?? "",
      deal_title: deal.title ?? "",
      deal_value: deal.value != null ? String(deal.value) : "",
      deal_currency: deal.currency ?? "VND",
      next_action: deal.next_action ?? "",
      expected_close_date: deal.expected_close_date ?? "",
      lead_name: (leadR.data as any)?.full_name ?? "",
      lead_phone: (leadR.data as any)?.phone ?? "",
      project_name: (projectR.data as any)?.name ?? "",
    };

    const { data: prompts, error: pErr } = await supabase
      .from("sales_prompts")
      .select(SELECT)
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("use_count", { ascending: false })
      .limit(200);
    if (pErr) throw new Error(pErr.message);

    const list = prompts ?? [];
    const byStage = list.filter((p: any) => p.stage_id === deal.stage_id);
    const byFollowup = list.filter((p: any) => !p.stage_id && p.category === "followup");
    const generic = list.filter((p: any) => !p.stage_id && p.category === "general");
    const picked = byStage[0] ?? byFollowup[0] ?? generic[0] ?? list[0] ?? null;

    if (!picked) return { ok: true, prompt: null, stage: stageR.data?.name ?? null, variables: vars };

    const merged = { ...vars, ...((picked as any).variables ?? {}) };
    return {
      ok: true,
      stage: stageR.data?.name ?? null,
      variables: merged,
      matchedBy: byStage[0] ? "stage" : byFollowup[0] ? "followup" : "general",
      prompt: {
        ...(picked as any),
        rendered_prompt: renderPromptTemplate((picked as any).prompt ?? "", merged),
      },
    };
  });
