import { describe, expect, it } from "vitest";
import { flowSchema, pickCommentFlow, stepBot, templateFlow, type ChatFlow } from "./chat-flows";

const flow = (): ChatFlow => ({ ...templateFlow(), id: "f1", enabled: true });

describe("chat flows", () => {
  it("starts first-message flow and lists buttons", () => {
    const r = stepBot([flow()], null, "xin chào", true, { project: "Aurora" });
    expect(r.reason).toBe("start");
    expect(r.reply).toContain("Aurora");
    expect(r.reply).toContain("1. Xem bảng giá");
    expect(r.state).toEqual({ flowId: "f1", nodeId: "start" });
  });
  it("does not start first-message flow on later messages", () => {
    expect(stepBot([flow()], null, "xin chào", false).reason).toBe("idle");
  });
  it("disabled flows never reply", () => {
    expect(stepBot([{ ...flow(), enabled: false }], null, "hi", true).reply).toBeNull();
  });
  it("branches by number, label or keyword without diacritics", () => {
    const s = { flowId: "f1", nodeId: "start" };
    expect(stepBot([flow()], s, "1", false).state?.nodeId).toBe("price");
    expect(stepBot([flow()], s, "Mặt bằng căn hộ", false).state?.nodeId).toBe("layout");
    expect(stepBot([flow()], s, "cho xem bang gia", false).state?.nodeId).toBe("price");
  });
  it("hands off only on configured node or explicit request", () => {
    const s = { flowId: "f1", nodeId: "start" };
    expect(stepBot([flow()], s, "3", false)).toMatchObject({ handoff: true, state: null, tag: "Hẹn xem nhà mẫu" });
    expect(stepBot([flow()], s, "căn góc tầng mấy?", false)).toMatchObject({ handoff: false, state: s, reason: "no_match" });
    expect(stepBot([flow()], s, "cho tôi gặp sale", false)).toMatchObject({ handoff: true, reason: "handoff_request" });
  });
  it("human request works without a running flow", () => {
    expect(stepBot([], null, "tôi cần gặp nhân viên", false)).toMatchObject({ handoff: true, reason: "handoff_request" });
  });
  it("answers keyword FAQ even while another flow is active", () => {
    const faq = { ...flow(), id: "faq", trigger: "keyword" as const, keywords: ["pháp lý"], startNodeId: "answer", nodes: [{ ...flow().nodes[0], id: "answer", text: "Hồ sơ pháp lý đã duyệt", buttons: [] }] };
    expect(stepBot([flow(), faq], { flowId: "f1", nodeId: "start" }, "pháp lý thế nào", false)).toMatchObject({ handoff: false, reply: "Hồ sơ pháp lý đã duyệt" });
  });
  it("keyword trigger matches whole words only", () => {
    const k = { ...flow(), trigger: "keyword" as const, keywords: ["giá"] };
    expect(stepBot([k], null, "báo giá đi", false).reason).toBe("start");
    expect(stepBot([k], null, "giang", false).reason).toBe("idle");
  });
  it("sends step media and rejects non-https media", () => {
    const f = flow();
    f.nodes[0].media = [{ type: "image", url: "https://cdn.example.com/a.jpg", caption: "Phối cảnh" }];
    expect(stepBot([f], null, "hi", true).media).toHaveLength(1);
    f.nodes[0].media = [{ type: "video", url: "http://x.com/a.mp4", caption: "" }];
    expect(flowSchema.safeParse(f).success).toBe(false);
  });
  it("rejects buttons pointing to missing steps", () => {
    const f = flow();
    f.nodes[0].buttons[0].next = "missing";
    expect(flowSchema.safeParse(f).success).toBe(false);
  });

  it("event QR entry starts its flow on any text, others ignore it", () => {
    const qr: ChatFlow = { ...flow(), id: "q", trigger: "event_qr", entryCode: "sk-aurora" };
    expect(stepBot([qr], null, "xin chào", false, {}, "sk-aurora").reason).toBe("start");
    expect(stepBot([qr], null, "xin chào", true).reason).toBe("idle");
    expect(stepBot([qr], null, "hi", true, {}, "sk-khac").reason).toBe("idle");
  });
  it("fanpage comment flow filters by post and keyword", () => {
    const c: ChatFlow = { ...flow(), trigger: "fb_comment", postIds: ["p1"], keywords: ["gia"] };
    expect(pickCommentFlow([c], "p1", "Giá bao nhiêu?")?.id).toBe("f1");
    expect(pickCommentFlow([c], "p2", "giá")).toBeNull();
    expect(pickCommentFlow([c], "p1", "đẹp quá")).toBeNull();
    expect(stepBot([c], null, "giá", true).reason).toBe("idle");
  });
});
