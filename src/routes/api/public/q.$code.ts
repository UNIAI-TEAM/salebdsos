// Dynamic QR redirect: /api/public/q/<short_code>
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { UAParser } from "ua-parser-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const IP_SALT = process.env.IP_HASH_SALT || "unicom-nfc";
const hashIp = (ip: string | null) =>
  ip ? createHash("sha256").update(ip + IP_SALT).digest("hex").slice(0, 32) : null;

const getIp = (r: Request) =>
  r.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  r.headers.get("cf-connecting-ip") ||
  r.headers.get("x-real-ip") ||
  null;

export const Route = createFileRoute("/api/public/q/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const code = params.code;
        const url = new URL(request.url);

        const { data: row } = await supabaseAdmin
          .from("dynamic_qr_codes")
          .select("id, target_url, is_active, scan_count, tenant_id")
          .eq("short_code", code)
          .maybeSingle();

        if (!row || !row.is_active) {
          return new Response("Not found", { status: 404 });
        }

        const ua = request.headers.get("user-agent") || "";
        const parsed = new UAParser(ua).getResult();

        // Increment scan count + log generic interaction (best-effort)
        supabaseAdmin
          .from("dynamic_qr_codes")
          .update({ scan_count: (row.scan_count || 0) + 1, updated_at: new Date().toISOString() })
          .eq("id", row.id)
          .then(({ error }) => { if (error) console.error("[dq] inc failed", error.message); });

        // If target points to one of our /c/<slug> cards, also log interaction_events
        const slugMatch = row.target_url.match(/\/c\/([\w-]+)/);
        if (slugMatch) {
          const slug = slugMatch[1];
          const { data: card } = await supabaseAdmin
            .from("cards")
            .select("id, tenant_id, is_published")
            .eq("slug", slug)
            .maybeSingle();
          if (card?.is_published) {
            supabaseAdmin
              .from("interaction_events")
              .insert({
                card_id: card.id,
                tenant_id: card.tenant_id ?? row.tenant_id,
                short_code: code,
                source: "qr",
                device_type: parsed.device.type || "desktop",
                browser: parsed.browser.name || null,
                os: parsed.os.name || null,
                referrer: request.headers.get("referer") || null,
                ip_hash: hashIp(getIp(request)),
                user_agent: ua.slice(0, 500),
              })
              .then(({ error }) => { if (error) console.error("[dq] log failed", error.message); });
          }
        }

        const sep = row.target_url.includes("?") ? "&" : "?";
        const target = `${row.target_url}${sep}utm_source=qr&utm_medium=dynamic&utm_campaign=${encodeURIComponent(code)}`;
        return new Response(null, {
          status: 302,
          headers: { Location: target, "Cache-Control": "no-store" },
        });

        void url;
      },
    },
  },
});
