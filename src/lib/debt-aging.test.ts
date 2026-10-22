import { describe, expect, it } from "vitest";
import { agingBucket } from "./debt-aging";

const today = "2026-10-22";
describe("tuổi nợ", () => {
  it("hạn hôm nay hoặc trong 7 ngày tới là đến hạn", () => {
    expect(agingBucket("2026-10-22", today)).toBe("due");
    expect(agingBucket("2026-10-29", today)).toBe("due");
    expect(agingBucket("2026-10-30", today)).toBe("not_due");
  });
  it("quá hạn 1–15 ngày", () => {
    expect(agingBucket("2026-10-21", today)).toBe("d1_15");
    expect(agingBucket("2026-10-07", today)).toBe("d1_15");
  });
  it("quá hạn 16–30 ngày", () => {
    expect(agingBucket("2026-10-06", today)).toBe("d16_30");
    expect(agingBucket("2026-09-22", today)).toBe("d16_30");
  });
  it("quá hạn trên 30 ngày", () => {
    expect(agingBucket("2026-09-21", today)).toBe("d30_plus");
  });
});

import { reminderKind } from "./debt-aging";
describe("reminderKind", () => {
  it("còn 4 ngày chưa nhắc", () => expect(reminderKind("2026-10-26", "2026-10-22")).toBe(null));
  it("còn 3 ngày nhắc sắp đến hạn", () => expect(reminderKind("2026-10-25", "2026-10-22")).toBe("due_3"));
  it("đúng hạn", () => expect(reminderKind("2026-10-22", "2026-10-22")).toBe("due_0"));
  it("quá 10 ngày", () => expect(reminderKind("2026-10-12", "2026-10-22")).toBe("overdue_1"));
  it("quá 16 ngày", () => expect(reminderKind("2026-10-06", "2026-10-22")).toBe("overdue_15"));
  it("quá 40 ngày", () => expect(reminderKind("2026-09-12", "2026-10-22")).toBe("overdue_30"));
});
