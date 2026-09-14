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
  "id,tenant_id,name,category,tags,request,prompt,tone,audience,cta,source_page_id,use_count,last_used_at,created_by,created_at,updated_at";

export const listSalesPrompts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        search: z.string().trim().max(200).optional(),
        category: z.string().trim().max(50).optional(),
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
  tags: z.array(z.string().trim().max(40)).max(12).default([]),
  request: z.string().trim().max(4000).optional(),
  prompt: z.string().trim().min(10).max(20000),
  tone: z.string().trim().max(40).optional(),
  audience: z.string().trim().max(300).optional(),
  cta: z.string().trim().max(300).optional(),
  sourcePageId: z.string().uuid().optional(),
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
      tags: data.tags,
      request: data.request ?? null,
      prompt: data.prompt,
      tone: data.tone ?? null,
      audience: data.audience ?? null,
      cta: data.cta ?? null,
      source_page_id: data.sourcePageId ?? null,
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
