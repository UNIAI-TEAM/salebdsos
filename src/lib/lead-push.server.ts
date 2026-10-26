import { shouldDeliverLeadPush, shouldDeliverAgencyPush, LEAD_PUSH_COPY, AGENCY_PUSH_COPY, type AgencyPushTarget } from "./lead-push";
import { pushConfigured, sendPushToUser } from "./push.server";

export async function runLeadPushJobs() {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: jobs, error } = await db.rpc("claim_push_jobs_v2");
  if (error) throw error;
  let accepted = 0;
  for (const job of jobs ?? []) {
    let state: "accepted" | "failed" | "skipped" | "pending" = "skipped";
    let lastError: string | null = null;
    try {
      if (job.kind === "agency_assigned" || job.kind === "agency_sla_warning") {
        const { data: target, error: targetError } = await db.rpc("agency_push_target", { p_job: job.id });
        if (targetError) throw targetError;
        if (shouldDeliverAgencyPush(target as AgencyPushTarget | null, job.user_id, job.tenant_id, job.kind, job.deadline)) {
          const warning = job.kind === "agency_sla_warning";
          const title = warning ? AGENCY_PUSH_COPY.warning : AGENCY_PUSH_COPY.assigned;
          // Assignment already has an atomic in-app notification from the routing RPC.
          if (warning) {
            const { error: notificationError } = await db.from("notifications").upsert({
              id: job.id, tenant_id: job.tenant_id, user_id: job.user_id,
              type: "agency_sla_warning", title, body: AGENCY_PUSH_COPY.body, link: "/agencies",
            }, { onConflict: "id", ignoreDuplicates: true });
            if (notificationError) throw notificationError;
          }
          if (!pushConfigured()) throw new Error("Chưa cấu hình khóa gửi thông báo");
          const result = await sendPushToUser({ userId: job.user_id, tenantId: job.tenant_id,
            title, body: AGENCY_PUSH_COPY.body, link: "/agencies", tag: `agency-${job.id}`,
            ttl: warning ? Math.max(1, Math.ceil((Date.parse(job.deadline ?? "") - Date.now()) / 1000)) : 3600 });
          if (result.sent > 0) { state = "accepted"; accepted += 1; }
          else if (result.failed > 0) throw new Error("Thiết bị chưa chấp nhận thông báo");
          else lastError = "Chưa có thiết bị đang bật";
        }
      } else {
      const { data: lead, error: leadError } = await db.from("leads")
        .select("owner_user_id,status,deleted_at,meta").eq("id", job.lead_id).eq("tenant_id", job.tenant_id).maybeSingle();
      if (leadError) throw leadError;
      if (lead && shouldDeliverLeadPush(lead, job.user_id, job.kind, job.deadline)) {
        const title = job.kind === "assigned" ? LEAD_PUSH_COPY.assigned : LEAD_PUSH_COPY.warning;
        // A stable job UUID makes notification insertion retry-safe.
        const { error: notificationError } = await db.from("notifications").upsert({
          id: job.id, tenant_id: job.tenant_id, user_id: job.user_id, lead_id: job.lead_id,
          type: job.kind === "assigned" ? "lead_assigned" : "lead_sla_warning",
          title, body: LEAD_PUSH_COPY.body, link: "/sale-overview",
        }, { onConflict: "id", ignoreDuplicates: true });
        if (notificationError) throw notificationError;
        if (!pushConfigured()) throw new Error("Chưa cấu hình khóa gửi thông báo");
        const result = await sendPushToUser({
          userId: job.user_id, tenantId: job.tenant_id, title, body: LEAD_PUSH_COPY.body,
          link: "/sale-overview", tag: `lead-${job.id}`,
          ttl: job.kind === "sla_warning" ? Math.max(1, Math.ceil((Date.parse(job.deadline ?? "") - Date.now()) / 1000)) : 3600,
        });
        if (result.sent > 0) { state = "accepted"; accepted += 1; }
        else if (result.failed > 0) throw new Error("Thiết bị chưa chấp nhận thông báo");
        else lastError = "Chưa có thiết bị đang bật";
      }
      }
    } catch (e) {
      state = job.attempts >= 3 ? "failed" : "pending";
      lastError = e instanceof Error ? e.message : String(e);
    }
    const { error: savedError } = await db.from("lead_push_jobs").update({
      state, last_error: lastError,
      run_at: new Date(Date.now() + 60_000).toISOString(),
      finished_at: state === "pending" ? null : new Date().toISOString(),
    }).eq("id", job.id).eq("state", "processing");
    if (savedError) throw savedError;
  }
  const { error: scheduleError } = await db.rpc("refresh_lead_push_schedule");
  if (scheduleError) throw scheduleError;
  return { processed: jobs?.length ?? 0, accepted };
}