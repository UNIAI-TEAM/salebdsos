// Trang quản lý khách hàng cho sale trên điện thoại (PWA):
// thêm khách mới, ghi lịch hẹn, ghi note — mọi thao tác tự lên timeline.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Search, Plus, CalendarPlus, StickyNote, Phone, MessageSquare, ChevronRight } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { warmOfflineCache } from "@/lib/pwa";
import { listCustomers, createCustomer } from "@/lib/customer.functions";
import { createCustomerAppointment, addCustomerNote } from "@/lib/customer-detail.functions";

export const Route = createFileRoute("/_app/sale-customers")({
  head: () => ({
    meta: [
      { title: "Khách hàng của tôi — SaleBDS OS" },
      { name: "description", content: "Sale thêm khách mới, đặt lịch hẹn và ghi note ngay trên điện thoại, tự đồng bộ timeline." },
      { property: "og:title", content: "Khách hàng của tôi — SaleBDS OS" },
      { property: "og:description", content: "Thêm khách, đặt lịch hẹn và ghi note ngay trên điện thoại." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SaleCustomersPage,
});

function localInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function SaleCustomersPage() {
  const { currentTenant, canEdit } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [apptFor, setApptFor] = useState<{ id: string; name: string } | null>(null);
  const [noteFor, setNoteFor] = useState<{ id: string; name: string } | null>(null);

  const fnList = useServerFn(listCustomers);
  const fnCreate = useServerFn(createCustomer);
  const fnAppt = useServerFn(createCustomerAppointment);
  const fnNote = useServerFn(addCustomerNote);

  const customers = useQuery({
    queryKey: ["sale-customers", tenantId, q],
    queryFn: () => fnList({ data: { tenantId: tenantId!, search: q || undefined, page: 1, pageSize: 50 } }),
    enabled: !!tenantId,
  });

  useEffect(() => {
    void warmOfflineCache(["/sale-customers", "/timeline", "/sale-projects"]);
  }, []);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sale-customers", tenantId] });
    qc.invalidateQueries({ queryKey: ["sale-timeline", tenantId] });
  };

  // Thêm khách mới
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", notes: "" });
  const create = useMutation({
    mutationFn: () =>
      fnCreate({
        data: {
          tenantId: tenantId!,
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Đã thêm khách mới");
      setAddOpen(false);
      setForm({ full_name: "", phone: "", email: "", notes: "" });
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Không thêm được khách"),
  });

  // Lịch hẹn
  const [appt, setAppt] = useState({ title: "", location: "", starts_at: "", minutes: 60 });
  const saveAppt = useMutation({
    mutationFn: () => {
      const start = new Date(appt.starts_at);
      return fnAppt({
        data: {
          tenantId: tenantId!,
          customerId: apptFor!.id,
          title: appt.title.trim(),
          location: appt.location.trim() || null,
          starts_at: start.toISOString(),
          ends_at: new Date(start.getTime() + appt.minutes * 60000).toISOString(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Đã ghi lịch hẹn, đã lên timeline");
      setApptFor(null);
      invalidate();
      qc.invalidateQueries({ queryKey: ["appointments", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message || "Không lưu được lịch hẹn"),
  });

  // Note
  const [note, setNote] = useState("");
  const saveNote = useMutation({
    mutationFn: () => fnNote({ data: { tenantId: tenantId!, customerId: noteFor!.id, note: note.trim() } }),
    onSuccess: () => {
      toast.success("Đã ghi note, đã lên timeline");
      setNoteFor(null);
      setNote("");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Không lưu được note"),
  });

  const items = (customers.data?.items ?? []) as any[];

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <PageHeader
        title="Khách hàng của tôi"
        sub="Thêm khách, ghi lịch hẹn và note — tự đồng bộ lên timeline."
        action={
          canEdit ? (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Thêm khách
            </Button>
          ) : undefined
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên, số điện thoại…"
          className="pl-9"
          inputMode="search"
        />
      </div>

      {customers.isLoading ? (
        <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Chưa có khách nào. Bấm “Thêm khách” để bắt đầu.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((c) => (
            <li key={c.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {(c.full_name || "?").trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{c.full_name}</p>
                    {c.company && <Badge variant="secondary" className="shrink-0 text-[10px]">{c.company}</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {[c.phone, c.email].filter(Boolean).join(" • ") || "Chưa có liên hệ"}
                  </p>
                </div>
                <Link
                  to="/customers/$id"
                  params={{ id: c.id }}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label="Xem chi tiết khách"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button variant="outline" size="sm" className="h-9 justify-center text-xs"
                  onClick={() => {
                    setAppt({ title: `Gặp ${c.full_name}`, location: "", starts_at: localInput(new Date(Date.now() + 3600_000)), minutes: 60 });
                    setApptFor({ id: c.id, name: c.full_name });
                  }}>
                  <CalendarPlus className="mr-1 h-3.5 w-3.5" /> Lịch hẹn
                </Button>
                <Button variant="outline" size="sm" className="h-9 justify-center text-xs"
                  onClick={() => { setNote(""); setNoteFor({ id: c.id, name: c.full_name }); }}>
                  <StickyNote className="mr-1 h-3.5 w-3.5" /> Ghi note
                </Button>
                {c.phone ? (
                  <>
                    <Button asChild variant="outline" size="sm" className="h-9 justify-center text-xs">
                      <a href={`tel:${c.phone}`}><Phone className="mr-1 h-3.5 w-3.5" /> Gọi</a>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-9 justify-center text-xs">
                      <a href={`https://zalo.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                        <MessageSquare className="mr-1 h-3.5 w-3.5" /> Zalo
                      </a>
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Thêm khách mới */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Thêm khách mới</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Tên khách *" value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            <Input placeholder="Số điện thoại" inputMode="tel" value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input placeholder="Email" inputMode="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Textarea placeholder="Ghi chú nhu cầu, ngân sách…" rows={3} value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            <Button className="w-full" disabled={!form.full_name.trim() || create.isPending}
              onClick={() => create.mutate()}>
              {create.isPending ? "Đang lưu…" : "Lưu khách"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lịch hẹn */}
      <Dialog open={!!apptFor} onOpenChange={(o) => !o && setApptFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Lịch hẹn với {apptFor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nội dung hẹn *" value={appt.title}
              onChange={(e) => setAppt((a) => ({ ...a, title: e.target.value }))} />
            <Input placeholder="Địa điểm" value={appt.location}
              onChange={(e) => setAppt((a) => ({ ...a, location: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="datetime-local" value={appt.starts_at}
                onChange={(e) => setAppt((a) => ({ ...a, starts_at: e.target.value }))} />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={appt.minutes}
                onChange={(e) => setAppt((a) => ({ ...a, minutes: Number(e.target.value) }))}
              >
                <option value={30}>30 phút</option>
                <option value={60}>1 giờ</option>
                <option value={90}>1 giờ 30</option>
                <option value={120}>2 giờ</option>
              </select>
            </div>
            <Button className="w-full" disabled={!appt.title.trim() || !appt.starts_at || saveAppt.isPending}
              onClick={() => saveAppt.mutate()}>
              {saveAppt.isPending ? "Đang lưu…" : "Ghi lịch hẹn"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note */}
      <Dialog open={!!noteFor} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ghi note cho {noteFor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea rows={4} placeholder="Khách quan tâm căn 2PN, hẹn xem nhà cuối tuần…"
              value={note} onChange={(e) => setNote(e.target.value)} />
            <Button className="w-full" disabled={!note.trim() || saveNote.isPending} onClick={() => saveNote.mutate()}>
              {saveNote.isPending ? "Đang lưu…" : "Lưu note"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
