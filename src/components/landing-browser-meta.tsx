// Tối ưu landing công khai cho trình duyệt: gắn manifest riêng của landing,
// favicon/apple-touch-icon và theme color để khách mở link là dùng ngay,
// không cần cài app.
import { useEffect } from "react";

export function LandingBrowserMeta({ slug, title }: { slug: string; title: string }) {
  useEffect(() => {
    if (typeof document === "undefined" || !slug) return;
    const head = document.head;

    // 1 thẻ manifest duy nhất, trỏ đúng landing này
    const previous: { el: HTMLLinkElement; href: string }[] = [];
    head.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]').forEach((l) => {
      previous.push({ el: l, href: l.getAttribute("href") || "" });
      l.remove();
    });
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = `/api/public/landing-manifest/${slug}`;
    head.appendChild(manifest);

    const added: HTMLElement[] = [manifest];

    const setLink = (rel: string, href: string, attrs: Record<string, string> = {}) => {
      const link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      Object.entries(attrs).forEach(([k, v]) => link.setAttribute(k, v));
      head.appendChild(link);
      added.push(link);
    };

    // Favicon + icon trên tab / màn hình chính
    setLink("icon", "/favicon.png", { type: "image/png", sizes: "any" });
    setLink("icon", "/icon-192.png", { type: "image/png", sizes: "192x192" });
    setLink("apple-touch-icon", "/apple-touch-icon.png", { sizes: "180x180" });

    const setMeta = (name: string, content: string) => {
      let m = head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!m) {
        m = document.createElement("meta");
        m.name = name;
        head.appendChild(m);
        added.push(m);
      }
      m.content = content;
    };
    // Màu thanh trình duyệt trên iOS/Android
    setMeta("theme-color", "#0B0F1A");
    setMeta("color-scheme", "dark");
    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    setMeta("apple-mobile-web-app-title", title.slice(0, 20));

    return () => {
      added.forEach((el) => el.remove());
      previous.forEach(({ href }) => {
        const l = document.createElement("link");
        l.rel = "manifest";
        l.href = href;
        head.appendChild(l);
      });
    };
  }, [slug, title]);

  return null;
}
