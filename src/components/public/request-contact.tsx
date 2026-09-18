// Nút liên hệ cho khách trên trang công khai: Zalo OA, yêu cầu gọi lại,
// nhận tin SMS brandname hoặc email — mọi yêu cầu đều vào hộp thoại của Sale.
import { useState } from "react";
import { Loader2, Mail, MessageCircle, MessageSquare, PhoneCall, X } from "lucide-react";

type Channel = "call" | "zalo" | "sms" | "email";

const CHANNEL_OPTIONS: Array<{ value: Channel; label: string; icon: typeof PhoneCall }> = [
  { value: "call", label: "Gọi lại cho tôi", icon: PhoneCall },
  { value: "zalo", label: "Nhắn qua Zalo", icon: MessageCircle },
  { value: "sms", label: "Gửi tin SMS", icon: MessageSquare },
  { value: "email", label: "Gửi email", icon: Mail },
];

export function RequestContactButtons({
  kind,
  slug,
  zaloLink,
  zaloName,
  className = "",
  tone = "light",
  onOpen,
  onSent,
}: {
  kind: "page" | "card";
  slug: string;
  zaloLink?: string | null;
  zaloName?: string | null;
  className?: string;
  tone?: "light" | "dark";
  onOpen?: (channel: Channel) => void;
  onSent?: (channel: Channel) => void;
}) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "" });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sla, setSla] = useState<number | null>(null);

  const open = (value: Channel) => {
    setChannel(value);
    setState("idle");
    setError(null);
    onOpen?.(value);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!channel) return;
    if (!form.phone.trim() && !form.email.trim()) {
      setError("Anh/chị vui lòng để lại số điện thoại hoặc email.");
      return;
    }
    setState("sending");
    setError(null);
    try {
      const response = await fetch("/api/public/contact-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, slug, channel, ...form }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; slaMinutes?: number };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Không gửi được yêu cầu.");
      setSla(data.slaMinutes ?? null);
      setState("done");
      onSent?.(channel);
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  };

  const secondary =
    tone === "dark"
      ? "border border-white/15 bg-white/5 text-white"
      : "border border-border bg-background text-foreground hover:bg-muted";

  return (
    <>
      <div className={`grid gap-2 sm:grid-cols-2 ${className}`}>
        {zaloLink ? (
          <a
            href={zaloLink}
            target="_blank"
            rel="noreferrer"
            onClick={() => onOpen?.("zalo")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0068FF] px-4 text-[14px] font-semibold text-white"
          >
            <MessageCircle className="h-4 w-4" /> Chat Zalo{zaloName ? ` · ${zaloName}` : ""}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => open("zalo")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0068FF] px-4 text-[14px] font-semibold text-white"
          >
            <MessageCircle className="h-4 w-4" /> Nhắn qua Zalo
          </button>
        )}
        <button
          type="button"
          onClick={() => open("call")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[14px] font-semibold text-primary-foreground"
        >
          <PhoneCall className="h-4 w-4" /> Yêu cầu gọi lại
        </button>
        <button
          type="button"
          onClick={() => open("sms")}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold ${secondary}`}
        >
          <MessageSquare className="h-4 w-4" /> Nhận tin SMS
        </button>
        <button
          type="button"
          onClick={() => open("email")}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold ${secondary}`}
        >
          <Mail className="h-4 w-4" /> Nhận email tư vấn
        </button>
      </div>

      {channel ? (
        <div className="fixed inset-0 z-[60] grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-6">
          <div className="w-full max-w-md rounded-t-3xl bg-card p-5 text-foreground shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">
                  {CHANNEL_OPTIONS.find((option) => option.value === channel)?.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chuyên viên phụ trách sẽ liên hệ theo đúng kênh anh/chị chọn.
                </p>
              </div>
              <button type="button" onClick={() => setChannel(null)} aria-label="Đóng" className="rounded-lg p-1.5 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            {state === "done" ? (
              <div className="mt-5 space-y-3 text-sm">
                <p className="font-medium text-foreground">Đã ghi nhận yêu cầu của anh/chị.</p>
                <p className="text-muted-foreground">
                  Chuyên viên sẽ liên hệ {sla ? `trong khoảng ${sla} phút` : "trong thời gian sớm nhất"}.
                </p>
                <button
                  type="button"
                  onClick={() => setChannel(null)}
                  className="min-h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {CHANNEL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setChannel(option.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        channel === option.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Họ tên"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
                <input
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Số điện thoại"
                  inputMode="tel"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
                {channel === "email" ? (
                  <input
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email nhận thông tin"
                    inputMode="email"
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  />
                ) : null}
                <textarea
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                  rows={2}
                  placeholder="Anh/chị đang quan tâm căn nào, tầm giá bao nhiêu?"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                {error ? <p className="text-xs text-destructive">{error}</p> : null}
                <button
                  type="submit"
                  disabled={state === "sending"}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Gửi yêu cầu
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
