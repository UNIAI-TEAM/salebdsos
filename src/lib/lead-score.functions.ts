// AI Lead Score — rule-based scoring + AI explanation.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SCORE_BANDS = ["cold", "warm", "hot", "very_hot"] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export const SCORE_LABEL: Record<ScoreBand, string> = {
  cold: "Lạnh",
  warm: "Ấm",
  hot: "Nóng",
  very_hot: "Rất nóng",
};

export function bandFromScore(score: number): ScoreBand {
  if (score >= 80) return "very_hot";
  if (score >= 60) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

export type ScoreFactor = {
  key: string;
  label: string;
  points: number;
  detail?: string;
};

export type ScoreBreakdown = {
  score: number;
  band: ScoreBand;
  factors: ScoreFactor[];
  next_action: string;
  computed_at: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Rule engine
// ──────────────────────────────────────────────────────────────────────────────

type LeadRow = {
  id: string;
  tenant_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  project_id: string | null;
  budget: string | null;
  need_type: string | null;
  timeline: string | null;
  tags: string[] | null;
  card_id: string | null;
  meta: Record<string, any> | null;
  created_at: string;
};

type Project = { id: string; price_from: number | null; price_to: number | null; property_type: string | null } | null;

// Parse "2-3 tỷ", "1.5 tỷ", "500-800 triệu", etc → [min, max] in VND
function parseBudgetVND(s: string | null): [number, number] | null {
  if (!s) return null;
  const txt = s.toLowerCase().replace(/,/g, ".");
  const ty = txt.includes("tỷ") || txt.includes("ty");
  const mul = ty ? 1_000_000_000 : txt.includes("triệu") || txt.includes("trieu") ? 1_000_000 : 0;
  if (!mul) return null;
  const nums = (txt.match(/\d+(\.\d+)?/g) || []).map((n) => parseFloat(n) * mul);
  if (nums.length === 0) return null;
  if (nums.length === 1) return [nums[0] * 0.9, nums[0] * 1.1];
  return [Math.min(...nums), Math.max(...nums)];
}

function timelineWeight(t: string | null): { points: number; detail: string } {
  if (!t) return { points: 0, detail: "" };
  const x = t.toLowerCase();
  if (/(ngay|now|immediate|trong tuần|sắp|asap)/.test(x)) return { points: 15, detail: "Mua ngay" };
  if (/(1-3|1 ?tháng|2 ?tháng|3 ?tháng|<3)/.test(x)) return { points: 10, detail: "1-3 tháng" };
  if (/(3-6|6 ?tháng)/.test(x)) return { points: 6, detail: "3-6 tháng" };
  if (/(năm|year|>6|trên 6)/.test(x)) return { points: 2, detail: "Dài hạn" };
  return { points: 3, detail: t };
}

const STATUS_POINTS: Record<string, number> = {
  new: 0, contacted: 5, consulting: 12, quoted: 20, deposit: 30, won: 35, lost: -10,
};

function buildFactors(lead: LeadRow, project: Project, events: { source: string; count: number }[]): ScoreFactor[] {
  const factors: ScoreFactor[] = [];

  // Contact completeness
  if (lead.phone) factors.push({ key: "has_phone", label: "Có số điện thoại", points: 8 });
  if (lead.email) factors.push({ key: "has_email", label: "Có email", points: 4 });

  // Source quality
  if (lead.source) {
    const s = lead.source.toLowerCase();
    const srcPts = /nfc/.test(s) ? 10 : /qr/.test(s) ? 8 : /(zalo|facebook|social)/.test(s) ? 6 : /(referral|giới thiệu)/.test(s) ? 8 : 4;
    factors.push({ key: "source", label: `Nguồn: ${lead.source}`, points: srcPts });
  }

  // Need type
  if (lead.need_type) {
    const map: Record<string, number> = { buy: 12, invest: 10, rent: 5 };
    const lbl: Record<string, string> = { buy: "Mua để ở", invest: "Đầu tư", rent: "Thuê" };
    factors.push({ key: "need", label: `Nhu cầu: ${lbl[lead.need_type] || lead.need_type}`, points: map[lead.need_type] || 4 });
  }

  // Timeline
  const tl = timelineWeight(lead.timeline);
  if (tl.points) factors.push({ key: "timeline", label: `Thời gian: ${tl.detail}`, points: tl.points });

  // Budget + match with project price range
  const budget = parseBudgetVND(lead.budget);
  if (budget) {
    factors.push({ key: "has_budget", label: "Đã khai báo ngân sách", points: 6 });
    if (project && project.price_from && project.price_to) {
      const overlap = Math.min(budget[1], project.price_to) >= Math.max(budget[0], project.price_from);
      if (overlap) {
        factors.push({ key: "budget_match", label: "Ngân sách khớp dự án", points: 15, detail: "Khoảng giá phù hợp" });
      } else {
        factors.push({ key: "budget_mismatch", label: "Ngân sách lệch dự án", points: -5 });
      }
    }
  }

  // Project match (interest declared)
  if (lead.project_id) factors.push({ key: "project_match", label: "Quan tâm dự án cụ thể", points: 10 });

  // Status progression
  const sp = STATUS_POINTS[lead.status] ?? 0;
  if (sp !== 0) factors.push({ key: "status", label: `Trạng thái: ${lead.status}`, points: sp });

  // Tags
  const tags = (lead.tags || []).map((t) => t.toLowerCase());
  if (tags.some((t) => /vip|hot|quan trọng/.test(t))) {
    factors.push({ key: "tag_vip", label: "Tag VIP/Hot", points: 8 });
  }

  // Behavioral signals from interaction_events on the same card
  const evtMap: Record<string, number> = {};
  for (const e of events) evtMap[e.source.toLowerCase()] = e.count;

  const nfcN = (evtMap["nfc"] || 0);
  const qrN = (evtMap["qr"] || 0);
  const linkN = (evtMap["link"] || evtMap["direct"] || 0);
  const socN = (evtMap["social"] || 0);
  const totalEvents = nfcN + qrN + linkN + socN;

  if (nfcN > 0) factors.push({ key: "ev_nfc", label: `${nfcN}× chạm NFC`, points: Math.min(nfcN * 4, 12) });
  if (qrN > 0) factors.push({ key: "ev_qr", label: `${qrN}× quét QR`, points: Math.min(qrN * 3, 9) });
  if (linkN > 0) factors.push({ key: "ev_link", label: `${linkN}× mở link`, points: Math.min(linkN * 2, 6) });
  if (socN > 0) factors.push({ key: "ev_social", label: `${socN}× từ social`, points: Math.min(socN * 2, 6) });

  // Revisit signal
  if (totalEvents >= 5) factors.push({ key: "revisit", label: "Quay lại nhiều lần", points: 8 });

  // Engagement signals from lead.meta (tracking system can populate these)
  const meta = lead.meta || {};
  if (meta.viewed_card) factors.push({ key: "viewed_card", label: "Đã xem card", points: 3 });
  if (meta.viewed_project) factors.push({ key: "viewed_project", label: "Đã xem dự án", points: 5 });
  if (meta.downloaded_brochure) factors.push({ key: "brochure", label: "Đã tải brochure", points: 12 });
  if (meta.clicked_call) factors.push({ key: "call", label: "Bấm gọi điện", points: 14 });
  if (meta.clicked_zalo) factors.push({ key: "zalo", label: "Bấm Zalo", points: 12 });
  if (meta.submitted_form) factors.push({ key: "form", label: "Đã gửi form", points: 10 });

  return factors;
}

function nextAction(band: ScoreBand, lead: LeadRow): string {
  if (band === "very_hot") {
    if (lead.status === "new" || lead.status === "contacted") return "Gọi điện trong 1 giờ và đặt lịch xem dự án.";
    return "Chốt cọc trong 48h, gửi hợp đồng đặt cọc.";
  }
  if (band === "hot") {
    if (!lead.phone) return "Xin số điện thoại qua Zalo/email.";
    return "Gọi điện trong 24h, gửi báo giá chi tiết và chính sách bán hàng.";
  }
  if (band === "warm") {
    return "Gửi brochure và lịch xem nhà mẫu trong tuần. Nuôi dưỡng qua Zalo.";
  }
  return "Đưa vào chiến dịch nuôi dưỡng email/Zalo, theo dõi tương tác mới.";
}

// ──────────────────────────────────────────────────────────────────────────────
// Server functions
// ──────────────────────────────────────────────────────────────────────────────

export const getLeadScore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leadId: string }) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lead, error } = await supabase
      .from("leads")
      .select("id,tenant_id,full_name,email,phone,source,status,project_id,budget,need_type,timeline,tags,card_id,meta,created_at")
      .eq("id", data.leadId)
      .maybeSingle();
    if (error) throw error;
    if (!lead) throw new Error("Lead not found");

    let project: Project = null;
    if (lead.project_id) {
      const { data: p } = await supabase
        .from("projects")
        .select("id,price_from,price_to,property_type")
        .eq("id", lead.project_id)
        .maybeSingle();
      project = p as Project;
    }

    const events: { source: string; count: number }[] = [];
    if (lead.card_id) {
      const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data: rows } = await supabase
        .from("interaction_events")
        .select("source")
        .eq("card_id", lead.card_id)
        .gte("occurred_at", since)
        .limit(500);
      const m: Record<string, number> = {};
      for (const r of (rows || []) as { source: string }[]) m[r.source] = (m[r.source] || 0) + 1;
      for (const k in m) events.push({ source: k, count: m[k] });
    }

    const factors = buildFactors(lead as LeadRow, project, events);
    const total = factors.reduce((s, f) => s + f.points, 0);
    const score = Math.max(0, Math.min(100, total));
    const band = bandFromScore(score);

    const breakdown: ScoreBreakdown = {
      score,
      band,
      factors: factors.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
      next_action: nextAction(band, lead as LeadRow),
      computed_at: new Date().toISOString(),
    };

    // Persist
    await supabase.from("ai_lead_scores").insert({
      lead_id: lead.id,
      tenant_id: lead.tenant_id,
      score,
      model: "rule-v1",
      factors: breakdown as any,
    });
    await supabase.from("leads").update({ score }).eq("id", lead.id);

    return breakdown;
  });

export const recomputeTenantScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id,tenant_id,full_name,email,phone,source,status,project_id,budget,need_type,timeline,tags,card_id,meta,created_at")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .limit(1000);
    if (error) throw error;

    // Preload projects
    const projIds = Array.from(new Set((leads || []).map((l) => l.project_id).filter(Boolean) as string[]));
    const projects: Record<string, Project> = {};
    if (projIds.length) {
      const { data: ps } = await supabase
        .from("projects")
        .select("id,price_from,price_to,property_type")
        .in("id", projIds);
      for (const p of (ps || []) as any[]) projects[p.id] = p;
    }

    const cardIds = Array.from(new Set((leads || []).map((l) => l.card_id).filter(Boolean) as string[]));
    const evtByCard: Record<string, { source: string; count: number }[]> = {};
    if (cardIds.length) {
      const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data: evs } = await supabase
        .from("interaction_events")
        .select("card_id,source")
        .in("card_id", cardIds)
        .gte("occurred_at", since)
        .limit(5000);
      const tmp: Record<string, Record<string, number>> = {};
      for (const e of (evs || []) as { card_id: string; source: string }[]) {
        tmp[e.card_id] ??= {};
        tmp[e.card_id][e.source] = (tmp[e.card_id][e.source] || 0) + 1;
      }
      for (const cid in tmp) evtByCard[cid] = Object.entries(tmp[cid]).map(([source, count]) => ({ source, count }));
    }

    let updated = 0;
    const dist = { cold: 0, warm: 0, hot: 0, very_hot: 0 };
    for (const lead of (leads || []) as LeadRow[]) {
      const project = lead.project_id ? projects[lead.project_id] || null : null;
      const events = lead.card_id ? evtByCard[lead.card_id] || [] : [];
      const factors = buildFactors(lead, project, events);
      const total = factors.reduce((s, f) => s + f.points, 0);
      const score = Math.max(0, Math.min(100, total));
      const band = bandFromScore(score);
      dist[band]++;
      await supabase.from("leads").update({ score }).eq("id", lead.id);
      updated++;
    }
    return { updated, distribution: dist };
  });

export const getScoreDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id,full_name,score,status,project_id,phone,source,updated_at")
      .eq("tenant_id", data.tenantId)
      .is("deleted_at", null)
      .order("score", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw error;

    const dist = { cold: 0, warm: 0, hot: 0, very_hot: 0 };
    for (const l of leads || []) {
      const s = l.score ?? 0;
      dist[bandFromScore(s)]++;
    }
    const projIds = Array.from(new Set((leads || []).map((l) => l.project_id).filter(Boolean) as string[]));
    const projMap: Record<string, string> = {};
    if (projIds.length) {
      const { data: ps } = await supabase.from("projects").select("id,name").in("id", projIds);
      for (const p of (ps || []) as { id: string; name: string }[]) projMap[p.id] = p.name;
    }
    const top = (leads || []).slice(0, 12).map((l) => ({
      id: l.id, name: l.full_name, score: l.score ?? 0, project: l.project_id ? projMap[l.project_id] || "" : "",
      status: l.status, phone: l.phone, source: l.source,
    }));
    return { distribution: dist, total: leads?.length || 0, top };
  });

export const explainLeadScoreAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { leadId: string }) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    void userId;
    const { data: lead } = await supabase
      .from("leads")
      .select("id,tenant_id,full_name,score,status,need_type,budget,timeline,source")
      .eq("id", data.leadId)
      .maybeSingle();
    if (!lead) throw new Error("Lead not found");

    const { data: latest } = await supabase
      .from("ai_lead_scores")
      .select("factors")
      .eq("lead_id", data.leadId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const factors = (latest?.factors as any)?.factors || [];
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { text: "AI Gateway chưa được cấu hình.", model: null as string | null };

    const prompt = `Bạn là chuyên viên tư vấn bất động sản. Giải thích ngắn gọn (3-4 câu, tiếng Việt) lý do lead "${lead.full_name}" có điểm ${lead.score}/100 và đề xuất 1 hành động ưu tiên.
Thông tin: nguồn=${lead.source || "?"}, nhu cầu=${lead.need_type || "?"}, ngân sách=${lead.budget || "?"}, thời gian=${lead.timeline || "?"}, trạng thái=${lead.status}.
Các yếu tố chấm điểm: ${factors.slice(0, 8).map((f: any) => `${f.label}(${f.points >= 0 ? "+" : ""}${f.points})`).join(", ")}.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("AI gateway error", res.status, t);
      return { text: "Không thể tạo giải thích AI lúc này.", model: null };
    }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || "Không có phản hồi.";
    return { text, model: "google/gemini-2.5-flash" };
  });
