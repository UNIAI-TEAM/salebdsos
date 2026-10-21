// Đưa khách từ kênh ngoài vào hệ thống: chống trùng theo SĐT/email, chia Sale theo luật,
// gắn sản phẩm (mã căn) → khách vào giỏ hàng, mở hội thoại, thông báo + push cho Sale.
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { appendMessage } from "@/lib/channels.server";
import { assignLeadOwner } from "@/lib/lead-routing.server";
import { INTEGRATIONS_KEY, parseIntegrationSettings } from "@/lib/integrations";

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function loadIntegrationSettings(tenantId: string) {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", INTEGRATIONS_KEY)
    .maybeSingle();
  return parseIntegrationSettings(data?.value);
}

export type InboundLead = {
  tenantId: string;
  source: "zalo_oa" | "facebook_lead_ads" | `portal:${string}`;
  sourceLabel: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  productCode?: string | null;
  budget?: string | null;
  externalId?: string | null;
  zaloUserId?: string | null;
  meta?: Record<string, unknown>;
};

const normPhone = (p?: string | null) => {
  if (!p) return null;
  const d = p.replace(/[^\d+]/g, "").replace(/^\+?84/, "0");
  return d.length >= 9 ? d.slice(0, 15) : null;
};

export async function ingestInboundLead(input: InboundLead) {
  const phone = normPhone(input.phone);
  const email = input.email?.trim().toLowerCase().slice(0, 160) || null;
  if (!phone && !email) return { ok: false as const, error: "missing_contact" };

  const settings = await loadIntegrationSettings(input.tenantId);

  // Dự án: id → tên → mặc định
  let projectId = input.projectId ?? null;
  if (projectId) {
    const { data } = await supabaseAdmin.from("projects").select("id").eq("id", projectId).eq("tenant_id", input.tenantId).maybeSingle();
    projectId = data?.id ?? null;
  }
  if (!projectId && input.projectName) {
    const { data } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .is("deleted_at", null)
      .ilike("name", `%${input.projectName.slice(0, 80)}%`)
      .limit(1)
      .maybeSingle();
    projectId = data?.id ?? null;
  }
  projectId = projectId ?? settings.defaultProjectId ?? null;

  // Sản phẩm quan tâm (mã căn / lô) → khách vào giỏ hàng
  let product: { id: string; code: string | null; project_id: string | null } | null = null;
  if (input.productCode) {
    let q = supabaseAdmin
      .from("products")
      .select("id,code,project_id")
      .eq("tenant_id", input.tenantId)
      .ilike("code", input.productCode.trim().slice(0, 40));
    if (projectId) q = q.eq("project_id", projectId);
    const { data } = await q.limit(1).maybeSingle();
    product = data ?? null;
    if (product?.project_id) projectId = product.project_id;
  }
  const status = product ? "quoted" : "new";

  // Chống trùng: cùng SĐT/email trong tenant
  let existing: { id: string; owner_user_id: string | null; status: string; notes: string | null; meta: any } | null = null;
  {
    const ors = [phone ? `phone.eq.${phone}` : null, email ? `email.eq.${email}` : null].filter(Boolean).join(",");
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id,owner_user_id,status,notes,meta")
      .eq("tenant_id", input.tenantId)
      .is("deleted_at", null)
      .or(ors)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    existing = (data as any) ?? null;
  }

  const noteLine = [
    `[${input.sourceLabel}]`,
    input.note,
    product ? `Quan tâm căn ${product.code}` : input.productCode ? `Mã căn: ${input.productCode}` : null,
    input.budget ? `Ngân sách: ${input.budget}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 900);

  let leadId: string;
  let ownerUserId: string | null;
  let slaMinutes = 15;
  let isNew = false;

  if (existing) {
    leadId = existing.id;
    ownerUserId = existing.owner_user_id;
    const promote = status === "quoted" && ["new", "contacted", "consulting", "qualified"].includes(existing.status);
    await supabaseAdmin
      .from("leads")
      .update({
        ...(promote ? { status: "quoted" } : {}),
        notes: [existing.notes, noteLine].filter(Boolean).join("\n").slice(-4000),
        meta: {
          ...(existing.meta ?? {}),
          ...(product ? { product_id: product.id, product_code: product.code } : {}),
          last_inbound_source: input.source,
          last_inbound_at: new Date().toISOString(),
        },
      } as never)
      .eq("id", leadId);
  } else {
    const assignment = await assignLeadOwner({ tenantId: input.tenantId, projectId, currentOwnerId: null });
    ownerUserId = assignment.ownerUserId;
    slaMinutes = assignment.slaMinutes;
    const { data, error } = await supabaseAdmin
      .from("leads")
      .insert({
        tenant_id: input.tenantId,
        project_id: projectId,
        owner_user_id: ownerUserId,
        full_name: input.name?.slice(0, 120) || "Khách từ " + input.sourceLabel,
        phone,
        email,
        notes: noteLine,
        source: input.source,
        status,
        budget: input.budget?.slice(0, 120) ?? null,
        meta: {
          ...(input.meta ?? {}),
          external_id: input.externalId ?? null,
          ...(product ? { product_id: product.id, product_code: product.code } : {}),
          auto_assigned: assignment.autoAssigned,
          sla_minutes: assignment.slaMinutes,
          sla_due_at: assignment.slaDueAt,
        },
      } as never)
      .select("id")
      .single();
    if (error || !data) return { ok: false as const, error: error?.message ?? "insert_failed" };
    leadId = data.id as string;
    isNew = true;
  }

  // Hội thoại gộp theo khách
  const { data: conv } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("lead_id", leadId)
    .limit(1)
    .maybeSingle();
  let conversationId = (conv?.id as string | undefined) ?? null;
  if (!conversationId) {
    const { data: created } = await supabaseAdmin
      .from("conversations")
      .insert({
        tenant_id: input.tenantId,
        project_id: projectId,
        lead_id: leadId,
        owner_user_id: ownerUserId,
        channel: input.source === "zalo_oa" ? "zalo" : "note",
        contact_name: input.name ?? null,
        contact_phone: phone,
        contact_zalo_id: input.zaloUserId ?? null,
        last_message_preview: noteLine.slice(0, 160),
      } as never)
      .select("id")
      .single();
    conversationId = (created?.id as string | undefined) ?? null;
  }
  if (conversationId) {
    await appendMessage({
      tenantId: input.tenantId,
      conversationId,
      channel: "note",
      direction: "in",
      body: `Khách gửi thông tin qua ${input.sourceLabel}. ${noteLine}`,
      senderName: input.name ?? "Khách",
    });
  }

  if (ownerUserId) {
    const title = isNew ? `Khách mới từ ${input.sourceLabel}` : `Khách cũ quay lại qua ${input.sourceLabel}`;
    const body = `${input.name ?? "Khách"}${phone ? ` · ${phone}` : ""}${product ? ` · căn ${product.code}` : ""}${isNew ? ` — gọi trong ${slaMinutes} phút` : ""}`;
    await supabaseAdmin.from("notifications").insert({
      tenant_id: input.tenantId,
      user_id: ownerUserId,
      lead_id: leadId,
      type: "lead",
      title,
      body,
      link: "/inbox",
    } as never);
    const { sendPushToUser } = await import("@/lib/push.server");
    await sendPushToUser({ userId: ownerUserId, title, body, link: "/inbox" });
  }

  await supabaseAdmin.from("audit_logs").insert({
    tenant_id: input.tenantId,
    action: isNew ? "inbound_lead.create" : "inbound_lead.merge",
    entity: "leads",
    entity_id: leadId,
    diff: { source: input.source, product: product?.code ?? null, external_id: input.externalId ?? null },
  } as never);

  return { ok: true as const, leadId, isNew, inCart: Boolean(product), ownerUserId };
}
