import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { warmOfflineCache } from "@/lib/pwa";
import { getCustomerDetail } from "@/lib/customer-detail.functions";
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Users2, Upload } from "lucide-react";
import { ImportCustomersDialog } from "@/components/customers/import-csv-dialog";
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
import { useAuth } from "@/hooks/use-auth";
import {
  listCustomers, createCustomer, updateCustomer, deleteCustomer,
} from "@/lib/customer.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/customers/")({ component: CustomersPage });

type CustomerRow = {
  id: string; full_name: string; email: string | null; phone: string | null;
  company: string | null; notes: string | null; created_at: string;
};
type FormState = {
  id?: string; full_name: string; email: string; phone: string; company: string; notes: string;
};
const EMPTY: FormState = { full_name: "", email: "", phone: "", company: "", notes: "" };

function CustomersPage() {
  const { currentTenant, canEdit } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const fnList = useServerFn(listCustomers);
  const fnCreate = useServerFn(createCustomer);
  const fnUpdate = useServerFn(updateCustomer);
  const fnDelete = useServerFn(deleteCustomer);
  const fnDetail = useServerFn(getCustomerDetail);

  const list = useQuery({
    queryKey: ["customers", tenantId, search, page, pageSize],
    queryFn: () => fnList({ data: { tenantId: tenantId!, search, page, pageSize } }),
    enabled: !!tenantId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["customers", tenantId] });

  const createMut = useMutation({
    mutationFn: (v: FormState) =>
      fnCreate({ data: { tenantId: tenantId!, ...v } }),
    onSuccess: () => { toast.success("Đã thêm khách hàng"); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });
  const updateMut = useMutation({
    mutationFn: (v: FormState & { id: string }) => fnUpdate({ data: v }),
    onSuccess: () => { toast.success("Đã cập nhật"); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Đã xóa"); setDeletingId(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });

  const items = (list.data?.items ?? []) as CustomerRow[];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Lưu trước danh sách + chi tiết khách (giao dịch, lịch hẹn) để xem khi mất mạng.
  useEffect(() => {
    if (!tenantId || items.length === 0) return;
    const top = items.slice(0, 8);
    warmOfflineCache(["/customers", "/timeline", ...top.map((c) => `/customers/${c.id}`)]);
    top.forEach((c) => {
      void qc
        .prefetchQuery({
          queryKey: ["customer-detail", tenantId, c.id],
          queryFn: () => fnDetail({ data: { tenantId, id: c.id } }),
          staleTime: 60_000,
        })
        .catch(() => {});
    });
  }, [tenantId, items, qc, fnDetail]);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.full_name.trim()) { toast.error("Tên không được trống"); return; }
    if (editing.id) updateMut.mutate({ ...editing, id: editing.id });
    else createMut.mutate(editing);
  };

  if (!tenantId) {
    return <div className="p-8 text-sm text-muted-foreground">Chọn workspace để quản lý khách hàng.</div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Khách hàng" sub="Quản lý và chăm sóc khách hàng." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={Users2} label="Tổng khách hàng" value={total.toLocaleString("vi-VN")} delta={0} deltaLabel="" tone="primary" />
      </div>

      <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-border">
          <form onSubmit={onSubmitSearch} className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              placeholder="Tìm theo tên, email, SĐT, công ty…"
            />
          </form>
          <Button type="button" variant="outline" onClick={onSubmitSearch}>Tìm</Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" disabled={!canEdit} onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Button disabled={!canEdit} onClick={() => setEditing({ ...EMPTY })}>
              <Plus className="h-4 w-4" /> Thêm khách hàng
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                <th className="px-5 py-3 font-semibold">Họ tên</th>
                <th className="px-3 py-3 font-semibold">SĐT</th>
                <th className="px-3 py-3 font-semibold">Email</th>
                <th className="px-3 py-3 font-semibold">Công ty</th>
                <th className="px-3 py-3 font-semibold">Tạo lúc</th>
                <th className="px-3 py-3 font-semibold text-right pr-5">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.isLoading && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">Đang tải…</td></tr>
              )}
              {!list.isLoading && items.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">Chưa có khách hàng nào.</td></tr>
              )}
              {items.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-3 font-semibold">
                    <Link to="/customers/$id" params={{ id: r.id }} className="hover:text-primary hover:underline">
                      {r.full_name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{r.phone ?? "—"}</td>
                  <td className="px-3 py-3">{r.email ?? "—"}</td>
                  <td className="px-3 py-3">{r.company ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1 pr-2">
                      <Button size="icon" variant="ghost" disabled={!canEdit} onClick={() => setEditing({
                        id: r.id,
                        full_name: r.full_name,
                        email: r.email ?? "",
                        phone: r.phone ?? "",
                        company: r.company ?? "",
                        notes: r.notes ?? "",
                      })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" disabled={!canEdit} onClick={() => setDeletingId(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* Edit/Create dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa khách hàng" : "Thêm khách hàng"}</DialogTitle>
            <DialogDescription>Nhập thông tin khách hàng.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={submitForm} className="space-y-3">
              <Field label="Họ và tên *">
                <Input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="SĐT">
                  <Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </Field>
              </div>
              <Field label="Công ty">
                <Input value={editing.company} onChange={(e) => setEditing({ ...editing, company: e.target.value })} />
              </Field>
              <Field label="Ghi chú">
                <textarea
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[80px]"
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {editing.id ? "Lưu" : "Thêm"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ImportCustomersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tenantId={tenantId}
        onDone={() => qc.invalidateQueries({ queryKey: ["customers", tenantId] })}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khách hàng?</AlertDialogTitle>
            <AlertDialogDescription>Bản ghi sẽ bị xóa khỏi danh sách.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMut.mutate(deletingId)}>
              Xóa
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
