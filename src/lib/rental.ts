// Nghiệp vụ cho thuê — sinh lịch thu tiền định kỳ. Thuần, có kiểm thử.

export type RentScheduleRow = {
  name: string;
  position: number;
  amount: number;
  due_date: string; // YYYY-MM-DD
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmt(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// Ngày thu trong tháng: kẹp về ngày cuối tháng nếu tháng không có ngày đó (31 → 28/29/30)
function dueInMonth(year: number, month1: number, cycleDay: number): Date {
  const lastDay = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month1 - 1, Math.min(cycleDay, lastDay)));
}

/**
 * Lịch thu tiền thuê: 1 đợt cọc (nếu có) + các đợt thuê hàng tháng trong thời hạn thuê.
 * Đợt tháng đầu đáo hạn vào ngày thu (cycleDay) của tháng bắt đầu; nếu ngày thu < ngày bắt đầu thuê
 * thì đợt đầu đáo hạn ngay ngày bắt đầu. Tháng cuối chỉ tính nếu ngày đáo hạn <= ngày kết thúc.
 */
export function buildRentSchedule(input: {
  leaseStart: string; // YYYY-MM-DD
  leaseEnd: string; // YYYY-MM-DD
  cycleDay: number; // 1..31
  monthlyRent: number;
  deposit: number;
}): RentScheduleRow[] {
  const start = toDate(input.leaseStart);
  const end = toDate(input.leaseEnd);
  if (!(end >= start)) throw new Error("Ngày kết thúc thuê phải sau ngày bắt đầu");
  if (input.cycleDay < 1 || input.cycleDay > 31) throw new Error("Ngày thu hàng tháng phải từ 1 đến 31");
  if (input.monthlyRent <= 0) throw new Error("Giá thuê hàng tháng phải lớn hơn 0");

  const rows: RentScheduleRow[] = [];
  let position = 0;
  if (input.deposit > 0) {
    rows.push({ name: "Tiền cọc", position: position++, amount: input.deposit, due_date: input.leaseStart });
  }

  let y = start.getUTCFullYear();
  let m = start.getUTCMonth() + 1;
  let index = 1;
  // Giới hạn an toàn 600 tháng (50 năm)
  for (let guard = 0; guard < 600; guard++) {
    let due = dueInMonth(y, m, input.cycleDay);
    if (index === 1 && due < start) due = start;
    if (due > end) break;
    rows.push({
      name: `Tiền thuê tháng ${index} (${pad(m)}/${y})`,
      position: position++,
      amount: input.monthlyRent,
      due_date: fmt(due),
    });
    index++;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return rows;
}
