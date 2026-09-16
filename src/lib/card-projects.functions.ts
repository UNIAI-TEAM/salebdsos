// Gắn dự án đang bán vào danh thiếp + thống kê hiệu quả QR.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Danh sách dự án của workspace để sale chọn gắn vào danh thiếp */
export const listProjectOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("projects")
      .select("id, name, city, status, price_from, currency, cover_url, cover_mobile_url")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Các dự án đã gắn vào danh thiếp (theo thứ tự) */
export const listCardProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cardId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("card_projects")
      .select("project_id, position")
      .eq("card_id", data.cardId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => r.project_id);
  });

/** Ghi lại toàn bộ danh sách dự án của danh thiếp */
export const setCardProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        cardId: z.string().uuid(),
        projectIds: z.array(z.string().uuid()).max(12),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error: delErr } = await supabase
      .from("card_projects")
      .delete()
      .eq("card_id", data.cardId);
    if (delErr) throw new Error(delErr.message);
    if (data.projectIds.length) {
      const rows = data.projectIds.map((project_id, i) => ({
        tenant_id: data.tenantId,
        card_id: data.cardId,
        project_id,
        position: i,
      }));
      const { error } = await supabase.from("card_projects").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true, count: data.projectIds.length };
  });

/** Thống kê 30 ngày: lượt xem/quét, lượt bấm dự án, khách để lại thông tin */
export const getCardQrStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        cardId: z.string().uuid(),
        days: z.number().int().min(1).max(180).default(30),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const since = new Date(Date.now() - data.days * 86400_000).toISOString();

    const { data: events } = await supabase
      .from("interaction_events")
      .select("source")
      .eq("card_id", data.cardId)
      .gte("occurred_at", since)
      .limit(5000);

    const list = events ?? [];
    const views = list.filter((e) => e.source !== "project_click").length;
    const qr = list.filter((e) => e.source === "qr" || e.source === "lockscreen").length;
    const projectClicks = list.filter((e) => e.source === "project_click").length;

    const { count: leads } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", data.tenantId)
      .eq("card_id", data.cardId)
      .gte("created_at", since);

    return { views, qr, projectClicks, leads: leads ?? 0, days: data.days };
  });
