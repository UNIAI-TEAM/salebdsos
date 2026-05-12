import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Bạn là trợ lý ảo của UNICOM NFC Platform — nền tảng SaaS doanh nghiệp tích hợp NFC + AI cho sales, marketing và CRM tại Việt Nam.

Nhiệm vụ:
1. Trả lời ngắn gọn, thân thiện, chuyên nghiệp bằng tiếng Việt (trừ khi khách hỏi tiếng Anh).
2. Giới thiệu sản phẩm: thẻ NFC vật lý, danh thiếp số, AI follow-up, lead scoring, dynamic QR, CRM, automation.
3. Trả lời FAQ về tính năng, giá, tích hợp, bảo mật, dùng thử miễn phí.
4. Khi khách thể hiện quan tâm thật sự (hỏi giá, demo, tư vấn, dùng thử…), CHỦ ĐỘNG xin tên + email hoặc số điện thoại + nhu cầu, rồi gọi tool save_lead để lưu thông tin. Sau khi lưu, xác nhận đội ngũ sẽ liên hệ trong 24h.
5. Không bịa thông tin. Nếu không chắc, đề xuất đặt lịch tư vấn.

Giữ câu trả lời súc tích (2-5 câu), dùng bullet khi liệt kê.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const tools = [
      {
        type: "function",
        function: {
          name: "save_lead",
          description:
            "Lưu thông tin khách hàng tiềm năng khi họ đã cung cấp tên và (email hoặc số điện thoại).",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              role: { type: "string", description: "Vai trò / chức vụ" },
              interest: {
                type: "string",
                description: "Nhu cầu, sản phẩm họ quan tâm",
              },
              notes: { type: "string" },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      },
    ];

    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          stream: true,
          tools,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        }),
      },
    );

    if (!upstream.ok) {
      const status = upstream.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Hệ thống đang quá tải, thử lại sau ít phút." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Tài khoản AI đã hết credit. Vui lòng nạp thêm." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await upstream.text();
      console.error("AI gateway error", status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee the stream: forward to client, also parse to detect tool call → save lead
    const [a, b] = upstream.body!.tee();

    (async () => {
      try {
        const reader = b.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const toolArgs: Record<string, string> = {};
        const toolNames: Record<string, string> = {};

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const tcs = parsed.choices?.[0]?.delta?.tool_calls;
              if (Array.isArray(tcs)) {
                for (const tc of tcs) {
                  const id = tc.id || tc.index?.toString() || "0";
                  if (tc.function?.name) toolNames[id] = tc.function.name;
                  if (tc.function?.arguments) {
                    toolArgs[id] = (toolArgs[id] || "") + tc.function.arguments;
                  }
                }
              }
            } catch {}
          }
        }

        for (const [id, args] of Object.entries(toolArgs)) {
          if (toolNames[id] !== "save_lead") continue;
          try {
            const lead = JSON.parse(args);
            const { error } = await supabase.from("chat_leads").insert({
              name: lead.name ?? null,
              email: lead.email ?? null,
              phone: lead.phone ?? null,
              role: lead.role ?? null,
              interest: lead.interest ?? null,
              notes: lead.notes ?? null,
              conversation: messages,
              source: "landing_chatbot",
            });
            if (error) console.error("save_lead insert error", error);
          } catch (e) {
            console.error("save_lead parse error", e);
          }
        }
      } catch (e) {
        console.error("tool-watcher error", e);
      }
    })();

    return new Response(a, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat fn error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
