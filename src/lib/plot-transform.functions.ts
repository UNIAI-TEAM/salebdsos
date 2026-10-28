import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const childSchema = z.object({
  code: z.string().trim().min(1).max(80),
  area: z.number().positive(),
  price: z.number().min(0).default(0),
  direction: z.string().trim().max(40).optional(),
  map_row: z.number().int().min(0).max(200).nullish(),
  map_col: z.number().int().min(0).max(200).nullish(),
});

/** Tách 1 lô thành nhiều lô con (RPC nguyên tử trong database). */
export const splitPlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      expected: z.string(),
      children: z.array(childSchema).min(2).max(20),
      note: z.string().trim().max(500).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("split_plot", {
      p_id: data.id,
      p_children: { note: data.note ?? null, items: data.children } as unknown as Json,
      p_expected: data.expected,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Ghép nhiều lô thành 1 lô mới (RPC nguyên tử trong database). */
export const mergePlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      ids: z.array(z.string().uuid()).min(2).max(20),
      code: z.string().trim().min(1).max(80),
      area: z.number().positive().optional(),
      price: z.number().min(0).optional(),
      map_row: z.number().int().min(0).max(200).nullish(),
      map_col: z.number().int().min(0).max(200).nullish(),
      note: z.string().trim().max(500).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("merge_plots", {
      p_ids: data.ids,
      p_child: {
        code: data.code,
        area: data.area ?? null,
        price: data.price ?? null,
        map_row: data.map_row ?? null,
        map_col: data.map_col ?? null,
        note: data.note ?? null,
      } as unknown as Json,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lịch sử tách/ghép lô của một dự án. */
export const listPlotTransforms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ projectId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("plot_transform_events")
      .select("id, action, parent_ids, child_ids, note, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const ids = [...new Set(rows.flatMap((r) => [...r.parent_ids, ...r.child_ids]))];
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, code, area, price, listing_status")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const byId = new Map((products ?? []).map((p) => [p.id, p]));

    return rows.map((r) => ({
      ...r,
      parents: r.parent_ids.map((id) => byId.get(id) ?? { id, code: "?" }),
      children: r.child_ids.map((id) => byId.get(id) ?? { id, code: "?" }),
    }));
  });
