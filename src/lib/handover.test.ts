import { describe, it, expect } from "vitest";
import { planHandover, canHandover } from "./handover";

const m = [
  { team_id: "A", user_id: "head", is_lead: true },
  { team_id: "A", user_id: "s1", is_lead: false },
  { team_id: "A", user_id: "s2", is_lead: false },
  { team_id: "B", user_id: "s3", is_lead: false },
];

describe("handover", () => {
  it("spreads to least-loaded", () => {
    const p = planHandover(["a", "b", "c"], ["x", "y"], { x: 2, y: 0 });
    expect(p).toEqual({ a: "y", b: "y", c: "x" });
  });
  it("head can hand over inside own department", () =>
    expect(canHandover({ isAdmin: false, manageable: ["A"] }, "s1", ["s2"], m)).toBe(true));
  it("head cannot hand over to another department", () =>
    expect(canHandover({ isAdmin: false, manageable: ["A"] }, "s1", ["s3"], m)).toBe(false));
  it("cannot hand over to self", () =>
    expect(canHandover({ isAdmin: true, manageable: [] }, "s1", ["s1"], m)).toBe(false));
});
