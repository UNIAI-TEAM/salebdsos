// Nhận điểm chạm của khách trên landing dự án: POST /api/public/project-touch
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";
import { UAParser } from "ua-parser-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const TOUCH_EVENTS = [
  "landing_view",
  "gallery_view",
  "image_view",
  "pricing_view",
  "policy_view",
  "schedule_view",
  "brochure_download",
  "call_click",
  "zalo_click",
  "share_click",
  "form_open",
  "form_submit",
  "scroll_end",
] as const;

const Body = z.object({
  slug: z.string().trim().min(1).max(80).optional(),
  projectId: z.string().uuid().optional(),
  sessionId: z.string().trim().min(8).max(64),
  qrCode: z.string().trim().max(40).optional().nullable(),
  events: z
    .array(
      z.object({
        type: z.enum(TOUCH_EVENTS as unknown as [string, ...string[]]),
        meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      }),
    )
    .min(1)
    .max(20),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const hashIp = (ip: string | null) => {
  const salt = process.env["IP_HASH_SALT"] || "salebdsos";
  return ip ? createHash("sha256").update(ip + salt).digest("hex").slice(0, 32) : null;
};

const getIp = (r: Request) =>
  r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  r.headers.get("cf-connecting-ip") ||
  r.headers.get("x-real-ip") ||
  null;

// Rate-limit đơn giản theo ip_hash trong bộ nhớ worker
const hits = new Map<string, { n: number; t: number }>();
function tooMany(key: string) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now - cur.t > 60_000) {
    hits.set(key, { n: 1, t: now });
    return false;
  }
  cur.n += 1;
  return cur.n > 60;
}

export const Route = createFileRoute("/api/public/project-touch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return json({ error: "invalid" }, 400);
        }

        const ipHash = hashIp(getIp(request));
        if (ipHash && tooMany(ipHash)) return json({ error: "rate_limited" }, 429);

        let tenantId: string | null = null;
        let projectId: string | null = parsed.projectId ?? null;
        if (parsed.slug) {
          const { data: page } = await supabaseAdmin
            .from("ai_sales_pages")
            .select("tenant_id,project_id")
            .eq("slug", parsed.slug)
            .eq("is_published", true)
            .is("deleted_at", null)
            .maybeSingle();
          if (page) {
            tenantId = page.tenant_id;
            projectId = projectId ?? page.project_id;
          }
        }
        if (!projectId) return json({ error: "no_project" }, 404);
        if (!tenantId) {
          const { data: proj } = await supabaseAdmin
            .from("projects")
            .select("tenant_id")
            .eq("id", projectId)
            .maybeSingle();
          tenantId = proj?.tenant_id ?? null;
        }
        if (!tenantId) return json({ error: "no_project" }, 404);

        let qrId: string | null = null;
        let channel: string | null = null;
        if (parsed.qrCode) {
          const { data: qr } = await supabaseAdmin
            .from("project_qr_codes")
            .select("id,channel,project_id")
            .eq("code", parsed.qrCode)
            .maybeSingle();
          if (qr && qr.project_id === projectId) {
            qrId = qr.id;
            channel = qr.channel;
          }
        }

        const ua = request.headers.get("user-agent") || "";
        const device = new UAParser(ua).getResult().device.type || "desktop";
        const rows = parsed.events.map((e) => ({
          tenant_id: tenantId,
          project_id: projectId,
          qr_code_id: qrId,
          session_id: parsed.sessionId,
          event_type: e.type,
          channel,
          meta: e.meta ?? {},
          device_type: device,
          referrer: request.headers.get("referer")?.slice(0, 300) ?? null,
          ip_hash: ipHash,
        }));

        const { error } = await supabaseAdmin.from("project_touchpoints").insert(rows);
        if (error) {
          console.error("[project-touch] insert", error.message);
          return json({ error: "failed" }, 500);
        }
        return json({ ok: true });
      },
    },
  },
});
