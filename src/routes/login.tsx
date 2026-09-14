import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { getPublicAllowlist } from "@/lib/auth-settings.functions";
import { listMyTenants, registerAgency } from "@/lib/auth.functions";
import { signInWithGoogleFlow, signInWithPasswordFlow } from "@/lib/auth-flows";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, Lock, User, ArrowRight, Building2, Check, ShieldCheck, AlertCircle, Briefcase } from "lucide-react";

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

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

function LoginPage() {
  const nav = useNavigate();
  const sp = useSearch({ from: "/login" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fetchAllowlist = useServerFn(getPublicAllowlist);
  const register = useServerFn(registerAgency);

  const passwordStrength = (() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) s++;
    return s; // 0..4
  })();

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (mode === "signup") {
      if (!fullName.trim()) nextErrors.fullName = "Vui lòng nhập họ tên";
      if (!workspaceName.trim()) nextErrors.workspaceName = "Vui lòng nhập tên workspace";
      else if (workspaceName.trim().length < 2) nextErrors.workspaceName = "Tên workspace tối thiểu 2 ký tự";
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
    if (mode === "signup") {
      if (!confirmPassword) nextErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
      else if (confirmPassword !== password) nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
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
    setTouched({ email: true, password: true, fullName: true, confirmPassword: true, workspaceName: true });
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
        const slug = slugify(workspaceName);
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/verify-email?email=${encodeURIComponent(email)}`,
            data: {
              full_name: fullName,
              workspace_name: workspaceName,
              workspace_slug: slug,
            },
          },
        });
        if (error) throw error;

        // If session is returned immediately (email auto-confirm), create the workspace now.
        if (signUpData.session) {
          try {
            await register({ data: { name: workspaceName, slug } });
            toast.success("Đã tạo tài khoản & workspace");
            nav({ to: "/dashboard", replace: true });
            return;
          } catch (regErr: any) {
            toast.error(regErr.message ?? "Không thể tạo workspace, vào trang thiết lập...");
            nav({ to: "/onboarding", replace: true });
            return;
          }
        }

        // Email confirmation flow — stash workspace info for onboarding prefill, then route to verify page.
        try {
          sessionStorage.setItem("pending_workspace", JSON.stringify({ name: workspaceName, slug, email }));
        } catch {}
        toast.success("Đã gửi email xác thực. Vui lòng kiểm tra hộp thư.");
        nav({ to: "/verify-email", search: { email }, replace: true });

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

  const hasEmailError = touched.email && !!errors.email;
  const hasPasswordError = touched.password && !!errors.password;
  const hasNameError = touched.fullName && !!errors.fullName;
  const hasWorkspaceError = touched.workspaceName && !!errors.workspaceName;
  const hasConfirmError = touched.confirmPassword && !!errors.confirmPassword;

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      {/* Left: brand panel — Dark Luxury */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-16 text-foreground overflow-hidden bg-[linear-gradient(135deg,oklch(0.12_0.03_265)_0%,oklch(0.16_0.05_285)_55%,oklch(0.11_0.03_265)_100%)]">
        {/* ambient glows */}
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-[26rem] w-[26rem] rounded-full bg-accent opacity-15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:42px_42px]" />

        <Link to="/" className="relative inline-flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-2xl glass ring-1 ring-white/15 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <Building2 className="h-5 w-5 text-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">SaleBDS OS</span>
        </Link>

        <div className="relative space-y-7 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full glass ring-1 ring-white/15 px-3 py-1 text-xs font-medium text-foreground/90">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent)]" />
            Nền tảng số #1 cho Sale BĐS
          </div>
          <h2 className="text-3xl xl:text-[2.6rem] font-bold leading-[1.1] tracking-tight">
            Điều hành kinh doanh BĐS bằng <span className="text-gold-gradient">điểm chạm</span>.
          </h2>
          <p className="text-foreground/70 text-base leading-relaxed">
            NFC card · Dynamic QR · CRM · AI Follow-up · Lead Score — tất cả trong
            một workspace cho agency và sale BĐS.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              "Card NFC & QR cá nhân hóa cho từng sale",
              "CRM pipeline theo dự án, phân quyền theo team",
              "AI chấm điểm lead & gợi ý kịch bản chăm sóc",
              "Analytics điểm chạm theo thời gian thực",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-foreground/80">
                <span className="mt-0.5 h-5 w-5 rounded-md glass ring-1 ring-white/15 flex items-center justify-center">
                  <Check className="h-3 w-3 text-accent" />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-xs text-foreground/50">
          <span>© {new Date().getFullYear()} SaleBDS OS</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Bảo mật SOC 2 · Mã hoá AES-256
          </span>
        </div>
      </aside>

      {/* Right: form */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8 relative">
        {/* subtle dark ambient accents */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl opacity-70" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl opacity-60" />
        </div>

        <div className="relative w-full max-w-[440px]">
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-primary/20">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">SaleBDS OS</span>
          </Link>

          <div className="rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-7 sm:p-9 shadow-card">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 mb-7 rounded-xl bg-muted">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setErrors({});
                    setTouched({});
                  }}
                  className={`h-9 rounded-lg text-sm font-semibold transition-all ${
                    mode === m
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "signin" ? "Đăng nhập" : "Đăng ký"}
                </button>
              ))}
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {mode === "signin" ? "Chào mừng trở lại 👋" : "Bắt đầu hành trình"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {mode === "signin"
                  ? "Đăng nhập để vào workspace BĐS của bạn."
                  : "Tạo tài khoản & đăng ký agency của bạn."}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {mode === "signup" && (
                <Field
                  id="fullName"
                  label="Họ và tên"
                  icon={<User className="h-4 w-4" />}
                  error={hasNameError ? errors.fullName : undefined}
                >
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() => onBlur("fullName")}
                    disabled={loading}
                    className={inputCls(hasNameError)}
                    required
                  />
                </Field>
              )}

              {mode === "signup" && (
                <Field
                  id="workspaceName"
                  label="Tên workspace / Agency"
                  icon={<Briefcase className="h-4 w-4" />}
                  error={hasWorkspaceError ? errors.workspaceName : undefined}
                  hint={workspaceName ? `URL: salebds.vn/${slugify(workspaceName) || "..."}` : undefined}
                >
                  <Input
                    id="workspaceName"
                    type="text"
                    placeholder="ABC Real Estate"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onBlur={() => onBlur("workspaceName")}
                    disabled={loading}
                    className={inputCls(hasWorkspaceError)}
                    required
                  />
                </Field>
              )}

              <Field
                id="email"
                label="Email"
                icon={<Mail className="h-4 w-4" />}
                error={hasEmailError ? errors.email : undefined}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => onBlur("email")}
                  disabled={loading}
                  className={inputCls(hasEmailError)}
                  required
                />
              </Field>

              <Field
                id="password"
                label="Mật khẩu"
                icon={<Lock className="h-4 w-4" />}
                error={hasPasswordError ? errors.password : undefined}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              >
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tối thiểu 6 ký tự"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => onBlur("password")}
                  disabled={loading}
                  className={`${inputCls(hasPasswordError)} pr-11`}
                  required
                  minLength={6}
                />
              </Field>

              {mode === "signup" && password && (
                <div className="-mt-1 space-y-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < passwordStrength
                            ? passwordStrength <= 1
                              ? "bg-destructive"
                              : passwordStrength === 2
                              ? "bg-warning"
                              : passwordStrength === 3
                              ? "bg-success"
                              : "bg-success"
                            : "bg-muted-foreground/20"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {passwordStrength <= 1 && "Mật khẩu yếu — thêm chữ hoa, số hoặc ký tự đặc biệt."}
                    {passwordStrength === 2 && "Tạm ổn — nên dùng thêm ký tự đặc biệt."}
                    {passwordStrength === 3 && "Mạnh."}
                    {passwordStrength === 4 && "Rất mạnh ✓"}
                  </p>
                </div>
              )}

              {mode === "signup" && (
                <Field
                  id="confirmPassword"
                  label="Xác nhận mật khẩu"
                  icon={<Lock className="h-4 w-4" />}
                  error={hasConfirmError ? errors.confirmPassword : undefined}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      tabIndex={-1}
                      aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                >
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => onBlur("confirmPassword")}
                    disabled={loading}
                    className={`${inputCls(hasConfirmError)} pr-11`}
                    required
                    minLength={6}
                  />
                </Field>
              )}

              {mode === "signin" && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    Ghi nhớ đăng nhập
                  </label>
                  <button
                    type="button"
                    onClick={() => toast.info("Tính năng đang phát triển")}
                    className="text-sm font-semibold text-primary hover:text-primary-foreground/80 transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="group w-full h-12 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground text-sm font-semibold shadow-glow hover:shadow-[0_14px_36px_-12px_oklch(0.55_0.18_285/0.55)] hover:brightness-110 active:brightness-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === "signin" ? "Đang đăng nhập..." : "Đang tạo tài khoản..."}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-[11px] text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span className="uppercase tracking-[0.16em] font-semibold">hoặc tiếp tục với</span>
              <div className="h-px flex-1 bg-[#E2E8F0]" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onGoogle}
              disabled={loading}
              className="w-full h-11 rounded-xl border-border bg-card text-foreground text-sm font-medium hover:bg-muted hover:border-border transition-all"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                <path d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.2843H1.5166V17.3644C3.55371 21.5047 7.7029 24.0008 12.2401 24.0008Z" fill="#34A853" />
                <path d="M5.50253 14.2843C5.00205 12.8093 5.00205 11.196 5.50253 9.72099V6.64085H1.5166C-0.18551 10.0057 -0.18551 13.9996 1.5166 17.3644L5.50253 14.2843Z" fill="#FBBC05" />
                <path d="M12.2401 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.2401 0.000808666C7.7029 0.000808666 3.55371 2.49695 1.5166 6.64085L5.50253 9.72099C6.45053 6.86169 9.10947 4.74966 12.2401 4.74966Z" fill="#EA4335" />
              </svg>
              Tiếp tục với Google
            </Button>

            <p className="mt-6 text-center text-[11px] text-muted-foreground leading-relaxed">
              Bằng việc tiếp tục, bạn đồng ý với{" "}
              <span className="text-foreground/80 font-medium">Điều khoản</span> &{" "}
              <span className="text-foreground/80 font-medium">Chính sách bảo mật</span> của SaleBDS OS.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `h-11 pl-10 rounded-xl bg-input text-sm text-foreground placeholder:text-muted-foreground transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
    hasError
      ? "border-destructive focus-visible:ring-destructive/40"
      : "border-border focus-visible:ring-primary/40 focus-visible:border-primary"
  }`;
}

function Field({
  id,
  label,
  icon,
  error,
  rightSlot,
  hint,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  rightSlot?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium text-foreground/80">
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {icon}
        </span>
        {children}
        {rightSlot}
      </div>
      {error ? (
        <p className="text-xs text-destructive flex items-center gap-1.5 pt-0.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground pt-0.5">{hint}</p>
      ) : null}
    </div>
  );
}
