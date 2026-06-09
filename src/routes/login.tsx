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
            emailRedirectTo: `${window.location.origin}/login`,
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

        // Email confirmation flow — stash workspace info for onboarding prefill.
        try {
          sessionStorage.setItem("pending_workspace", JSON.stringify({ name: workspaceName, slug }));
        } catch {}
        toast.success("Đăng ký thành công. Kiểm tra email để xác thực, sau đó đăng nhập để tạo workspace.");
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
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

  const hasEmailError = touched.email && !!errors.email;
  const hasPasswordError = touched.password && !!errors.password;
  const hasNameError = touched.fullName && !!errors.fullName;
  const hasWorkspaceError = touched.workspaceName && !!errors.workspaceName;
  const hasConfirmError = touched.confirmPassword && !!errors.confirmPassword;

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[#F8FAFC]">
      {/* Left: brand panel — Deep Indigo */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-16 text-white overflow-hidden bg-[#0F172A]">
        {/* gradient + glow layers */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#1E1B4B_0%,#3730A3_55%,#0E7490_100%)]" />
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#6366F1] opacity-30 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-[26rem] w-[26rem] rounded-full bg-[#06B6D4] opacity-25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:42px_42px]" />

        <Link to="/" className="relative inline-flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20 flex items-center justify-center group-hover:bg-white/15 transition-colors">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">SaleBDS OS</span>
        </Link>

        <div className="relative space-y-7 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/15 px-3 py-1 text-xs font-medium text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22D3EE] shadow-[0_0_12px_#22D3EE]" />
            Nền tảng số #1 cho Sale BĐS
          </div>
          <h2 className="text-3xl xl:text-[2.6rem] font-bold leading-[1.1] tracking-tight">
            Điều hành kinh doanh BĐS bằng <span className="text-[#67E8F9]">điểm chạm</span>.
          </h2>
          <p className="text-white/75 text-base leading-relaxed">
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
              <li key={t} className="flex items-start gap-3 text-white/85">
                <span className="mt-0.5 h-5 w-5 rounded-md bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                  <Check className="h-3 w-3 text-[#67E8F9]" />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-xs text-white/55">
          <span>© {new Date().getFullYear()} SaleBDS OS</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Bảo mật SOC 2 · Mã hoá AES-256
          </span>
        </div>
      </aside>

      {/* Right: form */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8 relative">
        {/* subtle background accents on mobile/right side */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-[#EEF2FF] blur-3xl opacity-70" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-[#CFFAFE] blur-3xl opacity-60" />
        </div>

        <div className="relative w-full max-w-[440px]">
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-[linear-gradient(135deg,#3730A3,#06B6D4)] flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-[#0F172A]">SaleBDS OS</span>
          </Link>

          <div className="rounded-3xl border border-[#E2E8F0] bg-white/90 backdrop-blur-xl p-7 sm:p-9 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)]">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 mb-7 rounded-xl bg-[#F1F5F9]">
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
                      ? "bg-white text-[#0F172A] shadow-sm"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {m === "signin" ? "Đăng nhập" : "Đăng ký"}
                </button>
              ))}
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                {mode === "signin" ? "Chào mừng trở lại 👋" : "Bắt đầu hành trình"}
              </h1>
              <p className="text-sm text-[#64748B] mt-1.5">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]"
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

              {mode === "signin" && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-sm text-[#475569] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#CBD5E1] accent-[#3730A3]"
                    />
                    Ghi nhớ đăng nhập
                  </label>
                  <button
                    type="button"
                    onClick={() => toast.info("Tính năng đang phát triển")}
                    className="text-sm font-semibold text-[#3730A3] hover:text-[#1E1B4B] transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="group w-full h-12 rounded-xl bg-[linear-gradient(135deg,#3730A3_0%,#4338CA_55%,#06B6D4_140%)] text-white text-sm font-semibold shadow-[0_10px_30px_-10px_rgba(55,48,163,0.6)] hover:shadow-[0_14px_36px_-12px_rgba(55,48,163,0.7)] hover:brightness-110 active:brightness-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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

            <div className="my-6 flex items-center gap-3 text-[11px] text-[#94A3B8]">
              <div className="h-px flex-1 bg-[#E2E8F0]" />
              <span className="uppercase tracking-[0.16em] font-semibold">hoặc tiếp tục với</span>
              <div className="h-px flex-1 bg-[#E2E8F0]" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onGoogle}
              disabled={loading}
              className="w-full h-11 rounded-xl border-[#E2E8F0] bg-white text-[#0F172A] text-sm font-medium hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4" />
                <path d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.2843H1.5166V17.3644C3.55371 21.5047 7.7029 24.0008 12.2401 24.0008Z" fill="#34A853" />
                <path d="M5.50253 14.2843C5.00205 12.8093 5.00205 11.196 5.50253 9.72099V6.64085H1.5166C-0.18551 10.0057 -0.18551 13.9996 1.5166 17.3644L5.50253 14.2843Z" fill="#FBBC05" />
                <path d="M12.2401 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.2401 0.000808666C7.7029 0.000808666 3.55371 2.49695 1.5166 6.64085L5.50253 9.72099C6.45053 6.86169 9.10947 4.74966 12.2401 4.74966Z" fill="#EA4335" />
              </svg>
              Tiếp tục với Google
            </Button>

            <p className="mt-6 text-center text-[11px] text-[#94A3B8] leading-relaxed">
              Bằng việc tiếp tục, bạn đồng ý với{" "}
              <span className="text-[#475569] font-medium">Điều khoản</span> &{" "}
              <span className="text-[#475569] font-medium">Chính sách bảo mật</span> của SaleBDS OS.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `h-11 pl-10 rounded-xl bg-white text-sm text-[#0F172A] placeholder:text-[#94A3B8] transition-all focus-visible:ring-2 focus-visible:ring-offset-1 ${
    hasError
      ? "border-[#EF4444] focus-visible:ring-[#EF4444]/40"
      : "border-[#E2E8F0] focus-visible:ring-[#3730A3]/40 focus-visible:border-[#3730A3]"
  }`;
}

function Field({
  id,
  label,
  icon,
  error,
  rightSlot,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium text-[#334155]">
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
          {icon}
        </span>
        {children}
        {rightSlot}
      </div>
      {error && (
        <p className="text-xs text-[#DC2626] flex items-center gap-1.5 pt-0.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
