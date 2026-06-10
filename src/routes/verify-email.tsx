import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Mail, Loader2, ArrowRight, RefreshCw, ShieldCheck, Check, Inbox } from "lucide-react";

const search = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
  validateSearch: search,
});

function VerifyEmailPage() {
  const nav = useNavigate();
  const sp = useSearch({ from: "/verify-email" });
  const [email, setEmail] = useState<string>(sp.email ?? "");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Prefill email from sessionStorage if absent
  useEffect(() => {
    if (!email) {
      try {
        const raw = sessionStorage.getItem("pending_workspace");
        if (raw) {
          const p = JSON.parse(raw);
          if (p?.email) setEmail(p.email);
        }
      } catch {}
    }
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!email && u?.email) setEmail(u.email);
      if (u?.email_confirmed_at) handleVerified();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for auth changes (email confirmed → session)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user?.email_confirmed_at) {
        handleVerified();
      }
    });
    // Poll fallback every 4s in case the email is confirmed in another tab
    pollRef.current = window.setInterval(async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) handleVerified();
    }, 4000);
    return () => {
      sub.subscription.unsubscribe();
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const handleVerified = () => {
    if (verified) return;
    setVerified(true);
    if (pollRef.current) window.clearInterval(pollRef.current);
    toast.success("Email đã xác thực — đang đưa bạn vào hệ thống");
    setTimeout(() => nav({ to: "/onboarding", replace: true }), 800);
  };

  const onResend = async () => {
    if (!email) {
      toast.error("Vui lòng nhập email để gửi lại");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/verify-email?email=${encodeURIComponent(email)}` },
      });
      if (error) throw error;
      toast.success("Đã gửi lại email xác thực");
      setCooldown(45);
    } catch (e: any) {
      toast.error(e?.message ?? "Không gửi lại được email");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[#F8FAFC]">
      <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-16 text-white overflow-hidden bg-[#0F172A]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#1E1B4B_0%,#3730A3_55%,#0E7490_100%)]" />
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#6366F1] opacity-30 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-[26rem] w-[26rem] rounded-full bg-[#06B6D4] opacity-25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:42px_42px]" />

        <Link to="/" className="relative inline-flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">SaleBDS OS</span>
        </Link>

        <div className="relative space-y-7 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/15 px-3 py-1 text-xs font-medium text-white/90">
            <Inbox className="h-3.5 w-3.5 text-[#67E8F9]" />
            Bước cuối — Xác thực email
          </div>
          <h2 className="text-3xl xl:text-[2.6rem] font-bold leading-[1.1] tracking-tight">
            Kiểm tra hộp thư để <span className="text-[#67E8F9]">kích hoạt</span> tài khoản
          </h2>
          <p className="text-white/75 text-base leading-relaxed">
            Chúng tôi đã gửi link xác thực đến email của bạn. Mở email và bấm vào liên kết
            để hoàn tất đăng ký và tạo workspace agency.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              "Link xác thực có hiệu lực trong 24 giờ",
              "Có thể gửi lại nếu không thấy email",
              "Kiểm tra cả thư mục Spam / Quảng cáo",
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

      <main className="flex items-center justify-center px-4 py-10 sm:px-8 relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-[#EEF2FF] blur-3xl opacity-70" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-[#CFFAFE] blur-3xl opacity-60" />
        </div>

        <div className="relative w-full max-w-[460px]">
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-[linear-gradient(135deg,#3730A3,#06B6D4)] flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-[#0F172A]">SaleBDS OS</span>
          </Link>

          <div className="rounded-3xl border border-[#E2E8F0] bg-white/90 backdrop-blur-xl p-7 sm:p-9 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)]">
            <div className="mb-6 flex items-start gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-[linear-gradient(135deg,#EEF2FF,#CFFAFE)] flex items-center justify-center ring-1 ring-[#E2E8F0]">
                {verified ? (
                  <Check className="h-6 w-6 text-[#059669]" />
                ) : (
                  <Mail className="h-6 w-6 text-[#3730A3]" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                  {verified ? "Đã xác thực!" : "Xác thực email của bạn"}
                </h1>
                <p className="text-sm text-[#64748B] mt-1.5">
                  {verified
                    ? "Đang chuyển hướng đến thiết lập workspace..."
                    : "Mở email và bấm vào liên kết xác thực để tiếp tục."}
                </p>
              </div>
            </div>

            {!verified && (
              <>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 mb-5">
                  <div className="text-xs font-medium text-[#64748B] mb-1">Email đã gửi tới</div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] break-all">
                    <Mail className="h-4 w-4 text-[#3730A3] shrink-0" />
                    {email || "—"}
                  </div>
                </div>

                <div className="space-y-3">
                  <label htmlFor="resend-email" className="text-sm font-semibold text-[#0F172A]">
                    Không nhận được email?
                  </label>
                  <input
                    id="resend-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-11 rounded-xl border border-[#E2E8F0] bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]/40 focus-visible:border-[#3730A3]"
                  />

                  <button
                    type="button"
                    onClick={onResend}
                    disabled={resending || cooldown > 0}
                    className="w-full h-11 rounded-xl bg-[linear-gradient(135deg,#3730A3,#4338CA,#06B6D4)] text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang gửi...
                      </>
                    ) : cooldown > 0 ? (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Gửi lại sau {cooldown}s
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Gửi lại email xác thực
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex items-center justify-between text-sm">
                  <Link to="/login" className="text-[#64748B] hover:text-[#0F172A]">
                    ← Quay lại đăng nhập
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      const { data } = await supabase.auth.getUser();
                      if (data.user?.email_confirmed_at) handleVerified();
                      else toast.info("Chưa thấy xác thực. Vui lòng kiểm tra email.");
                    }}
                    className="inline-flex items-center gap-1 text-[#3730A3] font-medium hover:underline"
                  >
                    Tôi đã xác thực <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}

            {verified && (
              <div className="flex items-center justify-center py-6 text-[#3730A3]">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>

          <p className="text-xs text-[#94A3B8] text-center mt-5">
            Có vấn đề? Liên hệ{" "}
            <a href="mailto:support@salebds.vn" className="text-[#3730A3] hover:underline">
              support@salebds.vn
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
