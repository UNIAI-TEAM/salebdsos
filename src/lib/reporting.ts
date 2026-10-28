import { csvEscape } from "./audit-csv";

export const REPORT_COPY = {
  overview: "Tổng quan báo cáo", revenue: "Doanh thu", funnel: "Phễu bán hàng",
  export: "Xuất CSV", refresh: "Làm mới", allOwners: "Tất cả Sale", allKinds: "Bán & cho thuê",
  sale: "Bán", rental: "Cho thuê", owner: "Sale phụ trách", kind: "Loại hợp đồng",
  loading: "Đang tổng hợp số liệu…", error: "Không tải được báo cáo. Vui lòng thử lại.",
  updated: "Cập nhật", debt: "Công nợ", interactions: "Tương tác & danh thiếp",
};

export function reportDate(value: string): string {
  if (value.length === 10) return value;
  return new Date(new Date(value).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function reportWindow(days: number, now = new Date()) {
  const today = reportDate(now.toISOString());
  const end = new Date(`${today}T00:00:00+07:00`);
  const start = new Date(end.getTime() - (days - 1) * 86400_000);
  return { today, since: reportDate(start.toISOString()), startIso: start.toISOString(), endIso: new Date(end.getTime() + 86400_000).toISOString() };
}

export function reportContractDate(row: { signed_at?: string | null; created_at: string }) {
  return reportDate(row.signed_at || row.created_at);
}

export function contractFinancials(
  contract: { contract_kind?: string; net_price?: number | string | null },
  installments: { position?: number; amount?: number | string; paid_amount?: number | string | null }[],
) {
  // Rental total contractual receivables include rent and deposit, not one month of rent.
  const totalDue = installments.reduce((s, i) => s + Number(i.amount || 0), 0);
  const collected = installments.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
  const value = contract.contract_kind === "rental" ? totalDue : Number(contract.net_price || 0);
  const outstanding = contract.contract_kind === "rental"
    ? installments.reduce((s, i) => s + Math.max(0, Number(i.amount || 0) - Number(i.paid_amount || 0)), 0)
    : Math.max(0, value - collected);
  return { value, collected, outstanding };
}

export function reportCsv(headers: string[], rows: unknown[][]) {
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export function downloadReport(name: string, headers: string[], rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob([reportCsv(headers, rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = `${name}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const REPORT_META = (title: string, description: string) => [
  { title: `${title} — SaleBDS OS` }, { name: "description", content: description },
  { property: "og:title", content: `${title} — SaleBDS OS` },
  { property: "og:description", content: description },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
];