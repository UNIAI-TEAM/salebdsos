import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSupportSettings, saveSupportSettings, TICKET_PRIORITIES } from "@/lib/tickets.functions";
import { AUTO_SEND_CHANNELS, renderSurvey, type SupportConfig } from "@/lib/support";
import { SUPPORT_COPY as C } from "@/lib/support-copy";

const CHANNEL_LABEL: Record<string, string> = { web_chat: "Chat trên web", zalo: "Zalo OA", telegram: "Telegram" };

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div><p className="text-sm font-medium">{label}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SupportSettingsDialog({ open, onOpenChange, tenantId }: { open: boolean; onOpenChange: (v: boolean) => void; tenantId: string }) {
  const fnGet = useServerFn(getSupportSettings);
  const fnSave = useServerFn(saveSupportSettings);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["support-settings", tenantId], queryFn: () => fnGet({ data: { tenantId } }), enabled: open });
  const [cfg, setCfg] = useState<SupportConfig | null>(null);
  useEffect(() => { if (q.data) setCfg(q.data.config); }, [q.data]);
  const save = useMutation({
    mutationFn: () => fnSave({ data: { tenantId, config: cfg } }),
    onSuccess: () => { toast.success("Đã lưu cấu hình hỗ trợ"); qc.invalidateQueries({ queryKey: ["support-settings", tenantId] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const ro = !q.data?.canEdit;
  const set = <K extends keyof SupportConfig>(k: K, v: Partial<SupportConfig[K]>) => setCfg((c) => c && { ...c, [k]: { ...c[k], ...v } });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cấu hình hỗ trợ khách</DialogTitle>
          <DialogDescription>Áp dụng cho mọi kênh: chat web, Zalo OA, Telegram, Messenger.</DialogDescription>
        </DialogHeader>
        {!cfg ? <p className="py-8 text-center text-sm text-muted-foreground">Đang tải…</p> : (
          <Tabs defaultValue="ticket">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ticket">Ticket</TabsTrigger>
              <TabsTrigger value="csat">Đánh giá</TabsTrigger>
              <TabsTrigger value="welcome">Kịch bản</TabsTrigger>
            </TabsList>

            <TabsContent value="ticket" className="divide-y divide-border">
              <Row label={C.ticketOnHandoff} hint={C.ticketOnHandoffHint}>
                <Switch disabled={ro} checked={cfg.ticket.autoCreate} onCheckedChange={(v) => set("ticket", { autoCreate: v })} />
              </Row>
              <Row label="Hạn phản hồi (phút)" hint="Quá hạn ticket báo đỏ.">
                <Input disabled={ro} type="number" min={5} className="h-9 w-24" value={cfg.ticket.slaMinutes} onChange={(e) => set("ticket", { slaMinutes: Number(e.target.value) })} />
              </Row>
              <Row label={C.reopen} hint="Sau thời gian này sẽ tạo ticket mới. 0 = luôn tạo mới.">
                <Input disabled={ro} type="number" min={0} className="h-9 w-24" value={cfg.ticket.reopenHours} onChange={(e) => set("ticket", { reopenHours: Number(e.target.value) })} />
              </Row>
              <Row label="Mức ưu tiên mặc định">
                <Select disabled={ro} value={cfg.ticket.priority} onValueChange={(v) => set("ticket", { priority: v as SupportConfig["ticket"]["priority"] })}>
                  <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{TICKET_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </Row>
            </TabsContent>

            <TabsContent value="csat" className="space-y-3">
              <Row label="Gửi đánh giá sau khi xử lý xong" hint="Khi bấm “Xử lý xong”, khách nhận câu hỏi và trả lời bằng số 1–5.">
                <Switch disabled={ro} checked={cfg.csat.enabled} onCheckedChange={(v) => set("csat", { enabled: v })} />
              </Row>
              <div><Label className="text-xs">Câu hỏi</Label><Textarea disabled={ro} className="mt-1" rows={2} value={cfg.csat.question} onChange={(e) => set("csat", { question: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Tên 5 mức điểm</Label>
                <div className="mt-1 grid grid-cols-5 gap-1.5">
                  {cfg.csat.labels.map((l, i) => (
                    <Input key={i} disabled={ro} className="h-9 px-2 text-xs" value={l} aria-label={`Mức ${i + 1}`}
                      onChange={(e) => set("csat", { labels: cfg.csat.labels.map((x, j) => (j === i ? e.target.value : x)) })} />
                  ))}
                </div>
              </div>
              <div><Label className="text-xs">Lời cảm ơn</Label><Input disabled={ro} className="mt-1" value={cfg.csat.thanks} onChange={(e) => set("csat", { thanks: e.target.value })} /></div>
              <div><Label className="text-xs">Hỏi thêm khi điểm 1–2 (để trống = không hỏi)</Label><Input disabled={ro} className="mt-1" value={cfg.csat.lowScoreFollowup} onChange={(e) => set("csat", { lowScoreFollowup: e.target.value })} /></div>
              <Row label="Nhận đánh giá trong (giờ)">
                <Input disabled={ro} type="number" min={1} className="h-9 w-24" value={cfg.csat.expireHours} onChange={(e) => set("csat", { expireHours: Number(e.target.value) })} />
              </Row>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Xem trước tin khách nhận</p>
                <p className="whitespace-pre-line text-sm">{renderSurvey(cfg)}</p>
              </div>
            </TabsContent>

            <TabsContent value="welcome" className="space-y-3">
              <div><Label className="text-xs">{C.fallback}</Label><Textarea disabled={ro} rows={3} className="mt-1" value={cfg.welcome.fallback} onChange={(e) => set("welcome", { fallback: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Kịch bản chào mừng</Label>
                <p className="text-xs text-muted-foreground">Tin đầu tiên của khách sẽ được trả lời bằng kịch bản này, kèm các lựa chọn để khách chọn.</p>
                <Select disabled={ro} value={cfg.welcome.flowId || "none"} onValueChange={(v) => set("welcome", { flowId: v === "none" ? "" : v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không dùng (theo cài đặt từng kịch bản)</SelectItem>
                    {(q.data?.flows ?? []).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(q.data?.flows.length ?? 0) === 0 && <p className="mt-1 text-xs text-muted-foreground">Chưa có kịch bản. <Link to="/chat-flows" className="text-primary underline">Tạo kịch bản</Link></p>}
              </div>
              <div>
                <Label className="text-xs">Tự trả lời trên kênh</Label>
                <div className="mt-1 divide-y divide-border">
                  {AUTO_SEND_CHANNELS.map((ch) => (
                    <Row key={ch} label={CHANNEL_LABEL[ch]}>
                      <Switch disabled={ro || ch === "web_chat"} checked={ch === "web_chat" || cfg.welcome.channels.includes(ch)}
                        onCheckedChange={(v) => set("welcome", { channels: v ? [...new Set([...cfg.welcome.channels, ch])] : cfg.welcome.channels.filter((x) => x !== ch) })} />
                    </Row>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Messenger chưa tự trả lời được. Bot tự dừng khi Sale trả lời hoặc khách xin gặp tư vấn viên.</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link to="/chat-flows">Mở bộ dựng kịch bản</Link></Button>
            </TabsContent>
          </Tabs>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          {!ro && <Button onClick={() => save.mutate()} disabled={!cfg || save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu cấu hình"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
