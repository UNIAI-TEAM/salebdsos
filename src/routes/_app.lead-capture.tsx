import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus, Search, UserPlus, Users2, Sparkles, Trash2, RefreshCw, X,
  Link2, Copy, ExternalLink, Code2, Pencil, FileText, Power,
} from "lucide-react";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { useAuth } from "@/hooks/use-auth";
import {
  listLeads, upsertLead, updateLeadStatus, softDeleteLead, getLeadStats,
  LEAD_STATUSES, type LeadStatus,
} from "@/lib/lead.functions";
import {
  listLeadForms, createLeadForm, updateLeadForm, deleteLeadForm,
  listFormSubmissions, DEFAULT_FIELDS, FIELD_TYPES,
  type LeadFormField,
} from "@/lib/lead-form.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/lead-capture")({ component: LeadCapturePage });

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  consulting: "Đang tư vấn",
  quoted: "Đã báo giá",
  deposit: "Đặt cọc",
  won: "Thành công",
  lost: "Thất bại",
};
const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  contacted: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100",
  consulting: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  quoted: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  deposit: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
  won: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  lost: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

const SOURCES = ["NFC Tap", "QR Scan", "AirDrop", "Landing Page", "Sự kiện", "Referral", "Khác"];

function LeadCapturePage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id ?? "";
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [page, setPage] = useState(1);
  const [openForm, setOpenForm] = useState(false);

  const list = useServerFn(listLeads);
  const stats = useServerFn(getLeadStats);
  const upsert = useServerFn(upsertLead);
  const setStatusFn = useServerFn(updateLeadStatus);
  const softDelete = useServerFn(softDeleteLead);

  const listQ = useQuery({
    queryKey: ["lead-capture", tenantId, q, status, page],
    queryFn: () => list({ data: { tenantId, q: q || undefined, status: status || undefined, page, pageSize: 20 } }),
    enabled: !!tenantId,
  });
  const statsQ = useQuery({
    queryKey: ["lead-capture-stats", tenantId],
    queryFn: () => stats({ data: { tenantId } }),
    enabled: !!tenantId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lead-capture", tenantId] });
    qc.invalidateQueries({ queryKey: ["lead-capture-stats", tenantId] });
  };

  const createM = useMutation({
    mutationFn: (payload: any) => upsert({ data: { ...payload, tenant_id: tenantId } }),
    onSuccess: () => { toast.success("Đã tạo lead"); setOpenForm(false); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi tạo lead"),
  });
  const statusM = useMutation({
    mutationFn: (v: { id: string; status: LeadStatus }) => setStatusFn({ data: v }),
    onSuccess: () => { toast.success("Đã cập nhật trạng thái"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => softDelete({ data: { id } }),
    onSuccess: () => { toast.success("Đã xoá"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });

  const rows = listQ.data?.rows ?? [];
  const total = listQ.data?.total ?? 0;
  const pageSize = listQ.data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const counts = statsQ.data?.counts ?? {};
  const kpis = useMemo(() => ({
    total: statsQ.data?.total ?? 0,
    last30: statsQ.data?.last30 ?? 0,
    new: counts["new"] ?? 0,
    won: statsQ.data?.won ?? 0,
  }), [statsQ.data, counts]);

  return (
    <div>
      <PageHeader
        title="Thu Lead"
        sub="Tạo lead mới nhanh, tìm kiếm và quản lý danh sách theo trạng thái pipeline."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => invalidate()}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" /> Làm mới
            </button>
            <button
              onClick={() => setOpenForm(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Tạo lead mới
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Users2} label="Tổng lead" value={String(kpis.total)} delta={0} deltaLabel="" tone="primary" />
        <KpiCard icon={Sparkles} label="30 ngày qua" value={String(kpis.last30)} delta={0} deltaLabel="" tone="indigo" />
        <KpiCard icon={UserPlus} label="Lead mới" value={String(kpis.new)} delta={0} deltaLabel="" tone="amber" />
        <KpiCard icon={Users2} label="Thành công" value={String(kpis.won)} delta={0} deltaLabel="" tone="green" />
      </div>

      <SectionCard
        title="Danh sách lead"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Tìm theo tên/email/SĐT"
                className="h-8 pl-7 pr-3 rounded-md border border-border bg-card text-[12.5px] w-64 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
              className="h-8 px-2 rounded-md border border-border bg-card text-[12.5px]"
            >
              <option value="">Tất cả trạng thái</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        }
      >
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium">Khách hàng</th>
                <th className="px-3 py-2.5 font-medium">Liên hệ</th>
                <th className="px-3 py-2.5 font-medium">Nguồn</th>
                <th className="px-3 py-2.5 font-medium">Trạng thái</th>
                <th className="px-3 py-2.5 font-medium text-right">Tạo lúc</th>
                <th className="px-3 py-2.5 font-medium text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {listQ.isLoading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Đang tải...</td></tr>
              )}
              {!listQ.isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Chưa có lead nào. Bấm "Tạo lead mới" để bắt đầu.</td></tr>
              )}
              {rows.map((l: any) => (
                <tr key={l.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{l.full_name}</div>
                    {l.budget && <div className="text-[11.5px] text-muted-foreground mt-0.5">Ngân sách: {l.budget}</div>}
                  </td>
                  <td className="px-3 py-3 text-[12.5px] text-foreground/80">
                    {l.phone && <div>{l.phone}</div>}
                    {l.email && <div className="text-muted-foreground">{l.email}</div>}
                    {!l.phone && !l.email && <span className="text-muted-foreground italic">—</span>}
                  </td>
                  <td className="px-3 py-3 text-[12.5px] text-muted-foreground">{l.source ?? "—"}</td>
                  <td className="px-3 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => statusM.mutate({ id: l.id, status: e.target.value as LeadStatus })}
                      className={["h-7 px-2 rounded-md text-[11.5px] font-semibold border-0 focus:ring-2 focus:ring-primary/30", STATUS_TONE[l.status as LeadStatus]].join(" ")}
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-right text-[12px] text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => { if (confirm("Xoá lead này?")) deleteM.mutate(l.id); }}
                      className="p-1.5 rounded-md hover:bg-rose-50 text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-[12.5px]">
            <div className="text-muted-foreground">
              Trang {page} / {totalPages} · {total} lead
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 px-3 rounded-md border border-border bg-card disabled:opacity-40 hover:bg-muted"
              >Trước</button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-3 rounded-md border border-border bg-card disabled:opacity-40 hover:bg-muted"
              >Sau</button>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="mt-6">
        <PublicFormsPanel tenantId={tenantId} />
      </div>

      {openForm && (
        <LeadFormDialog
          onClose={() => setOpenForm(false)}
          onSubmit={(v) => createM.mutate(v)}
          submitting={createM.isPending}
        />
      )}
    </div>
  );
}

function LeadFormDialog({
  onClose, onSubmit, submitting,
}: { onClose: () => void; onSubmit: (v: any) => void; submitting: boolean }) {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    source: "NFC Tap",
    status: "new" as LeadStatus,
    budget: "",
    need_type: "" as "" | "buy" | "rent" | "invest",
    timeline: "",
    notes: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error("Tên khách bắt buộc"); return; }
    onSubmit({
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      source: form.source || null,
      status: form.status,
      budget: form.budget.trim() || null,
      need_type: form.need_type || null,
      timeline: form.timeline.trim() || null,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="text-[15px] font-semibold">Tạo lead mới</div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <Field label="Họ và tên *">
            <input required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className={inputCls} placeholder="Nguyễn Văn A" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số điện thoại">
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="09xx xxx xxx" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="a@example.com" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nguồn">
              <select value={form.source} onChange={(e) => set("source", e.target.value)} className={inputCls}>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Trạng thái">
              <select value={form.status} onChange={(e) => set("status", e.target.value as LeadStatus)} className={inputCls}>
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngân sách">
              <input value={form.budget} onChange={(e) => set("budget", e.target.value)} className={inputCls} placeholder="3 - 5 tỷ" />
            </Field>
            <Field label="Nhu cầu">
              <select value={form.need_type} onChange={(e) => set("need_type", e.target.value as any)} className={inputCls}>
                <option value="">—</option>
                <option value="buy">Mua</option>
                <option value="rent">Thuê</option>
                <option value="invest">Đầu tư</option>
              </select>
            </Field>
          </div>
          <Field label="Thời gian dự kiến">
            <input value={form.timeline} onChange={(e) => set("timeline", e.target.value)} className={inputCls} placeholder="Trong 3 tháng" />
          </Field>
          <Field label="Ghi chú">
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={inputCls} placeholder="Thông tin bổ sung..." />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted">Huỷ</button>
          <button
            type="submit"
            disabled={submitting}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "Đang lưu..." : "Tạo lead"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = "w-full h-9 px-3 rounded-lg border border-border bg-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11.5px] font-semibold text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}


// ---------------------------------------------------------------------------
// Public reusable lead forms
// ---------------------------------------------------------------------------
const FIELD_TYPE_LABEL: Record<string, string> = {
  text: "Văn bản", email: "Email", phone: "Số điện thoại",
  textarea: "Đoạn văn", select: "Lựa chọn",
};

function PublicFormsPanel({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeadForms);
  const createFn = useServerFn(createLeadForm);
  const updateFn = useServerFn(updateLeadForm);
  const deleteFn = useServerFn(deleteLeadForm);
  const subsFn = useServerFn(listFormSubmissions);

  const [editing, setEditing] = useState<any | null>(null);
  const [subsOf, setSubsOf] = useState<any | null>(null);
  const [origin, setOrigin] = useState("");
  useState(() => 0);

  const formsQ = useQuery({
    queryKey: ["lead-forms", tenantId],
    queryFn: () => listFn({ data: { tenantId } }),
    enabled: !!tenantId,
  });
  const subsQ = useQuery({
    queryKey: ["lead-form-subs", subsOf?.id],
    queryFn: () => subsFn({ data: { formId: subsOf.id } }),
    enabled: !!subsOf?.id,
  });

  if (typeof window !== "undefined" && !origin) setOrigin(window.location.origin);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["lead-forms", tenantId] });

  const saveM = useMutation({
    mutationFn: (v: any) =>
      v.id ? updateFn({ data: v }) : createFn({ data: { ...v, tenantId } }),
    onSuccess: () => { toast.success("Đã lưu biểu mẫu"); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Không lưu được"),
  });
  const delM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Đã xoá biểu mẫu"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Không xoá được"),
  });
  const toggleM = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => updateFn({ data: v }),
    onSuccess: () => invalidate(),
  });

  const forms = formsQ.data?.items ?? [];

  return (
    <SectionCard
      title="Biểu mẫu công khai"
      action={
        <button
          onClick={() =>
            setEditing({
              name: "", slug: "", description: "", fields: DEFAULT_FIELDS,
              success_message: "", redirect_url: "", is_active: true,
            })
          }
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Tạo biểu mẫu
        </button>
      }
    >
      {formsQ.isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-[13px]">Đang tải…</div>
      ) : forms.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-[13px]">
          <FileText className="h-5 w-5 mx-auto mb-2 opacity-50" />
          Chưa có biểu mẫu. Tạo biểu mẫu để nhận lead từ link công khai hoặc nhúng vào website.
        </div>
      ) : (
        <div className="space-y-2">
          {forms.map((f: any) => {
            const url = `${origin}/f/${f.slug}`;
            const embed = `<iframe src="${url}" width="100%" height="720" style="border:0"></iframe>`;
            return (
              <div key={f.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[13.5px] truncate">{f.name}</div>
                    <div className="text-[12px] text-muted-foreground truncate">{url}</div>
                  </div>
                  <span className={`h-6 px-2 rounded-md text-[11.5px] font-semibold inline-flex items-center ${f.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {f.is_active ? "Đang bật" : "Đã tắt"}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">{f.submit_count ?? 0} lượt gửi</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <IconBtn onClick={() => { void navigator.clipboard.writeText(url); toast.success("Đã copy link"); }} icon={Copy} label="Copy link" />
                  <a href={url} target="_blank" rel="noreferrer" className="h-8 px-2.5 rounded-lg border border-border text-[12px] inline-flex items-center gap-1.5 hover:bg-muted">
                    <ExternalLink className="h-3.5 w-3.5" /> Mở
                  </a>
                  <IconBtn onClick={() => { void navigator.clipboard.writeText(embed); toast.success("Đã copy mã nhúng"); }} icon={Code2} label="Mã nhúng" />
                  <IconBtn onClick={() => setSubsOf(f)} icon={Users2} label="Lượt gửi" />
                  <IconBtn onClick={() => setEditing({ ...f, fields: (f.fields ?? DEFAULT_FIELDS) as LeadFormField[] })} icon={Pencil} label="Sửa" />
                  <IconBtn onClick={() => toggleM.mutate({ id: f.id, is_active: !f.is_active })} icon={Power} label={f.is_active ? "Tắt" : "Bật"} />
                  <button
                    onClick={() => { if (confirm("Xoá biểu mẫu này?")) delM.mutate(f.id); }}
                    className="h-8 px-2.5 rounded-lg border border-border text-[12px] inline-flex items-center gap-1.5 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xoá
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <FormBuilderDialog
          value={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={() => saveM.mutate(editing)}
          saving={saveM.isPending}
        />
      )}

      {subsOf && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSubsOf(null)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[80vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-[14px]">Lượt gửi · {subsOf.name}</div>
              <button onClick={() => setSubsOf(null)} className="p-1.5 rounded-md hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            {subsQ.isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-[13px]">Đang tải…</div>
            ) : (subsQ.data?.items ?? []).length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-[13px]">Chưa có lượt gửi nào.</div>
            ) : (
              <div className="space-y-2">
                {(subsQ.data?.items ?? []).map((s: any) => (
                  <div key={s.id} className="rounded-xl border border-border p-3 text-[12.5px]">
                    <div className="text-muted-foreground text-[11.5px] mb-1">
                      {new Date(s.created_at).toLocaleString("vi-VN")}
                    </div>
                    <pre className="whitespace-pre-wrap break-words text-[12px]">{JSON.stringify(s.payload, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function IconBtn({ onClick, icon: Icon, label }: { onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick} className="h-8 px-2.5 rounded-lg border border-border text-[12px] inline-flex items-center gap-1.5 hover:bg-muted">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function FormBuilderDialog({
  value, onChange, onClose, onSave, saving,
}: { value: any; onChange: (v: any) => void; onClose: () => void; onSave: () => void; saving: boolean }) {
  const fields: LeadFormField[] = value.fields ?? [];
  const setFields = (f: LeadFormField[]) => onChange({ ...value, fields: f });
  const inputCls = "w-full h-10 px-3 rounded-xl border border-border bg-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-xl max-h-[85vh] overflow-y-auto p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-semibold text-[14px]">{value.id ? "Sửa biểu mẫu" : "Tạo biểu mẫu"}</div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <label className="block text-[12px] text-muted-foreground">Tên biểu mẫu</label>
        <input value={value.name ?? ""} onChange={(e) => onChange({ ...value, name: e.target.value })} className={inputCls} placeholder="Đăng ký nhận bảng giá" />

        <label className="block text-[12px] text-muted-foreground">Đường dẫn công khai (/f/...)</label>
        <input value={value.slug ?? ""} onChange={(e) => onChange({ ...value, slug: e.target.value })} className={inputCls} placeholder="dang-ky-bang-gia" />

        <label className="block text-[12px] text-muted-foreground">Mô tả ngắn</label>
        <textarea value={value.description ?? ""} onChange={(e) => onChange({ ...value, description: e.target.value })} rows={2} className={inputCls + " py-2 h-auto"} />

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-semibold">Các trường thu thập</span>
            <button
              onClick={() => setFields([...fields, { key: `field_${fields.length + 1}`, label: "Trường mới", type: "text", required: false } as LeadFormField])}
              className="h-8 px-2.5 rounded-lg border border-border text-[12px] inline-flex items-center gap-1.5 hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm trường
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={f.label}
                  onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  className="h-9 px-2.5 rounded-lg border border-border bg-card text-[12.5px] flex-1"
                  placeholder="Nhãn"
                />
                <select
                  value={f.type}
                  onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, type: e.target.value as any } : x)))}
                  className="h-9 px-2 rounded-lg border border-border bg-card text-[12.5px]"
                >
                  {FIELD_TYPES.map((t) => (<option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>))}
                </select>
                <label className="text-[12px] inline-flex items-center gap-1 text-muted-foreground">
                  <input
                    type="checkbox" checked={!!f.required}
                    onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)))}
                  /> Bắt buộc
                </label>
                <button onClick={() => setFields(fields.filter((_, j) => j !== i))} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="block text-[12px] text-muted-foreground">Thông báo sau khi gửi</label>
        <input value={value.success_message ?? ""} onChange={(e) => onChange({ ...value, success_message: e.target.value })} className={inputCls} placeholder="Cảm ơn bạn, chúng tôi sẽ liên hệ ngay!" />

        <label className="block text-[12px] text-muted-foreground">Chuyển hướng sau khi gửi (tuỳ chọn)</label>
        <input value={value.redirect_url ?? ""} onChange={(e) => onChange({ ...value, redirect_url: e.target.value })} className={inputCls} placeholder="https://..." />

        <label className="text-[12.5px] inline-flex items-center gap-2">
          <input type="checkbox" checked={value.is_active !== false} onChange={(e) => onChange({ ...value, is_active: e.target.checked })} />
          Kích hoạt biểu mẫu
        </label>

        <div className="flex gap-2 pt-2">
          <button
            disabled={saving || !String(value.name ?? "").trim() || fields.length === 0}
            onClick={onSave}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-60 inline-flex items-center gap-2"
          >
            <Link2 className="h-4 w-4" /> {saving ? "Đang lưu…" : "Lưu biểu mẫu"}
          </button>
          <button onClick={onClose} className="h-10 px-4 rounded-xl border border-border text-[13px] font-medium hover:bg-muted">Huỷ</button>
        </div>
      </div>
    </div>
  );
}
