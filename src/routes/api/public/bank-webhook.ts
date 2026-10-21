// Nhận biến động số dư (SePay / Casso). Header: Authorization: Apikey <khoá của sàn>
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const sepay = z.object({
  id: z.union([z.string(), z.number()]),
  gateway: z.string().max(80).optional().nullable(),
  transactionDate: z.string().max(40).optional().nullable(),
  accountNumber: z.string().max(40).optional().nullable(),
  content: z.string().max(1000).optional().nullable(),
  transferType: z.string().max(10).optional().nullable(),
  transferAmount: z.number().nonnegative(),
  referenceCode: z.string().max(120).optional().nullable(),
});

// Casso (webhook có "secure-token"): { error: 0, data: [{ id, tid, description, amount, when, bank_sub_acc_id }] }
const cassoItem = z.object({
  id: z.union([z.string(), z.number()]),
  tid: z.string().max(120).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  amount: z.number(),
  when: z.string().max(40).optional().nullable(),
  bank_sub_acc_id: z.union([z.string(), z.number()]).optional().nullable(),
});
const casso = z.object({ error: z.number().optional(), data: z.array(cassoItem).max(100) });

type Tx = { id: string; bank: string | null; account: string | null; amount: number; content: string | null; ref: string | null; date: string | null; incoming: boolean };

function normalize(body: unknown): Tx[] | null {
  const s = sepay.safeParse(body);
  if (s.success) {
    const d = s.data;
    return [{ id: String(d.id), bank: d.gateway ?? null, account: d.accountNumber ?? null, amount: d.transferAmount, content: d.content ?? null, ref: d.referenceCode ?? null, date: d.transactionDate ?? null, incoming: !d.transferType || d.transferType === "in" }];
  }
  const c = casso.safeParse(body);
  if (c.success) {
    return c.data.data.map((d) => ({ id: String(d.id), bank: "Casso", account: d.bank_sub_acc_id != null ? String(d.bank_sub_acc_id) : null, amount: Math.abs(d.amount), content: d.description ?? null, ref: d.tid ?? null, date: d.when ?? null, incoming: d.amount > 0 }));
  }
  return null;
}

export const Route = createFileRoute("/api/public/bank-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? request.headers.get("secure-token") ?? request.headers.get("x-api-key") ?? "";
        const key = auth.replace(/^(apikey|bearer)\s+/i, "").trim();
        if (key.length < 24) return json({ success: false, error: "unauthorized" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sha256 } = await import("@/lib/inbound-leads.server");
        const { BANK_KEY, parseBankSettings, extractContractCode } = await import("@/lib/bank-recon");
        const { applyTransaction } = await import("@/lib/bank-recon.server");

        const { data: rows } = await supabaseAdmin
          .from("settings")
          .select("tenant_id,value")
          .eq("key", BANK_KEY)
          .eq("value->>keyHash", sha256(key))
          .limit(1);
        const row = rows?.[0];
        const cfg = row ? parseBankSettings(row.value) : null;
        if (!row || !cfg?.enabled) return json({ success: false, error: "unauthorized" }, 401);

        let list: Tx[] | null;
        try {
          list = normalize(await request.json());
        } catch {
          return json({ success: false, error: "invalid json" }, 400);
        }
        if (!list) return json({ success: false, error: "invalid payload" }, 400);

        const tenantId = row.tenant_id as string;
        let matched = 0, stored = 0, duplicate = 0;
        for (const d of list) {
          if (!d.incoming) continue;
          const when = d.date ? new Date(d.date.replace(" ", "T") + "+07:00") : new Date();
          const { data: tx, error } = await supabaseAdmin
            .from("bank_transactions")
            .upsert(
              {
                tenant_id: tenantId,
                provider: cfg.provider,
                external_id: d.id,
                bank_name: d.bank,
                account_number: d.account,
                amount: d.amount,
                content: d.content,
                reference_code: d.ref,
                transferred_at: isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString(),
                raw: d as never,
              },
              { onConflict: "tenant_id,provider,external_id", ignoreDuplicates: true },
            )
            .select("id")
            .maybeSingle();
          if (error) return json({ success: false, error: "store failed" }, 500);
          if (!tx) { duplicate++; continue; }
          stored++;
          const code = extractContractCode(d.content);
          if (!code) continue;
          const { data: c } = await supabaseAdmin
            .from("contracts")
            .select("id")
            .eq("tenant_id", tenantId)
            .ilike("code", code)
            .is("deleted_at", null)
            .maybeSingle();
          if (!c) continue;
          try {
            await applyTransaction(supabaseAdmin, { tenantId, txId: tx.id, contractId: c.id });
            matched++;
          } catch {
            /* để chờ khớp tay */
          }
        }
        // SePay coi phản hồi 200 + success:true là đã nhận.
        return json({ success: true, stored, matched, duplicate });
      },
    },
  },
});
