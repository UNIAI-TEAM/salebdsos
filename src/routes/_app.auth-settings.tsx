import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Plus, X, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAuthSettings, updateAuthSettings } from "@/lib/auth-settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/auth-settings")({
  component: AuthSettingsPage,
});

function AuthSettingsPage() {
  const { isPlatformAdmin, loading } = useAuth();
  const nav = useNavigate();
  const fetchSettings = useServerFn(getAuthSettings);
  const saveSettings = useServerFn(updateAuthSettings);

  const [domains, setDomains] = useState<string[]>([]);
  const [enforce, setEnforce] = useState(false);
  const [mode, setMode] = useState<"managed" | "custom">("managed");
  const [newDomain, setNewDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isPlatformAdmin) {
      nav({ to: "/dashboard", replace: true });
      return;
    }
    fetchSettings()
      .then((s) => {
        setDomains(s.allowed_email_domains ?? []);
        setEnforce(!!s.enforce_domain_allowlist);
        setMode((s.google_oauth_mode as any) ?? "managed");
        setLoaded(true);
      })
      .catch((e) => toast.error(e.message));
  }, [isPlatformAdmin, loading]);

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase().replace(/^@/, "");
    if (!d) return;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) {
      toast.error("Domain không hợp lệ");
      return;
    }
    if (domains.includes(d)) return;
    setDomains([...domains, d]);
    setNewDomain("");
  };

  const removeDomain = (d: string) => setDomains(domains.filter((x) => x !== d));

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSettings({
        data: {
          allowed_email_domains: domains,
          google_oauth_mode: mode,
          enforce_domain_allowlist: enforce,
        },
      });
      toast.success("Đã lưu cài đặt xác thực");
    } catch (e: any) {
      toast.error(e.message ?? "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <div className="p-8 text-sm text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      <header>
        <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4" /> Bảo mật nền tảng
        </div>
        <h1 className="mt-1 text-2xl font-bold">Cài đặt xác thực</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý domain email được phép đăng nhập và chế độ Google OAuth.
        </p>
      </header>

      {/* Google OAuth */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Google OAuth</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Mặc định dùng credentials managed của Lovable Cloud. Chọn "Tự cấu hình" nếu bạn dùng Client ID/Secret riêng.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(["managed", "custom"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-left rounded-lg border p-3 transition ${
                mode === m ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              }`}
            >
              <div className="text-sm font-semibold">
                {m === "managed" ? "Lovable Managed" : "Tự cấu hình (BYOK)"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {m === "managed"
                  ? "Không cần thiết lập — dùng ngay"
                  : "Dùng Google Client ID/Secret riêng cho branding"}
              </div>
            </button>
          ))}
        </div>
        {mode === "custom" && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            Cấu hình Client ID/Secret tại Lovable Cloud → Users → Authentication Settings → Google.
          </p>
        )}
      </section>

      {/* Domain allowlist */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Domain email allowlist</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Chỉ cho phép đăng nhập với email thuộc các domain dưới đây. Áp dụng cho cả Google và email/password.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch id="enforce" checked={enforce} onCheckedChange={setEnforce} />
            <Label htmlFor="enforce" className="text-sm">Bật giới hạn</Label>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDomain())}
            placeholder="vd: congty.vn"
            className="flex-1"
          />
          <Button onClick={addDomain} variant="secondary">
            <Plus className="h-4 w-4 mr-1" /> Thêm
          </Button>
        </div>

        <ul className="mt-4 flex flex-wrap gap-2">
          {domains.length === 0 && (
            <li className="text-xs text-muted-foreground italic">Chưa có domain nào.</li>
          )}
          {domains.map((d) => (
            <li
              key={d}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm"
            >
              @{d}
              <button onClick={() => removeDomain(d)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>

        {enforce && domains.length === 0 && (
          <p className="mt-3 text-xs text-destructive">
            ⚠ Đang bật giới hạn nhưng chưa có domain — sẽ chặn toàn bộ đăng nhập.
          </p>
        )}
      </section>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1.5" /> {saving ? "Đang lưu..." : "Lưu cài đặt"}
        </Button>
      </div>
    </div>
  );
}
