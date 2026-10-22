// Tuổi nợ — logic thuần (dùng chung server + test).
export const AGING_BUCKETS = ["not_due", "due", "d1_15", "d16_30", "d30_plus"] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

/** Số ngày coi là "đến hạn" (hôm nay và N ngày tới). */
export const DUE_SOON_DAYS = 7;

const dayMs = 86_400_000;
const toDay = (d: string | Date) => {
  const x = typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00Z`) : d;
  return Math.floor(x.getTime() / dayMs);
};

/** Số ngày quá hạn (âm = còn bao nhiêu ngày nữa đến hạn). */
export function daysOverdue(dueDate: string, today: string | Date) {
  return toDay(today) - toDay(dueDate);
}

export function agingBucket(dueDate: string | null, today: string | Date): AgingBucket {
  if (!dueDate) return "not_due";
  const d = daysOverdue(dueDate, today);
  if (d <= 0) return -d <= DUE_SOON_DAYS ? "due" : "not_due";
  if (d <= 15) return "d1_15";
  if (d <= 30) return "d16_30";
  return "d30_plus";
}

/** Mốc nhắc thanh toán: trước hạn 3 ngày, đúng hạn, quá hạn 1/15/30 ngày. */
export const REMINDER_KINDS = ["due_3", "due_0", "overdue_1", "overdue_15", "overdue_30"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];
export const REMINDER_LABEL: Record<ReminderKind, string> = {
  due_3: "Sắp đến hạn (còn 3 ngày)",
  due_0: "Đến hạn hôm nay",
  overdue_1: "Quá hạn 1 ngày",
  overdue_15: "Quá hạn 15 ngày",
  overdue_30: "Quá hạn 30 ngày",
};
/** Mốc nhắc mới nhất mà đợt đã chạm tới (null = chưa tới mốc nào). */
export function reminderKind(dueDate: string | null, today: string | Date): ReminderKind | null {
  if (!dueDate) return null;
  const d = daysOverdue(dueDate, today);
  if (d >= 30) return "overdue_30";
  if (d >= 15) return "overdue_15";
  if (d >= 1) return "overdue_1";
  if (d === 0) return "due_0";
  if (d >= -3) return "due_3";
  return null;
}
