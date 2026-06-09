import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { getPublicAllowlist } from "@/lib/auth-settings.functions";
import { toast } from "sonner";

const search = z.object({ redirect: z.string().optional(), invite: z.string().optional() });

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: search,
});

async function checkEmailAllowed(email: string, fetcher: () => Promise<{ allowed_email_domains: string[]; enforce_domain_allowlist: boolean }>) {
  const cfg = await fetcher();
  if (!cfg.enforce_domain_allowlist) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return cfg.allowed_email_domains.map((d) => d.toLowerCase()).includes(domain);
}

function LoginPage() {
  const nav = useNavigate();
  const sp = useSearch({ from: "/login" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const fetchAllowlist = useServerFn(getPublicAllowlist);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await checkEmailAllowed(email, fetchAllowlist);
      if (!ok) throw new Error("Email không thuộc domain được phép đăng nhập.");
      if (mode === "signup") {
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
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Đăng nhập thành công");
        const next = sp.invite ? `/accept-invite/${sp.invite}` : sp.redirect ?? "/dashboard";
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
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}${next}`,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        toast.error(result.error.message ?? "Không thể đăng nhập Google");
        return;
      }
      if (result.redirected) return;
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
        <Link to="/" className="relative inline-flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur" />
          <span className="font-bold text-lg">SaleBDS OS</span>
        </Link>

        <div className="relative space-y-6 max-w-md">
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight">
            Điều hành kinh doanh BĐS bằng điểm chạm
          </h2>
          <p className="text-white/85 text-base leading-relaxed">
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
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                <span className="text-white/90">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/70">
          © {new Date().getFullYear()} SaleBDS OS — Unicom AI Software Factory
        </p>
      </aside>

      {/* Right: form */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden block text-center mb-6">
            <div className="inline-flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-brand-gradient" />
              <span className="font-bold text-lg">SaleBDS OS</span>
            </div>
          </Link>
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <h1 className="text-xl font-semibold">
            {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Vào workspace BĐS của bạn" : "Tạo tài khoản & đăng ký agency"}
          </p>
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Họ tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              required
            />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Đang xử lý..." : mode === "signin" ? "Đăng nhập" : "Đăng ký"}
            </button>
          </form>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> hoặc <div className="h-px flex-1 bg-border" />
          </div>
          <button
            onClick={onGoogle}
            className="w-full h-10 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted"
          >
            Tiếp tục với Google
          </button>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Chưa có tài khoản?{" "}
                <button onClick={() => setMode("signup")} className="text-primary font-medium">
                  Đăng ký
                </button>
              </>
            ) : (
              <>
                Đã có tài khoản?{" "}
                <button onClick={() => setMode("signin")} className="text-primary font-medium">
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
