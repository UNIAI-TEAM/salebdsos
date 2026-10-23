import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildTimeline, summarize, normPhone } from "./customer-360";

export const getCustomer360 = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; id: string }) =>
    z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const t = data.tenantId;
    const { data: c } = await sb.from("customers").select("id,phone,email")
      .eq("tenant_id", t).eq("id", data.id).maybeSingle();
    if (!c) throw new Error("Không tìm thấy khách hàng");
    const phone = normPhone(c.phone);
    const tail = phone ? phone.slice(-9) : null;

    // Leads matched by customer phone/email (leads have no customer_id).
    let leadQ = sb.from("leads").select("id,source,status,notes,created_at,phone,email,owner_user_id")
      .eq("tenant_id", t).is("deleted_at", null).limit(50);
    const ors = [tail && `phone.ilike.%${tail}`, c.email && `email.eq.${c.email}`].filter(Boolean);
    const { data: leadsRaw } = ors.length ? await leadQ.or(ors.join(",")) : { data: [] };
    const leads = leadsRaw ?? [];
    const leadIds = leads.map((l: any) => l.id);
    const inLeads = (q: any, col = "lead_id") =>
      leadIds.length ? q.or(`customer_id.eq.${c.id},${col}.in.(${leadIds.join(",")})`) : q.eq("customer_id", c.id);

    const [convQ, callQ, ctrQ, apptQ, txQ] = await Promise.all([
      inLeads(sb.from("conversations").select("id").eq("tenant_id", t)),
      inLeads(sb.from("call_logs").select("id,direction,status,duration_seconds,notes,recording_url,started_at,created_at").eq("tenant_id", t).limit(100)),
      inLeads(sb.from("contracts").select("id,code,status,net_price,signed_at,created_at").eq("tenant_id", t).is("deleted_at", null)),
      sb.from("appointments").select("id,title,location,starts_at").eq("tenant_id", t).eq("customer_id", c.id).limit(100),
      sb.from("customer_transactions").select("id,kind,amount,note,occurred_at").eq("tenant_id", t).eq("customer_id", c.id).is("deleted_at", null).limit(100),
    ]);
    const convIds = (convQ.data ?? []).map((x: any) => x.id);
    const contracts = ctrQ.data ?? [];
    const ctrIds = contracts.map((x: any) => x.id);

    const [msgQ, instQ, payQ, tixQ, fileQ, nurQ] = await Promise.all([
      convIds.length ? sb.from("conversation_messages").select("id,channel,direction,body,created_at").in("conversation_id", convIds).order("created_at", { ascending: false }).limit(200) : { data: [] },
      ctrIds.length ? sb.from("contract_installments").select("id,name,paid_amount,paid_at").in("contract_id", ctrIds) : { data: [] },
      ctrIds.length ? sb.from("bank_transactions").select("id,bank_name,amount,content,transferred_at,created_at").eq("tenant_id", t).in("matched_contract_id", ctrIds) : { data: [] },
      leadIds.length || tail ? sb.from("event_tickets").select("id,code,status,checked_in_at,created_at").eq("tenant_id", t)
        .or([leadIds.length && `lead_id.in.(${leadIds.join(",")})`, tail && `guest_phone.ilike.%${tail}`].filter(Boolean).join(",")) : { data: [] },
      sb.from("files").select("id,name,created_at").eq("tenant_id", t).is("deleted_at", null)
        .or(`and(related_type.eq.customer,related_id.eq.${c.id})${ctrIds.length ? `,and(related_type.eq.contract,related_id.in.(${ctrIds.join(",")}))` : ""}`),
      leadIds.length ? sb.from("nurture_messages").select("id,channel,status,body,sent_at,created_at").in("lead_id", leadIds).limit(100) : { data: [] },
    ]);

    const src = {
      leads, messages: msgQ.data ?? [], calls: callQ.data ?? [], contracts,
      installments: instQ.data ?? [], payments: payQ.data ?? [], tickets: tixQ.data ?? [],
      files: fileQ.data ?? [], nurture: nurQ.data ?? [], appointments: apptQ.data ?? [],
      transactions: txQ.data ?? [],
    };
    return {
      summary: { ...summarize(src), leads: leads.length, sources: [...new Set<string>(leads.map((l: any) => String(l.source ?? "")).filter(Boolean))] },
      timeline: buildTimeline(src).slice(0, 300),
    };
  });
