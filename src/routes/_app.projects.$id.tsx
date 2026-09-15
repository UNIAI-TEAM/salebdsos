import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getProject, upsertProject, softDeleteProject,
  attachCard, detachCard, getMyCardsForAttach,
} from "@/lib/project.functions";
import { listSalesPages } from "@/lib/ai-sales-page.functions";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  ArrowLeft, Upload, FileText, Trash2, Plus, X, Phone, Link2 as LinkIcon, Building2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects/$id")({ component: ProjectDetailPage });

const STATUSES = ["selling", "coming_soon", "in_progress", "delivered", "paused"] as const;
const STATUS_LABEL: Record<string, string> = {
  selling: "Đang mở bán", coming_soon: "Sắp mở bán", in_progress: "Đang triển khai",
  delivered: "Đã bàn giao", paused: "Tạm dừng",
};
const PROPERTY_TYPES = ["Căn hộ", "Khu đô thị", "Biệt thự", "Nhà phố", "Đất nền", "Nghỉ dưỡng", "Văn phòng", "Khác"];

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const nav = useNavigate();
  const qc = useQueryClient();

  const fetchOne = useServerFn(getProject);
  const upsert = useServerFn(upsertProject);
  const remove = useServerFn(softDeleteProject);
  const attach = useServerFn(attachCard);
  const detach = useServerFn(detachCard);
  const fetchCards = useServerFn(getMyCardsForAttach);

  const project = useQuery({ queryKey: ["project", id], queryFn: () => fetchOne({ data: { id } }) });
  const myCards = useQuery({
    queryKey: ["my-cards", tenantId],
    queryFn: () => fetchCards({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const fetchLandings = useServerFn(listSalesPages);
  const landings = useQuery({
    queryKey: ["project-landings", tenantId, id],
    queryFn: () => fetchLandings({ data: { tenantId: tenantId!, projectId: id, pageSize: 20 } }),
    enabled: !!tenantId,
  });
  const landingItems = landings.data?.items ?? [];
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const p = project.data?.project;
  const linkedCards = project.data?.cards ?? [];

  const [form, setForm] = useState<any>(null);
  const f = form ?? p;
  const set = (k: string, v: any) => setForm({ ...(form ?? p), [k]: v });
  const [highlight, setHighlight] = useState("");

  const save = useMutation({
    mutationFn: (vals: any) => upsert({ data: { ...vals, id, tenant_id: vals.tenant_id ?? tenantId! } }),
    onSuccess: () => { toast.success("Đã lưu"); setForm(null); qc.invalidateQueries({ queryKey: ["project", id] }); },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi"),
  });

  const del = useMutation({
    mutationFn: () => remove({ data: { id } }),
    onSuccess: () => { toast.success("Đã xoá"); nav({ to: "/projects" }); },
  });

  const attachMut = useMutation({
    mutationFn: (cardId: string) => attach({ data: { projectId: id, cardId, tenantId: tenantId! } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", id] }),
  });
  const detachMut = useMutation({
    mutationFn: (cardId: string) => detach({ data: { projectId: id, cardId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", id] }),
  });

  async function uploadFile(file: File, folder: string): Promise<string> {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${tenantId}/${folder}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("project-assets").upload(path, file);
    if (error) throw error;
    return supabase.storage.from("project-assets").getPublicUrl(path).data.publicUrl;
  }

  async function onUploadGallery(files: FileList | null) {
    if (!files?.length) return;
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 10)) {
        if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name} > 8MB`); continue; }
        urls.push(await uploadFile(file, "gallery"));
      }
      const newGallery = [...((f?.gallery as string[]) ?? []), ...urls];
      save.mutate({ ...f, gallery: newGallery, cover_url: f?.cover_url ?? urls[0] ?? null });
    } catch (e: any) { toast.error(e?.message ?? "Upload lỗi"); }
  }

  async function onUploadBrochure(file: File | null) {
    if (!file || !tenantId) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("File > 20MB");
    try {
      const url = await uploadFile(file, "brochures");
      save.mutate({ ...f, brochure_url: url, brochure_name: file.name });
    } catch (e: any) { toast.error(e?.message ?? "Upload lỗi"); }
  }

  if (project.isLoading) return <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>;
  if (!p) return <div className="p-6 text-sm text-muted-foreground">Không tìm thấy dự án.</div>;

  const dirty = form !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/projects" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Tất cả dự án
        </Link>
        <div className="flex items-center gap-2">
          {dirty && <Button variant="ghost" onClick={() => setForm(null)}>Huỷ</Button>}
          <Button disabled={!dirty || save.isPending} onClick={() => save.mutate(f)}>
            {save.isPending ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
          <Button variant="outline" onClick={() => { if (confirm("Xoá dự án này?")) del.mutate(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <PageHeader title={f?.name ?? p.name} sub={`${f?.developer ?? p.developer ?? ""} · ${f?.location ?? p.location ?? ""}`} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Basic info */}
          <SectionCard title="Thông tin cơ bản">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Tên dự án</Label><Input value={f?.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
              <div><Label>Chủ đầu tư</Label><Input value={f?.developer ?? ""} onChange={(e) => set("developer", e.target.value)} /></div>
              <div><Label>Vị trí</Label><Input value={f?.location ?? ""} onChange={(e) => set("location", e.target.value)} /></div>
              <div><Label>Thành phố</Label><Input value={f?.city ?? ""} onChange={(e) => set("city", e.target.value)} /></div>
              <div>
                <Label>Loại hình</Label>
                <Select value={f?.property_type ?? ""} onValueChange={(x) => set("property_type", x)}>
                  <SelectTrigger><SelectValue placeholder="Chọn loại hình" /></SelectTrigger>
                  <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trạng thái</Label>
                <Select value={f?.status ?? "selling"} onValueChange={(x) => set("status", x)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Giá từ</Label><Input type="number" value={f?.price_from ?? ""} onChange={(e) => set("price_from", e.target.value ? Number(e.target.value) : null)} /></div>
              <div><Label>Giá đến</Label><Input type="number" value={f?.price_to ?? ""} onChange={(e) => set("price_to", e.target.value ? Number(e.target.value) : null)} /></div>
              <div className="col-span-2"><Label>Mô tả</Label><Textarea rows={3} value={f?.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
            </div>
          </SectionCard>

          {/* Gallery */}
          <SectionCard title="Gallery"
            action={
              <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary cursor-pointer">
                <Upload className="h-4 w-4" /> Tải ảnh
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUploadGallery(e.target.files)} />
              </label>
            }
          >
            {((f?.gallery as string[]) ?? []).length === 0 ? (
              <div className="text-[13px] text-muted-foreground">Chưa có ảnh.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {((f?.gallery as string[]) ?? []).map((url, i) => (
                  <div key={url} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => set("gallery", ((f?.gallery as string[]) ?? []).filter((_, j) => j !== i))}
                      className="absolute top-1.5 right-1.5 h-6 w-6 grid place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100"
                    ><X className="h-3.5 w-3.5" /></button>
                    {f?.cover_url === url && <span className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-bold">Bìa</span>}
                    {f?.cover_url !== url && (
                      <button
                        onClick={() => set("cover_url", url)}
                        className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-white/90 font-semibold opacity-0 group-hover:opacity-100"
                      >Đặt làm bìa</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Brochure */}
          <SectionCard title="Brochure"
            action={
              <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary cursor-pointer">
                <Upload className="h-4 w-4" /> Tải brochure
                <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => onUploadBrochure(e.target.files?.[0] ?? null)} />
              </label>
            }
          >
            {f?.brochure_url ? (
              <a href={f.brochure_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30">
                <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 grid place-items-center"><FileText className="h-5 w-5" /></div>
                <div className="flex-1 text-[13px] font-semibold truncate">{f.brochure_name ?? "brochure.pdf"}</div>
                <span className="text-[12px] text-primary font-semibold">Tải xuống</span>
              </a>
            ) : (
              <div className="text-[13px] text-muted-foreground">Chưa có brochure.</div>
            )}
          </SectionCard>

          {/* Landing công khai */}
          <SectionCard
            title="Landing công khai"
            action={
              <Link to="/ai-sales-page" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary">
                <Plus className="h-4 w-4" /> Tạo landing
              </Link>
            }
          >
            {landings.isLoading ? (
              <div className="text-[13px] text-muted-foreground">Đang tải…</div>
            ) : landingItems.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">
                Chưa có landing nào cho dự án này. Bấm “Tạo landing” để tạo trang giới thiệu công khai.
              </div>
            ) : (
              <div className="space-y-2">
                {landingItems.map((l: any) => {
                  const url = l.slug ? `${origin}/p/${l.slug}` : null;
                  return (
                    <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold truncate">{l.title ?? "Landing"}</div>
                        <div className="text-[11.5px] text-muted-foreground truncate">
                          {l.slug ? `/p/${l.slug}` : "Chưa có đường dẫn"} · {l.views_count ?? 0} lượt xem
                        </div>
                      </div>
                      <Badge variant={l.is_published ? "default" : "secondary"}>
                        {l.is_published ? "Đang công khai" : "Bản nháp"}
                      </Badge>
                      {url && l.is_published && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void navigator.clipboard.writeText(url);
                              toast.success("Đã copy link landing");
                            }}
                          >
                            Copy link
                          </Button>
                          <a href={url} target="_blank" rel="noreferrer" className="text-primary">
                            <LinkIcon className="h-4 w-4" />
                          </a>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Unit highlights */}
          <SectionCard title="Điểm nổi bật của sản phẩm">
            <div className="flex gap-2 mb-3">
              <Input placeholder="VD: Căn 2PN view sông, hướng Đông Nam…" value={highlight} onChange={(e) => setHighlight(e.target.value)} />
              <Button
                onClick={() => {
                  if (!highlight.trim()) return;
                  set("unit_highlights", [...((f?.unit_highlights as string[]) ?? []), highlight.trim()]);
                  setHighlight("");
                }}
              ><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {((f?.unit_highlights as string[]) ?? []).map((h, i) => (
                <Badge key={i} variant="secondary" className="gap-1.5">
                  {h}
                  <button onClick={() => set("unit_highlights", ((f?.unit_highlights as string[]) ?? []).filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {((f?.unit_highlights as string[]) ?? []).length === 0 && <span className="text-[13px] text-muted-foreground">Chưa thêm điểm nổi bật.</span>}
            </div>
          </SectionCard>

          {/* Sales policy */}
          <SectionCard title="Chính sách bán hàng">
            <Textarea rows={5} value={f?.sales_policy ?? ""} onChange={(e) => set("sales_policy", e.target.value)} placeholder="Chính sách thanh toán, chiết khấu, ưu đãi…" />
          </SectionCard>

          {/* CTA */}
          <SectionCard title="CTA: Nhận bảng giá / Đặt tư vấn">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hotline tư vấn</Label>
                <div className="relative">
                  <Phone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="0901 xxx xxx" value={f?.cta_phone ?? ""} onChange={(e) => set("cta_phone", e.target.value)} />
                </div>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={f?.cta_form_enabled ?? true} onChange={(e) => set("cta_form_enabled", e.target.checked)} />
                  Bật form “Nhận bảng giá”
                </label>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SectionCard title="Card đính kèm">
            {linkedCards.length === 0 ? (
              <div className="text-[13px] text-muted-foreground mb-3">Dự án chưa được gắn vào card nào.</div>
            ) : (
              <ul className="space-y-2 mb-3">
                {linkedCards.map((c: any) => (
                  <li key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="h-8 w-8 rounded-full bg-muted overflow-hidden grid place-items-center">
                      {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{c.display_name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">/c/{c.slug}</div>
                    </div>
                    <button onClick={() => detachMut.mutate(c.id)} className="text-muted-foreground hover:text-rose-600">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Label className="text-[11.5px]">Gắn thêm card</Label>
            <Select onValueChange={(v) => attachMut.mutate(v)}>
              <SelectTrigger><SelectValue placeholder="Chọn card…" /></SelectTrigger>
              <SelectContent>
                {(myCards.data ?? [])
                  .filter((c) => !linkedCards.some((lc: any) => lc.id === c.id))
                  .map((c) => <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </SectionCard>

          <SectionCard title="Liên kết nhanh">
            <ul className="space-y-2 text-[12.5px]">
              {linkedCards.map((c: any) => (
                <li key={c.id}>
                  <a href={`/c/${c.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <LinkIcon className="h-3.5 w-3.5" /> /c/{c.slug}
                  </a>
                </li>
              ))}
              {linkedCards.length === 0 && <li className="text-muted-foreground">—</li>}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
