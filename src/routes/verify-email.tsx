import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { checkEmailVerification, resendVerificationEmail, type VerifyStatus } from "@/lib/verify-email.functions";
import { toast } from "sonner";
import {
  Building2, Mail, Loader2, ArrowRight, RefreshCw, ShieldCheck, Check, Inbox, AlertTriangle, Clock, User as UserIcon, CalendarClock,
} from "lucide-react";

const search = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
  validateSearch: search,
});

type UiStatus = VerifyStatus | "idle";
type ServerUser = {
  email: string;
  username: string | null;
  fullName: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
};

const POLL_SECONDS = 5;

function VerifyEmailPage() {
  const nav = useNavigate();
  const sp = useSearch({ from: "/verify-email" });
  const [email, setEmail] = useState<string>(sp.email ?? "");
  const [status, setStatus] = useState<UiStatus>("idle");
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [serverUser, setServerUser] = useState<ServerUser | null>(null);
  const [nextCheckIn, setNextCheckIn] = useState<number>(POLL_SECONDS);
  const redirectedRef = useRef(false);
  const pollRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const checkFn = useServerFn(checkEmailVerification);
  const resendFn = useServerFn(resendVerificationEmail);

  // Prefill email
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runCheck = async (silent = false) => {
    if (!email) return;
    if (!silent) setChecking(true);
    setNextCheckIn(POLL_SECONDS);
    try {
      const r = await checkFn({ data: { email } });
      setStatus(r.status);
      setConfirmedAt(r.confirmedAt);
      setServerMsg(r.message ?? null);
      setServerUser(r.user ?? null);
      setLastCheckedAt(new Date());
      if (r.status === "verified" && !redirectedRef.current) {
        redirectedRef.current = true;
        if (pollRef.current) window.clearInterval(pollRef.current);
        if (tickRef.current) window.clearInterval(tickRef.current);
        toast.success("Email đã xác thực — đang đưa bạn vào hệ thống");
        setTimeout(() => nav({ to: "/onboarding", replace: true }), 800);
      }
    } catch (e: any) {
      setStatus("error");
      setServerMsg(e?.message ?? "Không kiểm tra được trạng thái");
    } finally {
      if (!silent) setChecking(false);
    }
  };

  // Initial + polling check (server-driven)
  useEffect(() => {
    if (!email) return;
    runCheck(false);
    pollRef.current = window.setInterval(() => runCheck(true), POLL_SECONDS * 1000);
    tickRef.current = window.setInterval(
      () => setNextCheckIn((n) => (n <= 1 ? POLL_SECONDS : n - 1)),
      1000,
    );
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also react to client-side auth events
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user?.email_confirmed_at) {
        runCheck(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const onResend = async () => {
    if (!email) {
      toast.error("Vui lòng nhập email để gửi lại");
      return;
    }
    setResending(true);
    try {
      const redirectTo = `${window.location.origin}/verify-email?email=${encodeURIComponent(email)}`;
      const r = await resendFn({ data: { email, redirectTo } });
      if (!r.ok) throw new Error(r.message);
      toast.success("Đã gửi lại email xác thực");
      setCooldown(45);
    } catch (e: any) {
      toast.error(e?.message ?? "Không gửi lại được email");
    } finally {
      setResending(false);
    }
  };

  const isVerified = status === "verified";
  const isError = status === "error";
  const isNotFound = status === "not_found";
  const isPending = status === "pending";

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
            Chúng tôi đã gửi link xác thực đến email của bạn. Trạng thái bên phải được kiểm tra trực tiếp từ máy chủ.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              "Trạng thái lấy từ Lovable Cloud (không phụ thuộc trình duyệt)",
              "Tự động làm mới mỗi 5 giây",
              "Có thể gửi lại nếu không thấy email",
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
            <StatusHeader status={status} checking={checking} />

            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 mb-5 space-y-3">
              <div>
                <div className="text-xs font-medium text-[#64748B] mb-1">Email</div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] break-all">
                  <Mail className="h-4 w-4 text-[#3730A3] shrink-0" />
                  {serverUser?.email ?? email ?? "—"}
                </div>
              </div>
              {(serverUser?.username || serverUser?.fullName) && (
                <div className="pt-3 border-t border-[#E2E8F0]">
                  <div className="text-xs font-medium text-[#64748B] mb-1">
                    {serverUser?.username ? "Tên đăng nhập" : "Họ tên"}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                    <UserIcon className="h-4 w-4 text-[#3730A3] shrink-0" />
                    {serverUser?.username ?? serverUser?.fullName}
                  </div>
                </div>
              )}
              {serverUser?.createdAt && (
                <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-2 text-xs text-[#64748B]">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Tạo {new Date(serverUser.createdAt).toLocaleString("vi-VN")}
                </div>
              )}
            </div>

            {isPending && !isVerified && (
              <div className="mb-5 rounded-xl border border-[#C7D2FE] bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#3730A3] inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang chờ bạn xác thực email
                  </span>
                  <span className="text-xs font-mono tabular-nums text-[#475569]">
                    Tự kiểm tra sau {nextCheckIn}s
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#EEF2FF] overflow-hidden">
                  <div
                    className="h-full bg-[linear-gradient(90deg,#3730A3,#06B6D4)] transition-all duration-1000 ease-linear"
                    style={{ width: `${((POLL_SECONDS - nextCheckIn) / POLL_SECONDS) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <StatusBanner
              status={status}
              serverMsg={serverMsg}
              confirmedAt={confirmedAt}
              lastCheckedAt={lastCheckedAt}
            />

            {!isVerified && (
              <div className="space-y-3 mt-5">
                {!sp.email && (
                  <input
                    id="resend-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-11 rounded-xl border border-[#E2E8F0] bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]/40 focus-visible:border-[#3730A3]"
                  />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => runCheck(false)}
                    disabled={checking || !email}
                    className="h-11 rounded-xl border border-[#E2E8F0] bg-white text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Kiểm tra lại
                  </button>
                  <button
                    type="button"
                    onClick={onResend}
                    disabled={resending || cooldown > 0 || !email}
                    className="h-11 rounded-xl bg-[linear-gradient(135deg,#3730A3,#4338CA,#06B6D4)] text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang gửi
                      </>
                    ) : cooldown > 0 ? (
                      <>Gửi lại sau {cooldown}s</>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Gửi lại email
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-5 border-t border-[#E2E8F0] flex items-center justify-between text-sm">
                  <Link to="/login" className="text-[#64748B] hover:text-[#0F172A]">
                    ← Quay lại đăng nhập
                  </Link>
                  <span className="text-xs text-[#94A3B8]">
                    {lastCheckedAt ? `Cập nhật ${formatRelative(lastCheckedAt)}` : "Đang chờ..."}
                  </span>
                </div>
              </div>
            )}

            {isVerified && (
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm text-[#059669] font-medium inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Xác thực thành công
                </span>
                <button
                  onClick={() => nav({ to: "/onboarding", replace: true })}
                  className="inline-flex items-center gap-1 text-[#3730A3] font-medium hover:underline text-sm"
                >
                  Tiếp tục <ArrowRight className="h-3.5 w-3.5" />
                </button>
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

function StatusHeader({ status, checking }: { status: UiStatus; checking: boolean }) {
  const cfg = headerConfig(status, checking);
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center ring-1 ${cfg.iconWrap}`}>
        {cfg.icon}
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">{cfg.title}</h1>
        <p className="text-sm text-[#64748B] mt-1.5">{cfg.subtitle}</p>
      </div>
    </div>
  );
}

function headerConfig(status: UiStatus, checking: boolean) {
  if (status === "verified") {
    return {
      icon: <Check className="h-6 w-6 text-[#059669]" />,
      iconWrap: "bg-[#ECFDF5] ring-[#A7F3D0]",
      title: "Đã xác thực!",
      subtitle: "Đang chuyển hướng đến thiết lập workspace...",
    };
  }
  if (status === "error") {
    return {
      icon: <AlertTriangle className="h-6 w-6 text-[#DC2626]" />,
      iconWrap: "bg-[#FEF2F2] ring-[#FECACA]",
      title: "Không kiểm tra được trạng thái",
      subtitle: "Máy chủ tạm thời gặp lỗi. Hãy thử lại sau.",
    };
  }
  if (status === "not_found") {
    return {
      icon: <AlertTriangle className="h-6 w-6 text-[#D97706]" />,
      iconWrap: "bg-[#FFFBEB] ring-[#FDE68A]",
      title: "Không tìm thấy tài khoản",
      subtitle: "Email này chưa được đăng ký hoặc đã bị xoá.",
    };
  }
  if (status === "pending") {
    return {
      icon: <Clock className="h-6 w-6 text-[#3730A3]" />,
      iconWrap: "bg-[#EEF2FF] ring-[#C7D2FE]",
      title: "Đang chờ xác thực",
      subtitle: "Mở email và bấm vào liên kết để hoàn tất.",
    };
  }
  return {
    icon: checking ? (
      <Loader2 className="h-6 w-6 text-[#3730A3] animate-spin" />
    ) : (
      <Mail className="h-6 w-6 text-[#3730A3]" />
    ),
    iconWrap: "bg-[linear-gradient(135deg,#EEF2FF,#CFFAFE)] ring-[#E2E8F0]",
    title: "Xác thực email của bạn",
    subtitle: "Đang kiểm tra trạng thái từ máy chủ...",
  };
}

function StatusBanner({
  status, serverMsg, confirmedAt, lastCheckedAt,
}: {
  status: UiStatus;
  serverMsg: string | null;
  confirmedAt: string | null;
  lastCheckedAt: Date | null;
}) {
  if (status === "verified") {
    return (
      <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-4 text-sm text-[#065F46]">
        <div className="font-semibold flex items-center gap-2"><Check className="h-4 w-4" /> Email đã được xác thực</div>
        {confirmedAt && (
          <div className="text-xs text-[#047857] mt-1">Lúc {new Date(confirmedAt).toLocaleString("vi-VN")}</div>
        )}
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
        <div className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Lỗi máy chủ</div>
        <div className="text-xs mt-1 break-words">{serverMsg ?? "Không xác định"}</div>
      </div>
    );
  }
  if (status === "not_found") {
    return (
      <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-sm text-[#92400E]">
        <div className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Chưa có tài khoản</div>
        <div className="text-xs mt-1">
          Email này chưa tồn tại trong hệ thống. Hãy <Link to="/login" className="underline font-medium">đăng ký</Link> trước.
        </div>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-4 text-sm text-[#3730A3]">
        <div className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Đang chờ xác thực</div>
        <div className="text-xs mt-1 text-[#4338CA]">
          Kiểm tra hộp thư (kể cả Spam). Trang sẽ tự cập nhật khi bạn bấm link.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
      <div className="font-semibold inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra...</div>
    </div>
  );
}

function formatRelative(d: Date) {
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 5) return "vừa xong";
  if (s < 60) return `${s}s trước`;
  const m = Math.floor(s / 60);
  return `${m}m trước`;
}
