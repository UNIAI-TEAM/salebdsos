// Gửi chiến dịch hàng loạt theo phân khúc động. Idempotent nhờ unique (campaign_id, lead_id).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseSegment, matchLead, reachable, renderTemplate, type Segment } from "@/lib/segments";
import { loadChannelSettings, sendSmsMessage, sendEmailMessage, sendZaloMessage } from "@/lib/channels.server";
import { sendPushToUser } from "@/lib/push.server";
import { uniqueChannelIdentity, INBOX_COPY } from "./omnichannel";

const BATCH = 200;

export async function resolveAudience(tenantId: string, seg: Segment) {
  const { data } = await supabaseAdmin
    .from("leads")
    .select("id,full_name,phone,email,status,source,project_id,owner_user_id,created_at,updated_at,meta")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5000);
  const now = Date.now();
  return (data ?? []).filter((l) => matchLead(l, seg, now));
}

export async function sendCampaign(campaignId: string, origin: string | null) {
  const { data: c } = await supabaseAdmin.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!c || c.deleted_at) throw new Error("Không tìm thấy chiến dịch");
  if (c.status === "paused" || c.status === "completed") return { sent: 0, remaining: 0 };
  const tpl = (c.template ?? {}) as { subject?: string | null; content?: string | null };
  if (!tpl.content) throw new Error("Chiến dịch chưa có nội dung");

  await supabaseAdmin.from("campaigns").update({ status: "running" }).eq("id", c.id);
  const audience = (await resolveAudience(c.tenant_id, parseSegment(c.audience)))
    .filter((l) => reachable(l, c.channel));

  const { data: done } = await supabaseAdmin
    .from("campaign_recipients").select("lead_id").eq("campaign_id", c.id);
  const doneSet = new Set((done ?? []).map((r) => r.lead_id));
  const todo = audience.filter((l) => !doneSet.has(l.id));
  const batch = todo.slice(0, BATCH);

  const settings = await loadChannelSettings(c.tenant_id);
  const { data: projects } = await supabaseAdmin.from("projects").select("id,name").eq("tenant_id", c.tenant_id);
  const pName = new Map((projects ?? []).map((p: any) => [p.id, p.name]));

  for (const l of batch) {
    const { error: claimErr } = await supabaseAdmin.from("campaign_recipients").insert({
      tenant_id: c.tenant_id, campaign_id: c.id, lead_id: l.id, channel: c.channel,
    });
    if (claimErr) continue; // đã có người khác gửi
    const text = renderTemplate(tpl.content, { name: l.full_name ?? "Quý khách", project: pName.get(l.project_id ?? "") ?? "" });
    let status = "sent", error: string | null = null;
    try {
      if (c.channel === "sms") {
        const r = await sendSmsMessage({ settings, phone: l.phone, text }); status = r.status; error = r.error ?? null;
      } else if (c.channel === "email") {
        const r = await sendEmailMessage({ settings, to: l.email, subject: tpl.subject || c.name, text, origin });
        status = r.status; error = r.error ?? null;
      } else if (c.channel === "zalo") {
        const { data: identities } = await supabaseAdmin.from("channel_identities").select("account_id,external_user_id")
          .eq("tenant_id", c.tenant_id).eq("lead_id", l.id).eq("channel", "zalo").eq("account_id", settings.zalo.oaId).limit(2);
        const identity = uniqueChannelIdentity(identities ?? [], settings.zalo.oaId);
        if (!identity) { status = "failed"; error = INBOX_COPY.identityMissing; }
        else { const r = await sendZaloMessage({ tenantId: c.tenant_id, zaloUserId: identity.external_user_id, text }); status = r.status; error = r.error ?? null; }
      } else {
        await sendPushToUser({ userId: l.owner_user_id, title: c.name, body: `${l.full_name ?? "Khách"}: ${text}`, link: "/leads" });
      }
    } catch (e) { status = "failed"; error = (e as Error).message; }
    await supabaseAdmin.from("campaign_recipients")
      .update({ status, error, sent_at: new Date().toISOString() })
      .eq("campaign_id", c.id).eq("lead_id", l.id);
  }

  const { data: all } = await supabaseAdmin.from("campaign_recipients").select("status").eq("campaign_id", c.id);
  const count = (s: string) => (all ?? []).filter((r) => r.status === s).length;
  const remaining = todo.length - batch.length;
  const prev = (c.stats ?? {}) as Record<string, number>;
  await supabaseAdmin.from("campaigns").update({
    status: remaining > 0 ? "running" : "completed",
    stats: { ...prev, audience: audience.length, sent: count("sent"), pending: count("pending"), failed: count("failed") },
  }).eq("id", c.id);
  return { sent: batch.length, remaining };
}

/** Cron: chạy chiến dịch đến lịch hoặc đang gửi dở. */
export async function runDueCampaigns(origin: string | null) {
  const { data } = await supabaseAdmin.from("campaigns").select("id,status,scheduled_at")
    .is("deleted_at", null).in("status", ["scheduled", "running"]).limit(20);
  const now = Date.now();
  const out: Array<{ id: string; sent: number }> = [];
  for (const c of data ?? []) {
    if (c.status === "scheduled" && (!c.scheduled_at || Date.parse(c.scheduled_at) > now)) continue;
    try { const r = await sendCampaign(c.id, origin); out.push({ id: c.id, sent: r.sent }); } catch { /* ghi lỗi qua stats */ }
  }
  return out;
}
