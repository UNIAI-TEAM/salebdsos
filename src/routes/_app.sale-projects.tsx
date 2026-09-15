// Trang quản lý dự án dành cho sale trên điện thoại (PWA):
// đổi ảnh bìa, brochure và lấy link landing — cập nhật ngay, không cần publish lại.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { listProjects, getProject, upsertProject } from "@/lib/project.functions";
import { listSalesPages } from "@/lib/ai-sales-page.functions";
import { PageHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { warmOfflineCache } from "@/lib/pwa";
import { Building2, Search, Upload, FileText, Link2, ImageIcon, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/sale-projects")({
  head: () => ({
    meta: [
      { title: "Dự án của tôi — SaleBDS OS" },
      { name: "description", content: "Sale cập nhật ảnh bìa, brochure và link landing của từng dự án ngay trên điện thoại." },
      { property: "og:title", content: "Dự án của tôi — SaleBDS OS" },
      { property: "og:description", content: "Cập nhật ảnh bìa, brochure và link landing dự án ngay trên điện thoại." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SaleProjectsPage,
});

const STATUS_LABEL: Record<string, string> = {
  selling: "Đang mở bán", coming_soon: "Sắp mở bán", in_progress: "Đang triển khai",
  delivered: "Đã bàn giao", paused: "Tạm dừng",
};

function SaleProjectsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useServerFn(listProjects);
  const projects = useQuery({
    queryKey: ["projects", tenantId, q],
    queryFn: () => list({ data: { tenantId: tenantId!, q: q || undefined } }),
    enabled: !!tenantId,
  });

  useEffect(() => {
    void warmOfflineCache(["/sale-projects", "/landings", "/timeline"]);
  }, []);

  if (!tenantId) return <div className="p-6 text-sm text-muted-foreground">Chọn workspace để tiếp tục.</div>;

  const items = projects.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Dự án của tôi" sub="Đổi ảnh bìa, brochure và lấy link landing — lưu là cập nhật ngay." />

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9 h-11" placeholder="Tìm dự án…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {projects.isLoading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Chưa có dự án nào.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpenId(p.id)}
                className="w-full text-left rounded-2xl border border-border bg-card p-3 flex items-center gap-3 active:scale-[0.995] transition-transform"
              >
                <div className="h-16 w-20 shrink-0 rounded-xl bg-muted overflow-hidden grid place-items-center">
                  {p.cover_url
                    ? <img src={p.cover_url} alt={p.name} className="h-full w-full object-cover" />
                    : <Building2 className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[14px] truncate">{p.name}</div>
                  <div className="text-[12px] text-muted-foreground truncate">
                    {p.developer ?? "—"} · {p.location ?? p.city ?? "—"}
                  </div>
                  {p.status && (
                    <Badge variant="secondary" className="mt-1.5 text-[10.5px]">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </Badge>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {openId && <ProjectQuickEdit id={openId} tenantId={tenantId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectQuickEdit({ id, tenantId }: { id: string; tenantId: string }) {
  const qc = useQueryClient();
  const fetchOne = useServerFn(getProject);
  const upsert = useServerFn(upsertProject);
  const fetchLandings = useServerFn(listSalesPages);
  const [busy, setBusy] = useState(false);

  const project = useQuery({ queryKey: ["project", id], queryFn: () => fetchOne({ data: { id } }) });
  const landings = useQuery({
    queryKey: ["project-landings", tenantId, id],
    queryFn: () => fetchLandings({ data: { tenantId, projectId: id, pageSize: 20 } }),
  });

  const p: any = project.data?.project;
  const gallery: string[] = (p?.gallery as string[]) ?? [];
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const save = useMutation({
    mutationFn: (patch: any) =>
      upsert({ data: { ...p, ...patch, id, tenant_id: p?.tenant_id ?? tenantId } }),
    onSuccess: () => {
      toast.success("Đã cập nhật");
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi"),
  });

  async function upload(file: File, folder: string) {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${tenantId}/${folder}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("project-assets").upload(path, file);
    if (error) throw error;
    return supabase.storage.from("project-assets").getPublicUrl(path).data.publicUrl;
  }

  async function onPickImages(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 8)) {
        if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} > 20MB`); continue; }
        const optimized = await optimizeImage(file, { maxWidth: 1600, quality: 0.82 });
        urls.push(await upload(optimized.file, "gallery"));
      }

      if (urls.length) save.mutate({ gallery: [...gallery, ...urls], cover_url: urls[0] });
    } catch (e: any) { toast.error(e?.message ?? "Tải ảnh lỗi"); }
    finally { setBusy(false); }
  }

  async function onPickBrochure(file: File | null) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("File > 20MB");
    setBusy(true);
    try {
      const url = await upload(file, "brochures");
      save.mutate({ brochure_url: url, brochure_name: file.name });
    } catch (e: any) { toast.error(e?.message ?? "Tải brochure lỗi"); }
    finally { setBusy(false); }
  }

  if (project.isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Đang tải…</div>;
  if (!p) return <div className="py-8 text-center text-sm text-muted-foreground">Không tìm thấy dự án.</div>;

  const saving = busy || save.isPending;
  const landingItems = (landings.data?.items ?? []) as any[];

  return (
    <>
      <DialogHeader><DialogTitle className="text-[15px]">{p.name}</DialogTitle></DialogHeader>

      <div className="space-y-5">
        {/* Ảnh bìa & gallery */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Ảnh bìa</span>
            <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary cursor-pointer">
              <Upload className="h-4 w-4" /> Tải ảnh
              <input type="file" accept="image/*" multiple className="hidden" disabled={saving}
                onChange={(e) => onPickImages(e.target.files)} />
            </label>
          </div>
          <div className="aspect-[16/9] rounded-xl bg-muted overflow-hidden grid place-items-center">
            {p.cover_url
              ? <img src={p.cover_url} alt={p.name} className="h-full w-full object-cover" />
              : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
          </div>
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((url) => (
                <button key={url} type="button" disabled={saving}
                  onClick={() => save.mutate({ cover_url: url })}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {p.cover_url === url && (
                    <span className="absolute inset-0 grid place-items-center bg-primary/40 text-primary-foreground">
                      <Check className="h-5 w-5" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <p className="text-[11.5px] text-muted-foreground">Chạm vào ảnh để đặt làm ảnh bìa.</p>
        </section>

        {/* Brochure */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Brochure</span>
            <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary cursor-pointer">
              <Upload className="h-4 w-4" /> Tải brochure
              <input type="file" accept=".pdf,application/pdf" className="hidden" disabled={saving}
                onChange={(e) => onPickBrochure(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {p.brochure_url ? (
            <a href={p.brochure_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-border">
              <span className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 grid place-items-center"><FileText className="h-5 w-5" /></span>
              <span className="flex-1 text-[13px] font-semibold truncate">{p.brochure_name ?? "brochure.pdf"}</span>
              <ExternalLink className="h-4 w-4 text-primary" />
            </a>
          ) : (
            <div className="text-[13px] text-muted-foreground">Chưa có brochure.</div>
          )}
        </section>

        {/* Landing công khai */}
        <section className="space-y-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Link landing</span>
          {landings.isLoading ? (
            <div className="text-[13px] text-muted-foreground">Đang tải…</div>
          ) : landingItems.length === 0 ? (
            <div className="text-[13px] text-muted-foreground">Dự án chưa có landing công khai.</div>
          ) : (
            <div className="space-y-2">
              {landingItems.map((l) => {
                const url = l.slug ? `${origin}/p/${l.slug}` : null;
                return (
                  <div key={l.id} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold truncate">{l.title ?? "Landing"}</div>
                        <div className="text-[11.5px] text-muted-foreground truncate">
                          {l.slug ? `/p/${l.slug}` : "Chưa có đường dẫn"} · {l.views_count ?? 0} lượt xem
                        </div>
                      </div>
                      <Badge variant={l.is_published ? "default" : "secondary"} className="text-[10.5px]">
                        {l.is_published ? "Công khai" : "Nháp"}
                      </Badge>
                    </div>
                    {url && l.is_published && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-1.5"
                          onClick={() => { void navigator.clipboard.writeText(url); toast.success("Đã copy link"); }}>
                          <Link2 className="h-3.5 w-3.5" /> Copy link
                        </Button>
                        <Button size="sm" className="flex-1 gap-1.5" asChild>
                          <a href={url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> Mở landing
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {saving && <div className="text-[12.5px] text-muted-foreground">Đang lưu…</div>}
      </div>
    </>
  );
}
