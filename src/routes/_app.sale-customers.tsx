// Trang quản lý khách hàng cho sale trên điện thoại (PWA):
// thêm khách mới, ghi lịch hẹn, ghi note — mọi thao tác tự lên timeline.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Search, Plus, CalendarPlus, StickyNote, Phone, MessageSquare, ChevronRight, QrCode as QrIcon, Copy, UserPlus } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode } from "@/components/qr-code";
import { warmOfflineCache } from "@/lib/pwa";
import { listCustomers, createCustomer } from "@/lib/customer.functions";
import { createCustomerAppointment, addCustomerNote } from "@/lib/customer-detail.functions";
import { ensureMyQrCard, listMyQrLeads, convertQrLeadToCustomer } from "@/lib/my-qr.functions";


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
  const fnEnsureCard = useServerFn(ensureMyQrCard);
  const fnQrLeads = useServerFn(listMyQrLeads);
  const fnConvert = useServerFn(convertQrLeadToCustomer);

  const customers = useQuery({
    queryKey: ["sale-customers", tenantId, q],
    queryFn: () => fnList({ data: { tenantId: tenantId!, search: q || undefined, page: 1, pageSize: 50 } }),
    enabled: !!tenantId,
  });

  const myCard = useQuery({
    queryKey: ["my-qr-card", tenantId],
    queryFn: () => fnEnsureCard({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  });

  const qrLeads = useQuery({
    queryKey: ["my-qr-leads", tenantId],
    queryFn: () => fnQrLeads({ data: { tenantId: tenantId!, limit: 30 } }),
    enabled: !!tenantId,
  });

  const convertM = useMutation({
    mutationFn: (leadId: string) => fnConvert({ data: { tenantId: tenantId!, leadId } }),
    onSuccess: (r: any) => {
      toast.success(r?.created ? "Đã chuyển thành khách hàng" : "Khách này đã có trong danh sách");
      qc.invalidateQueries({ queryKey: ["my-qr-leads", tenantId] });
      qc.invalidateQueries({ queryKey: ["sale-customers", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message || "Không chuyển được"),
  });

  const cardUrl =
    typeof window !== "undefined" && myCard.data?.slug
      ? `${window.location.origin}/c/${myCard.data.slug}`
      : "";


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

      {/* QR riêng của tôi */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0 self-center">
            {cardUrl ? (
              <QrCode value={cardUrl} size={132} filename={`qr-${myCard.data?.slug ?? "sale"}`} />
            ) : (
              <div className="grid h-[132px] w-[132px] place-items-center rounded-2xl border border-border">
                <QrIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">QR riêng của tôi</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Khách quét mã này sẽ thấy thông tin của bạn và các dự án bạn đang bán. Mọi lượt quét và khách để lại thông tin
              đều tự lên timeline.
            </p>
            {cardUrl && (
              <p className="mt-2 truncate text-xs font-medium text-primary">{cardUrl}</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-xs">
              <Button
                variant="outline"
                size="sm"
                className="h-9 justify-center text-xs"
                disabled={!cardUrl}
                onClick={() => {
                  void navigator.clipboard.writeText(cardUrl);
                  toast.success("Đã copy link");
                }}
              >
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy link
              </Button>
              <Button asChild variant="outline" size="sm" className="h-9 justify-center text-xs">
                <Link to="/digital-card">
                  <QrIcon className="mr-1 h-3.5 w-3.5" /> Sửa danh thiếp
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Khách quét QR */}
      {(qrLeads.data?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">Khách quét QR của tôi</p>
          <ul className="mt-3 space-y-2.5">
            {qrLeads.data!.map((l) => (
              <li key={l.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{l.full_name || l.phone || "Khách quét QR"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[l.phone, l.project_name].filter(Boolean).join(" • ") || "Chưa có liên hệ"}
                    </p>
                  </div>
                  {l.converted_customer_id ? (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">Đã là khách hàng</Badge>
                  ) : null}
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {l.phone && (
                    <>
                      <Button asChild variant="outline" size="sm" className="h-9 justify-center text-xs">
                        <a href={`tel:${l.phone}`}><Phone className="mr-1 h-3.5 w-3.5" /> Gọi</a>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-9 justify-center text-xs">
                        <a href={`https://zalo.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                          <MessageSquare className="mr-1 h-3.5 w-3.5" /> Zalo
                        </a>
                      </Button>
                    </>
                  )}
                  {l.converted_customer_id ? (
                    <Button asChild variant="outline" size="sm" className="h-9 justify-center text-xs">
                      <Link to="/customers/$id" params={{ id: l.converted_customer_id }}>
                        <ChevronRight className="mr-1 h-3.5 w-3.5" /> Xem khách
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-9 justify-center text-xs"
                      disabled={convertM.isPending || !canEdit}
                      onClick={() => convertM.mutate(l.id)}
                    >
                      <UserPlus className="mr-1 h-3.5 w-3.5" /> Thành khách hàng
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}


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
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
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
