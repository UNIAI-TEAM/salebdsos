import { describe, expect, it } from "vitest";
import { FLOW_TEMPLATES } from "./chat-flow-templates";
import { appointmentSlot, flowSchema, stepBot } from "./chat-flows";

describe("flow templates", () => {
  it("every template is a valid flow", () => {
    for (const t of FLOW_TEMPLATES) expect(flowSchema.safeParse(t.build()).success, t.key).toBe(true);
  });
  it("visit template returns appointment action at 9h next day", () => {
    const f = { ...FLOW_TEMPLATES.find((t) => t.key === "visit")!.build(), enabled: true };
    const s = stepBot([f], null, "xem nha mau", true);
    const r = stepBot([f], s.state, "Sáng mai", false);
    expect(r.appointment?.hour).toBe(9);
    expect(r.handoff).toBe(true);
  });
  it("survey template returns budget need", () => {
    const f = { ...FLOW_TEMPLATES.find((t) => t.key === "survey")!.build(), enabled: true };
    const a = stepBot([f], null, "hi", true);
    const b = stepBot([f], a.state, "Để ở", false);
    expect(b.need?.needType).toBe("Mua để ở");
    expect(stepBot([f], b.state, "3–5 tỷ", false).need?.budget).toBe("3–5 tỷ");
  });
  it("appointment slot is in Vietnam time", () => {
    const s = appointmentSlot({ title: "x", location: "", daysAhead: 1, hour: 9 }, new Date("2026-10-26T07:00:00Z"));
    expect(s.startsAt).toBe("2026-10-27T02:00:00.000Z");
  });
});
