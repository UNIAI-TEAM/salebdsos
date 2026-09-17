// Ghi nhận điểm chạm của khách trên landing dự án (không thu thập danh tính).
import { useEffect } from "react";

type TouchType =
  | "landing_view"
  | "gallery_view"
  | "image_view"
  | "pricing_view"
  | "policy_view"
  | "schedule_view"
  | "brochure_download"
  | "call_click"
  | "zalo_click"
  | "share_click"
  | "form_open"
  | "form_submit"
  | "scroll_end";

const SID_KEY = "sbds_sid";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getTouchSessionId(): string {
  if (typeof window === "undefined") return "";
  const fromCookie = document.cookie.match(/(?:^|;\s*)sbds_sid=([\w-]{8,64})/)?.[1];
  if (fromCookie) {
    localStorage.setItem(SID_KEY, fromCookie);
    return fromCookie;
  }
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = randomId();
    localStorage.setItem(SID_KEY, sid);
  }
  document.cookie = `${SID_KEY}=${sid}; Path=/; Max-Age=2592000; SameSite=Lax`;
  return sid;
}

function getQrCode(): string | null {
  if (typeof window === "undefined") return null;
  const fromUrl = new URLSearchParams(window.location.search).get("pq");
  if (fromUrl) {
    sessionStorage.setItem("sbds_pq", fromUrl);
    return fromUrl;
  }
  return sessionStorage.getItem("sbds_pq");
}

let queue: { type: TouchType; meta?: Record<string, string | number | boolean> }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let currentSlug = "";

function flush() {
  if (!queue.length || !currentSlug) return;
  const events = queue.slice(0, 20);
  queue = queue.slice(20);
  void fetch("/api/public/project-touch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: currentSlug,
      sessionId: getTouchSessionId(),
      qrCode: getQrCode(),
      events,
    }),
  }).catch(() => undefined);
}

/** Gửi một điểm chạm (gộp theo lô 1.2s để không làm chậm trang). */
export function trackTouch(type: TouchType, meta?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || !currentSlug) return;
  queue.push(meta ? { type, meta } : { type });
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 1200);
}

/** Gắn tracker cho landing: ghi lượt mở trang, cuộn hết trang và xem lịch. */
export function LandingTouchTracker({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;
    currentSlug = slug;
    trackTouch("landing_view", { path: window.location.pathname });

    let scrolled = false;
    const onScroll = () => {
      if (scrolled) return;
      const p = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      if (p > 0.85) {
        scrolled = true;
        trackTouch("scroll_end");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const key = (e.target as HTMLElement).dataset["touch"];
          if (!key || !e.isIntersecting || seen.has(key)) continue;
          seen.add(key);
          trackTouch(key as TouchType);
        }
      },
      { threshold: 0.4 },
    );
    document.querySelectorAll<HTMLElement>("[data-touch]").forEach((el) => io.observe(el));

    const onHide = () => flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      io.disconnect();
      flush();
    };
  }, [slug]);
  return null;
}
