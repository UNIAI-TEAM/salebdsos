// Thanh thông báo khi mất mạng: cho sale biết đang xem bản đã lưu.
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 top-3 z-[60] -translate-x-1/2 flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-2 text-[12.5px] font-medium text-amber-300 backdrop-blur-xl"
      style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <WifiOff className="size-4" />
      Không có mạng — đang xem bản đã lưu
    </div>
  );
}
