import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { QrCode as QrCodeView } from "@/components/qr-code";
import { DigitalCardPresentation } from "@/components/digital-card/presentation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Building2, Copy, ExternalLink, IdCard, Mail, Pencil, Plus, QrCode, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { deactivateSale, inviteSale, listSalesDirectory, ROLE_TITLE_VI, syncSalesCards, updateManagedSale } from "@/lib/sales-directory.functions";

export const Route = createFileRoute("/_app/sales-directory")({
  component: SalesDirectoryPage,
  head: () => ({ meta: [
    { title: "Quản lý Sale | SaleBDS OS" },
    { name: "description", content: "Quản lý hồ sơ Sale và đồng bộ Digital Card trình chiếu." },
    { property: "og:title", content: "Quản lý Sale | SaleBDS OS" },
    { property: "og:description", content: "Quản lý hồ sơ Sale và đồng bộ Digital Card trình chiếu." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

type Field = { type: "phone" | "email" | "zalo" | "website" | "link"; label: string; value: string; href: string };
type Sale = any;
const EMPTY_INVITE = { fullName: "", email: "", phone: "", role: "agent" as "agent" | "manager" };
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase();
const hrefFor = (type: Field["type"], value: string) => type === "phone" ? `tel:${value.replace(/\s/g, "")}` : type === "email" ? `mailto:${value}` : type === "zalo" ? `https://zalo.me/${value.replace(/\D/g, "")}` : value;

function SalesDirectoryPage() {
  const { currentTenant, hasRole, user } = useAuth();
  const tenantId = currentTenant?.id;
  const canManage = hasRole(["owner", "admin"]);
  const canSync = hasRole(["owner", "admin", "manager"]);
  const qc = useQueryClient();
  const fetchDirectory = useServerFn(listSalesDirectory);
  const sync = useServerFn(syncSalesCards);
  const invite = useServerFn(inviteSale);
  const update = useServerFn(updateManagedSale);
  const deactivate = useServerFn(deactivateSale);
  const [q, setQ] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteDraft, setInviteDraft] = useState(EMPTY_INVITE);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [openQr, setOpenQr] = useState<{ name: string; code: string } | null>(null);

  const dirQ = useQuery({ queryKey: ["sales-directory", tenantId], queryFn: () => fetchDirectory({ data: { tenantId: tenantId ?? "" } }), enabled: !!tenantId });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["sales-directory", tenantId] });
    qc.invalidateQueries({ queryKey: ["my-card", tenantId] });
    qc.invalidateQueries({ queryKey: ["sale-overview", tenantId] });
  };
  const syncMu = useMutation({ mutationFn: () => sync({ data: { tenantId: tenantId ?? "" } }), onSuccess: (r) => { toast.success(`Đã đồng bộ ${r.created + r.updated} danh thiếp`); refresh(); }, onError: (e) => toast.error(e.message) });
  const inviteMu = useMutation({
    mutationFn: () => invite({ data: { tenantId: tenantId ?? "", ...inviteDraft, redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined } }),
    onSuccess: (r) => { toast.success(r.invited ? "Đã gửi email mời và tạo Digital Card" : "Đã thêm tài khoản hiện có vào đội Sale"); setInviteDraft(EMPTY_INVITE); setShowInvite(false); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMu = useMutation({
    mutationFn: () => update({ data: { tenantId: tenantId ?? "", targetUserId: editing.userId, profile: draft.profile, card: draft.card } }),
    onSuccess: () => { toast.success("Đã cập nhật hồ sơ và Digital Card"); setEditing(null); setDraft(null); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const deactivateMu = useMutation({
    mutationFn: (targetUserId: string) => deactivate({ data: { tenantId: tenantId ?? "", targetUserId } }),
    onSuccess: () => { toast.success("Đã ngừng hoạt động và ẩn danh thiếp"); setEditing(null); setDraft(null); refresh(); },
    onError: (e) => toast.error(e.message),
  });

  const sales = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return (dirQ.data?.sales ?? []).filter((sale: Sale) => !keyword || [sale.fullName, sale.email, sale.phone, sale.card?.title].filter(Boolean).join(" ").toLowerCase().includes(keyword));
  }, [dirQ.data, q]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const beginEdit = (sale: Sale) => {
    const fields = Array.isArray(sale.card?.fields) ? sale.card.fields : [];
    setEditing(sale);
    setDraft({
      profile: { fullName: sale.fullName, phone: sale.phone ?? "", avatarUrl: sale.avatarUrl ?? "", role: sale.role === "manager" ? "manager" : "agent" },
      card: { id: sale.card.id, slug: sale.card.slug, displayName: sale.card.displayName, title: sale.card.title ?? "", company: sale.card.company ?? "", bio: sale.card.bio ?? "", avatarUrl: sale.card.avatarUrl ?? sale.avatarUrl ?? "", isPublished: sale.card.isPublished, fields },
    });
  };
  const addContact = () => setDraft((value: any) => ({ ...value, card: { ...value.card, fields: [...value.card.fields, { type: "phone", label: "Điện thoại", value: "", href: "" }] } }));
  const updateContact = (index: number, patch: Partial<Field>) => setDraft((value: any) => ({ ...value, card: { ...value.card, fields: value.card.fields.map((field: Field, i: number) => i === index ? { ...field, ...patch } : field) } }));
  const uploadAvatar = async (file?: File) => {
    if (!file || !tenantId || !editing?.card?.id) return;
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) return toast.error("Chọn ảnh JPG/PNG/WebP tối đa 4MB");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${tenantId}/avatars/${editing.card.id}-managed-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("card-assets").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("card-assets").getPublicUrl(path);
      setDraft((value: any) => ({ ...value, profile: { ...value.profile, avatarUrl: data.publicUrl }, card: { ...value.card, avatarUrl: data.publicUrl } }));
      toast.success("Đã tải ảnh, bấm Lưu và đồng bộ để áp dụng");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không tải được ảnh"); }
  };

  return <div className="space-y-5">
    <PageHeader title="Quản lý Sale" sub="Quản lý hồ sơ, vai trò và Digital Card trình chiếu tại một nơi." action={canManage ? <Button onClick={() => setShowInvite(true)}><Plus />Thêm Sale</Button> : undefined} />
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Tìm tên, email, số điện thoại..." className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
      {canSync ? <Button variant="outline" onClick={() => syncMu.mutate()} disabled={syncMu.isPending}><RefreshCw className={syncMu.isPending ? "animate-spin" : ""} />Đồng bộ</Button> : null}
    </div>
    {dirQ.isLoading ? <SectionCard title="Đang tải"><p className="text-sm text-muted-foreground">Đang tải danh sách Sale…</p></SectionCard> : sales.length === 0 ? <SectionCard title="Chưa có Sale"><p className="text-sm text-muted-foreground">Mời Sale mới để hệ thống tạo hồ sơ và Digital Card.</p></SectionCard> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sales.map((sale: Sale) => <article key={sale.userId} className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">{sale.avatarUrl ? <img src={sale.avatarUrl} alt={sale.fullName} className="h-12 w-12 rounded-full object-cover" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">{initials(sale.fullName)}</div>}<div className="min-w-0 flex-1"><p className="truncate font-semibold">{sale.card?.displayName || sale.fullName}</p><p className="truncate text-sm text-muted-foreground">{sale.card?.title || ROLE_TITLE_VI[sale.role]}</p><p className="truncate text-xs text-muted-foreground">{sale.email}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${sale.emailConfirmedAt ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{sale.emailConfirmedAt ? "Hoạt động" : "Chờ xác nhận"}</span></div>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-xs"><div><span className="text-muted-foreground">Danh thiếp</span><p className="mt-1 font-medium">{sale.card?.isPublished ? "Công khai" : "Đang ẩn"}</p></div><div><span className="text-muted-foreground">Lượt xem</span><p className="mt-1 font-medium">{sale.card?.viewCount ?? 0}</p></div></div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{sale.projects.length} dự án đang gắn</p>
      <div className="mt-3 flex gap-2">{sale.card ? <Button variant="outline" size="sm" className="flex-1" asChild><a href={`/c/${sale.card.slug}`} target="_blank" rel="noreferrer"><IdCard />Xem card<ExternalLink /></a></Button> : null}{canManage && sale.card ? <Button variant="outline" size="sm" onClick={() => beginEdit(sale)}><Pencil /><span className="sr-only">Sửa</span></Button> : null}<Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(`${origin}/c/${sale.card?.slug}`).then(() => toast.success("Đã sao chép liên kết"))}><Copy /><span className="sr-only">Sao chép</span></Button></div>
      {sale.projects.length ? <div className="mt-3 flex flex-wrap gap-2">{sale.projects.slice(0, 3).map((project: any) => project.qrCode ? <Button key={project.projectId} variant="ghost" size="sm" onClick={() => setOpenQr({ name: `${project.name} — ${sale.fullName}`, code: project.qrCode })}><QrCode />{project.name}</Button> : null)}</div> : null}
    </article>)}</div>}

    {showInvite ? <Overlay onClose={() => setShowInvite(false)} title="Thêm Sale"><form onSubmit={(event) => { event.preventDefault(); inviteMu.mutate(); }} className="space-y-4"><FieldLabel label="Họ và tên"><input required minLength={2} value={inviteDraft.fullName} onChange={(e) => setInviteDraft({ ...inviteDraft, fullName: e.target.value })} className="field" /></FieldLabel><FieldLabel label="Email"><input required type="email" value={inviteDraft.email} onChange={(e) => setInviteDraft({ ...inviteDraft, email: e.target.value })} className="field" /></FieldLabel><FieldLabel label="Số điện thoại"><input value={inviteDraft.phone} onChange={(e) => setInviteDraft({ ...inviteDraft, phone: e.target.value })} className="field" /></FieldLabel><FieldLabel label="Vai trò"><select value={inviteDraft.role} onChange={(e) => setInviteDraft({ ...inviteDraft, role: e.target.value as "agent" | "manager" })} className="field"><option value="agent">Chuyên viên kinh doanh</option><option value="manager">Trưởng phòng kinh doanh</option></select></FieldLabel><p className="text-xs leading-relaxed text-muted-foreground"><Mail className="mr-1 inline h-3.5 w-3.5" />Sale nhận email mời để thiết lập mật khẩu. Digital Card được tạo ngay.</p><Button type="submit" className="w-full" disabled={inviteMu.isPending}>{inviteMu.isPending ? "Đang gửi…" : "Gửi lời mời"}</Button></form></Overlay> : null}

    {editing && draft ? <Overlay wide onClose={() => { setEditing(null); setDraft(null); }} title={`Sửa ${editing.fullName}`}><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.8fr)]"><form onSubmit={(event) => { event.preventDefault(); updateMu.mutate(); }} className="space-y-6">
      <EditorSection title="Hồ sơ Sale"><div className="grid gap-3 sm:grid-cols-2"><FieldLabel label="Họ và tên"><input required value={draft.profile.fullName} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, fullName: e.target.value } })} className="field" /></FieldLabel><FieldLabel label="Email đăng nhập"><input readOnly value={editing.email ?? ""} className="field opacity-70" /></FieldLabel><FieldLabel label="Số điện thoại"><input value={draft.profile.phone} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, phone: e.target.value } })} className="field" /></FieldLabel><FieldLabel label="Vai trò"><select value={draft.profile.role} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, role: e.target.value } })} className="field"><option value="agent">Chuyên viên kinh doanh</option><option value="manager">Trưởng phòng kinh doanh</option></select></FieldLabel><FieldLabel label="Ảnh đại diện" full><label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3"><div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">{draft.profile.avatarUrl ? <img src={draft.profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : <Upload className="h-5 w-5 text-muted-foreground" />}</div><span className="text-sm"><span className="block font-medium">Tải ảnh đại diện</span><span className="text-xs text-muted-foreground">JPG, PNG hoặc WebP · tối đa 4MB</span></span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => uploadAvatar(e.target.files?.[0])} /></label></FieldLabel></div></EditorSection>
      <EditorSection title="Danh thiếp"><div className="grid gap-3 sm:grid-cols-2"><FieldLabel label="Tên hiển thị"><input required value={draft.card.displayName} onChange={(e) => setDraft({ ...draft, card: { ...draft.card, displayName: e.target.value } })} className="field" /></FieldLabel><FieldLabel label="Chức danh"><input value={draft.card.title} onChange={(e) => setDraft({ ...draft, card: { ...draft.card, title: e.target.value } })} className="field" /></FieldLabel><FieldLabel label="Công ty"><input value={draft.card.company} onChange={(e) => setDraft({ ...draft, card: { ...draft.card, company: e.target.value } })} className="field" /></FieldLabel><FieldLabel label="Đường dẫn"><div className="flex h-10 rounded-lg border border-border bg-background"><span className="grid place-items-center border-r border-border px-3 text-xs text-muted-foreground">/c/</span><input required pattern="[a-z0-9-]+" value={draft.card.slug} onChange={(e) => setDraft({ ...draft, card: { ...draft.card, slug: e.target.value.toLowerCase() } })} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" /></div></FieldLabel><FieldLabel label="Giới thiệu" full><textarea rows={3} value={draft.card.bio} onChange={(e) => setDraft({ ...draft, card: { ...draft.card, bio: e.target.value } })} className="field h-auto py-2" /></FieldLabel><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.card.isPublished} onChange={(e) => setDraft({ ...draft, card: { ...draft.card, isPublished: e.target.checked } })} />Công khai danh thiếp</label></div></EditorSection>
      <EditorSection title="Thông tin liên hệ" action={<Button type="button" variant="outline" size="sm" onClick={addContact}><Plus />Thêm</Button>}>{draft.card.fields.map((field: Field, index: number) => <div key={index} className="mb-2 grid grid-cols-[110px_minmax(0,1fr)_36px] gap-2"><select value={field.type} onChange={(e) => { const type = e.target.value as Field["type"]; updateContact(index, { type, label: type === "phone" ? "Điện thoại" : type === "email" ? "Email" : type === "zalo" ? "Zalo" : "Liên kết", href: hrefFor(type, field.value) }); }} className="field"><option value="phone">Điện thoại</option><option value="email">Email</option><option value="zalo">Zalo</option><option value="website">Website</option><option value="link">Liên kết</option></select><input value={field.value ?? ""} onChange={(e) => updateContact(index, { value: e.target.value, href: hrefFor(field.type, e.target.value) })} className="field" /><Button type="button" size="icon" variant="ghost" onClick={() => setDraft({ ...draft, card: { ...draft.card, fields: draft.card.fields.filter((_: Field, i: number) => i !== index) } })}><Trash2 /></Button></div>)}</EditorSection>
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between"><Button type="button" variant="destructive" disabled={editing.userId === user?.id || deactivateMu.isPending} onClick={() => { if (confirm(`Ngừng hoạt động ${editing.fullName}? Danh thiếp sẽ bị ẩn nhưng dữ liệu lịch sử được giữ lại.`)) deactivateMu.mutate(editing.userId); }}><Trash2 />Ngừng hoạt động</Button><Button type="submit" disabled={updateMu.isPending}>{updateMu.isPending ? "Đang lưu…" : "Lưu và đồng bộ"}</Button></div>
    </form><div className="min-w-0"><p className="mb-3 text-sm font-semibold">Xem trước trình chiếu</p><div className="sticky top-4 scale-[.82] origin-top-left w-[122%]"><DigitalCardPresentation card={{ slug: draft.card.slug, display_name: draft.card.displayName, title: draft.card.title, company: draft.card.company, bio: draft.card.bio, avatar_url: draft.card.avatarUrl, fields: draft.card.fields }} projects={editing.projects.map((project: any) => ({ id: project.projectId, name: project.name, city: project.city, qr_code: project.qrCode }))} publicUrl={`${origin}/c/${draft.card.slug}`} /></div></div></div></Overlay> : null}

    {openQr ? <Overlay onClose={() => setOpenQr(null)} title={openQr.name}><QrCodeView value={`${origin}/api/public/pq/${openQr.code}`} size={220} label="Khách quét QR để xem dự án" filename={`qr-${openQr.code}`} /></Overlay> : null}
  </div>;
}

function Overlay({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) { return <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/45 p-3 sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div className={`mx-auto my-3 rounded-xl border border-border bg-card shadow-xl ${wide ? "max-w-6xl" : "max-w-lg"}`}><header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5"><h2 className="font-semibold">{title}</h2><Button size="icon" variant="ghost" onClick={onClose}><X /><span className="sr-only">Đóng</span></Button></header><div className="p-4 sm:p-5">{children}</div></div></div>; }
function FieldLabel({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) { return <label className={`block space-y-1.5 ${full ? "sm:col-span-2" : ""}`}><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>; }
function EditorSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) { return <section><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{title}</h3>{action}</div>{children}</section>; }
