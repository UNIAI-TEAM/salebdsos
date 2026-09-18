// Hộp chat khách trên landing dự án + nút mở Zalo OA
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

type ChatMessage = { id: string; direction: "in" | "out"; body: string | null; sender_name: string | null; created_at: string };

const VISITOR_STORAGE_KEY = "salebds-chat-visitor";

function visitorKey(): string {
  if (typeof window === "undefined") return "";
  let key = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (!key) {
    key = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(VISITOR_STORAGE_KEY, key);
  }
  return key;
}

export function LandingChat({
  slug,
  title,
  greeting,
  zaloLink,
  zaloName,
}: {
  slug: string;
  title: string;
  greeting: string;
  zaloLink?: string | null;
  zaloName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/public/chat/${slug}?visitor=${encodeURIComponent(visitorKey())}`);
        const data = (await response.json()) as { messages?: ChatMessage[] };
        if (alive) setMessages(data.messages ?? []);
      } catch {
        /* giữ nguyên tin đã có */
      }
    };
    void load();
    const timer = window.setInterval(load, 8000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [open, slug]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/public/chat/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitor: visitorKey(), text: value, name: name || null, phone: phone || null }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Không gửi được tin nhắn.");
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          direction: "in",
          body: value,
          sender_name: name || "Bạn",
          created_at: new Date().toISOString(),
        },
      ]);
      setText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-2">
        {zaloLink ? (
          <a
            href={zaloLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#0068FF] px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            <MessageCircle className="h-4 w-4" />
            Chat Zalo{zaloName ? ` · ${zaloName}` : ""}
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg"
        >
          {open ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
          {open ? "Đóng" : title}
        </button>
      </div>

      {open ? (
        <div className="fixed bottom-24 right-4 z-50 flex max-h-[70vh] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{greeting}</p>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Hãy để lại câu hỏi, chuyên viên sẽ phản hồi ngay.
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    message.direction === "in"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.direction === "out" && message.sender_name ? (
                    <p className="mb-0.5 text-[10px] font-semibold uppercase opacity-70">{message.sender_name}</p>
                  ) : null}
                  {message.body}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="space-y-2 border-t border-border p-3">
            {messages.length === 0 ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Tên của bạn"
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Số điện thoại"
                  inputMode="tel"
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </div>
            ) : null}
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Nhập câu hỏi…"
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                aria-label="Gửi tin nhắn"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </form>
        </div>
      ) : null}
    </>
  );
}
