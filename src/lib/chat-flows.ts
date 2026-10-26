// Kịch bản chat dạng cây phân nhánh. Pure: dùng chung builder, mô phỏng và máy chủ.
import { z } from "zod";

export const CHAT_FLOWS_KEY = "chat_flows";
/** Kênh bot đang tự trả lời thật. Kênh khác chỉ mô phỏng cho tới khi gửi đi được xác minh. */
export const BOT_LIVE_CHANNELS = ["web_chat"] as const;
export const HANDOFF_WORDS = ["gap sale", "gap tu van vien", "nguoi that", "tu van vien", "nhan vien"];

const id = z.string().trim().min(1).max(40);
export const buttonSchema = z.object({
  id,
  label: z.string().trim().min(1).max(40),
  keywords: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  next: id.nullable().default(null),
});
export const mediaSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().trim().url().max(1000).refine((u) => u.startsWith("https://"), "Đường dẫn phải bắt đầu bằng https://"),
  caption: z.string().trim().max(120).default(""),
});
export const nodeSchema = z.object({
  id,
  media: z.array(mediaSchema).max(4).default([]),
  text: z.string().trim().min(1).max(800),
  buttons: z.array(buttonSchema).max(6).default([]),
  tag: z.string().trim().max(30).default(""),
  handoff: z.boolean().default(false),
});
export const flowSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  enabled: z.boolean().default(false),
  trigger: z.enum(["first_message", "keyword"]).default("keyword"),
  keywords: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  startNodeId: id,
  nodes: z.array(nodeSchema).min(1).max(40),
}).superRefine((f, ctx) => {
  const ids = new Set(f.nodes.map((n) => n.id));
  if (ids.size !== f.nodes.length) ctx.addIssue({ code: "custom", message: "Trùng mã bước" });
  if (!ids.has(f.startNodeId)) ctx.addIssue({ code: "custom", message: "Thiếu bước bắt đầu" });
  for (const n of f.nodes) for (const b of n.buttons)
    if (b.next && !ids.has(b.next)) ctx.addIssue({ code: "custom", message: `Nút "${b.label}" trỏ tới bước không tồn tại` });
  if (f.trigger === "keyword" && f.keywords.length === 0) ctx.addIssue({ code: "custom", message: "Cần ít nhất một từ khóa kích hoạt" });
});
export const chatFlowsSchema = z.object({ flows: z.array(flowSchema).max(30).default([]) });

export type ChatMedia = z.infer<typeof mediaSchema>;
export type ChatButton = z.infer<typeof buttonSchema>;
export type ChatNode = z.infer<typeof nodeSchema>;
export type ChatFlow = z.infer<typeof flowSchema>;
export type ChatFlows = z.infer<typeof chatFlowsSchema>;

export function parseChatFlows(v: unknown): ChatFlows {
  const r = chatFlowsSchema.safeParse(v ?? {});
  return r.success ? r.data : { flows: [] };
}

export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const has = (text: string, kw: string) => {
  const k = norm(kw);
  return k.length > 0 && ` ${norm(text)} `.includes(` ${k} `);
};

export function wantsHuman(text: string) {
  return HANDOFF_WORDS.some((w) => has(text, w));
}

/** Chọn kịch bản khi chưa có bot đang chạy. */
export function pickFlow(flows: ChatFlow[], text: string, isFirstMessage: boolean): ChatFlow | null {
  const on = flows.filter((f) => f.enabled);
  return on.find((f) => f.trigger === "keyword" && f.keywords.some((k) => has(text, k)))
    ?? (isFirstMessage ? on.find((f) => f.trigger === "first_message") ?? null : null);
}

export function matchButton(node: ChatNode, text: string): ChatButton | null {
  const t = text.trim();
  const n = Number(t);
  if (Number.isInteger(n) && n >= 1 && n <= node.buttons.length) return node.buttons[n - 1];
  return node.buttons.find((b) => norm(b.label) === norm(t) || b.keywords.some((k) => has(t, k))) ?? null;
}

export function renderNode(node: ChatNode, vars: Record<string, string>) {
  const text = node.text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? (k === "name" ? "anh/chị" : m));
  const options = node.buttons.map((b, i) => `${i + 1}. ${b.label}`).join("\n");
  return options ? `${text}\n\n${options}` : text;
}

export type BotState = { flowId: string; nodeId: string } | null;
export type BotStep = {
  reply: string | null;
  media: ChatMedia[];
  state: BotState;
  handoff: boolean;
  tag: string | null;
  reason: "start" | "next" | "handoff_node" | "handoff_request" | "no_match" | "end" | "idle";
};

/** Một lượt bot: từ trạng thái hiện tại + tin khách → tin trả lời, trạng thái mới, có chuyển Sale không. */
export function stepBot(flows: ChatFlow[], state: BotState, text: string, isFirstMessage: boolean, vars: Record<string, string> = {}): BotStep {
  const idle: BotStep = { reply: null, media: [], state: null, handoff: false, tag: null, reason: "idle" };
  const enter = (flow: ChatFlow, nodeId: string, reason: BotStep["reason"]): BotStep => {
    const node = flow.nodes.find((n) => n.id === nodeId)!;
    const end = node.handoff || node.buttons.length === 0;
    return {
      reply: renderNode(node, vars),
      media: node.media ?? [],
      state: end ? null : { flowId: flow.id, nodeId },
      handoff: node.handoff,
      tag: node.tag || null,
      reason: node.handoff ? "handoff_node" : end ? "end" : reason,
    };
  };
  const current = state ? flows.find((f) => f.id === state.flowId && f.enabled) : null;
  const node = current?.nodes.find((n) => n.id === state!.nodeId);
  if (current && node) {
    if (wantsHuman(text)) return { media: [], reply: "Dạ, em chuyển anh/chị sang chuyên viên tư vấn ngay ạ.", state: null, handoff: true, tag: null, reason: "handoff_request" };
    const b = matchButton(node, text);
    if (!b) return { media: [], reply: "Dạ, chuyên viên tư vấn sẽ phản hồi anh/chị trong ít phút nữa ạ.", state: null, handoff: true, tag: null, reason: "no_match" };
    if (!b.next) return { reply: null, media: [], state: null, handoff: true, tag: null, reason: "handoff_node" };
    return enter(current, b.next, "next");
  }
  const flow = pickFlow(flows, text, isFirstMessage);
  return flow ? enter(flow, flow.startNodeId, "start") : idle;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function templateFlow(): ChatFlow {
  return {
    id: uid(), name: "Tư vấn căn hộ", enabled: false, trigger: "first_message", keywords: [], startNodeId: "start",
    nodes: [
      { id: "start", text: "Chào {name}! Em là trợ lý dự án {project}. Anh/chị quan tâm điều gì ạ?", media: [], tag: "", handoff: false, buttons: [
        { id: "b1", label: "Xem bảng giá", keywords: ["gia", "bang gia"], next: "price" },
        { id: "b2", label: "Mặt bằng căn hộ", keywords: ["mat bang", "2pn", "3pn"], next: "layout" },
        { id: "b3", label: "Hẹn xem nhà mẫu", keywords: ["hen", "xem nha"], next: "visit" },
      ] },
      { id: "price", text: "Bảng giá mới nhất từ ... tỷ/căn. Anh/chị muốn nhận bảng tính dòng tiền không?", media: [], tag: "Đang khảo sát", handoff: false, buttons: [
        { id: "b4", label: "Có, gửi giúp em", keywords: ["co", "ok"], next: "handoff" },
        { id: "b5", label: "Hẹn xem nhà mẫu", keywords: ["hen"], next: "visit" },
      ] },
      { id: "layout", text: "Dự án có căn 1PN, 2PN, 3PN. Anh/chị cần loại nào để em gửi mặt bằng chi tiết?", media: [], tag: "Đang khảo sát", handoff: false, buttons: [
        { id: "b6", label: "Gặp chuyên viên", keywords: [], next: "handoff" },
      ] },
      { id: "visit", text: "Dạ, chuyên viên sẽ gọi để chốt giờ xem nhà mẫu với anh/chị ngay ạ.", media: [], tag: "Hẹn xem nhà mẫu", handoff: true, buttons: [] },
      { id: "handoff", text: "Dạ, chuyên viên tư vấn sẽ liên hệ anh/chị trong ít phút nữa ạ.", media: [], tag: "", handoff: true, buttons: [] },
    ],
  };
}
