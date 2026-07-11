import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Package, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/app/ui";
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
  listProducts, createProduct, updateProduct, deleteProduct,
} from "@/lib/product.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/products")({ component: ProductsPage });

type Row = {
  id: string; sku: string | null; name: string; category: string | null;
  price: number; currency: string; unit: string | null;
  status: "draft" | "active" | "archived";
  description: string | null; image_url: string | null;
};

type FormState = {
  id?: string;
  sku: string; name: string; category: string;
  price: number; currency: string; unit: string;
  status: Row["status"]; description: string; image_url: string;
};

const EMPTY: FormState = {
  sku: "", name: "", category: "",
  price: 0, currency: "VND", unit: "",
  status: "active", description: "", image_url: "",
};

const STATUS_LABEL: Record<Row["status"], string> = {
  draft: "Nháp", active: "Đang bán", archived: "Lưu trữ",
};
const STATUS_TONE: Record<Row["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/10 text-emerald-600",
  archived: "bg-amber-500/10 text-amber-600",
};

function formatMoney(v: number, ccy: string) {
  try { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(v); }
  catch { return `${v.toLocaleString("vi-VN")} ${ccy}`; }
}

function ProductsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fnList = useServerFn(listProducts);
  const fnCreate = useServerFn(createProduct);
  const fnUpdate = useServerFn(updateProduct);
  const fnDelete = useServerFn(deleteProduct);

  const list = useQuery({
    queryKey: ["products", tenantId, search, status, page, pageSize],
    queryFn: () => fnList({ data: { tenantId: tenantId!, search, status, page, pageSize } }),
    enabled: !!tenantId,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["products", tenantId] });

  const createMut = useMutation({
    mutationFn: (v: FormState) => fnCreate({ data: { tenantId: tenantId!, ...v } }),
    onSuccess: () => { toast.success("Đã tạo sản phẩm"); setEditing(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (v: FormState & { id: string }) => fnUpdate({ data: v }),
    onSuccess: () => { toast.success("Đã cập nhật"); setEditing(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Đã xóa"); setDeletingId(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = (list.data?.items ?? []) as unknown as Row[];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Tên bắt buộc"); return; }
    if (editing.price < 0) { toast.error("Giá không hợp lệ"); return; }
    if (editing.id) updateMut.mutate({ ...editing, id: editing.id });
    else createMut.mutate(editing);
  };

  if (!tenantId) return <div className="p-8 text-sm text-muted-foreground">Chọn workspace để quản lý sản phẩm.</div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Sản phẩm" sub="Catalog dịch vụ & sản phẩm phụ trợ."
        action={
          <Button size="sm" onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4 mr-1" /> Thêm sản phẩm
          </Button>
        } />

      <SectionCard title={`Tổng ${total} sản phẩm`} action={
        <div className="flex items-center gap-2">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm tên / SKU…" className="pl-8 h-9 w-56" />
          </form>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Đang bán</SelectItem>
              <SelectItem value="draft">Nháp</SelectItem>
              <SelectItem value="archived">Lưu trữ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }>
        {list.isLoading ? (
          <div className="text-sm text-muted-foreground p-4">Đang tải…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground p-8 text-center">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Chưa có sản phẩm. Bấm "Thêm sản phẩm" để tạo mới.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map((p) => (
              <div key={p.id} className="rounded-2xl bg-card border border-border p-4 shadow-soft hover:shadow-card transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-12 w-12 rounded-xl bg-primary-soft text-primary grid place-items-center overflow-hidden">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <Package className="h-5 w-5" />}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_TONE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                </div>
                <div className="text-[13.5px] font-semibold line-clamp-1">{p.name}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">
                  {p.category || "—"}{p.sku ? ` · SKU ${p.sku}` : ""}
                </div>
                <div className="mt-2 text-[15px] font-bold text-primary">
                  {formatMoney(Number(p.price), p.currency)}
                  {p.unit && <span className="text-[11px] font-normal text-muted-foreground"> / {p.unit}</span>}
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => setEditing({
                    id: p.id, sku: p.sku ?? "", name: p.name, category: p.category ?? "",
                    price: Number(p.price), currency: p.currency, unit: p.unit ?? "",
                    status: p.status, description: p.description ?? "", image_url: p.image_url ?? "",
                  })}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Sửa
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeletingId(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 mt-4 text-[12px]">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground">Trang {page}/{totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SectionCard>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa sản phẩm" : "Thêm sản phẩm"}</DialogTitle>
            <DialogDescription>Thông tin sản phẩm / dịch vụ trong catalog.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold">Tên *</label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold">SKU</label>
                  <Input value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
                </div>
                <div>
                  <label className="text-[12px] font-semibold">Danh mục</label>
                  <Input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[12px] font-semibold">Giá</label>
                  <Input type="number" min={0} step="1000" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-[12px] font-semibold">Tiền tệ</label>
                  <Input value={editing.currency} onChange={(e) => setEditing({ ...editing, currency: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold">Đơn vị</label>
                  <Input value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="cái, gói, m²…" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold">Trạng thái</label>
                  <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as Row["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Đang bán</SelectItem>
                      <SelectItem value="draft">Nháp</SelectItem>
                      <SelectItem value="archived">Lưu trữ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-[12px] font-semibold">URL ảnh</label>
                <Input value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://…" />
              </div>
              <div>
                <label className="text-[12px] font-semibold">Mô tả</label>
                <Textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
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
            <AlertDialogTitle>Xóa sản phẩm?</AlertDialogTitle>
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
