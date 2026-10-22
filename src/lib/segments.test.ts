import { describe, it, expect } from "vitest";
import { matchLead, reachable, segmentSchema, renderTemplate } from "./segments";

const now = Date.parse("2026-10-22T00:00:00Z");
const lead = {
  status: "new", source: "landing", project_id: "p1",
  created_at: "2026-10-15T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
  phone: "0900000000", email: null,
};

describe("segments", () => {
  it("filters by project, status, source", () => {
    const s = segmentSchema.parse({ projectIds: ["p1"], statuses: ["new"], sources: ["landing"] });
    expect(matchLead(lead, s, now)).toBe(true);
    expect(matchLead({ ...lead, project_id: "p2" }, s, now)).toBe(false);
  });
  it("created within 7 days excludes older leads", () => {
    const s = segmentSchema.parse({ createdWithinDays: 7 });
    expect(matchLead(lead, s, now)).toBe(true);
    expect(matchLead({ ...lead, created_at: "2026-10-01T00:00:00Z" }, s, now)).toBe(false);
  });
  it("inactive 14 days keeps only stale leads", () => {
    const s = segmentSchema.parse({ inactiveDays: 14 });
    expect(matchLead(lead, s, now)).toBe(true);
    expect(matchLead({ ...lead, updated_at: "2026-10-20T00:00:00Z" }, s, now)).toBe(false);
  });
  it("excludes won customers by default", () => {
    expect(matchLead({ ...lead, status: "won" }, segmentSchema.parse({}), now)).toBe(false);
  });
  it("unsubscribed or missing contact is not reachable", () => {
    expect(reachable(lead, "email")).toBe(false);
    expect(reachable(lead, "sms")).toBe(true);
    expect(reachable({ ...lead, meta: { unsubscribed: true } }, "sms")).toBe(false);
  });
  it("renders template variables", () => {
    expect(renderTemplate("Chào {name}!", { name: "An" })).toBe("Chào An!");
  });
});
