import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Loader2, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { askAgent } from "@/lib/ai-agent.functions";
import { agentHistory } from "@/lib/ai-agent-data";
import { PageHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/ai-agent")({
  head: () => ({
    meta: [
      { title: "Trợ lý AI điều hành — SaleBDS OS" },
      { name: "description", content: "Hỏi doanh số, căn còn trống, tiến độ dự án và công nợ bằng tiếng Việt." },
      { property: "og:title", content: "Trợ lý AI điều hành — SaleBDS OS" },
      { property: "og:description", content: "Tra cứu số liệu sàn bất động sản qua chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentPage,
});

type Msg = { role: "user" | "assistant"; content: string };
const SUGGEST = [
  "Doanh số 3 tháng gần nhất theo dự án?",
  "Còn những căn nào trống dưới 3 tỷ?",
  "Tiến độ bán hàng các dự án thế nào?",
  "Hợp đồng nào đang quá hạn thanh toán?",
];

function AgentPage() {
  const { currentTenant } = useAuth();
  if (!currentTenant) return null;
  return <TenantAgentPage key={currentTenant.id} tenantId={currentTenant.id} />;
}

function TenantAgentPage({ tenantId }: { tenantId: string }) {
  const ask = useServerFn(askAgent);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next); setInput(""); setBusy(true); setErr(null);
    try {
      const r = await ask({ data: { tenantId, messages: agentHistory(next) } });
      setMsgs([...next, { role: "assistant", content: r.text || "Không có câu trả lời." }]);
    } catch (e: any) {
      setErr(e?.message ?? "Lỗi"); setInput(q); setMsgs(msgs);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col">
      <PageHeader title="Trợ lý AI điều hành" sub="Hỏi số liệu sàn bằng tiếng Việt — AI tra cứu dữ liệu thật." />
      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border bg-card p-4">
        {!msgs.length && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Bot className="h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">Thử một câu hỏi:</p>
            <div className="grid w-full gap-2 sm:grid-cols-2">
              {SUGGEST.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-lg border p-3 text-left text-sm hover:bg-muted">{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={m.role === "user" ? "max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground" : "prose prose-sm max-w-none dark:prose-invert [&_table]:text-xs"}>
              {m.role === "user" ? m.content : <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Đang tra cứu số liệu…</div>}
        <div ref={end} />
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Hỏi doanh số, căn trống, tiến độ dự án…"
          className="min-h-11 resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={busy || !input.trim()}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
