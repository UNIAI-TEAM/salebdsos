// QR riêng cho từng dự án: tạo mã, bật/tắt, thống kê 30 ngày.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const QR_CHANNELS = [
  { value: "general", label: "QR chung" },
  { value: "flyer", label: "Tờ rơi" },
  { value: "event", label: "Sự kiện" },
  { value: "standee", label: "Standee sàn" },
  { value: "zalo", label: "Zalo / tin nhắn" },
  { value: "facebook", label: "Facebook" },
] as const;

const CHANNEL_VALUES = QR_CHANNELS.map((c) => c.value);

function randomCode() {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const listProjectQrCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), projectId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("project_qr_codes")
      .select("id,code,channel,label,is_active,scan_count,created_at")
      .eq("tenant_id", data.tenantId)
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const ids = (rows ?? []).map((r) => r.id);
    const stats = new Map<string, { scans: number; leads: number }>();
    if (ids.length) {
      const { data: touches } = await context.supabase
        .from("project_touchpoints")
        .select("qr_code_id,event_type")
        .in("qr_code_id", ids)
        .gte("occurred_at", since)
        .limit(20000);
      for (const t of touches ?? []) {
        if (!t.qr_code_id) continue;
        const s = stats.get(t.qr_code_id) ?? { scans: 0, leads: 0 };
        if (t.event_type === "qr_scan") s.scans += 1;
        if (t.event_type === "form_submit") s.leads += 1;
        stats.set(t.qr_code_id, s);
      }
    }
    return (rows ?? []).map((r) => ({
      ...r,
      scans_30d: stats.get(r.id)?.scans ?? 0,
      leads_30d: stats.get(r.id)?.leads ?? 0,
    }));
  });

export const createProjectQrCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        projectId: z.string().uuid(),
        channel: z.enum(CHANNEL_VALUES as [string, ...string[]]).default("general"),
        label: z.string().trim().max(120).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomCode();
      const { data: row, error } = await context.supabase
        .from("project_qr_codes")
        .insert({
          tenant_id: data.tenantId,
          project_id: data.projectId,
          code,
          channel: data.channel,
          label: data.label ?? null,
          created_by: context.userId,
        })
        .select("id,code,channel,label,is_active,scan_count,created_at")
        .single();
      if (!error && row) return { ...row, scans_30d: 0, leads_30d: 0 };
      if (!/duplicate|unique/i.test(error?.message ?? "")) throw error;
    }
    throw new Error("Không tạo được mã QR, vui lòng thử lại.");
  });

export const toggleProjectQrCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_qr_codes")
      .update({ is_active: data.isActive })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteProjectQrCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("project_qr_codes").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
