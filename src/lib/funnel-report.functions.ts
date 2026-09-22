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
  contractValue: number;
  collected: number;
  collectRate: number;
  commission: number;
  commissionPaid: number;
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

type Bucket = {
  label: string;
  submitted: number;
  cart: number;
  contract: number;
  contractValue: number;
  collected: number;
  commission: number;
  commissionPaid: number;
};

function buildRows(buckets: Map<string, Bucket>): FunnelRow[] {
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
      contractValue: Math.round(value.contractValue),
      collected: Math.round(value.collected),
      collectRate: rate(value.collected, value.contractValue),
      commission: Math.round(value.commission),
      commissionPaid: Math.round(value.commissionPaid),
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

    let contractQuery = supabase
      .from("contracts")
      .select("id,project_id,product_id,lead_id,deal_id,owner_user_id,net_price,status")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .in("status", ["active", "completed"]);
    if (data.projectId) contractQuery = contractQuery.eq("project_id", data.projectId);
    if (ownerFilter) contractQuery = contractQuery.eq("owner_user_id", ownerFilter);

    const [leadsQ, dealsQ, productsQ, projectsQ, contractsQ] = await Promise.all([
      leadQuery,
      dealQuery,
      productQuery,
      supabase.from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null),
      contractQuery,
    ]);
    if (leadsQ.error) throw new Error(leadsQ.error.message);
    if (dealsQ.error) throw new Error(dealsQ.error.message);
    if (productsQ.error) throw new Error(productsQ.error.message);
    if (projectsQ.error) throw new Error(projectsQ.error.message);
    if (contractsQ.error) throw new Error(contractsQ.error.message);

    const leads = leadsQ.data ?? [];
    const deals = dealsQ.data ?? [];
    const products = productsQ.data ?? [];
    const contracts = contractsQ.data ?? [];
    const projectName = new Map((projectsQ.data ?? []).map((row) => [row.id, row.name]));

    // Tiền đã thu và hoa hồng theo từng hợp đồng
    const collectedByContract = new Map<string, number>();
    const commissionByContract = new Map<string, { total: number; paid: number }>();
    if (contracts.length) {
      const contractIds = contracts.map((row) => row.id);
      const [insQ, comQ] = await Promise.all([
        supabase.from("contract_installments").select("contract_id,paid_amount").in("contract_id", contractIds),
        supabase
          .from("contract_commissions")
          .select("contract_id,amount,status,beneficiary_user_id")
          .in("contract_id", contractIds),
      ]);
      for (const row of insQ.data ?? []) {
        collectedByContract.set(
          row.contract_id,
          (collectedByContract.get(row.contract_id) ?? 0) + Number(row.paid_amount ?? 0),
        );
      }
      for (const row of comQ.data ?? []) {
        // Chuyên viên chỉ tính hoa hồng của chính mình
        if (ownerFilter && row.beneficiary_user_id && row.beneficiary_user_id !== ownerFilter) continue;
        const bucket = commissionByContract.get(row.contract_id) ?? { total: 0, paid: 0 };
        bucket.total += Number(row.amount ?? 0);
        if (row.status === "paid") bucket.paid += Number(row.amount ?? 0);
        commissionByContract.set(row.contract_id, bucket);
      }
    }

    const dealById = new Map(deals.map((row) => [row.id, row]));
    const cartLeadIds = new Set<string>();
    const contractLeadIds = new Set<string>();
    const cartProducts: typeof products = [];
    const contractProducts: typeof products = [];
    // Giá trị hợp đồng và tiền đã thu gán về lead tương ứng
    const contractMoneyByLead = new Map<
      string,
      { value: number; collected: number; commission: number; commissionPaid: number }
    >();

    for (const product of products) {
      const status = product.listing_status ?? "available";
      const isCart = CART_STATUSES.has(status);
      const isContract = CONTRACT_STATUSES.has(status);
      if (!isCart && !isContract) continue;
      if (isCart) cartProducts.push(product);
      if (isContract) contractProducts.push(product);
      const deal = product.deal_id ? dealById.get(product.deal_id) : undefined;
      if (deal?.lead_id) cartLeadIds.add(deal.lead_id);
    }

    // Giao dịch không gắn sản phẩm vẫn tính là đã vào giỏ hàng
    for (const deal of deals) {
      if (!deal.lead_id) continue;
      cartLeadIds.add(deal.lead_id);
    }

    let contractValueTotal = 0;
    let collectedTotal = 0;
    let commissionTotal = 0;
    let commissionPaidTotal = 0;
    // Hợp đồng luôn được tính về dự án ghi trên hợp đồng (sản phẩm đã bán), không theo dự án khách quan tâm ban đầu
    const contractByProject = new Map<
      string,
      { count: number; value: number; collected: number; commission: number; commissionPaid: number }
    >();
    for (const row of contracts) {
      const value = Number(row.net_price ?? 0);
      const collected = collectedByContract.get(row.id) ?? 0;
      const com = commissionByContract.get(row.id) ?? { total: 0, paid: 0 };
      contractValueTotal += value;
      collectedTotal += collected;
      commissionTotal += com.total;
      commissionPaidTotal += com.paid;
      const productDealId = row.product_id ? products.find((p) => p.id === row.product_id)?.deal_id ?? null : null;
      const linkedDealId = row.deal_id ?? productDealId;
      const leadId = row.lead_id ?? (linkedDealId ? dealById.get(linkedDealId)?.lead_id ?? null : null);
      const leadProjectId = leadId ? leads.find((l) => l.id === leadId)?.project_id ?? null : null;
      const projectKey = row.project_id ?? leadProjectId ?? "none";
      const projectAgg =
        contractByProject.get(projectKey) ?? { count: 0, value: 0, collected: 0, commission: 0, commissionPaid: 0 };
      projectAgg.count += 1;
      projectAgg.value += value;
      projectAgg.collected += collected;
      projectAgg.commission += com.total;
      projectAgg.commissionPaid += com.paid;
      contractByProject.set(projectKey, projectAgg);
      if (!leadId) continue;
      cartLeadIds.add(leadId);
      contractLeadIds.add(leadId);
      const bucket =
        contractMoneyByLead.get(leadId) ?? { value: 0, collected: 0, commission: 0, commissionPaid: 0 };
      bucket.value += value;
      bucket.collected += collected;
      bucket.commission += com.total;
      bucket.commissionPaid += com.paid;
      contractMoneyByLead.set(leadId, bucket);
    }

    const projectBuckets = new Map<string, Bucket>();
    const sourceBuckets = new Map<string, Bucket>();

    const ensure = (map: Map<string, Bucket>, key: string, label: string) => {
      const existing = map.get(key);
      if (existing) return existing;
      const fresh: Bucket = {
        label,
        submitted: 0,
        cart: 0,
        contract: 0,
        contractValue: 0,
        collected: 0,
        commission: 0,
        commissionPaid: 0,
      };
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
      const money = contractMoneyByLead.get(lead.id);
      if (inCart) cart += 1;
      if (inContract) contract += 1;

      const projectKey = lead.project_id ?? "none";
      const projectBucket = ensure(
        projectBuckets,
        projectKey,
        lead.project_id ? projectName.get(lead.project_id) ?? "Dự án đã xoá" : "Chưa gắn dự án",
      );
      const sourceLabel = normalizeSource(lead.source);
      const sourceBucket = ensure(sourceBuckets, sourceLabel, sourceLabel);

      projectBucket.submitted += 1;
      if (inCart) projectBucket.cart += 1;

      sourceBucket.submitted += 1;
      if (inCart) sourceBucket.cart += 1;
      if (inContract) sourceBucket.contract += 1;
      if (money) {
        sourceBucket.contractValue += money.value;
        sourceBucket.collected += money.collected;
        sourceBucket.commission += money.commission;
        sourceBucket.commissionPaid += money.commissionPaid;
      }
    }

    // Hợp đồng đổ về dự án của chính hợp đồng
    for (const [projectKey, agg] of contractByProject) {
      const bucket = ensure(
        projectBuckets,
        projectKey,
        projectKey === "none" ? "Chưa gắn dự án" : projectName.get(projectKey) ?? "Dự án đã xoá",
      );
      bucket.contract += agg.count;
      bucket.contractValue += agg.value;
      bucket.collected += agg.collected;
      bucket.commission += agg.commission;
      bucket.commissionPaid += agg.commissionPaid;
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
        contractCount: contracts.length,
        contractValue: Math.round(contractValueTotal),
        collected: Math.round(collectedTotal),
        collectRate: rate(collectedTotal, contractValueTotal),
        commission: Math.round(commissionTotal),
        commissionPaid: Math.round(commissionPaidTotal),
        commissionUnpaid: Math.round(commissionTotal - commissionPaidTotal),
      },
      inventory: {
        held: cartProducts.length,
        contracted: contractProducts.length,
      },
      byProject: buildRows(projectBuckets),
      bySource: buildRows(sourceBuckets),
    };
  });
