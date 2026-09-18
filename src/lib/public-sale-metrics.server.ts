import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ContactRow = { phone: string | null; email: string | null; source: string | null; meta: unknown };

function contactKey(row: ContactRow) {
  return row.phone?.replace(/\D/g, "") || row.email?.trim().toLowerCase() || null;
}

function isCustomerSubmission(row: ContactRow) {
  const source = row.source?.trim().toLowerCase() ?? "";
  const meta = row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
    ? row.meta as Record<string, unknown>
    : {};
  return source === "landing page" || source === "qr danh thiếp" || source.startsWith("qr:") ||
    Boolean(meta["sales_page_id"] || meta["sales_page_slug"] || meta["card_slug"] || meta["qr_code"] || meta["lead_form_id"] || meta["submitted_form"]);
}

export type PublicSaleMetrics = {
  customersServed: number;
  contractsSigned: number;
  projectsSold: number;
  interactions30d: number;
  updatedAt: string;
};

export async function getPublicSaleMetrics(tenantId: string, ownerId: string): Promise<PublicSaleMetrics> {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [cardsQ, leadsQ, dealsQ] = await Promise.all([
    supabaseAdmin.from("cards").select("id").eq("tenant_id", tenantId).eq("owner_user_id", ownerId).is("deleted_at", null),
    supabaseAdmin.from("leads").select("phone,email,source,meta").eq("tenant_id", tenantId).eq("owner_user_id", ownerId).is("deleted_at", null),
    supabaseAdmin.from("pipeline_deals").select("id,project_id").eq("tenant_id", tenantId).eq("owner_user_id", ownerId).eq("status", "won").is("deleted_at", null),
  ]);
  const firstError = [cardsQ.error, leadsQ.error, dealsQ.error].find(Boolean);
  if (firstError) throw new Error(firstError.message);

  const cardIds = (cardsQ.data ?? []).map((card) => card.id);
  let interactions30d = 0;
  if (cardIds.length) {
    const { count, error } = await supabaseAdmin
      .from("interaction_events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("card_id", cardIds)
      .gte("occurred_at", since);
    if (error) throw new Error(error.message);
    interactions30d = count ?? 0;
  }

  const served = new Set(
    (leadsQ.data ?? []).filter(isCustomerSubmission).map(contactKey).filter((key): key is string => Boolean(key)),
  );
  const wonDeals = dealsQ.data ?? [];
  return {
    customersServed: served.size,
    contractsSigned: wonDeals.length,
    projectsSold: new Set(wonDeals.map((deal) => deal.project_id).filter(Boolean)).size,
    interactions30d,
    updatedAt: new Date().toISOString(),
  };
}