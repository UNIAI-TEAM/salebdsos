import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app/ui";
import { useAuth } from "@/hooks/use-auth";
import { getCustomerById } from "@/lib/customer.functions";
import {
  listFollowups,
  createFollowup,
  updateFollowupStatus,
  deleteFollowup,
  SCENARIOS,
  SCENARIO_LABEL_VI,
  type Scenario,
  type FollowupStatus,
} from "@/lib/followup.functions";
import {
  ArrowLeft, Sparkles, Phone, Mail, Send, Trash2, Plus, Clock,
  ChevronRight, CheckCircle2, XCircle, MessageCircle, Loader2,
  Building2, User, Copy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ai-followup/$customerId")({
  component: CustomerFollowupPage,
});

const CHANNELS = ["Zalo", "Email", "SMS", "Messenger"] as const;
const CHANNEL_TONE: Record<string, string> = {
  Zalo: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  Email: "bg-violet-50 text-violet-700 ring-violet-100",
  SMS: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Messenger: "bg-blue-50 text-blue-700 ring-blue-100",
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  suggested: "bg-amber-50 text-amber-700 ring-amber-100",
  sent: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  dismissed: "bg-rose-50 text-rose-700 ring-rose-100",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  suggested: "AI gợi ý",
  sent: "Đã gửi",
  dismissed: "Đã bỏ qua",
};

const initials = (n: string) =>
  n.trim().split(/\s+/).map((p) => p[0]).slice(-2).join("").toUpperCase() || "?";

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";

function CustomerFollowupPage() {
  const { customerId } = Route.useParams();
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id ?? "";
  const qc = useQueryClient();

  const getCustomerFn = useServerFn(getCustomerById);
  const listFn = useServerFn(listFollowups);
  const createFn = useServerFn(createFollowup);
  const updateStatusFn = useServerFn(updateFollowupStatus);
  const deleteFn = useServerFn(deleteFollowup);

  const [statusFilter, setStatusFilter] = useState<FollowupStatus | "all">("all");
  const [channel, setChannel] = useState<string>("Zalo");
  const [scenario, setScenario] = useState<Scenario | "">("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saveStatus, setSaveStatus] = useState<FollowupStatus>("draft");

  const custQ = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomerFn({ data: { id: customerId } }),
    enabled: !!customerId,
  });

  const listQ = useQuery({
    queryKey: ["followups", tenantId, customerId, statusFilter],
    queryFn: () =>
      listFn({
        data: {
          tenantId,
          customerId,
          status: statusFilter,
          pageSize: 50,
        },
      }),
    enabled: !!tenantId && !!customerId,
  });

  const items = listQ.data?.items ?? [];
  const stats = useMemo(() => {
    const total = items.length;
    const sent = items.filter((x) => x.status === "sent").length;
    const suggested = items.filter((x) => x.status === "suggested").length;
    const draft = items.filter((x) => x.status === "draft").length;
    return { total, sent, suggested, draft };
  }, [items]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["followups", tenantId, customerId] });

  const createMut = useMutation({
    mutationFn: (input: {
      tenantId: string; customerId: string; channel: string;
      subject?: string; output?: string; scenario?: Scenario; status: FollowupStatus;
    }) => createFn({ data: input }),
    onSuccess: () => {
      toast.success("Đã lưu follow-up");
      setSubject(""); setBody("");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Lỗi lưu follow-up"),
  });

  const statusMut = useMutation({
    mutationFn: (input: { id: string; status: FollowupStatus }) =>
      updateStatusFn({ data: input }),
    onSuccess: () => { toast.success("Đã cập nhật trạng thái"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Không cập nhật được"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Đã xoá"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Không xoá được"),
  });

  const handleSave = () => {
    if (!tenantId) return toast.error("Chưa chọn workspace");
    if (!body.trim() && !subject.trim()) return toast.error("Nhập nội dung hoặc tiêu đề");
    createMut.mutate({
      tenantId,
      customerId,
      channel,
      subject: subject.trim() || undefined,
      output: body.trim() || undefined,
      scenario: scenario || undefined,
      status: saveStatus,
    });
  };

  const customer = custQ.data;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Link to="/ai-followup" className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> AI Follow-up
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">
          Khách hàng · {custQ.isLoading ? "Đang tải…" : customer?.full_name ?? "Không tìm thấy"}
        </span>
      </div>

      <PageHeader
        title={`AI Follow-up${customer ? ` · ${customer.full_name}` : ""}`}
        sub="Lịch sử follow-up cá nhân hoá cho từng khách hàng."
        action={
          <div className="flex items-center gap-2 text-[12px]">
            <span className="px-2 py-1 rounded-lg bg-muted/40">Tổng: <b>{stats.total}</b></span>
            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">Đã gửi: <b>{stats.sent}</b></span>
            <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">Gợi ý: <b>{stats.suggested}</b></span>
            <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200">Nháp: <b>{stats.draft}</b></span>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
        {/* Left — customer card */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            {custQ.isLoading ? (
              <div className="p-6 text-center text-muted-foreground text-[12.5px]">
                <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Đang tải…
              </div>
            ) : !customer ? (
              <div className="p-6 text-center text-[12.5px] text-muted-foreground">
                Không tìm thấy khách hàng.
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-primary/10 via-primary-soft to-transparent px-5 pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-300 to-indigo-500 grid place-items-center text-white font-bold">
                      {initials(customer.full_name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold truncate">{customer.full_name}</h3>
                      {customer.company && (
                        <div className="text-[11.5px] text-muted-foreground truncate inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {customer.company}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-2.5 text-[12.5px]">
                  <Row icon={Phone} label="SĐT" value={customer.phone || "—"} />
                  <Row icon={Mail} label="Email" value={customer.email || "—"} />
                  <Row icon={User} label="Tạo lúc" value={fmt(customer.created_at)} />
                  {customer.notes && (
                    <div className="pt-2 border-t border-border text-[12px] text-muted-foreground whitespace-pre-wrap">
                      {customer.notes}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right — composer + list */}
        <div className="space-y-5 min-w-0">
          {/* Composer */}
          <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-[13px] font-semibold">Thêm follow-up mới</span>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11.5px] text-muted-foreground">Kênh:</span>
                {CHANNELS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setChannel(c)}
                    className={[
                      "h-7 px-2.5 rounded-lg text-[11.5px] font-semibold ring-1",
                      channel === c ? CHANNEL_TONE[c] + " ring-current/20" : "bg-card border border-border ring-transparent hover:bg-muted/40",
                    ].join(" ")}
                  >{c}</button>
                ))}
                <span className="ml-3 text-[11.5px] text-muted-foreground">Kịch bản:</span>
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value as Scenario | "")}
                  className="h-8 px-2 rounded-lg border border-border text-[12px] bg-card"
                >
                  <option value="">— Không —</option>
                  {SCENARIOS.map((s) => (
                    <option key={s} value={s}>{SCENARIO_LABEL_VI[s]}</option>
                  ))}
                </select>
              </div>

              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Tiêu đề (tuỳ chọn)"
                className="w-full h-9 px-3 rounded-xl border border-border text-[13px] bg-card outline-none focus:ring-2 focus:ring-primary/30"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Nội dung tin nhắn / ghi chú follow-up…"
                className="w-full p-3 rounded-xl border border-border text-[13px] bg-card outline-none focus:ring-2 focus:ring-primary/30 min-h-[140px] resize-y"
              />

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11.5px] text-muted-foreground">Trạng thái:</span>
                {(["draft", "suggested", "sent"] as FollowupStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSaveStatus(s)}
                    className={[
                      "h-7 px-2.5 rounded-lg text-[11.5px] font-semibold ring-1",
                      saveStatus === s ? STATUS_TONE[s] : "bg-card border border-border ring-transparent hover:bg-muted/40",
                    ].join(" ")}
                  >{STATUS_LABEL[s]}</button>
                ))}
                <button
                  disabled={createMut.isPending}
                  onClick={handleSave}
                  className="ml-auto h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow-soft disabled:opacity-60"
                >
                  {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Lưu follow-up
                </button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2 flex-wrap">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-[13px] font-semibold">Lịch sử follow-up</span>
              <div className="ml-auto flex items-center gap-1.5">
                {(["all", "draft", "suggested", "sent", "dismissed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s as FollowupStatus | "all")}
                    className={[
                      "h-7 px-2.5 rounded-lg text-[11.5px] font-semibold",
                      statusFilter === s ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted/40",
                    ].join(" ")}
                  >{s === "all" ? "Tất cả" : STATUS_LABEL[s]}</button>
                ))}
              </div>
            </div>

            {listQ.isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-[12.5px]">
                <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Đang tải…
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-[12.5px] text-muted-foreground">
                Chưa có follow-up nào cho khách hàng này.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((it) => (
                  <li key={it.id} className="p-5 hover:bg-muted/20">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {it.channel && (
                            <span className={[
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ring-1",
                              CHANNEL_TONE[it.channel] ?? "bg-slate-100 text-slate-700 ring-slate-200",
                            ].join(" ")}>{it.channel}</span>
                          )}
                          <span className={[
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ring-1",
                            STATUS_TONE[it.status ?? "draft"] ?? STATUS_TONE.draft,
                          ].join(" ")}>{STATUS_LABEL[it.status ?? "draft"] ?? it.status}</span>
                          {it.scenario && (
                            <span className="text-[10.5px] text-muted-foreground">· {SCENARIO_LABEL_VI[it.scenario as Scenario] ?? it.scenario}</span>
                          )}
                          <span className="ml-auto text-[10.5px] text-muted-foreground inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {fmt(it.created_at)}
                          </span>
                        </div>
                        {it.subject && <div className="text-[12.5px] font-semibold mb-1">{it.subject}</div>}
                        {it.output && (
                          <div className="text-[12.5px] text-foreground/90 whitespace-pre-wrap leading-relaxed">{it.output}</div>
                        )}
                        {it.sent_at && (
                          <div className="mt-2 text-[10.5px] text-emerald-700 inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Đã gửi lúc {fmt(it.sent_at)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      {it.output && (
                        <button
                          onClick={() => { navigator.clipboard?.writeText(it.output ?? ""); toast.success("Đã sao chép"); }}
                          className="h-7 px-2 rounded-lg border border-border text-[11.5px] inline-flex items-center gap-1 hover:bg-muted/40"
                        ><Copy className="h-3 w-3" /> Sao chép</button>
                      )}
                      {it.status !== "sent" && (
                        <button
                          disabled={statusMut.isPending}
                          onClick={() => statusMut.mutate({ id: it.id, status: "sent" })}
                          className="h-7 px-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11.5px] inline-flex items-center gap-1 hover:bg-emerald-100"
                        ><Send className="h-3 w-3" /> Đánh dấu đã gửi</button>
                      )}
                      {it.status !== "dismissed" && (
                        <button
                          disabled={statusMut.isPending}
                          onClick={() => statusMut.mutate({ id: it.id, status: "dismissed" })}
                          className="h-7 px-2 rounded-lg border border-border text-[11.5px] inline-flex items-center gap-1 hover:bg-muted/40"
                        ><XCircle className="h-3 w-3" /> Bỏ qua</button>
                      )}
                      <button
                        disabled={deleteMut.isPending}
                        onClick={() => { if (confirm("Xoá follow-up này?")) deleteMut.mutate(it.id); }}
                        className="h-7 px-2 rounded-lg border border-rose-200 text-rose-700 text-[11.5px] inline-flex items-center gap-1 hover:bg-rose-50 ml-auto"
                      ><Trash2 className="h-3 w-3" /> Xoá</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <span className="font-semibold text-foreground text-right truncate">{value}</span>
    </div>
  );
}
