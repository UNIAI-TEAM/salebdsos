import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { registerAgency } from "@/lib/auth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

function OnboardingPage() {
  const { session, loading, tenants, refreshTenants } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const register = useServerFn(registerAgency);

  useEffect(() => {
    if (!loading && !session) nav({ to: "/login", replace: true });
  }, [loading, session, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register({ data: { name, slug: slug || slugify(name) } });
      await refreshTenants();
      toast.success("Đã tạo agency");
      nav({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Không tạo được agency");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Đăng ký Agency</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tạo workspace cho công ty BĐS của bạn. Bạn sẽ là Owner.
        </p>
        {tenants.length > 0 && (
          <div className="mt-4 rounded-xl border border-border p-4 text-sm">
            Bạn đã có {tenants.length} workspace.{" "}
            <Link to="/dashboard" className="text-primary font-medium">Vào dashboard</Link>
          </div>
        )}
        <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-6">
          <div>
            <label className="text-sm font-medium">Tên agency</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
              className="mt-1 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="Ví dụ: ABC Real Estate"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Slug (URL)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="mt-1 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="abc-real-estate"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Chỉ chữ thường, số, gạch ngang.</p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? "Đang tạo..." : "Tạo agency"}
          </button>
        </form>
      </div>
    </div>
  );
}
