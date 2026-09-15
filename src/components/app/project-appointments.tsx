import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
} from "@/lib/appointment.functions";
import { SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Status = "scheduled" | "completed" | "canceled" | "no_show";
type Row = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  status: Status;
  notes: string | null;
  reminder_minutes: number | null;
  is_published: boolean;
};
type FormState = {
  id?: string;
  title: string;
  location: string;
  starts_at: string;
  ends_at: string;
  status: Status;
  notes: string;
  reminder_minutes: number;
  is_published: boolean;
};

const EMPTY: FormState = {
  title: "", location: "", starts_at: "", ends_at: "", status: "scheduled",
  notes: "", reminder_minutes: 30, is_published: false,
};
const STATUS_LABEL: Record<Status, string> = {
  scheduled: "Đã đặt", completed: "Hoàn tất", canceled: "Đã hủy", no_show: "Không đến",
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProjectAppointments({ projectId, tenantId }: { projectId: string; tenantId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fnList = useServerFn(listAppointments);
  const fnCreate = useServerFn(createAppointment);
  const fnUpdate = useServerFn(updateAppointment);
  const fnDelete = useServerFn(deleteAppointment);

  const list = useQuery({
    queryKey: ["project-appointments", tenantId, projectId],
    queryFn: () => fnList({ data: { tenantId, projectId, pageSize: 100 } }),
  });
  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["project-appointments", tenantId, projectId] }),
      qc.invalidateQueries({ queryKey: ["appointments", tenantId] }),
      qc.invalidateQueries({ queryKey: ["project-landings", tenantId, projectId] }),
    ]);
  };
  const createMut = useMutation({
    mutationFn: (v: FormState) => fnCreate({ data: {
      tenantId, project_id: projectId, title: v.title, location: v.location || null,
      starts_at: new Date(v.starts_at).toISOString(), ends_at: new Date(v.ends_at).toISOString(),
      status: v.status, notes: v.notes || null, reminder_minutes: v.reminder_minutes,
      is_published: v.is_published,
    } }),
    onSuccess: async () => { toast.success("Đã tạo lịch hẹn"); setEditing(null); await invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (v: FormState & { id: string }) => fnUpdate({ data: {
      id: v.id, project_id: projectId, title: v.title, location: v.location || null,
      starts_at: new Date(v.starts_at).toISOString(), ends_at: new Date(v.ends_at).toISOString(),
      status: v.status, notes: v.notes || null, reminder_minutes: v.reminder_minutes,
      is_published: v.is_published,
    } }),
    onSuccess: async () => { toast.success("Đã cập nhật lịch hẹn"); setEditing(null); await invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: async () => { toast.success("Đã xóa lịch hẹn"); setDeletingId(null); await invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = (list.data?.items ?? []) as unknown as Row[];
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing?.title.trim() || !editing.starts_at || !editing.ends_at) {
      toast.error("Nhập tiêu đề và thời gian lịch hẹn"); return;
    }
    if (new Date(editing.ends_at) <= new Date(editing.starts_at)) {
      toast.error("Kết thúc phải sau bắt đầu"); return;
    }
    if (editing.id) updateMut.mutate({ ...editing, id: editing.id });
    else createMut.mutate(editing);
  };

  return (
    <>
      <SectionCard title="Lịch hẹn & sự kiện" action={
        <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="mr-1 h-4 w-4" /> Thêm lịch
        </Button>
      }>
        {list.isLoading ? <p className="text-[13px] text-muted-foreground">Đang tải…</p> : items.length === 0 ? (
          <div className="py-5 text-center text-[13px] text-muted-foreground">
            <CalendarClock className="mx-auto mb-2 h-7 w-7 opacity-40" />Chưa có lịch hẹn cho dự án.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="min-w-0 break-words text-[13.5px] font-semibold">{item.title}</span>
                    {item.is_published && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Trên landing</span>}
                  </div>
                  <p className="mt-0.5 break-words text-[11.5px] text-muted-foreground">
                    {new Date(item.starts_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {item.location ? ` · ${item.location}` : ""} · {STATUS_LABEL[item.status]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Sửa lịch hẹn" onClick={() => setEditing({
                    id: item.id, title: item.title, location: item.location ?? "",
                    starts_at: toLocalInput(item.starts_at), ends_at: toLocalInput(item.ends_at),
                    status: item.status, notes: item.notes ?? "", reminder_minutes: item.reminder_minutes ?? 30,
                    is_published: item.is_published,
                  })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Xóa lịch hẹn" onClick={() => setDeletingId(item.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Sửa lịch hẹn" : "Thêm lịch hẹn"}</DialogTitle><DialogDescription>Lịch chỉ xuất hiện trên landing khi bạn bật công khai.</DialogDescription></DialogHeader>
          {editing && <form onSubmit={submit} className="space-y-3">
            <div><label className="text-[12px] font-semibold">Tiêu đề *</label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="text-[12px] font-semibold">Bắt đầu *</label><Input type="datetime-local" value={editing.starts_at} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} /></div>
              <div><label className="text-[12px] font-semibold">Kết thúc *</label><Input type="datetime-local" value={editing.ends_at} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} /></div>
            </div>
            <div><label className="text-[12px] font-semibold">Địa điểm</label><div className="relative"><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></div></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="text-[12px] font-semibold">Trạng thái</label><Select value={editing.status} onValueChange={(status) => setEditing({ ...editing, status: status as Status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-[12px] font-semibold">Nhắc trước (phút)</label><Input type="number" min={0} value={editing.reminder_minutes} onChange={(e) => setEditing({ ...editing, reminder_minutes: Number(e.target.value) || 0 })} /></div>
            </div>
            <div><label className="text-[12px] font-semibold">Ghi chú nội bộ</label><Textarea rows={3} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
            <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border p-3">
              <span className="min-w-0"><span className="block text-[13px] font-semibold">Hiển thị trên landing</span><span className="block text-[11.5px] text-muted-foreground">Chỉ hiện tiêu đề, thời gian và địa điểm.</span></span>
              <Switch checked={editing.is_published} onCheckedChange={(is_published) => setEditing({ ...editing, is_published })} />
            </label>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Hủy</Button><Button type="submit" disabled={createMut.isPending || updateMut.isPending}>{editing.id ? "Lưu" : "Tạo"}</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa lịch hẹn?</AlertDialogTitle><AlertDialogDescription>Lịch sẽ đồng thời biến mất khỏi landing công khai.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={() => deletingId && deleteMut.mutate(deletingId)}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}