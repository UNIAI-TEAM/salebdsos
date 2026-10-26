import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { runLeadPushJobs } from "@/lib/lead-push.server";

export const Route = createFileRoute("/api/public/lead-push-run")({
  server: { handlers: { POST: async ({ request }) => {
    const provided = request.headers.get("x-cron-secret") ?? "";
    if (!provided) return new Response("Unauthorized", { status: 401 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("cron_tokens").select("token").eq("name", "lead_push_run").maybeSingle();
    if (error) return new Response("Configuration unavailable", { status: 503 });
    const left = Buffer.from(provided);
    const right = Buffer.from(data?.token ?? "");
    if (!right.length || left.length !== right.length || !timingSafeEqual(left, right)) return new Response("Unauthorized", { status: 401 });
    try { return Response.json(await runLeadPushJobs()); }
    catch (e) { console.error("lead-push-run", e); return new Response("Push processing failed", { status: 500 }); }
  } } },
});