import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Upload, Download, Trash2, RotateCcw, Search, Folder, FileText, RefreshCw, X, Tag,
} from "lucide-react";
import { PageHeader, SectionCard, KpiCard } from "@/components/app/ui";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listFiles, createFileRecord, softDeleteFile, restoreFile, hardDeleteFile,
  getFileSignedUrl, listFileFacets,
} from "@/lib/file.functions";
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
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const list = useServerFn(listFiles);
  const facets = useServerFn(listFileFacets);
  const createRec = useServerFn(createFileRecord);
  const softDel = useServerFn(softDeleteFile);
  const restore = useServerFn(restoreFile);
  const hardDel = useServerFn(hardDeleteFile);
  const signed = useServerFn(getFileSignedUrl);

  const listQ = useQuery({
    queryKey: ["files", tenantId, q, folder, includeDeleted],
    queryFn: () =>
      list({ data: { tenantId, q: q || undefined, folder, includeDeleted, page: 1, pageSize: 200 } }),
    enabled: !!tenantId,
  });
  const facetQ = useQuery({
    queryKey: ["files-facets", tenantId],
    queryFn: () => facets({ data: { tenantId } }),
    enabled: !!tenantId,
  });

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

  const doUpload = async (file: File, meta: { folder: string; tag: string }) => {
    if (!tenantId) throw new Error("Chưa chọn workspace");
    if (file.size > MAX_SIZE) throw new Error(`Tệp vượt ${humanSize(MAX_SIZE)}`);
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${tenantId}/${Date.now()}_${safeName}`;
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
      } as any,
    });
  };

  const items = listQ.data?.items ?? [];
  const folders = facetQ.data?.folders ?? {};
  const totalSize = facetQ.data?.totalSize ?? 0;

  const folderList = useMemo(() => {
    const all = new Set<string>([...FOLDER_PRESETS, ...Object.keys(folders)]);
    return Array.from(all);
  }, [folders]);

  return (
    <div>
      <PageHeader
        title="Tài liệu"
        sub="Thư viện tệp của workspace: brochure, bảng giá, hợp đồng, hình ảnh."
        action={
          <div className="flex items-center gap-2">
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

      <SectionCard
        title={includeDeleted ? "Danh sách tệp (gồm thùng rác)" : "Danh sách tệp"}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo tên tệp"
                className="h-8 pl-7 pr-3 rounded-md border border-border bg-card text-[12.5px] w-64 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
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
                <th className="px-4 py-2.5 font-medium">Tên tệp</th>
                <th className="px-3 py-2.5 font-medium">Thư mục</th>
                <th className="px-3 py-2.5 font-medium">Nhãn</th>
                <th className="px-3 py-2.5 font-medium text-right">Kích thước</th>
                <th className="px-3 py-2.5 font-medium text-right">Tải lên</th>
                <th className="px-3 py-2.5 font-medium text-right w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {listQ.isLoading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Đang tải...</td></tr>
              )}
              {!listQ.isLoading && items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Chưa có tệp nào. Bấm "Tải lên" để bắt đầu.</td></tr>
              )}
              {items.map((f: any) => {
                const isDeleted = !!f.deleted_at;
                return (
                  <tr key={f.id} className={["hover:bg-muted/40", isDeleted && "opacity-60"].filter(Boolean).join(" ")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="font-medium text-foreground truncate max-w-[320px]" title={f.name}>{f.name}</div>
                      </div>
                      {f.mime && <div className="text-[11px] text-muted-foreground mt-0.5 ml-6">{f.mime}</div>}
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
          onClose={() => setUploadOpen(false)}
          onUpload={async (file, meta) => {
            await doUpload(file, meta);
            invalidate();
          }}
        />
      )}
      {!user && null}
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
  folderList, onClose, onUpload,
}: {
  folderList: string[];
  onClose: () => void;
  onUpload: (file: File, meta: { folder: string; tag: string }) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [folder, setFolder] = useState<string>(folderList[0] ?? "");
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Vui lòng chọn tệp"); return; }
    setBusy(true);
    try {
      await onUpload(file, { folder, tag: tag.trim() });
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
