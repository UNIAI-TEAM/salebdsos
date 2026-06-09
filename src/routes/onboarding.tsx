import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { registerAgency } from "@/lib/auth.functions";
import { toast } from "sonner";
import { Building2, Check, Globe, Loader2, Pencil, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function OnboardingPage() {
  const { session, loading, tenants, refreshTenants } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [prefilled, setPrefilled] = useState(false);
  const register = useServerFn(registerAgency);

  useEffect(() => {
    if (!loading && !session) nav({ to: "/login", replace: true });
  }, [loading, session, nav]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pending_workspace");
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.name) {
          setName(p.name);
          setPrefilled(true);
        }
        if (p?.slug) setSlug(p.slug);
        else if (p?.name) setSlug(slugify(p.name));
      } else {
        const meta = (session?.user?.user_metadata ?? {}) as Record<string, string>;
        if (meta.workspace_name) {
          setName(meta.workspace_name);
          setPrefilled(true);
        }
        if (meta.workspace_slug) setSlug(meta.workspace_slug);
        else if (meta.workspace_name) setSlug(slugify(meta.workspace_name));
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const validate = useCallback(() => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Vui lòng nhập tên workspace";
    else if (name.trim().length < 2) next.name = "Tên workspace tối thiểu 2 ký tự";

    if (!slug.trim()) next.slug = "Vui lòng nhập slug";
    else if (!/^[a-z0-9-]+$/.test(slug)) next.slug = "Chỉ chữ thường, số, gạch ngang";
    else if (slug.length < 2) next.slug = "Slug tối thiểu 2 ký tự";
    else if (slug.length > 50) next.slug = "Slug tối đa 50 ký tự";

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [name, slug]);

  useEffect(() => {
    if (touched.name || touched.slug) validate();
  }, [name, slug, touched.name, touched.slug, validate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, slug: true });
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({ data: { name: name.trim(), slug: slug.trim() } });
      await refreshTenants();
      toast.success("Đã tạo workspace thành công");
      try {
        sessionStorage.removeItem("pending_workspace");
      } catch {}
      nav({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Không tạo được workspace");
    } finally {
      setSubmitting(false);
    }
  };

  const hasNameError = touched.name && !!errors.name;
  const hasSlugError = touched.slug && !!errors.slug;

  const inputCls = (hasError: boolean) =>
    `mt-1.5 w-full h-11 rounded-xl border bg-background px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3730A3]/40 ${
      hasError
        ? "border-[#EF4444] focus-visible:border-[#EF4444]"
        : "border-[#E2E8F0] focus-visible:border-[#3730A3]"
    }`;

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[#F8FAFC]">
      {/* Left: brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-16 text-white overflow-hidden bg-[#0F172A]">
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
            <Sparkles className="h-3.5 w-3.5 text-[#67E8F9]" />
            Chỉ còn một bước nữa
          </div>
          <h2 className="text-3xl xl:text-[2.6rem] font-bold leading-[1.1] tracking-tight">
            Tạo workspace cho <span className="text-[#67E8F9]">agency BĐS</span> của bạn
          </h2>
          <p className="text-white/75 text-base leading-relaxed">
            Mỗi agency sẽ có một workspace riêng biệt. Bạn có thể quản lý team, dự án,
            khách hàng và tất cả công cụ marketing trong cùng một nơi.
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

        <div className="relative text-xs text-white/55">
          © {new Date().getFullYear()} SaleBDS OS
        </div>
      </aside>

      {/* Right: form */}
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
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                Thiết lập workspace
              </h1>
              <p className="text-sm text-[#64748B] mt-1.5">
                {prefilled
                  ? "Thông tin đã được điền từ đăng ký. Bạn có thể chỉnh sửa trước khi tạo."
                  : "Đặt tên và địa chỉ web cho workspace agency của bạn."}
              </p>
            </div>

            {tenants.length > 0 && (
              <div className="mb-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">
                    Bạn đã có <span className="font-semibold text-[#0F172A]">{tenants.length}</span> workspace
                  </span>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1 text-[#3730A3] font-medium hover:underline"
                  >
                    Vào dashboard <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="ws-name" className="text-sm font-semibold text-[#0F172A]">
                  Tên workspace / Agency
                </label>
                <div className="relative mt-1.5">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <input
                    id="ws-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!touched.slug) setSlug(slugify(e.target.value));
                    }}
                    onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                    placeholder="Ví dụ: ABC Real Estate"
                    className={`${inputCls(hasNameError)} pl-10`}
                    required
                  />
                </div>
                {hasNameError && (
                  <p className="mt-1.5 text-xs text-[#EF4444] flex items-center gap-1">
                    <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#EF4444]/10 flex items-center justify-center text-[10px] font-bold">!</span>
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="ws-slug" className="text-sm font-semibold text-[#0F172A]">
                  Địa chỉ URL
                </label>
                <div className="relative mt-1.5">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                    <Globe className="h-4 w-4" />
                  </div>
                  <input
                    id="ws-slug"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    onBlur={() => setTouched((p) => ({ ...p, slug: true }))}
                    placeholder="abc-real-estate"
                    className={`${inputCls(hasSlugError)} pl-10`}
                    required
                  />
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#F1F5F9] px-3 py-2 text-sm">
                  <span className="text-[#94A3B8]">salebds.vn/</span>
                  <span className="font-medium text-[#0F172A]">{slug || "..."}</span>
                  <Pencil className="ml-auto h-3.5 w-3.5 text-[#94A3B8]" />
                </div>
                {hasSlugError && (
                  <p className="mt-1.5 text-xs text-[#EF4444] flex items-center gap-1">
                    <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#EF4444]/10 flex items-center justify-center text-[10px] font-bold">!</span>
                    {errors.slug}
                  </p>
                )}
              </div>

              {prefilled && (
                <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-4 py-3 text-sm text-[#065F46]">
                  <div className="flex items-center gap-2 font-medium">
                    <Check className="h-4 w-4 text-[#059669]" />
                    Thông tin từ đăng ký đã được tự động điền
                  </div>
                  <p className="mt-0.5 text-[#047857] text-xs">
                    Bạn có thể chỉnh sửa tên và URL trước khi tạo workspace.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-[linear-gradient(135deg,#3730A3,#4338CA,#06B6D4)] text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tạo workspace...
                  </>
                ) : (
                  <>
                    Tạo workspace
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
