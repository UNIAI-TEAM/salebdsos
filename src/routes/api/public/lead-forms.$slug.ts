// Public lead form submission: POST /api/public/lead-forms/<slug>
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assignLeadOwner } from "@/lib/lead-routing.server";

const IP_SALT = process.env.IP_HASH_SALT || "unicom-nfc";
const hashIp = (ip: string | null) =>
  ip ? createHash("sha256").update(ip + IP_SALT).digest("hex").slice(0, 32) : null;

const getIp = (r: Request) =>
  r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  r.headers.get("cf-connecting-ip") ||
  r.headers.get("x-real-ip") ||
  null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const str = (v: unknown, max = 500) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export const Route = createFileRoute("/api/public/lead-forms/$slug")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Dữ liệu không hợp lệ." }, 400);
        }

        const { data: form } = await supabaseAdmin
          .from("lead_forms")
          .select("id,tenant_id,project_id,fields,submit_count,is_active,deleted_at,success_message,redirect_url")
          .eq("slug", params.slug)
          .maybeSingle();
        if (!form || !form.is_active || form.deleted_at)
          return json({ error: "Form không tồn tại hoặc đã đóng." }, 404);

        const fields = (Array.isArray(form.fields) ? form.fields : []) as Array<{
          key: string;
          label: string;
          required?: boolean;
        }>;

        // Whitelist + validate against the form's own schema.
        const payload: Record<string, string | null> = {};
        for (const f of fields) {
          const v = str(body[f.key], f.key === "notes" ? 2000 : 300);
          if (f.required && !v) return json({ error: `Vui lòng nhập "${f.label}".` }, 400);
          payload[f.key] = v;
        }

        const email = payload["email"];
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          return json({ error: "Email không hợp lệ." }, 400);

        const assignment = await assignLeadOwner({
          tenantId: form.tenant_id,
          projectId: form.project_id,
        });

        const { data: lead, error: leadErr } = await supabaseAdmin
          .from("leads")
          .insert({
            tenant_id: form.tenant_id,
            project_id: form.project_id,
            owner_user_id: assignment.ownerUserId,
            full_name: payload["full_name"],
            phone: payload["phone"],
            email: email,
            need_type: payload["need_type"],
            budget: payload["budget"],
            timeline: payload["timeline"],
            notes: payload["notes"],
            source: "Landing Page",
            status: "new",
            meta: {
              lead_form_id: form.id,
              lead_form_slug: params.slug,
              auto_assigned: assignment.autoAssigned,
              sla_minutes: assignment.slaMinutes,
              sla_due_at: assignment.slaDueAt,
            },
          })
          .select("id")
          .single();
        if (leadErr) {
          console.error("[lead-form] lead insert", leadErr.message);
          return json({ error: "Không gửi được, vui lòng thử lại." }, 500);
        }

        // Thông báo: gửi riêng cho Sale được phân phối, nếu không có thì cả workspace
        const { error: nErr } = await supabaseAdmin.from("notifications").insert({
          tenant_id: form.tenant_id,
          user_id: assignment.ownerUserId,
          type: "lead_new",
          title: assignment.slaDueAt
            ? `Khách mới từ landing — gọi trong ${assignment.slaMinutes} phút`
            : "Khách mới từ landing",
          body: [payload["full_name"], payload["phone"]].filter(Boolean).join(" · ") || "Có khách để lại thông tin",
          link: `/leads?lead=${lead.id}`,
          lead_id: lead.id,
        });
        if (nErr) console.error("[lead-form] notification", nErr.message);

        const { error: subErr } = await supabaseAdmin.from("lead_submissions").insert({
          tenant_id: form.tenant_id,
          form_id: form.id,
          payload,
          created_lead_id: lead.id,
          ip_hash: hashIp(getIp(request)),
          user_agent: (request.headers.get("user-agent") || "").slice(0, 500),
          referrer: request.headers.get("referer"),
        });
        if (subErr) console.error("[lead-form] submission insert", subErr.message);

        await supabaseAdmin
          .from("lead_forms")
          .update({ submit_count: (form.submit_count || 0) + 1 })
          .eq("id", form.id);

        return json({
          ok: true,
          message: form.success_message || "Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.",
          redirect: form.redirect_url || null,
        });
      },
    },
  },
});
