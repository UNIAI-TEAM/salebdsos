import { expect, it } from "vitest";

const url = process.env["VITE_SUPABASE_URL"];
const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
const session = process.env["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"];
const tenant = process.env["HOLD_SAFETY_TEST_TENANT"];
const enabled = Boolean(url && key && session && tenant);
const token = JSON.parse(session ?? "{}").access_token;

async function request(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { apikey: key ?? "", Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  return { status: response.status, result };
}

it.skipIf(!enabled)("only one concurrent request can hold the same unit", async () => {
  const created = await request("products", "POST", { tenant_id: tenant, name: "QA concurrent hold", code: "QA-HOLD-34", product_type: "apartment" });
  expect(created.status).toBe(201);
  const row = created.result[0];
  const claim = { p_id: row.id, p_status: "reserved", p_expected: row.updated_at, p_until: new Date(Date.now() + 3600000).toISOString() };
  const attempts = await Promise.all([request("rpc/change_product_listing_status", "POST", claim), request("rpc/change_product_listing_status", "POST", claim)]);
  expect(attempts.filter((r) => r.status === 200)).toHaveLength(1);
  expect(attempts.filter((r) => r.status >= 400)).toHaveLength(1);
  const stored = await request(`products?id=eq.${row.id}&select=listing_status,hold_owner_user_id`);
  expect(stored.result[0].listing_status).toBe("reserved");
  expect(stored.result[0].hold_owner_user_id).toBe(JSON.parse(session ?? "{}").user.id);
}, 20000);

it.skipIf(!enabled)("renaming and reordering preserves installment ID, paid amount, paid timestamp and history", async () => {
  const created = await request("contracts", "POST", { tenant_id: tenant, code: "QA-PAY-34", sale_price: 1000, net_price: 1000, status: "draft" });
  expect(created.status).toBe(201);
  const contract = created.result[0];
  const inserted = await request("contract_installments", "POST", { tenant_id: tenant, contract_id: contract.id, name: "Đợt thu ban đầu", amount: 1000, paid_amount: 300, paid_at: "2026-10-26T10:00:00Z" });
  expect(inserted.status).toBe(201);
  const row = inserted.result[0];
  const saved = await request("rpc/save_contract_installments", "POST", { p_contract: contract.id, p_rows: [{ name: "Đợt mới", amount: 100 }, { id: row.id, expected_updated_at: row.updated_at, name: "Đổi tên sau thanh toán", amount: 900 }] });
  expect(saved.status).toBe(200);
  const after = await request(`contract_installments?id=eq.${row.id}&select=*`);
  expect(after.result[0].id).toBe(row.id);
  expect(after.result[0].position).toBe(1);
  expect(Number(after.result[0].paid_amount)).toBe(300);
  expect(after.result[0].paid_at).toBe(row.paid_at);
  const history = await request(`installment_history?installment_id=eq.${row.id}&select=action,before_row,after_row`);
  expect(history.result.some((h: any) => h.action === "UPDATE" && h.before_row.name === "Đợt thu ban đầu" && h.after_row.name === "Đổi tên sau thanh toán")).toBe(true);
  const stale = await request("rpc/save_contract_installments", "POST", { p_contract: contract.id, p_rows: [{ id: row.id, expected_updated_at: row.updated_at, name: "stale", amount: 900 }] });
  expect(stale.status).toBeGreaterThanOrEqual(400);
  const belowPaid = await request("rpc/save_contract_installments", "POST", { p_contract: contract.id, p_rows: [{ id: row.id, expected_updated_at: after.result[0].updated_at, name: "invalid", amount: 299 }] });
  expect(belowPaid.status).toBeGreaterThanOrEqual(400);
  const removed = await request(`contract_installments?id=eq.${row.id}`, "DELETE");
  expect(removed.status).toBeGreaterThanOrEqual(400);
  const replace = await request("rpc/save_contract_installments", "POST", { p_contract: contract.id, p_rows: [{ name: "replace all", amount: 1000 }] });
  expect(replace.status).toBeGreaterThanOrEqual(400);
  const remaining = await request(`contract_installments?contract_id=eq.${contract.id}&select=id`);
  expect(remaining.result).toHaveLength(2);
}, 20000);