import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { listProjects, upsertProject, getProjectPerformance } from "@/lib/project.functions";
import { PageHeader, KpiCard, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Building2, TrendingUp, Users2, Target, Plus, Search, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects/")({ component: ProjectsPage });

const STATUSES = ["selling", "coming_soon", "in_progress", "delivered", "paused"] as const;
const STATUS_LABEL: Record<string, string> = {
  selling: "Đang mở bán", coming_soon: "Sắp mở bán", in_progress: "Đang triển khai",
  delivered: "Đã bàn giao", paused: "Tạm dừng",
};
const STATUS_TONE: Record<string, string> = {
  selling: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  coming_soon: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  in_progress: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  delivered: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  paused: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
};
const PROPERTY_TYPES = ["Căn hộ", "Khu đô thị", "Biệt thự", "Nhà phố", "Đất nền", "Nghỉ dưỡng", "Văn phòng", "Khác"];

function ProjectsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const list = useServerFn(listProjects);
  const perf = useServerFn(getProjectPerformance);
  const upsert = useServerFn(upsertProject);

  const projects = useQuery({
    queryKey: ["projects", tenantId, q],
    queryFn: () => list({ data: { tenantId: tenantId!, q: q || undefined } }),
    enabled: !!tenantId,
  });
  const performance = useQuery({
    queryKey: ["project-perf", tenantId],
    queryFn: () => perf({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const create = useMutation({
    mutationFn: (vals: any) => upsert({ data: { ...vals, tenant_id: tenantId! } }),
    onSuccess: () => {
      toast.success("Đã tạo dự án");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi"),
  });

  const totalLeads = useMemo(
    () => (performance.data?.leadsByProject ?? []).reduce((s, x) => s + x.leads, 0),
    [performance.data]
  );
  const totalViews = useMemo(
    () => (performance.data?.topViewed ?? []).reduce((s, x) => s + x.views, 0),
    [performance.data]
  );

  if (!tenantId) return <div className="p-6 text-sm text-muted-foreground">Chọn workspace để tiếp tục.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dự án bất động sản"
        sub="Quản lý dự án, gallery, brochure và CTA cho từng dự án."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="h-4 w-4" /> Thêm dự án</Button>
            </DialogTrigger>
            <ProjectDialog onSubmit={(v) => create.mutate(v)} loading={create.isPending} />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Tổng dự án" value={String(projects.data?.length ?? 0)} delta={0} tone="indigo" deltaLabel="" />
        <KpiCard icon={TrendingUp} label="Lượt xem (30d)" value={totalViews.toLocaleString()} delta={0} tone="blue" deltaLabel="" />
        <KpiCard icon={Users2} label="Tổng lead" value={String(totalLeads)} delta={0} tone="amber" deltaLabel="" />
        <KpiCard icon={Target} label="Đang mở bán" value={String((projects.data ?? []).filter((p) => p.status === "selling").length)} delta={0} tone="green" deltaLabel="" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 h-9" placeholder="Tìm dự án theo tên…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          {projects.isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Đang tải…</div>
          ) : (projects.data ?? []).length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Chưa có dự án nào. Bấm “Thêm dự án” để bắt đầu.
            </div>
          ) : (
            <>
            {/* Mobile: danh sách dạng thẻ, thao tác bằng ngón tay */}
            <ul className="divide-y divide-border md:hidden">
              {(projects.data ?? []).map((p) => (
                <li key={p.id}>
                  <Link
                    to="/projects/$id"
                    params={{ id: p.id }}
                    className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4 active:bg-muted/40"
                  >
                    <div className="grid h-14 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                      {p.cover_url ? <img src={p.cover_url} alt={p.name} className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold">{p.name}</div>
                      <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {[p.developer, p.location ?? p.city].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {p.status && (
                          <span className={["inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold", STATUS_TONE[p.status] ?? "bg-muted"].join(" ")}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        )}
                        {p.property_type && <span className="text-[11.5px] text-muted-foreground">{p.property_type}</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                    <th className="px-5 py-3 font-semibold">Dự án</th>
                    <th className="px-3 py-3 font-semibold">Chủ đầu tư</th>
                    <th className="px-3 py-3 font-semibold">Vị trí</th>
                    <th className="px-3 py-3 font-semibold">Loại hình</th>
                    <th className="px-3 py-3 font-semibold">Giá</th>
                    <th className="px-3 py-3 font-semibold">Trạng thái</th>
                    <th className="px-3 py-3 font-semibold text-right pr-5">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {(projects.data ?? []).map((p) => (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 rounded-lg bg-muted overflow-hidden shrink-0 grid place-items-center">
                            {p.cover_url ? <img src={p.cover_url} alt={p.name} className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-muted-foreground" />}
                          </div>
                          <div className="font-semibold">{p.name}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{p.developer ?? "—"}</td>
                      <td className="px-3 py-3">{p.location ?? p.city ?? "—"}</td>
                      <td className="px-3 py-3">{p.property_type ?? "—"}</td>
                      <td className="px-3 py-3 font-medium">
                        {p.price_from || p.price_to
                          ? `${p.price_from ?? "?"} - ${p.price_to ?? "?"} ${p.currency ?? ""}`
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {p.status && <span className={["inline-flex px-2 py-1 rounded-md text-[11.5px] font-semibold", STATUS_TONE[p.status] ?? "bg-muted"].join(" ")}>{STATUS_LABEL[p.status] ?? p.status}</span>}
                      </td>
                      <td className="px-3 py-3 text-right pr-5">
                        <Link to="/projects/$id" params={{ id: p.id }} className="inline-flex min-h-9 items-center gap-1 px-1 -mx-1 text-primary text-[12.5px] font-semibold hover:underline">
                          <Eye className="h-3.5 w-3.5" /> Mở
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>

          )}
        </div>

        <div className="space-y-6">
          <SectionCard title="Top dự án theo lượt xem (30d)">
            <ul className="space-y-3">
              {(performance.data?.topViewed ?? []).slice(0, 6).map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-4 text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate">{t.name}</span>
                  <span className="font-semibold">{t.views.toLocaleString()}</span>
                </li>
              ))}
              {(performance.data?.topViewed ?? []).length === 0 && (
                <li className="text-[12.5px] text-muted-foreground">Chưa có dữ liệu.</li>
              )}
            </ul>
          </SectionCard>

          <SectionCard title="Lead theo dự án">
            <ul className="space-y-3">
              {(performance.data?.leadsByProject ?? []).slice(0, 6).map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-4 text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate">{t.name}</span>
                  <span className="font-semibold">{t.leads}</span>
                </li>
              ))}
              {(performance.data?.leadsByProject ?? []).length === 0 && (
                <li className="text-[12.5px] text-muted-foreground">Chưa có lead.</li>
              )}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function ProjectDialog({ onSubmit, loading }: { onSubmit: (v: any) => void; loading: boolean }) {
  const [v, setV] = useState({
    name: "", developer: "", location: "", city: "", property_type: "Căn hộ",
    status: "selling", price_from: "", price_to: "", currency: "VND",
    description: "", sales_policy: "", cta_phone: "",
  });
  const set = (k: string, val: any) => setV({ ...v, [k]: val });
  return (
    <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Thêm dự án mới</DialogTitle></DialogHeader>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label>Tên dự án *</Label><Input value={v.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><Label>Chủ đầu tư</Label><Input value={v.developer} onChange={(e) => set("developer", e.target.value)} /></div>
        <div><Label>Vị trí</Label><Input value={v.location} onChange={(e) => set("location", e.target.value)} /></div>
        <div><Label>Thành phố</Label><Input value={v.city} onChange={(e) => set("city", e.target.value)} /></div>
        <div>
          <Label>Loại hình</Label>
          <Select value={v.property_type} onValueChange={(x) => set("property_type", x)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Trạng thái</Label>
          <Select value={v.status} onValueChange={(x) => set("status", x)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Giá từ</Label><Input type="number" value={v.price_from} onChange={(e) => set("price_from", e.target.value)} /></div>
        <div><Label>Giá đến</Label><Input type="number" value={v.price_to} onChange={(e) => set("price_to", e.target.value)} /></div>
        <div><Label>Đơn vị</Label><Input value={v.currency} onChange={(e) => set("currency", e.target.value)} /></div>
        <div><Label>Hotline CTA</Label><Input value={v.cta_phone} onChange={(e) => set("cta_phone", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label>Mô tả</Label><Textarea rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label>Chính sách bán hàng</Label><Textarea rows={3} value={v.sales_policy} onChange={(e) => set("sales_policy", e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button
          disabled={loading || !v.name.trim()}
          onClick={() => onSubmit({
            name: v.name.trim(),
            developer: v.developer || null,
            location: v.location || null,
            city: v.city || null,
            property_type: v.property_type,
            status: v.status,
            price_from: v.price_from ? Number(v.price_from) : null,
            price_to: v.price_to ? Number(v.price_to) : null,
            currency: v.currency || "VND",
            description: v.description || null,
            sales_policy: v.sales_policy || null,
            cta_phone: v.cta_phone || null,
          })}
        >
          {loading ? "Đang lưu…" : "Tạo dự án"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
