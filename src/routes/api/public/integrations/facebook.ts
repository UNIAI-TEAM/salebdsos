// Webhook Facebook Lead Ads.
// GET: xác minh (hub.verify_token khớp mã của sàn). POST: chữ ký X-Hub-Signature-256 bằng FB_APP_SECRET,
// sau đó lấy chi tiết lead qua Graph API bằng FB_PAGE_ACCESS_TOKEN.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type FieldData = { name: string; values: string[] };

function pick(fields: FieldData[], ...keys: string[]) {
  for (const k of keys) {
    const f = fields.find((x) => x.name.toLowerCase() === k);
    if (f?.values?.[0]) return f.values[0];
  }
  return null;
}

export const Route = createFileRoute("/api/public/integrations/facebook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token") ?? "";
        const challenge = url.searchParams.get("hub.challenge") ?? "";
        if (mode !== "subscribe" || token.length < 12) return new Response("Forbidden", { status: 403 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("settings")
          .select("tenant_id")
          .eq("key", "integrations")
          .eq("value->facebook->>verifyToken", token)
          .limit(1);
        if (!data?.length) return new Response("Forbidden", { status: 403 });
        return new Response(challenge.slice(0, 200), { status: 200 });
      },
      POST: async ({ request }) => {
        const raw = await request.text();
        const secret = process.env["FB_APP_SECRET"];
        const pageToken = process.env["FB_PAGE_ACCESS_TOKEN"];
        if (!secret || !pageToken) return json({ ok: true, skipped: "facebook_not_connected" });

        const sig = request.headers.get("x-hub-signature-256") ?? "";
        const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ error: "invalid signature" }, 401);

        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return json({ error: "bad json" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { ingestInboundLead } = await import("@/lib/inbound-leads.server");
        const { parseIntegrationSettings } = await import("@/lib/integrations");

        const changes: any[] = (payload?.entry ?? []).flatMap((e: any) =>
          (e?.changes ?? []).filter((c: any) => c?.field === "leadgen").map((c: any) => ({ ...c.value, page_id: c.value?.page_id ?? e.id })),
        );
        let processed = 0;

        // Bình luận Fanpage (field "feed", item "comment")
        const comments: any[] = (payload?.entry ?? []).flatMap((e: any) =>
          (e?.changes ?? [])
            .filter((c: any) => c?.field === "feed" && c?.value?.item === "comment" && c?.value?.verb === "add")
            .map((c: any) => ({ ...c.value, page_id: String(e.id ?? "") })),
        );
        if (comments.length) {
          const { handleFbComment } = await import("@/lib/social.server");
          let origin: string | null = null;
          try { origin = new URL(request.url).origin; } catch { origin = null; }
          for (const cm of comments.slice(0, 20)) {
            const pageId = String(cm.page_id ?? "");
            const commentId = String(cm.comment_id ?? "");
            if (!/^\d+$/.test(pageId) || !/^[\d_]+$/.test(commentId)) continue;
            const { data: rows } = await supabaseAdmin.from("settings").select("tenant_id")
              .eq("key", "integrations").eq("value->facebook->>pageId", pageId).limit(1);
            if (!rows?.[0]) continue;
            await handleFbComment({
              tenantId: rows[0].tenant_id as string, pageId,
              postId: cm.post_id ? String(cm.post_id).slice(0, 80) : null, commentId,
              authorId: cm.from?.id ? String(cm.from.id) : null,
              authorName: cm.from?.name ? String(cm.from.name).slice(0, 120) : null,
              message: String(cm.message ?? "").slice(0, 2000), origin,
            }).catch((e) => console.error("fb comment", e));
            processed += 1;
          }
        }

        for (const ch of changes.slice(0, 20)) {
          const pageId = String(ch.page_id ?? "");
          const leadgenId = String(ch.leadgen_id ?? "");
          if (!pageId || !/^\d+$/.test(leadgenId)) continue;

          const { data: rows } = await supabaseAdmin
            .from("settings")
            .select("tenant_id,value")
            .eq("key", "integrations")
            .eq("value->facebook->>pageId", pageId)
            .limit(1);
          const row = rows?.[0];
          const cfg = row ? parseIntegrationSettings(row.value) : null;
          if (!row || !cfg?.facebook.enabled) continue;

          const res = await fetch(
            `https://graph.facebook.com/v21.0/${leadgenId}?fields=field_data,form_id,ad_name,campaign_name,created_time&access_token=${encodeURIComponent(pageToken)}`,
          );
          if (!res.ok) {
            console.error(`Facebook lead fetch failed [${res.status}]: ${await res.text()}`);
            continue;
          }
          const lead = (await res.json()) as { field_data?: FieldData[]; form_id?: string; ad_name?: string; campaign_name?: string };
          const fields = lead.field_data ?? [];
          const formId = String(lead.form_id ?? ch.form_id ?? "");
          await ingestInboundLead({
            tenantId: row.tenant_id as string,
            source: "facebook_lead_ads",
            sourceLabel: "Facebook Lead Ads",
            name: pick(fields, "full_name", "họ_và_tên", "name"),
            phone: pick(fields, "phone_number", "số_điện_thoại", "phone"),
            email: pick(fields, "email"),
            productCode: pick(fields, "product_code", "mã_căn", "ma_can"),
            budget: pick(fields, "budget", "ngân_sách"),
            note: [lead.campaign_name, lead.ad_name].filter(Boolean).join(" · ") || null,
            projectId: cfg.facebook.formProjects[formId] ?? null,
            externalId: leadgenId,
            meta: { fb_form_id: formId, fb_page_id: pageId },
          });
          processed += 1;
        }
        return json({ ok: true, processed });
      },
    },
  },
});
