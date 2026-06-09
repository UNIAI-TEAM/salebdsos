import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { getPublicAllowlist } from "@/lib/auth-settings.functions";
import { listMyTenants } from "@/lib/auth.functions";
import { signInWithGoogleFlow, signInWithPasswordFlow } from "@/lib/auth-flows";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, Lock, User, ArrowRight, Building2 } from "lucide-react";

const ADMIN_ROLES = new Set(["platform_admin", "owner", "admin"]);

async function resolveRoleRedirect(fallback: string): Promise<string> {
  try {
    const r = await listMyTenants();
    if (r?.isPlatformAdmin) return "/dashboard";
    const roles = (r?.tenants ?? []).map((t: any) => t.role);
    if (roles.some((role: string) => ADMIN_ROLES.has(role))) return "/dashboard";
    if (roles.length > 0) return "/leads";
    return "/onboarding";
  } catch {
    return fallback;
  }
}

const search = z.object({ redirect: z.string().optional(), invite: z.string().optional() });

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: search,
});

function LoginPage() {
  const nav = useNavigate();
  const sp = useSearch({ from: "/login" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fetchAllowlist = useServerFn(getPublicAllowlist);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (mode === "signup" && !fullName.trim()) {
      nextErrors.fullName = "Vui lòng nhập họ tên";
    }
    if (!email.trim()) {
      nextErrors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Email không hợp lệ";
    }
    if (!password) {
      nextErrors.password = "Vui lòng nhập mật khẩu";
    } else if (password.length < 6) {
      nextErrors.password = "Mật khẩu ít nhất 6 ký tự";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validate();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true, fullName: true });
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "signup") {
        const gate = await signInWithPasswordFlow({
          email,
          password: "__noop__",
          fetchAllowlist,
          signInWithPassword: async () => ({ error: null }),
        });
        if (!gate.ok) throw new Error(gate.error);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Đăng ký thành công. Kiểm tra email để xác thực.");
        setMode("signin");
        setPassword("");
        setErrors({});
      } else {
        const res = await signInWithPasswordFlow({
          email,
          password,
          fetchAllowlist,
          signInWithPassword: (args) => supabase.auth.signInWithPassword(args).then((r) => ({ error: r.error })),
        });
        if (!res.ok) throw new Error(res.error);
        toast.success("Đăng nhập thành công");
        const fallback = sp.invite ? `/accept-invite/${sp.invite}` : sp.redirect ?? "/dashboard";
        const next = sp.invite || sp.redirect ? fallback : await resolveRoleRedirect(fallback);
        nav({ to: next, replace: true });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    const next = sp.invite ? `/accept-invite/${sp.invite}` : sp.redirect ?? "/dashboard";
    try {
      const res = await signInWithGoogleFlow({
        fetchAllowlist,
        signInWithOAuth: (provider, opts) => lovable.auth.signInWithOAuth(provider, opts),
        redirectUri: `${window.location.origin}${next}`,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Không thể đăng nhập Google");
        return;
      }
      if (res.redirected) return;
      nav({ to: next, replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Lỗi đăng nhập Google");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: brand + intro */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-brand-gradient text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none [background:radial-gradient(circle_at_20%_20%,white,transparent_45%),radial-gradient(circle_at_80%_70%,white,transparent_40%)]" />
        <Link to="/" className="relative inline-flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">SaleBDS OS</span>
        </Link>

        <div className="relative space-y-6 max-w-md">
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
            Điều hành kinh doanh BĐS bằng điểm chạm
          </h2>
          <p className="text-white/80 text-base leading-relaxed">
            Nền tảng NFC card · Dynamic QR · CRM · AI Follow-up · Lead Score —
            tất cả trong một workspace cho agency và sale BĐS.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              "Card NFC & QR cá nhân hóa cho từng sale",
              "CRM pipeline theo dự án, phân quyền theo team",
              "AI chấm điểm lead & gợi ý kịch bản chăm sóc",
              "Analytics điểm chạm, leaderboard theo thời gian thực",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/90 shrink-0" />
                <span className="text-white/85">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} SaleBDS OS — Unicom AI Software Factory
        </p>
      </aside>

      {/* Right: form */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <Link to="/" className="lg:hidden block text-center mb-8">
            <div className="inline-flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-brand-gradient flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">SaleBDS OS</span>
            </div>
          </Link>

          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-card">
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight">
                {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {mode === "signin" ? "Vào workspace BĐS của bạn" : "Tạo tài khoản & đăng ký agency"}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    Họ và tên
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => onBlur("fullName")}
                      className="h-11 pl-10 rounded-xl border-border bg-background text-sm transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      required
                    />
                  </div>
                  {touched.fullName && errors.fullName && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                      {errors.fullName}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => onBlur("email")}
                    className="h-11 pl-10 rounded-xl border-border bg-background text-sm transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    required
                  />
                </div>
                {touched.email && errors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => onBlur("password")}
                    className="h-11 pl-10 pr-10 rounded-xl border-border bg-background text-sm transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-0.5"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                    {errors.password}
                  </p>
                )}
              </div>

              {mode === "signin" && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer group">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                    />
                    <span className="group-hover:text-foreground transition-colors">Ghi nhớ đăng nhập</span>
                  </label>
                  <Link
                    to="/"
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info("Tính năng đang phát triển");
                    }}
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-soft hover:shadow-card transition-all disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </span>
                ) : mode === "signin" ? (
                  <span className="flex items-center justify-center gap-2">
                    Đăng nhập
                    <ArrowRight className="h-4 w-4" />
                  </span>
                ) : (
                  "Tạo tài khoản"
                )}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span className="uppercase tracking-wider font-medium">hoặc</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onGoogle}
              disabled={loading}
              className="w-full h-11 rounded-xl border-border bg-background text-sm font-medium hover:bg-muted transition-all"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                <path d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.2843H1.5166V17.3644C3.55371 21.5047 7.7029 24.0008 12.2401 24.0008Z" fill="#34A853" />
                <path d="M5.50253 14.2843C5.00205 12.8093 5.00205 11.196 5.50253 9.72099V6.64085H1.5166C-0.18551 10.0057 -0.18551 13.9996 1.5166 17.3644L5.50253 14.2843Z" fill="#FBBC05" />
                <path d="M12.2401 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.2401 0.000808666C7.7029 0.000808666 3.55371 2.49695 1.5166 6.64085L5.50253 9.72099C6.45053 6.86169 9.10947 4.74966 12.2401 4.74966Z" fill="#EA4335" />
              </svg>
              Tiếp tục với Google
            </Button>

            <div className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setErrors({});
                      setTouched({});
                    }}
                    className="text-primary font-semibold hover:underline transition-all"
                  >
                    Đăng ký
                  </button>
                </>
              ) : (
                <>
                  Đã có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setErrors({});
                      setTouched({});
                    }}
                    className="text-primary font-semibold hover:underline transition-all"
                  >
                    Đăng nhập
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
