// Tracking endpoint: NFC tap / QR scan / link click → log event → 302 to card.
// URL: /api/public/t/<short_code>?s=<override_source>
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { UAParser } from "ua-parser-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const IP_SALT = process.env.IP_HASH_SALT || "unicom-nfc";

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip + IP_SALT).digest("hex").slice(0, 32);
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export const Route = createFileRoute("/api/public/t/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const code = params.code;
        const url = new URL(request.url);
        const sourceOverride = url.searchParams.get("s");

        // Resolve short code → card + default source
        const { data: shortRow } = await supabaseAdmin
          .from("nfc_short_codes")
          .select("card_id, tenant_id, source, is_active")
          .eq("code", code)
          .maybeSingle();

        if (!shortRow || !shortRow.is_active) {
          return new Response("Not found", { status: 404 });
        }

        const { data: card } = await supabaseAdmin
          .from("digital_cards")
          .select("id, slug, tenant_id, is_published")
          .eq("id", shortRow.card_id)
          .maybeSingle();

        if (!card || !card.is_published) {
          return new Response("Card unavailable", { status: 410 });
        }

        const validSources = ["nfc", "qr", "link", "social", "direct"];
        const source = validSources.includes(sourceOverride || "")
          ? (sourceOverride as string)
          : shortRow.source;

        const ua = request.headers.get("user-agent") || "";
        const parsed = new UAParser(ua).getResult();

        // Fire-and-forget log (don't block redirect)
        supabaseAdmin
          .from("interaction_events")
          .insert({
            card_id: card.id,
            tenant_id: card.tenant_id ?? shortRow.tenant_id,
            short_code: code,
            source,
            device_type: parsed.device.type || "desktop",
            browser: parsed.browser.name || null,
            os: parsed.os.name || null,
            referrer: request.headers.get("referer") || null,
            ip_hash: hashIp(getClientIp(request)),
            user_agent: ua.slice(0, 500),
          })
          .then(({ error }) => {
            if (error) console.error("[track] insert failed", error.message);
          });

        const target = `${url.origin}/c/${card.slug}?utm_source=${source}`;
        return new Response(null, {
          status: 302,
          headers: {
            Location: target,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
