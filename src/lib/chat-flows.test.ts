import { describe, expect, it } from "vitest";
import { flowSchema, stepBot, templateFlow, type ChatFlow } from "./chat-flows";

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
  it("hands off to Sale on handoff node, unmatched reply, or explicit request", () => {
    const s = { flowId: "f1", nodeId: "start" };
    expect(stepBot([flow()], s, "3", false)).toMatchObject({ handoff: true, state: null, tag: "Hẹn xem nhà mẫu" });
    expect(stepBot([flow()], s, "căn góc tầng mấy?", false)).toMatchObject({ handoff: true, reason: "no_match" });
    expect(stepBot([flow()], s, "cho tôi gặp sale", false)).toMatchObject({ handoff: true, reason: "handoff_request" });
  });
  it("keyword trigger matches whole words only", () => {
    const k = { ...flow(), trigger: "keyword" as const, keywords: ["giá"] };
    expect(stepBot([k], null, "báo giá đi", false).reason).toBe("start");
    expect(stepBot([k], null, "giang", false).reason).toBe("idle");
  });
  it("rejects buttons pointing to missing steps", () => {
    const f = flow();
    f.nodes[0].buttons[0].next = "missing";
    expect(flowSchema.safeParse(f).success).toBe(false);
  });
});
