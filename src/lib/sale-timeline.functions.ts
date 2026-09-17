// Timeline gộp cho chế độ Sale: hoạt động của tôi + lượt xem landing/danh thiếp.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SaleTimelineItem = {
  id: string;
  kind: "activity" | "view" | "lead";
  at: string;
  title: string;
  detail?: string | null;
  meta?: string | null;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
};

const Input = z.object({
  tenantId: z.string().uuid(),
  days: z.number().int().min(1).max(90).default(14),
  limit: z.number().int().min(10).max(200).default(80),
});

const ACTION_LABEL_VI: Record<string, string> = {
  "lead.created": "Tạo lead mới",
  "lead.updated": "Cập nhật lead",
  "lead.deleted": "Xoá lead",
  "customer.created": "Thêm khách hàng",
  "customer.updated": "Cập nhật khách hàng",
  "customer.transaction": "Ghi nhận giao dịch",
  "customer.transaction_deleted": "Xoá giao dịch",
  "customer.note": "Ghi chú khách hàng",
  "customer.appointment": "Đặt lịch gặp",
  "customer.appointment_status": "Cập nhật lịch gặp",
  "appointment.created": "Tạo lịch hẹn",
  "appointment.updated": "Cập nhật lịch hẹn",
  "deal.created": "Tạo cơ hội trong pipeline",
  "deal.updated": "Cập nhật cơ hội",
  "deal.moved": "Chuyển giai đoạn cơ hội",
  "card.created": "Tạo danh thiếp",
  "card.updated": "Cập nhật danh thiếp",
  "sales_page.created": "Tạo landing",
  "sales_page.published": "Đăng landing",
  "sales_page.updated": "Cập nhật landing",
  "airdrop.shared": "Chia sẻ AirDrop",
  "lead_form.submission": "Có người điền form",
};

const SOURCE_LABEL_VI: Record<string, string> = {
  nfc: "Chạm NFC",
  qr: "Quét QR danh thiếp",
  lockscreen: "Quét QR trên màn hình khoá",
  project_click: "Bấm xem dự án đang bán",
  qr_card_lead: "Khách để lại thông tin từ QR",
  qr_card: "Quét QR danh thiếp",
  "QR danh thiếp": "Quét QR danh thiếp",
  link: "Mở qua link",
  social: "Từ mạng xã hội",
  direct: "Truy cập trực tiếp",
};


function labelAction(action: string) {
  return ACTION_LABEL_VI[action] ?? action.replace(/[._]/g, " ");
}

export const getSaleTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sinceIso = new Date(Date.now() - data.days * 86400_000).toISOString();
    const sinceDay = sinceIso.slice(0, 10);

    // Danh thiếp và landing của tôi
    const [{ data: cards }, { data: pages }] = await Promise.all([
      supabase.from("cards").select("id,display_name,slug")
        .eq("tenant_id", data.tenantId).eq("owner_user_id", userId),
      supabase.from("ai_sales_pages").select("id,title,slug")
        .eq("tenant_id", data.tenantId).eq("owner_user_id", userId).is("deleted_at", null),
    ]);
    const cardIds = (cards ?? []).map((c: any) => c.id);
    const cardName = new Map((cards ?? []).map((c: any) => [c.id, c.display_name as string]));
    const pageIds = (pages ?? []).map((p: any) => p.id);
    const pageTitle = new Map((pages ?? []).map((p: any) => [p.id, (p.title as string) || "Landing"]));

    const items: SaleTimelineItem[] = [];

    // 1) Hoạt động của tôi (audit logs)
    const { data: logs } = await supabase
      .from("audit_logs")
      .select("id,action,entity,entity_id,occurred_at,diff")
      .eq("tenant_id", data.tenantId)
      .eq("actor_user_id", userId)
      .gte("occurred_at", sinceIso)
      .order("occurred_at", { ascending: false })
      .limit(data.limit);
    (logs ?? []).forEach((l: any) => {
      const d = l.diff ?? {};
      const detail = d.full_name || d.title || d.name || d.display_name || null;
      items.push({
        id: `log-${l.id}`,
        kind: "activity",
        at: l.occurred_at,
        title: labelAction(l.action),
        detail,
        meta: "Hoạt động của tôi",
      });
    });

    // 2) Lượt xem danh thiếp (interaction_events)
    if (cardIds.length > 0) {
      const { data: events } = await supabase
        .from("interaction_events")
        .select("id,card_id,source,device_type,referrer,country,occurred_at")
        .in("card_id", cardIds)
        .gte("occurred_at", sinceIso)
        .order("occurred_at", { ascending: false })
        .limit(data.limit);
      (events ?? []).forEach((e: any) => {
        items.push({
          id: `ev-${e.id}`,
          kind: "view",
          at: e.occurred_at,
          title: `Có người xem danh thiếp${cardName.get(e.card_id) ? ` ${cardName.get(e.card_id)}` : ""}`,
          detail: SOURCE_LABEL_VI[e.source] ?? e.source,
          meta: [e.device_type, e.country].filter(Boolean).join(" • ") || null,
        });
      });
    }

    // 3) Lượt xem landing công khai (theo ngày)
    if (pageIds.length > 0) {
      const { data: views } = await supabase
        .from("sales_page_views")
        .select("page_id,day,views,conversions")
        .in("page_id", pageIds)
        .gte("day", sinceDay)
        .order("day", { ascending: false });
      (views ?? []).forEach((v: any) => {
        if (!v.views && !v.conversions) return;
        items.push({
          id: `pv-${v.page_id}-${v.day}`,
          kind: "view",
          at: `${v.day}T12:00:00.000Z`,
          title: `Landing ${pageTitle.get(v.page_id) ?? ""}`.trim(),
          detail: `${v.views ?? 0} lượt xem • ${v.conversions ?? 0} khách để lại thông tin`,
          meta: "Landing công khai",
        });
      });
    }

    // 4) Lead từ landing/form của tôi
    const { data: leads } = await supabase
      .from("leads")
      .select("id,full_name,phone,email,source,created_at,card_id")
      .eq("tenant_id", data.tenantId)
      .eq("owner_user_id", userId)
      .is("deleted_at", null)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    (leads ?? []).forEach((l: any) => {
      items.push({
        id: `lead-${l.id}`,
        kind: "lead",
        at: l.created_at,
        title: `Khách mới: ${l.full_name || l.phone || "Chưa có tên"}`,
        detail: l.phone || null,
        meta: SOURCE_LABEL_VI[l.source] ?? l.source ?? null,
        phone: l.phone ?? null,
        email: l.email ?? null,
        name: l.full_name ?? null,
      });
    });

    items.sort((a, b) => b.at.localeCompare(a.at));

    const views = items.filter((i) => i.kind === "view").length;
    const leadCount = items.filter((i) => i.kind === "lead").length;

    return {
      items: items.slice(0, data.limit),
      stats: {
        views,
        leads: leadCount,
        activities: items.filter((i) => i.kind === "activity").length,
        cards: cardIds.length,
        pages: pageIds.length,
      },
      cards: (cards ?? []).map((c: any) => ({ id: c.id, name: c.display_name, slug: c.slug })),
      pages: (pages ?? []).map((p: any) => ({ id: p.id, title: p.title, slug: p.slug })),
    };
  });
