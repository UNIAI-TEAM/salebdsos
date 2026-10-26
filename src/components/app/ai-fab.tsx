// Nút nổi Trợ lý AI góc phải dưới: mở khung hội thoại nhanh trên mọi trang.
import { useEffect, useState } from "react";
import { Bot, X } from "lucide-react";
import { AiAgentChat } from "@/components/app/ai-agent-chat";
import { useAuth } from "@/hooks/use-auth";

export function AiFab() {
  const { currentTenant } = useAuth();
  const [open, setOpen] = useState(false);

  // Trợ lý cần workspace; chưa tải xong thì chưa hiện.
  if (!currentTenant) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 lg:bg-transparent"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <section
        role="dialog"
        aria-label="Trợ lý AI điều hành"
        className={
          "fixed z-[60] flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xl transition-[opacity,transform] duration-200 " +
          "inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] top-16 " +
          "lg:inset-auto lg:bottom-24 lg:right-6 lg:h-[36rem] lg:max-h-[calc(100dvh-8rem)] lg:w-[26rem] " +
          (open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0")
        }
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10">
              <Bot className="size-4 text-primary" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Trợ lý AI điều hành</p>
              <p className="text-xs text-muted-foreground">Hỏi số liệu sàn bằng tiếng Việt</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Đóng trợ lý AI"
            className="grid size-8 place-items-center rounded-lg hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1">
          <AiAgentChat tenantId={currentTenant.id} />
        </div>
      </section>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
        className="fixed z-[60] grid size-13 place-items-center rounded-full border bg-primary text-primary-foreground shadow-lg hover:shadow-xl active:scale-95 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-4 lg:bottom-6 lg:right-6"
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </button>
    </>
  );
}
