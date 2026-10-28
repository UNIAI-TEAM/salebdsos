import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Percent, Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { KIND_CONFIG, PROPERTY_KINDS } from "@/lib/property-types";
import type { DiscountPolicy } from "@/lib/payment-discount";
import {
  deleteDiscountPolicy, listDiscountPolicies, saveDiscountPolicy,
} from "@/lib/discount.functions";
import { listInventoryProjects } from "@/lib/inventory.functions";

export const Route = createFileRoute("/_app/discounts")({
  component: DiscountsPage,
  head: () => ({ meta: [
    { title: "Chiết khấu thanh toán nhanh — SaleBDS OS" },
    { name: "description", content: "Chính sách chiết khấu theo tiến độ thanh toán nhanh cho từng dự án." },
    { property: "og:title", content: "Chiết khấu thanh toán nhanh — SaleBDS OS" },
    { property: "og:description", content: "Quản lý mức chiết khấu thanh toán nhanh theo dự án." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
});

type FormState = {
  id?: string;
  project_id: string | null;
  name: string;
  within_days: string;
  discount_percent: string;
  product_kinds: string[];
  active: boolean;
};

const emptyForm: FormState = {
  project_id: null, name: "", within_days: "7", discount_percent: "3",
  product_kinds: ["land_plot", "subdivision"], active: true,
};

function DiscountsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FormState | null>(null);

  const fnList = useServerFn(listDiscountPolicies);
  const fnSave = useServerFn(saveDiscountPolicy);
  const fnDelete = useServerFn(deleteDiscountPolicy);
  const fnProjects = useServerFn(listInventoryProjects);

  const policies = useQuery({
    queryKey: ["discount-policies", tenantId],
    queryFn: () => fnList({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const projects = useQuery({
    queryKey: ["discount-projects", tenantId],
    queryFn: () => fnProjects({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const canManage = policies.data?.canManage ?? false;
  const projectName = (id: string | null) =>
    id ? (projects.data ?? []).find((p) => p.id === id)?.name ?? "—" : "Tất cả dự án";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["discount-policies", tenantId] });

  const saveMut = useMutation({
    mutationFn: (v: FormState) =>
      fnSave({
        data: {
          tenantId: tenantId!,
          id: v.id,
          project_id: v.project_id,
          name: v.name.trim(),
          within_days: Math.max(1, Number(v.within_days) || 1),
          discount_percent: Math.min(100, Math.max(0, Number(v.discount_percent) || 0)),
          product_kinds: v.product_kinds,
          active: v.active,
          sort: 0,
        },
      }),
    onSuccess: () => { toast.success("Đã lưu chính sách"); setEditing(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { tenantId: tenantId!, id } }),
    onSuccess: () => { toast.success("Đã xoá chính sách"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4" data-testid="discounts-page">
      <PageHeader
        compact
        title="Chiết khấu thanh toán nhanh"
        sub="Khách thanh toán trong số ngày quy định được giảm % trên giá bán. Sale thấy gợi ý ngay trên sơ đồ lô và khi tạo hợp đồng."
        action={canManage ? (
          <Button size="sm" onClick={() => setEditing({ ...emptyForm })}>
            <Plus className="mr-1.5 h-4 w-4" /> Thêm chính sách
          </Button>
        ) : undefined}
      />

      <SectionCard>
        {(policies.data?.policies ?? []).length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Percent className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Chưa có chính sách nào. {canManage ? "Bấm “Thêm chính sách” để tạo." : "Chờ quản lý thiết lập."}
          </div>
        ) : (
          <div className="divide-y divide-border" data-testid="policy-list">
            {(policies.data!.policies as DiscountPolicy[]).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 py-3" data-testid={`policy-${p.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    {!p.active && <Badge variant="outline" className="text-muted-foreground">Đã tắt</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {projectName(p.project_id)} · {p.product_kinds.map((k) => KIND_CONFIG[k as keyof typeof KIND_CONFIG]?.label ?? k).join(", ")}
                  </div>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30" variant="outline">
                  -{p.discount_percent}% trong {p.within_days} ngày
                </Badge>
                {canManage && (
                  <div className="flex gap-1">
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => setEditing({
                        id: p.id, project_id: p.project_id, name: p.name,
                        within_days: String(p.within_days), discount_percent: String(p.discount_percent),
                        product_kinds: p.product_kinds, active: p.active,
                      })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                      onClick={() => delMut.mutate(p.id)}
                      disabled={delMut.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa chính sách" : "Thêm chính sách"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input
                placeholder="Tên chính sách (VD: Thanh toán nhanh 7 ngày)"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <Select
                value={editing.project_id ?? "all"}
                onValueChange={(v) => setEditing({ ...editing, project_id: v === "all" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả dự án</SelectItem>
                  {(projects.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Thanh toán trong (ngày)</span>
                  <Input type="number" min={1} value={editing.within_days} onChange={(e) => setEditing({ ...editing, within_days: e.target.value })} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Chiết khấu (%)</span>
                  <Input type="number" min={0} max={100} step="0.1" value={editing.discount_percent} onChange={(e) => setEditing({ ...editing, discount_percent: e.target.value })} />
                </label>
              </div>
              <div>
                <div className="mb-1.5 text-xs text-muted-foreground">Áp dụng cho loại hình</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PROPERTY_KINDS.map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={editing.product_kinds.includes(k)}
                        onCheckedChange={(c) =>
                          setEditing({
                            ...editing,
                            product_kinds: c
                              ? [...editing.product_kinds, k]
                              : editing.product_kinds.filter((x) => x !== k),
                          })
                        }
                      />
                      {KIND_CONFIG[k].label}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                Đang áp dụng
              </label>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => editing && saveMut.mutate(editing)}
              disabled={saveMut.isPending || !editing?.name.trim() || editing.product_kinds.length === 0}
            >
              Lưu chính sách
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
