// Full-screen "Lock Screen" sharing — large QR for in-person scanning.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Maximize2, Wifi, BatteryFull, Signal, Lock } from "lucide-react";
import { QrCode } from "@/components/qr-code";

export const Route = createFileRoute("/share/$slug")({ component: ShareScreen });

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function ShareScreen() {
  const { slug } = Route.useParams();
  const now = useNow();
  const [size, setSize] = useState(280);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setSize(Math.min(w, h) - 120);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const value = origin ? `${origin}/c/${slug}?utm_source=lockscreen` : `/c/${slug}`;
  const time = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const date = now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });

  const goFullscreen = () => {
    const el = document.documentElement as any;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (fn) fn.call(el).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-soft opacity-20" />
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />

      <header className="relative px-5 pt-4 flex items-center justify-between text-[12px] text-white/60 tabular-nums">
        <span className="font-semibold">{time}</span>
        <div className="flex items-center gap-1.5">
          <Signal className="h-3.5 w-3.5" />
          <Wifi className="h-3.5 w-3.5" />
          <BatteryFull className="h-3.5 w-3.5" />
        </div>
      </header>

      <Link
        to="/qr-sharing"
        className="absolute top-3 left-3 z-10 h-9 w-9 rounded-full bg-white/10 backdrop-blur grid place-items-center hover:bg-white/20"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <button
        onClick={goFullscreen}
        className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-white/10 backdrop-blur grid place-items-center hover:bg-white/20"
        aria-label="Fullscreen"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      <main className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-6">
          <div className="text-[44px] font-bold leading-none tracking-tight tabular-nums">{time}</div>
          <div className="text-[13px] text-white/60 mt-1 capitalize">{date}</div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-2xl">
          <div style={{ width: size, height: size }} className="grid place-items-center">
            {origin && <QrCode value={value} size={size - 40} />}
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="text-[15px] font-semibold">Quét để nhận danh thiếp</div>
          <div className="text-[12px] text-white/60 mt-1 inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Chế độ chia sẻ toàn màn hình
          </div>
        </div>

        <div className="mt-8 text-[10.5px] text-white/40 font-mono break-all max-w-xs text-center">
          {value}
        </div>
      </main>
    </div>
  );
}
