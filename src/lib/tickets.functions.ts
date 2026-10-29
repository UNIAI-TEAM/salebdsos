// Ticket tin nhắn — giao việc chăm sóc từ hội thoại, có SLA và người phụ trách.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_ROLES as MANAGER_ROLES } from "@/lib/permissions";

export const TICKET_PRIORITIES = [
  { value: "low", label: "Thấp" },
  { value: "normal", label: "Bình thường" },
  { value: "high", label: "Cao" },
  { value: "urgent", label: "Khẩn cấp" },
] as const;

export const TICKET_STATUSES = [
  { value: "open", label: "Đang mở" },
  { value: "assigned", label: "Đã giao" },
  { value: "resolved", label: "Đã xử lý" },
  { value: "cancelled", label: "Đã huỷ" },
] as const;

export const TICKET_KINDS = [
  "Chăm sóc khách hàng",
  "Hẹn xem nhà mẫu",
  "Khiếu nại",
  "Yêu cầu gọi lại",
  "Khác",
] as const;

async function rolesOf(
  supabase: { from: (t: "user_roles") => any },
  tenantId: string,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const list = (data ?? []).map((r: { role: string }) => r.role);
  if (!list.length) throw new Error("Bạn không thuộc workspace này");
  return list;
}

const ListInput = z.object({
  tenantId: z.string().uuid(),
  search: z.string().max(120).optional(),
  status: z.string().max(20).optional(),
  priority: z.string().max(20).optional(),
  source: z.string().max(20).optional(),
  mine: z.boolean().optional(),
  page: z.number().int().min(0).max(1000).default(0),
});

export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await rolesOf(supabase, data.tenantId, userId);

    const base = () =>
      supabase
        .from("message_tickets")
        .select("id, code, title, source, kind, priority, assignee_user_id, due_at, status, created_by, created_at, conversation_id, csat_score, csat_comment, csat_requested_at, auto_created, reopened_count", { count: "exact" })
        .eq("tenant_id", data.tenantId);

    let q = base().order("created_at", { ascending: false }).range(data.page * 50, data.page * 50 + 49);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.priority && data.priority !== "all") q = q.eq("priority", data.priority);
    if (data.source && data.source !== "all") q = q.eq("source", data.source);
    if (data.mine) q = q.eq("assignee_user_id", userId);
    const safeSearch = (data.search ?? "").replace(/[,()*%\\:."']/g, " ").trim();
    if (safeSearch) q = q.or(`title.ilike.%${safeSearch}%,code.ilike.%${safeSearch}%`);

    const [itemsQ, openQ, overdueQ, resolvedQ, csatQ] = await Promise.all([
      q,
      base().in("status", ["open", "assigned"]),
      base().in("status", ["open", "assigned"]).lt("due_at", new Date().toISOString()),
      base().eq("status", "resolved"),
      supabase.from("message_tickets").select("csat_score").eq("tenant_id", data.tenantId).not("csat_score", "is", null).order("csat_rated_at", { ascending: false }).limit(500),
    ]);
    const scores = (csatQ.data ?? []).map((r: { csat_score: number | null }) => r.csat_score ?? 0);
    if (itemsQ.error) throw new Error(itemsQ.error.message);

    const assigneeIds = [...new Set((itemsQ.data ?? []).map((t) => t.assignee_user_id).filter(Boolean))] as string[];
    const { data: profiles } = assigneeIds.length
      ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", assigneeIds)
      : { data: [] };
    const nameOf = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name || p.email || "—"]));

    return {
      kpi: {
        open: openQ.count ?? 0,
        overdue: overdueQ.count ?? 0,
        resolved: resolvedQ.count ?? 0,
        csatAvg: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
        csatCount: scores.length,
      },
      total: itemsQ.count ?? 0,
      items: (itemsQ.data ?? []).map((t) => ({
        ...t,
        assignee_name: t.assignee_user_id ? nameOf.get(t.assignee_user_id) ?? "—" : null,
        overdue: t.status !== "resolved" && t.status !== "cancelled" && !!t.due_at && new Date(t.due_at) < new Date(),
      })),
    };
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      conversationId: z.string().uuid().nullish(),
      title: z.string().trim().min(2).max(200),
      kind: z.string().trim().min(1).max(80).default("Chăm sóc khách hàng"),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      assigneeUserId: z.string().uuid().nullish(),
      dueAt: z.string().nullish(),
      source: z.string().max(20).nullish(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await rolesOf(supabase, data.tenantId, userId);

    let source = data.source ?? null;
    if (data.conversationId) {
      const { data: conv, error } = await supabase
        .from("conversations")
        .select("id, channel")
        .eq("tenant_id", data.tenantId)
        .eq("id", data.conversationId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!conv) throw new Error("Không tìm thấy hội thoại");
      source = source ?? (conv.channel as string);
    }

    const { data: row, error } = await supabase
      .from("message_tickets")
      .insert({
        tenant_id: data.tenantId,
        conversation_id: data.conversationId ?? null,
        title: data.title,
        kind: data.kind,
        priority: data.priority,
        assignee_user_id: data.assigneeUserId ?? null,
        due_at: data.dueAt || null,
        status: data.assigneeUserId ? "assigned" : "open",
        source,
        created_by: userId,
      })
      .select("id, code")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      id: z.string().uuid(),
      status: z.enum(["open", "assigned", "resolved", "cancelled"]).optional(),
      assigneeUserId: z.string().uuid().nullish(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      dueAt: z.string().nullish(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roleList = await rolesOf(supabase, data.tenantId, userId);
    const isManager = roleList.some((r) => MANAGER_ROLES.has(r));

    const { data: ticket, error: readErr } = await supabase
      .from("message_tickets")
      .select("id, status, assignee_user_id, created_by")
      .eq("tenant_id", data.tenantId)
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!ticket) throw new Error("Không tìm thấy ticket");

    const isOwnerSide = ticket.assignee_user_id === userId || ticket.created_by === userId;
    if (!isManager && !isOwnerSide) throw new Error("Chỉ quản lý hoặc người phụ trách được sửa ticket");
    // Sale chỉ được đổi trạng thái ticket của mình; đổi người phụ trách/hạn/ưu tiên cần quản lý
    if (!isManager && (data.assigneeUserId !== undefined || data.dueAt !== undefined || data.priority !== undefined)) {
      throw new Error("Chỉ quản lý được đổi người phụ trách, hạn xử lý hoặc mức ưu tiên");
    }

    const patch: Record<string, unknown> = {};
    if (data.status) {
      patch.status = data.status;
      if (data.status === "resolved") patch.resolved_at = new Date().toISOString();
      if (data.status === "open" || data.status === "assigned") patch.resolved_at = null;
    }
    if (data.assigneeUserId !== undefined) {
      patch.assignee_user_id = data.assigneeUserId || null;
      if (data.assigneeUserId && !data.status) patch.status = "assigned";
    }
    if (data.priority) patch.priority = data.priority;
    if (data.dueAt !== undefined) patch.due_at = data.dueAt || null;
    if (!Object.keys(patch).length) throw new Error("Không có thay đổi");

    const { error } = await supabase
      .from("message_tickets")
      .update(patch as never)
      .eq("tenant_id", data.tenantId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    let survey = false;
    if (data.status === "resolved" && ticket.status !== "resolved") {
      const { requestCsat } = await import("./support.server");
      survey = (await requestCsat(data.tenantId, data.id).catch(() => ({ sent: false }))).sent;
    }
    return { ok: true, survey };
  });

/** Danh sách thành viên để giao ticket / giao hội thoại. */
export const listAssignees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await rolesOf(supabase, data.tenantId, userId);
    const { data: roleRows, error } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    const ids = [...new Set((roleRows ?? []).map((r) => r.user_id))];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids)
      : { data: [] };
    const nameOf = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name || p.email || "Thành viên"]));
    return ids.map((id) => ({ id, name: nameOf.get(id) ?? "Thành viên" }));
  });

/** Cấu hình hỗ trợ: ticket tự động, đánh giá hài lòng, kịch bản chào mừng. */
export const getSupportSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roles = await rolesOf(supabase, data.tenantId, userId);
    const { parseSupportConfig, SUPPORT_KEY } = await import("./support");
    const { parseChatFlows, CHAT_FLOWS_KEY } = await import("./chat-flows");
    const { data: rows, error } = await supabase.from("settings").select("key,value").eq("tenant_id", data.tenantId).in("key", [SUPPORT_KEY, CHAT_FLOWS_KEY]);
    if (error) throw new Error(error.message);
    const get = (k: string) => (rows ?? []).find((r: { key: string }) => r.key === k)?.value;
    return {
      config: parseSupportConfig(get(SUPPORT_KEY)),
      flows: parseChatFlows(get(CHAT_FLOWS_KEY)).flows.map((f) => ({ id: f.id, name: f.name, enabled: f.enabled })),
      canEdit: roles.some((r) => MANAGER_ROLES.has(r)),
    };
  });

export const saveSupportSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), config: z.unknown() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roles = await rolesOf(supabase, data.tenantId, userId);
    if (!roles.some((r) => MANAGER_ROLES.has(r))) throw new Error("Chỉ quản trị được đổi cấu hình hỗ trợ");
    const { supportSchema, SUPPORT_KEY } = await import("./support");
    const parsed = supportSchema.safeParse(data.config);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Cấu hình không hợp lệ");
    const { error } = await supabase.from("settings").upsert({ tenant_id: data.tenantId, key: SUPPORT_KEY, value: parsed.data as never }, { onConflict: "tenant_id,key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
