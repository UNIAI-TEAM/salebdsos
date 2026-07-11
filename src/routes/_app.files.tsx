import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Upload, Download, Trash2, RotateCcw, Search, Folder, FileText, RefreshCw, X, Tag, User,
  Pencil, Settings2, FolderInput, CheckSquare, Square,
} from "lucide-react";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listFiles, createFileRecord, softDeleteFile, restoreFile, hardDeleteFile,
  getFileSignedUrl, listFileFacets, bulkUpdateFiles, renameFolder, deleteFolder,
  renameTag, deleteTag,
} from "@/lib/file.functions";
import { listLeads } from "@/lib/lead.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/files")({ component: FilesPage });

const FOLDER_PRESETS = ["Brochure", "Bảng giá", "Hợp đồng", "Hình ảnh", "Khác"];
const BUCKET = "project-assets";
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

function humanSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function FilesPage() {
  const { currentTenant, user } = useAuth();
  const tenantId = currentTenant?.id ?? "";
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string>("all");
  const [tagF, setTagF] = useState<string>("all");
  const [leadId, setLeadId] = useState<string>("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const list = useServerFn(listFiles);
  const facets = useServerFn(listFileFacets);
  const createRec = useServerFn(createFileRecord);
  const softDel = useServerFn(softDeleteFile);
  const restore = useServerFn(restoreFile);
  const hardDel = useServerFn(hardDeleteFile);
  const signed = useServerFn(getFileSignedUrl);
  const leadsFn = useServerFn(listLeads);
  const bulkFn = useServerFn(bulkUpdateFiles);
  const renameFolderFn = useServerFn(renameFolder);
  const deleteFolderFn = useServerFn(deleteFolder);
  const renameTagFn = useServerFn(renameTag);
  const deleteTagFn = useServerFn(deleteTag);

  const listQ = useQuery({
    queryKey: ["files", tenantId, q, folder, tagF, leadId, includeDeleted],
    queryFn: () =>
      list({ data: { tenantId, q: q || undefined, folder, tag: tagF, leadId, includeDeleted, page: 1, pageSize: 200 } }),
    enabled: !!tenantId,
  });
  const facetQ = useQuery({
    queryKey: ["files-facets", tenantId],
    queryFn: () => facets({ data: { tenantId } }),
    enabled: !!tenantId,
  });
  const leadsQ = useQuery({
    queryKey: ["files-leads", tenantId],
    queryFn: () => leadsFn({ data: { tenantId, page: 1, pageSize: 100 } }),
    enabled: !!tenantId,
  });
  const leads = (leadsQ.data?.rows ?? []) as Array<{ id: string; full_name: string | null; phone: string | null }>;
  const leadMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of leads) m.set(l.id, l.full_name || l.phone || "Khách hàng");
    return m;
  }, [leads]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["files", tenantId] });
    qc.invalidateQueries({ queryKey: ["files-facets", tenantId] });
  };

  const softDelM = useMutation({
    mutationFn: (id: string) => softDel({ data: { id } }),
    onSuccess: () => { toast.success("Đã chuyển vào thùng rác"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });
  const restoreM = useMutation({
    mutationFn: (id: string) => restore({ data: { id } }),
    onSuccess: () => { toast.success("Đã khôi phục"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });
  const hardDelM = useMutation({
    mutationFn: (id: string) => hardDel({ data: { id } }),
    onSuccess: () => { toast.success("Đã xoá vĩnh viễn"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });
  const bulkM = useMutation({
    mutationFn: (input: { ids: string[]; folder?: string | null; tag?: string | null }) =>
      bulkFn({ data: { tenantId, ...input } }),
    onSuccess: (r) => { toast.success(`Đã cập nhật ${r.updated} tệp`); invalidate(); setSelected(new Set()); },
    onError: (e: any) => toast.error(e.message ?? "Lỗi"),
  });

  const doDownload = async (id: string) => {
    try {
      const r = await signed({ data: { id } });
      const a = document.createElement("a");
      a.href = r.url;
      a.download = r.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      toast.error(e.message ?? "Không tạo được link tải");
    }
  };

  const doUpload = async (file: File, meta: { folder: string; tag: string; leadId: string }) => {
    if (!tenantId) throw new Error("Chưa chọn workspace");
    if (file.size > MAX_SIZE) throw new Error(`Tệp vượt ${humanSize(MAX_SIZE)}`);
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const scope = meta.leadId ? `leads/${meta.leadId}` : "shared";
    const path = `${tenantId}/${scope}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw new Error(error.message);
    await createRec({
      data: {
        tenantId,
        bucket: BUCKET,
        path,
        name: file.name,
        size: file.size,
        mime: file.type || null,
        folder: meta.folder || null,
        tag: meta.tag || null,
        related_type: meta.leadId ? "lead" : null,
        related_id: meta.leadId || null,
      } as any,
    });
  };

  const items = listQ.data?.items ?? [];
  const folders = facetQ.data?.folders ?? {};
  const tagsCounts = facetQ.data?.tags ?? {};
  const totalSize = facetQ.data?.totalSize ?? 0;

  const folderList = useMemo(() => {
    const all = new Set<string>([...FOLDER_PRESETS, ...Object.keys(folders)]);
    return Array.from(all);
  }, [folders]);
  const tagList = useMemo(() => Object.keys(tagsCounts).sort(), [tagsCounts]);
  const visibleIds = useMemo(() => items.map((f: any) => f.id as string), [items]);
  const deletedIdSet = useMemo(() => new Set(items.filter((f: any) => !!f.deleted_at).map((f: any) => f.id as string)), [items]);
  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const selectedActiveIds = useMemo(() => selectedIds.filter((id) => !deletedIdSet.has(id)), [selectedIds, deletedIdSet]);
  const selectedDeletedIds = useMemo(() => selectedIds.filter((id) => deletedIdSet.has(id)), [selectedIds, deletedIdSet]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const toggleAll = () => {
    setSelected((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <PageHeader
        title="Tài liệu"
        sub="Thư viện tệp của workspace: brochure, bảng giá, hợp đồng, hình ảnh."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setManageOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted"
            >
              <Settings2 className="h-4 w-4" /> Quản lý thư mục & nhãn
            </button>
            <button
              onClick={() => invalidate()}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" /> Làm mới
            </button>
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90"
            >
              <Upload className="h-4 w-4" /> Tải lên
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={FileText} label="Tổng tệp" value={String(facetQ.data?.totalFiles ?? 0)} delta={0} deltaLabel="" tone="primary" />
        <KpiCard icon={Folder} label="Dung lượng" value={humanSize(totalSize)} delta={0} deltaLabel="" tone="indigo" />
        <KpiCard icon={Tag} label="Số nhãn" value={String(Object.keys(facetQ.data?.tags ?? {}).length)} delta={0} deltaLabel="" tone="amber" />
        <KpiCard icon={Folder} label="Số thư mục" value={String(Object.keys(folders).length)} delta={0} deltaLabel="" tone="green" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <FolderChip
          label="Tất cả"
          count={items.length}
          active={folder === "all"}
          onClick={() => setFolder("all")}
        />
        {folderList.map((f) => (
          <FolderChip
            key={f}
            label={f}
            count={folders[f] ?? 0}
            active={folder === f}
            onClick={() => setFolder(f)}
          />
        ))}
      </div>

      {(tagList.length > 0 || tagF !== "all") && (
        <div className="flex flex-wrap items-center gap-1.5 mb-5">
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">Nhãn:</span>
          <TagPill label="Tất cả" active={tagF === "all"} onClick={() => setTagF("all")} />
          {tagList.map((t) => (
            <TagPill key={t} label={t} count={tagsCounts[t]} active={tagF === t} onClick={() => setTagF(t)} />
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <BulkToolbar
          count={selected.size}
          folders={folderList}
          tags={tagList}
          busy={bulkM.isPending}
          onClear={() => setSelected(new Set())}
          onApplyFolder={(f: string) => bulkM.mutate({ ids: Array.from(selected), folder: f || null })}
          onApplyTag={(t: string) => bulkM.mutate({ ids: Array.from(selected), tag: t || null })}
          onSoftDelete={() => {
            if (!confirm(`Chuyển ${selected.size} tệp vào thùng rác?`)) return;
            Promise.all(Array.from(selected).map((id) => softDel({ data: { id } })))
              .then(() => { toast.success(`Đã chuyển ${selected.size} tệp vào thùng rác`); setSelected(new Set()); invalidate(); })
              .catch((e: any) => toast.error(e?.message || "Lỗi"));
          }}
        />
      )}

      <SectionCard
        title={includeDeleted ? "Danh sách tệp (gồm thùng rác)" : "Danh sách tệp"}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo tên tệp"
                className="h-8 pl-7 pr-3 rounded-md border border-border bg-card text-[12.5px] w-64 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-border bg-card text-[12.5px] max-w-[220px]"
              title="Lọc theo khách hàng"
            >
              <option value="all">Tất cả khách hàng</option>
              <option value="none">Không gắn khách hàng</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.full_name || l.phone || "Khách hàng"}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
              />
              Hiện thùng rác
            </label>
          </div>
        }
      >
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2.5 w-9">
                  <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground" title="Chọn tất cả">
                    {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-4 py-2.5 font-medium">Tên tệp</th>
                <th className="px-3 py-2.5 font-medium">Khách hàng</th>
                <th className="px-3 py-2.5 font-medium">Thư mục</th>
                <th className="px-3 py-2.5 font-medium">Nhãn</th>
                <th className="px-3 py-2.5 font-medium text-right">Kích thước</th>
                <th className="px-3 py-2.5 font-medium text-right">Tải lên</th>
                <th className="px-3 py-2.5 font-medium text-right w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {listQ.isLoading && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Đang tải...</td></tr>
              )}
              {!listQ.isLoading && items.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Chưa có tệp nào. Bấm "Tải lên" để bắt đầu.</td></tr>
              )}
              {items.map((f: any) => {
                const isDeleted = !!f.deleted_at;
                const isSel = selected.has(f.id);
                return (
                  <tr key={f.id} className={["hover:bg-muted/40", isDeleted && "opacity-60", isSel && "bg-primary-soft/30"].filter(Boolean).join(" ")}>
                    <td className="px-3 py-3">
                      <button onClick={() => toggleOne(f.id)} className="text-muted-foreground hover:text-primary">
                        {isSel ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="font-medium text-foreground truncate max-w-[320px]" title={f.name}>{f.name}</div>
                      </div>
                      {f.mime && <div className="text-[11px] text-muted-foreground mt-0.5 ml-6">{f.mime}</div>}
                    </td>
                    <td className="px-3 py-3 text-[12.5px]">
                      {f.related_type === "lead" && f.related_id ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11.5px] font-medium bg-indigo-50 text-indigo-700 max-w-[180px]">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{leadMap.get(f.related_id) ?? "Khách hàng"}</span>
                        </span>
                      ) : <span className="text-muted-foreground text-[12px]">—</span>}
                    </td>
                    <td className="px-3 py-3 text-[12.5px] text-muted-foreground">{f.folder ?? "—"}</td>
                    <td className="px-3 py-3">
                      {f.tag ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11.5px] font-medium bg-primary-soft text-primary">
                          {f.tag}
                        </span>
                      ) : <span className="text-muted-foreground text-[12px]">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-[12.5px] text-muted-foreground">{humanSize(Number(f.size ?? 0))}</td>
                    <td className="px-3 py-3 text-right text-[12px] text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!isDeleted && (
                          <button
                            onClick={() => doDownload(f.id)}
                            title="Tải xuống"
                            className="p-1.5 rounded-md hover:bg-primary-soft text-muted-foreground hover:text-primary"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        {isDeleted ? (
                          <>
                            <button
                              onClick={() => restoreM.mutate(f.id)}
                              title="Khôi phục"
                              className="p-1.5 rounded-md hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { if (confirm("Xoá vĩnh viễn tệp này?")) hardDelM.mutate(f.id); }}
                              title="Xoá vĩnh viễn"
                              className="p-1.5 rounded-md hover:bg-rose-50 text-muted-foreground hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => softDelM.mutate(f.id)}
                            title="Chuyển vào thùng rác"
                            className="p-1.5 rounded-md hover:bg-rose-50 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {uploadOpen && (
        <UploadDialog
          folderList={folderList}
          leads={leads}
          defaultLeadId={leadId !== "all" && leadId !== "none" ? leadId : ""}
          onClose={() => setUploadOpen(false)}
          onUpload={async (file, meta) => {
            await doUpload(file, meta);
            invalidate();
          }}
        />
      )}
      {manageOpen && (
        <ManageDialog
          folders={folderList.map((f) => ({ name: f, count: folders[f] ?? 0 }))}
          tags={tagList.map((t) => ({ name: t, count: tagsCounts[t] ?? 0 }))}
          onClose={() => setManageOpen(false)}
          onRenameFolder={async (from, to) => { await renameFolderFn({ data: { tenantId, from, to } }); invalidate(); }}
          onDeleteFolder={async (name, moveTo) => { await deleteFolderFn({ data: { tenantId, folder: name, moveTo: moveTo || null } }); invalidate(); }}
          onRenameTag={async (from, to) => { await renameTagFn({ data: { tenantId, from, to } }); invalidate(); }}
          onDeleteTag={async (name) => { await deleteTagFn({ data: { tenantId, tag: name } }); invalidate(); }}
        />
      )}
      {!user && null}
    </div>
  );
}

function TagPill({
  label, count, active, onClick,
}: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[12px] font-medium border transition",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted",
      ].join(" ")}
    >
      <Tag className="h-3 w-3" />
      {label}
      {typeof count === "number" && <span className="text-[10.5px] opacity-75">· {count}</span>}
    </button>
  );
}

function BulkToolbar({
  count, folders, tags, busy, onClear, onApplyFolder, onApplyTag, onSoftDelete,
}: {
  count: number;
  folders: string[];
  tags: string[];
  busy: boolean;
  onClear: () => void;
  onApplyFolder: (f: string) => void;
  onApplyTag: (t: string) => void;
  onSoftDelete: () => void;
}) {
  const [f, setF] = useState("");
  const [t, setT] = useState("");
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft/50 px-3 py-2">
      <div className="text-[12.5px] font-semibold text-primary">Đã chọn {count} tệp</div>
      <div className="mx-2 h-4 w-px bg-border" />
      <FolderInput className="h-3.5 w-3.5 text-muted-foreground" />
      <select value={f} onChange={(e) => setF(e.target.value)} className="h-7 px-2 rounded-md border border-border bg-card text-[12px]">
        <option value="">— Chọn thư mục —</option>
        <option value="__none__">(Bỏ thư mục)</option>
        {folders.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <button
        disabled={busy || !f}
        onClick={() => onApplyFolder(f === "__none__" ? "" : f)}
        className="h-7 px-2.5 rounded-md bg-card border border-border text-[12px] font-medium hover:bg-muted disabled:opacity-50"
      >Áp dụng</button>
      <div className="mx-1 h-4 w-px bg-border" />
      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
      <input
        value={t}
        onChange={(e) => setT(e.target.value)}
        placeholder="Nhãn"
        list="bulk-tag-list"
        className="h-7 px-2 rounded-md border border-border bg-card text-[12px] w-32"
      />
      <datalist id="bulk-tag-list">
        {tags.map((x) => <option key={x} value={x} />)}
      </datalist>
      <button
        disabled={busy}
        onClick={() => onApplyTag(t.trim())}
        className="h-7 px-2.5 rounded-md bg-card border border-border text-[12px] font-medium hover:bg-muted disabled:opacity-50"
      >Áp nhãn</button>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={onSoftDelete} className="h-7 px-2.5 rounded-md text-[12px] font-medium text-red-600 hover:bg-red-50 inline-flex items-center gap-1">
          <Trash2 className="h-3.5 w-3.5" /> Xoá
        </button>
        <button onClick={onClear} className="h-7 px-2 rounded-md text-[12px] text-muted-foreground hover:bg-muted">Bỏ chọn</button>
      </div>
    </div>
  );
}

function ManageDialog({
  folders, tags, onClose, onRenameFolder, onDeleteFolder, onRenameTag, onDeleteTag,
}: {
  folders: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
  onClose: () => void;
  onRenameFolder: (from: string, to: string) => Promise<void>;
  onDeleteFolder: (name: string, moveTo: string) => Promise<void>;
  onRenameTag: (from: string, to: string) => Promise<void>;
  onDeleteTag: (name: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"folder" | "tag">("folder");
  const [busy, setBusy] = useState(false);

  const runRenameFolder = async (from: string) => {
    const to = prompt(`Đổi tên thư mục "${from}" thành:`, from);
    if (!to || to === from) return;
    setBusy(true);
    try { await onRenameFolder(from, to); toast.success("Đã đổi tên"); }
    catch (e: any) { toast.error(e?.message || "Lỗi"); }
    finally { setBusy(false); }
  };
  const runDeleteFolder = async (name: string) => {
    const moveTo = prompt(`Xoá thư mục "${name}". Chuyển các tệp trong đó sang thư mục nào? (bỏ trống = không thuộc thư mục)`, "");
    if (moveTo === null) return;
    setBusy(true);
    try { await onDeleteFolder(name, moveTo); toast.success("Đã xoá thư mục"); }
    catch (e: any) { toast.error(e?.message || "Lỗi"); }
    finally { setBusy(false); }
  };
  const runRenameTag = async (from: string) => {
    const to = prompt(`Đổi tên nhãn "${from}" thành:`, from);
    if (!to || to === from) return;
    setBusy(true);
    try { await onRenameTag(from, to); toast.success("Đã đổi tên"); }
    catch (e: any) { toast.error(e?.message || "Lỗi"); }
    finally { setBusy(false); }
  };
  const runDeleteTag = async (name: string) => {
    if (!confirm(`Gỡ nhãn "${name}" khỏi tất cả tệp?`)) return;
    setBusy(true);
    try { await onDeleteTag(name); toast.success("Đã gỡ nhãn"); }
    catch (e: any) { toast.error(e?.message || "Lỗi"); }
    finally { setBusy(false); }
  };

  const rows = tab === "folder" ? folders : tags;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="text-[15px] font-semibold">Quản lý thư mục & nhãn</div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 pt-4 flex items-center gap-1 border-b border-border">
          {(["folder", "tag"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={[
                "h-8 px-3 rounded-t-md text-[12.5px] font-medium border-b-2 -mb-px",
                tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {k === "folder" ? "Thư mục" : "Nhãn"}
            </button>
          ))}
        </div>
        <div className="p-5 max-h-[420px] overflow-auto">
          {rows.length === 0 ? (
            <div className="text-center text-[12.5px] text-muted-foreground py-10">Chưa có {tab === "folder" ? "thư mục" : "nhãn"} nào.</div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {rows.map((r) => (
                <li key={r.name} className="flex items-center justify-between px-3 py-2 bg-card">
                  <div className="flex items-center gap-2">
                    {tab === "folder" ? <Folder className="h-4 w-4 text-muted-foreground" /> : <Tag className="h-4 w-4 text-muted-foreground" />}
                    <div className="text-[13px] font-medium">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">· {r.count} tệp</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={busy}
                      onClick={() => tab === "folder" ? runRenameFolder(r.name) : runRenameTag(r.name)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary disabled:opacity-50"
                      title="Đổi tên"
                    ><Pencil className="h-3.5 w-3.5" /></button>
                    <button
                      disabled={busy}
                      onClick={() => tab === "folder" ? runDeleteFolder(r.name) : runDeleteTag(r.name)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-50"
                      title="Xoá"
                    ><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted">Đóng</button>
        </div>
      </div>
    </div>
  );
}

function FolderChip({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl border p-3 text-left transition",
        active ? "border-primary bg-primary-soft" : "border-border bg-card hover:bg-muted",
      ].join(" ")}
    >
      <Folder className={["h-5 w-5 mb-2", active ? "text-primary" : "text-muted-foreground"].join(" ")} />
      <div className="text-[12.5px] font-semibold truncate">{label}</div>
      <div className="text-[11px] text-muted-foreground">{count} tệp</div>
    </button>
  );
}

function UploadDialog({
  folderList, leads, defaultLeadId, onClose, onUpload,
}: {
  folderList: string[];
  leads: Array<{ id: string; full_name: string | null; phone: string | null }>;
  defaultLeadId: string;
  onClose: () => void;
  onUpload: (file: File, meta: { folder: string; tag: string; leadId: string }) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [folder, setFolder] = useState<string>(folderList[0] ?? "");
  const [tag, setTag] = useState("");
  const [leadId, setLeadId] = useState<string>(defaultLeadId);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Vui lòng chọn tệp"); return; }
    setBusy(true);
    try {
      await onUpload(file, { folder, tag: tag.trim(), leadId });
      toast.success("Tải lên thành công");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Tải lên thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="text-[15px] font-semibold">Tải tệp lên</div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f);
            }}
            className="rounded-xl border-2 border-dashed border-border p-6 text-center cursor-pointer hover:bg-muted/40"
          >
            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            {file ? (
              <>
                <div className="text-[13px] font-semibold text-foreground">{file.name}</div>
                <div className="text-[11.5px] text-muted-foreground mt-1">{humanSize(file.size)}</div>
              </>
            ) : (
              <>
                <div className="text-[13px] font-medium">Kéo & thả hoặc bấm để chọn tệp</div>
                <div className="text-[11.5px] text-muted-foreground mt-1">Tối đa {humanSize(MAX_SIZE)}</div>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <div className="text-[11.5px] font-semibold text-muted-foreground mb-1">Khách hàng liên quan (tuỳ chọn)</div>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-card text-[13px]"
            >
              <option value="">— Không gắn khách hàng —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {(l.full_name || "Khách hàng")}{l.phone ? ` · ${l.phone}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-[11.5px] font-semibold text-muted-foreground mb-1">Thư mục</div>
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-card text-[13px]"
              >
                <option value="">— Không có —</option>
                {folderList.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className="block">
              <div className="text-[11.5px] font-semibold text-muted-foreground mb-1">Nhãn (tuỳ chọn)</div>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="ví dụ: Q2, VIP..."
                className="w-full h-9 px-3 rounded-lg border border-border bg-card text-[13px]"
              />
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted">Huỷ</button>
          <button
            type="submit"
            disabled={busy || !file}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Đang tải lên..." : "Tải lên"}
          </button>
        </div>
      </form>
    </div>
  );
}
