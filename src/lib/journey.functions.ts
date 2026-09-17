// Hành trình khách hàng: phễu, xếp hạng dự án, nguồn quét, nhật ký phiên.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const JOURNEY_FUNNEL = [
  { key: "qr_scan", label: "Quét QR" },
  { key: "landing_view", label: "Xem landing" },
  { key: "scroll_end", label: "Xem hết trang" },
  { key: "schedule_view", label: "Xem lịch mở bán" },
  { key: "brochure_download", label: "Tải brochure" },
  { key: "call_click", label: "Gọi / Zalo" },
  { key: "form_submit", label: "Để lại thông tin" },
] as const;

export const TOUCH_LABEL: Record<string, string> = {
  qr_scan: "Quét mã QR",
  landing_view: "Mở landing",
  gallery_view: "Xem thư viện ảnh",
  image_view: "Xem ảnh dự án",
  pricing_view: "Xem giá / ưu đãi",
  policy_view: "Xem chính sách",
  schedule_view: "Xem lịch mở bán",
  brochure_download: "Tải brochure",
  call_click: "Bấm gọi",
  zalo_click: "Bấm Zalo",
  share_click: "Chia sẻ landing",
  form_open: "Mở form",
  form_submit: "Gửi thông tin",
  scroll_end: "Xem hết trang",
};

const CHANNEL_LABEL: Record<string, string> = {
  general: "QR chung",
  flyer: "Tờ rơi",
  event: "Sự kiện",
  standee: "Standee sàn",
  zalo: "Zalo / tin nhắn",
  facebook: "Facebook",
};

export const getJourneyOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        days: z.number().int().min(1).max(180).default(30),
        projectId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const since = new Date(Date.now() - data.days * 864e5).toISOString();
    let q = context.supabase
      .from("project_touchpoints")
      .select("project_id,event_type,channel,session_id,device_type,occurred_at")
      .eq("tenant_id", data.tenantId)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(20000);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw error;
    const touches = rows ?? [];

    // Phễu: đếm số phiên khách có ít nhất một điểm chạm ở mỗi bước
    const sessionsByEvent = new Map<string, Set<string>>();
    const byProject = new Map<string, { sessions: Set<string>; scans: number; leads: number }>();
    const byChannel = new Map<string, number>();
    const byDevice = new Map<string, number>();

    for (const t of touches) {
      const set = sessionsByEvent.get(t.event_type) ?? new Set<string>();
      set.add(t.session_id);
      sessionsByEvent.set(t.event_type, set);

      const p = byProject.get(t.project_id) ?? { sessions: new Set<string>(), scans: 0, leads: 0 };
      p.sessions.add(t.session_id);
      if (t.event_type === "qr_scan") p.scans += 1;
      if (t.event_type === "form_submit") p.leads += 1;
      byProject.set(t.project_id, p);

      if (t.event_type === "qr_scan") {
        const ch = t.channel ?? "general";
        byChannel.set(ch, (byChannel.get(ch) ?? 0) + 1);
        const dv = t.device_type ?? "khác";
        byDevice.set(dv, (byDevice.get(dv) ?? 0) + 1);
      }
    }

    const projectIds = [...byProject.keys()];
    const names = new Map<string, string>();
    if (projectIds.length) {
      const { data: projects } = await context.supabase
        .from("projects")
        .select("id,name")
        .in("id", projectIds);
      for (const p of projects ?? []) names.set(p.id, p.name);
    }

    const funnel = JOURNEY_FUNNEL.map((step) => ({
      key: step.key,
      label: step.label,
      sessions:
        step.key === "call_click"
          ? new Set([
              ...(sessionsByEvent.get("call_click") ?? []),
              ...(sessionsByEvent.get("zalo_click") ?? []),
            ]).size
          : (sessionsByEvent.get(step.key)?.size ?? 0),
    }));

    const projects = projectIds
      .map((id) => {
        const p = byProject.get(id)!;
        return {
          project_id: id,
          name: names.get(id) ?? "Dự án",
          sessions: p.sessions.size,
          scans: p.scans,
          leads: p.leads,
          conversion: p.sessions.size ? Math.round((p.leads / p.sessions.size) * 100) : 0,
        };
      })
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 12);

    return {
      totalTouches: touches.length,
      totalSessions: new Set(touches.map((t) => t.session_id)).size,
      funnel,
      projects,
      channels: [...byChannel.entries()]
        .map(([key, count]) => ({ key, label: CHANNEL_LABEL[key] ?? key, count }))
        .sort((a, b) => b.count - a.count),
      devices: [...byDevice.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    };
  });

export const listJourneySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        days: z.number().int().min(1).max(180).default(30),
        limit: z.number().int().min(1).max(50).default(15),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const since = new Date(Date.now() - data.days * 864e5).toISOString();
    const { data: rows, error } = await context.supabase
      .from("project_touchpoints")
      .select("session_id,project_id,event_type,channel,device_type,occurred_at")
      .eq("tenant_id", data.tenantId)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(4000);
    if (error) throw error;

    const grouped = new Map<
      string,
      { session_id: string; project_id: string; last_at: string; channel: string | null; device: string | null; steps: { label: string; at: string }[] }
    >();
    for (const t of rows ?? []) {
      const g = grouped.get(t.session_id) ?? {
        session_id: t.session_id,
        project_id: t.project_id,
        last_at: t.occurred_at,
        channel: t.channel,
        device: t.device_type,
        steps: [],
      };
      if (g.steps.length < 20)
        g.steps.push({ label: TOUCH_LABEL[t.event_type] ?? t.event_type, at: t.occurred_at });
      grouped.set(t.session_id, g);
    }

    const sessions = [...grouped.values()].slice(0, data.limit);
    const ids = [...new Set(sessions.map((s) => s.project_id))];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: projects } = await context.supabase.from("projects").select("id,name").in("id", ids);
      for (const p of projects ?? []) names.set(p.id, p.name);
    }
    return sessions.map((s) => ({
      ...s,
      project_name: names.get(s.project_id) ?? "Dự án",
      channel_label: s.channel ? (CHANNEL_LABEL[s.channel] ?? s.channel) : null,
      steps: [...s.steps].reverse(),
    }));
  });
