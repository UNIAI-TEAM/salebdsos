import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getOrCreateMyCard, updateMyCard, checkSlugAvailable,
} from "@/lib/card.functions";
import {
  listProjectOptions, listCardProjects, setCardProjects, getCardQrStats,
} from "@/lib/card-projects.functions";
import {
  User, Phone, Mail, MessageCircle, Globe2, Link2, Plus, Trash2, Save,
  Smartphone, Monitor, Eye, Copy, Check, QrCode as QrIcon, Upload,
  Sparkles, Palette, Settings2, ExternalLink, Loader2, BadgeCheck, Building2, Download, Share2,
} from "lucide-react";

import { toast } from "sonner";
import { QrCode as QrCodeBlock } from "@/components/qr-code";

export const Route = createFileRoute("/_app/digital-card/edit")({
  component: DigitalCardPage,
  head: () => ({
    meta: [
      { title: "Sửa danh thiếp | SaleBDS OS" },
      { name: "description", content: "Cập nhật nội dung, liên hệ, dự án và thiết kế danh thiếp Sale." },
      { property: "og:title", content: "Sửa danh thiếp | SaleBDS OS" },
      { property: "og:description", content: "Cập nhật nội dung, liên hệ, dự án và thiết kế danh thiếp Sale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Field = {
  type: "phone" | "email" | "zalo" | "messenger" | "website" | "address" | "social" | "cta" | "link";
  label: string;
  value?: string | null;
  href?: string | null;
  icon?: string | null;
};

const FIELD_PRESETS: { type: Field["type"]; label: string; icon: any; placeholder: string; toHref: (v: string) => string }[] = [
  { type: "phone", label: "Điện thoại", icon: Phone, placeholder: "0901234567", toHref: (v) => `tel:${v.replace(/\s/g, "")}` },
  { type: "zalo", label: "Zalo", icon: MessageCircle, placeholder: "0901234567", toHref: (v) => `https://zalo.me/${v.replace(/\D/g, "")}` },
  { type: "messenger", label: "Messenger", icon: MessageCircle, placeholder: "username hoặc m.me/...", toHref: (v) => v.startsWith("http") ? v : `https://m.me/${v}` },
  { type: "email", label: "Email", icon: Mail, placeholder: "you@company.com", toHref: (v) => `mailto:${v}` },
  { type: "website", label: "Website", icon: Globe2, placeholder: "https://...", toHref: (v) => v.startsWith("http") ? v : `https://${v}` },
  { type: "social", label: "Mạng xã hội", icon: Link2, placeholder: "https://facebook.com/...", toHref: (v) => v },
  { type: "cta", label: "CTA Button", icon: Sparkles, placeholder: "https://...", toHref: (v) => v },
  { type: "link", label: "Link tuỳ chỉnh", icon: Link2, placeholder: "https://...", toHref: (v) => v },
];

const TEMPLATES = [
  { key: "luxury-dark", name: "Luxury Dark", bg: "from-slate-800 via-slate-900 to-black", text: "text-white" },
  { key: "skyline", name: "Skyline", bg: "from-sky-500 via-indigo-600 to-violet-700", text: "text-white" },
  { key: "minimal", name: "Minimal", bg: "from-zinc-50 to-zinc-100", text: "text-zinc-900" },
  { key: "premium", name: "Premium", bg: "from-violet-700 via-fuchsia-700 to-rose-600", text: "text-white" },
  { key: "ocean", name: "Đại dương", bg: "from-blue-900 via-cyan-700 to-teal-700", text: "text-white" },
];

const PRIMARY_COLORS = ["#A855F7", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#1F2937"];

function publicOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function DigitalCardPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const fetchCard = useServerFn(getOrCreateMyCard);
  const updateCard = useServerFn(updateMyCard);
  const checkSlug = useServerFn(checkSlugAvailable);

  const cardQ = useQuery({
    queryKey: ["my-card", tenantId],
    queryFn: () => fetchCard({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const card: any = cardQ.data;

  // Local edit state — synced from server card
  const [draft, setDraft] = useState<any | null>(null);
  useEffect(() => { if (card && !draft) setDraft(card); }, [card, draft]);

  const dirty = useMemo(() => {
    if (!card || !draft) return false;
    const keys = ["slug", "display_name", "title", "company", "bio", "avatar_url", "is_published"];
    if (keys.some((k) => (card as any)[k] !== draft[k])) return true;
    if (JSON.stringify(card.fields ?? []) !== JSON.stringify(draft.fields ?? [])) return true;
    if (JSON.stringify(card.theme ?? {}) !== JSON.stringify(draft.theme ?? {})) return true;
    return false;
  }, [card, draft]);

  const saveMu = useMutation({
    mutationFn: async () => {
      if (!draft || !card) return;
      // slug uniqueness
      if (draft.slug !== card.slug) {
        const r = await checkSlug({ data: { slug: draft.slug, excludeId: card.id } });
        if (!r.available) throw new Error("Slug đã được dùng. Hãy chọn slug khác.");
      }
      return updateCard({
        data: {
          id: card.id,
          patch: {
            slug: draft.slug,
            display_name: draft.display_name,
            title: draft.title,
            company: draft.company,
            bio: draft.bio,
            avatar_url: draft.avatar_url,
            is_published: draft.is_published,
            fields: draft.fields ?? [],
            theme: draft.theme ?? {},
          },
        },
      });
    },
    onSuccess: (row) => {
      if (row) {
        setDraft(row);
        qc.setQueryData(["my-card", tenantId], row);
      }
      toast.success("Đã lưu danh thiếp");
    },
    onError: (e: any) => toast.error(e.message ?? "Lưu thất bại"),
  });

  // Dự án gắn vào danh thiếp + thống kê QR
  const fetchProjectOptions = useServerFn(listProjectOptions);
  const fetchCardProjects = useServerFn(listCardProjects);
  const saveCardProjects = useServerFn(setCardProjects);
  const fetchQrStats = useServerFn(getCardQrStats);

  const projectsQ = useQuery({
    queryKey: ["card-project-options", tenantId],
    queryFn: () => fetchProjectOptions({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });
  const cardProjectsQ = useQuery({
    queryKey: ["card-projects", card?.id],
    queryFn: () => fetchCardProjects({ data: { cardId: card!.id } }),
    enabled: !!card?.id,
  });
  const statsQ = useQuery({
    queryKey: ["card-qr-stats", tenantId, card?.id],
    queryFn: () => fetchQrStats({ data: { tenantId: tenantId!, cardId: card!.id, days: 30 } }),
    enabled: !!tenantId && !!card?.id,
  });

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  useEffect(() => {
    if (cardProjectsQ.data && !projectsLoaded) {
      setSelectedProjects(cardProjectsQ.data);
      setProjectsLoaded(true);
    }
  }, [cardProjectsQ.data, projectsLoaded]);

  const saveProjectsMu = useMutation({
    mutationFn: () =>
      saveCardProjects({ data: { tenantId: tenantId!, cardId: card!.id, projectIds: selectedProjects } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["card-projects", card?.id] });
      toast.success("Đã cập nhật dự án trên danh thiếp");
    },
    onError: (e: any) => toast.error(e.message ?? "Lưu thất bại"),
  });


  // Avatar upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const onAvatar = async (file: File) => {
    if (!tenantId || !card) return;
    if (file.size > 4 * 1024 * 1024) return toast.error("Ảnh tối đa 4MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${tenantId}/avatars/${card.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("card-assets").upload(path, file, {
        cacheControl: "3600", upsert: true, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("card-assets").getPublicUrl(path);
      setDraft((d: any) => ({ ...d, avatar_url: data.publicUrl }));
      toast.success("Đã tải ảnh đại diện");
    } catch (e: any) {
      toast.error(e.message ?? "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  if (!tenantId) return <div className="text-sm text-muted-foreground">Chọn workspace trước.</div>;
  if (cardQ.isLoading || !draft) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh thiếp...
      </div>
    );
  }

  const publicUrl = `${publicOrigin()}/c/${draft.slug}`;
  const fields: Field[] = draft.fields ?? [];
  const updateField = (i: number, p: Partial<Field>) =>
    setDraft((d: any) => ({ ...d, fields: d.fields.map((f: Field, idx: number) => (idx === i ? { ...f, ...p } : f)) }));
  const removeField = (i: number) =>
    setDraft((d: any) => ({ ...d, fields: d.fields.filter((_: any, idx: number) => idx !== i) }));
  const addField = (preset: typeof FIELD_PRESETS[number]) =>
    setDraft((d: any) => ({
      ...d,
      fields: [...(d.fields ?? []), { type: preset.type, label: preset.label, value: "", href: "" }],
    }));

  const themeKey = draft.theme?.template ?? "luxury-dark";
  const tmpl = TEMPLATES.find((t) => t.key === themeKey) ?? TEMPLATES[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Sửa danh thiếp</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Tạo & chỉnh sửa danh thiếp điện tử của bạn.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CopyLink url={publicUrl} />
          <Link
            to="/c/$slug" params={{ slug: draft.slug }}
            target="_blank"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-sm hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" /> Xem profile
          </Link>
          <button
            onClick={() => saveMu.mutate()}
            disabled={!dirty || saveMu.isPending}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {saveMu.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr_360px] gap-5">
        {/* LEFT — sections nav */}
        <aside className="hidden xl:block">
          <div className="rounded-2xl border border-border bg-card p-3 sticky top-4 space-y-1">
            {[
              { id: "profile", label: "Thông tin cá nhân", icon: User },
              { id: "contact", label: "Liên hệ & CTA", icon: Phone },
              { id: "design", label: "Thiết kế", icon: Palette },
              { id: "share", label: "Chia sẻ & QR", icon: QrIcon },
              { id: "settings", label: "Cài đặt", icon: Settings2 },
            ].map((s) => (
              <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                {s.label}
              </a>
            ))}
            <div className="mt-2 px-3 py-2 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
              {dirty ? "Có thay đổi chưa lưu" : "Đã lưu"}
            </div>
          </div>
        </aside>

        {/* CENTER — editor */}
        <div className="space-y-5 min-w-0">
          {/* Profile */}
          <Section id="profile" icon={User} title="Thông tin cá nhân">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="h-20 w-20 rounded-full bg-muted overflow-hidden grid place-items-center border border-border">
                  {draft.avatar_url ? (
                    <img src={draft.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 text-xs inline-flex items-center gap-1 text-primary font-medium"
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Đổi ảnh
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatar(f); e.target.value = ""; }} />
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                <Input label="Họ và tên" value={draft.display_name} onChange={(v) => setDraft({ ...draft, display_name: v })} />
                <Input label="Chức danh" value={draft.title ?? ""} onChange={(v) => setDraft({ ...draft, title: v })} placeholder="Chuyên viên BĐS" />
                <Input label="Công ty" value={draft.company ?? ""} onChange={(v) => setDraft({ ...draft, company: v })} placeholder="ABC Real Estate" />
                <Input label="Slug (URL)" value={draft.slug}
                  onChange={(v) => setDraft({ ...draft, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                  hint={`${publicOrigin()}/c/${draft.slug}`} />
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Giới thiệu</label>
                  <textarea
                    value={draft.bio ?? ""}
                    onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                    placeholder="Mô tả ngắn về bạn..."
                    maxLength={800}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* Contact / fields */}
          <Section id="contact" icon={Phone} title="Liên hệ & CTA">
            <div className="space-y-2">
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Chưa có liên hệ. Thêm bên dưới ↓</p>
              )}
              {fields.map((f, i) => {
                const preset = FIELD_PRESETS.find((p) => p.type === f.type) ?? FIELD_PRESETS[0];
                const Icon = preset.icon;
                return (
                  <div key={i} className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl border border-border bg-muted/30">
                    <div className="flex items-center gap-2 sm:w-40 shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <input
                        value={f.label}
                        onChange={(e) => updateField(i, { label: e.target.value })}
                        className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                        placeholder="Nhãn"
                      />
                    </div>
                    <input
                      value={f.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateField(i, { value, href: value ? preset.toHref(value) : "" });
                      }}
                      placeholder={preset.placeholder}
                      className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm min-w-0"
                    />
                    <button
                      onClick={() => removeField(i)}
                      className="h-9 w-9 grid place-items-center rounded-md hover:bg-destructive/10 text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              <div className="pt-2 flex flex-wrap gap-2">
                {FIELD_PRESETS.map((p) => (
                  <button
                    key={p.type + p.label}
                    onClick={() => addField(p)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium"
                  >
                    <Plus className="h-3 w-3" /> {p.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Design */}
          <Section id="design" icon={Palette} title="Thiết kế">
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Template</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setDraft({ ...draft, theme: { ...draft.theme, template: t.key } })}
                      className={[
                        "rounded-xl border-2 overflow-hidden text-left transition",
                        themeKey === t.key ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30",
                      ].join(" ")}
                    >
                      <div className={`h-16 bg-gradient-to-br ${t.bg}`} />
                      <div className="px-2 py-1.5 text-xs font-medium">{t.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Màu chủ đạo</div>
                <div className="flex gap-2">
                  {PRIMARY_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDraft({ ...draft, theme: { ...draft.theme, primary: c } })}
                      className={[
                        "h-8 w-8 rounded-full border-2",
                        draft.theme?.primary === c ? "border-foreground" : "border-transparent",
                      ].join(" ")}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Dự án đang bán */}
          <Section id="projects" icon={Building2} title="Dự án tôi đang bán">
            {projectsQ.isLoading ? (
              <div className="py-6 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (projectsQ.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Chưa có dự án trong workspace.{" "}
                <Link to="/sale-projects" className="text-primary font-medium">Thêm dự án</Link>
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Chọn dự án để khách quét QR thấy ngay danh sách dự án bạn đang bán, kèm link landing & brochure.
                </p>
                <div className="space-y-2">
                  {(projectsQ.data ?? []).map((p: any) => {
                    const idx = selectedProjects.indexOf(p.id);
                    const on = idx >= 0;
                    return (
                      <label
                        key={p.id}
                        className={[
                          "flex items-center gap-3 rounded-xl border p-2.5 cursor-pointer transition",
                          on ? "border-primary bg-primary-soft/40" : "border-border hover:border-primary/40",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) =>
                            setSelectedProjects((prev) =>
                              e.target.checked ? [...prev, p.id].slice(0, 12) : prev.filter((x) => x !== p.id),
                            )
                          }
                          className="h-4 w-4 rounded border-border"
                        />
                        <div className="h-10 w-14 rounded-lg bg-muted overflow-hidden shrink-0">
                          {(p.cover_mobile_url || p.cover_url) && (
                            <img src={p.cover_mobile_url || p.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold truncate">{p.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{p.city || p.status || "—"}</div>
                        </div>
                        {on && <span className="ml-auto text-[11px] font-semibold text-primary">#{idx + 1}</span>}
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={() => saveProjectsMu.mutate()}
                  disabled={saveProjectsMu.isPending}
                  className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-60"
                >
                  {saveProjectsMu.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lưu danh sách dự án
                </button>
              </>
            )}

            {statsQ.data && (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { l: "Lượt xem (30 ngày)", v: statsQ.data.views },
                  { l: "Quét QR", v: statsQ.data.qr },
                  { l: "Bấm vào dự án", v: statsQ.data.projectClicks },
                  { l: "Khách để lại SĐT", v: statsQ.data.leads },
                ].map((k) => (
                  <div key={k.l} className="rounded-xl border border-border p-3">
                    <div className="text-[18px] font-bold tabular-nums">{k.v.toLocaleString("vi-VN")}</div>
                    <div className="text-[11px] text-muted-foreground">{k.l}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>


          {/* Share */}
          <Section id="share" icon={QrIcon} title="Chia sẻ & QR · NFC">
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 items-start">
              <div className="rounded-xl border border-border bg-white p-3 grid place-items-center">
                <QrCodeBlock value={publicUrl} size={150} />
              </div>
              <div className="space-y-3 min-w-0">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Link công khai</label>
                  <div className="mt-1 flex gap-2">
                    <input readOnly value={publicUrl} className="flex-1 h-9 rounded-md border border-border bg-muted px-3 text-sm min-w-0" />
                    <CopyLink url={publicUrl} compact />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Ghi vào thẻ NFC</label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quản lý short-code NFC tại{" "}
                    <Link to="/nfc-codes" className="text-primary font-medium">NFC & QR Codes</Link>.
                    URL trên là URL trực tiếp; dùng short-code nếu cần đổi đích về sau.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Settings */}
          <Section id="settings" icon={Settings2} title="Cài đặt">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!draft.is_published}
                onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <div>
                <div className="text-sm font-medium">Hiển thị công khai</div>
                <div className="text-xs text-muted-foreground">Tắt để ẩn link `/c/{draft.slug}` khỏi internet.</div>
              </div>
            </label>
          </Section>
        </div>

        {/* RIGHT — mobile preview */}
        <aside className="hidden xl:block">
          <div className="sticky top-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Xem trước (mobile)</div>
              <Link to="/c/$slug" params={{ slug: draft.slug }} target="_blank" className="inline-flex items-center gap-1 text-primary">
                <Eye className="h-3 w-3" /> Mở thật
              </Link>
            </div>
            <MobilePreview draft={draft} publicUrl={publicUrl} hasProjects={selectedProjects.length > 0} />
          </div>
        </aside>
      </div>

      {/* Mobile preview drawer for small screens */}
      <div className="xl:hidden">
        <div className="text-xs text-muted-foreground mb-2 inline-flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Xem trước</div>
        <MobilePreview draft={draft} publicUrl={publicUrl} hasProjects={selectedProjects.length > 0} />
      </div>
    </div>
  );
}

function Section({ id, icon: Icon, title, children }: any) {
  return (
    <section id={id} className="rounded-2xl border border-border bg-card overflow-hidden">
      <header className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">{title}</h2>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
      />
      {hint && <div className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</div>}
    </div>
  );
}

function CopyLink({ url, compact }: { url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={onCopy}
      className={[
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium",
        compact ? "h-9 px-3" : "h-9 px-3",
      ].join(" ")}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      {compact ? "Copy" : "Sao chép link"}
    </button>
  );
}

function MobilePreview({ draft, publicUrl, hasProjects }: { draft: any; publicUrl: string; hasProjects: boolean }) {
  const fields: Field[] = draft.fields ?? [];
  const phone = fields.find((field) => field.type === "phone");
  const zalo = fields.find((field) => field.type === "zalo");
  return (
    <div className="mx-auto w-[300px] overflow-hidden rounded-[2rem] border-[9px] border-digital-canvas bg-digital-canvas shadow-2xl">
      <div className="h-[590px] overflow-y-auto bg-digital-canvas px-5 pb-6 pt-7 font-card-sans text-digital-ink scrollbar-thin">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-digital-glass ring-2 ring-digital-blue ring-offset-4 ring-offset-digital-surface">
            {draft.avatar_url ? <img src={draft.avatar_url} alt={draft.display_name || "Ảnh đại diện"} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center"><User className="h-8 w-8 opacity-60" /></div>}
          </div>
          <h2 className="mt-4 font-card-serif text-lg font-bold leading-tight">{draft.display_name || "Họ và tên"}</h2>
          <div className="mt-2 flex flex-col items-center gap-1">
            {draft.title && <p className="text-[10px] font-semibold uppercase text-digital-blue">{draft.title}</p>}
            {draft.company && <div className="inline-flex items-center gap-1 text-[10px] opacity-55">{draft.company} <BadgeCheck className="h-3 w-3" /></div>}
          </div>
        </div>

        <div className="digital-card-glass mt-5 rounded-2xl border border-digital-ink/10 p-3">
          <div className="rounded-xl bg-digital-ink p-2">
            <QrCodeBlock value={publicUrl} size={174} showDownload={false} />
          </div>
        </div>
        <p className="mt-3 text-center text-[10px] italic text-digital-ink/45">Quét mã để lưu thông tin liên hệ ngay</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-digital-blue text-[11px] font-semibold text-primary-foreground"><Phone className="h-3.5 w-3.5" />{phone?.label || "Gọi điện"}</div>
          <div className="digital-card-glass flex h-11 items-center justify-center gap-1.5 rounded-xl border border-digital-ink/10 text-[11px] font-semibold"><MessageCircle className="h-3.5 w-3.5" />{zalo?.label || "Zalo"}</div>
          <div className="digital-card-glass col-span-2 flex h-11 items-center justify-center gap-1.5 rounded-xl border border-digital-ink/10 text-[11px] font-semibold"><Download className="h-3.5 w-3.5" />Lưu danh bạ</div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-digital-ink/10 pt-4 text-[10px]">
          <span className="inline-flex items-center gap-1 text-digital-ink/60"><Share2 className="h-3.5 w-3.5" />Chia sẻ</span>
          {hasProjects && <span className="inline-flex items-center gap-1 font-semibold text-digital-blue">Xem danh sách dự án <ExternalLink className="h-3 w-3" /></span>}
        </div>
      </div>
    </div>
  );
}
