import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SALE_ROLES = new Set(["owner", "admin", "manager", "agent", "platform_admin"]);
const MANAGER_ROLES = new Set(["owner", "admin", "manager", "platform_admin"]);

const CART_STATUSES = new Set(["locked", "reserved", "negotiating", "deposited"]);
const CONTRACT_STATUSES = new Set(["contracted", "sold"]);

const Input = z.object({
  tenantId: z.string().uuid(),
  days: z.number().int().min(7).max(365).default(30),
  projectId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
});

export type FunnelRow = {
  key: string;
  label: string;
  submitted: number;
  cart: number;
  contract: number;
  submittedToCart: number;
  cartToContract: number;
  submittedToContract: number;
};

function rate(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function normalizeSource(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "Khác";
  const lower = raw.toLowerCase();
  if (lower.startsWith("qr:") || lower.includes("qr danh thiếp")) return "QR danh thiếp";
  if (lower.includes("digital_card") || lower.includes("danh thiếp")) return "Danh thiếp số";
  if (lower.includes("landing")) return "Landing dự án";
  if (lower.includes("zalo")) return "Zalo";
  if (lower.includes("web_chat") || lower.includes("chat")) return "Chat trên trang";
  if (lower.includes("form")) return "Biểu mẫu";
  if (lower.includes("import")) return "Nhập dữ liệu";
  if (lower.includes("manual") || lower.includes("thủ công")) return "Nhập tay";
  return raw;
}

function buildRows(
  buckets: Map<string, { label: string; submitted: number; cart: number; contract: number }>,
): FunnelRow[] {
  return [...buckets.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      submitted: value.submitted,
      cart: value.cart,
      contract: value.contract,
      submittedToCart: rate(value.cart, value.submitted),
      cartToContract: rate(value.contract, value.cart),
      submittedToContract: rate(value.contract, value.submitted),
    }))
    .sort((a, b) => b.submitted - a.submitted || b.contract - a.contract);
}

export const getFunnelReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("tenant_id", data.tenantId)
      .eq("user_id", userId);
    if (roleError) throw new Error(roleError.message);
    const roleList = (roles ?? []).map((row) => row.role);
    if (!roleList.some((role) => SALE_ROLES.has(role))) {
      throw new Error("Bạn không có quyền xem báo cáo của workspace này");
    }
    const canManage = roleList.some((role) => MANAGER_ROLES.has(role));
    const ownerFilter = canManage ? data.ownerId ?? null : userId;

    const since = new Date(Date.now() - data.days * 86400_000).toISOString();

    let leadQuery = supabase
      .from("leads")
      .select("id,project_id,source,status,owner_user_id,created_at")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .gte("created_at", since);
    if (data.projectId) leadQuery = leadQuery.eq("project_id", data.projectId);
    if (ownerFilter) leadQuery = leadQuery.eq("owner_user_id", ownerFilter);

    let dealQuery = supabase
      .from("pipeline_deals")
      .select("id,lead_id,project_id,status,owner_user_id,created_at")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null);
    if (data.projectId) dealQuery = dealQuery.eq("project_id", data.projectId);
    if (ownerFilter) dealQuery = dealQuery.eq("owner_user_id", ownerFilter);

    let productQuery = supabase
      .from("products")
      .select("id,project_id,deal_id,listing_status,product_type,updated_at")
      .eq("tenant_id", data.tenantId);
    if (data.projectId) productQuery = productQuery.eq("project_id", data.projectId);

    const [leadsQ, dealsQ, productsQ, projectsQ] = await Promise.all([
      leadQuery,
      dealQuery,
      productQuery,
      supabase.from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null),
    ]);
    if (leadsQ.error) throw new Error(leadsQ.error.message);
    if (dealsQ.error) throw new Error(dealsQ.error.message);
    if (productsQ.error) throw new Error(productsQ.error.message);
    if (projectsQ.error) throw new Error(projectsQ.error.message);

    const leads = leadsQ.data ?? [];
    const deals = dealsQ.data ?? [];
    const products = productsQ.data ?? [];
    const projectName = new Map((projectsQ.data ?? []).map((row) => [row.id, row.name]));

    const dealById = new Map(deals.map((row) => [row.id, row]));
    const cartLeadIds = new Set<string>();
    const contractLeadIds = new Set<string>();
    const cartProducts: typeof products = [];
    const contractProducts: typeof products = [];

    for (const product of products) {
      const status = product.listing_status ?? "available";
      const isCart = CART_STATUSES.has(status);
      const isContract = CONTRACT_STATUSES.has(status);
      if (!isCart && !isContract) continue;
      if (isCart) cartProducts.push(product);
      if (isContract) contractProducts.push(product);
      const deal = product.deal_id ? dealById.get(product.deal_id) : undefined;
      if (deal?.lead_id) {
        cartLeadIds.add(deal.lead_id);
        if (isContract || deal.status === "won") contractLeadIds.add(deal.lead_id);
      }
    }

    // Giao dịch không gắn sản phẩm vẫn tính là đã vào giỏ hàng / đã ký hợp đồng
    for (const deal of deals) {
      if (!deal.lead_id) continue;
      cartLeadIds.add(deal.lead_id);
      if (deal.status === "won") contractLeadIds.add(deal.lead_id);
    }

    const projectBuckets = new Map<string, { label: string; submitted: number; cart: number; contract: number }>();
    const sourceBuckets = new Map<string, { label: string; submitted: number; cart: number; contract: number }>();

    const ensure = (
      map: Map<string, { label: string; submitted: number; cart: number; contract: number }>,
      key: string,
      label: string,
    ) => {
      const existing = map.get(key);
      if (existing) return existing;
      const fresh = { label, submitted: 0, cart: 0, contract: 0 };
      map.set(key, fresh);
      return fresh;
    };

    let submitted = 0;
    let cart = 0;
    let contract = 0;

    for (const lead of leads) {
      submitted += 1;
      const inCart = cartLeadIds.has(lead.id);
      const inContract = contractLeadIds.has(lead.id);
      if (inCart) cart += 1;
      if (inContract) contract += 1;

      const projectKey = lead.project_id ?? "none";
      const projectBucket = ensure(
        projectBuckets,
        projectKey,
        lead.project_id ? projectName.get(lead.project_id) ?? "Dự án đã xoá" : "Chưa gắn dự án",
      );
      projectBucket.submitted += 1;
      if (inCart) projectBucket.cart += 1;
      if (inContract) projectBucket.contract += 1;

      const sourceLabel = normalizeSource(lead.source);
      const sourceBucket = ensure(sourceBuckets, sourceLabel, sourceLabel);
      sourceBucket.submitted += 1;
      if (inCart) sourceBucket.cart += 1;
      if (inContract) sourceBucket.contract += 1;
    }

    return {
      days: data.days,
      canManage,
      scope: ownerFilter ? "own" : "team",
      projects: (projectsQ.data ?? []).map((row) => ({ id: row.id, name: row.name })),
      totals: {
        submitted,
        cart,
        contract,
        submittedToCart: rate(cart, submitted),
        cartToContract: rate(contract, cart),
        submittedToContract: rate(contract, submitted),
      },
      inventory: {
        held: cartProducts.length,
        contracted: contractProducts.length,
      },
      byProject: buildRows(projectBuckets),
      bySource: buildRows(sourceBuckets),
    };
  });
