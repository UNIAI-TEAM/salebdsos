import { describe, it, expect } from "vitest";
import { statusForStage } from "./pipeline-stage";

describe("statusForStage", () => {
  it("Thành công → won", () => expect(statusForStage({ name: "Thành công", position: 5, win_probability: 100 })).toBe("won"));
  it("Thất bại → lost", () => expect(statusForStage({ name: "Thất bại", position: 6, win_probability: 0 })).toBe("lost"));
  it("Đặt cọc → open", () => expect(statusForStage({ name: "Đặt cọc", position: 4, win_probability: 80 })).toBe("open"));
  it("first stage at 0% stays open", () => expect(statusForStage({ name: "Mới", position: 0, win_probability: 0 })).toBe("open"));
});
