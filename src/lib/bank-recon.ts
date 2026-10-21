// Đối soát ngân hàng — logic thuần (dùng chung server + test).
export const BANK_KEY = "bank";

export type BankSettings = {
  enabled: boolean;
  provider: "sepay" | "casso" | "other";
  keyHash: string | null;
  keyHint: string | null;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

export const DEFAULT_BANK: BankSettings = {
  enabled: false,
  provider: "sepay",
  keyHash: null,
  keyHint: null,
  bankName: "",
  accountNumber: "",
  accountName: "",
};

export function parseBankSettings(v: unknown): BankSettings {
  const o = (v && typeof v === "object" ? v : {}) as Partial<BankSettings>;
  return { ...DEFAULT_BANK, ...o };
}

/** Nội dung chuyển khoản chuẩn cho một hợp đồng. */
export function transferContent(contractCode: string) {
  return contractCode.replace(/-/g, "").toUpperCase();
}

/** Tìm mã hợp đồng trong nội dung chuyển khoản (ngân hàng thường bỏ dấu "-"). */
export function extractContractCode(content: string | null | undefined): string | null {
  if (!content) return null;
  const m = content.toUpperCase().match(/HD[\s-]?(\d{6})[\s-]?([A-Z0-9]{4})(?![A-Z0-9])/);
  return m ? `HD-${m[1]}-${m[2]}` : null;
}

export type InstallmentLite = { id: string; position: number; amount: number; paid_amount: number };
export type Allocation = { installmentId: string; amount: number };

/** Chia số tiền vào các đợt còn nợ theo thứ tự; phần dư trả về `leftover`. */
export function allocatePayment(installments: InstallmentLite[], amount: number) {
  let remaining = Math.max(0, Math.round(amount));
  const allocations: Allocation[] = [];
  for (const it of [...installments].sort((a, b) => a.position - b.position)) {
    if (remaining <= 0) break;
    const due = Math.max(0, Number(it.amount) - Number(it.paid_amount));
    if (due <= 0) continue;
    const take = Math.min(due, remaining);
    allocations.push({ installmentId: it.id, amount: take });
    remaining -= take;
  }
  return { allocations, leftover: remaining };
}
