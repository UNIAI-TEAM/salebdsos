import { describe, expect, it } from "vitest";
import { canAutoSend, parseRating, parseSupportConfig, renderSurvey, shouldReopen, shouldCreateSupportTicket, surveyOpen, ticketDueAt } from "./support";

const cfg = parseSupportConfig({});
const now = new Date("2026-10-29T07:00:00Z");

describe("support config", () => {
  it("ordinary chatbot questions never create tickets", () => {
    expect(shouldCreateSupportTicket(cfg, false)).toBe(false);
  });
  it("handoff creates a ticket only when automatic handoff tickets are enabled", () => {
    expect(shouldCreateSupportTicket(cfg, true)).toBe(true);
    expect(shouldCreateSupportTicket({ ...cfg, ticket: { ...cfg.ticket, autoCreate: false } }, true)).toBe(false);
  });
  it("defaults: auto ticket, SLA 30 phút, mở lại trong 24h, CSAT bật", () => {
    expect(cfg.ticket.autoCreate).toBe(true);
    expect(ticketDueAt(cfg, now)).toBe("2026-10-29T07:30:00.000Z");
    expect(cfg.csat.enabled).toBe(true);
  });
  it("mở lại ticket xử lý trong 24h, quá hạn thì tạo mới", () => {
    expect(shouldReopen(cfg, "2026-10-28T08:00:00Z", now)).toBe(true);
    expect(shouldReopen(cfg, "2026-10-28T06:00:00Z", now)).toBe(false);
  });
  it("đọc điểm 1–5", () => {
    expect(parseRating("5")).toEqual({ score: 5, comment: "" });
    expect(parseRating("4 sao - nhanh")).toEqual({ score: 4, comment: "nhanh" });
    expect(parseRating("6")).toBeNull();
    expect(parseRating("12")).toBeNull();
    expect(parseRating("cho em giá căn 2PN")).toBeNull();
  });
  it("khảo sát hết hạn sau 48h hoặc khi đã chấm", () => {
    expect(surveyOpen(cfg, "2026-10-28T07:00:00Z", null, now)).toBe(true);
    expect(surveyOpen(cfg, "2026-10-27T06:00:00Z", null, now)).toBe(false);
    expect(surveyOpen(cfg, "2026-10-28T07:00:00Z", "2026-10-28T08:00:00Z", now)).toBe(false);
  });
  it("khảo sát liệt kê 5 lựa chọn", () => {
    expect(renderSurvey(cfg)).toContain("5. Rất tốt");
  });
  it("chỉ tự gửi trên kênh đã kiểm chứng", () => {
    expect(canAutoSend("zalo")).toBe(true);
    expect(canAutoSend("messenger")).toBe(false);
  });
});
