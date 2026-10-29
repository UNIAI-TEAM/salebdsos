import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, KeyRound, Save, Facebook, MessageCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getIntegrations, rotatePortalKey, saveIntegrations } from "@/lib/integrations.functions";
import { PORTALS } from "@/lib/integrations";
import { FacebookCredentials } from "@/components/app/facebook-credentials";
import { ZaloOaManager } from "@/components/app/zalo-oa-manager";
import { TenantEmailSettings } from "@/components/app/tenant-email-settings";

export const Route = createFileRoute("/_app/integrations")({
  head: () => ({
    meta: [
      { title: "Tích hợp kênh khách hàng — SaleBDS OS" },
      { name: "description", content: "Nhận khách tự động từ Zalo OA, Facebook Lead Ads và portal bất động sản vào giỏ hàng." },
      { property: "og:title", content: "Tích hợp kênh khách hàng — SaleBDS OS" },
      { property: "og:description", content: "Kết nối Zalo OA, Facebook Lead Ads, portal BĐS: khách tự vào hệ thống và giỏ hàng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrationsPage,
});

const SOURCE_LABEL = (s: string) =>
  s === "zalo_oa" ? "Zalo OA" : s === "facebook_lead_ads" ? "Facebook" : PORTALS.find((p) => `portal:${p.value}` === s)?.label ?? s.replace("portal:", "");

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex min-w-0 items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs">{value}</code>
        <Button size="icon" variant="outline" className="shrink-0" onClick={() => { navigator.clipboard.writeText(value); toast.success("Đã sao chép"); }}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function IntegrationsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id ?? "";
  const qc = useQueryClient();
  const fetchFn = useServerFn(getIntegrations);
  const saveFn = useServerFn(saveIntegrations);
  const rotateFn = useServerFn(rotatePortalKey);
  const q = useQuery({ queryKey: ["integrations", tenantId], queryFn: () => fetchFn({ data: { tenantId } }), enabled: !!tenantId });
  const [origin, setOrigin] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    defaultProjectId: null as string | null,
    portalEnabled: false,
    facebookEnabled: false,
    facebookPageId: "",
    formProjects: {} as Record<string, string>,
    zaloLeadFromChat: true,
  });
  const [formIdDraft, setFormIdDraft] = useState("");
  const [formProjDraft, setFormProjDraft] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    const c = q.data?.config;
    if (!c) return;
    setForm({
      defaultProjectId: c.defaultProjectId,
      portalEnabled: c.portal.enabled,
      facebookEnabled: c.facebook.enabled,
      facebookPageId: c.facebook.pageId ?? "",
      formProjects: c.facebook.formProjects,
      zaloLeadFromChat: c.zalo.leadFromChat,
    });
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { tenantId, ...form, facebookPageId: form.facebookPageId || null } }),
    onSuccess: () => { toast.success("Đã lưu cấu hình tích hợp"); qc.invalidateQueries({ queryKey: ["integrations", tenantId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rotate = useMutation({
    mutationFn: () => rotateFn({ data: { tenantId } }),
    onSuccess: (r) => { setNewKey(r.key); qc.invalidateQueries({ queryKey: ["integrations", tenantId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">Đang tải…</p>;
  if (q.isError) return <p className="py-10 text-center text-sm text-destructive">{(q.error as Error).message}</p>;
  const d = q.data!;
  const projects = d.projects as { id: string; name: string }[];
  const portalUrl = `${origin}/api/public/integrations/portal`;
  const sample = JSON.stringify({ portal: "batdongsan", name: "Nguyễn Văn A", phone: "0901234567", project_name: projects[0]?.name ?? "Tên dự án", product_code: "A-5.01", budget: "3 tỷ", note: "Xem căn 2PN" }, null, 2);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tích hợp kênh khách hàng"
        sub="Khách gửi thông tin từ Zalo OA, Facebook Lead Ads hay portal BĐS sẽ tự vào hệ thống, chia Sale và vào giỏ hàng khi có mã căn."
        action={<Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />Lưu</Button>}
      />

      {tenantId && <TenantEmailSettings key={tenantId} tenantId={tenantId} />}

      <SectionCard title="Dự án mặc định">
        <p className="mb-3 text-sm text-muted-foreground">Dùng khi kênh ngoài không gửi kèm tên dự án.</p>
        <Select value={form.defaultProjectId ?? "none"} onValueChange={(v) => setForm({ ...form, defaultProjectId: v === "none" ? null : v })}>
          <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Không gắn dự án</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </SectionCard>

      <SectionCard title="Portal bất động sản & CRM ngoài">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2"><Building2 className="h-5 w-5 shrink-0 text-primary" /><span className="text-sm">Nhận khách qua API</span></div>
            <Switch checked={form.portalEnabled} onCheckedChange={(v) => setForm({ ...form, portalEnabled: v })} />
          </div>
          <CopyRow label="Địa chỉ API (POST)" value={portalUrl} />
          <div className="flex flex-wrap items-center gap-2">
            {d.config.portal.keyHash ? <Badge variant="secondary">Khoá đang dùng ••••{d.config.portal.keyHint}</Badge> : <Badge variant="outline">Chưa có khoá</Badge>}
            <Button variant="outline" size="sm" onClick={() => rotate.mutate()} disabled={rotate.isPending}>
              <KeyRound className="mr-2 h-4 w-4" />{d.config.portal.keyHash ? "Tạo khoá mới (khoá cũ ngừng chạy)" : "Tạo khoá API"}
            </Button>
          </div>
          {newKey && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
              <p className="mb-2 text-xs font-medium text-primary">Sao chép khoá ngay — khoá chỉ hiện một lần.</p>
              <CopyRow label="Header x-api-key" value={newKey} />
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Dữ liệu mẫu gửi lên (JSON, có thể gửi {"{ leads: [...] }"} tối đa 50 khách)</Label>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-3 text-xs">{sample}</pre>
            <p className="mt-2 text-xs text-muted-foreground">
              Hỗ trợ: {PORTALS.map((p) => p.label).join(", ")}. Có mã căn trùng giỏ hàng → khách vào giỏ hàng ngay. Khách trùng số điện thoại được gộp, không tạo trùng.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Facebook Lead Ads">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2"><Facebook className="h-5 w-5 shrink-0 text-primary" /><span className="text-sm">Nhận khách từ form quảng cáo</span></div>
            <div className="flex items-center gap-2">
              <Badge variant={d.env.facebook ? "secondary" : "outline"}>{d.env.facebook ? "Đã có khoá ứng dụng" : "Chưa có khoá"}</Badge>
              <Switch checked={form.facebookEnabled} onCheckedChange={(v) => setForm({ ...form, facebookEnabled: v })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">ID Fanpage</Label>
            <Input value={form.facebookPageId} inputMode="numeric" placeholder="VD: 1029384756" onChange={(e) => setForm({ ...form, facebookPageId: e.target.value.replace(/\D/g, "") })} className="max-w-md" />
          </div>
          {tenantId && <FacebookCredentials tenantId={tenantId} />}
          <CopyRow label="Callback URL" value={`${origin}/api/public/integrations/facebook`} />
          {d.config.facebook.verifyToken ? (
            <CopyRow label="Verify token" value={d.config.facebook.verifyToken} />
          ) : (
            <p className="text-xs text-muted-foreground">Bấm Lưu để tạo verify token.</p>
          )}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Gắn form quảng cáo với dự án</Label>
            {Object.entries(form.formProjects).map(([fid, pid]) => (
              <div key={fid} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="min-w-0 truncate">Form {fid} → {projects.find((p) => p.id === pid)?.name ?? "?"}</span>
                <Button size="sm" variant="ghost" onClick={() => { const n = { ...form.formProjects }; delete n[fid]; setForm({ ...form, formProjects: n }); }}>Xoá</Button>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input placeholder="ID form" inputMode="numeric" value={formIdDraft} onChange={(e) => setFormIdDraft(e.target.value.replace(/\D/g, ""))} />
              <Select value={formProjDraft} onValueChange={setFormProjDraft}>
                <SelectTrigger><SelectValue placeholder="Chọn dự án" /></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" disabled={!formIdDraft || !formProjDraft} onClick={() => { setForm({ ...form, formProjects: { ...form.formProjects, [formIdDraft]: formProjDraft } }); setFormIdDraft(""); setFormProjDraft(""); }}>Thêm</Button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Zalo OA">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2"><MessageCircle className="h-5 w-5 shrink-0 text-primary" /><span className="text-sm">Tự tạo khách khi khách nhắn kèm số điện thoại hoặc gửi form thông tin</span></div>
            <Switch checked={form.zaloLeadFromChat} onCheckedChange={(v) => setForm({ ...form, zaloLeadFromChat: v })} />
          </div>
          {tenantId && <ZaloOaManager tenantId={tenantId} projects={projects} />}
        </div>
      </SectionCard>

      <SectionCard title="Khách mới từ kênh ngoài">
        {(d.recent as any[]).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Chưa có khách nào từ kênh ngoài.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(d.recent as any[]).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.full_name ?? "Khách"} {l.phone ? `· ${l.phone}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{SOURCE_LABEL(l.source)} · {new Date(l.created_at).toLocaleString("vi-VN")}</p>
                </div>
                {["quoted", "deposit", "won"].includes(l.status) ? <Badge>Trong giỏ hàng</Badge> : <Badge variant="outline">Khách mới</Badge>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
