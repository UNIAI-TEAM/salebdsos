// Kịch bản chat dạng cây phân nhánh. Pure: dùng chung builder, mô phỏng và máy chủ.
import { z } from "zod";
import { SUPPORT_COPY } from "./support-copy";

export const CHAT_FLOWS_KEY = "chat_flows";
/** Kênh bot đang tự trả lời thật. Kênh khác chỉ mô phỏng cho tới khi gửi đi được xác minh. */
export const BOT_LIVE_CHANNELS = ["web_chat"] as const;
export const HANDOFF_WORDS = ["gap sale", "gap tu van vien", "gap chuyen vien", "nguoi that", "tu van vien", "nhan vien"];

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
export const appointmentActionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  location: z.string().trim().max(160).default(""),
  daysAhead: z.number().int().min(0).max(30).default(1),
  hour: z.number().int().min(7).max(20).default(9),
});
export const needActionSchema = z.object({
  needType: z.string().trim().max(60).default(""),
  budget: z.string().trim().max(60).default(""),
  note: z.string().trim().max(200).default(""),
});
export const nodeSchema = z.object({
  id,
  appointment: appointmentActionSchema.nullable().default(null),
  need: needActionSchema.nullable().default(null),
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
  trigger: z.enum(["first_message", "keyword", "fb_comment", "event_qr"]).default("keyword"),
  keywords: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  /** fb_comment: chỉ chạy với các bài viết này (rỗng = mọi bài). */
  postIds: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  /** event_qr: mã gắn vào QR sự kiện (?chat=<entryCode>). */
  entryCode: z.string().trim().max(40).default(""),
  startNodeId: id,
  nodes: z.array(nodeSchema).min(1).max(40),
}).superRefine((f, ctx) => {
  const ids = new Set(f.nodes.map((n) => n.id));
  if (ids.size !== f.nodes.length) ctx.addIssue({ code: "custom", message: "Trùng mã bước" });
  if (!ids.has(f.startNodeId)) ctx.addIssue({ code: "custom", message: "Thiếu bước bắt đầu" });
  for (const n of f.nodes) for (const b of n.buttons)
    if (b.next && !ids.has(b.next)) ctx.addIssue({ code: "custom", message: `Nút "${b.label}" trỏ tới bước không tồn tại` });
  if (f.trigger === "keyword" && f.keywords.length === 0) ctx.addIssue({ code: "custom", message: "Cần ít nhất một từ khóa kích hoạt" });
  if (f.trigger === "event_qr" && !/^[a-z0-9-]{4,40}$/.test(f.entryCode)) ctx.addIssue({ code: "custom", message: "Mã QR sự kiện chỉ gồm chữ thường, số, gạch ngang (4–40 ký tự)" });
});
export const chatFlowsSchema = z.object({ flows: z.array(flowSchema).max(30).default([]) });

export type AppointmentAction = z.infer<typeof appointmentActionSchema>;
export type NeedAction = z.infer<typeof needActionSchema>;
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

/** Chọn kịch bản khi chưa có bot đang chạy. `entry` = mã QR sự kiện khách vừa quét. */
export function pickFlow(flows: ChatFlow[], text: string, isFirstMessage: boolean, entry?: string | null): ChatFlow | null {
  const on = flows.filter((f) => f.enabled);
  if (entry) {
    const byQr = on.find((f) => f.trigger === "event_qr" && f.entryCode === entry);
    if (byQr) return byQr;
  }
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
  appointment: AppointmentAction | null;
  need: NeedAction | null;
  reason: "start" | "next" | "handoff_node" | "handoff_request" | "no_match" | "end" | "idle";
};

/** Kịch bản mở đầu cho bình luận Fanpage: lọc theo bài viết và từ khóa (rỗng = mọi bình luận). */
export function pickCommentFlow(flows: ChatFlow[], postId: string | null, text: string): ChatFlow | null {
  return flows.find((f) => f.enabled && f.trigger === "fb_comment"
    && (f.postIds.length === 0 || (!!postId && f.postIds.includes(postId)))
    && (f.keywords.length === 0 || f.keywords.some((k) => has(text, k)))) ?? null;
}

/** Một lượt bot: từ trạng thái hiện tại + tin khách → tin trả lời, trạng thái mới, có chuyển Sale không. */
export function stepBot(flows: ChatFlow[], state: BotState, text: string, isFirstMessage: boolean, vars: Record<string, string> = {}, entry: string | null = null, fallback: string = SUPPORT_COPY.fallbackDefault): BotStep {
  const idle: BotStep = { reply: null, media: [], state: null, handoff: false, tag: null, appointment: null, need: null, reason: "idle" };
  const enter = (flow: ChatFlow, nodeId: string, reason: BotStep["reason"]): BotStep => {
    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node) return idle;
    const end = node.handoff || node.buttons.length === 0;
    return {
      reply: renderNode(node, vars),
      media: node.media ?? [],
      state: end ? null : { flowId: flow.id, nodeId },
      handoff: node.handoff,
      tag: node.tag || null,
      appointment: node.appointment ?? null,
      need: node.need ?? null,
      reason: node.handoff ? "handoff_node" : end ? "end" : reason,
    };
  };
  const current = state ? flows.find((f) => f.id === state.flowId && f.enabled) : null;
  const node = current?.nodes.find((n) => n.id === state?.nodeId);
  if (wantsHuman(text)) return { ...idle, reply: SUPPORT_COPY.handoff, handoff: true, reason: "handoff_request" };
  if (current && node) {
    const b = matchButton(node, text);
    if (!b) {
      const other = pickFlow(flows, text, false, entry);
      if (other) return enter(other, other.startNodeId, "start");
      return { ...idle, reply: `${fallback}\n\n${node.buttons.map((button, i) => `${i + 1}. ${button.label}`).join("\n")}`, state, reason: "no_match" };
    }
    if (!b.next) return { reply: null, media: [], state: null, handoff: true, tag: null, appointment: null, need: null, reason: "handoff_node" };
    return enter(current, b.next, "next");
  }
  const flow = pickFlow(flows, text, isFirstMessage, entry);
  return flow ? enter(flow, flow.startNodeId, "start") : idle;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function templateFlow(): ChatFlow {
  return {
    id: uid(), name: "Tư vấn căn hộ", enabled: false, trigger: "first_message", keywords: [], postIds: [], entryCode: "", startNodeId: "start",
    nodes: [
      { id: "start", text: "Chào {name}! Em là trợ lý dự án {project}. Anh/chị quan tâm điều gì ạ?", media: [], tag: "", handoff: false, appointment: null, need: null, buttons: [
        { id: "b1", label: "Xem bảng giá", keywords: ["gia", "bang gia"], next: "price" },
        { id: "b2", label: "Mặt bằng căn hộ", keywords: ["mat bang", "2pn", "3pn"], next: "layout" },
        { id: "b3", label: "Hẹn xem nhà mẫu", keywords: ["hen", "xem nha"], next: "visit" },
      ] },
      { id: "price", text: "Bảng giá mới nhất từ ... tỷ/căn. Anh/chị muốn nhận bảng tính dòng tiền không?", media: [], tag: "Đang khảo sát", handoff: false, appointment: null, need: null, buttons: [
        { id: "b4", label: "Có, gửi giúp em", keywords: ["co", "ok"], next: "handoff" },
        { id: "b5", label: "Hẹn xem nhà mẫu", keywords: ["hen"], next: "visit" },
      ] },
      { id: "layout", text: "Dự án có căn 1PN, 2PN, 3PN. Anh/chị cần loại nào để em gửi mặt bằng chi tiết?", media: [], tag: "Đang khảo sát", handoff: false, appointment: null, need: null, buttons: [
        { id: "b6", label: "Gặp chuyên viên", keywords: [], next: "handoff" },
      ] },
      { id: "visit", text: "Dạ, chuyên viên sẽ gọi để chốt giờ xem nhà mẫu với anh/chị ngay ạ.", media: [], tag: "Hẹn xem nhà mẫu", handoff: true, appointment: { title: "Xem nhà mẫu", location: "", daysAhead: 1, hour: 9 }, need: null, buttons: [] },
      { id: "handoff", text: "Dạ, chuyên viên tư vấn sẽ liên hệ anh/chị trong ít phút nữa ạ.", media: [], tag: "", handoff: true, appointment: null, need: null, buttons: [] },
    ],
  };
}

/** Giờ hẹn theo giờ Việt Nam (UTC+7): ngày hiện tại + daysAhead, đúng giờ `hour`. */
export function appointmentSlot(a: AppointmentAction, now = new Date()) {
  const vn = new Date(now.getTime() + 7 * 3600_000);
  const start = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + a.daysAhead, a.hour - 7, 0, 0));
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 3600_000).toISOString() };
}
