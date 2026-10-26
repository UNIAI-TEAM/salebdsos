// AI sinh kịch bản chat từ dữ liệu dự án thật trong tenant. Chỉ trả bản nháp; người dùng tự lưu.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { flowSchema, uid, type ChatFlow } from "@/lib/chat-flows";
import { ADMIN_ROLES } from "@/lib/permissions";

const GOALS = { new: "giới thiệu và bán dự án mới", stock: "xả hàng tồn, tạo cảm giác khan hiếm", deposit: "thúc đẩy đặt cọc giữ chỗ" } as const;
const TONES = { warm: "nhiệt tình, thân thiện", pro: "chuyên nghiệp, ngắn gọn", urgent: "thúc giục chốt nhanh nhưng lịch sự" } as const;

export const listFlowProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await (context as any).supabase.from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null).order("name").limit(200);
    return (rows ?? []) as { id: string; name: string }[];
  });

export const generateChatFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    tenantId: z.string().uuid(), projectId: z.string().uuid(),
    goal: z.enum(["new", "stock", "deposit"]), tone: z.enum(["warm", "pro", "urgent"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = (context as any).supabase;
    const { data: roles } = await sb.from("user_roles").select("role").eq("tenant_id", data.tenantId).eq("user_id", context.userId);
    if (!(roles ?? []).some((r: any) => ADMIN_ROLES.has(r.role) || r.role === "manager")) throw new Error("Chỉ quản lý được tạo kịch bản");
    const { data: p } = await sb.from("projects").select("name,location,city,developer,property_type,price_from,price_to,description,sales_policy,status").eq("tenant_id", data.tenantId).eq("id", data.projectId).maybeSingle();
    if (!p) throw new Error("Không tìm thấy dự án");
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Chưa cấu hình AI");

    const facts = JSON.stringify({
      ten: p.name, vi_tri: [p.location, p.city].filter(Boolean).join(", ") || null, chu_dau_tu: p.developer, loai_hinh: p.property_type,
      gia_tu: p.price_from, gia_den: p.price_to, mo_ta: (p.description ?? "").slice(0, 1500), chinh_sach: (p.sales_policy ?? "").slice(0, 1500), trang_thai: p.status,
    });
    const instructions = `Bạn thiết kế kịch bản chatbot bán bất động sản tiếng Việt. Mục tiêu: ${GOALS[data.goal]}. Giọng: ${TONES[data.tone]}.
Chỉ dùng dữ liệu dự án được cung cấp, không bịa giá/pháp lý/tiện ích; thiếu dữ liệu thì mời khách để chuyên viên gửi chi tiết.
Trả về DUY NHẤT một JSON object theo dạng:
{"name": string, "nodes": [{"id": string ngắn không dấu, "text": string <=400 ký tự (có thể dùng {name}), "tag": string ("" hoặc "Đang khảo sát"/"VIP"/"Hẹn xem nhà mẫu"/"Cần gọi lại"), "handoff": boolean, "buttons": [{"label": string <=30 ký tự, "keywords": [string không dấu], "next": id bước khác}], "appointment": null | {"title": string, "location": string, "daysAhead": 1-7, "hour": 8-18}, "need": null | {"needType": string, "budget": string, "note": string}}]}
Quy tắc: bước đầu tiên có id "start"; 5-9 bước; mỗi bước không handoff có 2-3 nút; bước handoff không có nút; phải có một bước hẹn xem nhà mẫu/dự án với appointment và handoff=true; có bước hỏi nhu cầu/tầm tài chính dùng need; mọi "next" trỏ tới id tồn tại.`;

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
    let streamError: unknown;
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions,
      prompt: `Dữ liệu dự án (json): ${facts}`,
      onError: ({ error }) => { streamError = error; },
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
    });
    const text = await result.text;
    if (streamError || !text) {
      const status = (streamError as any)?.statusCode;
      if (status === 402) throw new Error("Hết lượt AI, vui lòng nạp thêm credits.");
      if (status === 429) throw new Error("AI đang bận, thử lại sau ít phút.");
      console.error("[chat-flow-ai]", streamError);
      throw new Error("AI chưa tạo được kịch bản, thử lại sau.");
    }
    const raw = (() => { try { return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { return null; } })();
    if (!raw?.nodes) throw new Error("AI trả về kịch bản chưa hợp lệ, thử lại.");
    const draft: ChatFlow = {
      id: uid(), name: String(raw.name || `Kịch bản ${p.name}`).slice(0, 80), enabled: false, trigger: "first_message", keywords: [], startNodeId: "start",
      nodes: (raw.nodes as any[]).slice(0, 40).map((n) => ({
        id: String(n.id).slice(0, 40), text: String(n.text ?? "").slice(0, 800) || "…", media: [], tag: String(n.tag ?? "").slice(0, 30), handoff: !!n.handoff,
        appointment: n.appointment ? { title: String(n.appointment.title || `Xem dự án ${p.name}`).slice(0, 120), location: String(n.appointment.location ?? "").slice(0, 160), daysAhead: Math.min(30, Math.max(0, Math.round(Number(n.appointment.daysAhead) || 1))), hour: Math.min(20, Math.max(7, Math.round(Number(n.appointment.hour) || 9))) } : null,
        need: n.need ? { needType: String(n.need.needType ?? "").slice(0, 60), budget: String(n.need.budget ?? "").slice(0, 60), note: String(n.need.note ?? "").slice(0, 200) } : null,
        buttons: n.handoff ? [] : (Array.isArray(n.buttons) ? n.buttons : []).slice(0, 6).map((b: any) => ({ id: `b${uid().slice(0, 6)}`, label: String(b.label ?? "").slice(0, 40) || "Tiếp", keywords: (Array.isArray(b.keywords) ? b.keywords : []).map((k: any) => String(k).slice(0, 40)).filter(Boolean).slice(0, 10), next: b.next ? String(b.next) : null })),
      })),
    };
    const ids = new Set(draft.nodes.map((n) => n.id));
    draft.nodes.forEach((n) => n.buttons.forEach((b) => { if (b.next && !ids.has(b.next)) b.next = null; }));
    if (!ids.has("start")) draft.startNodeId = draft.nodes[0]?.id ?? "start";
    const ok = flowSchema.safeParse(draft);
    if (!ok.success) throw new Error("AI trả về kịch bản chưa hợp lệ, thử lại.");
    return ok.data;
  });
