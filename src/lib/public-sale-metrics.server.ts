import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ContactRow = { id: string; phone: string | null; email: string | null };

function contactKey(row: ContactRow) {
  return row.phone?.replace(/\D/g, "") || row.email?.trim().toLowerCase() || row.id;
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
  const [cardsQ, customersQ, leadsQ, dealsQ] = await Promise.all([
    supabaseAdmin.from("cards").select("id").eq("tenant_id", tenantId).eq("owner_user_id", ownerId).is("deleted_at", null),
    supabaseAdmin.from("customers").select("id,phone,email").eq("tenant_id", tenantId).eq("owner_user_id", ownerId).is("deleted_at", null),
    supabaseAdmin.from("leads").select("id,phone,email").eq("tenant_id", tenantId).eq("owner_user_id", ownerId).is("deleted_at", null),
    supabaseAdmin.from("pipeline_deals").select("id,project_id").eq("tenant_id", tenantId).eq("owner_user_id", ownerId).eq("status", "won").is("deleted_at", null),
  ]);
  const firstError = [cardsQ.error, customersQ.error, leadsQ.error, dealsQ.error].find(Boolean);
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

  const served = new Set([
    ...(customersQ.data ?? []).map(contactKey),
    ...(leadsQ.data ?? []).map(contactKey),
  ]);
  const wonDeals = dealsQ.data ?? [];
  return {
    customersServed: served.size,
    contractsSigned: wonDeals.length,
    projectsSold: new Set(wonDeals.map((deal) => deal.project_id).filter(Boolean)).size,
    interactions30d,
    updatedAt: new Date().toISOString(),
  };
}