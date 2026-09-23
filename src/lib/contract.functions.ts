// Hợp đồng — đợt thanh toán — hoa hồng. Server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SALE_ROLES = new Set(["owner", "admin", "manager", "agent", "platform_admin"]);
const MANAGER_ROLES = new Set(["owner", "admin", "manager", "platform_admin"]);

const CONTRACT_SELECT =
  "id,tenant_id,project_id,product_id,customer_id,lead_id,deal_id,owner_user_id,code,sale_price,discount_amount,net_price,currency,status,signed_at,completed_at,note,created_at,updated_at";

export const CONTRACT_STATUSES = ["draft", "active", "completed", "cancelled"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "Nháp",
  active: "Hiệu lực",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};

export const COMMISSION_STATUS_LABEL = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  paid: "Đã trả",
} as const;

export const INSTALLMENT_TEMPLATE = [
  { name: "Đợt 1 — Đặt cọc", percent: 30 },
  { name: "Đợt 2 — Ký hợp đồng", percent: 30 },
  { name: "Đợt 3 — Thi công/bàn giao", percent: 30 },
  { name: "Đợt 4 — Nhận sổ", percent: 10 },
];

type Ctx = { supabase: any; userId: string };

async function access(context: Ctx, tenantId: string) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: any) => r.role as string);
  if (!roles.some((r: string) => SALE_ROLES.has(r))) throw new Error("Bạn không có quyền xem hợp đồng của workspace này");
  return { roles, canManage: roles.some((r: string) => MANAGER_ROLES.has(r)) };
}

async function loadContract(context: Ctx, id: string) {
  const { data, error } = await context.supabase.from("contracts").select(CONTRACT_SELECT).eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function guard(context: Ctx, id: string, manageOnly = false) {
  const contract = await loadContract(context, id);
  const { canManage } = await access(context, contract.tenant_id);
  if (!canManage && contract.owner_user_id !== context.userId) throw new Error("Bạn không phụ trách hợp đồng này");
  if (manageOnly && !canManage) throw new Error("Chỉ quản lý được thực hiện việc này");
  return { contract, canManage };
}

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------- list / detail
export const listContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        status: z.enum(CONTRACT_STATUSES).optional(),
        projectId: z.string().uuid().optional(),
        ownerId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { canManage } = await access(context as Ctx, data.tenantId);

    let q = supabase
      .from("contracts")
      .select(CONTRACT_SELECT)
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status) q = q.eq("status", data.status);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const ownerFilter = canManage ? data.ownerId ?? null : userId;
    if (ownerFilter) q = q.eq("owner_user_id", ownerFilter);

    const [contractsQ, projectsQ, productsQ, customersQ, rolesQ, leadsQ] = await Promise.all([
      q,
      supabase.from("projects").select("id,name").eq("tenant_id", data.tenantId).is("deleted_at", null).order("name"),
      supabase
        .from("products")
        .select("id,name,code,zone,floor,price,currency,project_id,product_type,listing_status")
        .eq("tenant_id", data.tenantId)
        .order("code"),
      supabase
        .from("customers")
        .select("id,full_name,phone")
        .eq("tenant_id", data.tenantId)
        .is("deleted_at", null)
        .order("full_name")
        .limit(500),
      supabase.from("user_roles").select("user_id,role").eq("tenant_id", data.tenantId),
    ]);
    if (contractsQ.error) throw new Error(contractsQ.error.message);

    const contracts = contractsQ.data ?? [];
    const ids = contracts.map((c: any) => c.id);

    let installments: any[] = [];
    let commissions: any[] = [];
    if (ids.length) {
      const [insQ, comQ] = await Promise.all([
        supabase
          .from("contract_installments")
          .select("id,contract_id,name,position,percent,amount,due_date,paid_amount,paid_at,status,note")
          .in("contract_id", ids)
          .order("position"),
        supabase
          .from("contract_commissions")
          .select(
            "id,contract_id,beneficiary_user_id,beneficiary_name,role_label,percent,amount,status,approved_at,paid_at,note",
          )
          .in("contract_id", ids),
      ]);
      installments = insQ.data ?? [];
      commissions = comQ.data ?? [];
    }

    const memberIds = Array.from(new Set((rolesQ.data ?? []).map((r: any) => r.user_id)));
    let members: any[] = [];
    if (memberIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,full_name,email")
        .in("user_id", memberIds);
      const roleByUser = new Map((rolesQ.data ?? []).map((r: any) => [r.user_id, r.role]));
      members = (profs ?? []).map((p: any) => ({
        user_id: p.user_id,
        name: p.full_name ?? p.email ?? "Thành viên",
        role: roleByUser.get(p.user_id) ?? null,
      }));
    }

    const projectName = new Map((projectsQ.data ?? []).map((p: any) => [p.id, p.name]));
    const productById = new Map((productsQ.data ?? []).map((p: any) => [p.id, p]));
    const customerById = new Map((customersQ.data ?? []).map((c: any) => [c.id, c]));
    const memberName = new Map(members.map((m) => [m.user_id, m.name]));

    const rows = contracts.map((c: any) => {
      const ins = installments.filter((i) => i.contract_id === c.id);
      const com = commissions.filter((i) => i.contract_id === c.id);
      const collected = round(ins.reduce((s, i) => s + Number(i.paid_amount ?? 0), 0));
      const scheduled = round(ins.reduce((s, i) => s + Number(i.amount ?? 0), 0));
      const product = c.product_id ? productById.get(c.product_id) : null;
      return {
        ...c,
        sale_price: Number(c.sale_price ?? 0),
        discount_amount: Number(c.discount_amount ?? 0),
        net_price: Number(c.net_price ?? 0),
        project_name: c.project_id ? projectName.get(c.project_id) ?? "Dự án đã xoá" : null,
        product_label: product ? product.name || product.code || "Sản phẩm" : null,
        product_code: product?.code ?? null,
        customer_name: c.customer_id ? customerById.get(c.customer_id)?.full_name ?? null : null,
        owner_name: c.owner_user_id ? memberName.get(c.owner_user_id) ?? null : null,
        installments: ins,
        commissions: com.map((x) => ({
          ...x,
          amount: Number(x.amount ?? 0),
          beneficiary_name: x.beneficiary_name ?? memberName.get(x.beneficiary_user_id) ?? null,
        })),
        collected,
        scheduled,
        remaining: round(Number(c.net_price ?? 0) - collected),
        commissionTotal: round(com.reduce((s, x) => s + Number(x.amount ?? 0), 0)),
        commissionUnpaid: round(
          com.filter((x) => x.status !== "paid").reduce((s, x) => s + Number(x.amount ?? 0), 0),
        ),
      };
    });

    const active = rows.filter((r: any) => r.status === "active" || r.status === "completed");
    return {
      canManage,
      scope: ownerFilter ? "own" : "team",
      contracts: rows,
      projects: projectsQ.data ?? [],
      customers: customersQ.data ?? [],
      members,
      products: (productsQ.data ?? []).map((p: any) => ({ ...p, price: Number(p.price ?? 0) })),
      totals: {
        count: rows.length,
        value: round(active.reduce((s: number, r: any) => s + r.net_price, 0)),
        collected: round(active.reduce((s: number, r: any) => s + r.collected, 0)),
        remaining: round(active.reduce((s: number, r: any) => s + Math.max(0, r.remaining), 0)),
        commissionUnpaid: round(active.reduce((s: number, r: any) => s + r.commissionUnpaid, 0)),
      },
    };
  });

// ---------------------------------------------------------------- create
const CreateInput = z.object({
  tenantId: z.string().uuid(),
  productId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  customerId: z.string().uuid().nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  code: z.string().trim().max(60).optional().nullable(),
  salePrice: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  currency: z.string().trim().max(8).default("VND"),
  signedAt: z.string().optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
  withTemplate: z.boolean().default(true),
  commissionPercent: z.number().min(0).max(100).default(0),
});

export const createContractFromProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await access(context as Ctx, data.tenantId);

    let projectId = data.projectId ?? null;
    let salePrice = data.salePrice;
    let dealId: string | null = data.dealId ?? null;
    let leadId: string | null = data.leadId ?? null;
    if (data.productId) {
      const { data: product, error } = await supabase
        .from("products")
        .select("id,project_id,price,currency,listing_status,tenant_id,deal_id")
        .eq("id", data.productId)
        .single();
      if (error) throw new Error(error.message);
      if (product.tenant_id !== data.tenantId) throw new Error("Sản phẩm không thuộc workspace này");
      projectId = projectId ?? product.project_id;
      if (!salePrice) salePrice = Number(product.price ?? 0);
      if (!dealId && product.deal_id) dealId = product.deal_id;
    }

    if (dealId && !leadId) {
      const { data: deal } = await supabase.from("pipeline_deals").select("lead_id").eq("id", dealId).maybeSingle();
      leadId = deal?.lead_id ?? null;
    }

    // Không có giao dịch: nối hợp đồng về khách gốc theo số điện thoại/email để báo cáo phễu vẫn đúng
    if (!leadId && data.customerId) {
      const { data: customer } = await supabase
        .from("customers")
        .select("phone,email")
        .eq("id", data.customerId)
        .maybeSingle();
      const filters: string[] = [];
      if (customer?.phone) filters.push(`phone.eq.${customer.phone}`);
      if (customer?.email) filters.push(`email.eq.${customer.email}`);
      if (filters.length) {
        const { data: lead } = await supabase
          .from("leads")
          .select("id")
          .eq("tenant_id", data.tenantId)
          .is("deleted_at", null)
          .or(filters.join(","))
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        leadId = lead?.id ?? null;
      }
    }

    const netPrice = round(Math.max(0, salePrice - data.discountAmount));
    const code = (data.code ?? "").trim() || `HD-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const { data: contract, error: insErr } = await supabase
      .from("contracts")
      .insert({
        tenant_id: data.tenantId,
        project_id: projectId,
        product_id: data.productId ?? null,
        customer_id: data.customerId ?? null,
        lead_id: leadId,
        deal_id: dealId,
        owner_user_id: data.ownerUserId ?? userId,
        code,
        sale_price: salePrice,
        discount_amount: data.discountAmount,
        net_price: netPrice,
        currency: data.currency,
        signed_at: data.signedAt || null,
        note: data.note || null,
        created_by: userId,
        status: "draft",
      })
      .select(CONTRACT_SELECT)
      .single();
    if (insErr) throw new Error(insErr.message);

    if (data.withTemplate) {
      await supabase.from("contract_installments").insert(
        INSTALLMENT_TEMPLATE.map((t, index) => ({
          tenant_id: data.tenantId,
          contract_id: contract.id,
          name: t.name,
          position: index,
          percent: t.percent,
          amount: round((netPrice * t.percent) / 100),
        })),
      );
    }

    // Hoa hồng tự tính theo chính sách của sàn (theo sale / nhóm / dự án)
    try {
      const { applyCommissionPlan } = await import("@/lib/commission.server");
      await applyCommissionPlan(supabase, {
        tenantId: data.tenantId,
        contractId: contract.id,
        projectId: projectId ?? null,
        ownerUserId: data.ownerUserId ?? userId,
        netPrice,
        overridePercent: data.commissionPercent > 0 ? data.commissionPercent : null,
      });
    } catch {
      // không chặn việc lập hợp đồng nếu chính sách hoa hồng lỗi
    }

    return contract;
  });

// ---------------------------------------------------------------- update
export const updateContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        code: z.string().trim().max(60).optional(),
        salePrice: z.number().nonnegative().optional(),
        discountAmount: z.number().nonnegative().optional(),
        customerId: z.string().uuid().nullable().optional(),
        ownerUserId: z.string().uuid().nullable().optional(),
        signedAt: z.string().nullable().optional(),
        note: z.string().trim().max(2000).nullable().optional(),
        status: z.enum(CONTRACT_STATUSES).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { contract, canManage } = await guard(context as Ctx, data.id);
    if (data.ownerUserId !== undefined && !canManage) throw new Error("Chỉ quản lý được đổi người phụ trách");

    const patch: Record<string, any> = {};
    if (data.code !== undefined) patch.code = data.code;
    if (data.customerId !== undefined) patch.customer_id = data.customerId;
    if (data.ownerUserId !== undefined) patch.owner_user_id = data.ownerUserId;
    if (data.signedAt !== undefined) patch.signed_at = data.signedAt || null;
    if (data.note !== undefined) patch.note = data.note;
    if (data.status !== undefined) {
      patch.status = data.status;
      if (data.status === "completed") patch.completed_at = new Date().toISOString();
      if (data.status === "cancelled" || data.status === "draft") patch.completed_at = null;
    }
    if (data.salePrice !== undefined || data.discountAmount !== undefined) {
      const sale = data.salePrice ?? Number(contract.sale_price ?? 0);
      const discount = data.discountAmount ?? Number(contract.discount_amount ?? 0);
      patch.sale_price = sale;
      patch.discount_amount = discount;
      patch.net_price = round(Math.max(0, sale - discount));
    }

    const { data: row, error } = await context.supabase
      .from("contracts")
      .update(patch as never)
      .eq("id", data.id)
      .select(CONTRACT_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const cancelContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), note: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context as Ctx, data.id, true);
    const { error } = await context.supabase
      .from("contracts")
      .update({ status: "cancelled", completed_at: null, note: data.note ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { contract } = await guard(context as Ctx, data.id, true);
    const { error } = await context.supabase
      .from("contracts")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (contract.deal_id) {
      await context.supabase
        .from("pipeline_deals")
        .update({ status: "won", closed_at: new Date().toISOString() })
        .eq("id", contract.deal_id);
    }
    return { ok: true };
  });

export const deleteContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await guard(context as Ctx, data.id, true);
    const { error } = await context.supabase
      .from("contracts")
      .update({ deleted_at: new Date().toISOString(), status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------- installments
export const setInstallments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        contractId: z.string().uuid(),
        rows: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(120),
              percent: z.number().min(0).max(100).nullable().optional(),
              amount: z.number().nonnegative().default(0),
              due_date: z.string().nullable().optional(),
            }),
          )
          .max(24),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { contract } = await guard(context as Ctx, data.contractId);
    const { supabase } = context;
    const { data: existing } = await supabase
      .from("contract_installments")
      .select("id,name,paid_amount,paid_at,status")
      .eq("contract_id", data.contractId);
    const paidByName = new Map(
      (existing ?? []).filter((r: any) => r.status === "paid").map((r: any) => [r.name, r]),
    );

    await supabase.from("contract_installments").delete().eq("contract_id", data.contractId);
    if (data.rows.length) {
      const { error } = await supabase.from("contract_installments").insert(
        data.rows.map((row, index) => {
          const prior = paidByName.get(row.name);
          return {
            tenant_id: contract.tenant_id,
            contract_id: data.contractId,
            name: row.name,
            position: index,
            percent: row.percent ?? null,
            amount: row.amount,
            due_date: row.due_date || null,
            paid_amount: prior ? Number(prior.paid_amount ?? 0) : 0,
            paid_at: prior?.paid_at ?? null,
            status: prior ? "paid" : "pending",
          };
        }),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true, count: data.rows.length };
  });

export const markInstallmentPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        paid: z.boolean().default(true),
        paidAmount: z.number().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("contract_installments")
      .select("id,contract_id,amount")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    await guard(context as Ctx, row.contract_id);

    const { error: upErr } = await supabase
      .from("contract_installments")
      .update(
        data.paid
          ? {
              status: "paid",
              paid_at: new Date().toISOString(),
              paid_amount: data.paidAmount ?? Number(row.amount ?? 0),
            }
          : { status: "pending", paid_at: null, paid_amount: 0 },
      )
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

// ---------------------------------------------------------------- commissions
export const setCommissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        contractId: z.string().uuid(),
        rows: z
          .array(
            z.object({
              beneficiary_user_id: z.string().uuid().nullable().optional(),
              beneficiary_name: z.string().trim().max(120).nullable().optional(),
              role_label: z.string().trim().max(80).nullable().optional(),
              percent: z.number().min(0).max(100).nullable().optional(),
              amount: z.number().nonnegative().default(0),
            }),
          )
          .max(12),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { contract } = await guard(context as Ctx, data.contractId, true);
    const { supabase } = context;
    const { data: existing } = await supabase
      .from("contract_commissions")
      .select("id,beneficiary_user_id,status,approved_at,paid_at")
      .eq("contract_id", data.contractId);
    const priorByUser = new Map((existing ?? []).map((r: any) => [r.beneficiary_user_id ?? "", r]));

    await supabase.from("contract_commissions").delete().eq("contract_id", data.contractId);
    if (data.rows.length) {
      const { error } = await supabase.from("contract_commissions").insert(
        data.rows.map((row) => {
          const prior = priorByUser.get(row.beneficiary_user_id ?? "");
          return {
            tenant_id: contract.tenant_id,
            contract_id: data.contractId,
            beneficiary_user_id: row.beneficiary_user_id ?? null,
            beneficiary_name: row.beneficiary_name ?? null,
            role_label: row.role_label ?? null,
            percent: row.percent ?? null,
            amount: row.amount,
            status: prior?.status ?? "pending",
            approved_at: prior?.approved_at ?? null,
            paid_at: prior?.paid_at ?? null,
          };
        }),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true, count: data.rows.length };
  });

export const setCommissionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "paid"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("contract_commissions")
      .select("id,contract_id")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    await guard(context as Ctx, row.contract_id, true);

    const patch: Record<string, any> = { status: data.status };
    if (data.status === "approved") {
      patch.approved_by = userId;
      patch.approved_at = new Date().toISOString();
      patch.paid_at = null;
    } else if (data.status === "paid") {
      patch.paid_at = new Date().toISOString();
    } else {
      patch.approved_at = null;
      patch.approved_by = null;
      patch.paid_at = null;
    }
    const { error: upErr } = await supabase.from("contract_commissions").update(patch as never).eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });
