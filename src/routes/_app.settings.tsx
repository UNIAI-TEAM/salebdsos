import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { User, Bell, Palette, Briefcase, Save, RotateCcw, Loader2 } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  getSettings, updateSetting, resetSetting, type SettingKey, type SettingsMap,
} from "@/lib/settings.functions";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

const TABS: { key: SettingKey; label: string; icon: typeof User; desc: string }[] = [
  { key: "general", label: "Chung", icon: User, desc: "Tên workspace, múi giờ, ngôn ngữ, tiền tệ" },
  { key: "notifications", label: "Thông báo", icon: Bell, desc: "Kênh nhận & tần suất tổng hợp" },
  { key: "branding", label: "Thương hiệu", icon: Palette, desc: "Màu chính, logo, slogan" },
  { key: "business", label: "Kinh doanh", icon: Briefcase, desc: "Giờ làm việc & phân bổ lead" },
];

function SettingsPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();
  const fnGet = useServerFn(getSettings);
  const fnUpdate = useServerFn(updateSetting);
  const fnReset = useServerFn(resetSetting);

  const q = useQuery({
    queryKey: ["settings", tenantId],
    queryFn: () => fnGet({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["settings", tenantId] });

  const updateMut = useMutation({
    mutationFn: (input: { key: SettingKey; value: unknown }) =>
      fnUpdate({ data: { tenantId: tenantId!, key: input.key, value: input.value } }),
    onSuccess: () => { toast.success("Đã lưu cài đặt"); invalidate(); },
    onError: (e: Error) => toast.error(e.message || "Không lưu được"),
  });

  const resetMut = useMutation({
    mutationFn: (key: SettingKey) => fnReset({ data: { tenantId: tenantId!, key } }),
    onSuccess: () => { toast.success("Đã đặt lại mặc định"); invalidate(); },
    onError: (e: Error) => toast.error(e.message || "Không đặt lại được"),
  });

  const settings = q.data?.settings;

  return (
    <div className="space-y-6">
      <PageHeader title="Cài đặt" sub="Tuỳ chỉnh workspace và cách hệ thống vận hành." />

      {!tenantId ? (
        <SectionCard><div className="text-sm text-muted-foreground">Vui lòng chọn workspace.</div></SectionCard>
      ) : q.isLoading || !settings ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</div>
      ) : (
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="gap-2">
                <t.icon className="h-4 w-4" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t.key} value={t.key}>
              <SectionCard>
                <div className="mb-4">
                  <div className="text-[15px] font-semibold">{t.label}</div>
                  <div className="text-[12px] text-muted-foreground">{t.desc}</div>
                </div>
                <SettingForm
                  section={t.key}
                  values={settings}
                  saving={updateMut.isPending && updateMut.variables?.key === t.key}
                  resetting={resetMut.isPending && resetMut.variables === t.key}
                  onSave={(value) => updateMut.mutate({ key: t.key, value })}
                  onReset={() => resetMut.mutate(t.key)}
                />
              </SectionCard>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function SettingForm({
  section, values, saving, resetting, onSave, onReset,
}: {
  section: SettingKey;
  values: SettingsMap;
  saving: boolean;
  resetting: boolean;
  onSave: (value: unknown) => void;
  onReset: () => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(values[section] as Record<string, unknown>);
  useEffect(() => { setForm(values[section] as Record<string, unknown>); }, [section, values]);
  const set = (k: string, v: unknown) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(form); }}
      className="space-y-5"
    >
      {section === "general" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên workspace">
            <Input value={String(form.workspace_name ?? "")} maxLength={120}
              onChange={(e) => set("workspace_name", e.target.value)} placeholder="SaleBDS Demo" />
          </Field>
          <Field label="Múi giờ">
            <Input value={String(form.timezone ?? "")} maxLength={64}
              onChange={(e) => set("timezone", e.target.value)} placeholder="Asia/Ho_Chi_Minh" />
          </Field>
          <Field label="Ngôn ngữ">
            <Select value={String(form.locale ?? "vi")} onValueChange={(v) => set("locale", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vi">Tiếng Việt</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tiền tệ">
            <Select value={String(form.currency ?? "VND")} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VND">VND · Việt Nam Đồng</SelectItem>
                <SelectItem value="USD">USD · US Dollar</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {section === "notifications" && (
        <div className="space-y-3">
          <ToggleRow label="Email" desc="Nhận thông báo qua email"
            checked={!!form.email_enabled} onChange={(v) => set("email_enabled", v)} />
          <ToggleRow label="Push" desc="Thông báo đẩy trên trình duyệt / thiết bị"
            checked={!!form.push_enabled} onChange={(v) => set("push_enabled", v)} />
          <ToggleRow label="In-app" desc="Thông báo trong ứng dụng"
            checked={!!form.inapp_enabled} onChange={(v) => set("inapp_enabled", v)} />
          <Field label="Tần suất tổng hợp">
            <Select value={String(form.digest_frequency ?? "daily")} onValueChange={(v) => set("digest_frequency", v)}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Tắt</SelectItem>
                <SelectItem value="daily">Hàng ngày</SelectItem>
                <SelectItem value="weekly">Hàng tuần</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {section === "branding" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Màu chính (HEX)">
            <div className="flex items-center gap-2">
              <Input value={String(form.primary_color ?? "#2563EB")}
                onChange={(e) => set("primary_color", e.target.value)} placeholder="#2563EB" />
              <div className="h-9 w-9 rounded-md border" style={{ background: String(form.primary_color ?? "#2563EB") }} />
            </div>
          </Field>
          <Field label="Logo URL">
            <Input value={String(form.logo_url ?? "")} onChange={(e) => set("logo_url", e.target.value)}
              placeholder="https://…" />
          </Field>
          <Field label="Slogan" className="sm:col-span-2">
            <Input value={String(form.tagline ?? "")} maxLength={160}
              onChange={(e) => set("tagline", e.target.value)} placeholder="Điều hành kinh doanh bằng điểm chạm" />
          </Field>
        </div>
      )}

      {section === "business" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Giờ bắt đầu">
            <Input type="time" value={String(form.working_hours_start ?? "08:00")}
              onChange={(e) => set("working_hours_start", e.target.value)} />
          </Field>
          <Field label="Giờ kết thúc">
            <Input type="time" value={String(form.working_hours_end ?? "18:00")}
              onChange={(e) => set("working_hours_end", e.target.value)} />
          </Field>
          <Field label="Nguồn lead mặc định">
            <Input value={String(form.default_lead_source ?? "")} maxLength={64}
              onChange={(e) => set("default_lead_source", e.target.value)} placeholder="Website" />
          </Field>
          <ToggleRow label="Tự phân bổ lead"
            desc="Tự động chia lead mới cho nhân viên khi tạo"
            checked={!!form.lead_auto_assign} onChange={(v) => set("lead_auto_assign", v)} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="ghost" onClick={onReset} disabled={resetting}>
          {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Đặt lại mặc định
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-[12px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <div className="text-[14px] font-medium">{label}</div>
        <div className="text-[12px] text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
