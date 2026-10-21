import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Camera, MapPin, Plus, QrCode as QrIcon, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { checkInTicket, inviteGuest, listEvents, saveEvent } from "@/lib/events.functions";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/events")({
  head: () => ({
    meta: [
      { title: "Sự kiện mở bán & check-in QR — SaleBDS OS" },
      { name: "description", content: "Tạo sự kiện mở bán, site tour; gửi vé QR cho khách và điểm danh bằng điện thoại." },
      { property: "og:title", content: "Sự kiện mở bán & check-in QR — SaleBDS OS" },
      { property: "og:description", content: "Vé mời QR và check-in không cần giấy cho sự kiện BĐS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventsPage,
});

const KINDS: Record<string, string> = { launch: "Mở bán", site_tour: "Site tour", workshop: "Hội thảo", other: "Khác" };

function EventsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const fetchList = useServerFn(listEvents);
  const q = useQuery({ queryKey: ["events", tenantId], enabled: !!tenantId, queryFn: () => fetchList({ data: { tenantId: tenantId! } }) });
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [scan, setScan] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["events", tenantId] });

  if (!q.data) return <div className="p-6 text-sm text-muted-foreground">{q.error ? (q.error as Error).message : "Đang tải…"}</div>;
  const { events, tickets, canManage } = q.data;
  const ev = events.find((e: any) => e.id === selected);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Sự kiện & check-in"
        sub="Mở bán, site tour, hội thảo — mời khách bằng vé QR, điểm danh ngay trên điện thoại."
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="h-10" onClick={() => setScan(true)}><Camera className="mr-1.5 h-4 w-4" />Check-in</Button>
            {canManage && <Button className="h-10" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" />Tạo sự kiện</Button>}
          </div>
        }
      />
      {events.length === 0 ? (
        <SectionCard><div className="py-10 text-center"><CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="font-medium">Chưa có sự kiện</p><p className="text-sm text-muted-foreground">Tạo sự kiện mở bán đầu tiên để gửi vé mời cho khách.</p></div></SectionCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e: any) => {
            const ts = tickets.filter((t: any) => t.event_id === e.id && t.status !== "cancelled");
            const ins = ts.filter((t: any) => t.status === "checked_in").length;
            return (
              <button key={e.id} onClick={() => setSelected(e.id)} className="rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition hover:shadow-card">
                <Badge variant="secondary" className="mb-2">{KINDS[e.kind] ?? e.kind}</Badge>
                <p className="font-semibold">{e.title}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{new Date(e.starts_at).toLocaleString("vi-VN")}</p>
                {e.location && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{e.location}</p>}
                <div className="mt-3 flex gap-4 text-sm"><span><b>{ts.length}</b>{e.capacity ? `/${e.capacity}` : ""} vé</span><span><b>{ins}</b> đã check-in</span></div>
              </button>
            );
          })}
        </div>
      )}
      {creating && <CreateDialog tenantId={tenantId!} projects={q.data.projects} onClose={() => setCreating(false)} onDone={refresh} />}
      {ev && <EventDialog tenantId={tenantId!} event={ev} tickets={tickets.filter((t: any) => t.event_id === ev.id)} leads={q.data.leads} onClose={() => setSelected(null)} onDone={refresh} />}
      {scan && <ScanDialog tenantId={tenantId!} onClose={() => { setScan(false); refresh(); }} />}
    </div>
  );
}

function CreateDialog({ tenantId, projects, onClose, onDone }: any) {
  const save = useServerFn(saveEvent);
  const [f, setF] = useState({ title: "", kind: "launch", projectId: "", location: "", startsAt: "", capacity: "", description: "" });
  const m = useMutation({
    mutationFn: () => save({ data: { tenantId, title: f.title, kind: f.kind as any, projectId: f.projectId || null, location: f.location || null, startsAt: f.startsAt, capacity: f.capacity ? Number(f.capacity) : null, description: f.description || null } }),
    onSuccess: () => { toast.success("Đã tạo sự kiện"); onDone(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent><DialogHeader><DialogTitle>Tạo sự kiện</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="et">Tên sự kiện</Label><Input id="et" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Lễ mở bán Aurora Green Bay" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Loại</Label><Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(KINDS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Dự án</Label><Select value={f.projectId} onValueChange={(v) => setF({ ...f, projectId: v })}><SelectTrigger className="h-10"><SelectValue placeholder="Chọn" /></SelectTrigger><SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="es">Thời gian</Label><Input id="es" type="datetime-local" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ec">Số chỗ</Label><Input id="ec" type="number" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="el">Địa điểm</Label><Input id="el" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ed">Mô tả</Label><Textarea id="ed" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <Button className="h-10 w-full" disabled={!f.title || !f.startsAt || m.isPending} onClick={() => m.mutate()}>Tạo sự kiện</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventDialog({ tenantId, event, tickets, leads, onClose, onDone }: any) {
  const invite = useServerFn(inviteGuest);
  const [leadId, setLeadId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [show, setShow] = useState<any>(null);
  const m = useMutation({
    mutationFn: () => invite({ data: { tenantId, eventId: event.id, leadId: leadId || null, name, phone: phone || null } }),
    onSuccess: () => { toast.success("Đã phát vé"); setLeadId(""); setName(""); setPhone(""); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const pickLead = (id: string) => {
    const l = leads.find((x: any) => x.id === id);
    setLeadId(id); setName(l?.full_name ?? ""); setPhone(l?.phone ?? "");
  };
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{event.title}</DialogTitle></DialogHeader>
        <div className="space-y-3 rounded-xl border border-border p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium"><UserPlus className="h-4 w-4" />Mời khách</p>
          <Select value={leadId} onValueChange={pickLead}><SelectTrigger className="h-10"><SelectValue placeholder="Chọn khách có sẵn (tuỳ chọn)" /></SelectTrigger>
            <SelectContent>{leads.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.full_name || l.phone || "Khách"} {l.phone ? `· ${l.phone}` : ""}</SelectItem>)}</SelectContent></Select>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label htmlFor="gn">Tên khách</Label><Input id="gn" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="gp">Số điện thoại</Label><Input id="gp" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <Button className="h-10 w-full" disabled={!name || m.isPending} onClick={() => m.mutate()}>Phát vé QR</Button>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><Users className="h-4 w-4" />Khách mời ({tickets.length})</p>
          <div className="divide-y divide-border">
            {tickets.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.guest_name}</p><p className="text-xs text-muted-foreground">{t.guest_phone ?? ""} · {t.code}</p></div>
                <Badge variant={t.status === "checked_in" ? "default" : "secondary"}>{t.status === "checked_in" ? "Đã đến" : "Đã mời"}</Badge>
                <Button size="icon" variant="ghost" aria-label="Xem vé QR" onClick={() => setShow(t)}><QrIcon className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
        {show && (
          <div className="rounded-xl border border-border p-4 text-center">
            <p className="mb-2 text-sm font-medium">Vé của {show.guest_name}</p>
            <div className="flex justify-center"><QrCode value={`${origin}/events?ticket=${show.code}`} size={200} filename={`ve-${show.code}`} /></div>
            <p className="mt-2 font-mono text-lg tracking-widest">{show.code}</p>
            <p className="text-xs text-muted-foreground">Gửi ảnh vé này cho khách qua Zalo; lễ tân quét để check-in.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScanDialog({ tenantId, onClose }: any) {
  const check = useServerFn(checkInTicket);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [camOk, setCamOk] = useState<boolean | null>(null);
  const busy = useRef(false);

  const submit = async (c: string) => {
    if (busy.current || !c) return;
    busy.current = true;
    try {
      const r = await check({ data: { tenantId, code: c } });
      setResult(r);
      if (r.ok) toast.success(r.already ? `${r.guest} đã check-in trước đó` : `Chào mừng ${r.guest}`);
      else toast.error(r.message);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTimeout(() => (busy.current = false), 1500);
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: any;
    const BD = (window as any).BarcodeDetector;
    if (!BD || !navigator.mediaDevices) { setCamOk(false); return; }
    const detector = new BD({ formats: ["qr_code"] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((s) => {
      stream = s;
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
      setCamOk(true);
      timer = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) submit(codes[0].rawValue);
        } catch { /* bỏ qua khung hình lỗi */ }
      }, 600);
    }).catch(() => setCamOk(false));
    return () => { clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent><DialogHeader><DialogTitle>Check-in khách</DialogTitle></DialogHeader>
        {camOk !== false && <video ref={videoRef} className="aspect-square w-full rounded-xl bg-muted object-cover" muted playsInline />}
        {camOk === false && <p className="text-sm text-muted-foreground">Máy này chưa quét QR trực tiếp được — nhập mã trên vé.</p>}
        <div className="flex gap-2">
          <Input aria-label="Mã vé" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Mã vé 8 ký tự" className="h-11" />
          <Button className="h-11" onClick={() => submit(code)}>Check-in</Button>
        </div>
        {result && (
          <div className={["rounded-xl p-3 text-sm", result.ok ? "bg-primary/10" : "bg-destructive/10 text-destructive"].join(" ")}>
            {result.ok ? <><b>{result.guest}</b> — {result.eventTitle}{result.already ? " (đã check-in trước đó)" : ""}</> : result.message}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
