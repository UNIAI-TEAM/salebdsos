import { describe, it, expect } from "vitest";
import { departmentScope, canReassign } from "./departments";

const m = [
  { team_id: "A", user_id: "lead", is_lead: true },
  { team_id: "A", user_id: "s1", is_lead: false },
  { team_id: "B", user_id: "s2", is_lead: false },
];

describe("department scope", () => {
  it("admin sees all departments", () => expect(departmentScope(["admin"], "x", m, ["A", "B"]).viewable).toEqual(["A", "B"]));
  it("head sees only own department", () => expect(departmentScope(["agent"], "lead", m, ["A", "B"]).viewable).toEqual(["A"]));
  it("plain sale sees none", () => expect(departmentScope(["agent"], "s1", m, ["A", "B"]).viewable).toEqual([]));
  it("head cannot reassign to another department's sale", () => {
    const s = departmentScope(["agent"], "lead", m, ["A", "B"]);
    expect(canReassign(s, "A", "s1", m)).toBe(true);
    expect(canReassign(s, "A", "s2", m)).toBe(false);
    expect(canReassign(s, "B", "s2", m)).toBe(false);
  });
});
