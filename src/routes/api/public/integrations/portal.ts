// API nhận khách từ portal BĐS / CRM ngoài.
// POST /api/public/integrations/portal  — header: x-api-key: <khoá tích hợp của sàn>
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors },
  });

const leadSchema = z
  .object({
    portal: z.string().trim().max(40).default("other"),
    name: z.string().trim().max(120).optional().nullable(),
    phone: z.string().trim().max(40).optional().nullable(),
    email: z.string().trim().email().max(160).optional().nullable(),
    project_id: z.string().uuid().optional().nullable(),
    project_name: z.string().trim().max(160).optional().nullable(),
    product_code: z.string().trim().max(40).optional().nullable(),
    budget: z.string().trim().max(120).optional().nullable(),
    note: z.string().trim().max(1000).optional().nullable(),
    external_id: z.string().trim().max(120).optional().nullable(),
    listing_url: z.string().trim().url().max(500).optional().nullable(),
  })
  .refine((v) => v.phone || v.email, { message: "Cần phone hoặc email" });

const bodySchema = z.union([leadSchema, z.object({ leads: z.array(leadSchema).min(1).max(50) })]);

export const Route = createFileRoute("/api/public/integrations/portal")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const key = request.headers.get("x-api-key")?.trim() ?? "";
        if (key.length < 24) return json({ error: "Thiếu hoặc sai khoá tích hợp." }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sha256, ingestInboundLead } = await import("@/lib/inbound-leads.server");
        const { INTEGRATIONS_KEY, parseIntegrationSettings, PORTALS } = await import("@/lib/integrations");

        const { data: rows } = await supabaseAdmin
          .from("settings")
          .select("tenant_id,value")
          .eq("key", INTEGRATIONS_KEY)
          .eq("value->portal->>keyHash", sha256(key))
          .limit(1);
        const row = rows?.[0];
        const cfg = row ? parseIntegrationSettings(row.value) : null;
        if (!row || !cfg?.portal.enabled) return json({ error: "Khoá tích hợp không hợp lệ hoặc đã tắt." }, 401);

        let parsed;
        try {
          parsed = bodySchema.safeParse(await request.json());
        } catch {
          return json({ error: "JSON không hợp lệ." }, 400);
        }
        if (!parsed.success) return json({ error: "Dữ liệu không hợp lệ.", issues: parsed.error.issues.slice(0, 5) }, 400);

        const list = "leads" in parsed.data ? parsed.data.leads : [parsed.data];
        const results = [];
        for (const l of list) {
          const portalLabel = PORTALS.find((p) => p.value === l.portal)?.label ?? l.portal;
          const r = await ingestInboundLead({
            tenantId: row.tenant_id as string,
            source: `portal:${l.portal}`,
            sourceLabel: portalLabel,
            name: l.name,
            phone: l.phone,
            email: l.email,
            note: l.note,
            projectId: l.project_id,
            projectName: l.project_name,
            productCode: l.product_code,
            budget: l.budget,
            externalId: l.external_id,
            meta: { listing_url: l.listing_url ?? null },
          });
          results.push(r.ok ? { ok: true, lead_id: r.leadId, created: r.isNew, in_cart: r.inCart } : { ok: false, error: r.error });
        }
        return json({ ok: true, results });
      },
    },
  },
});
