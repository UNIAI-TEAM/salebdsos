import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus, Pencil, RefreshCw, ShieldCheck, Pause, Play, Unplug, KeyRound, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChannelGlyph } from "@/components/app/channel-glyph";
import { OA_STATUS_LABEL } from "@/lib/zalo-oa";
import { authorizeZaloOa, checkZaloOa, createZaloOa, disconnectZaloOa, importLegacyZalo, listZaloOas, saveZaloOaTokens, updateZaloOa, zaloOaLogs } from "@/lib/zalo-oa.functions";

const T = {
  title: "Danh sách Zalo OA",
  intro: "Kết nối nhiều OA (mỗi dự án, chi nhánh hoặc đại lý một OA). Khóa được mã hóa, chỉ máy chủ đọc, không hiển thị lại.",
  add: "Thêm OA", empty: "Chưa có OA nào.", legacy: "Có cấu hình Zalo OA cũ (OA {id}). Chuyển vào danh sách để quản lý chung, hội thoại cũ giữ nguyên.",
  importLegacy: "Chuyển vào danh sách", authorize: "Cấp quyền", reauthorize: "Cấp quyền lại", check: "Kiểm tra kết nối",
  pause: "Tạm dừng", resume: "Bật lại", disconnect: "Ngắt kết nối", manual: "Nhập token tay", logs: "Nhật ký",
  confirmDisconnect: "Ngắt kết nối OA này? Token bị xóa, hội thoại cũ vẫn giữ và chỉ đọc.",
  webhook: "Webhook của OA (dán vào ứng dụng Zalo)", redirect: "Callback URL cấp quyền (khai báo một lần trong ứng dụng Zalo)",
  project: "Dự án gắn kèm", noProject: "Không gắn dự án", convs: "hội thoại", lastWebhook: "Tin gần nhất", never: "chưa có",
  tokenUntil: "Refresh token hết hạn", edit: "Sửa cấu hình",
  configureHint: "Cấu hình (cấp quyền, webhook, dự án, kiểm tra kết nối) nằm trong Hộp thoại đa kênh → Kênh liên lạc.",
  openConfigure: "Cấu hình trong Hộp thoại",
};

type Project = { id: string; name: string };
const statusVariant = (s: string) => (s === "connected" ? "secondary" : s === "paused" || s === "pending" ? "outline" : "destructive") as "secondary" | "outline" | "destructive";
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("vi-VN") : T.never);
const copy = (v: string) => navigator.clipboard.writeText(v).then(() => toast.success("Đã sao chép"));

export function ZaloOaManager({ tenantId, projects, mode = "configure" }: { tenantId: string; projects: Project[]; mode?: "add" | "configure" }) {
  const configure = mode === "configure";
  const qc = useQueryClient();
  const list = useServerFn(listZaloOas), create = useServerFn(createZaloOa), update = useServerFn(updateZaloOa);
  const authorize = useServerFn(authorizeZaloOa), check = useServerFn(checkZaloOa), disconnect = useServerFn(disconnectZaloOa);
  const importLegacy = useServerFn(importLegacyZalo), saveTokens = useServerFn(saveZaloOaTokens);
  const q = useQuery({ queryKey: ["zalo-oas", tenantId], queryFn: () => list({ data: { tenantId } }), enabled: !!tenantId });
  const [adding, setAdding] = useState(false), [manualId, setManualId] = useState<string | null>(null), [logsId, setLogsId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null), [editId, setEditId] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["zalo-oas", tenantId] });
  async function act(key: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); refresh(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  const d = q.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{T.intro}{!configure && <> {T.configureHint}</>}</p>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1 h-4 w-4" />{T.add}</Button>
      </div>
      {!configure && <Button asChild size="sm" variant="outline"><Link to="/inbox" search={{ settings: "1" } as never}>{T.openConfigure}</Link></Button>}
      {d && configure && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{T.redirect}</Label>
          <div className="flex gap-2"><Input readOnly value={d.redirectUri} className="font-mono text-xs" /><Button size="icon" variant="outline" aria-label="Sao chép" onClick={() => copy(d.redirectUri)}><Copy className="h-4 w-4" /></Button></div>
        </div>
      )}
      {d?.legacyOaId && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <span>{T.legacy.replace("{id}", d.legacyOaId)}</span>
          <Button size="sm" variant="outline" disabled={busy === "legacy"} onClick={() => act("legacy", () => importLegacy({ data: { tenantId } }), "Đã chuyển OA cũ — bấm Cấp quyền để làm mới token")}>{T.importLegacy}</Button>
        </div>
      )}
      {q.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
      {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
      {d && d.accounts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{T.empty}</p>}
      <ul className={configure ? "grid gap-3" : "grid gap-3 lg:grid-cols-2"}>
        {d?.accounts.map((a) => (
          <li key={a.id} className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              {a.avatarUrl ? <img src={a.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-muted"><ChannelGlyph channel="zalo" /></div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="truncate font-medium">{a.name || "Zalo OA"}</p><Badge variant={statusVariant(a.displayStatus)}>{OA_STATUS_LABEL[a.displayStatus]}</Badge></div>
                <p className="text-xs text-muted-foreground">OA {a.oaId} · {a.conversations} {T.convs} · {T.lastWebhook}: {fmt(a.lastWebhookAt)}</p>
                {a.refreshExpiresAt && <p className="text-xs text-muted-foreground">{T.tokenUntil}: {fmt(a.refreshExpiresAt)}</p>}
                {a.lastError && <p className="text-xs text-destructive">{a.lastError}</p>}
              </div>
            </div>
            {configure && a.status !== "disconnected" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{T.webhook}</Label>
                  <div className="flex gap-2"><Input readOnly value={a.webhookUrl} className="font-mono text-xs" /><Button size="icon" variant="outline" aria-label="Sao chép" onClick={() => copy(a.webhookUrl)}><Copy className="h-4 w-4" /></Button></div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{T.project}</Label>
                  <Select value={a.projectId ?? "none"} onValueChange={(v) => act("p" + a.id, () => update({ data: { tenantId, id: a.id, projectId: v === "none" ? null : v } }), "Đã lưu dự án — chỉ áp dụng cho khách mới")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">{T.noProject}</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy === "a" + a.id} onClick={() => act("a" + a.id, async () => { const r = await authorize({ data: { tenantId, id: a.id } }); window.open(r.url, "_blank", "noopener"); })}><ShieldCheck className="mr-1 h-4 w-4" />{a.hasTokens ? T.reauthorize : T.authorize}</Button>
                  <Button size="sm" variant="outline" disabled={!a.hasTokens || busy === "c" + a.id} onClick={() => act("c" + a.id, async () => { const r = await check({ data: { tenantId, id: a.id } }); r.ok ? toast.success("Kết nối hoạt động") : toast.warning(r.error ?? "Chưa xác minh được"); })}><RefreshCw className="mr-1 h-4 w-4" />{T.check}</Button>
                  {a.status === "connected" && <Button size="sm" variant="outline" onClick={() => act("s" + a.id, () => update({ data: { tenantId, id: a.id, paused: true } }), "Đã tạm dừng tự động hóa")}><Pause className="mr-1 h-4 w-4" />{T.pause}</Button>}
                  {a.status === "paused" && <Button size="sm" variant="outline" onClick={() => act("s" + a.id, () => update({ data: { tenantId, id: a.id, paused: false } }), "Đã bật lại")}><Play className="mr-1 h-4 w-4" />{T.resume}</Button>}
                  <Button size="sm" variant="outline" onClick={() => setEditId(a.id)}><Pencil className="mr-1 h-4 w-4" />{T.edit}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setManualId(a.id)}><KeyRound className="mr-1 h-4 w-4" />{T.manual}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setLogsId(a.id)}><History className="mr-1 h-4 w-4" />{T.logs}</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(T.confirmDisconnect) && act("d" + a.id, () => disconnect({ data: { tenantId, id: a.id } }), "Đã ngắt kết nối")}><Unplug className="mr-1 h-4 w-4" />{T.disconnect}</Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {adding && <AddDialog tenantId={tenantId} projects={projects} apps={(d?.accounts ?? []).filter((a) => a.status !== "disconnected")} onClose={() => setAdding(false)} onSaved={refresh} create={create} />}
      {manualId && <ManualDialog onClose={() => setManualId(null)} onSave={(accessToken, refreshToken) => act("m", () => saveTokens({ data: { tenantId, id: manualId, accessToken, refreshToken } }), "Đã lưu token").then(() => setManualId(null))} />}
      {editId && (() => { const acc = d?.accounts.find((x) => x.id === editId); return acc ? <EditDialog name={acc.name ?? ""} oaId={acc.oaId} onClose={() => setEditId(null)} onSave={(name, appSecret) => act("e", () => update({ data: { tenantId, id: acc.id, name, ...(appSecret ? { appSecret } : {}) } }), "Đã lưu cấu hình").then(() => setEditId(null))} /> : null; })()}
      {logsId && <LogsDialog tenantId={tenantId} id={logsId} onClose={() => setLogsId(null)} />}
    </div>
  );
}

function AddDialog({ tenantId, projects, apps, onClose, onSaved, create }: { tenantId: string; projects: Project[]; apps: { id: string; appId: string; name: string }[]; onClose: () => void; onSaved: () => void; create: ReturnType<typeof useServerFn<typeof createZaloOa>> }) {
  const [f, setF] = useState({ name: "", oaId: "", appId: "", appSecret: "", reuseFromId: "", projectId: "" });
  const [busy, setBusy] = useState(false);
  const reuse = Boolean(f.reuseFromId);
  async function save() {
    setBusy(true);
    try {
      await create({ data: { tenantId, name: f.name, oaId: f.oaId, ...(reuse ? { reuseFromId: f.reuseFromId } : { appId: f.appId, appSecret: f.appSecret }), projectId: f.projectId || null } });
      toast.success("Đã thêm OA — bấm Cấp quyền để kết nối"); onSaved(); onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const uniqueApps = [...new Map(apps.map((a) => [a.appId, a])).values()];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Thêm Zalo OA</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Tên hiển thị</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="VD: OA Dự án Aurora" /></div>
          <div className="space-y-1"><Label>OA ID</Label><Input inputMode="numeric" value={f.oaId} onChange={(e) => setF({ ...f, oaId: e.target.value.replace(/\D/g, "") })} /></div>
          {uniqueApps.length > 0 && (
            <div className="space-y-1"><Label>Ứng dụng Zalo</Label>
              <Select value={f.reuseFromId || "new"} onValueChange={(v) => setF({ ...f, reuseFromId: v === "new" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="new">Ứng dụng mới (nhập App ID/Secret)</SelectItem>{uniqueApps.map((a) => <SelectItem key={a.id} value={a.id}>Dùng chung App {a.appId}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {!reuse && <>
            <div className="space-y-1"><Label>App ID</Label><Input inputMode="numeric" value={f.appId} onChange={(e) => setF({ ...f, appId: e.target.value.replace(/\D/g, "") })} /></div>
            <div className="space-y-1"><Label>Secret Key (OA Secret Key của ứng dụng)</Label><Input type="password" autoComplete="off" value={f.appSecret} onChange={(e) => setF({ ...f, appSecret: e.target.value })} /></div>
          </>}
          <div className="space-y-1"><Label>{T.project}</Label>
            <Select value={f.projectId || "none"} onValueChange={(v) => setF({ ...f, projectId: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">{T.noProject}</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Hủy</Button><Button disabled={busy || !f.name || !f.oaId || (!reuse && (!f.appId || f.appSecret.length < 10))} onClick={save}>Lưu</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ name, oaId, onClose, onSave }: { name: string; oaId: string; onClose: () => void; onSave: (name: string, appSecret: string) => void }) {
  const [n, setN] = useState(name), [sec, setSec] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{T.edit} · OA {oaId}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Tên hiển thị</Label><Input value={n} onChange={(e) => setN(e.target.value)} /></div>
          <div className="space-y-1"><Label>Secret Key mới (để trống nếu giữ nguyên)</Label><Input type="password" autoComplete="off" value={sec} onChange={(e) => setSec(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Hủy</Button><Button disabled={!n.trim() || (sec.length > 0 && sec.length < 10)} onClick={() => onSave(n.trim(), sec.trim())}>Lưu</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualDialog({ onClose, onSave }: { onClose: () => void; onSave: (a: string, r: string) => void }) {
  const [a, setA] = useState(""), [r, setR] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nhập token tay</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Chỉ dùng khi không cấp quyền được. Token được kiểm tra với OA trước khi lưu và không hiển thị lại.</p>
        <div className="space-y-1"><Label>Access Token</Label><Input type="password" autoComplete="off" value={a} onChange={(e) => setA(e.target.value)} /></div>
        <div className="space-y-1"><Label>Refresh Token</Label><Input type="password" autoComplete="off" value={r} onChange={(e) => setR(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Hủy</Button><Button disabled={a.length < 20 || r.length < 20} onClick={() => onSave(a.trim(), r.trim())}>Lưu</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ACTION_LABEL: Record<string, string> = { created: "Thêm OA", updated: "Sửa cấu hình", oauth_started: "Bắt đầu cấp quyền", oauth_connected: "Cấp quyền thành công", tokens_saved: "Nhập token", refresh_failed: "Làm mới token thất bại", disconnected: "Ngắt kết nối", imported_legacy: "Chuyển từ cấu hình cũ" };

function LogsDialog({ tenantId, id, onClose }: { tenantId: string; id: string; onClose: () => void }) {
  const fn = useServerFn(zaloOaLogs);
  const q = useQuery({ queryKey: ["zalo-oa-logs", id], queryFn: () => fn({ data: { tenantId, id } }) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nhật ký OA</DialogTitle></DialogHeader>
        <h4 className="text-sm font-medium">Webhook gần nhất</h4>
        {q.data?.logs.length === 0 && <p className="text-sm text-muted-foreground">Chưa nhận sự kiện nào.</p>}
        <ul className="space-y-1 text-xs">{q.data?.logs.map((l, i) => <li key={i} className="flex justify-between gap-2"><span className={l.ok ? "" : "text-destructive"}>{l.event_name || "—"} {l.detail ? `· ${l.detail}` : ""}</span><span className="shrink-0 text-muted-foreground">{fmt(l.created_at)}</span></li>)}</ul>
        <h4 className="pt-2 text-sm font-medium">Thao tác</h4>
        <ul className="space-y-1 text-xs">{q.data?.audits.map((l, i) => <li key={i} className="flex justify-between gap-2"><span>{ACTION_LABEL[l.action] ?? l.action}</span><span className="shrink-0 text-muted-foreground">{fmt(l.created_at)}</span></li>)}</ul>
      </DialogContent>
    </Dialog>
  );
}
