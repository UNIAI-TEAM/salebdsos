// Nút "Cài landing này thành app" (manifest riêng do LandingBrowserMeta gắn).
import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallLandingApp({ title }: { slug?: string; title: string }) {
  const [promptEvent, setPromptEvent] = useState<InstallEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const click = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      setPromptEvent(null);
      return;
    }
    setShowHelp(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={click}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-[13px] font-medium backdrop-blur hover:border-primary/60"
      >
        <Download className="h-4 w-4 text-primary" />
        Cài landing này thành app
      </button>

      {showHelp ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-4 sm:place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 text-left">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[15px] font-semibold">Thêm landing vào màn hình chính</h2>
              <button type="button" aria-label="Đóng" onClick={() => setShowHelp(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <ol className="mt-3 space-y-2 text-[13.5px] text-muted-foreground">
              <li className="flex gap-2">
                <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <b className="text-foreground">iPhone (Safari):</b> bấm nút Chia sẻ, chọn “Thêm vào MH chính”, rồi bấm
                  “Thêm”.
                </span>
              </li>
              <li className="flex gap-2">
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <b className="text-foreground">Android (Chrome):</b> bấm dấu ba chấm, chọn “Thêm vào Màn hình chính” /
                  “Cài đặt ứng dụng”.
                </span>
              </li>
            </ol>
            <p className="mt-3 text-[12.5px] text-muted-foreground">
              Sau khi thêm, icon “{title.slice(0, 20)}” sẽ mở thẳng landing này, không cần dán link.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
