import { describe, it, expect } from "vitest";
import { hideReason, spin, buildReply, expandShortcut, parseSocialSettings } from "./social";

const cfg = { hidePhone: true, hideKeywords: ["inbox giá"] };

describe("social automation", () => {
  it("hides comments containing a VN phone number", () => {
    expect(hideReason("Gọi em 0912 345 678 nhé", cfg)).toBe("phone");
  });
  it("hides comments with sensitive keywords", () => {
    expect(hideReason("Inbox giá giúp em", cfg)).toBe("keyword");
  });
  it("keeps normal comments", () => {
    expect(hideReason("Dự án đẹp quá", cfg)).toBeNull();
  });
  it("spin picks one option per group", () => {
    const out = spin("{Dạ|Vâng} anh", 1);
    expect(["Dạ anh", "Vâng anh"]).toContain(out);
  });
  it("same comment gets the same reply; vars are filled", () => {
    const t = ["Chào {name}, {a|b}"];
    expect(buildReply(t, "c1", { name: "An" })).toBe(buildReply(t, "c1", { name: "An" }));
    expect(buildReply(t, "c1", { name: "An" })).toMatch(/^Chào An, [ab]$/);
  });
  it("expands /gia shortcut at end of draft", () => {
    const r = [{ shortcut: "gia", text: "Bảng giá" }];
    expect(expandShortcut("Dạ /gia", r)).toBe("Dạ Bảng giá");
    expect(expandShortcut("/khac", r)).toBeNull();
  });
  it("defaults include /gia /vitri /chinhsach", () => {
    expect(parseSocialSettings({}).quickReplies.map((q) => q.shortcut)).toEqual(["gia", "vitri", "chinhsach"]);
  });
});
