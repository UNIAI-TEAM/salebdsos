// Manifest riêng cho từng landing: mở từ icon trên màn hình chính, vào thẳng /p/<slug>
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/landing-manifest/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { data: page } = await supabaseAdmin
          .from("ai_sales_pages")
          .select("id,slug,title,output")
          .eq("slug", params.slug)
          .eq("is_published", true)
          .is("deleted_at", null)
          .maybeSingle();

        if (!page) {
          return new Response(JSON.stringify({ error: "not_found" }), {
            status: 404,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }

        const out = (page.output ?? {}) as Record<string, unknown>;
        const name = (page.title || "Landing").slice(0, 60);
        const description =
          (typeof out["subheadline"] === "string" ? (out["subheadline"] as string) : "") ||
          "Thông tin dự án và ưu đãi dành riêng cho bạn.";

        const manifest = {
          id: `/p/${page.slug}`,
          name,
          short_name: name.slice(0, 12),
          description: description.slice(0, 200),
          lang: "vi",
          dir: "ltr",
          categories: ["business", "productivity"],
          start_url: `/p/${page.slug}?src=pwa`,
          scope: `/p/${page.slug}`,
          display: "standalone",
          display_override: ["standalone", "minimal-ui", "browser"],
          orientation: "portrait-primary",
          background_color: "#0B0F1A",
          theme_color: "#0B0F1A",
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
          ],
          shortcuts: [
            { name: "Xem landing", short_name: "Landing", url: `/p/${page.slug}` },
          ],
        };

        return new Response(JSON.stringify(manifest), {
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
