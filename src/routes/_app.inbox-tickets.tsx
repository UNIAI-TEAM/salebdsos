import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Plus, RotateCcw, Search, TicketCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  createTicket, listAssignees, listTickets, updateTicket,
  TICKET_KINDS, TICKET_PRIORITIES, TICKET_STATUSES,
} from "@/lib/tickets.functions";

export const Route = createFileRoute("/_app/inbox-tickets")({
  component: TicketsPage,
  head: () => ({ meta: [
    { title: "Ticket tin nhắn — SaleBDS OS" },
    { name: "description", content: "Giao việc chăm sóc từ hội thoại: mức ưu tiên, người phụ trách, hạn xử lý SLA và trạng thái." },
    { property: "og:title", content: "Ticket tin nhắn — SaleBDS OS" },
    { property: "og:description", content: "Ticket từ hội thoại với SLA và người phụ trách." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
});

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  normal: "bg-info/10 text-info border-info/30",
  high: "bg-warning/10 text-warning border-warning/30",
  urgent: "bg-destructive/10 text-destructive border-destructive/30",
};
const STATUS_TONE: Record<string, string> = {
  open: "bg-info/10 text-info border-info/30",
  assigned: "bg-warning/10 text-warning border-warning/30",
  resolved: "bg-success/10 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};
const label = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((x) => x.value === v)?.label ?? v;

function TicketsPage() {
  const { currentTenant, user } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [mine, setMine] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", kind: TICKET_KINDS[0] as string, priority: "normal", assigneeUserId: "", dueAt: "" });

  const fnList = useServerFn(listTickets);
  const fnCreate = useServerFn(createTicket);
  const fnUpdate = useServerFn(updateTicket);
  const fnAssignees = useServerFn(listAssignees);

  const tickets = useQuery({
    queryKey: ["tickets", tenantId, search, status, priority, mine],
    queryFn: () => fnList({ data: { tenantId: tenantId!, search: search || undefined, status, priority, mine } }),
    enabled: !!tenantId,
  });
  const assignees = useQuery({
    queryKey: ["ticket-assignees", tenantId],
    queryFn: () => fnAssignees({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tickets", tenantId] });

  const createMut = useMutation({
    mutationFn: () => {
      if (!tenantId) throw new Error("Chưa chọn sàn");
      return fnCreate({
        data: {
          tenantId,
          title: form.title,
          kind: form.kind,
          priority: form.priority as "low" | "normal" | "high" | "urgent",
          assigneeUserId: form.assigneeUserId || null,
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        },
      });
    },
    onSuccess: (row) => {
      toast.success(`Đã tạo ticket ${row.code}`);
      setCreateOpen(false);
      setForm({ title: "", kind: TICKET_KINDS[0] as string, priority: "normal", assigneeUserId: "", dueAt: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (patch: { id: string; status?: "open" | "assigned" | "resolved" | "cancelled"; assigneeUserId?: string | null }) => {
      if (!tenantId) throw new Error("Chưa chọn sàn");
      return fnUpdate({ data: { tenantId, ...patch } });
    },
    onSuccess: () => { toast.success("Đã cập nhật ticket"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const kpi = tickets.data?.kpi;

  return (
    <div className="space-y-4" data-testid="tickets-page">
      <PageHeader
        compact
        title="Ticket tin nhắn"
        sub="Giao việc chăm sóc từ hội thoại, theo dõi hạn xử lý và trạng thái."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="create-ticket">
            <Plus className="mr-1.5 h-4 w-4" /> Tạo ticket
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <KpiCard compact icon={TicketCheck} label="Đang mở" value={String(kpi?.open ?? 0)} tone="blue" />
        <KpiCard compact icon={TicketCheck} label="Quá hạn SLA" value={String(kpi?.overdue ?? 0)} tone={kpi?.overdue ? "rose" : "primary"} />
        <KpiCard compact icon={CheckCircle2} label="Đã xử lý" value={String(kpi?.resolved ?? 0)} tone="green" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, mã…"
            className="h-9 w-56 pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {TICKET_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi mức ưu tiên</SelectItem>
            {TICKET_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={mine} onCheckedChange={(v) => setMine(v === true)} data-testid="filter-mine" />
          Chỉ ticket của tôi
        </label>
      </div>

      <SectionCard compact>
        {tickets.isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Đang tải…</p>
        ) : (tickets.data?.items.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <TicketCheck className="h-8 w-8 stroke-1 opacity-50" />
            Chưa có ticket nào. Tạo ticket từ đây hoặc ngay trong hội thoại.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Mã</th>
                  <th className="px-3 py-2">Tiêu đề</th>
                  <th className="px-3 py-2">Nguồn</th>
                  <th className="px-3 py-2">Loại</th>
                  <th className="px-3 py-2">Ưu tiên</th>
                  <th className="px-3 py-2">Phụ trách</th>
                  <th className="px-3 py-2">Hạn xử lý</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {tickets.data?.items.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 hover:bg-muted/40" data-testid={`ticket-${t.code}`}>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{t.code}</td>
                    <td className="max-w-56 truncate px-3 py-2.5 font-medium">{t.title}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.source ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs">{t.kind}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={PRIORITY_TONE[t.priority]}>{label(TICKET_PRIORITIES, t.priority)}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{t.assignee_name ?? "—"}</td>
                    <td className={`px-3 py-2.5 text-xs ${t.overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                      {t.due_at ? new Date(t.due_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={STATUS_TONE[t.status]}>{label(TICKET_STATUSES, t.status)}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        {!t.assignee_user_id && t.status === "open" && (
                          <Button
                            size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => updateMut.mutate({ id: t.id, assigneeUserId: user?.id ?? null })}
                            disabled={updateMut.isPending}
                          >
                            <UserPlus className="mr-1 h-3.5 w-3.5" /> Nhận
                          </Button>
                        )}
                        {(t.status === "open" || t.status === "assigned") && (
                          <Button
                            size="sm" variant="ghost" className="h-7 text-xs text-success"
                            onClick={() => updateMut.mutate({ id: t.id, status: "resolved" })}
                            disabled={updateMut.isPending}
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Xử lý xong
                          </Button>
                        )}
                        {t.status === "resolved" && (
                          <Button
                            size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => updateMut.mutate({ id: t.id, status: "open" })}
                            disabled={updateMut.isPending}
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Mở lại
                          </Button>
                        )}
                        {t.conversation_id && (
                          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                            <Link to="/inbox">Hội thoại</Link>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo ticket</DialogTitle>
            <DialogDescription>Giao việc chăm sóc khách kèm hạn xử lý; quá hạn sẽ báo đỏ.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tiêu đề *</Label>
              <Input
                className="mt-1"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="VD: Chăm sóc khách Nguyễn Văn A"
                data-testid="ticket-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Loại</Label>
                <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ưu tiên</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Phụ trách</Label>
                <Select value={form.assigneeUserId} onValueChange={(v) => setForm((f) => ({ ...f, assigneeUserId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chưa giao" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa giao</SelectItem>
                    {(assignees.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Hạn xử lý</Label>
                <Input
                  className="mt-1"
                  type="datetime-local"
                  value={form.dueAt}
                  onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Huỷ</Button>
            <Button onClick={() => createMut.mutate()} disabled={form.title.trim().length < 2 || createMut.isPending} data-testid="submit-ticket">
              {createMut.isPending ? "Đang tạo…" : "Tạo ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
