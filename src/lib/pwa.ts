// Đăng ký service worker cho chế độ offline. Chỉ chạy trên bản đã publish,
// tuyệt đối không chạy trong preview/dev/iframe của Lovable.
const SW_URL = "/sw.js";

function isBlockedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  }
  return false;
}

async function unregisterAppSw(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => {
        const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
        return url.endsWith(SW_URL);
      })
      .map((r) => r.unregister()),
  );
}

export async function setupServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (isBlockedContext()) {
    await unregisterAppSw();
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}

/**
 * Lưu trước các trang quan trọng (timeline, danh thiếp, landing công khai)
 * để sale gặp khách không có mạng vẫn mở lại được.
 */
export async function warmOfflineCache(paths: string[]): Promise<void> {
  if (typeof window === "undefined" || typeof caches === "undefined") return;
  if (isBlockedContext()) return;
  if (!navigator.onLine) return;

  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return;

  const pick = (path: string) =>
    path.startsWith("/p/") || path.startsWith("/c/")
      ? "salebds-public-pages"
      : "salebds-app-pages";

  await Promise.allSettled(
    unique.map(async (path) => {
      try {
        const cache = await caches.open(pick(path));
        const req = new Request(new URL(path, window.location.origin).toString(), {
          credentials: "include",
        });
        const res = await fetch(req);
        if (res.ok) await cache.put(req, res.clone());
      } catch {
        /* offline hoặc bị chặn: bỏ qua */
      }
    }),
  );
}

/**
 * Lưu trước ảnh (hero landing, ảnh bìa dự án, avatar danh thiếp) để landing
 * mở từ icon hiện ảnh ngay, không phải chờ tải lại khi mạng yếu.
 */
export async function warmOfflineAssets(urls: string[]): Promise<void> {
  if (typeof window === "undefined" || typeof caches === "undefined") return;
  if (isBlockedContext()) return;
  if (!navigator.onLine) return;

  const unique = Array.from(new Set(urls.filter((u) => !!u && /^https?:\/\//.test(u)))).slice(0, 40);
  if (unique.length === 0) return;

  const cache = await caches.open("salebds-images");
  await Promise.allSettled(
    unique.map(async (url) => {
      try {
        if (await cache.match(url)) return;
        const res = await fetch(url, { mode: "cors" });
        if (res.ok || res.type === "opaque") await cache.put(url, res.clone());
      } catch {
        /* bỏ qua */
      }
    }),
  );
}

/**
 * Lưu trước một landing công khai: trang /p/{slug}, manifest app riêng của
 * landing và ảnh hero → mở từ icon là hiện ngay.
 */
export async function warmLanding(slug: string, heroImageUrl?: string | null): Promise<void> {
  if (!slug) return;
  await Promise.allSettled([
    warmOfflineCache([`/p/${slug}`]),
    warmOfflineCache([`/api/public/landing-manifest/${slug}`]),
    warmOfflineAssets(heroImageUrl ? [heroImageUrl] : []),
  ]);
}

/** Lưu trước nhiều landing (tuần tự nhẹ để không nghẽn mạng yếu). */
export async function warmLandings(
  landings: { slug: string | null; heroImageUrl?: string | null }[],
): Promise<void> {
  for (const l of landings.filter((x) => !!x.slug).slice(0, 12)) {
    await warmLanding(l.slug as string, l.heroImageUrl ?? null);
  }
}

