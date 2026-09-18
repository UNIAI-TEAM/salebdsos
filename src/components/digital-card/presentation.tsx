import { Link } from "@tanstack/react-router";
import { Building2, Check, ContactRound, ExternalLink, Eye, Nfc, QrCode as QrIcon, Share2, User } from "lucide-react";
import { useState } from "react";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";

type Field = { type?: string; label: string; value?: string | null; href?: string | null };
type Project = { id: string; name: string; city?: string | null; cover_url?: string | null; cover_mobile_url?: string | null; qr_code?: string | null };
export type DigitalCardData = { slug: string; display_name: string; title?: string | null; company?: string | null; bio?: string | null; avatar_url?: string | null; fields?: unknown };
const fieldsOf = (value: unknown) => Array.isArray(value) ? value as Field[] : [];

export function DigitalCardPresentation({ card, projects, publicUrl }: { card: DigitalCardData; projects: Project[]; publicUrl: string }) {
  const [shared, setShared] = useState(false);
  const fields = fieldsOf(card.fields);
  const phone = fields.find((field) => field.type === "phone");
  const zalo = fields.find((field) => field.type === "zalo");
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: card.display_name, url: publicUrl }); return; } catch { return; } }
    await navigator.clipboard.writeText(publicUrl); setShared(true); window.setTimeout(() => setShared(false), 1600);
  };
  return <div className="mx-auto max-w-6xl font-card-sans">
    <section className="overflow-hidden rounded-2xl border border-gold/50 bg-digital-canvas shadow-card">
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-center lg:p-10">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-gold">Digital identity</p>
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_88px] gap-5 sm:grid-cols-[minmax(0,1fr)_132px] lg:block">
            <div className="min-w-0"><h1 className="break-words text-3xl font-bold text-digital-ink sm:text-4xl">{card.display_name}</h1>{card.title ? <p className="mt-2 text-lg font-semibold text-gold">{card.title}</p> : null}{card.company ? <p className="mt-1 text-base text-digital-ink/75">{card.company}</p> : null}{card.bio ? <p className="mt-4 max-w-xl text-sm leading-relaxed text-digital-ink/65">{card.bio}</p> : null}</div>
            <div className="overflow-hidden rounded-xl border border-gold/40 bg-digital-surface lg:hidden">{card.avatar_url ? <img src={card.avatar_url} alt={card.display_name} className="h-full min-h-24 w-full object-cover" /> : <div className="grid h-full min-h-24 place-items-center"><User className="h-9 w-9 text-digital-ink/50" /></div>}</div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <Button type="button" variant="outline" onClick={() => document.getElementById("my-card-qr")?.scrollIntoView({ behavior: "smooth" })} className="h-12 justify-between border-gold/35 bg-digital-glass text-digital-ink hover:bg-digital-glass hover:text-digital-ink"><span className="inline-flex items-center gap-2"><QrIcon className="h-4 w-4 text-gold" />QR của tôi</span><ExternalLink className="h-4 w-4" /></Button>
            <Link to="/nfc-codes" className="inline-flex h-12 items-center justify-between rounded-lg border border-gold/35 bg-digital-glass px-4 text-sm font-medium text-digital-ink"><span className="inline-flex items-center gap-2"><Nfc className="h-5 w-5 text-gold" />Chạm NFC</span><ExternalLink className="h-4 w-4" /></Link>
          </div>
        </div>
        <div className="hidden lg:block"><div className="aspect-[4/5] overflow-hidden rounded-xl border border-gold/50 bg-digital-surface">{card.avatar_url ? <img src={card.avatar_url} alt={card.display_name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><User className="h-12 w-12 text-digital-ink/50" /></div>}</div><Link to="/profile" className="mt-4 flex items-center justify-end gap-2 text-sm text-digital-ink">Xem hồ sơ <ExternalLink className="h-4 w-4" /></Link></div>
      </div>
    </section>
    <section className="mt-4 grid grid-cols-4 divide-x divide-border overflow-hidden rounded-xl border border-border bg-card">
      <Action icon={Share2} label={shared ? "Đã sao chép" : "Chia sẻ"} onClick={share} active={shared} />
      <Action icon={QrIcon} label="QR của tôi" onClick={() => document.getElementById("my-card-qr")?.scrollIntoView({ behavior: "smooth" })} />
      <Link to="/nfc-codes" className="flex min-h-20 flex-col items-center justify-center gap-2 px-1 text-center text-xs text-muted-foreground hover:bg-muted"><Nfc className="h-5 w-5 text-foreground" />Thẻ NFC</Link>
      <Link to="/profile" className="flex min-h-20 flex-col items-center justify-center gap-2 px-1 text-center text-xs text-muted-foreground hover:bg-muted"><Eye className="h-5 w-5 text-foreground" />Profile</Link>
    </section>
    <section id="my-card-qr" className="mt-4 grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center">
      <div className="mx-auto rounded-lg bg-digital-ink p-2"><QrCode value={publicUrl} size={172} showDownload={false} /></div>
      <div className="min-w-0 text-center sm:text-left"><h2 className="text-lg font-semibold">QR danh thiếp của tôi</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Khách quét để mở Profile, lưu liên hệ và xem các dự án bạn đang bán.</p><div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">{phone?.href ? <a href={phone.href} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm">{phone.label || "Gọi điện"}</a> : null}{zalo?.href ? <a href={zalo.href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm">{zalo.label || "Zalo"}</a> : null}</div></div>
    </section>
    {projects.length ? <section className="mt-4 rounded-xl border border-border bg-card p-5"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="min-w-0"><h2 className="truncate text-lg font-semibold">Dự án đang bán</h2><p className="text-sm text-muted-foreground">{projects.length} dự án đã gắn vào danh thiếp</p></div><Link to="/profile" className="shrink-0 text-sm font-medium text-primary">Xem Profile</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{projects.slice(0,3).map(project => <div key={project.id} className="flex items-center gap-3 rounded-lg border border-border p-3"><Building2 className="h-5 w-5 shrink-0 text-gold" /><div className="min-w-0"><p className="truncate text-sm font-medium">{project.name}</p><p className="truncate text-xs text-muted-foreground">{project.city || "Dự án bất động sản"}</p></div></div>)}</div></section> : null}
  </div>;
}

function Action({ icon: Icon, label, onClick, active }: { icon: typeof Share2; label: string; onClick: () => void; active?: boolean }) { return <Button type="button" variant="ghost" onClick={onClick} className="h-20 rounded-none flex-col gap-2 px-1 text-center text-xs font-normal text-muted-foreground hover:bg-muted hover:text-foreground">{active ? <Check className="h-5 w-5 text-success" /> : <Icon className="h-5 w-5 text-foreground" />}{label}</Button>; }

export function ProfilePresentation({ card, projects, publicUrl }: { card: DigitalCardData; projects: Project[]; publicUrl: string }) {
  const fields = fieldsOf(card.fields);
  return <div className="mx-auto max-w-5xl space-y-8">
    <header className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-5 border-b border-border pb-6 sm:grid-cols-[minmax(0,1fr)_128px]"><div className="min-w-0"><p className="text-xs font-semibold uppercase text-primary">Profile Sale</p><h1 className="mt-2 break-words text-3xl font-semibold">{card.display_name}</h1>{card.title ? <p className="mt-2 text-base text-primary">{card.title}</p> : null}{card.company ? <p className="mt-1 text-sm text-muted-foreground">{card.company}</p> : null}</div><div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">{card.avatar_url ? <img src={card.avatar_url} alt={card.display_name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><User className="h-9 w-9 text-muted-foreground" /></div>}</div></header>
    {card.bio ? <section><h2 className="text-xl font-semibold">Về tôi</h2><p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{card.bio}</p></section> : null}
    <section><h2 className="text-xl font-semibold">Thông tin liên hệ</h2>{fields.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{fields.map((field,index) => <a key={`${field.type}-${index}`} href={field.href || undefined} target={field.href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-4 text-sm"><ContactRound className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0"><span className="block text-xs text-muted-foreground">{field.label}</span><span className="block truncate font-medium">{field.value || field.href || "—"}</span></span></a>)}</div> : <p className="mt-3 text-sm text-muted-foreground">Chưa có thông tin liên hệ.</p>}</section>
    <section><div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"><div className="min-w-0"><h2 className="text-xl font-semibold">Dự án đang bán</h2><p className="mt-1 text-sm text-muted-foreground">Thông tin dự án được đồng bộ từ danh thiếp.</p></div><QrCode value={publicUrl} size={72} showDownload={false} /></div>{projects.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2">{projects.map(project => <article key={project.id} className="overflow-hidden rounded-xl border border-border bg-card"><div className="aspect-[16/8] bg-muted">{project.cover_mobile_url || project.cover_url ? <img src={project.cover_mobile_url || project.cover_url || ""} alt={project.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center"><Building2 className="h-8 w-8 text-muted-foreground" /></div>}</div><div className="p-4"><h3 className="font-semibold">{project.name}</h3><p className="mt-1 text-sm text-muted-foreground">{project.city || "Dự án bất động sản"}</p></div></article>)}</div> : <p className="mt-3 text-sm text-muted-foreground">Chưa gắn dự án nào.</p>}</section>
  </div>;
}
