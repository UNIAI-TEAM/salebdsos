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
