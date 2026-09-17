// Gửi mã QR dự án cho khách hàng qua email: ghi nhận điểm chạm + soạn nội dung email.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Danh sách khách hàng có email để sale chọn nhanh khi gửi QR. */
export const listCustomerEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        search: z.string().trim().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("customers")
      .select("id,full_name,email")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .not("email", "is", null)
      .neq("email", "")
      .order("created_at", { ascending: false })
      .limit(20);

    const s = (data.search ?? "").trim();
    if (s) {
      const like = `%${s.replace(/[%_]/g, (m) => "\\" + m)}%`;
      q = q.or(`full_name.ilike.${like},email.ilike.${like}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).filter((r) => !!r.email);
  });

/**
 * Ghi nhận việc sale gửi QR dự án cho một email khách hàng và trả về nội dung email
 * đã soạn sẵn để mở trình gửi mail của sale.
 */
export const sendProjectQrToEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        qrId: z.string().uuid(),
        email: z.string().trim().email().max(254),
        customerName: z.string().trim().max(120).optional(),
        note: z.string().trim().max(1000).optional(),
        origin: z.string().trim().url().max(300),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: qr, error } = await context.supabase
      .from("project_qr_codes")
      .select("id,code,channel,label,project_id,tenant_id,is_active")
      .eq("id", data.qrId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!qr) throw new Error("Không tìm thấy mã QR.");
    if (!qr.is_active) throw new Error("Mã QR đang tắt, hãy bật lại trước khi gửi.");

    const { data: project } = await context.supabase
      .from("projects")
      .select("name,location,city,developer")
      .eq("id", qr.project_id)
      .maybeSingle();

    const url = `${data.origin.replace(/\/$/, "")}/api/public/pq/${qr.code}`;
    const projectName = project?.name ?? "Dự án";
    const place = project?.location ?? project?.city ?? null;

    const { error: tErr } = await context.supabase.from("project_touchpoints").insert({
      tenant_id: qr.tenant_id,
      project_id: qr.project_id,
      qr_code_id: qr.id,
      session_id: `qr-send:${Date.now()}`,
      event_type: "qr_sent",
      channel: qr.channel,
      meta: { email: data.email, customer_name: data.customerName ?? null, code: qr.code },
    });
    if (tErr) console.error("[qr-send] touch", tErr.message);

    const subject = `Thông tin dự án ${projectName}`;
    const greeting = data.customerName ? `Chào ${data.customerName},` : "Chào anh/chị,";
    const body = [
      greeting,
      "",
      data.note?.trim()
        ? data.note.trim()
        : `Em xin gửi thông tin dự án ${projectName}${place ? ` tại ${place}` : ""}${project?.developer ? ` (CĐT ${project.developer})` : ""}.`,
      "",
      "Anh/chị quét mã QR hoặc mở link dưới đây để xem chi tiết dự án, bảng giá và liên hệ trực tiếp với em:",
      url,
      "",
      "Em luôn sẵn sàng tư vấn thêm khi anh/chị cần.",
    ].join("\n");

    return { ok: true as const, url, subject, body, email: data.email };
  });
