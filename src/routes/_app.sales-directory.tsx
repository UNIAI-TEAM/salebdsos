import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { QrCode as QrCodeView } from "@/components/qr-code";
import { toast } from "sonner";
import { IdCard, RefreshCw, Search, ExternalLink, Copy, QrCode, Building2 } from "lucide-react";
import { listSalesDirectory, syncSalesCards, ROLE_TITLE_VI } from "@/lib/sales-directory.functions";

export const Route = createFileRoute("/_app/sales-directory")({ component: SalesDirectoryPage });

function initials(s: string) {
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function SalesDirectoryPage() {
  const { currentTenant, hasRole } = useAuth();
  const tenantId = currentTenant?.id;
  const canSync = hasRole(["owner", "admin", "manager"]);
  const qc = useQueryClient();

  const fetchDirectory = useServerFn(listSalesDirectory);
  const sync = useServerFn(syncSalesCards);

  const [q, setQ] = useState("");
  const [openQr, setOpenQr] = useState<{ name: string; code: string } | null>(null);

  const dirQ = useQuery({
    queryKey: ["sales-directory", tenantId],
    queryFn: () => fetchDirectory({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const syncMu = useMutation({
    mutationFn: () => sync({ data: { tenantId: tenantId! } }),
    onSuccess: (r: any) => {
      toast.success(`Đã đồng bộ: tạo mới ${r.created} danh thiếp, cập nhật ${r.updated} danh thiếp`);
      qc.invalidateQueries({ queryKey: ["sales-directory", tenantId] });
      qc.invalidateQueries({ queryKey: ["my-cards", tenantId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Không đồng bộ được danh thiếp"),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const sales = useMemo(() => {
    const list = dirQ.data?.sales ?? [];
    const kw = q.trim().toLowerCase();
    if (!kw) return list;
    return list.filter((s: any) =>
      [s.fullName, s.email, s.card?.title, s.card?.slug].filter(Boolean).join(" ").toLowerCase().includes(kw),
    );
  }, [dirQ.data, q]);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast.success("Đã copy liên kết");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Danh sách Sale"
        sub="Mỗi sale một danh thiếp số riêng, kèm QR các dự án đang bán — tự đồng bộ khi hồ sơ hoặc dự án thay đổi."
        action={
          canSync ? (
            <button
              onClick={() => syncMu.mutate()}
              disabled={syncMu.isPending || !tenantId}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${syncMu.isPending ? "animate-spin" : ""}`} />
              Đồng bộ danh thiếp
            </button>
          ) : undefined
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên, email, chức danh..."
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {dirQ.isLoading ? (
        <SectionCard title="Đang tải">
          <p className="text-sm text-muted-foreground">Đang tải danh sách sale…</p>
        </SectionCard>
      ) : sales.length === 0 ? (
        <SectionCard title="Chưa có sale">
          <p className="text-sm text-muted-foreground">
            Chưa có thành viên kinh doanh nào. Thêm thành viên ở trang Thành viên & Vai trò rồi bấm “Đồng bộ danh thiếp”.
          </p>
        </SectionCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sales.map((s: any) => {
            const cardUrl = s.card ? `${origin}/c/${s.card.slug}` : null;
            return (
              <div key={s.userId} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {s.avatarUrl ? (
                    <img src={s.avatarUrl} alt={s.fullName} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {initials(s.fullName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.card?.displayName || s.fullName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {s.card?.title || ROLE_TITLE_VI[s.role] || "Chuyên viên kinh doanh"}
                    </p>
                    {s.email ? <p className="truncate text-xs text-muted-foreground">{s.email}</p> : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {s.card ? (
                    <>
                      <span className="rounded-full bg-muted px-2 py-1">
                        {s.card.isPublished ? "Danh thiếp đang công khai" : "Danh thiếp nháp"}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-1">{s.card.viewCount ?? 0} lượt xem</span>
                    </>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-1">Chưa có danh thiếp</span>
                  )}
                </div>

                {s.card ? (
                  <div className="mt-3 flex items-center gap-2">
                    <a
                      href={`/c/${s.card.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm"
                    >
                      <IdCard className="h-4 w-4" /> Xem danh thiếp
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => cardUrl && copy(cardUrl)}
                      className="rounded-xl border border-border p-2"
                      aria-label="Copy liên kết danh thiếp"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}

                <div className="mt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> Dự án & QR đang gắn
                  </p>
                  {s.projects.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Chưa gắn dự án nào vào danh thiếp.</p>
                  ) : (
                    <ul className="space-y-2">
                      {s.projects.map((p: any) => (
                        <li key={p.projectId} className="flex items-center gap-2 rounded-xl border border-border p-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.city ? `${p.city} · ` : ""}
                              {p.qrCode ? `${p.qrScans} lượt quét` : "Chưa có QR"}
                            </p>
                          </div>
                          {p.qrCode ? (
                            <button
                              onClick={() => setOpenQr({ name: `${p.name} — ${s.fullName}`, code: p.qrCode })}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs"
                            >
                              <QrCode className="h-3.5 w-3.5" /> QR
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openQr ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpenQr(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-sm font-semibold">{openQr.name}</p>
            <QrCodeView
              value={`${origin}/api/public/pq/${openQr.code}`}
              size={220}
              label="Khách quét QR để xem landing dự án"
              filename={`qr-${openQr.code}`}
            />
            <button
              onClick={() => setOpenQr(null)}
              className="mt-4 w-full rounded-xl border border-border px-3 py-2 text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
