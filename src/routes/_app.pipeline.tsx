import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  getPipeline, upsertDeal, moveDeal, deleteDeal,
} from "@/lib/pipeline.functions";
import { toast } from "sonner";
import {
  Plus, Filter, MoreHorizontal, GripVertical, TrendingUp, DollarSign,
  Phone, Mail, Calendar, User as UserIcon, Building2, Trash2, X,
} from "lucide-react";

export const Route = createFileRoute("/_app/pipeline")({ component: PipelinePage });

type Stage = { id: string; name: string; position: number; win_probability: number | null };
type Deal = {
  id: string; tenant_id: string; stage_id: string; lead_id: string | null;
  project_id: string | null; owner_user_id: string | null; title: string;
  value: number | null; currency: string | null; status: string;
  expected_close_date: string | null; next_action: string | null;
  next_action_at: string | null; last_activity_at: string | null;
};
type Lead = { id: string; full_name: string | null; phone: string | null; email: string | null };
type Project = { id: string; name: string };
type Owner = { user_id: string; full_name: string; avatar_url: string | null };

const STAGE_COLORS: Record<number, string> = {
  0: "bg-slate-400", 1: "bg-blue-500", 2: "bg-cyan-500",
  3: "bg-amber-500", 4: "bg-violet-500", 5: "bg-emerald-500", 6: "bg-rose-500",
};

function fmtVND(v: number | null) {
  if (!v) return "—";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} tr`;
  return v.toLocaleString("vi-VN");
}
function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(-2).map((p) => p[0]?.toUpperCase()).join("");
}
function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "vừa xong";
  if (d < 3600) return `${Math.floor(d / 60)} phút trước`;
  if (d < 86400) return `${Math.floor(d / 3600)} giờ trước`;
  return `${Math.floor(d / 86400)} ngày trước`;
}

function PipelinePage() {
  const { currentTenant, hasRole } = useAuth();
  const tenantId = currentTenant?.id;
  const fetchPipeline = useServerFn(getPipeline);
  const fnUpsert = useServerFn(upsertDeal);
  const fnMove = useServerFn(moveDeal);
  const fnDelete = useServerFn(deleteDeal);

  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOwner, setFilterOwner] = useState<string>("all");

  const [editing, setEditing] = useState<Deal | null>(null);
  const [creating, setCreating] = useState<{ stageId?: string } | null>(null);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  const canEdit = hasRole(["owner", "admin", "manager", "agent"]);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const r = await fetchPipeline({ data: { tenantId } });
      setStages(r.stages as Stage[]);
      setDeals(r.deals as Deal[]);
      setLeads(r.leads as Lead[]);
      setProjects(r.projects as Project[]);
      setOwners(r.owners as Owner[]);
    } catch (e: any) {
      toast.error("Không tải được pipeline: " + (e?.message ?? ""));
    } finally { setLoading(false); }
  }, [tenantId, fetchPipeline]);

  useEffect(() => { void reload(); }, [reload]);

  const filteredDeals = useMemo(() => {
    if (filterOwner === "all") return deals;
    if (filterOwner === "unassigned") return deals.filter((d) => !d.owner_user_id);
    return deals.filter((d) => d.owner_user_id === filterOwner);
  }, [deals, filterOwner]);

  const dealsByStage = useMemo(() => {
    const m = new Map<string, Deal[]>();
    for (const s of stages) m.set(s.id, []);
    for (const d of filteredDeals) {
      if (!m.has(d.stage_id)) m.set(d.stage_id, []);
      m.get(d.stage_id)!.push(d);
    }
    return m;
  }, [filteredDeals, stages]);

  const totals = useMemo(() => {
    const sum = (arr: Deal[]) => arr.reduce((a, b) => a + (b.value ?? 0), 0);
    const open = filteredDeals.filter((d) => {
      const s = stages.find((x) => x.id === d.stage_id);
      return s && s.position < 5;
    });
    const won = filteredDeals.filter((d) => {
      const s = stages.find((x) => x.id === d.stage_id);
      return s?.position === 5;
    });
    const winRate = filteredDeals.length
      ? Math.round((won.length / filteredDeals.length) * 1000) / 10
      : 0;
    return {
      pipeline: sum(open), expected: sum(won), openCount: open.length,
      wonValue: sum(won), winRate,
    };
  }, [filteredDeals, stages]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragStart = (e: DragStartEvent) => setActiveDealId(String(e.active.id));
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveDealId(null);
    const dealId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const targetStageId = overId.startsWith("stage:") ? overId.slice(6) : deals.find((d) => d.id === overId)?.stage_id;
    if (!targetStageId) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === targetStageId) return;
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: targetStageId, last_activity_at: new Date().toISOString() } : d)));
    try { await fnMove({ data: { id: dealId, stage_id: targetStageId } }); }
    catch (err: any) { toast.error("Lỗi cập nhật: " + (err?.message ?? "")); void reload(); }
  };

  const activeDeal = activeDealId ? deals.find((d) => d.id === activeDealId) ?? null : null;
  const ownerById = useMemo(() => new Map(owners.map((o) => [o.user_id, o])), [owners]);
  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Pipeline"
        sub="Kéo thả deal giữa các giai đoạn — đồng bộ realtime với team."
        action={
          <div className="flex gap-2 flex-wrap">
            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger className="h-9 w-[180px] rounded-xl text-[12.5px]">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Lọc nhân sự" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toàn team</SelectItem>
                <SelectItem value="unassigned">Chưa gán</SelectItem>
                {owners.map((o) => (
                  <SelectItem key={o.user_id} value={o.user_id}>{o.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setCreating({})} disabled={!canEdit} className="h-9 rounded-xl">
              <Plus className="h-4 w-4" /> Thêm deal
            </Button>
          </div>
        } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SectionCard>
          <div className="text-[12px] text-muted-foreground">Tổng pipeline (đang mở)</div>
          <div className="text-[24px] font-bold mt-1">{fmtVND(totals.pipeline)}</div>
          <div className="text-[11.5px] text-emerald-600 font-semibold mt-1 inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> {totals.openCount} deal
          </div>
        </SectionCard>
        <SectionCard>
          <div className="text-[12px] text-muted-foreground">Doanh thu thắng</div>
          <div className="text-[24px] font-bold mt-1">{fmtVND(totals.wonValue)}</div>
          <div className="text-[11.5px] text-muted-foreground mt-1 inline-flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Đã chốt
          </div>
        </SectionCard>
        <SectionCard>
          <div className="text-[12px] text-muted-foreground">Tổng số deal</div>
          <div className="text-[24px] font-bold mt-1">{filteredDeals.length}</div>
          <div className="text-[11.5px] text-muted-foreground mt-1">Trong workspace</div>
        </SectionCard>
        <SectionCard>
          <div className="text-[12px] text-muted-foreground">Tỷ lệ thắng</div>
          <div className="text-[24px] font-bold mt-1">{totals.winRate}%</div>
          <div className="text-[11.5px] text-emerald-600 font-semibold mt-1">Tổng vòng đời</div>
        </SectionCard>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="overflow-x-auto -mx-4 lg:-mx-8 px-4 lg:px-8 pb-4 scrollbar-thin">
          <div className="grid grid-flow-col auto-cols-[280px] gap-4">
            {stages.map((s) => {
              const list = dealsByStage.get(s.id) ?? [];
              const sum = list.reduce((a, b) => a + (b.value ?? 0), 0);
              return (
                <Column key={s.id} stage={s} count={list.length} totalValue={sum}
                  canAdd={canEdit} onAdd={() => setCreating({ stageId: s.id })}>
                  {loading && !list.length ? (
                    <div className="text-[11.5px] text-muted-foreground text-center py-6">Đang tải…</div>
                  ) : list.length === 0 ? (
                    <div className="text-[11.5px] text-muted-foreground text-center py-6 italic">Chưa có deal</div>
                  ) : list.map((d) => (
                    <DealCard key={d.id} deal={d}
                      lead={d.lead_id ? leadById.get(d.lead_id) : null}
                      project={d.project_id ? projectById.get(d.project_id) : null}
                      owner={d.owner_user_id ? ownerById.get(d.owner_user_id) : null}
                      onClick={() => setEditing(d)} />
                  ))}
                </Column>
              );
            })}
          </div>
        </div>
        <DragOverlay>
          {activeDeal && (
            <div className="rounded-xl bg-card border border-primary shadow-card p-3 w-[260px] rotate-2">
              <div className="text-[12.5px] font-semibold truncate">{activeDeal.title}</div>
              <div className="text-[12.5px] font-bold text-primary mt-2">{fmtVND(activeDeal.value)}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {creating && tenantId && (
        <DealDialog open onClose={() => setCreating(null)}
          tenantId={tenantId} stages={stages} leads={leads} projects={projects} owners={owners}
          defaultStageId={creating.stageId ?? stages[0]?.id}
          onSave={async (payload) => {
            try {
              await fnUpsert({ data: { ...payload, tenant_id: tenantId } as any });
              toast.success("Đã tạo deal");
              setCreating(null); void reload();
            } catch (e: any) { toast.error("Lỗi: " + (e?.message ?? "")); }
          }} />
      )}

      {editing && tenantId && (
        <DealSheet deal={editing} stages={stages} leads={leads} projects={projects} owners={owners}
          lead={editing.lead_id ? leadById.get(editing.lead_id) ?? null : null}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            try {
              await fnUpsert({ data: { ...payload, id: editing.id, tenant_id: tenantId } as any });
              toast.success("Đã lưu");
              setEditing(null); void reload();
            } catch (e: any) { toast.error("Lỗi: " + (e?.message ?? "")); }
          }}
          onDelete={async () => {
            if (!confirm("Xoá deal này?")) return;
            try {
              await fnDelete({ data: { id: editing.id } });
              toast.success("Đã xoá"); setEditing(null); void reload();
            } catch (e: any) { toast.error("Lỗi: " + (e?.message ?? "")); }
          }} />
      )}
    </div>
  );
}

function Column({
  stage, count, totalValue, children, onAdd, canAdd,
}: {
  stage: Stage; count: number; totalValue: number; children: React.ReactNode;
  onAdd: () => void; canAdd: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage.id}` });
  return (
    <div ref={setNodeRef}
      className={["rounded-2xl border flex flex-col transition",
        isOver ? "bg-primary/5 border-primary" : "bg-muted/40 border-border"].join(" ")}>
      <div className="px-4 pt-3.5 pb-3 border-b border-border bg-card rounded-t-2xl">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className={["h-2 w-2 rounded-full shrink-0", STAGE_COLORS[stage.position] ?? "bg-slate-400"].join(" ")} />
            <span className="text-[12.5px] font-semibold truncate">{stage.name}</span>
            <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold">{count}</span>
          </div>
          <button className="text-muted-foreground hover:text-foreground" aria-label="more">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Tổng: <span className="font-semibold text-foreground">{fmtVND(totalValue)}</span>
        </div>
      </div>
      <div className="p-2.5 space-y-2 flex-1 min-h-[200px]">
        {children}
        {canAdd && (
          <button onClick={onAdd}
            className="w-full text-[11.5px] text-muted-foreground hover:text-primary py-2 rounded-lg border border-dashed border-border hover:border-primary inline-flex items-center justify-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Thêm deal
          </button>
        )}
      </div>
    </div>
  );
}

function DealCard({
  deal, lead, project, owner, onClick,
}: {
  deal: Deal; lead?: Lead | null; project?: Project | null; owner?: Owner | null;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}
      className="rounded-xl bg-card border border-border p-3 hover:border-primary/40 hover:shadow-soft transition group">
      <div className="flex items-start gap-2 mb-2">
        <button {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 mt-0.5"
          aria-label="drag">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button onClick={onClick} className="flex-1 min-w-0 text-left">
          <div className="text-[12.5px] font-semibold truncate">{deal.title}</div>
          {(lead || project) && (
            <div className="text-[10.5px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              {project && <><Building2 className="h-3 w-3" /> {project.name}</>}
              {project && lead && <span>·</span>}
              {lead && <><UserIcon className="h-3 w-3" /> {lead.full_name}</>}
            </div>
          )}
        </button>
      </div>
      {deal.next_action && (
        <div className="text-[10.5px] bg-amber-50 text-amber-700 rounded-md px-2 py-1 mb-2 truncate">
          → {deal.next_action}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-bold text-primary truncate">{fmtVND(deal.value)}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {lead?.phone && (
            <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()}
              className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center hover:bg-emerald-100" aria-label="call">
              <Phone className="h-3 w-3" />
            </a>
          )}
          {lead?.email && (
            <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()}
              className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 grid place-items-center hover:bg-blue-100" aria-label="email">
              <Mail className="h-3 w-3" />
            </a>
          )}
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[9.5px] font-bold"
            title={owner?.full_name ?? "Chưa gán"}>
            {initials(owner?.full_name)}
          </div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
        <Calendar className="h-2.5 w-2.5" /> {timeAgo(deal.last_activity_at)}
      </div>
    </div>
  );
}

type DealFormState = {
  title: string; stage_id: string; value: string;
  lead_id: string | "none"; project_id: string | "none"; owner_user_id: string | "none";
  next_action: string; expected_close_date: string;
};
function emptyForm(stageId?: string): DealFormState {
  return { title: "", stage_id: stageId ?? "", value: "", lead_id: "none",
    project_id: "none", owner_user_id: "none", next_action: "", expected_close_date: "" };
}
function dealToForm(d: Deal): DealFormState {
  return {
    title: d.title, stage_id: d.stage_id, value: d.value ? String(d.value) : "",
    lead_id: d.lead_id ?? "none", project_id: d.project_id ?? "none",
    owner_user_id: d.owner_user_id ?? "none", next_action: d.next_action ?? "",
    expected_close_date: d.expected_close_date ?? "",
  };
}
function buildPayload(f: DealFormState) {
  return {
    title: f.title.trim(),
    stage_id: f.stage_id,
    value: f.value ? Number(f.value.replace(/[^\d.]/g, "")) : null,
    lead_id: f.lead_id === "none" ? null : f.lead_id,
    project_id: f.project_id === "none" ? null : f.project_id,
    owner_user_id: f.owner_user_id === "none" ? null : f.owner_user_id,
    next_action: f.next_action || null,
    expected_close_date: f.expected_close_date || null,
  };
}

function DealForm({
  form, setForm, stages, leads, projects, owners,
}: {
  form: DealFormState; setForm: (f: DealFormState) => void;
  stages: Stage[]; leads: Lead[]; projects: Project[]; owners: Owner[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[12px]">Tiêu đề deal *</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="VD: Bán căn 2PN tòa A1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[12px]">Giai đoạn</Label>
          <Select value={form.stage_id} onValueChange={(v) => setForm({ ...form, stage_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[12px]">Giá trị (VND)</Label>
          <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
            placeholder="2000000000" inputMode="numeric" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[12px]">Lead</Label>
          <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Không —</SelectItem>
              {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.full_name ?? l.phone ?? l.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[12px]">Dự án</Label>
          <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Không —</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[12px]">Phụ trách</Label>
          <Select value={form.owner_user_id} onValueChange={(v) => setForm({ ...form, owner_user_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Chưa gán —</SelectItem>
              {owners.map((o) => <SelectItem key={o.user_id} value={o.user_id}>{o.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[12px]">Ngày dự kiến chốt</Label>
          <Input type="date" value={form.expected_close_date}
            onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="text-[12px]">Hành động tiếp theo</Label>
        <Textarea rows={2} value={form.next_action}
          onChange={(e) => setForm({ ...form, next_action: e.target.value })}
          placeholder="VD: Gọi lại lúc 10h sáng mai" />
      </div>
    </div>
  );
}

function DealDialog({
  open, onClose, defaultStageId, stages, leads, projects, owners, onSave,
}: {
  open: boolean; onClose: () => void; defaultStageId?: string; tenantId: string;
  stages: Stage[]; leads: Lead[]; projects: Project[]; owners: Owner[];
  onSave: (payload: any) => Promise<void>;
}) {
  const [form, setForm] = useState<DealFormState>(() => emptyForm(defaultStageId));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Tạo deal mới</DialogTitle></DialogHeader>
        <DealForm form={form} setForm={setForm} stages={stages} leads={leads}
          projects={projects} owners={owners} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button disabled={!form.title || !form.stage_id}
            onClick={() => onSave(buildPayload(form))}>Tạo deal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DealSheet({
  deal, lead, stages, leads, projects, owners, onClose, onSave, onDelete,
}: {
  deal: Deal; lead: Lead | null;
  stages: Stage[]; leads: Lead[]; projects: Project[]; owners: Owner[];
  onClose: () => void; onSave: (p: any) => Promise<void>; onDelete: () => Promise<void>;
}) {
  const [form, setForm] = useState<DealFormState>(() => dealToForm(deal));
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="truncate">Chi tiết deal</span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {lead && (
            <div className="rounded-xl border border-border p-3 bg-muted/30 flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold text-[12px]">
                {initials(lead.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold truncate">{lead.full_name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{lead.phone ?? lead.email}</div>
              </div>
              <div className="flex gap-1">
                {lead.phone && <Button asChild size="sm" variant="outline" className="h-7"><a href={`tel:${lead.phone}`}><Phone className="h-3 w-3" /></a></Button>}
                {lead.email && <Button asChild size="sm" variant="outline" className="h-7"><a href={`mailto:${lead.email}`}><Mail className="h-3 w-3" /></a></Button>}
              </div>
            </div>
          )}
          <DealForm form={form} setForm={setForm} stages={stages} leads={leads}
            projects={projects} owners={owners} />
          <div className="text-[11px] text-muted-foreground">
            Hoạt động cuối: {timeAgo(deal.last_activity_at)}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <Button variant="ghost" onClick={onDelete} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" /> Xoá deal
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Đóng</Button>
              <Button onClick={() => onSave(buildPayload(form))} disabled={!form.title}>Lưu</Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
