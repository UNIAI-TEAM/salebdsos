// Ghi tiền về vào hợp đồng (chỉ gọi sau khi đã xác thực người gọi).
import { allocatePayment } from "@/lib/bank-recon";
import { sendPushToUser } from "@/lib/push.server";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

export async function applyTransaction(admin: any, opts: { tenantId: string; txId: string; contractId: string; actorId?: string | null }) {
  const { data: tx } = await admin
    .from("bank_transactions")
    .select("id,tenant_id,amount,status,content")
    .eq("id", opts.txId)
    .eq("tenant_id", opts.tenantId)
    .single();
  if (!tx) throw new Error("Không tìm thấy giao dịch");
  if (tx.status === "matched") return { ok: true, already: true };

  const { data: contract } = await admin
    .from("contracts")
    .select("id,code,owner_user_id,status,tenant_id")
    .eq("id", opts.contractId)
    .eq("tenant_id", opts.tenantId)
    .is("deleted_at", null)
    .single();
  if (!contract) throw new Error("Không tìm thấy hợp đồng");
  if (contract.status === "cancelled") throw new Error("Hợp đồng đã huỷ");

  const { data: ins } = await admin
    .from("contract_installments")
    .select("id,position,amount,paid_amount")
    .eq("contract_id", contract.id);
  const { allocations, leftover } = allocatePayment(
    (ins ?? []).map((i: any) => ({ ...i, amount: Number(i.amount), paid_amount: Number(i.paid_amount ?? 0) })),
    Number(tx.amount),
  );

  const now = new Date().toISOString();
  for (const a of allocations) {
    const row = (ins ?? []).find((i: any) => i.id === a.installmentId);
    const paid = Number(row.paid_amount ?? 0) + a.amount;
    await admin
      .from("contract_installments")
      .update({ paid_amount: paid, paid_at: now, status: paid >= Number(row.amount) ? "paid" : "pending" })
      .eq("id", a.installmentId);
  }

  // Chống ghi trùng: chỉ cập nhật khi giao dịch vẫn chưa khớp.
  const { data: upd } = await admin
    .from("bank_transactions")
    .update({
      status: "matched",
      matched_contract_id: contract.id,
      matched_by: opts.actorId ?? null,
      matched_at: now,
      allocation: allocations,
      note: leftover > 0 ? `Dư ${fmt(leftover)} chưa phân bổ` : null,
    })
    .eq("id", tx.id)
    .neq("status", "matched")
    .select("id");
  if (!upd?.length) return { ok: true, already: true };

  if (contract.owner_user_id) {
    const title = `Tiền về hợp đồng ${contract.code}`;
    const body = `${fmt(Number(tx.amount))} đã tự ghi vào đợt thanh toán${leftover > 0 ? ` (dư ${fmt(leftover)})` : ""}`;
    await admin.from("notifications").insert({
      tenant_id: opts.tenantId,
      user_id: contract.owner_user_id,
      type: "payment",
      title,
      body,
      link: "/contracts",
    });
    await sendPushToUser({ userId: contract.owner_user_id, title, body, link: "/contracts", tag: `pay-${tx.id}` });
  }
  return { ok: true, allocations, leftover };
}
