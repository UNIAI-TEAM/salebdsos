// Customer detail — transactions, appointments, timeline; auto-syncs pipeline.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TX_SELECT =
  "id,tenant_id,customer_id,deal_id,project_id,kind,amount,currency,status,note,occurred_at,created_by,created_at";

export const TX_KINDS = ["deposit", "payment", "contract", "refund", "other"] as const;

const KindEnum = z.enum(TX_KINDS);
const StatusEnum = z.enum(["pending", "completed", "canceled"]);

// Transaction kind -> pipeline stage name it should push the deal into.
const STAGE_BY_KIND: Record<string, string> = {
  deposit: "Đặt cọc",
  contract: "Thành công",
  payment: "Thành công",
};

async function logTimeline(
  supabase: any,
  args: { tenantId: string; actor: string | null; action: string; entityId: string; diff: any },
) {
  await supabase.from("audit_logs").insert({
    tenant_id: args.tenantId,
    actor_user_id: args.actor,
    action: args.action,
    entity: "customer",
    entity_id: args.entityId,
    diff: args.diff,
  });
}

export const getCustomerDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; id: string }) =>
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [customerQ, txQ, apptQ, dealsQ, timelineQ, stagesQ, projectsQ] = await Promise.all([
      supabase
        .from("customers")
        .select("id,tenant_id,full_name,email,phone,company,tags,notes,created_at,updated_at")
        .eq("tenant_id", data.tenantId)
        .eq("id", data.id)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("customer_transactions")
        .select(TX_SELECT)
        .eq("tenant_id", data.tenantId)
        .eq("customer_id", data.id)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false })
        .limit(200),
      supabase
        .from("appointments")
        .select("id,title,location,starts_at,ends_at,status,notes,created_at")
        .eq("tenant_id", data.tenantId)
        .eq("customer_id", data.id)
        .order("starts_at", { ascending: false })
        .limit(200),
      supabase
        .from("pipeline_deals")
        .select("id,title,value,currency,status,stage_id,expected_close_date,last_activity_at")
        .eq("tenant_id", data.tenantId)
        .eq("customer_id", data.id)
        .is("deleted_at", null)
        .order("last_activity_at", { ascending: false })
        .limit(50),
      supabase
        .from("audit_logs")
        .select("id,action,entity,entity_id,diff,occurred_at,actor_user_id")
        .eq("tenant_id", data.tenantId)
        .eq("entity", "customer")
        .eq("entity_id", data.id)
        .order("occurred_at", { ascending: false })
        .limit(100),
      supabase
        .from("pipeline_stages")
        .select("id,name,position")
        .eq("tenant_id", data.tenantId)
        .is("deleted_at", null)
        .order("position", { ascending: true }),
      supabase
        .from("projects")
        .select("id,name")
        .eq("tenant_id", data.tenantId)
        .is("deleted_at", null)
        .order("name"),
    ]);

    if (customerQ.error) throw new Error(customerQ.error.message);
    if (!customerQ.data) throw new Error("Không tìm thấy khách hàng");

    return {
      customer: customerQ.data,
      transactions: txQ.data ?? [],
      appointments: apptQ.data ?? [],
      deals: dealsQ.data ?? [],
      timeline: timelineQ.data ?? [],
      stages: stagesQ.data ?? [],
      projects: projectsQ.data ?? [],
    };
  });

export const createCustomerTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        customerId: z.string().uuid(),
        kind: KindEnum,
        amount: z.number().min(0),
        currency: z.string().max(8).default("VND"),
        status: StatusEnum.default("completed"),
        note: z.string().trim().max(2000).optional().nullable(),
        occurred_at: z.string().min(1).optional(),
        project_id: z.string().uuid().nullable().optional(),
        syncPipeline: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: customer, error: cErr } = await supabase
      .from("customers")
      .select("id,full_name")
      .eq("tenant_id", data.tenantId)
      .eq("id", data.customerId)
      .is("deleted_at", null)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!customer) throw new Error("Không tìm thấy khách hàng");

    let dealId: string | null = null;

    if (data.syncPipeline && data.status !== "canceled") {
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("id,name,position")
        .eq("tenant_id", data.tenantId)
        .is("deleted_at", null)
        .order("position", { ascending: true });

      const wantedName = STAGE_BY_KIND[data.kind];
      const stage =
        (wantedName && (stages ?? []).find((s: any) => s.name === wantedName)) ||
        (stages ?? [])[0];

      if (stage) {
        const { data: existing } = await supabase
          .from("pipeline_deals")
          .select("id,value")
          .eq("tenant_id", data.tenantId)
          .eq("customer_id", data.customerId)
          .is("deleted_at", null)
          .order("last_activity_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          const { data: upd } = await supabase
            .from("pipeline_deals")
            .update({
              stage_id: stage.id,
              value: Math.max(Number(existing.value ?? 0), data.amount),
              status: data.kind === "contract" ? "won" : "open",
              last_activity_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
            .select("id")
            .single();
          dealId = upd?.id ?? existing.id;
        } else {
          const { data: created, error: dErr } = await supabase
            .from("pipeline_deals")
            .insert({
              tenant_id: data.tenantId,
              stage_id: stage.id,
              customer_id: data.customerId,
              owner_user_id: userId,
              title: `Giao dịch – ${customer.full_name}`,
              value: data.amount,
              currency: data.currency || "VND",
              status: data.kind === "contract" ? "won" : "open",
              last_activity_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          if (dErr) throw new Error(dErr.message);
          dealId = created?.id ?? null;
        }
      }
    }

    const { data: tx, error } = await supabase
      .from("customer_transactions")
      .insert({
        tenant_id: data.tenantId,
        customer_id: data.customerId,
        deal_id: dealId,
        project_id: data.project_id || null,
        kind: data.kind,
        amount: data.amount,
        currency: data.currency || "VND",
        status: data.status,
        note: data.note || null,
        occurred_at: data.occurred_at || new Date().toISOString(),
        created_by: userId,
      })
      .select(TX_SELECT)
      .single();
    if (error) throw new Error(error.message);

    await logTimeline(supabase, {
      tenantId: data.tenantId,
      actor: userId,
      action: "customer.transaction",
      entityId: data.customerId,
      diff: {
        kind: data.kind,
        amount: data.amount,
        currency: data.currency || "VND",
        status: data.status,
        note: data.note || null,
        deal_id: dealId,
      },
    });

    return { transaction: tx, dealId };
  });

export const deleteCustomerTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid(), customerId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("customer_transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", data.tenantId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logTimeline(supabase, {
      tenantId: data.tenantId,
      actor: userId,
      action: "customer.transaction_deleted",
      entityId: data.customerId,
      diff: { transaction_id: data.id },
    });
    return { ok: true };
  });

export const createCustomerAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        customerId: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        location: z.string().trim().max(200).optional().nullable(),
        starts_at: z.string().min(1),
        ends_at: z.string().min(1),
        notes: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("appointments")
      .insert({
        tenant_id: data.tenantId,
        customer_id: data.customerId,
        title: data.title,
        location: data.location || null,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        notes: data.notes || null,
        status: "scheduled",
        assigned_to: userId,
        created_by: userId,
      })
      .select("id,title,location,starts_at,ends_at,status,notes,created_at")
      .single();
    if (error) throw new Error(error.message);

    // Keep the pipeline deal fresh so the customer stays visible in the funnel.
    const { data: deal } = await supabase
      .from("pipeline_deals")
      .select("id")
      .eq("tenant_id", data.tenantId)
      .eq("customer_id", data.customerId)
      .is("deleted_at", null)
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (deal) {
      await supabase
        .from("pipeline_deals")
        .update({
          next_action: `Gặp khách: ${data.title}`,
          next_action_at: data.starts_at,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", deal.id);
    }

    await logTimeline(supabase, {
      tenantId: data.tenantId,
      actor: userId,
      action: "customer.appointment",
      entityId: data.customerId,
      diff: { title: data.title, starts_at: data.starts_at, location: data.location || null },
    });

    return row;
  });

export const updateCustomerAppointmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        customerId: z.string().uuid(),
        id: z.string().uuid(),
        status: z.enum(["scheduled", "completed", "canceled", "no_show"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("appointments")
      .update({ status: data.status })
      .eq("tenant_id", data.tenantId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logTimeline(supabase, {
      tenantId: data.tenantId,
      actor: userId,
      action: "customer.appointment_status",
      entityId: data.customerId,
      diff: { appointment_id: data.id, status: data.status },
    });
    return { ok: true };
  });

// Ghi note nhanh cho khách: lưu vào ghi chú khách và đẩy lên timeline.
export const addCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        customerId: z.string().uuid(),
        note: z.string().trim().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: customer, error: cErr } = await supabase
      .from("customers")
      .select("id,notes")
      .eq("tenant_id", data.tenantId)
      .eq("id", data.customerId)
      .is("deleted_at", null)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!customer) throw new Error("Không tìm thấy khách hàng");

    const stamp = new Date().toLocaleString("vi-VN");
    const merged = [`[${stamp}] ${data.note}`, customer.notes || ""].filter(Boolean).join("\n");
    const { error } = await supabase
      .from("customers")
      .update({ notes: merged.slice(0, 20000) })
      .eq("tenant_id", data.tenantId)
      .eq("id", data.customerId);
    if (error) throw new Error(error.message);

    await supabase
      .from("pipeline_deals")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("tenant_id", data.tenantId)
      .eq("customer_id", data.customerId)
      .is("deleted_at", null);

    await logTimeline(supabase, {
      tenantId: data.tenantId,
      actor: userId,
      action: "customer.note",
      entityId: data.customerId,
      diff: { note: data.note },
    });
    return { ok: true };
  });
