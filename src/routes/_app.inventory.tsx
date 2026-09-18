import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Building2, Plus, LayoutGrid, Upload, Pencil, Trash2, Search, History, Rows3, Table2,
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { parseCsv } from "@/lib/csv-import";
import {
  KindPriceTable, KindStatusBoard, groupUnitsByKind, type UnitLike,
} from "@/components/inventory/kind-tables";
import {
  KIND_CONFIG, KIND_OPTIONS, LISTING_STATUSES, LISTING_STATUS_LABEL,
  LISTING_STATUS_TONE, OPEN_STATUSES, kindLabel,
  type FieldDef, type ListingStatus, type PropertyKind,
} from "@/lib/property-types";
import {
  listInventory, listInventoryProjects, createInventoryItem, updateInventoryItem,
  deleteInventoryItem, changeListingStatus, listStatusHistory, bulkCreateInventory,
  importInventory,
} from "@/lib/inventory.functions";

export const Route = createFileRoute("/_app/inventory")({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s["projectId"] === "string" ? s["projectId"] : undefined,
  }),
  component: InventoryPage,
});

type Row = {
  id: string;
  project_id: string | null;
  product_type: PropertyKind | null;
  name: string;
  code: string | null;
  zone: string | null;
  floor: number | null;
  area: number | null;
  usable_area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  direction: string | null;
  legal_status: string | null;
  price: number;
  currency: string;
  listing_status: ListingStatus;
  hold_expires_at: string | null;
  is_public: boolean;
  description: string | null;
  attributes: Record<string, unknown> | null;
};

type FormState = {
  id?: string;
  project_id: string | null;
  product_type: PropertyKind;
  code: string;
  zone: string;
  floor: string;
  area: string;
  usable_area: string;
  bedrooms: string;
  bathrooms: string;
  direction: string;
  legal_status: string;
  price: string;
  currency: string;
  listing_status: ListingStatus;
  is_public: boolean;
  description: string;
  attrs: Record<string, string>;
};

const emptyForm = (kind: PropertyKind, projectId: string | null): FormState => ({
  project_id: projectId,
  product_type: kind,
  code: "", zone: "", floor: "", area: "", usable_area: "",
  bedrooms: "", bathrooms: "", direction: "", legal_status: "",
  price: "0", currency: "VND", listing_status: "available",
  is_public: false, description: "", attrs: {},
});

const num = (v: string) => {
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function money(v: number, ccy = "VND") {
  if (!v) return "—";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(v % 1_000_000_000 === 0 ? 0 : 1)} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} tr`;
  return `${v.toLocaleString("vi-VN")} ${ccy}`;
}

function InventoryPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const search = Route.useSearch();
  const qc = useQueryClient();

  const [projectId, setProjectId] = useState<string>(search.projectId ?? "all");
  const [kind, setKind] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [zone, setZone] = useState<string>("all");
  const [term, setTerm] = useState("");
  const [termInput, setTermInput] = useState("");
  const [view, setView] = useState<"grid" | "price" | "table">("grid");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<Row | null>(null);
  const [statusNext, setStatusNext] = useState<ListingStatus>("reserved");
  const [statusNote, setStatusNote] = useState("");
  const [holdUntil, setHoldUntil] = useState("");
  const [historyFor, setHistoryFor] = useState<Row | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);

  const fnList = useServerFn(listInventory);
  const fnProjects = useServerFn(listInventoryProjects);
  const fnCreate = useServerFn(createInventoryItem);
  const fnUpdate = useServerFn(updateInventoryItem);
  const fnDelete = useServerFn(deleteInventoryItem);
  const fnStatus = useServerFn(changeListingStatus);
  const fnHistory = useServerFn(listStatusHistory);
  const fnBulk = useServerFn(bulkCreateInventory);
  const fnImport = useServerFn(importInventory);

  const projects = useQuery({
    queryKey: ["inventory-projects", tenantId],
    queryFn: () => fnProjects({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const list = useQuery({
    queryKey: ["inventory", tenantId, projectId, kind, statusFilter, zone, term],
    queryFn: () =>
      fnList({
        data: {
          tenantId: tenantId!,
          projectId: projectId === "all" ? null : projectId,
          kind,
          listingStatus: statusFilter,
          zone,
          search: term,
          pageSize: 300,
        },
      }),
    enabled: !!tenantId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["inventory", tenantId] });

  const saveMut = useMutation({
    mutationFn: async (v: FormState) => {
      const payload = {
        project_id: v.project_id,
        product_type: v.product_type,
        code: v.code || null,
        zone: v.zone || null,
        floor: v.floor ? num(v.floor) : null,
        area: v.area ? num(v.area) : null,
        usable_area: v.usable_area ? num(v.usable_area) : null,
        bedrooms: v.bedrooms ? num(v.bedrooms) : null,
        bathrooms: v.bathrooms ? num(v.bathrooms) : null,
        direction: v.direction || null,
        legal_status: v.legal_status || null,
        price: num(v.price) ?? 0,
        currency: v.currency || "VND",
        listing_status: v.listing_status,
        is_public: v.is_public,
        description: v.description || null,
        attributes: v.attrs as Record<string, unknown>,
      };
      return v.id
        ? fnUpdate({ data: { id: v.id, ...payload } })
        : fnCreate({ data: { tenantId: tenantId!, ...payload } });
    },
    onSuccess: () => { toast.success("Đã lưu sản phẩm"); setEditing(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Đã xoá"); setDeletingId(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: () =>
      fnStatus({
        data: {
          id: statusTarget!.id,
          listing_status: statusNext,
          note: statusNote || null,
          hold_expires_at: holdUntil || null,
        },
      }),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      setStatusTarget(null); setStatusNote(""); setHoldUntil("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMut = useMutation({
    mutationFn: (v: {
      zone: string; floorFrom: number; floorTo: number; perFloor: number;
      codePattern: string; product_type: PropertyKind; useFloors: boolean;
      area: number | null; bedrooms: number | null; price: number;
    }) =>
      fnBulk({
        data: {
          tenantId: tenantId!,
          project_id: projectId === "all" ? null : projectId,
          currency: "VND",
          ...v,
        },
      }),
    onSuccess: (r) => { toast.success(`Đã tạo ${r.created} sản phẩm`); setBulkOpen(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const history = useQuery({
    queryKey: ["inventory-history", historyFor?.id],
    queryFn: () => fnHistory({ data: { productId: historyFor!.id } }),
    enabled: !!historyFor,
  });

  const rows = (list.data?.items ?? []) as unknown as Row[];
  const byStatus = list.data?.byStatus ?? {};
  const totalAll = list.data?.totalAll ?? 0;
  const zones = list.data?.zones ?? [];
  const openCount = OPEN_STATUSES.reduce((s, k) => s + (byStatus[k] ?? 0), 0);
  const soldCount = (byStatus["sold"] ?? 0) + (byStatus["contracted"] ?? 0);
  const absorption = totalAll ? Math.round((soldCount / totalAll) * 100) : 0;

  const activeKind: PropertyKind =
    kind !== "all" ? (kind as PropertyKind) : (rows[0]?.product_type ?? "apartment");
  const viewMode = KIND_CONFIG[activeKind].view;

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const key =
        viewMode === "floor-grid"
          ? `${r.zone ?? "—"} • Tầng ${r.floor ?? "—"}`
          : viewMode === "zone-grid"
            ? `Khu ${r.zone ?? "—"}`
            : "Danh sách";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [rows, viewMode]);

  const kindGroups = useMemo(() => groupUnitsByKind(rows as unknown as UnitLike[]), [rows]);

  const openEdit = (r?: Row) => {
    if (!r) {
      setEditing(emptyForm(kind === "all" ? "apartment" : (kind as PropertyKind), projectId === "all" ? null : projectId));
      return;
    }
    setEditing({
      id: r.id,
      project_id: r.project_id,
      product_type: r.product_type ?? "apartment",
      code: r.code ?? "", zone: r.zone ?? "",
      floor: r.floor?.toString() ?? "",
      area: r.area?.toString() ?? "",
      usable_area: r.usable_area?.toString() ?? "",
      bedrooms: r.bedrooms?.toString() ?? "",
      bathrooms: r.bathrooms?.toString() ?? "",
      direction: r.direction ?? "", legal_status: r.legal_status ?? "",
      price: r.price?.toString() ?? "0", currency: r.currency ?? "VND",
      listing_status: r.listing_status, is_public: r.is_public,
      description: r.description ?? "",
      attrs: Object.fromEntries(
        Object.entries(r.attributes ?? {}).map(([k, v]) => [k, v == null ? "" : String(v)]),
      ),
    });
  };

  const onFile = async (f: File) => {
    const text = await f.text();
    const { rows: parsed } = parseCsv(text);
    if (!parsed.length) { toast.error("Tệp không có dữ liệu"); return; }
    setImportRows(parsed.slice(0, 500));
  };

  const doImport = () => {
    const k = kind === "all" ? "apartment" : (kind as PropertyKind);
    const cfg = KIND_CONFIG[k];
    const mapped = importRows.map((r) => {
      const get = (...names: string[]) => {
        for (const n of names) {
          const hit = Object.keys(r).find((h) => h.trim().toLowerCase() === n.toLowerCase());
          if (hit && r[hit]) return r[hit];
        }
        return "";
      };
      const attrs: Record<string, unknown> = {};
      for (const f of cfg.fields.filter((x) => x.store === "attr")) {
        const v = get(f.key, f.label);
        if (v) attrs[f.key] = f.type === "number" ? num(v) : v;
      }
      return {
        code: get("code", cfg.codeLabel, "ma", "mã") || null,
        zone: get("zone", cfg.zoneLabel, "khu", "toa", "toà") || null,
        floor: num(get("floor", "tang", "tầng")) ?? null,
        area: num(get("area", "dien tich", "diện tích")) ?? null,
        bedrooms: num(get("bedrooms", "phong ngu", "phòng ngủ")) ?? null,
        bathrooms: num(get("bathrooms", "phong tam", "phòng tắm")) ?? null,
        direction: get("direction", "huong", "hướng") || null,
        legal_status: get("legal_status", "phap ly", "pháp lý") || null,
        price: num(get("price", "gia", "giá")) ?? 0,
        attributes: attrs,
      };
    });
    fnImport({
      data: {
        tenantId: tenantId!,
        project_id: projectId === "all" ? null : projectId,
        product_type: k,
        rows: mapped,
      },
    })
      .then((r) => {
        toast.success(`Đã nhập ${r.created} sản phẩm`);
        setImportOpen(false); setImportRows([]); invalidate();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  if (!tenantId)
    return <div className="p-8 text-sm text-muted-foreground">Chọn workspace để quản lý giỏ hàng.</div>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Giỏ hàng dự án"
        sub="Căn hộ, đất nền, nhà phố và nhà ở xã hội — trạng thái bán theo thời gian thực."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" /> Nhập tệp
            </Button>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <LayoutGrid className="mr-1.5 h-4 w-4" /> Tạo hàng loạt
            </Button>
            <Button onClick={() => openEdit()}>
              <Plus className="mr-1.5 h-4 w-4" /> Thêm sản phẩm
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Tổng sản phẩm", value: totalAll },
          { label: "Còn trống", value: openCount },
          { label: "Đã bán / ký HĐ", value: soldCount },
          { label: "Tỷ lệ hấp thụ", value: `${absorption}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <SectionCard title="Bộ lọc">
        <div className="grid gap-3 md:grid-cols-5">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger><SelectValue placeholder="Dự án" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả dự án</SelectItem>
              {(projects.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger><SelectValue placeholder="Loại hình" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại hình</SelectItem>
              {KIND_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi trạng thái</SelectItem>
              {LISTING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {LISTING_STATUS_LABEL[s]} ({byStatus[s] ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger><SelectValue placeholder="Khu / toà" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khu / toà</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z} value={z}>{z}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <form
            onSubmit={(e) => { e.preventDefault(); setTerm(termInput.trim()); }}
            className="flex gap-2"
          >
            <Input
              value={termInput}
              onChange={(e) => setTermInput(e.target.value)}
              placeholder="Tìm mã căn / lô"
            />
            <Button type="submit" variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
          </form>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {LISTING_STATUSES.map((s) => (
            <span
              key={s}
              className={`rounded-full border px-2.5 py-1 text-xs ${LISTING_STATUS_TONE[s]}`}
            >
              {LISTING_STATUS_LABEL[s]} · {byStatus[s] ?? 0}
            </span>
          ))}
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant={view === "grid" ? "default" : "outline"} onClick={() => setView("grid")}>
              <LayoutGrid className="mr-1.5 h-4 w-4" /> Bảng trạng thái
            </Button>
            <Button size="sm" variant={view === "price" ? "default" : "outline"} onClick={() => setView("price")}>
              <Table2 className="mr-1.5 h-4 w-4" /> Bảng giá
            </Button>
            <Button size="sm" variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")}>
              <Rows3 className="mr-1.5 h-4 w-4" /> Bảng
            </Button>
          </div>
        </div>
      </SectionCard>

      {list.isLoading ? (
        <SectionCard title="Đang tải"><div className="h-24" /></SectionCard>
      ) : rows.length === 0 ? (
        <SectionCard title="Chưa có sản phẩm">
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Building2 className="mx-auto mb-3 h-8 w-8 opacity-40" />
            Chưa có sản phẩm trong giỏ hàng. Dùng “Tạo hàng loạt” để tạo nhanh theo toà/tầng hoặc theo khu/lô.
          </div>
        </SectionCard>
      ) : view === "grid" ? (
        <div className="space-y-4">
          {kindGroups.map((g) => (
            <SectionCard key={g.kind} title={`${g.label} · ${g.items.length} sản phẩm`}>
              <KindStatusBoard
                kind={g.kind}
                items={g.items}
                onSelect={(u) => openEdit(rows.find((r) => r.id === u.id))}
              />
            </SectionCard>
          ))}
        </div>
      ) : view === "price" ? (
        <div className="space-y-4">
          {kindGroups.map((g) => (
            <SectionCard key={g.kind} title={`Bảng giá · ${g.label}`}>
              <KindPriceTable kind={g.kind} items={g.items} />
            </SectionCard>
          ))}
        </div>
      ) : (
        <SectionCard title="Danh sách sản phẩm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Mã</th>
                  <th className="py-2">Loại hình</th>
                  <th className="py-2">Khu / tầng</th>
                  <th className="py-2">Diện tích</th>
                  <th className="py-2">Giá</th>
                  <th className="py-2">Trạng thái</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 font-medium">{r.code || r.name}</td>
                    <td className="py-2 text-muted-foreground">{kindLabel(r.product_type)}</td>
                    <td className="py-2 text-muted-foreground">
                      {[r.zone, r.floor != null ? `T${r.floor}` : null].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="py-2">{r.area ? `${r.area} m²` : "—"}</td>
                    <td className="py-2">{money(r.price, r.currency)}</td>
                    <td className="py-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${LISTING_STATUS_TONE[r.listing_status]}`}>
                        {LISTING_STATUS_LABEL[r.listing_status]}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setStatusTarget(r); setStatusNext(r.listing_status); }}>
                          Đổi trạng thái
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setHistoryFor(r)}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeletingId(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Form thêm / sửa */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa sản phẩm" : "Thêm sản phẩm"}</DialogTitle>
            <DialogDescription>Thông tin thay đổi theo loại hình bất động sản.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); saveMut.mutate(editing); }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  <span>Loại hình</span>
                  <Select
                    value={editing.product_type}
                    onValueChange={(v) => setEditing({ ...editing, product_type: v as PropertyKind })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="field">
                  <span>Dự án</span>
                  <Select
                    value={editing.project_id ?? "none"}
                    onValueChange={(v) => setEditing({ ...editing, project_id: v === "none" ? null : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không gắn dự án</SelectItem>
                      {(projects.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {KIND_CONFIG[editing.product_type].fields.map((f) => (
                  <FieldInput
                    key={f.key}
                    def={f}
                    value={
                      f.store === "column"
                        ? ((editing as unknown as Record<string, string>)[f.key] ?? "")
                        : (editing.attrs[f.key] ?? "")
                    }
                    onChange={(v) =>
                      setEditing(
                        f.store === "column"
                          ? ({ ...editing, [f.key]: v } as FormState)
                          : { ...editing, attrs: { ...editing.attrs, [f.key]: v } },
                      )
                    }
                  />
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="field">
                  <span>Giá bán (VND)</span>
                  <Input
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                    inputMode="numeric"
                  />
                </label>
                <label className="field">
                  <span>Trạng thái bán</span>
                  <Select
                    value={editing.listing_status}
                    onValueChange={(v) => setEditing({ ...editing, listing_status: v as ListingStatus })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LISTING_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{LISTING_STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="field">
                  <span>Hiện trên trang công khai</span>
                  <div className="flex h-10 items-center">
                    <Switch
                      checked={editing.is_public}
                      onCheckedChange={(v) => setEditing({ ...editing, is_public: v })}
                    />
                  </div>
                </label>
              </div>

              <label className="field">
                <span>Mô tả</span>
                <Textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </label>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
                <Button type="submit" disabled={saveMut.isPending}>Lưu</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Đổi trạng thái */}
      <Dialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi trạng thái — {statusTarget?.code || statusTarget?.name}</DialogTitle>
            <DialogDescription>Mỗi lần đổi được ghi vào nhật ký sản phẩm.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="field">
              <span>Trạng thái mới</span>
              <Select value={statusNext} onValueChange={(v) => setStatusNext(v as ListingStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LISTING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{LISTING_STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {(statusNext === "reserved" || statusNext === "deposited") && (
              <label className="field">
                <span>Hạn giữ chỗ / cọc</span>
                <Input type="datetime-local" value={holdUntil} onChange={(e) => setHoldUntil(e.target.value)} />
              </label>
            )}
            <label className="field">
              <span>Ghi chú</span>
              <Textarea rows={2} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>Hủy</Button>
            <Button onClick={() => statusMut.mutate()} disabled={statusMut.isPending}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nhật ký */}
      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nhật ký trạng thái — {historyFor?.code || historyFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {(history.data ?? []).length === 0 && (
              <p className="text-muted-foreground">Chưa có thay đổi nào.</p>
            )}
            {(history.data ?? []).map((h) => (
              <div key={h.id} className="rounded-lg border p-3">
                <div className="font-medium">
                  {h.from_status ? LISTING_STATUS_LABEL[h.from_status as ListingStatus] : "Khởi tạo"} →{" "}
                  {LISTING_STATUS_LABEL[h.to_status as ListingStatus]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(h.occurred_at as string).toLocaleString("vi-VN")}
                </div>
                {h.note && <div className="mt-1 text-xs">{h.note}</div>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tạo hàng loạt */}
      <BulkDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        defaultKind={kind === "all" ? "apartment" : (kind as PropertyKind)}
        pending={bulkMut.isPending}
        onSubmit={(v) => bulkMut.mutate(v)}
      />

      {/* Nhập tệp */}
      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) setImportRows([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nhập giỏ hàng từ tệp CSV</DialogTitle>
            <DialogDescription>
              Tệp cần có dòng tiêu đề, ví dụ: code, zone, floor, area, bedrooms, price. Tối đa 500 dòng.
            </DialogDescription>
          </DialogHeader>
          <Input type="file" accept=".csv,text/csv" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }} />
          {importRows.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Đã đọc {importRows.length} dòng. Loại hình áp dụng:{" "}
              {kindLabel(kind === "all" ? "apartment" : kind)}.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Hủy</Button>
            <Button onClick={doImport} disabled={importRows.length === 0}>Nhập dữ liệu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá sản phẩm?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && delMut.mutate(deletingId)}>Xoá</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FieldInput({
  def, value, onChange,
}: { def: FieldDef; value: string; onChange: (v: string) => void }) {
  if (def.type === "select") {
    return (
      <label className="field">
        <span>{def.label}</span>
        <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Chưa chọn</SelectItem>
            {(def.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    );
  }
  return (
    <label className="field">
      <span>{def.label}{def.suffix ? ` (${def.suffix})` : ""}</span>
      <Input
        type={def.type === "date" ? "date" : "text"}
        inputMode={def.type === "number" ? "numeric" : undefined}
        placeholder={def.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function BulkDialog({
  open, onOpenChange, defaultKind, pending, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultKind: PropertyKind;
  pending: boolean;
  onSubmit: (v: {
    zone: string; floorFrom: number; floorTo: number; perFloor: number;
    codePattern: string; product_type: PropertyKind; useFloors: boolean;
    area: number | null; bedrooms: number | null; price: number;
  }) => void;
}) {
  const [kind, setKind] = useState<PropertyKind>(defaultKind);
  const [zone, setZone] = useState("A");
  const [floorFrom, setFloorFrom] = useState("1");
  const [floorTo, setFloorTo] = useState("10");
  const [perFloor, setPerFloor] = useState("8");
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [price, setPrice] = useState("0");
  const useFloors = KIND_CONFIG[kind].view === "floor-grid";
  const pattern = useFloors ? "{zone}-{floor}.{index}" : "{zone}-{index}";
  const count = useFloors
    ? Math.max(0, Number(floorTo) - Number(floorFrom) + 1) * Number(perFloor || 0)
    : Number(perFloor || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo giỏ hàng hàng loạt</DialogTitle>
          <DialogDescription>
            Sinh mã tự động theo {useFloors ? "toà và tầng" : "khu và số lô"}. Tối đa 500 sản phẩm mỗi lần.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">
            <span>Loại hình</span>
            <Select value={kind} onValueChange={(v) => setKind(v as PropertyKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="field">
            <span>{KIND_CONFIG[kind].zoneLabel}</span>
            <Input value={zone} onChange={(e) => setZone(e.target.value)} />
          </label>
          {useFloors && (
            <>
              <label className="field">
                <span>Tầng từ</span>
                <Input value={floorFrom} onChange={(e) => setFloorFrom(e.target.value)} inputMode="numeric" />
              </label>
              <label className="field">
                <span>Tầng đến</span>
                <Input value={floorTo} onChange={(e) => setFloorTo(e.target.value)} inputMode="numeric" />
              </label>
            </>
          )}
          <label className="field">
            <span>{useFloors ? "Số căn mỗi tầng" : "Số lô"}</span>
            <Input value={perFloor} onChange={(e) => setPerFloor(e.target.value)} inputMode="numeric" />
          </label>
          <label className="field">
            <span>Diện tích mặc định (m²)</span>
            <Input value={area} onChange={(e) => setArea(e.target.value)} inputMode="numeric" />
          </label>
          {useFloors && (
            <label className="field">
              <span>Phòng ngủ mặc định</span>
              <Input value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} inputMode="numeric" />
            </label>
          )}
          <label className="field">
            <span>Giá mặc định (VND)</span>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
          </label>
        </div>
        <p className="text-sm text-muted-foreground">Sẽ tạo khoảng <b>{count}</b> sản phẩm.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            disabled={pending || count === 0 || count > 500}
            onClick={() =>
              onSubmit({
                product_type: kind,
                zone: zone.trim() || "A",
                floorFrom: Number(floorFrom) || 1,
                floorTo: Number(floorTo) || 1,
                perFloor: Number(perFloor) || 1,
                codePattern: pattern,
                useFloors,
                area: area ? Number(area) : null,
                bedrooms: bedrooms ? Number(bedrooms) : null,
                price: Number(price) || 0,
              })
            }
          >
            Tạo {count} sản phẩm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
