// Trang quản lý landing dành cho sale trên điện thoại (PWA):
// xem danh sách landing, sửa tên, ảnh, brochure và đường dẫn công khai.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listSalesPages,
  getSalesPage,
  updateSalesPage,
  setSalesPagePublish,
} from "@/lib/ai-sales-page.functions";
import { PageHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { warmOfflineCache, warmLandings } from "@/lib/pwa";
import {
  Globe2, Search, Upload, FileText, ImageIcon, Check, ExternalLink, Copy, Link2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/sale-landings")({
  head: () => ({
    meta: [
      { title: "Landing của tôi — SaleBDS OS" },
      { name: "description", content: "Sale xem danh sách landing công khai, sửa tên, ảnh, brochure và đường dẫn ngay trên điện thoại." },
      { property: "og:title", content: "Landing của tôi — SaleBDS OS" },
      { property: "og:description", content: "Quản lý landing công khai: tên, ảnh, brochure và link chia sẻ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SaleLandingsPage,
});

function SaleLandingsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useServerFn(listSalesPages);
  const pages = useQuery({
    queryKey: ["sales-pages", tenantId, "sale-landings"],
    queryFn: () => list({ data: { tenantId: tenantId!, pageSize: 50 } }),
    enabled: !!tenantId,
  });

  const items = useMemo(() => {
    const all = (pages.data?.items ?? []) as any[];
    const kw = q.trim().toLowerCase();
    if (!kw) return all;
    return all.filter(
      (p) => (p.title ?? "").toLowerCase().includes(kw) || (p.slug ?? "").toLowerCase().includes(kw),
    );
  }, [pages.data, q]);

  useEffect(() => {
    void warmOfflineCache(["/sale-landings", "/sale-projects", "/timeline"]);
  }, []);

  useEffect(() => {
    const published = (pages.data?.items ?? []) as any[];
    const list = published
      .filter((p) => p.is_published && p.slug)
      .map((p) => ({
        slug: p.slug as string,
        heroImageUrl: (p.output?.hero_image_url as string) ?? null,
        brochureUrl: (p.output?.brochure_url as string) ?? null,
      }));
    if (list.length) void warmLandings(list);
  }, [pages.data]);

  if (!tenantId) return <div className="p-6 text-sm text-muted-foreground">Chọn workspace để tiếp tục.</div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Landing của tôi" sub="Sửa tên, ảnh, brochure và đường dẫn — lưu là cập nhật ngay." />

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9 h-11" placeholder="Tìm landing…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {pages.isLoading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Chưa có landing nào.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => {
            const hero = (p.output?.hero_image_url as string) ?? null;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(p.id)}
                  className="w-full text-left rounded-2xl border border-border bg-card p-3 flex items-center gap-3 active:scale-[0.995] transition-transform"
                >
                  <div className="h-16 w-20 shrink-0 rounded-xl bg-muted overflow-hidden grid place-items-center">
                    {hero ? (
                      <img src={hero} alt={p.title ?? "Landing"} className="h-full w-full object-cover" />
                    ) : (
                      <Globe2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[14px] truncate">{p.title ?? "Landing"}</div>
                    <div className="text-[12px] text-muted-foreground truncate">
                      {p.slug ? `/p/${p.slug}` : "Chưa có đường dẫn"} · {p.views_count ?? 0} lượt xem
                    </div>
                    <Badge variant={p.is_published ? "default" : "secondary"} className="mt-1.5 text-[10.5px]">
                      {p.is_published ? "Đang công khai" : "Bản nháp"}
                    </Badge>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {openId && <LandingQuickEdit id={openId} tenantId={tenantId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LandingQuickEdit({ id, tenantId }: { id: string; tenantId: string }) {
  const qc = useQueryClient();
  const fetchOne = useServerFn(getSalesPage);
  const update = useServerFn(updateSalesPage);
  const publish = useServerFn(setSalesPagePublish);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");

  const page = useQuery({ queryKey: ["sales-page", id], queryFn: () => fetchOne({ data: { id } }) });
  const p: any = page.data;
  const out: any = p?.output ?? {};
  const gallery: string[] = Array.isArray(out.gallery) ? out.gallery : [];
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = p?.slug ? `${origin}/p/${p.slug}` : null;

  useEffect(() => {
    if (!p) return;
    setTitle(p.title ?? "");
    setSlug(p.slug ?? "");
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sales-page", id] });
    qc.invalidateQueries({ queryKey: ["sales-pages"] });
  };

  const save = useMutation({
    mutationFn: (patch: { title?: string; slug?: string | null; output?: any }) =>
      update({ data: { id, ...patch } }),
    onSuccess: () => { toast.success("Đã cập nhật"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi"),
  });

  const togglePublish = useMutation({
    mutationFn: (next: boolean) => publish({ data: { id, is_published: next } }),
    onSuccess: () => { toast.success("Đã cập nhật trạng thái"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi"),
  });

  async function upload(file: File, folder: string) {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${tenantId}/landings/${id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
        if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name} > 8MB`); continue; }
        urls.push(await upload(file, "images"));
      }
      if (urls.length) {
        save.mutate({
          output: { ...out, gallery: [...gallery, ...urls].slice(0, 8), hero_image_url: urls[0] },
        });
      }
    } catch (e: any) { toast.error(e?.message ?? "Tải ảnh lỗi"); }
    finally { setBusy(false); }
  }

  async function onPickBrochure(file: File | null) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("File > 20MB");
    setBusy(true);
    try {
      const brochure_url = await upload(file, "brochures");
      save.mutate({ output: { ...out, brochure_url, brochure_name: file.name } });
    } catch (e: any) { toast.error(e?.message ?? "Tải brochure lỗi"); }
    finally { setBusy(false); }
  }

  if (page.isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Đang tải…</div>;
  if (!p) return <div className="py-8 text-center text-sm text-muted-foreground">Không tìm thấy landing.</div>;

  const saving = busy || save.isPending || togglePublish.isPending;

  return (
    <>
      <DialogHeader><DialogTitle className="text-[15px]">{p.title ?? "Landing"}</DialogTitle></DialogHeader>

      <div className="space-y-5">
        {/* Tên & đường dẫn */}
        <section className="space-y-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Tên landing</span>
          <Input className="h-11" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên landing" />
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Đường dẫn</span>
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-muted-foreground shrink-0">/p/</span>
            <Input className="h-11" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="duong-dan-landing" />
          </div>
          <Button
            className="w-full h-11"
            disabled={saving || !title.trim()}
            onClick={() => save.mutate({ title: title.trim(), slug: slug.trim() || null })}
          >
            Lưu tên & đường dẫn
          </Button>
        </section>

        {/* Ảnh */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Ảnh chính</span>
            <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary cursor-pointer">
              <Upload className="h-4 w-4" /> Tải ảnh
              <input type="file" accept="image/*" multiple className="hidden" disabled={saving}
                onChange={(e) => onPickImages(e.target.files)} />
            </label>
          </div>
          <div className="aspect-[16/9] rounded-xl bg-muted overflow-hidden grid place-items-center">
            {out.hero_image_url
              ? <img src={out.hero_image_url} alt={p.title ?? "Landing"} className="h-full w-full object-cover" />
              : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
          </div>
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((g) => (
                <button key={g} type="button" disabled={saving}
                  onClick={() => save.mutate({ output: { ...out, hero_image_url: g } })}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                  <img src={g} alt="" className="h-full w-full object-cover" />
                  {out.hero_image_url === g && (
                    <span className="absolute inset-0 grid place-items-center bg-primary/40 text-primary-foreground">
                      <Check className="h-5 w-5" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <p className="text-[11.5px] text-muted-foreground">Chạm vào ảnh để đặt làm ảnh chính.</p>
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
          {out.brochure_url ? (
            <a href={out.brochure_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-border">
              <span className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 grid place-items-center"><FileText className="h-5 w-5" /></span>
              <span className="flex-1 text-[13px] font-semibold truncate">{out.brochure_name ?? "brochure.pdf"}</span>
              <ExternalLink className="h-4 w-4 text-primary" />
            </a>
          ) : (
            <div className="text-[13px] text-muted-foreground">Chưa có brochure.</div>
          )}
        </section>

        {/* Link công khai */}
        <section className="space-y-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Link công khai</span>
          <div className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground min-w-0">
              <Link2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{url ?? "Chưa có đường dẫn"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-10" disabled={!url}
                onClick={() => { if (url) { void navigator.clipboard.writeText(url); toast.success("Đã copy link"); } }}>
                <Copy className="h-4 w-4 mr-1.5" /> Copy link
              </Button>
              <Button variant="outline" className="h-10" disabled={!url} asChild={!!url}>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1.5" /> Mở
                  </a>
                ) : <span>Mở</span>}
              </Button>
            </div>
            <Button
              variant={p.is_published ? "outline" : "default"}
              className="w-full h-10"
              disabled={saving}
              onClick={() => togglePublish.mutate(!p.is_published)}
            >
              {p.is_published ? "Ẩn landing" : "Công khai landing"}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
