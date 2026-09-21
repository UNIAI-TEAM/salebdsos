// Phía trình duyệt: xin quyền thông báo và đăng ký thiết bị.

export type PushSupport = {
  supported: boolean;
  installed: boolean;
  permission: NotificationPermission | "unsupported";
  reason?: string;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function checkPushSupport(): PushSupport {
  if (typeof window === "undefined") return { supported: false, installed: false, permission: "unsupported" };
  const installed = isStandalone();
  const hasApi = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!hasApi) {
    return {
      supported: false,
      installed,
      permission: "unsupported",
      reason: isIos()
        ? "Trên iPhone cần thêm app vào Màn hình chính rồi mở từ biểu tượng mới nhận được thông báo."
        : "Trình duyệt này chưa hỗ trợ thông báo đẩy.",
    };
  }
  if (isIos() && !installed) {
    return {
      supported: false,
      installed,
      permission: Notification.permission,
      reason: "Trên iPhone cần thêm app vào Màn hình chính rồi mở từ biểu tượng mới bật được thông báo.",
    };
  }
  return { supported: true, installed, permission: Notification.permission };
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Thiết bị";
  const ua = navigator.userAgent;
  const os = /iphone|ipad/i.test(ua) ? "iPhone/iPad" : /android/i.test(ua) ? "Android" : /mac/i.test(ua) ? "Mac" : /windows/i.test(ua) ? "Windows" : "Thiết bị";
  const app = isStandalone() ? "app đã cài" : "trình duyệt";
  return `${os} · ${app}`;
}

/** Xin quyền + đăng ký, trả về thông tin thiết bị để lưu lên server. */
export async function subscribeToPush(publicKey: string): Promise<{
  endpoint: string;
  p256dh: string;
  auth: string;
}> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Anh/chị chưa cho phép hiện thông báo trên thiết bị này.");

  const registration = await navigator.serviceWorker.getRegistration();
  const ready = registration ?? (await navigator.serviceWorker.ready);
  if (!ready) throw new Error("Chưa cài app vào máy. Hãy mở bản đã publish và thêm vào Màn hình chính.");

  const existing = await ready.pushManager.getSubscription();
  const sub =
    existing ??
    (await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
    }));

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Không lấy được thông tin thiết bị.");
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

export async function unsubscribeFromPush(): Promise<string | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
