import { describe, expect, it } from "vitest";
import { buildRentSchedule } from "./rental";

describe("buildRentSchedule", () => {
  it("sinh đợt cọc + 12 tháng thuê cho hợp đồng 1 năm", () => {
    const rows = buildRentSchedule({
      leaseStart: "2026-11-01",
      leaseEnd: "2027-10-31",
      cycleDay: 5,
      monthlyRent: 15_000_000,
      deposit: 30_000_000,
    });
    expect(rows).toHaveLength(13);
    expect(rows[0]).toMatchObject({ name: "Tiền cọc", amount: 30_000_000, due_date: "2026-11-01" });
    expect(rows[1]).toMatchObject({ name: "Tiền thuê tháng 1 (11/2026)", amount: 15_000_000, due_date: "2026-11-05" });
    expect(rows[12]).toMatchObject({ name: "Tiền thuê tháng 12 (10/2027)", due_date: "2027-10-05" });
  });

  it("ngày thu trước ngày bắt đầu thì đợt đầu đáo hạn ngay ngày bắt đầu", () => {
    const rows = buildRentSchedule({
      leaseStart: "2026-11-20",
      leaseEnd: "2027-02-28",
      cycleDay: 5,
      monthlyRent: 10_000_000,
      deposit: 0,
    });
    expect(rows[0]).toMatchObject({ name: "Tiền thuê tháng 1 (11/2026)", due_date: "2026-11-20" });
    expect(rows[1]).toMatchObject({ due_date: "2026-12-05" });
  });

  it("kẹp ngày 31 về cuối tháng 2", () => {
    const rows = buildRentSchedule({
      leaseStart: "2027-01-31",
      leaseEnd: "2027-03-31",
      cycleDay: 31,
      monthlyRent: 8_000_000,
      deposit: 0,
    });
    expect(rows.map((r) => r.due_date)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });

  it("không sinh đợt nào sau ngày kết thúc", () => {
    const rows = buildRentSchedule({
      leaseStart: "2026-11-01",
      leaseEnd: "2026-11-15",
      cycleDay: 20,
      monthlyRent: 5_000_000,
      deposit: 0,
    });
    expect(rows).toHaveLength(0);
  });

  it("từ chối dữ liệu không hợp lệ", () => {
    expect(() =>
      buildRentSchedule({ leaseStart: "2026-12-01", leaseEnd: "2026-11-01", cycleDay: 5, monthlyRent: 1, deposit: 0 }),
    ).toThrow("kết thúc");
    expect(() =>
      buildRentSchedule({ leaseStart: "2026-11-01", leaseEnd: "2027-11-01", cycleDay: 0, monthlyRent: 1, deposit: 0 }),
    ).toThrow("1 đến 31");
    expect(() =>
      buildRentSchedule({ leaseStart: "2026-11-01", leaseEnd: "2027-11-01", cycleDay: 5, monthlyRent: 0, deposit: 0 }),
    ).toThrow("Giá thuê");
  });
});
