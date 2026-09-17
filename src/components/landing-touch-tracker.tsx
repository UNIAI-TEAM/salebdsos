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
let target: { slug?: string; projectId?: string } | null = null;

function flush() {
  if (!queue.length || !target) return;
  const events = queue.slice(0, 20);
  queue = queue.slice(20);
  void fetch("/api/public/project-touch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(target.slug ? { slug: target.slug } : {}),
      ...(target.projectId ? { projectId: target.projectId } : {}),
      sessionId: getTouchSessionId(),
      qrCode: getQrCode(),
      events,
    }),
  }).catch(() => undefined);
}

/** Gửi một điểm chạm (gộp theo lô 1.2s để không làm chậm trang). */
export function trackTouch(type: TouchType, meta?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || !target) return;
  queue.push(meta ? { type, meta } : { type });
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 1200);
}

/**
 * Tự động ghi nhận điểm chạm cho trang công khai (landing hoặc trang dự án QR):
 * mở trang, cuộn hết trang, các khối được đánh dấu `data-touch`
 * và các thao tác bấm được đánh dấu `data-touch-click`.
 */
function useTouchTracking(next: { slug?: string; projectId?: string }, viewType: TouchType) {
  const key = next.slug ?? next.projectId ?? "";
  useEffect(() => {
    if (!key) return;
    target = next.slug ? { slug: next.slug } : { projectId: next.projectId as string };
    trackTouch(viewType, { path: window.location.pathname });

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
          const k = (e.target as HTMLElement).dataset["touch"];
          if (!k || !e.isIntersecting || seen.has(k)) continue;
          seen.add(k);
          trackTouch(k as TouchType);
        }
      },
      { threshold: 0.4 },
    );
    document.querySelectorAll<HTMLElement>("[data-touch]").forEach((el) => io.observe(el));

    // Tự ghi nhận thao tác bấm (gọi, zalo, chia sẻ, tải brochure, mở form…)
    const onClick = (ev: Event) => {
      const el = (ev.target as HTMLElement | null)?.closest<HTMLElement>("[data-touch-click]");
      const k = el?.dataset["touchClick"];
      if (k) trackTouch(k as TouchType);
    };
    document.addEventListener("click", onClick, true);

    const onHide = () => flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("click", onClick, true);
      io.disconnect();
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, viewType]);
}

/** Gắn tracker cho landing công khai. */
export function LandingTouchTracker({ slug }: { slug: string }) {
  useTouchTracking({ slug }, "landing_view");
  return null;
}

/** Gắn tracker cho trang chi tiết dự án khi khách quét QR. */
export function ProjectTouchTracker({ projectId }: { projectId: string }) {
  useTouchTracking({ projectId }, "landing_view");
  return null;
}

