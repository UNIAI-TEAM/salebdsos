import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const PROMPT = `Create a premium professional business portrait for a real-estate sales digital card from the supplied photograph. Preserve the person's identity, facial structure, age, skin tone, hairstyle, and recognizable features accurately. Use a tailored dark charcoal business suit, clean white shirt, confident approachable expression, upright posture, subtle studio key light and rim light, and a refined neutral charcoal background. Head-and-shoulders composition, centered, direct eye contact, realistic photography, natural skin texture, polished executive presence, high-end corporate editorial quality. No text, logos, badges, jewelry changes, beauty-filter look, exaggerated retouching, extra people, or altered identity.`;

function text(message: string, status: number) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export const Route = createFileRoute("/api/card-portrait")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) return text("Phiên đăng nhập không hợp lệ.", 401);

        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const aiKey = process.env["LOVABLE_API_KEY"];
        if (!url || !key) return text("Dịch vụ tài khoản chưa được cấu hình.", 500);
        if (!aiKey) return text("Tính năng tạo ảnh AI chưa được cấu hình.", 500);

        const token = auth.slice(7);
        const client = createClient<Database>(url, key, {
          global: { headers: { Authorization: auth } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsError } = await client.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return text("Phiên đăng nhập đã hết hạn.", 401);

        let input: { cardId?: string; imageUrl?: string; stream?: boolean };
        try {
          input = await request.json() as typeof input;
        } catch {
          return text("Dữ liệu ảnh không hợp lệ.", 400);
        }
        if (!input.cardId || !input.imageUrl) return text("Vui lòng tải ảnh đại diện trước.", 400);
        let imageUrl: URL;
        try {
          imageUrl = new URL(input.imageUrl);
          const storageHost = new URL(url).host;
          if (imageUrl.protocol !== "https:" || imageUrl.host !== storageHost || !imageUrl.pathname.includes("/storage/v1/object/public/card-assets/")) {
            return text("Ảnh nguồn phải được tải lên thư viện danh thiếp.", 400);
          }
        } catch {
          return text("Đường dẫn ảnh nguồn không hợp lệ.", 400);
        }

        const { data: card } = await client
          .from("cards")
          .select("id")
          .eq("id", input.cardId)
          .eq("owner_user_id", userId)
          .is("deleted_at", null)
          .maybeSingle();
        if (!card) return text("Bạn không có quyền tạo ảnh cho danh thiếp này.", 403);

        let source: Response;
        try {
          source = await fetch(imageUrl);
        } catch {
          return text("Không tải được ảnh nguồn.", 400);
        }
        if (!source.ok) return text("Không tải được ảnh nguồn.", 400);
        const contentType = source.headers.get("content-type") || "image/jpeg";
        if (!contentType.startsWith("image/")) return text("Tệp nguồn không phải hình ảnh.", 400);
        const bytes = await source.arrayBuffer();
        if (bytes.byteLength > 8 * 1024 * 1024) return text("Ảnh nguồn tối đa 8MB.", 400);

        const streaming = input.stream !== false;
        const form = new FormData();
        form.set("model", "openai/gpt-image-2.5-sunburst");
        form.set("prompt", PROMPT);
        form.set("image", new Blob([bytes], { type: contentType }), "portrait-source.jpg");
        form.set("size", "1024x1024");
        form.set("quality", "medium");
        if (streaming) {
          form.set("stream", "true");
          form.set("partial_images", "1");
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${aiKey}` },
          body: form,
        });
        if (!upstream.ok || !upstream.body) {
          const message = await upstream.text().catch(() => "Không thể tạo ảnh.");
          return text(message || "Không thể tạo ảnh.", upstream.status);
        }
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": streaming ? "text/event-stream" : "application/json",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});