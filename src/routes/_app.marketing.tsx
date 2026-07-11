import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Megaphone, Mail, MessageCircle, Send, Bell, Plus, Pencil, Trash2,
  Search, Play, Pause, TrendingUp, Eye, MousePointerClick, ChevronLeft, ChevronRight,
} from "lucide-react";
import { PageHeader, KpiCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  listCampaigns, createCampaign, updateCampaign, deleteCampaign,
  updateCampaignStatus, campaignStats,
} from "@/lib/campaign.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/marketing")({ component: MarketingPage });

type Channel = "email" | "zalo" | "sms" | "push";
type Status = "draft" | "scheduled" | "running" | "paused" | "completed";

type CampaignRow = {
  id: string;
  name: string;
  channel: Channel;
  status: Status;
  template: { subject?: string | null; content?: string | null } | null;
  audience: { note?: string | null } | null;
  stats: { sent?: number; opened?: number; clicked?: number } | null;
  scheduled_at: string | null;
  created_at: string;
};

type FormState = {
  id?: string;
  name: string;
  channel: Channel;
  status: Status;
  subject: string;
  content: string;
  audience_note: string;
  scheduled_at: string; // datetime-local value
};

const EMPTY: FormState = {
  name: "", channel: "email", status: "draft",
  subject: "", content: "", audience_note: "", scheduled_at: "",
};

const CHANNEL_META: Record<Channel, { label: string; icon: any }> = {
  email: { label: "Email", icon: Mail },
  zalo: { label: "Zalo", icon: MessageCircle },
  sms: { label: "SMS", icon: Send },
  push: { label: "Push", icon: Bell },
};

const STATUS_META: Record<Status, { label: string; className: string }> = {
  draft:      { label: "Nháp",      className: "bg-muted text-muted-foreground" },
  scheduled:  { label: "Lên lịch",  className: "bg-amber-50 text-amber-700" },
  running:    { label: "Đang chạy", className: "bg-emerald-50 text-emerald-700" },
  paused:     { label: "Tạm dừng",  className: "bg-orange-50 text-orange-700" },
  completed:  { label: "Hoàn tất",  className: "bg-blue-50 text-blue-700" },
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MarketingPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fnList = useServerFn(listCampaigns);
  const fnStats = useServerFn(campaignStats);
  const fnCreate = useServerFn(createCampaign);
  const fnUpdate = useServerFn(updateCampaign);
  const fnDelete = useServerFn(deleteCampaign);
  const fnSetStatus = useServerFn(updateCampaignStatus);

  const list = useQuery({
    queryKey: ["campaigns", tenantId, search, channelFilter, statusFilter, page, pageSize],
    queryFn: () => fnList({
      data: {
        tenantId: tenantId!, search, page, pageSize,
        channel: channelFilter === "all" ? undefined : channelFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      },
    }),
    enabled: !!tenantId,
  });

  const stats = useQuery({
    queryKey: ["campaigns-stats", tenantId],
    queryFn: () => fnStats({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["campaigns", tenantId] });
    qc.invalidateQueries({ queryKey: ["campaigns-stats", tenantId] });
  };

  const buildPayload = (v: FormState) => ({
    name: v.name.trim(),
    channel: v.channel,
    status: v.status,
    subject: v.subject || null,
    content: v.content || null,
    audience_note: v.audience_note || null,
    scheduled_at: v.scheduled_at ? new Date(v.scheduled_at).toISOString() : null,
  });

  const createMut = useMutation({
    mutationFn: (v: FormState) => fnCreate({ data: { tenantId: tenantId!, ...buildPayload(v) } }),
    onSuccess: () => { toast.success("Đã tạo chiến dịch"); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });
  const updateMut = useMutation({
    mutationFn: (v: FormState & { id: string }) => fnUpdate({ data: { id: v.id, ...buildPayload(v) } }),
    onSuccess: () => { toast.success("Đã cập nhật"); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Đã xoá"); setDeletingId(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });
  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: Status }) => fnSetStatus({ data: v }),
    onSuccess: () => { toast.success("Đã cập nhật trạng thái"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });

  const items = (list.data?.items ?? []) as CampaignRow[];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Tên không được trống"); return; }
    if (editing.id) updateMut.mutate({ ...editing, id: editing.id });
    else createMut.mutate(editing);
  };

  if (!tenantId) {
    return <div className="p-8 text-sm text-muted-foreground">Chọn workspace để quản lý chiến dịch.</div>;
  }

  const s = stats.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Marketing & Campaign"
        sub="Triển khai chiến dịch đa kênh — Email, Zalo, SMS, Push."
        action={
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4" /> Tạo chiến dịch
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Megaphone} label="Chiến dịch đang chạy" value={(s?.active ?? 0).toLocaleString("vi-VN")} delta={0} deltaLabel="" tone="primary" />
        <KpiCard icon={Eye} label="Lượt mở" value={(s?.opened ?? 0).toLocaleString("vi-VN")} delta={0} deltaLabel="" tone="indigo" />
        <KpiCard icon={MousePointerClick} label="CTR trung bình" value={`${(s?.ctr ?? 0).toFixed(1)}%`} delta={0} deltaLabel="" tone="green" />
        <KpiCard icon={TrendingUp} label="Đã gửi" value={(s?.sent ?? 0).toLocaleString("vi-VN")} delta={0} deltaLabel="" tone="amber" />
      </div>

      <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
          <form onSubmit={onSubmitSearch} className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              placeholder="Tìm theo tên chiến dịch…"
            />
          </form>
          <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Kênh" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kênh</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="zalo">Zalo</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="push">Push</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="draft">Nháp</SelectItem>
              <SelectItem value="scheduled">Lên lịch</SelectItem>
              <SelectItem value="running">Đang chạy</SelectItem>
              <SelectItem value="paused">Tạm dừng</SelectItem>
              <SelectItem value="completed">Hoàn tất</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                <th className="px-5 py-3 font-semibold">Tên</th>
                <th className="px-3 py-3 font-semibold">Kênh</th>
                <th className="px-3 py-3 font-semibold">Đã gửi</th>
                <th className="px-3 py-3 font-semibold">Open</th>
                <th className="px-3 py-3 font-semibold">Click</th>
                <th className="px-3 py-3 font-semibold">Trạng thái</th>
                <th className="px-3 py-3 font-semibold text-right pr-5">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.isLoading && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Đang tải…</td></tr>
              )}
              {!list.isLoading && items.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Chưa có chiến dịch nào.</td></tr>
              )}
              {items.map((r) => {
                const CH = CHANNEL_META[r.channel]?.icon ?? Mail;
                const st = STATUS_META[r.status] ?? STATUS_META.draft;
                const sent = r.stats?.sent ?? 0;
                const opened = r.stats?.opened ?? 0;
                const clicked = r.stats?.clicked ?? 0;
                const openPct = sent > 0 ? ((opened / sent) * 100).toFixed(0) + "%" : "—";
                const clickPct = opened > 0 ? ((clicked / opened) * 100).toFixed(0) + "%" : "—";
                const canRun = r.status !== "running" && r.status !== "completed";
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-[11.5px] text-muted-foreground">
                        {r.scheduled_at ? new Date(r.scheduled_at).toLocaleString("vi-VN") : new Date(r.created_at).toLocaleDateString("vi-VN")}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[12px]">
                        <CH className="h-4 w-4 text-primary" />
                        {CHANNEL_META[r.channel]?.label ?? r.channel}
                      </span>
                    </td>
                    <td className="px-3 py-3">{sent.toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-3 font-semibold">{openPct}</td>
                    <td className="px-3 py-3 font-semibold text-emerald-600">{clickPct}</td>
                    <td className="px-3 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1 pr-2">
                        {canRun ? (
                          <Button size="icon" variant="ghost" title="Chạy"
                            onClick={() => statusMut.mutate({ id: r.id, status: "running" })}>
                            <Play className="h-4 w-4 text-emerald-600" />
                          </Button>
                        ) : r.status === "running" ? (
                          <Button size="icon" variant="ghost" title="Tạm dừng"
                            onClick={() => statusMut.mutate({ id: r.id, status: "paused" })}>
                            <Pause className="h-4 w-4 text-orange-600" />
                          </Button>
                        ) : null}
                        <Button size="icon" variant="ghost" onClick={() => setEditing({
                          id: r.id,
                          name: r.name,
                          channel: r.channel,
                          status: r.status,
                          subject: r.template?.subject ?? "",
                          content: r.template?.content ?? "",
                          audience_note: r.audience?.note ?? "",
                          scheduled_at: toLocalInput(r.scheduled_at),
                        })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeletingId(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-[12.5px]">
          <div className="text-muted-foreground">
            {total === 0 ? "0" : `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, total)}`} / {total.toLocaleString("vi-VN")}
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-[12.5px]">Trang {page} / {totalPages}</span>
            <Button size="icon" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa chiến dịch" : "Tạo chiến dịch"}</DialogTitle>
            <DialogDescription>Cấu hình kênh, nội dung và lịch gửi.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={submitForm} className="space-y-3">
              <Field label="Tên chiến dịch *">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kênh *">
                  <Select value={editing.channel} onValueChange={(v) => setEditing({ ...editing, channel: v as Channel })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="zalo">Zalo</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Trạng thái">
                  <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as Status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Nháp</SelectItem>
                      <SelectItem value="scheduled">Lên lịch</SelectItem>
                      <SelectItem value="running">Đang chạy</SelectItem>
                      <SelectItem value="paused">Tạm dừng</SelectItem>
                      <SelectItem value="completed">Hoàn tất</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {editing.channel === "email" && (
                <Field label="Tiêu đề email">
                  <Input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
                </Field>
              )}
              <Field label="Nội dung">
                <textarea
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[100px]"
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                />
              </Field>
              <Field label="Đối tượng (ghi chú)">
                <Input
                  value={editing.audience_note}
                  onChange={(e) => setEditing({ ...editing, audience_note: e.target.value })}
                  placeholder="VD: Leads Vinhomes OP2 — tương tác 30 ngày"
                />
              </Field>
              <Field label="Lịch gửi">
                <Input
                  type="datetime-local"
                  value={editing.scheduled_at}
                  onChange={(e) => setEditing({ ...editing, scheduled_at: e.target.value })}
                />
              </Field>
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
            <AlertDialogTitle>Xoá chiến dịch?</AlertDialogTitle>
            <AlertDialogDescription>Chiến dịch sẽ bị xoá khỏi danh sách.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMut.mutate(deletingId)}>
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12.5px] font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
