// AI Follow-up message generator. Authenticated, tenant-scoped.
// Generates a suggested follow-up message via Lovable AI Gateway.
// Does NOT send anything — sales user copies/sends manually.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Scenario =
  | "new_lead"
  | "viewed_project"
  | "downloaded_brochure"
  | "booked_consultation"
  | "high_score";

type Channel = "email" | "zalo" | "sms";

const SCENARIO_LABEL: Record<Scenario, string> = {
  new_lead: "khách hàng mới đăng ký",
  viewed_project: "đã xem dự án",
  downloaded_brochure: "đã tải brochure",
  booked_consultation: "đã đặt lịch tư vấn",
  high_score: "lead có điểm AI cao, tiềm năng lớn",
};

const CHANNEL_GUIDE: Record<Channel, string> = {
  email: "Email — có tiêu đề (subject) ngắn gọn, lời chào trang trọng, 3-5 đoạn, kết bằng chữ ký gợi ý 'Đội ngũ tư vấn'. Không vượt quá 180 từ.",
  zalo: "Tin nhắn Zalo — văn phong thân thiện, gần gũi, có emoji nhẹ (1-2 cái), 2-4 câu, không quá 60 từ. Không có subject.",
  sms: "SMS — cực ngắn, dưới 160 ký tự, không emoji, kèm số điện thoại để khách gọi lại. Không có subject.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_PUBLISHABLE_KEY =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI chưa được cấu hình" }, 500);

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });

    const { data: claims } = await supabase.auth.getClaims(auth.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const tenantId: string = body.tenantId;
    const leadId: string = body.leadId;
    const scenario: Scenario = body.scenario ?? "new_lead";
    const channel: Channel = body.channel ?? "zalo";
    const tone: string = body.tone ?? "Chuyên nghiệp, ấm áp";
    const extraNote: string = (body.extraNote ?? "").toString().slice(0, 500);
    const persist: boolean = body.persist !== false;

    if (!tenantId || !leadId) return json({ error: "Thiếu tenantId/leadId" }, 400);

    // Fetch lead + project context (RLS enforces tenant access)
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select(
        "id, tenant_id, full_name, email, phone, source, status, budget, need_type, timeline, notes, tags, score, project_id, owner_user_id",
      )
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (leadErr) return json({ error: leadErr.message }, 400);
    if (!lead) return json({ error: "Lead không tồn tại" }, 404);

    let projectName: string | null = null;
    let projectInfo: string | null = null;
    if (lead.project_id) {
      const { data: p } = await supabase
        .from("projects")
        .select("name, developer, location, price_from, price_to, currency, property_type, status")
        .eq("id", lead.project_id)
        .maybeSingle();
      if (p) {
        projectName = p.name;
        projectInfo = `Dự án: ${p.name}${p.developer ? ` (CĐT ${p.developer})` : ""}${
          p.location ? `, ${p.location}` : ""
        }${
          p.price_from
            ? `, giá từ ${Number(p.price_from).toLocaleString("vi-VN")} ${p.currency ?? "VND"}`
            : ""
        }`;
      }
    }

    // Build prompt
    const needTypeLabel =
      lead.need_type === "buy" ? "mua" : lead.need_type === "rent" ? "thuê" : lead.need_type === "invest" ? "đầu tư" : "";

    const leadFacts = [
      `Tên: ${lead.full_name ?? "khách hàng"}`,
      lead.phone ? `SĐT: ${lead.phone}` : "",
      lead.email ? `Email: ${lead.email}` : "",
      needTypeLabel ? `Nhu cầu: ${needTypeLabel}` : "",
      lead.budget ? `Ngân sách: ${lead.budget}` : "",
      lead.timeline ? `Thời gian: ${lead.timeline}` : "",
      lead.score ? `AI Score: ${lead.score}/100` : "",
      lead.tags?.length ? `Tags: ${lead.tags.join(", ")}` : "",
      projectInfo ?? "",
      lead.notes ? `Ghi chú: ${lead.notes.slice(0, 300)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `Bạn là trợ lý AI viết tin nhắn follow-up cho sales bất động sản tại Việt Nam.
Luôn viết bằng tiếng Việt tự nhiên, không cứng nhắc. Không bịa thông tin về dự án.
Tuyệt đối KHÔNG dùng placeholder kiểu [Tên], [Dự án] — phải điền sẵn từ dữ liệu được cung cấp.
Luôn trả về JSON đúng schema, không thêm văn bản ngoài JSON.`;

    const userPrompt = `Tình huống: ${SCENARIO_LABEL[scenario]}.
Kênh: ${CHANNEL_GUIDE[channel]}
Tông giọng: ${tone}.

THÔNG TIN LEAD:
${leadFacts}

${extraNote ? `Yêu cầu thêm từ sales: ${extraNote}\n` : ""}
Hãy soạn 1 tin nhắn follow-up phù hợp. Mục tiêu: kéo khách phản hồi, hẹn xem nhà / nhận bảng giá / tư vấn 1-1.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "draft_followup",
          description: "Trả về tin nhắn follow-up đã soạn",
          parameters: {
            type: "object",
            properties: {
              subject: { type: "string", description: "Tiêu đề (chỉ cho email, để rỗng nếu zalo/sms)" },
              message: { type: "string", description: "Nội dung tin nhắn hoàn chỉnh, đã thay sẵn tên/số liệu" },
            },
            required: ["subject", "message"],
            additionalProperties: false,
          },
        },
      },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "draft_followup" } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Vượt giới hạn AI, thử lại sau." }, 429);
    if (aiRes.status === 402) return json({ error: "Hết tín dụng AI, vui lòng nạp thêm." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return json({ error: "Lỗi AI gateway" }, 500);
    }

    const aiJson = await aiRes.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: { subject: string; message: string } = { subject: "", message: "" };
    try {
      parsed = JSON.parse(call ?? "{}");
    } catch {
      const fallback = aiJson.choices?.[0]?.message?.content ?? "";
      parsed = { subject: "", message: String(fallback) };
    }
    if (!parsed.message) return json({ error: "AI không trả về nội dung" }, 500);

    let saved: any = null;
    if (persist) {
      const { data: ins, error: insErr } = await supabase
        .from("ai_followups")
        .insert({
          tenant_id: tenantId,
          lead_id: leadId,
          owner_user_id: lead.owner_user_id ?? userId,
          project_id: lead.project_id ?? null,
          scenario,
          channel,
          subject: channel === "email" ? parsed.subject || null : null,
          output: parsed.message,
          prompt: userPrompt,
          model: "google/gemini-3-flash-preview",
          status: "suggested",
        })
        .select(
          "id, tenant_id, lead_id, owner_user_id, project_id, scenario, channel, subject, output, status, created_at",
        )
        .single();
      if (insErr) {
        console.error("insert ai_followup error", insErr);
        return json({ error: insErr.message }, 400);
      }
      saved = ins;
    }

    return json({
      ok: true,
      followup: saved,
      preview: {
        subject: parsed.subject,
        message: parsed.message,
        scenario,
        channel,
        leadName: lead.full_name,
        projectName,
      },
    });
  } catch (e) {
    console.error("ai-followup-generate error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
