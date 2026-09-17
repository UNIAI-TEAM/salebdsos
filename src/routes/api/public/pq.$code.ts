// Quét QR dự án: GET /api/public/pq/<code> → ghi điểm chạm rồi chuyển tới landing dự án.
import { createFileRoute } from "@tanstack/react-router";
import { createHash, randomUUID } from "crypto";
import { UAParser } from "ua-parser-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const hashIp = (ip: string | null) => {
  const salt = process.env["IP_HASH_SALT"] || "salebdsos";
  return ip ? createHash("sha256").update(ip + salt).digest("hex").slice(0, 32) : null;
};

const getIp = (r: Request) =>
  r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  r.headers.get("cf-connecting-ip") ||
  r.headers.get("x-real-ip") ||
  null;

const readSid = (r: Request) =>
  r.headers.get("cookie")?.match(/(?:^|;\s*)sbds_sid=([\w-]{8,64})/)?.[1] ?? null;

export const Route = createFileRoute("/api/public/pq/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const code = params.code;
        const { data: qr } = await supabaseAdmin
          .from("project_qr_codes")
          .select("id,tenant_id,project_id,channel,is_active")
          .eq("code", code)
          .maybeSingle();
        if (!qr || !qr.is_active) return new Response("Not found", { status: 404 });

        const sid = readSid(request) ?? randomUUID();
        const ua = request.headers.get("user-agent") || "";
        const parsed = new UAParser(ua).getResult();

        const { error: tErr } = await supabaseAdmin.from("project_touchpoints").insert({
          tenant_id: qr.tenant_id,
          project_id: qr.project_id,
          qr_code_id: qr.id,
          session_id: sid,
          event_type: "qr_scan",
          channel: qr.channel,
          device_type: parsed.device.type || "desktop",
          referrer: request.headers.get("referer")?.slice(0, 300) ?? null,
          ip_hash: hashIp(getIp(request)),
          meta: { browser: parsed.browser.name ?? null, os: parsed.os.name ?? null, code },
        });
        if (tErr) console.error("[pq] touch", tErr.message);

        void supabaseAdmin
          .rpc("bump_project_qr_scan", { _code: code })
          .then(({ error }: { error: { message: string } | null }) => {
            if (error) console.error("[pq] scan count", error.message);
          });

        // Ưu tiên landing công khai của dự án, nếu chưa có thì về trang dự án nội bộ
        const { data: page } = await supabaseAdmin
          .from("ai_sales_pages")
          .select("slug")
          .eq("project_id", qr.project_id)
          .eq("is_published", true)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const target = page?.slug
          ? `/p/${page.slug}?pq=${encodeURIComponent(code)}`
          : `/?pq=${encodeURIComponent(code)}`;

        return new Response(null, {
          status: 302,
          headers: {
            Location: target,
            "Cache-Control": "no-store",
            "Set-Cookie": `sbds_sid=${sid}; Path=/; Max-Age=2592000; SameSite=Lax`,
          },
        });
      },
    },
  },
});
