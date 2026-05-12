import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import {
  Filter, Plus, Phone, Mail, MessageCircle, Users2, Target, Sparkles, X, Upload,
  ChevronDown, DollarSign, UserPlus, TrendingUp, Heart, Search, Loader2, Trash2, Save,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  listLeads, getLeadStats, upsertLead, importLeads, softDeleteLead,
  listTenantOwners, listProjectsLite, LEAD_STATUSES, type LeadStatus,
} from "@/lib/lead.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_app/leads")({ component: LeadsPage });

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Mới", contacted: "Đã liên hệ", consulting: "Đang tư vấn",
  quoted: "Đã báo giá", deposit: "Đặt cọc", won: "Thành công", lost: "Thất bại",
};
const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
  contacted: "bg-violet-50 text-violet-600 ring-1 ring-violet-100",
  consulting: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  quoted: "bg-orange-50 text-orange-600 ring-1 ring-orange-100",
  deposit: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100",
  won: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
  lost: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
};
const NEED_LABEL: Record<string, string> = { buy: "Mua để ở", rent: "Thuê", invest: "Đầu tư" };

const COMMON_SOURCES = ["NFC", "QR Code", "Link", "Social", "Facebook Ads", "Zalo", "Website", "Referral", "Sự kiện", "Khác"];

type Lead = Awaited<ReturnType<typeof listLeads>>["rows"][number];

const initials = (n: string | null | undefined) => (n || "?").trim().split(/\s+/).pop()!.charAt(0).toUpperCase();

function ScorePill({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground text-[11px]">—</span>;
  const tone = score >= 80 ? "text-emerald-600 bg-emerald-50" : score >= 60 ? "text-amber-600 bg-amber-50" : "text-slate-600 bg-slate-100";
  return <span className={["inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums", tone].join(" ")}><Sparkles className="h-3 w-3" />{score}</span>;
}

function fmtDate(s: string) {
  try { return new Date(s).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return s; }
}

function LeadsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<string>("");
  const [sourceF, setSourceF] = useState<string>("");
  const [projectF, setProjectF] = useState<string>("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLead, setEditorLead] = useState<Partial<Lead> | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const fnList = useServerFn(listLeads);
  const fnStats = useServerFn(getLeadStats);
  const fnOwners = useServerFn(listTenantOwners);
  const fnProjects = useServerFn(listProjectsLite);
  const fnUpsert = useServerFn(upsertLead);
  const fnImport = useServerFn(importLeads);
  const fnDelete = useServerFn(softDeleteLead);

  const leadsQ = useQuery({
    queryKey: ["leads", tenantId, search, statusF, sourceF, projectF, page],
    queryFn: () => fnList({ data: { tenantId: tenantId!, q: search || undefined, status: statusF || undefined, source: sourceF || undefined, projectId: projectF || undefined, page, pageSize: 20 } }),
    enabled: !!tenantId,
  });
  const statsQ = useQuery({
    queryKey: ["lead-stats", tenantId],
    queryFn: () => fnStats({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const ownersQ = useQuery({
    queryKey: ["tenant-owners", tenantId],
    queryFn: () => fnOwners({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const projectsQ = useQuery({
    queryKey: ["projects-lite", tenantId],
    queryFn: () => fnProjects({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const rows = leadsQ.data?.rows ?? [];
  const total = leadsQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const lead = useMemo(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["leads", tenantId] });
    qc.invalidateQueries({ queryKey: ["lead-stats", tenantId] });
  };

  const upsertM = useMutation({
    mutationFn: (input: any) => fnUpsert({ data: input }),
    onSuccess: (row) => {
      toast.success("Đã lưu lead");
      invalidate();
      setEditorOpen(false);
      if (row?.id) setOpenId(row.id);
    },
    onError: (e: any) => toast.error(e.message ?? "Lưu thất bại"),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Đã xoá"); invalidate(); setOpenId(null); },
    onError: (e: any) => toast.error(e.message ?? "Xoá thất bại"),
  });

  const importM = useMutation({
    mutationFn: (rows: any[]) => fnImport({ data: { tenant_id: tenantId!, rows } }),
    onSuccess: (r) => { toast.success(`Đã nhập ${r.inserted} lead`); invalidate(); setImportOpen(false); },
    onError: (e: any) => toast.error(e.message ?? "Nhập thất bại"),
  });

  const openCreate = () => {
    setEditorLead({ status: "new", tenant_id: tenantId, full_name: "", tags: [] });
    setEditorOpen(true);
  };
  const openEdit = (l: Lead) => { setEditorLead(l); setEditorOpen(true); };

  if (!tenantId) {
    return <div className="p-8 text-muted-foreground">Vui lòng chọn workspace.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Leads (CRM)" sub="Quản lý và chăm sóc khách hàng tiềm năng." />

      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4">
        <KpiCard icon={Users2} label="Tổng leads" value={String(statsQ.data?.total ?? 0)} delta={0} tone="primary" />
        <KpiCard icon={UserPlus} label="Lead 30 ngày" value={String(statsQ.data?.last30 ?? 0)} delta={0} tone="blue" />
        <KpiCard icon={Heart} label="Đang tư vấn" value={String(statsQ.data?.counts?.consulting ?? 0)} delta={0} tone="indigo" />
        <KpiCard icon={Target} label="Đặt cọc" value={String(statsQ.data?.counts?.deposit ?? 0)} delta={0} tone="amber" />
        <KpiCard icon={TrendingUp} label="Thành công" value={String(statsQ.data?.won ?? 0)} delta={0} tone="green" />
        <KpiCard icon={DollarSign} label="Thất bại" value={String(statsQ.data?.lost ?? 0)} delta={0} tone="rose" />
      </div>

      <SectionCard className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-[320px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, email, SĐT…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-9"
            />
          </div>
          <Select value={statusF || "all"} onValueChange={(v) => { setStatusF(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceF || "all"} onValueChange={(v) => { setSourceF(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Nguồn" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nguồn</SelectItem>
              {COMMON_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={projectF || "all"} onValueChange={(v) => { setProjectF(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Dự án" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả dự án</SelectItem>
              {(projectsQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button size="sm" className="h-9" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Thêm lead
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="font-semibold py-3">Họ và tên</th>
                <th className="font-semibold py-3">Liên hệ</th>
                <th className="font-semibold py-3">Nguồn</th>
                <th className="font-semibold py-3">Dự án</th>
                <th className="font-semibold py-3">Nhu cầu</th>
                <th className="font-semibold py-3">Trạng thái</th>
                <th className="font-semibold py-3 text-center">AI Score</th>
                <th className="font-semibold py-3">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="text-[12.5px]">
              {leadsQ.isLoading && (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Đang tải…</td></tr>
              )}
              {!leadsQ.isLoading && rows.length === 0 && (
                <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">Chưa có lead nào. Bấm <span className="font-medium text-foreground">Thêm lead</span> để bắt đầu.</td></tr>
              )}
              {rows.map((l) => {
                const active = openId === l.id;
                const projName = projectsQ.data?.find((p) => p.id === l.project_id)?.name;
                return (
                  <tr key={l.id} onClick={() => setOpenId(l.id)} className={[
                    "border-b border-border/70 last:border-0 cursor-pointer transition",
                    active ? "bg-primary/5" : "hover:bg-muted/40",
                  ].join(" ")}>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-indigo-400/30 grid place-items-center text-[11.5px] font-semibold text-primary">
                          {initials(l.full_name)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{l.full_name}</div>
                          {l.tags && l.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {l.tags.slice(0, 2).map((t) => <span key={t} className="text-[9.5px] px-1.5 py-0 rounded bg-muted text-muted-foreground">{t}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-muted-foreground tabular-nums">
                      <div>{l.phone || "—"}</div>
                      <div className="text-[11px] truncate max-w-[180px]">{l.email || ""}</div>
                    </td>
                    <td className="py-3.5">
                      {l.source ? <span className="text-[10.5px] px-2 py-1 rounded-md font-semibold bg-muted text-muted-foreground">{l.source}</span> : "—"}
                    </td>
                    <td className="py-3.5 text-foreground">{projName || "—"}</td>
                    <td className="py-3.5 text-muted-foreground">
                      {l.need_type ? NEED_LABEL[l.need_type] : "—"}
                      {l.budget && <div className="text-[11px]">{l.budget}</div>}
                    </td>
                    <td className="py-3.5">
                      <span className={["text-[10.5px] px-2 py-1 rounded-md font-semibold", STATUS_TONE[l.status as LeadStatus]].join(" ")}>
                        {STATUS_LABEL[l.status as LeadStatus]}
                      </span>
                    </td>
                    <td className="py-3.5 text-center"><ScorePill score={l.score ?? null} /></td>
                    <td className="py-3.5 text-muted-foreground tabular-nums">{fmtDate(l.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 mt-4 pt-2 border-t border-border">
          <div className="text-[12px] text-muted-foreground">
            {total > 0 ? `${(page - 1) * 20 + 1} – ${Math.min(page * 20, total)} của ${total}` : "0 lead"}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="px-3 text-[12.5px] font-medium">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </SectionCard>

      {/* Detail drawer */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="sm:max-w-[480px] overflow-y-auto">
          {lead && (
            <LeadDetail
              lead={lead}
              ownerName={ownersQ.data?.find((o) => o.user_id === lead.owner_user_id)?.full_name}
              projectName={projectsQ.data?.find((p) => p.id === lead.project_id)?.name}
              onEdit={() => openEdit(lead)}
              onDelete={() => { if (confirm("Xoá lead này?")) deleteM.mutate(lead.id); }}
              onStatusChange={(s) => upsertM.mutate({ ...lead, status: s, tags: lead.tags ?? [] })}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Editor dialog */}
      <LeadEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editorLead}
        owners={ownersQ.data ?? []}
        projects={projectsQ.data ?? []}
        saving={upsertM.isPending}
        onSave={(payload) => upsertM.mutate({ ...payload, tenant_id: tenantId })}
      />

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        importing={importM.isPending}
        onImport={(rows) => importM.mutate(rows)}
      />
    </div>
  );
}

function LeadDetail({
  lead, ownerName, projectName, onEdit, onDelete, onStatusChange,
}: {
  lead: Lead; ownerName?: string; projectName?: string;
  onEdit: () => void; onDelete: () => void; onStatusChange: (s: LeadStatus) => void;
}) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">Chi tiết lead</SheetTitle>
      </SheetHeader>
      <div className="space-y-5 mt-2">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 grid place-items-center text-white text-[16px] font-bold">{initials(lead.full_name)}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-bold truncate">{lead.full_name}</h3>
            <div className="text-[12px] text-muted-foreground mt-0.5">{projectName || "Chưa có dự án quan tâm"}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className={["text-[10.5px] px-2 py-0.5 rounded-md font-semibold", STATUS_TONE[lead.status as LeadStatus]].join(" ")}>{STATUS_LABEL[lead.status as LeadStatus]}</span>
              <ScorePill score={lead.score ?? null} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {lead.phone && <a href={`tel:${lead.phone}`} className="h-10 rounded-lg border border-border grid place-items-center hover:bg-muted"><Phone className="h-4 w-4" /></a>}
          {lead.phone && <a href={`https://zalo.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="h-10 rounded-lg border border-border grid place-items-center hover:bg-muted text-[10px] font-bold">Zalo</a>}
          {lead.email && <a href={`mailto:${lead.email}`} className="h-10 rounded-lg border border-border grid place-items-center hover:bg-muted"><Mail className="h-4 w-4" /></a>}
          <button onClick={onEdit} className="h-10 rounded-lg bg-primary text-primary-foreground grid place-items-center hover:bg-primary/90"><Save className="h-4 w-4" /></button>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-primary/5 to-indigo-50 p-3 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div className="text-[12px]">
            <div className="font-semibold">AI Lead Score</div>
            <div className="text-muted-foreground">Tính năng đang chuẩn bị — sẽ chấm điểm dựa trên hành vi tương tác.</div>
          </div>
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Trạng thái</Label>
          <Select value={lead.status} onValueChange={(v) => onStatusChange(v as LeadStatus)}>
            <SelectTrigger className="h-9 mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Thông tin</div>
          <dl className="space-y-2 text-[12.5px]">
            <Row k="SĐT" v={lead.phone || "—"} />
            <Row k="Email" v={lead.email || "—"} />
            <Row k="Nguồn" v={lead.source || "—"} />
            <Row k="Nhu cầu" v={lead.need_type ? NEED_LABEL[lead.need_type] : "—"} />
            <Row k="Ngân sách" v={lead.budget || "—"} />
            <Row k="Thời gian" v={lead.timeline || "—"} />
            <Row k="Phụ trách" v={ownerName || "Chưa gán"} />
            <Row k="Ngày tạo" v={fmtDate(lead.created_at)} />
          </dl>
        </div>

        {lead.tags && lead.tags.length > 0 && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {lead.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
          </div>
        )}

        {lead.notes && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Ghi chú</div>
            <p className="text-[12.5px] whitespace-pre-wrap text-foreground">{lead.notes}</p>
          </div>
        )}

        <div className="pt-2 border-t border-border flex justify-end">
          <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Xoá lead
          </Button>
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium text-right truncate">{v}</dd>
    </div>
  );
}

function LeadEditor({
  open, onClose, initial, owners, projects, saving, onSave,
}: {
  open: boolean; onClose: () => void; initial: Partial<Lead> | null;
  owners: { user_id: string; full_name: string }[];
  projects: { id: string; name: string }[];
  saving: boolean;
  onSave: (p: any) => void;
}) {
  const [form, setForm] = useState<any>(initial ?? {});
  const [tagInput, setTagInput] = useState("");
  useEffect(() => { setForm(initial ?? {}); setTagInput(""); }, [initial, open]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const tags: string[] = form.tags ?? [];
  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) set("tags", [...tags, t]);
    setTagInput("");
  };

  const submit = () => {
    if (!form.full_name?.trim()) { toast.error("Nhập họ tên"); return; }
    onSave({
      id: form.id,
      full_name: form.full_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      source: form.source || null,
      status: form.status || "new",
      project_id: form.project_id || null,
      owner_user_id: form.owner_user_id || null,
      budget: form.budget || null,
      need_type: form.need_type || null,
      timeline: form.timeline || null,
      notes: form.notes || null,
      tags,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Cập nhật lead" : "Thêm lead mới"}</DialogTitle>
          <DialogDescription>Nhập thông tin khách hàng tiềm năng.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Họ và tên *</Label>
            <Input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div>
            <Label>SĐT</Label>
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <Label>Nguồn</Label>
            <Select value={form.source ?? ""} onValueChange={(v) => set("source", v)}>
              <SelectTrigger><SelectValue placeholder="Chọn nguồn" /></SelectTrigger>
              <SelectContent>{COMMON_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Trạng thái</Label>
            <Select value={form.status ?? "new"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dự án quan tâm</Label>
            <Select value={form.project_id ?? "none"} onValueChange={(v) => set("project_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Không —</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nhu cầu</Label>
            <Select value={form.need_type ?? "none"} onValueChange={(v) => set("need_type", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Không —</SelectItem>
                <SelectItem value="buy">Mua để ở</SelectItem>
                <SelectItem value="rent">Thuê</SelectItem>
                <SelectItem value="invest">Đầu tư</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ngân sách</Label>
            <Input placeholder="VD: 3 - 5 tỷ" value={form.budget ?? ""} onChange={(e) => set("budget", e.target.value)} />
          </div>
          <div>
            <Label>Thời gian dự kiến</Label>
            <Input placeholder="VD: Q3/2024" value={form.timeline ?? ""} onChange={(e) => set("timeline", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Sales phụ trách</Label>
            <Select value={form.owner_user_id ?? "none"} onValueChange={(v) => set("owner_user_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Chưa gán —</SelectItem>
                {owners.map((o) => <SelectItem key={o.user_id} value={o.user_id}>{o.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Nhập rồi Enter" />
              <Button type="button" variant="outline" onClick={addTag}>Thêm</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => set("tags", tags.filter((x) => x !== t))}>
                    {t} <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="col-span-2">
            <Label>Ghi chú</Label>
            <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ open, onClose, importing, onImport }: {
  open: boolean; onClose: () => void; importing: boolean;
  onImport: (rows: any[]) => void;
}) {
  const [text, setText] = useState("");
  const sample = `full_name,phone,email,source,project,status,budget,need_type,timeline,notes
Nguyễn Văn A,0901234567,a@example.com,NFC,,new,3-5 tỷ,buy,Q3/2024,Quan tâm căn 2PN`;

  const parse = () => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) { toast.error("Cần ít nhất 1 dòng dữ liệu"); return; }
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(",").map((c) => c.trim());
      const obj: any = {};
      headers.forEach((h, idx) => { obj[h] = cells[idx] ?? ""; });
      if (!obj.full_name) continue;
      const need = ["buy", "rent", "invest"].includes(obj.need_type) ? obj.need_type : null;
      const status = ["new", "contacted", "consulting", "quoted", "deposit", "won", "lost"].includes(obj.status) ? obj.status : "new";
      rows.push({
        full_name: obj.full_name,
        phone: obj.phone || null,
        email: obj.email || null,
        source: obj.source || null,
        status,
        budget: obj.budget || null,
        need_type: need,
        timeline: obj.timeline || null,
        notes: obj.notes || null,
        tags: [],
      });
    }
    if (!rows.length) { toast.error("Không có dòng hợp lệ"); return; }
    onImport(rows);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nhập leads từ CSV</DialogTitle>
          <DialogDescription>Dán nội dung CSV bên dưới. Cột bắt buộc: <code className="text-[11px]">full_name</code>.</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={10}
          placeholder={sample}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="font-mono text-[12px]"
        />
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setText(sample)}>Dùng mẫu</Button>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={parse} disabled={importing}>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />} Nhập dữ liệu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
