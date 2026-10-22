// Nhắc thanh toán tự động: mỗi đợt chưa thu đủ, mỗi mốc chỉ nhắc 1 lần → thông báo + push cho Sale phụ trách.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { reminderKind, REMINDER_LABEL, daysOverdue } from "@/lib/debt-aging";
import { sendPushToUser } from "@/lib/push.server";

const admin = supabaseAdmin as any;
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " đ";

export async function runPaymentReminders() {
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 7 * 3600_000 + 3 * 86_400_000).toISOString().slice(0, 10);
  const { data: ins } = await admin
    .from("contract_installments")
    .select("id,tenant_id,contract_id,name,amount,paid_amount,due_date,contracts!inner(id,code,owner_user_id,status,deleted_at)")
    .lte("due_date", horizon)
    .neq("status", "paid")
    .limit(1000);
  let sent = 0;
  for (const i of ins ?? []) {
    const c = i.contracts;
    if (!c || c.deleted_at || !["draft", "active"].includes(c.status)) continue;
    const outstanding = Number(i.amount) - Number(i.paid_amount ?? 0);
    if (outstanding <= 0) continue;
    const kind = reminderKind(i.due_date, today);
    if (!kind) continue;
    const days = daysOverdue(i.due_date, today);
    const { error } = await admin.from("payment_reminders").insert({
      tenant_id: i.tenant_id, contract_id: i.contract_id, installment_id: i.id, kind,
      days_overdue: days, amount: outstanding, notified_user_id: c.owner_user_id,
    });
    if (error) continue; // đã nhắc mốc này
    sent++;
    if (!c.owner_user_id) continue;
    const title = `${REMINDER_LABEL[kind]} · ${c.code}`;
    const body = `${i.name}: còn ${fmt(outstanding)} (hạn ${i.due_date.split("-").reverse().join("/")})`;
    await admin.from("notifications").insert({
      tenant_id: i.tenant_id, user_id: c.owner_user_id, type: "payment_reminder", title, body, link: "/contracts",
    });
    await sendPushToUser({ userId: c.owner_user_id, title, body, link: "/contracts", tag: `pay-${i.id}` });
  }
  return { ok: true, sent };
}
