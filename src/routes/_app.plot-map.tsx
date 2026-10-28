import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Combine, History, Map as MapIcon, Pin, Plus, RefreshCw, Scissors, Trash2 } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  LISTING_STATUSES, LISTING_STATUS_LABEL, LISTING_STATUS_TONE, kindLabel,
  type ListingStatus,
} from "@/lib/property-types";
import { buildPlotGrid, plotStats, pricePerM2, type PlotUnit } from "@/lib/plot-map";
import {
  mergeTotals, validateMergeDraft, validateSplitDraft, type SplitChildDraft,
} from "@/lib/plot-transform";
import {
  changeListingStatus, listInventory, listInventoryProjects, updateInventoryItem,
} from "@/lib/inventory.functions";
import { listDiscountPolicies } from "@/lib/discount.functions";
import { listPlotTransforms, mergePlots, splitPlot } from "@/lib/plot-transform.functions";
import { bestQuote, type DiscountPolicy } from "@/lib/payment-discount";

const emptyChild = (): SplitChildDraft => ({ code: "", area: "", price: "", map_row: "", map_col: "" });

export const Route = createFileRoute("/_app/plot-map")({
  validateSearch: (s: Record<string, unknown>) => ({
    projectId: typeof s["projectId"] === "string" ? s["projectId"] : undefined,
  }),
  component: PlotMapPage,
  head: () => ({ meta: [
    { title: "Sơ đồ lô — SaleBDS OS" },
    { name: "description", content: "Sơ đồ lô đất nền, phân lô theo khu, trạng thái từng lô và giữ chỗ nhanh." },
    { property: "og:title", content: "Sơ đồ lô — SaleBDS OS" },
    { property: "og:description", content: "Nhìn toàn khu theo sơ đồ, tô màu trạng thái từng lô." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
});

type Row = PlotUnit & {
  updated_at: string;
  project_id: string | null;
  product_type: string | null;
};

function money(v: number) {
  if (!v) return "—";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(v % 1_000_000_000 === 0 ? 0 : 1)} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} tr`;
  return v.toLocaleString("vi-VN");
}

const CELL_TONE: Record<ListingStatus, string> = {
  available: "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25",
  locked: "bg-muted border-border text-muted-foreground",
  reserved: "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25",
  negotiating: "bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-500/25",
  deposited: "bg-violet-500/15 border-violet-500/40 text-violet-700 dark:text-violet-300 hover:bg-violet-500/25",
  contracted: "bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25",
  sold: "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25",
  liquidated: "bg-zinc-500/10 border-zinc-500/30 text-zinc-500",
  retired: "bg-muted/50 border-dashed border-border text-muted-foreground/50",
};

function PlotMapPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const search = Route.useSearch();
  const qc = useQueryClient();

  const [projectId, setProjectId] = useState<string>(search.projectId ?? "");
  const [zoneTab, setZoneTab] = useState<string>("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [nextStatus, setNextStatus] = useState<ListingStatus>("reserved");
  const [holdUntil, setHoldUntil] = useState("");
  const [note, setNote] = useState("");
  const [rowInput, setRowInput] = useState("");
  const [colInput, setColInput] = useState("");

  const fnProjects = useServerFn(listInventoryProjects);
  const fnList = useServerFn(listInventory);
  const fnStatus = useServerFn(changeListingStatus);
  const fnUpdate = useServerFn(updateInventoryItem);

  const projects = useQuery({
    queryKey: ["plot-map-projects", tenantId],
    queryFn: () => fnProjects({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const effectiveProject = projectId || (projects.data?.[0]?.id ?? "");

  const list = useQuery({
    queryKey: ["plot-map", tenantId, effectiveProject],
    queryFn: () =>
      fnList({
        data: {
          tenantId: tenantId!,
          projectId: effectiveProject || null,
          kind: "all",
          listingStatus: "all",
          zone: "all",
          pageSize: 300,
        },
      }),
    enabled: !!tenantId && !!effectiveProject,
  });

  const units = (list.data?.items ?? []) as unknown as Row[];
  const zones = useMemo(() => buildPlotGrid(units), [units]);
  const stats = useMemo(() => plotStats(units), [units]);
  const activeZone = zones.find((z) => z.zone === zoneTab) ?? zones[0];

  const fnPolicies = useServerFn(listDiscountPolicies);
  const policies = useQuery({
    queryKey: ["plot-map-policies", tenantId, effectiveProject],
    queryFn: () => fnPolicies({ data: { tenantId: tenantId!, projectId: effectiveProject } }),
    enabled: !!tenantId && !!effectiveProject,
  });
  const discountHint = selected
    ? bestQuote(
        selected.price,
        (policies.data?.policies ?? []) as DiscountPolicy[],
        { projectId: effectiveProject || null, kind: selected.product_type ?? null },
      )
    : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["plot-map", tenantId] });

  const openUnit = (u: Row) => {
    setSelected(u);
    setNextStatus(u.listing_status === "available" ? "reserved" : u.listing_status);
    setHoldUntil("");
    setNote("");
    setRowInput(u.map_row != null ? String(u.map_row) : "");
    setColInput(u.map_col != null ? String(u.map_col) : "");
  };

  const statusMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Chọn lô trước");
      return fnStatus({
        data: {
          id: selected.id,
          expectedUpdatedAt: selected.updated_at,
          listing_status: nextStatus,
          note: note || null,
          hold_expires_at: holdUntil ? new Date(holdUntil).toISOString() : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái lô");
      setSelected(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const posMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Chọn lô trước");
      const r = rowInput ? Number(rowInput) : null;
      const c = colInput ? Number(colInput) : null;
      if ((r == null) !== (c == null)) throw new Error("Nhập cả hàng và cột, hoặc để trống cả hai");
      return fnUpdate({
        data: { id: selected.id, expectedUpdatedAt: selected.updated_at, map_row: r, map_col: c },
      });
    },
    onSuccess: () => {
      toast.success("Đã đặt vị trí lô trên sơ đồ");
      setSelected(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4" data-testid="plot-map-page">
      <PageHeader
        compact
        title="Sơ đồ lô"
        sub="Nhìn toàn khu theo sơ đồ, tô màu trạng thái từng lô, giữ chỗ nhanh."
        action={
          <Button variant="outline" size="sm" onClick={() => list.refetch()} disabled={list.isFetching}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${list.isFetching ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={effectiveProject} onValueChange={setProjectId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Chọn dự án" /></SelectTrigger>
          <SelectContent>
            {(projects.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline">{stats.total} lô</Badge>
        <Badge variant="outline">Hấp thụ {stats.absorption}%</Badge>
        <Badge variant="outline">Còn bán ~{money(stats.openValue)}</Badge>
      </div>

      {/* Chú thích trạng thái */}
      <div className="flex flex-wrap gap-1.5">
        {LISTING_STATUSES.map((s) => (
          <span key={s} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${LISTING_STATUS_TONE[s]}`}>
            {LISTING_STATUS_LABEL[s]} {stats.byStatus[s] > 0 ? `(${stats.byStatus[s]})` : ""}
          </span>
        ))}
      </div>

      {zones.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {zones.map((z) => (
            <Button
              key={z.zone}
              size="sm"
              variant={activeZone?.zone === z.zone ? "default" : "outline"}
              onClick={() => setZoneTab(z.zone)}
            >
              {z.zone}
            </Button>
          ))}
        </div>
      )}

      {list.isLoading && <div className="py-16 text-center text-sm text-muted-foreground">Đang tải sơ đồ…</div>}

      {!list.isLoading && units.length === 0 && (
        <SectionCard>
          <div className="py-12 text-center text-sm text-muted-foreground">
            <MapIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Dự án chưa có sản phẩm nào. Thêm lô trong{" "}
            <Link to="/inventory" search={{ projectId: effectiveProject || undefined }} className="text-primary underline">
              Giỏ hàng
            </Link>{" "}
            rồi quay lại đặt vị trí trên sơ đồ.
          </div>
        </SectionCard>
      )}

      {activeZone && (
        <SectionCard key={activeZone.zone}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Khu {activeZone.zone}</h3>
            <span className="text-xs text-muted-foreground">
              {activeZone.cells.length + activeZone.unplaced.length} lô
            </span>
          </div>

          {activeZone.cells.length > 0 ? (
            <div className="overflow-x-auto pb-1">
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${activeZone.colCount}, minmax(72px, 1fr))` }}
                data-testid="plot-grid"
              >
                {Array.from({ length: activeZone.rowCount * activeZone.colCount }, (_, i) => {
                  const r = Math.floor(i / activeZone.colCount) + 1;
                  const c = (i % activeZone.colCount) + 1;
                  const cell = activeZone.cells.find((x) => x.row === r && x.col === c);
                  if (!cell) return <div key={`${r}-${c}`} className="h-14 rounded-md border border-dashed border-border/50" />;
                  const u = cell.unit as Row;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => openUnit(u)}
                      className={`flex h-14 flex-col items-center justify-center rounded-md border text-xs font-medium transition-colors ${CELL_TONE[u.listing_status]}`}
                      data-testid={`plot-cell-${u.code ?? u.id}`}
                    >
                      <span className="max-w-full truncate px-1">{u.code ?? u.name ?? "—"}</span>
                      {u.area ? <span className="text-[10px] opacity-75">{u.area} m²</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Khu này chưa có lô nào được đặt vị trí trên sơ đồ.</p>
          )}

          {activeZone.unplaced.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Pin className="h-3.5 w-3.5" /> Chưa đặt vị trí ({activeZone.unplaced.length}) — bấm để gán hàng/cột
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeZone.unplaced.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => openUnit(u as Row)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium ${LISTING_STATUS_TONE[u.listing_status]}`}
                  >
                    {u.code ?? u.name ?? "—"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* Chi tiết lô */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.code ?? selected?.name ?? "Lô"}</DialogTitle>
            <DialogDescription>
              {selected ? kindLabel(selected.product_type) : ""} · Khu {selected?.zone ?? "—"}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="text-muted-foreground">Trạng thái</div>
                <Badge variant="outline" className={LISTING_STATUS_TONE[selected.listing_status]}>
                  {LISTING_STATUS_LABEL[selected.listing_status]}
                </Badge>
                <div className="text-muted-foreground">Diện tích</div>
                <div>{selected.area ? `${selected.area} m²` : "—"}</div>
                <div className="text-muted-foreground">Giá bán</div>
                <div className="font-medium">{money(selected.price)}</div>
                <div className="text-muted-foreground">Đơn giá / m²</div>
                <div>{pricePerM2(selected.price, selected.area)?.toLocaleString("vi-VN") ?? "—"}</div>
                <div className="text-muted-foreground">Hướng</div>
                <div>{selected.direction ?? "—"}</div>
                <div className="text-muted-foreground">Pháp lý</div>
                <div>{selected.legal_status ?? "—"}</div>
                {selected.hold_expires_at && (
                  <>
                    <div className="text-muted-foreground">Giữ đến</div>
                    <div>{new Date(selected.hold_expires_at).toLocaleString("vi-VN")}</div>
                  </>
                )}
              </div>

              {discountHint && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3" data-testid="discount-hint">
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
                    {discountHint.policy.name}
                  </div>
                  <div className="mt-0.5 text-sm">
                    Thanh toán trong <b>{discountHint.policy.within_days} ngày</b>: giảm{" "}
                    <b>{discountHint.policy.discount_percent}%</b> (~{money(discountHint.amount)}) — còn{" "}
                    <b>{money(discountHint.net)}</b>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Hạn hưởng chiết khấu: {discountHint.deadline.toLocaleDateString("vi-VN")}
                  </div>
                </div>
              )}

              <div className="rounded-lg border p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Đổi trạng thái</div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as ListingStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LISTING_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{LISTING_STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="datetime-local"
                    value={holdUntil}
                    onChange={(e) => setHoldUntil(e.target.value)}
                    title="Hạn giữ chỗ (tuỳ chọn)"
                  />
                </div>
                <Input
                  className="mt-2"
                  placeholder="Ghi chú (tuỳ chọn)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  className="mt-2 w-full"
                  size="sm"
                  onClick={() => statusMut.mutate()}
                  disabled={statusMut.isPending}
                >
                  {nextStatus === "reserved" ? "Giữ chỗ" : "Cập nhật trạng thái"}
                </Button>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Vị trí trên sơ đồ (hàng × cột)</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min={1} placeholder="Hàng" value={rowInput} onChange={(e) => setRowInput(e.target.value)} />
                  <Input type="number" min={1} placeholder="Cột" value={colInput} onChange={(e) => setColInput(e.target.value)} />
                </div>
                <Button
                  className="mt-2 w-full"
                  size="sm"
                  variant="outline"
                  onClick={() => posMut.mutate()}
                  disabled={posMut.isPending}
                >
                  Lưu vị trí
                </Button>
              </div>
            </div>
          )}
          <DialogFooter />
        </DialogContent>
      </Dialog>
    </div>
  );
}
