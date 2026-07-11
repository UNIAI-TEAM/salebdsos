import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Upload, Download, Trash2, RotateCcw, Search, Folder, FileText, RefreshCw, X, Tag, User,
  Pencil, Settings2, FolderInput, CheckSquare, Square, History, Clock,
} from "lucide-react";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listFiles, createFileRecord, softDeleteFile, restoreFile, hardDeleteFile,
  getFileSignedUrl, listFileFacets, bulkUpdateFiles, renameFolder, deleteFolder,
  renameTag, deleteTag, listFileAudit,
  bulkSoftDeleteFiles, bulkRestoreFiles, bulkHardDeleteFiles, logBulkDownload,
} from "@/lib/file.functions";
import { listLeads } from "@/lib/lead.functions";
import { toast } from "sonner";
import { getZipPhase as _getZipPhase, csvEscape as _csvEscape, validateAuditCsv, type ZipPhase as _ZipPhase } from "@/lib/audit-csv";

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

function makeBatchId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

function FilesPage() {
  const { currentTenant, user } = useAuth();
  const tenantId = currentTenant?.id ?? "";
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string>("all");
  const [tagF, setTagF] = useState<string>("all");
  const [leadId, setLeadId] = useState<string>("all");
  const [scope, setScope] = useState<"active" | "trash">("active");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState<null | { fileId?: string; title: string }>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  type DlProgress = {
    total: number;
    done: number;
    failed: number;
    phase: "fetching" | "zipping" | "done" | "error" | "canceled";
    currentName?: string;
    bytes: number;
    message?: string;
  };
  const [dl, setDl] = useState<DlProgress | null>(null);
  const dlCancelRef = useRef(false);


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
  const bulkSoftDelFn = useServerFn(bulkSoftDeleteFiles);
  const bulkRestoreFn = useServerFn(bulkRestoreFiles);
  const bulkHardDelFn = useServerFn(bulkHardDeleteFiles);
  const logBulkDlFn = useServerFn(logBulkDownload);

  // Shared ZIP download runner — used by bulk toolbar and "Thử lại" from audit log.
  async function runZipDownload(ids: string[], reuseBatchId?: string) {
    if (!ids || ids.length === 0) return;
    if (ids.length === 1) {
      try {
        const r = await signed({ data: { id: ids[0] } });
        const a = document.createElement("a");
        a.href = r.url; a.download = r.name; a.rel = "noopener";
        document.body.appendChild(a); a.click(); a.remove();
        toast.success(`Đã tải ${r.name}`);
      } catch (e: any) {
        toast.error(e?.message || "Lỗi tải tệp");
      }
      return;
    }
    const batchId = reuseBatchId || makeBatchId();
    dlCancelRef.current = false;
    setDl({ total: ids.length, done: 0, failed: 0, phase: "fetching", bytes: 0 });
    logBulkDlFn({ data: { tenantId, ids, phase: "zipping", batchId } }).catch(() => {});
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const used = new Map<string, number>();
      let ok = 0;
      let failed = 0;
      let bytes = 0;
      for (let i = 0; i < ids.length; i++) {
        if (dlCancelRef.current) break;
        const id = ids[i];
        let currentName = `file-${id}`;
        try {
          const r = await signed({ data: { id } });
          currentName = r.name || currentName;
          setDl((s) => s && { ...s, currentName });
          const resp = await fetch(r.url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          let name = r.name || `file-${id}`;
          if (used.has(name)) {
            const n = (used.get(name) || 1) + 1;
            used.set(name, n);
            const dot = name.lastIndexOf(".");
            name = dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
          } else {
            used.set(name, 1);
          }
          zip.file(name, blob);
          ok++;
          bytes += blob.size;
        } catch {
          failed++;
        }
        setDl((s) => s && { ...s, done: ok, failed, bytes, currentName });
      }
      if (dlCancelRef.current) {
        setDl((s) => s && { ...s, phase: "canceled", message: "Đã huỷ" });
        toast.info(`Đã huỷ tải xuống (${ok}/${ids.length})`);
        logBulkDlFn({ data: { tenantId, ids, ok, failed, bytes, canceled: true, phase: "canceled", batchId } }).catch(() => {});
        setTimeout(() => setDl(null), 3000);
        return;
      }
      if (ok === 0) {
        setDl((s) => s && { ...s, phase: "error", message: "Không tải được tệp nào" });
        toast.error("Không tải được tệp nào");
        logBulkDlFn({ data: { tenantId, ids, ok, failed, bytes, phase: "error", batchId } }).catch(() => {});
        setTimeout(() => setDl(null), 4000);
        return;
      }
      setDl((s) => s && { ...s, phase: "zipping", currentName: undefined });
      const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(content);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const a = document.createElement("a");
      a.href = url; a.download = `files-${stamp}.zip`; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setDl((s) => s && { ...s, phase: "done", bytes: content.size, message: `Đã tải ZIP (${ok}/${ids.length})` });
      toast.success(`Đã tải ZIP (${ok}/${ids.length} tệp)`);
      logBulkDlFn({ data: { tenantId, ids, ok, failed, bytes: content.size, phase: "done", batchId } }).catch(() => {});
      setTimeout(() => setDl(null), 4000);
    } catch (e: any) {
      setDl((s) => s && { ...s, phase: "error", message: e?.message || "Lỗi đóng gói ZIP" });
      toast.error(e?.message || "Lỗi đóng gói ZIP");
      logBulkDlFn({ data: { tenantId, ids, phase: "error", batchId } }).catch(() => {});
      setTimeout(() => setDl(null), 5000);
    }
  }

  const listQ = useQuery({
    queryKey: ["files", tenantId, q, folder, tagF, leadId, scope],
    queryFn: () =>
      list({ data: { tenantId, q: q || undefined, folder, tag: tagF, leadId, scope, page: 1, pageSize: 200 } }),
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
              onClick={() => setAuditOpen({ title: "Nhật ký hoạt động tài liệu" })}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted"
            >
              <History className="h-4 w-4" /> Nhật ký
            </button>
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
          activeCount={selectedActiveIds.length}
          deletedCount={selectedDeletedIds.length}
          folders={folderList}
          tags={tagList}
          busy={bulkM.isPending}
          onClear={() => setSelected(new Set())}
          onApplyFolder={(f: string) => bulkM.mutate({ ids: selectedActiveIds, folder: f || null })}
          onApplyTag={(t: string) => bulkM.mutate({ ids: selectedActiveIds, tag: t || null })}
          onDownload={() => runZipDownload(selectedActiveIds)}


          onSoftDelete={() => {
            const ids = selectedActiveIds;
            if (ids.length === 0) return;
            if (!confirm(`Chuyển ${ids.length} tệp vào thùng rác?`)) return;
            bulkSoftDelFn({ data: { tenantId, ids } })
              .then((r) => { toast.success(`Đã chuyển ${r.affected} tệp vào thùng rác`); setSelected(new Set()); invalidate(); })
              .catch((e: any) => toast.error(e?.message || "Lỗi"));
          }}
          onRestore={() => {
            const ids = selectedDeletedIds;
            if (ids.length === 0) return;
            bulkRestoreFn({ data: { tenantId, ids } })
              .then((r) => { toast.success(`Đã khôi phục ${r.affected} tệp`); setSelected(new Set()); invalidate(); })
              .catch((e: any) => toast.error(e?.message || "Lỗi"));
          }}
          onHardDelete={() => {
            const ids = selectedDeletedIds;
            if (ids.length === 0) return;
            if (!confirm(`Xoá VĨNH VIỄN ${ids.length} tệp? Hành động này KHÔNG THỂ khôi phục.`)) return;
            const toastId = toast.loading(`Đang xoá vĩnh viễn ${ids.length} tệp...`);
            bulkHardDelFn({ data: { tenantId, ids } })
              .then((r) => { toast.success(`Đã xoá vĩnh viễn ${r.affected} tệp`, { id: toastId }); setSelected(new Set()); invalidate(); })
              .catch((e: any) => toast.error(e?.message || "Lỗi xoá", { id: toastId }));
          }}
        />
      )}


      <SectionCard
        title={scope === "trash" ? "Thùng rác" : "Danh sách tệp"}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-[12px] font-semibold">
              {([
                { v: "active", l: "Đang hoạt động" },
                { v: "trash", l: "Thùng rác" },
              ] as const).map((t) => (
                <button
                  key={t.v}
                  onClick={() => { setScope(t.v); setSelected(new Set()); }}
                  className={[
                    "h-7 px-3 rounded",
                    scope === t.v ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {t.l}
                </button>
              ))}
            </div>
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
                        <button
                          onClick={() => setAuditOpen({ fileId: f.id, title: `Lịch sử: ${f.name}` })}
                          title="Xem lịch sử thao tác"
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <History className="h-4 w-4" />
                        </button>
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
      {auditOpen && (
        <AuditDrawer
          tenantId={tenantId}
          fileId={auditOpen.fileId}
          title={auditOpen.title}
          fileMap={new Map(items.map((f: any) => [f.id, f.name]))}
          onClose={() => setAuditOpen(null)}
          onRetryZip={(ids) => runZipDownload(ids)}
        />
      )}
      {dl && (
        <DownloadProgressCard
          state={dl}
          onCancel={() => { dlCancelRef.current = true; }}
          onClose={() => setDl(null)}
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
  count, activeCount, deletedCount, folders, tags, busy, onClear, onApplyFolder, onApplyTag, onDownload, onSoftDelete, onRestore, onHardDelete,
}: {
  count: number;
  activeCount: number;
  deletedCount: number;
  folders: string[];
  tags: string[];
  busy: boolean;
  onClear: () => void;
  onApplyFolder: (f: string) => void;
  onApplyTag: (t: string) => void;
  onDownload: () => void;
  onSoftDelete: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}) {

  const [f, setF] = useState("");
  const [t, setT] = useState("");
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft/50 px-3 py-2">
      <div className="text-[12.5px] font-semibold text-primary">
        Đã chọn {count} tệp
        {deletedCount > 0 && <span className="text-muted-foreground font-normal"> · {activeCount} thường / {deletedCount} thùng rác</span>}
      </div>
      <div className="mx-2 h-4 w-px bg-border" />
      <FolderInput className="h-3.5 w-3.5 text-muted-foreground" />
      <select value={f} onChange={(e) => setF(e.target.value)} className="h-7 px-2 rounded-md border border-border bg-card text-[12px]" disabled={activeCount === 0}>
        <option value="">— Chọn thư mục —</option>
        <option value="__none__">(Bỏ thư mục)</option>
        {folders.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <button
        disabled={busy || !f || activeCount === 0}
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
        disabled={activeCount === 0}
        className="h-7 px-2 rounded-md border border-border bg-card text-[12px] w-32 disabled:opacity-50"
      />
      <datalist id="bulk-tag-list">
        {tags.map((x) => <option key={x} value={x} />)}
      </datalist>
      <button
        disabled={busy || activeCount === 0}
        onClick={() => onApplyTag(t.trim())}
        className="h-7 px-2.5 rounded-md bg-card border border-border text-[12px] font-medium hover:bg-muted disabled:opacity-50"
      >Áp nhãn</button>
      <div className="ml-auto flex items-center gap-2">
        {activeCount > 0 && (
          <button onClick={onDownload} disabled={busy} className="h-7 px-2.5 rounded-md text-[12px] font-medium text-primary hover:bg-primary-soft inline-flex items-center gap-1 disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Tải xuống ({activeCount})
          </button>
        )}
        {deletedCount > 0 && (
          <button onClick={onRestore} disabled={busy} className="h-7 px-2.5 rounded-md text-[12px] font-medium text-emerald-600 hover:bg-emerald-50 inline-flex items-center gap-1 disabled:opacity-50">
            <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ({deletedCount})
          </button>
        )}
        {deletedCount > 0 && (
          <button onClick={onHardDelete} disabled={busy} className="h-7 px-2.5 rounded-md text-[12px] font-semibold text-white bg-red-600 hover:bg-red-700 inline-flex items-center gap-1 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" /> Xoá vĩnh viễn ({deletedCount})
          </button>
        )}

        {activeCount > 0 && (
          <button onClick={onSoftDelete} disabled={busy} className="h-7 px-2.5 rounded-md text-[12px] font-medium text-red-600 hover:bg-red-50 inline-flex items-center gap-1 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" /> Xoá ({activeCount})
          </button>
        )}
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

// ---------- Audit drawer ----------

const ACTION_LABELS: Record<string, { label: string; tone: string }> = {
  "file.upload": { label: "Tải lên", tone: "bg-emerald-50 text-emerald-700" },
  "file.download": { label: "Tải xuống", tone: "bg-blue-50 text-blue-700" },
  "file.update": { label: "Cập nhật", tone: "bg-amber-50 text-amber-700" },
  "file.soft_delete": { label: "Xoá (thùng rác)", tone: "bg-rose-50 text-rose-700" },
  "file.restore": { label: "Khôi phục", tone: "bg-emerald-50 text-emerald-700" },
  "file.hard_delete": { label: "Xoá vĩnh viễn", tone: "bg-rose-100 text-rose-800" },
  "file.bulk_update": { label: "Cập nhật hàng loạt", tone: "bg-indigo-50 text-indigo-700" },
  "file.bulk_soft_delete": { label: "Xoá hàng loạt (thùng rác)", tone: "bg-rose-50 text-rose-700" },
  "file.bulk_restore": { label: "Khôi phục hàng loạt", tone: "bg-emerald-50 text-emerald-700" },
  "file.bulk_hard_delete": { label: "Xoá vĩnh viễn hàng loạt", tone: "bg-rose-100 text-rose-800" },
  "file.bulk_download": { label: "Tải ZIP hàng loạt", tone: "bg-blue-50 text-blue-700" },
  "folder.rename": { label: "Đổi tên thư mục", tone: "bg-slate-100 text-slate-700" },
  "folder.delete": { label: "Xoá thư mục", tone: "bg-slate-100 text-slate-700" },
  "tag.rename": { label: "Đổi tên nhãn", tone: "bg-slate-100 text-slate-700" },
  "tag.delete": { label: "Xoá nhãn", tone: "bg-slate-100 text-slate-700" },
};

function summarizeDiff(action: string, diff: any): string {
  if (!diff) return "";
  try {
    if (action === "file.upload") return `${diff.name ?? ""}${diff.folder ? ` · ${diff.folder}` : ""}${diff.tag ? ` · #${diff.tag}` : ""}`;
    if (action === "file.download") return diff.name ?? "";
    if (action === "file.update") {
      const parts: string[] = [];
      const b = diff.before ?? {}; const a = diff.after ?? {};
      for (const k of Object.keys(a)) if (b[k] !== a[k]) parts.push(`${k}: ${b[k] ?? "∅"} → ${a[k] ?? "∅"}`);
      return parts.join(" · ");
    }
    if (action === "file.soft_delete" || action === "file.restore" || action === "file.hard_delete") return diff.name ?? "";
    if (action === "file.bulk_update") return `${diff.affected ?? 0} tệp · ${JSON.stringify(diff.patch ?? {})}`;
    if (action === "file.bulk_soft_delete" || action === "file.bulk_restore" || action === "file.bulk_hard_delete") {
      const names: string[] = Array.isArray(diff.names) ? diff.names : [];
      const preview = names.slice(0, 3).join(", ");
      const more = names.length > 3 ? ` +${names.length - 3}` : "";
      return `${diff.affected ?? names.length} tệp${preview ? ` · ${preview}${more}` : ""}`;
    }
    if (action === "file.bulk_download") {
      const p = getZipPhase(diff);
      const meta = ZIP_PHASE_META[p];
      const mb = diff.bytes ? ` · ${(Number(diff.bytes) / 1024 / 1024).toFixed(1)} MB` : "";
      const okTxt = (diff.ok ?? 0) || (diff.requested ?? 0)
        ? `${diff.ok ?? 0}/${diff.requested ?? 0} tệp` : `${diff.requested ?? 0} tệp`;
      return `${meta.label} · ${okTxt}${mb}${diff.failed ? ` · ${diff.failed} lỗi` : ""}`;
    }
    if (action === "folder.rename" || action === "tag.rename") return `${diff.from} → ${diff.to} (${diff.affected ?? 0})`;
    if (action === "folder.delete") return `${diff.folder}${diff.moveTo ? ` → ${diff.moveTo}` : ""} (${diff.affected ?? 0})`;
    if (action === "tag.delete") return `${diff.tag} (${diff.affected ?? 0})`;
    return JSON.stringify(diff);
  } catch { return ""; }
}

type ZipPhase = _ZipPhase;
const ZIP_PHASE_META: Record<ZipPhase, { label: string; tone: string; status: string; itemTone: string }> = {
  zipping: { label: "Đang đóng gói", tone: "bg-amber-50 text-amber-700 border-amber-200", status: "Đóng gói", itemTone: "bg-amber-50 text-amber-700" },
  done:    { label: "Hoàn tất",     tone: "bg-emerald-50 text-emerald-700 border-emerald-200", status: "Hoàn tất", itemTone: "bg-emerald-50 text-emerald-700" },
  canceled:{ label: "Đã huỷ",       tone: "bg-slate-100 text-slate-700 border-slate-200", status: "Đã huỷ", itemTone: "bg-slate-100 text-slate-700" },
  error:   { label: "Lỗi",          tone: "bg-rose-50 text-rose-700 border-rose-200", status: "Lỗi", itemTone: "bg-rose-50 text-rose-700" },
};

type ZipMeta = {
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  running: boolean;
  percent: number;
  ok: number;
  failed: number;
  requested: number;
  batchId: string;      // short display id for the batch
  skipRow?: boolean;    // true = paired start row, hide in favor of terminal
};

const getZipPhase = _getZipPhase;

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 2 : 1)} s`;
  const m = Math.floor(s / 60);
  const rs = Math.floor(s % 60);
  return `${m}m ${rs.toString().padStart(2, "0")}s`;
}



function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportAuditRowsToCsv(
  rows: any[],
  fileMap: Map<string, string>,
  title: string,
) {
  if (!rows.length) return;
  const header = [
    "occurred_at", "action", "action_label", "actor_name", "actor_email",
    "actor_user_id", "entity", "entity_id", "entity_name", "summary", "phase", "batch_id", "diff_json",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const meta = ACTION_LABELS[r.action];
    const entityName = r.entity === "file" && r.entity_id ? fileMap.get(r.entity_id) ?? "" : "";
    const phase = r.action === "file.bulk_download" ? getZipPhase(r.diff) : "";
    const batchId = r.action === "file.bulk_download" ? (r.batch_id ?? "") : "";
    lines.push([
      new Date(r.occurred_at).toISOString(),
      r.action,
      meta?.label ?? r.action,
      r.actor?.name ?? "",
      r.actor?.email ?? "",
      r.actor_user_id ?? "",
      r.entity ?? "",
      r.entity_id ?? "",
      entityName,
      summarizeDiff(r.action, r.diff),
      phase,
      batchId,
      r.diff ? JSON.stringify(r.diff) : "",
    ].map(csvEscape).join(","));
  }
  // BOM for Excel UTF-8.
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safeTitle = title.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40) || "audit";
  a.href = url;
  a.download = `${safeTitle}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type AuditDetailItem = { id?: string; name: string; status: string; tone: string };
type AuditDetails = { info?: string; items: AuditDetailItem[] };

function buildAuditDetails(r: any, fileMap: Map<string, string>): AuditDetails {
  const diff = r?.diff ?? {};
  const ids: string[] = Array.isArray(diff.ids) ? diff.ids : [];
  const names: string[] = Array.isArray(diff.names) ? diff.names : [];
  const nameFor = (id: string, i: number) =>
    names[i] || fileMap.get(id) || "(tệp không còn tồn tại)";

  const OK = { status: "OK", tone: "bg-emerald-50 text-emerald-700" };
  const DELETED = { status: "Đã xoá", tone: "bg-rose-50 text-rose-700" };
  const RESTORED = { status: "Khôi phục", tone: "bg-emerald-50 text-emerald-700" };
  const HARD = { status: "Xoá vĩnh viễn", tone: "bg-rose-100 text-rose-800" };
  
  const UNK = { status: "—", tone: "bg-muted text-foreground" };

  const map = (badge: { status: string; tone: string }) =>
    ids.map((id, i) => ({ id, name: nameFor(id, i), status: badge.status, tone: badge.tone }));

  switch (r?.action) {
    case "file.bulk_soft_delete":
      return { items: map(DELETED) };
    case "file.bulk_restore":
      return { items: map(RESTORED) };
    case "file.bulk_hard_delete":
      return { items: map(HARD) };
    case "file.bulk_update":
      return {
        info: `Áp dụng: ${JSON.stringify(diff.patch ?? {})}`,
        items: map(OK),
      };
    case "file.bulk_download": {
      const p = getZipPhase(diff);
      const meta = ZIP_PHASE_META[p];
      const info = [
        `Trạng thái: ${meta.label}`,
        `${diff.ok ?? 0}/${diff.requested ?? ids.length} thành công`,
        diff.failed ? `${diff.failed} lỗi` : null,
        diff.bytes ? `${(Number(diff.bytes) / 1024 / 1024).toFixed(1)} MB` : null,
      ].filter(Boolean).join(" · ");
      const badge = { status: meta.status, tone: meta.itemTone };
      return { info, items: ids.map((id, i) => ({ id, name: nameFor(id, i), status: badge.status, tone: badge.tone })) };
    }
    case "folder.rename":
    case "tag.rename":
      return {
        info: `${diff.from ?? "?"} → ${diff.to ?? "?"} · ${diff.affected ?? 0} tệp bị ảnh hưởng`,
        items: [],
      };
    case "folder.delete":
      return {
        info: `Xoá thư mục ${diff.folder ?? ""}${diff.moveTo ? ` → ${diff.moveTo}` : ""} · ${diff.affected ?? 0} tệp`,
        items: [],
      };
    case "tag.delete":
      return { info: `Xoá nhãn ${diff.tag ?? ""} · ${diff.affected ?? 0} tệp`, items: [] };
    case "file.upload":
    case "file.download":
    case "file.soft_delete":
    case "file.restore":
    case "file.hard_delete": {
      const id = r?.entity_id;
      const name = diff.name || (id ? fileMap.get(id) : null) || "(tệp)";
      const badge =
        r.action === "file.soft_delete" ? DELETED :
        r.action === "file.hard_delete" ? HARD :
        r.action === "file.restore" ? RESTORED : OK;
      return { items: id ? [{ id, name, status: badge.status, tone: badge.tone }] : [] };
    }
    case "file.update": {
      const id = r?.entity_id;
      const before = diff.before ?? {}; const after = diff.after ?? {};
      const changed = Object.keys(after).filter((k) => before[k] !== after[k]);
      return {
        info: changed.length ? `Thay đổi: ${changed.join(", ")}` : undefined,
        items: id ? [{ id, name: fileMap.get(id) ?? "(tệp)", status: OK.status, tone: OK.tone }] : [],
      };
    }
    default:
      return { items: [] };
  }
}





function AuditDrawer({
  tenantId, fileId, title, fileMap, onClose, onRetryZip,
}: {
  tenantId: string;
  fileId?: string;
  title: string;
  fileMap: Map<string, string>;
  onClose: () => void;
  onRetryZip?: (ids: string[]) => void;
}) {
  const auditFn = useServerFn(listFileAudit);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [actorQuery, setActorQuery] = useState<string>("");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [batchFilter, setBatchFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [zipPhaseFilter, setZipPhaseFilter] = useState<"all" | ZipPhase>("all");
  const [pageSize, setPageSize] = useState<number>(100);
  const PAGE_STEP = 100;
  const SERVER_CAP = 2000;

  const fromIso = fromDate ? new Date(fromDate + "T00:00:00").toISOString() : undefined;
  const toIso = toDate ? new Date(toDate + "T23:59:59.999").toISOString() : undefined;
  const batchIdQuery = batchFilter.trim().replace(/^#/, "").toUpperCase();

  // Reset paging when filters change.
  useEffect(() => {
    setPageSize(100);
  }, [actionFilter, actorFilter, batchIdQuery, fromIso, toIso, fileId]);

  const q = useQuery({
    queryKey: ["file-audit", tenantId, fileId ?? "all", actionFilter, actorFilter, batchIdQuery, fromIso ?? "", toIso ?? "", pageSize],
    queryFn: () => auditFn({
      data: {
        tenantId, fileId,
        action: actionFilter === "all" ? undefined : actionFilter,
        actorUserId: actorFilter === "all" ? undefined : actorFilter,
        batchId: batchIdQuery || undefined,
        fromDate: fromIso,
        toDate: toIso,
        limit: pageSize,
      },
    }),
    enabled: !!tenantId,
    placeholderData: (prev) => prev,
  });
  const allRows = (q.data?.rows ?? []) as any[];
  const reachedCap = allRows.length < pageSize || pageSize >= SERVER_CAP;

  // Pair ZIP start (phase=zipping) with its terminal entry (done/canceled/error)
  // by batch_id. One "batch" = one paired start+terminal (or an unfinished
  // start). Rows sharing the same batch collapse into a single entry so users
  // can expand once to see all affected files.
  const zipMeta = useMemo(() => {
    const m = new Map<string, ZipMeta>();
    const bulk = allRows
      .filter((r) => r.action === "file.bulk_download")
      .slice()
      .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
    const openStarts = new Map<string, any>();
    for (const r of bulk) {
      const phase = getZipPhase(r.diff);
      const requested = Number(r.diff?.requested ?? (Array.isArray(r.diff?.ids) ? r.diff.ids.length : 0));
      const ok = Number(r.diff?.ok ?? 0);
      const failed = Number(r.diff?.failed ?? 0);
      const batchId = r.batch_id || r.id;
      if (phase === "zipping") {
        openStarts.set(batchId, r);
        m.set(r.id, {
          startedAt: r.occurred_at, running: true, percent: 0,
          ok: 0, failed: 0, requested, batchId,
        });
      } else {
        const start = openStarts.get(batchId);
        const percent = phase === "done" ? 100 : requested > 0 ? Math.round((ok / requested) * 100) : 0;
        if (start) {
          const durationMs = new Date(r.occurred_at).getTime() - new Date(start.occurred_at).getTime();
          const shared: ZipMeta = {
            startedAt: start.occurred_at, endedAt: r.occurred_at, durationMs,
            running: false, percent, ok, failed, requested, batchId,
          };
          m.set(r.id, shared);
          m.set(start.id, { ...shared, skipRow: true });
          openStarts.delete(batchId);
        } else {
          m.set(r.id, {
            endedAt: r.occurred_at, running: false, percent,
            ok, failed, requested, batchId,
          });
        }
      }
    }
    return m;
  }, [allRows]);

  // Derive actor options from returned rows (deduped).
  const actorOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const r of allRows) {
      if (!r.actor_user_id) continue;
      const label = r.actor?.name || r.actor?.email || "Người dùng";
      if (!map.has(r.actor_user_id)) map.set(r.actor_user_id, { id: r.actor_user_id, label });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allRows]);

  // Client-side text search across actor, action label, target file name, and summary.
  const rows = useMemo(() => {
    const actorS = actorQuery.trim().toLowerCase();
    const s = searchText.trim().toLowerCase();
    return allRows.filter((r) => {
      // Collapse paired ZIP start rows — the terminal row shows the full batch.
      if (r.action === "file.bulk_download" && zipMeta.get(r.id)?.skipRow) return false;
      if (zipPhaseFilter !== "all") {
        if (r.action !== "file.bulk_download") return false;
        if (getZipPhase(r.diff) !== zipPhaseFilter) return false;
      }
      const actorLabel = (r.actor?.name || r.actor?.email || "").toLowerCase();
      if (actorS && !actorLabel.includes(actorS)) return false;
      if (!s) return true;
      const meta = ACTION_LABELS[r.action];
      const actionLabel = (meta?.label ?? r.action ?? "").toLowerCase();
      const targetName = (r.entity === "file" && r.entity_id ? fileMap.get(r.entity_id) : "") || "";
      const summary = summarizeDiff(r.action, r.diff) || "";
      const diffStr = r.diff ? JSON.stringify(r.diff).toLowerCase() : "";
      return (
        actorLabel.includes(s) ||
        actionLabel.includes(s) ||
        targetName.toLowerCase().includes(s) ||
        summary.toLowerCase().includes(s) ||
        (r.entity_id ?? "").toLowerCase().includes(s) ||
        diffStr.includes(s)
      );
    });
  }, [allRows, actorQuery, searchText, fileMap, zipPhaseFilter, zipMeta]);

  // Infinite scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first?.isIntersecting && !q.isFetching && !reachedCap) {
        setPageSize((n) => Math.min(SERVER_CAP, n + PAGE_STEP));
      }
    }, { root: null, rootMargin: "200px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [q.isFetching, reachedCap]);

  const actionGroups: Array<{ label: string; keys: string[] }> = [
    { label: "Tệp", keys: ["file.upload", "file.download", "file.update", "file.soft_delete", "file.restore", "file.hard_delete"] },
    { label: "Hàng loạt", keys: ["file.bulk_update", "file.bulk_soft_delete", "file.bulk_restore", "file.bulk_hard_delete", "file.bulk_download"] },
    { label: "Thư mục & nhãn", keys: ["folder.rename", "folder.delete", "tag.rename", "tag.delete"] },
  ];

  const hasFilters =
    actionFilter !== "all" || actorFilter !== "all" || actorQuery || batchFilter || fromDate || toDate || searchText || zipPhaseFilter !== "all";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl h-full bg-background border-l border-border shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-2">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Audit trail</div>
            <div className="text-[15px] font-semibold text-foreground truncate max-w-[360px]">{title}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => exportAuditRowsToCsv(rows, fileMap, title)}
              disabled={rows.length === 0}
              className="h-8 px-2.5 rounded-md border border-border bg-card text-[12.5px] hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              title="Xuất CSV bản ghi đang hiển thị"
            >
              <Download className="h-3.5 w-3.5" /> Xuất CSV
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </div>


        <div className="px-5 py-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-border bg-card text-[12.5px]"
              title="Loại hành động"
            >
              <option value="all">Tất cả hành động</option>
              {actionGroups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.keys.map((k) => (
                    <option key={k} value={k}>{ACTION_LABELS[k]?.label ?? k}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-border bg-card text-[12.5px] max-w-[180px]"
              title="Người thực hiện"
            >
              <option value="all">Tất cả người dùng</option>
              {actorOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={actorQuery}
              onChange={(e) => setActorQuery(e.target.value)}
              placeholder="Tìm tên/email…"
              className="h-8 px-2.5 rounded-md border border-border bg-card text-[12.5px] w-[160px]"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[11.5px] text-muted-foreground">Từ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 px-2 rounded-md border border-border bg-card text-[12.5px]"
            />
            <label className="text-[11.5px] text-muted-foreground">Đến</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 px-2 rounded-md border border-border bg-card text-[12.5px]"
            />
            <select
              value={zipPhaseFilter}
              onChange={(e) => setZipPhaseFilter(e.target.value as "all" | ZipPhase)}
              className="h-8 px-2.5 rounded-md border border-border bg-card text-[12.5px]"
              title="Trạng thái ZIP"
            >
              <option value="all">Tất cả trạng thái ZIP</option>
              <option value="zipping">ZIP: Đang đóng gói</option>
              <option value="done">ZIP: Hoàn tất</option>
              <option value="canceled">ZIP: Đã huỷ</option>
              <option value="error">ZIP: Lỗi</option>
            </select>
            <input
              type="text"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, ""))}
              placeholder="Mã lô #A1B2C3"
              className="h-8 px-2.5 rounded-md border border-border bg-card text-[12.5px] w-[130px] font-mono"
              title="Lọc theo mã lô ZIP"
            />
            {hasFilters && (
              <button
                onClick={() => {
                  setActionFilter("all"); setActorFilter("all"); setActorQuery(""); setBatchFilter("");
                  setFromDate(""); setToDate(""); setSearchText(""); setZipPhaseFilter("all");
                }}
                className="h-8 px-2.5 rounded-md border border-border bg-card text-[12px] hover:bg-muted"
              >
                Xoá bộ lọc
              </button>
            )}
            <span className="ml-auto text-[12px] text-muted-foreground">
              {rows.length}{rows.length !== allRows.length ? `/${allRows.length}` : ""} bản ghi
              {!reachedCap && " • cuộn để tải thêm"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Tìm trong nhật ký (hành động, tên tệp, tóm tắt, id, diff)…"
                className="h-8 pl-8 pr-2.5 rounded-md border border-border bg-card text-[12.5px] w-full"
              />
            </div>
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="h-8 px-2.5 rounded-md border border-border bg-card text-[12px] hover:bg-muted"
              >
                Xoá
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {q.isLoading && <div className="p-8 text-center text-muted-foreground text-[13px]">Đang tải...</div>}
          {!q.isLoading && rows.length === 0 && (
            <div className="p-10 text-center text-muted-foreground text-[13px]">
              {hasFilters ? "Không có bản ghi khớp bộ lọc." : "Chưa có hoạt động nào."}
            </div>
          )}
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const meta = ACTION_LABELS[r.action] ?? { label: r.action, tone: "bg-muted text-foreground" };
              const summary = summarizeDiff(r.action, r.diff);
              const actor = r.actor?.name || r.actor?.email || (r.actor_user_id ? "Người dùng" : "Hệ thống");
              const targetName = r.entity === "file" && r.entity_id ? fileMap.get(r.entity_id) : null;
              const isOpen = expandedId === r.id;
              const details = buildAuditDetails(r, fileMap);
              const canExpand = details.items.length > 0 || !!details.info;
              return (
                <li key={r.id} className="hover:bg-muted/40">
                  <button
                    type="button"
                    onClick={() => canExpand && setExpandedId(isOpen ? null : r.id)}
                    className="w-full text-left px-5 py-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1.5 shrink-0 w-[110px]">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${meta.tone}`}>
                          {meta.label}
                        </span>
                        {r.action === "file.bulk_download" && (() => {
                          const zp = ZIP_PHASE_META[getZipPhase(r.diff)];
                          return (
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${zp.tone}`}>
                              {zp.label}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-foreground">
                          <span className="font-medium">{actor}</span>
                          {targetName && <span className="text-muted-foreground"> · {targetName}</span>}
                        </div>
                        {summary && <div className="text-[12px] text-muted-foreground mt-0.5 break-words">{summary}</div>}
                        {r.action === "file.bulk_download" && (() => {
                          const zm = zipMeta.get(r.id);
                          if (!zm) return null;
                          const phase = getZipPhase(r.diff);
                          const pct = zm.running ? Math.max(8, Math.min(100, zm.percent || 0)) : zm.percent;
                          const barTone =
                            phase === "error" ? "bg-rose-500" :
                            phase === "canceled" ? "bg-slate-400" :
                            phase === "done" ? "bg-emerald-500" :
                            "bg-amber-500";
                          const durText = zm.durationMs != null
                            ? formatDurationMs(zm.durationMs)
                            : zm.running && zm.startedAt
                              ? `${formatDurationMs(Date.now() - new Date(zm.startedAt).getTime())} (đang chạy)`
                              : null;
                          return (
                            <div className="mt-2 max-w-md">
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${barTone} ${zm.running ? "animate-pulse" : ""}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                                <span>{zm.ok}/{zm.requested} tệp</span>
                                {zm.failed > 0 && <span className="text-rose-600">Lỗi {zm.failed}</span>}
                                {durText && <span>· {durText}</span>}
                              </div>
                            </div>
                          );
                        })()}
                        <div className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(r.occurred_at).toLocaleString("vi-VN")}
                          </span>
                          {canExpand && (
                            <span className="text-primary/80">
                              {isOpen ? "Ẩn chi tiết ▲" : `Xem chi tiết (${details.items.length || "•"}) ▼`}
                            </span>
                          )}
                        </div>
                      </div>
                      {r.action === "file.bulk_download" && r.batch_id && (
                        <div className="shrink-0 w-[110px] flex flex-col items-end gap-1">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mã lô</span>
                          <span
                            role="button"
                            tabIndex={canExpand ? 0 : -1}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canExpand) setExpandedId(isOpen ? null : r.id);
                            }}
                            onKeyDown={(e) => {
                              if (!canExpand) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedId(isOpen ? null : r.id);
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border border-border bg-muted/50 text-muted-foreground ${canExpand ? "hover:bg-primary/10 hover:text-primary hover:border-primary/40 cursor-pointer" : ""}`}
                            title={canExpand ? (isOpen ? "Ẩn danh sách tệp trong lô" : "Xem danh sách tệp trong lô") : "Mã lô tải ZIP"}
                          >
                            #{r.batch_id}
                            {canExpand && <span className="text-[9px]">{isOpen ? "▲" : "▼"}</span>}
                          </span>
                          {canExpand && details.items.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{details.items.length} tệp</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                  {r.action === "file.bulk_download" && getZipPhase(r.diff) === "error" && onRetryZip && (() => {
                    const ids: string[] = Array.isArray(r.diff?.ids) ? r.diff.ids.filter((x: any) => typeof x === "string") : [];
                    if (ids.length === 0) return null;
                    return (
                      <div className="px-5 pb-3 -mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onRetryZip(ids); }}
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-card text-[12px] font-medium text-foreground hover:bg-muted"
                          title={`Thử lại tải ZIP cho ${ids.length} tệp`}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Thử lại ({ids.length})
                        </button>
                        <span className="text-[11px] text-muted-foreground">Đóng gói lại lô ZIP bị lỗi</span>
                      </div>
                    );
                  })()}
                  {isOpen && (
                    <div className="px-5 pb-4 -mt-1">
                      <div className="rounded-md border border-border bg-muted/30 p-3">
                        {details.info && (
                          <div className="text-[12px] text-muted-foreground mb-2">{details.info}</div>
                        )}
                        {details.items.length > 0 && (
                          <ul className="divide-y divide-border/70 max-h-[280px] overflow-y-auto">
                            {details.items.map((it, i) => (
                              <li key={`${it.id ?? i}`} className="py-1.5 flex items-center gap-2">
                                <span className={`inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${it.tone}`}>
                                  {it.status}
                                </span>
                                <span className="text-[12.5px] text-foreground truncate flex-1" title={it.name}>
                                  {it.name}
                                </span>
                                {it.id && (
                                  <code className="text-[10.5px] text-muted-foreground font-mono truncate max-w-[160px]" title={it.id}>
                                    {it.id.slice(0, 8)}…
                                  </code>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {allRows.length > 0 && (
            <div ref={sentinelRef} className="px-5 py-4 text-center text-[12px] text-muted-foreground">
              {q.isFetching && !q.isLoading
                ? "Đang tải thêm…"
                : reachedCap
                  ? (pageSize >= SERVER_CAP ? "Đã đạt giới hạn 2000 bản ghi. Hãy thu hẹp bộ lọc." : "Đã hiển thị tất cả bản ghi.")
                  : (
                    <button
                      onClick={() => setPageSize((n) => Math.min(SERVER_CAP, n + PAGE_STEP))}
                      className="h-8 px-3 rounded-md border border-border bg-card hover:bg-muted"
                    >
                      Tải thêm {PAGE_STEP}
                    </button>
                  )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function DownloadProgressCard({
  state,
  onCancel,
  onClose,
}: {
  state: {
    total: number;
    done: number;
    failed: number;
    phase: "fetching" | "zipping" | "done" | "error" | "canceled";
    currentName?: string;
    bytes: number;
    message?: string;
  };
  onCancel: () => void;
  onClose: () => void;
}) {
  const { total, done, failed, phase, currentName, bytes, message } = state;
  const processed = done + failed;
  const pct = phase === "zipping" || phase === "done"
    ? 100
    : total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const isActive = phase === "fetching" || phase === "zipping";
  const tone =
    phase === "error" ? "border-red-300 bg-red-50" :
    phase === "done" ? "border-emerald-300 bg-emerald-50" :
    phase === "canceled" ? "border-muted bg-card" :
    "border-primary/30 bg-card";
  const barTone =
    phase === "error" ? "bg-red-500" :
    phase === "done" ? "bg-emerald-500" :
    phase === "canceled" ? "bg-muted-foreground/60" :
    "bg-primary";
  const label =
    phase === "fetching" ? `Đang tải ${processed}/${total}` :
    phase === "zipping" ? `Đang tạo file ZIP…` :
    phase === "done" ? (message || `Hoàn tất ${done}/${total}`) :
    phase === "canceled" ? (message || "Đã huỷ") :
    (message || "Lỗi");

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border shadow-lg ${tone}`}>
      <div className="flex items-start gap-3 px-4 pt-3 pb-2">
        <div className="mt-0.5">
          {phase === "done" ? (
            <div className="h-8 w-8 rounded-full bg-emerald-500 text-white grid place-items-center text-[13px] font-bold">✓</div>
          ) : phase === "error" ? (
            <div className="h-8 w-8 rounded-full bg-red-500 text-white grid place-items-center text-[13px] font-bold">!</div>
          ) : (
            <Download className={`h-6 w-6 ${isActive ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold truncate">
              {phase === "fetching" || phase === "zipping" ? "Đang tải xuống hàng loạt" : "Tải xuống hàng loạt"}
            </div>
            <button
              onClick={onClose}
              className="h-6 w-6 grid place-items-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Đóng"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground truncate">
            {label}
            {currentName && isActive && phase === "fetching" && (
              <span className="text-foreground/80"> · {currentName}</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all duration-200 ${barTone} ${phase === "zipping" ? "animate-pulse" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {processed}/{total} tệp
            {failed > 0 && <span className="text-red-600"> · {failed} lỗi</span>}
          </span>
          <span>{humanSize(bytes)} · {pct}%</span>
        </div>
      </div>

      {isActive && (
        <div className="flex justify-end border-t border-border/60 px-3 py-2">
          <button
            onClick={onCancel}
            className="h-7 px-2.5 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-muted"
          >
            Huỷ
          </button>
        </div>
      )}
    </div>
  );
}
