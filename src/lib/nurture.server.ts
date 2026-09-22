// Bộ chạy quy trình nhắc khách tự động (cron gọi qua /api/public/nurture-run hoặc bấm chạy tay).
// Nguyên tắc: có chốt lượt chạy, giới hạn số tin mỗi lượt, mỗi khách chỉ nhận mỗi bước một lần.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  appendMessage,
  loadChannelSettings,
  sendEmailMessage,
  sendSmsMessage,
  sendZaloMessage,
  type DispatchResult,
} from "@/lib/channels.server";
import {
  NURTURE_KEY,
  NURTURE_LOCK_KEY,
  parseNurtureSettings,
  renderTemplate,
  type NurtureSettings,
  type NurtureStepKey,
} from "@/lib/nurture";
import { sendPushToUser } from "@/lib/push.server";

const admin = supabaseAdmin as any;
const CART_STATUSES = ["locked", "reserved", "negotiating", "deposited"];
const OPEN_LEAD_STATUSES = ["new", "contacted", "consulting", "qualified", "quoted", "proposal", "deposit"];

export type NurtureRunResult = {
  ok: boolean;
  skipped?: string;
  tenants: number;
  sent: number;
  failed: number;
  items: {
    tenantId: string;
    leadId: string;
    step: NurtureStepKey;
    channel: string;
    status: string;
    error: string | null;
  }[];
};

function inQuietWindow(settings: NurtureSettings): boolean {
  // Giờ Việt Nam (UTC+7)
  const hour = new Date(Date.now() + 7 * 3600_000).getUTCHours();
  return hour >= settings.quietStartHour && hour < settings.quietEndHour;
}

function money(value: number | null | undefined): string {
  if (!value) return "";
  return new Intl.NumberFormat("vi-VN").format(Math.round(value)) + " d";
}

async function ensureConversation(args: {
  tenantId: string;
  leadId: string;
  projectId: string | null;
  ownerUserId: string | null;
  name: string | null;
  phone: string | null;
}) {
  const { data: existing } = await admin
    .from("conversations")
    .select("id, contact_zalo_id")
    .eq("tenant_id", args.tenantId)
    .eq("lead_id", args.leadId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as { id: string; contact_zalo_id: string | null };

  const { data, error } = await admin
    .from("conversations")
    .insert({
      tenant_id: args.tenantId,
      lead_id: args.leadId,
      project_id: args.projectId,
      owner_user_id: args.ownerUserId,
      channel: "note",
      contact_name: args.name,
      contact_phone: args.phone,
      last_message_preview: "Nhắc khách tự động",
    })
    .select("id, contact_zalo_id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string; contact_zalo_id: string | null };
}

type Candidate = {
  step: NurtureStepKey;
  leadId: string;
  productId: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  projectId: string | null;
  projectName: string;
  productLabel: string;
  productPrice: number | null;
  deadline: string;
  ownerUserId: string | null;
};

async function collectCandidates(tenantId: string, settings: NurtureSettings): Promise<Candidate[]> {
  const now = Date.now();
  const since = new Date(now - 45 * 86_400_000).toISOString();

  const [leadsQ, dealsQ, productsQ, contractsQ, projectsQ, sentQ] = await Promise.all([
    admin
      .from("leads")
      .select("id, full_name, phone, email, project_id, owner_user_id, status, created_at")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .in("status", OPEN_LEAD_STATUSES)
      .gte("created_at", since)
      .limit(1000),
    admin
      .from("pipeline_deals")
      .select("id, lead_id, status, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .limit(1000),
    admin
      .from("products")
      .select("id, name, code, price, project_id, deal_id, listing_status, hold_expires_at")
      .eq("tenant_id", tenantId)
      .not("deal_id", "is", null)
      .in("listing_status", CART_STATUSES)
      .limit(1000),
    admin
      .from("contracts")
      .select("lead_id, deal_id, status")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .in("status", ["draft", "active", "completed"])
      .limit(1000),
    admin.from("projects").select("id, name").eq("tenant_id", tenantId).limit(500),
    admin.from("nurture_messages").select("lead_id, step_key").eq("tenant_id", tenantId).limit(5000),
  ]);

  const leads = (leadsQ.data ?? []) as any[];
  const deals = (dealsQ.data ?? []) as any[];
  const products = (productsQ.data ?? []) as any[];
  const projectName = new Map<string, string>(((projectsQ.data ?? []) as any[]).map((p) => [p.id, p.name]));
  const sent = new Set(((sentQ.data ?? []) as any[]).map((row) => `${row.lead_id}:${row.step_key}`));

  const contractLeads = new Set<string>();
  const contractDeals = new Set<string>();
  for (const row of (contractsQ.data ?? []) as any[]) {
    if (row.lead_id) contractLeads.add(row.lead_id);
    if (row.deal_id) contractDeals.add(row.deal_id);
  }

  const dealById = new Map<string, any>(deals.map((d) => [d.id, d]));
  const cartByLead = new Map<string, { product: any; deal: any }>();
  for (const product of products) {
    const deal = dealById.get(product.deal_id);
    if (!deal?.lead_id) continue;
    if (!cartByLead.has(deal.lead_id)) cartByLead.set(deal.lead_id, { product, deal });
  }
  for (const deal of deals) {
    if (deal.status === "open" && deal.lead_id && !cartByLead.has(deal.lead_id)) {
      cartByLead.set(deal.lead_id, { product: null, deal });
    }
  }

  const out: Candidate[] = [];
  const push = (step: NurtureStepKey, lead: any, cart: { product: any; deal: any } | null, deadline = "") => {
    if (sent.has(`${lead.id}:${step}`)) return;
    const product = cart?.product;
    const pid = product?.project_id ?? lead.project_id ?? null;
    out.push({
      step,
      leadId: lead.id,
      productId: product?.id ?? null,
      name: lead.full_name,
      phone: lead.phone,
      email: lead.email,
      projectId: pid,
      projectName: (pid && projectName.get(pid)) || "dự án",
      productLabel: product ? product.code || product.name : "",
      productPrice: product?.price ?? null,
      deadline,
      ownerUserId: lead.owner_user_id ?? null,
    });
  };

  for (const lead of leads) {
    if (contractLeads.has(lead.id)) continue;
    const cart = cartByLead.get(lead.id) ?? null;
    if (cart && contractDeals.has(cart.deal.id)) continue;

    if (!cart) {
      const step = settings.steps.followup_submitted;
      if (step.enabled && now - new Date(lead.created_at).getTime() >= step.delayHours * 3600_000) {
        push("followup_submitted", lead, null);
      }
      continue;
    }

    const hold = cart.product?.hold_expires_at ? new Date(cart.product.hold_expires_at).getTime() : null;
    const expiring = settings.steps.hold_expiring;
    if (expiring.enabled && hold && hold > now && hold - now <= expiring.delayHours * 3600_000) {
      push(
        "hold_expiring",
        lead,
        cart,
        new Date(hold).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }),
      );
      continue;
    }

    const close = settings.steps.cart_close;
    const cartAt = new Date(cart.deal.created_at ?? lead.created_at).getTime();
    if (close.enabled && now - cartAt >= close.delayHours * 3600_000) {
      push("cart_close", lead, cart);
    }
  }

  return out;
}

async function dispatch(args: {
  tenantId: string;
  channelPref: string;
  zaloUserId: string | null;
  phone: string | null;
  email: string | null;
  text: string;
  origin: string | null;
  channels: Awaited<ReturnType<typeof loadChannelSettings>>;
}): Promise<{ channel: string; result: DispatchResult }> {
  const { channels } = args;
  const pick = () => {
    if (args.channelPref !== "auto") return args.channelPref;
    if (channels.zalo.enabled && args.zaloUserId) return "zalo";
    if (channels.sms.enabled && args.phone) return "sms";
    if (channels.email.enabled && args.email) return "email";
    return "note";
  };
  const channel = pick();

  if (channel === "zalo") {
    return {
      channel,
      result: await sendZaloMessage({ tenantId: args.tenantId, zaloUserId: args.zaloUserId, text: args.text }),
    };
  }
  if (channel === "sms") {
    return { channel, result: await sendSmsMessage({ settings: channels, phone: args.phone, text: args.text }) };
  }
  if (channel === "email") {
    return {
      channel,
      result: await sendEmailMessage({
        settings: channels,
        to: args.email,
        subject: "Nhắc lịch chốt hợp đồng",
        text: args.text,
        origin: args.origin,
      }),
    };
  }
  return { channel: "note", result: { status: "pending", externalId: null, error: null } };
}

/** Chạy một lượt nhắc khách. Có chốt lượt chạy nên hai lượt trùng nhau sẽ tự bỏ qua. */
export async function runNurture(options?: {
  tenantId?: string | null;
  limit?: number | null;
  origin?: string | null;
  ignoreQuietHours?: boolean;
}): Promise<NurtureRunResult> {
  const result: NurtureRunResult = { ok: true, tenants: 0, sent: 0, failed: 0, items: [] };

  const { data: locked } = await admin.rpc("acquire_job_lock", { _key: NURTURE_LOCK_KEY, _seconds: 300 });
  if (!locked) return { ...result, ok: false, skipped: "another_run_in_progress" };

  try {
    let settingsQuery = admin.from("settings").select("tenant_id, value").eq("key", NURTURE_KEY);
    if (options?.tenantId) settingsQuery = settingsQuery.eq("tenant_id", options.tenantId);
    const { data: rows } = await settingsQuery.limit(200);

    for (const row of ((rows ?? []) as any[])) {
      const settings = parseNurtureSettings(row.value);
      if (!settings.enabled) continue;
      if (!options?.ignoreQuietHours && !inQuietWindow(settings)) continue;

      const tenantId = row.tenant_id as string;
      const budget = Math.min(options?.limit ?? settings.maxPerRun, settings.maxPerRun);
      const candidates = (await collectCandidates(tenantId, settings)).slice(0, budget);
      if (!candidates.length) continue;
      result.tenants += 1;

      const channels = await loadChannelSettings(tenantId);

      for (const item of candidates) {
        const step = settings.steps[item.step];
        const text = renderTemplate(step.template, {
          name: item.name || "anh/chị",
          project: item.projectName,
          product: item.productLabel || "sản phẩm đang giữ",
          price: money(item.productPrice),
          deadline: item.deadline,
          hotline: channels.telephony.hotline || "",
          agent: settings.signature || channels.zalo.oaName || "chuyên viên tư vấn",
        });

        try {
          const conversation = await ensureConversation({
            tenantId,
            leadId: item.leadId,
            projectId: item.projectId,
            ownerUserId: item.ownerUserId,
            name: item.name,
            phone: item.phone,
          });

          const { channel, result: dispatched } = await dispatch({
            tenantId,
            channelPref: step.channel,
            zaloUserId: conversation.contact_zalo_id ?? null,
            phone: item.phone,
            email: item.email,
            text,
            origin: options?.origin ?? null,
            channels,
          });

          await appendMessage({
            tenantId,
            conversationId: conversation.id,
            channel: channel === "note" ? "note" : channel,
            direction: "out",
            body: text,
            senderName: "Nhắc tự động",
            deliveryStatus: dispatched.status,
            errorMessage: dispatched.error,
            meta: { auto_nurture: true, step: item.step },
          });

          // Ghi nhận đã nhắc (mỗi khách mỗi bước một lần) — bỏ qua nếu lượt khác đã ghi
          const { error: insertError } = await admin.from("nurture_messages").insert({
            tenant_id: tenantId,
            lead_id: item.leadId,
            product_id: item.productId,
            conversation_id: conversation.id,
            step_key: item.step,
            channel,
            body: text,
            status: dispatched.status,
            error_message: dispatched.error,
            owner_user_id: item.ownerUserId,
          });
          if (insertError) continue;

          if (item.ownerUserId) {
            await admin.from("notifications").insert({
              tenant_id: tenantId,
              user_id: item.ownerUserId,
              type: "nurture",
              title: item.step === "followup_submitted" ? "Đã nhắc khách xem sản phẩm" : "Đã nhắc khách chốt hợp đồng",
              body: `${item.name || "Khách"}: ${text.slice(0, 140)}`,
              link: "/inbox",
              lead_id: item.leadId,
            });
            await sendPushToUser({
              userId: item.ownerUserId,
              title: "Nhắc khách tự động đã gửi",
              body: `${item.name || "Khách"} — ${item.productLabel || item.projectName}`,
              link: "/inbox",
              tag: `nurture-${item.leadId}`,
            });
          }

          if (dispatched.status === "failed") result.failed += 1;
          else result.sent += 1;
          result.items.push({
            tenantId,
            leadId: item.leadId,
            step: item.step,
            channel,
            status: dispatched.status,
            error: dispatched.error,
          });
        } catch (error) {
          result.failed += 1;
          result.items.push({
            tenantId,
            leadId: item.leadId,
            step: item.step,
            channel: "none",
            status: "failed",
            error: (error as Error).message,
          });
        }
      }
    }
  } finally {
    await admin.rpc("release_job_lock", { _key: NURTURE_LOCK_KEY });
  }

  return result;
}
