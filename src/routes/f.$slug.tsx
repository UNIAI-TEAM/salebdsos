// Public lead capture form: /f/<slug>
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { getPublicLeadForm } from "@/lib/lead-form.functions";

export const Route = createFileRoute("/f/$slug")({
  loader: async ({ params }) => {
    const form = await getPublicLeadForm({ data: { slug: params.slug } });
    if (!form) throw notFound();
    return form;
  },
  head: ({ loaderData }) => {
    const title = (loaderData?.name || "Đăng ký nhận thông tin").slice(0, 58);
    const desc = (
      loaderData?.description || "Để lại thông tin để nhận tư vấn dự án nhanh nhất."
    ).slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: PublicFormPage,
  errorComponent: () => <Fallback title="Không tải được form" sub="Vui lòng thử lại sau." />,
  notFoundComponent: () => (
    <Fallback title="Form không tồn tại" sub="Form này có thể đã bị đóng hoặc gỡ bỏ." />
  ),
});

function Fallback({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

const INPUT =
  "h-11 w-full rounded-xl border border-border bg-card px-4 text-[14px] outline-none focus:ring-2 focus:ring-primary/30";

function PublicFormPage() {
  const form = Route.useLoaderData();
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    for (const f of form.fields) payload[f.key] = String(fd.get(f.key) ?? "");
    try {
      const res = await fetch(`/api/public/lead-forms/${form.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = (await res.json()) as { ok?: boolean; error?: string; message?: string; redirect?: string | null };
      if (!res.ok || !out.ok) throw new Error(out.error || "Không gửi được.");
      if (out.redirect) {
        window.location.href = out.redirect;
        return;
      }
      setDone(out.message || "Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Không gửi được.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 px-5 py-12">
      <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-7 shadow-sm">
        {form.projectName ? (
          <div className="text-[12px] font-semibold uppercase tracking-wide text-primary">
            {form.projectName}
          </div>
        ) : null}
        <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight">{form.name}</h1>
        {form.description ? (
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{form.description}</p>
        ) : null}

        {done ? (
          <div className="mt-7 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-[14px] font-medium text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{done}</span>
          </div>
        ) : (
          <form className="mt-7 space-y-4" onSubmit={submit}>
            {form.fields.map((f) => (
              <div key={f.key}>
                <label className="mb-1.5 block text-[13px] font-semibold" htmlFor={f.key}>
                  {f.label}
                  {f.required ? <span className="text-destructive"> *</span> : null}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    id={f.key}
                    name={f.key}
                    required={f.required}
                    placeholder={f.placeholder ?? ""}
                    rows={3}
                    className={INPUT.replace("h-11", "min-h-[88px] py-2.5")}
                  />
                ) : f.type === "select" ? (
                  <select id={f.key} name={f.key} required={f.required} className={INPUT} defaultValue="">
                    <option value="">— Chọn —</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={f.key}
                    name={f.key}
                    required={f.required}
                    type={f.type === "email" ? "email" : "text"}
                    inputMode={f.type === "phone" ? "tel" : undefined}
                    placeholder={f.placeholder ?? ""}
                    className={INPUT}
                  />
                )}
              </div>
            ))}
            {err ? <p className="text-[13px] font-medium text-destructive">{err}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "Đang gửi…" : "Gửi thông tin"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
