import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bot, GripVertical, Plus, RotateCcw, Save, Send, Trash2, UserRound } from "lucide-react";
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/hooks/use-auth";
import { getChatFlows, saveChatFlows } from "@/lib/chat-flows.functions";
import { flowSchema, stepBot, templateFlow, uid, type BotState, type ChatButton, type ChatFlow, type ChatNode } from "@/lib/chat-flows";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/chat-flows")({
  head: () => ({
    meta: [
      { title: "Kịch bản chat tự động — SaleBDS OS" },
      { name: "description", content: "Dựng kịch bản chat phân nhánh có nút bấm, từ khóa và chuyển chuyên viên tiếp nhận." },
      { property: "og:title", content: "Kịch bản chat tự động — SaleBDS OS" },
      { property: "og:description", content: "Bot trả lời khách theo cây kịch bản trước khi chuyển Sale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatFlowsPage,
});

const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function ChatFlowsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const fnGet = useServerFn(getChatFlows);
  const fnSave = useServerFn(saveChatFlows);
  const q = useQuery({ queryKey: ["chat-flows", tenantId], queryFn: () => fnGet({ data: { tenantId: tenantId! } }), enabled: !!tenantId });
  const [flows, setFlows] = useState<ChatFlow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (!q.data) return;
    setFlows(q.data.flows);
    setActiveId((a) => a ?? q.data.flows[0]?.id ?? null);
  }, [q.data]);
  const save = useMutation({
    mutationFn: async () => {
      for (const f of flows) {
        const r = flowSchema.safeParse(f);
        if (!r.success) throw new Error(`${f.name}: ${r.error.issues[0]?.message ?? "Chưa hợp lệ"}`);
      }
      return fnSave({ data: { tenantId: tenantId!, value: { flows } } });
    },
    onSuccess: () => { toast.success("Đã lưu kịch bản"); qc.invalidateQueries({ queryKey: ["chat-flows", tenantId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const flow = flows.find((f) => f.id === activeId) ?? null;
  const canEdit = q.data?.canEdit ?? false;
  const update = (patch: (f: ChatFlow) => ChatFlow) => setFlows((all) => all.map((f) => (f.id === activeId ? patch(f) : f)));
  const add = () => { const f = templateFlow(); setFlows((a) => [...a, f]); setActiveId(f.id); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kịch bản chat tự động"
        description="Bot trả lời khách theo cây nút bấm và từ khóa, rồi chuyển chuyên viên khi khách cần người thật."
        actions={canEdit ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={add}><Plus className="h-4 w-4" />Kịch bản mới</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4" />{save.isPending ? "Đang lưu…" : "Lưu"}</Button>
          </div>
        ) : undefined}
      />
      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Bot đang tự trả lời trên <span className="font-medium text-foreground">chat landing</span>. Zalo OA, Messenger, Telegram dùng được ở khung mô phỏng; tự trả lời trên các kênh này sẽ bật sau khi kênh được xác minh gửi/nhận thật. Bot dừng ngay khi Sale nhắn trong hội thoại.
      </div>
      {q.isLoading ? <div className="text-sm text-muted-foreground">Đang tải…</div> : (
        <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_340px]">
          <SectionCard title="Kịch bản">
            <div className="space-y-1">
              {flows.length === 0 && <p className="text-sm text-muted-foreground">Chưa có kịch bản. Bấm “Kịch bản mới” để bắt đầu từ mẫu BĐS.</p>}
              {flows.map((f) => (
                <button key={f.id} onClick={() => setActiveId(f.id)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${f.id === activeId ? "bg-primary/10 text-foreground" : "hover:bg-muted"}`}>
                  <span className="truncate">{f.name}</span>
                  <Badge variant={f.enabled ? "default" : "secondary"}>{f.enabled ? "Bật" : "Tắt"}</Badge>
                </button>
              ))}
            </div>
          </SectionCard>
          {flow ? <FlowEditor key={flow.id} flow={flow} canEdit={canEdit} onChange={update} onDelete={() => { setFlows((a) => a.filter((f) => f.id !== flow.id)); setActiveId(null); }} /> : <div />}
          {flow ? <Simulator flow={flow} /> : <div />}
        </div>
      )}
    </div>
  );
}

function FlowEditor({ flow, canEdit, onChange, onDelete }: { flow: ChatFlow; canEdit: boolean; onChange: (p: (f: ChatFlow) => ChatFlow) => void; onDelete: () => void }) {
  const order = useMemo(() => {
    const seen: string[] = [];
    const walk = (id: string | null) => {
      if (!id || seen.includes(id)) return;
      seen.push(id);
      flow.nodes.find((n) => n.id === id)?.buttons.forEach((b) => walk(b.next));
    };
    walk(flow.startNodeId);
    return [...seen, ...flow.nodes.map((n) => n.id).filter((id) => !seen.includes(id))];
  }, [flow]);
  const depth = useMemo(() => {
    const d: Record<string, number> = { [flow.startNodeId]: 0 };
    const queue = [flow.startNodeId];
    while (queue.length) {
      const id = queue.shift()!;
      flow.nodes.find((n) => n.id === id)?.buttons.forEach((b) => { if (b.next && d[b.next] === undefined) { d[b.next] = d[id] + 1; queue.push(b.next); } });
    }
    return d;
  }, [flow]);
  const setNode = (id: string, patch: (n: ChatNode) => ChatNode) => onChange((f) => ({ ...f, nodes: f.nodes.map((n) => (n.id === id ? patch(n) : n)) }));
  const addChild = (nodeId: string, buttonId: string) => {
    const nid = `s${uid().slice(0, 5)}`;
    onChange((f) => ({ ...f, nodes: [...f.nodes.map((n) => (n.id === nodeId ? { ...n, buttons: n.buttons.map((b) => (b.id === buttonId ? { ...b, next: nid } : b)) } : n)), { id: nid, text: "Nội dung trả lời…", buttons: [], tag: "", handoff: false }] }));
  };
  const removeNode = (id: string) => onChange((f) => ({ ...f, nodes: f.nodes.filter((n) => n.id !== id).map((n) => ({ ...n, buttons: n.buttons.map((b) => (b.next === id ? { ...b, next: null } : b)) })) }));

  return (
    <div className="space-y-4 min-w-0">
      <SectionCard title="Kích hoạt">
        <fieldset disabled={!canEdit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="fname">Tên kịch bản</Label><Input id="fname" value={flow.name} onChange={(e) => onChange((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="ftrig">Khi nào bắt đầu</Label>
              <select id="ftrig" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={flow.trigger} onChange={(e) => onChange((f) => ({ ...f, trigger: e.target.value as ChatFlow["trigger"] }))}>
                <option value="first_message">Tin nhắn đầu tiên của khách</option>
                <option value="keyword">Khách nhắn từ khóa</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pb-2"><Switch id="fon" checked={flow.enabled} onCheckedChange={(v) => onChange((f) => ({ ...f, enabled: v }))} /><Label htmlFor="fon">Bật</Label></div>
          </div>
          {flow.trigger === "keyword" && (
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="fkw">Từ khóa (cách nhau bằng dấu phẩy)</Label><Input id="fkw" defaultValue={flow.keywords.join(", ")} onBlur={(e) => onChange((f) => ({ ...f, keywords: csv(e.target.value) }))} placeholder="giá, bảng giá, tư vấn" /><p className="text-xs text-muted-foreground">Không phân biệt dấu và chữ hoa.</p></div>
          )}
        </fieldset>
      </SectionCard>

      {order.map((id) => {
        const node = flow.nodes.find((n) => n.id === id)!;
        const d = depth[id];
        return (
          <div key={id} style={{ marginLeft: `${Math.min(d ?? 0, 4) * 20}px` }} className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bot className="h-4 w-4 text-primary" />
                {id === flow.startNodeId ? "Bước bắt đầu" : `Bước ${id}`}
                {d === undefined && <Badge variant="secondary">Chưa nối</Badge>}
                {node.handoff && <Badge variant="outline"><UserRound className="h-3 w-3" />Chuyển chuyên viên</Badge>}
              </div>
              {canEdit && id !== flow.startNodeId && <Button variant="ghost" size="icon" aria-label="Xóa bước" onClick={() => removeNode(id)}><Trash2 className="h-4 w-4" /></Button>}
            </div>
            <fieldset disabled={!canEdit} className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor={`t-${id}`}>Bot trả lời</Label><Textarea id={`t-${id}`} rows={2} value={node.text} onChange={(e) => setNode(id, (n) => ({ ...n, text: e.target.value }))} /><p className="text-xs text-muted-foreground">Dùng {"{name}"}, {"{project}"} để chèn tên khách và dự án.</p></div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor={`g-${id}`}>Gắn nhãn hội thoại</Label><Input id={`g-${id}`} value={node.tag} onChange={(e) => setNode(id, (n) => ({ ...n, tag: e.target.value }))} placeholder="VD: Hẹn xem nhà mẫu" /></div>
                <div className="flex items-center gap-2 pt-6"><Switch id={`h-${id}`} checked={node.handoff} onCheckedChange={(v) => setNode(id, (n) => ({ ...n, handoff: v }))} /><Label htmlFor={`h-${id}`}>Dừng bot, báo Sale tiếp nhận</Label></div>
              </div>
              {!node.handoff && (
                <ButtonList node={node} nodes={flow.nodes} canEdit={canEdit} onChange={(buttons) => setNode(id, (n) => ({ ...n, buttons }))} onAddChild={(bid) => addChild(id, bid)} />
              )}
            </fieldset>
          </div>
        );
      })}
      {canEdit && <Button variant="outline" className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" />Xóa kịch bản</Button>}
    </div>
  );
}

function ButtonList({ node, nodes, canEdit, onChange, onAddChild }: { node: ChatNode; nodes: ChatNode[]; canEdit: boolean; onChange: (b: ChatButton[]) => void; onAddChild: (buttonId: string) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = node.buttons.findIndex((b) => b.id === e.active.id);
    const to = node.buttons.findIndex((b) => b.id === e.over!.id);
    onChange(arrayMove(node.buttons, from, to));
  };
  const set = (id: string, patch: Partial<ChatButton>) => onChange(node.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nút bấm cho khách (kéo để sắp xếp)</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={node.buttons.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {node.buttons.map((b, i) => (
            <SortableButton key={b.id} id={b.id} disabled={!canEdit}>
              <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
              <Input aria-label="Tên nút" className="min-w-[120px] flex-1" value={b.label} onChange={(e) => set(b.id, { label: e.target.value })} />
              <Input aria-label="Từ khóa nút" className="min-w-[120px] flex-1" defaultValue={b.keywords.join(", ")} onBlur={(e) => set(b.id, { keywords: csv(e.target.value) })} placeholder="từ khóa…" />
              <select aria-label="Đi tới bước" className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={b.next ?? ""} onChange={(e) => (e.target.value === "__new" ? onAddChild(b.id) : set(b.id, { next: e.target.value || null }))}>
                <option value="">→ Chuyển chuyên viên</option>
                {nodes.filter((n) => n.id !== node.id).map((n) => <option key={n.id} value={n.id}>→ {n.text.slice(0, 28)}</option>)}
                <option value="__new">+ Bước mới</option>
              </select>
              <Button variant="ghost" size="icon" aria-label="Xóa nút" onClick={() => onChange(node.buttons.filter((x) => x.id !== b.id))}><Trash2 className="h-4 w-4" /></Button>
            </SortableButton>
          ))}
        </SortableContext>
      </DndContext>
      {canEdit && node.buttons.length < 6 && (
        <Button variant="outline" size="sm" onClick={() => onChange([...node.buttons, { id: uid(), label: "Nút mới", keywords: [], next: null }])}><Plus className="h-4 w-4" />Thêm nút</Button>
      )}
    </div>
  );
}

function SortableButton({ id, disabled, children }: { id: string; disabled: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2 ${isDragging ? "shadow-md" : ""}`}>
      <button type="button" aria-label="Kéo để sắp xếp" className="cursor-grab touch-none text-muted-foreground" {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></button>
      {children}
    </div>
  );
}

type SimMsg = { from: "in" | "bot" | "system"; text: string };

function Simulator({ flow }: { flow: ChatFlow }) {
  const [msgs, setMsgs] = useState<SimMsg[]>([]);
  const [state, setState] = useState<BotState>(null);
  const [done, setDone] = useState(false);
  const [text, setText] = useState("");
  const live = { ...flow, enabled: true };
  const reset = () => { setMsgs([]); setState(null); setDone(false); };
  const sendText = (t: string) => {
    if (!t.trim()) return;
    const next: SimMsg[] = [...msgs, { from: "in", text: t }];
    if (done) { setMsgs([...next, { from: "system", text: "Bot đã dừng — Sale đang tiếp nhận." }]); return; }
    const r = stepBot([live], state, t, msgs.filter((m) => m.from === "in").length === 0, { name: "anh Nam", project: "Aurora Green Bay" });
    if (r.reply) next.push({ from: "bot", text: r.reply });
    if (r.tag) next.push({ from: "system", text: `Gắn nhãn: ${r.tag}` });
    if (r.handoff) next.push({ from: "system", text: "Chuyển chuyên viên · Sale nhận thông báo" });
    if (r.reason === "idle") next.push({ from: "system", text: "Không khớp kịch bản — tin chuyển thẳng cho Sale." });
    setMsgs(next); setState(r.state); setDone(r.handoff); setText("");
  };
  const node = state ? flow.nodes.find((n) => n.id === state.nodeId) : null;
  return (
    <SectionCard title="Mô phỏng chat" actions={<Button variant="ghost" size="icon" aria-label="Làm mới mô phỏng" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>}>
      <div className="flex h-[520px] flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {msgs.length === 0 && <p className="text-sm text-muted-foreground">Nhắn thử như khách để xem bot rẽ nhánh. {flow.trigger === "keyword" ? `Thử: “${flow.keywords[0] ?? ""}”` : "Gửi bất kỳ lời chào nào."}</p>}
          {msgs.map((m, i) => m.from === "system" ? (
            <div key={i} className="text-center text-xs text-muted-foreground">{m.text}</div>
          ) : (
            <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.from === "in" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{m.text}</div>
          ))}
        </div>
        {node && !done && (
          <div className="flex flex-wrap gap-2 pt-3">
            {node.buttons.map((b) => <Button key={b.id} size="sm" variant="outline" onClick={() => sendText(b.label)}>{b.label}</Button>)}
          </div>
        )}
        <form className="flex gap-2 pt-3" onSubmit={(e) => { e.preventDefault(); sendText(text); }}>
          <Input aria-label="Tin nhắn thử" value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhắn như khách…" />
          <Button type="submit" size="icon" aria-label="Gửi"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </SectionCard>
  );
}
