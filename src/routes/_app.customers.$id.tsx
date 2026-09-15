import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { warmOfflineCache } from "@/lib/pwa";
import {
  ArrowLeft, Plus, Wallet, CalendarClock, History, Trash2, GitBranch, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  getCustomerDetail, createCustomerTransaction, deleteCustomerTransaction,
  createCustomerAppointment, updateCustomerAppointmentStatus,
} from "@/lib/customer-detail.functions";
import { toast } from "sonner";
import { QuickContact } from "@/components/app/quick-contact";


export const Route = createFileRoute("/_app/customers/$id")({
  head: () => ({
    meta: [
      { title: "Chi tiết khách hàng — SaleBDS OS" },
      { name: "description", content: "Lịch sử giao dịch, lịch gặp và timeline của khách hàng." },
      { property: "og:title", content: "Chi tiết khách hàng — SaleBDS OS" },
      { property: "og:description", content: "Lịch sử giao dịch, lịch gặp và timeline của khách hàng." },
    ],
  }),
  component: CustomerDetailPage,
});

const kindLabel: Record<string, string> = {
  deposit: "Đặt cọc",
  payment: "Thanh toán",
  contract: "Hợp đồng",
  refund: "Hoàn tiền",
  other: "Khác",
};
const txStatusLabel: Record<string, string> = {
  pending: "Chờ xử lý",
  completed: "Hoàn tất",
  canceled: "Đã huỷ",
};
const apptStatusLabel: Record<string, string> = {
  scheduled: "Đã đặt",
  completed: "Đã gặp",
  canceled: "Đã huỷ",
  no_show: "Không đến",
};
const actionLabel: Record<string, string> = {
  "customer.transaction": "Ghi nhận giao dịch",
  "customer.transaction_deleted": "Xoá giao dịch",
  "customer.appointment": "Tạo lịch gặp",
  "customer.appointment_status": "Cập nhật lịch gặp",
};

const money = (n: number, c = "VND") =>
  `${Number(n || 0).toLocaleString("vi-VN")} ${c}`;
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString("vi-VN") : "—");

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const { currentTenant, canEdit } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const fnDetail = useServerFn(getCustomerDetail);
  const fnCreateTx = useServerFn(createCustomerTransaction);
  const fnDeleteTx = useServerFn(deleteCustomerTransaction);
  const fnCreateAppt = useServerFn(createCustomerAppointment);
  const fnApptStatus = useServerFn(updateCustomerAppointmentStatus);

  const detail = useQuery({
    queryKey: ["customer-detail", tenantId, id],
    queryFn: () => fnDetail({ data: { tenantId: tenantId!, id } }),
    enabled: !!tenantId,
  });

  // Lưu trước trang khách này để xem lại khi mất mạng.
  useEffect(() => {
    if (!detail.data) return;
    warmOfflineCache([`/customers/${id}`, "/customers", "/timeline"]);
  }, [detail.data, id]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["customer-detail", tenantId, id] });
    qc.invalidateQueries({ queryKey: ["pipeline", tenantId] });
    qc.invalidateQueries({ queryKey: ["appointments", tenantId] });
  };

  const [txOpen, setTxOpen] = useState(false);
  const [tx, setTx] = useState({
    kind: "deposit",
    amount: "",
    status: "completed",
    note: "",
    project_id: "",
    occurred_at: toLocalInput(new Date()),
    syncPipeline: true,
  });

  const [apptOpen, setApptOpen] = useState(false);
  const [appt, setAppt] = useState({
    title: "Gặp khách tư vấn",
    location: "",
    starts_at: toLocalInput(new Date(Date.now() + 3600_000)),
    ends_at: toLocalInput(new Date(Date.now() + 2 * 3600_000)),
    notes: "",
  });

  const createTxMut = useMutation({
    mutationFn: () =>
      fnCreateTx({
        data: {
          tenantId: tenantId!,
          customerId: id,
          kind: tx.kind as any,
          amount: Number(tx.amount || 0),
          currency: "VND",
          status: tx.status as any,
          note: tx.note || null,
          project_id: tx.project_id || null,
          occurred_at: new Date(tx.occurred_at).toISOString(),
          syncPipeline: tx.syncPipeline,
        },
      }),
    onSuccess: () => {
      toast.success("Đã ghi nhận giao dịch và cập nhật pipeline");
      setTxOpen(false);
      setTx((s) => ({ ...s, amount: "", note: "" }));
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Không lưu được giao dịch"),
  });

  const deleteTxMut = useMutation({
    mutationFn: (txId: string) =>
      fnDeleteTx({ data: { tenantId: tenantId!, id: txId, customerId: id } }),
    onSuccess: () => {
      toast.success("Đã xoá giao dịch");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Không xoá được"),
  });

  const createApptMut = useMutation({
    mutationFn: () =>
      fnCreateAppt({
        data: {
          tenantId: tenantId!,
          customerId: id,
          title: appt.title,
          location: appt.location || null,
          starts_at: new Date(appt.starts_at).toISOString(),
          ends_at: new Date(appt.ends_at).toISOString(),
          notes: appt.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Đã tạo lịch gặp");
      setApptOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Không tạo được lịch gặp"),
  });

  const apptStatusMut = useMutation({
    mutationFn: (v: { apptId: string; status: string }) =>
      fnApptStatus({
        data: { tenantId: tenantId!, customerId: id, id: v.apptId, status: v.status as any },
      }),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e?.message ?? "Không cập nhật được"),
  });

  if (detail.isLoading || (!detail.data && !detail.isError)) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Đang tải...</div>;
  }
  if (detail.isError) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Không tìm thấy khách hàng.{" "}
        <Link to="/customers" className="text-primary underline">Về danh sách</Link>
      </div>
    );
  }

  const d = detail.data!;
  const c: any = d.customer;
  const txs: any[] = d.transactions;
  const totalPaid = txs
    .filter((t) => t.status === "completed" && t.kind !== "refund")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const nextAppt = [...(d.appointments as any[])]
    .filter((a) => a.status === "scheduled" && new Date(a.starts_at) >= new Date())
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0];
  const stageName = (sid: string) =>
    (d.stages as any[]).find((s) => s.id === sid)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link to="/customers" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Khách hàng
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{c.full_name}</h1>
          <p className="text-[13px] text-muted-foreground">
            {[c.phone, c.email, c.company].filter(Boolean).join(" • ") || "Chưa có thông tin liên hệ"}
          </p>
          <QuickContact phone={c.phone} email={c.email} name={c.full_name} />
        </div>
        <div className="flex gap-2">

          <Button variant="outline" disabled={!canEdit} onClick={() => setApptOpen(true)}>
            <CalendarClock className="mr-2 h-4 w-4" /> Đặt lịch gặp
          </Button>
          <Button disabled={!canEdit} onClick={() => setTxOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Ghi nhận giao dịch
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Wallet} label="Tổng giao dịch" value={money(totalPaid)} />
        <Stat icon={History} label="Số giao dịch" value={String(txs.length)} />
        <Stat
          icon={CalendarClock}
          label="Lịch gặp tới"
          value={nextAppt ? dt(nextAppt.starts_at) : "Chưa có"}
        />
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Giao dịch</TabsTrigger>
          <TabsTrigger value="appointments">Lịch gặp</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Thời điểm</th>
                  <th className="px-3 py-3 font-medium">Loại</th>
                  <th className="px-3 py-3 font-medium">Số tiền</th>
                  <th className="px-3 py-3 font-medium">Trạng thái</th>
                  <th className="px-3 py-3 font-medium">Ghi chú</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {txs.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Chưa có giao dịch nào.</td></tr>
                )}
                {txs.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-5 py-3">{dt(t.occurred_at)}</td>
                    <td className="px-3 py-3">{kindLabel[t.kind] ?? t.kind}</td>
                    <td className="px-3 py-3 font-semibold">{money(t.amount, t.currency)}</td>
                    <td className="px-3 py-3">
                      <Badge variant={t.status === "completed" ? "default" : "secondary"}>
                        {txStatusLabel[t.status] ?? t.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{t.note ?? "—"}</td>
                    <td className="px-3 py-3 text-right">
                      <Button size="icon" variant="ghost" disabled={!canEdit}
                        onClick={() => deleteTxMut.mutate(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4 space-y-2">
          {(d.appointments as any[]).length === 0 && (
            <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
              Chưa có lịch gặp nào.
            </div>
          )}
          {(d.appointments as any[]).map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{a.title}</div>
                <div className="text-[12.5px] text-muted-foreground">
                  {dt(a.starts_at)} → {dt(a.ends_at)}{a.location ? ` • ${a.location}` : ""}
                </div>
                {a.notes && <div className="text-[12.5px] text-muted-foreground">{a.notes}</div>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={a.status === "completed" ? "default" : "secondary"}>
                  {apptStatusLabel[a.status] ?? a.status}
                </Badge>
                {a.status === "scheduled" && (
                  <>
                    <Button size="sm" variant="outline" disabled={!canEdit}
                      onClick={() => apptStatusMut.mutate({ apptId: a.id, status: "completed" })}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Đã gặp
                    </Button>
                    <Button size="sm" variant="ghost" disabled={!canEdit}
                      onClick={() => apptStatusMut.mutate({ apptId: a.id, status: "canceled" })}>
                      <X className="mr-1 h-3.5 w-3.5" /> Huỷ
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4 space-y-2">
          {(d.deals as any[]).length === 0 && (
            <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
              Chưa có deal nào. Ghi nhận một giao dịch để tự tạo deal trong pipeline.
            </div>
          )}
          {(d.deals as any[]).map((dl) => (
            <div key={dl.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div>
                <div className="text-sm font-semibold">{dl.title}</div>
                <div className="text-[12.5px] text-muted-foreground">
                  Giai đoạn: {stageName(dl.stage_id)} • {money(dl.value ?? 0, dl.currency ?? "VND")}
                </div>
              </div>
              <Link to="/pipeline" className="inline-flex items-center gap-1.5 text-[12.5px] text-primary">
                <GitBranch className="h-3.5 w-3.5" /> Mở pipeline
              </Link>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <ol className="relative space-y-4 border-l border-border pl-5">
            {(d.timeline as any[]).length === 0 && (
              <li className="text-sm text-muted-foreground">Chưa có hoạt động nào.</li>
            )}
            {(d.timeline as any[]).map((ev) => (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="text-sm font-medium">{actionLabel[ev.action] ?? ev.action}</div>
                <div className="text-[12.5px] text-muted-foreground">{dt(ev.occurred_at)}</div>
                {ev.diff && (
                  <div className="mt-1 text-[12.5px] text-muted-foreground">
                    {ev.diff.amount != null && <>Số tiền: {money(ev.diff.amount, ev.diff.currency)} • </>}
                    {ev.diff.kind && <>Loại: {kindLabel[ev.diff.kind] ?? ev.diff.kind} • </>}
                    {ev.diff.title && <>{ev.diff.title} • </>}
                    {ev.diff.status && <>Trạng thái: {txStatusLabel[ev.diff.status] ?? apptStatusLabel[ev.diff.status] ?? ev.diff.status}</>}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>

      {/* Transaction dialog */}
      <Dialog open={txOpen} onOpenChange={setTxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi nhận giao dịch</DialogTitle>
            <DialogDescription>Giao dịch sẽ được ghi vào timeline và cập nhật pipeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Loại giao dịch">
                <Select value={tx.kind} onValueChange={(v) => setTx({ ...tx, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(kindLabel).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Số tiền (VND)">
                <Input inputMode="numeric" value={tx.amount}
                  onChange={(e) => setTx({ ...tx, amount: e.target.value.replace(/[^\d]/g, "") })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Trạng thái">
                <Select value={tx.status} onValueChange={(v) => setTx({ ...tx, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(txStatusLabel).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Thời điểm">
                <Input type="datetime-local" value={tx.occurred_at}
                  onChange={(e) => setTx({ ...tx, occurred_at: e.target.value })} />
              </Field>
            </div>
            {(d.projects as any[]).length > 0 && (
              <Field label="Dự án (tuỳ chọn)">
                <Select value={tx.project_id || "none"}
                  onValueChange={(v) => setTx({ ...tx, project_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không chọn</SelectItem>
                    {(d.projects as any[]).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Ghi chú">
              <Input value={tx.note} onChange={(e) => setTx({ ...tx, note: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-[12.5px]">
              <input type="checkbox" checked={tx.syncPipeline}
                onChange={(e) => setTx({ ...tx, syncPipeline: e.target.checked })} />
              Tự cập nhật giai đoạn trong pipeline
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxOpen(false)}>Hủy</Button>
            <Button disabled={createTxMut.isPending || !tx.amount} onClick={() => createTxMut.mutate()}>
              Lưu giao dịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appointment dialog */}
      <Dialog open={apptOpen} onOpenChange={setApptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt lịch gặp</DialogTitle>
            <DialogDescription>Lịch gặp sẽ hiện trong mục Lịch hẹn và timeline khách hàng.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Tiêu đề *">
              <Input value={appt.title} onChange={(e) => setAppt({ ...appt, title: e.target.value })} />
            </Field>
            <Field label="Địa điểm">
              <Input value={appt.location} onChange={(e) => setAppt({ ...appt, location: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bắt đầu">
                <Input type="datetime-local" value={appt.starts_at}
                  onChange={(e) => setAppt({ ...appt, starts_at: e.target.value })} />
              </Field>
              <Field label="Kết thúc">
                <Input type="datetime-local" value={appt.ends_at}
                  onChange={(e) => setAppt({ ...appt, ends_at: e.target.value })} />
              </Field>
            </div>
            <Field label="Ghi chú">
              <Input value={appt.notes} onChange={(e) => setAppt({ ...appt, notes: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApptOpen(false)}>Hủy</Button>
            <Button disabled={createApptMut.isPending || !appt.title} onClick={() => createApptMut.mutate()}>
              Tạo lịch gặp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
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
