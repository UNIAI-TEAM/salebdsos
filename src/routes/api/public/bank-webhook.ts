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

export const Route = createFileRoute("/api/public/bank-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? request.headers.get("x-api-key") ?? "";
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

        let p;
        try {
          p = sepay.safeParse(await request.json());
        } catch {
          return json({ success: false, error: "invalid json" }, 400);
        }
        if (!p.success) return json({ success: false, error: "invalid payload" }, 400);
        const d = p.data;
        if (d.transferType && d.transferType !== "in") return json({ success: true, skipped: "outgoing" });

        const tenantId = row.tenant_id as string;
        const when = d.transactionDate ? new Date(d.transactionDate.replace(" ", "T") + "+07:00") : new Date();
        const { data: tx, error } = await supabaseAdmin
          .from("bank_transactions")
          .upsert(
            {
              tenant_id: tenantId,
              provider: cfg.provider,
              external_id: String(d.id),
              bank_name: d.gateway ?? null,
              account_number: d.accountNumber ?? null,
              amount: d.transferAmount,
              content: d.content ?? null,
              reference_code: d.referenceCode ?? null,
              transferred_at: isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString(),
              raw: d as never,
            },
            { onConflict: "tenant_id,provider,external_id", ignoreDuplicates: true },
          )
          .select("id")
          .maybeSingle();
        if (error) return json({ success: false, error: "store failed" }, 500);
        if (!tx) return json({ success: true, duplicate: true });

        const code = extractContractCode(d.content);
        if (code) {
          const { data: c } = await supabaseAdmin
            .from("contracts")
            .select("id")
            .eq("tenant_id", tenantId)
            .ilike("code", code)
            .is("deleted_at", null)
            .maybeSingle();
          if (c) {
            try {
              await applyTransaction(supabaseAdmin, { tenantId, txId: tx.id, contractId: c.id });
              return json({ success: true, matched: true });
            } catch {
              /* để chờ khớp tay */
            }
          }
        }
        return json({ success: true, matched: false });
      },
    },
  },
});
