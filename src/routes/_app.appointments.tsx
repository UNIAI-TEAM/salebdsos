import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarClock, Plus, Pencil, Trash2, MapPin, User } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/app/ui";

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
      <div className="text-[12px] text-muted-foreground font-medium mb-1">{label}</div>
      <div className="text-[24px] font-bold tracking-tight leading-none">{value}</div>
    </div>
  );
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  listAppointments, createAppointment, updateAppointment, deleteAppointment,
} from "@/lib/appointment.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/appointments")({ component: AppointmentsPage });

type Row = {
  id: string; title: string; location: string | null; starts_at: string; ends_at: string;
  status: "scheduled" | "completed" | "canceled" | "no_show";
  notes: string | null; reminder_minutes: number | null;
  customer_id: string | null; customers?: { full_name: string } | null;
};

type FormState = {
  id?: string;
  title: string; location: string;
  starts_at: string; ends_at: string;
  status: Row["status"]; notes: string;
  reminder_minutes: number;
};

const EMPTY: FormState = {
  title: "", location: "",
  starts_at: "", ends_at: "",
  status: "scheduled", notes: "", reminder_minutes: 30,
};

const STATUS_LABEL: Record<Row["status"], string> = {
  scheduled: "Đã đặt", completed: "Hoàn tất", canceled: "Hủy", no_show: "Không đến",
};
const STATUS_TONE: Record<Row["status"], string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-600",
  canceled: "bg-red-500/10 text-red-600",
  no_show: "bg-amber-500/10 text-amber-600",
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string) {
  return v ? new Date(v).toISOString() : "";
}

function AppointmentsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [status, setStatus] = useState<string>("all");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const range = useMemo(() => {
    const from = new Date(); from.setDate(from.getDate() - 7);
    const to = new Date(); to.setDate(to.getDate() + 60);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const fnList = useServerFn(listAppointments);
  const fnCreate = useServerFn(createAppointment);
  const fnUpdate = useServerFn(updateAppointment);
  const fnDelete = useServerFn(deleteAppointment);

  const list = useQuery({
    queryKey: ["appointments", tenantId, status, range.from, range.to],
    queryFn: () => fnList({ data: { tenantId: tenantId!, status, from: range.from, to: range.to } }),
    enabled: !!tenantId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["appointments", tenantId] });

  const createMut = useMutation({
    mutationFn: (v: FormState) => fnCreate({ data: {
      tenantId: tenantId!, title: v.title,
      location: v.location || null,
      starts_at: fromLocalInput(v.starts_at),
      ends_at: fromLocalInput(v.ends_at),
      status: v.status, notes: v.notes || null,
      reminder_minutes: v.reminder_minutes,
    } }),
    onSuccess: () => { toast.success("Đã tạo lịch hẹn"); setEditing(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (v: FormState & { id: string }) => fnUpdate({ data: {
      id: v.id, title: v.title,
      location: v.location || null,
      starts_at: fromLocalInput(v.starts_at),
      ends_at: fromLocalInput(v.ends_at),
      status: v.status, notes: v.notes || null,
      reminder_minutes: v.reminder_minutes,
    } }),
    onSuccess: () => { toast.success("Đã cập nhật"); setEditing(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Đã xóa"); setDeletingId(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: Row["status"] }) =>
      fnUpdate({ data: { id: v.id, status: v.status } }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const items = (list.data?.items ?? []) as Row[];
  const kpi = useMemo(() => {
    const now = Date.now();
    const upcoming = items.filter((i) => new Date(i.starts_at).getTime() > now && i.status === "scheduled").length;
    const done = items.filter((i) => i.status === "completed").length;
    const canceled = items.filter((i) => i.status === "canceled" || i.status === "no_show").length;
    return { total: items.length, upcoming, done, canceled };
  }, [items]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title.trim()) { toast.error("Tiêu đề bắt buộc"); return; }
    if (!editing.starts_at || !editing.ends_at) { toast.error("Chọn thời gian"); return; }
    if (new Date(editing.ends_at) <= new Date(editing.starts_at)) { toast.error("Kết thúc phải sau bắt đầu"); return; }
    if (editing.id) updateMut.mutate({ ...editing, id: editing.id });
    else createMut.mutate(editing);
  };

  if (!tenantId) return <div className="p-8 text-sm text-muted-foreground">Chọn workspace để quản lý lịch hẹn.</div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Lịch hẹn" sub="Quản lý lịch gặp khách & follow-up."
        action={
          <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4 mr-1" /> Thêm lịch hẹn
          </Button>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Tổng" value={kpi.total.toString()} />
        <KpiCard label="Sắp tới" value={kpi.upcoming.toString()} />
        <KpiCard label="Hoàn tất" value={kpi.done.toString()} />
        <KpiCard label="Hủy / Không đến" value={kpi.canceled.toString()} />
      </div>

      <SectionCard title="Danh sách" action={
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="scheduled">Đã đặt</SelectItem>
            <SelectItem value="completed">Hoàn tất</SelectItem>
            <SelectItem value="canceled">Hủy</SelectItem>
            <SelectItem value="no_show">Không đến</SelectItem>
          </SelectContent>
        </Select>
      }>
        {list.isLoading ? (
          <div className="text-sm text-muted-foreground p-4">Đang tải…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground p-8 text-center">
            <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Chưa có lịch hẹn nào. Bấm "Thêm lịch hẹn" để tạo mới.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((a) => {
              const s = new Date(a.starts_at);
              const e = new Date(a.ends_at);
              return (
                <li key={a.id} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3 hover:shadow-soft transition">
                  <div className="h-10 w-10 rounded-xl bg-primary-soft grid place-items-center">
                    <CalendarClock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold truncate">{a.title}</div>
                    <div className="text-[11.5px] text-muted-foreground flex items-center gap-3 mt-0.5">
                      <span>{s.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} – {e.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                      {a.customers?.full_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{a.customers.full_name}</span>}
                      {a.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</span>}
                    </div>
                  </div>
                  <Select
                    value={a.status}
                    onValueChange={(v) => statusMut.mutate({ id: a.id, status: v as Row["status"] })}
                  >
                    <SelectTrigger className={`h-7 w-32 text-[11px] font-semibold border-none ${STATUS_TONE[a.status]}`}>
                      <SelectValue>{STATUS_LABEL[a.status]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Đã đặt</SelectItem>
                      <SelectItem value="completed">Hoàn tất</SelectItem>
                      <SelectItem value="canceled">Hủy</SelectItem>
                      <SelectItem value="no_show">Không đến</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing({
                    id: a.id, title: a.title, location: a.location ?? "",
                    starts_at: toLocalInput(a.starts_at), ends_at: toLocalInput(a.ends_at),
                    status: a.status, notes: a.notes ?? "", reminder_minutes: a.reminder_minutes ?? 30,
                  })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeletingId(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa lịch hẹn" : "Thêm lịch hẹn"}</DialogTitle>
            <DialogDescription>Nhập thông tin cuộc hẹn với khách.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold">Tiêu đề *</label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold">Bắt đầu *</label>
                  <Input type="datetime-local" value={editing.starts_at} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} />
                </div>
                <div>
                  <label className="text-[12px] font-semibold">Kết thúc *</label>
                  <Input type="datetime-local" value={editing.ends_at} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-semibold">Địa điểm</label>
                <Input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder="Văn phòng, Zoom, địa chỉ dự án…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold">Trạng thái</label>
                  <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as Row["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Đã đặt</SelectItem>
                      <SelectItem value="completed">Hoàn tất</SelectItem>
                      <SelectItem value="canceled">Hủy</SelectItem>
                      <SelectItem value="no_show">Không đến</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[12px] font-semibold">Nhắc trước (phút)</label>
                  <Input type="number" min={0} value={editing.reminder_minutes} onChange={(e) => setEditing({ ...editing, reminder_minutes: Number(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-semibold">Ghi chú</label>
                <Textarea rows={3} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {editing.id ? "Lưu" : "Tạo"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa lịch hẹn?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMut.mutate(deletingId)}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
