import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, KpiCard } from "@/components/app/ui";
import {
  Inbox, Send, Sparkles, Wand2, Search, Plus, Loader2, Copy, Check, Mail,
  MessageCircle, Smartphone, Phone, Trash2, X, ChevronDown, MessageSquare, Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listFollowups, getFollowupStats, getFollowupQueue,
  updateFollowupStatus, deleteFollowup,
  SCENARIOS, SCENARIO_LABEL_VI,
  type Scenario, type FollowupStatus,
} from "@/lib/followup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/ai-followup")({ component: AiFollowupPage });

type Channel = "email" | "zalo" | "sms";

const CHANNEL_META: Record<Channel, { label: string; icon: typeof Mail; tone: string }> = {
  email: { label: "Email", icon: Mail, tone: "bg-violet-50 text-violet-600" },
  zalo: { label: "Zalo", icon: MessageCircle, tone: "bg-cyan-50 text-cyan-700" },
  sms: { label: "SMS", icon: Smartphone, tone: "bg-emerald-50 text-emerald-700" },
};

const STATUS_LABEL: Record<FollowupStatus, string> = {
  suggested: "Gợi ý",
  sent: "Đã gửi",
  dismissed: "Bỏ qua",
  draft: "Nháp",
};
const STATUS_TONE: Record<FollowupStatus, string> = {
  suggested: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  sent: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  dismissed: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  draft: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
};

const TABS = [
  { id: "queue", label: "Hàng chờ chăm sóc" },
  { id: "suggested", label: "Đã tạo gợi ý" },
  { id: "history", label: "Lịch sử gửi" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const initials = (n?: string | null) => (n || "?").trim().split(/\s+/).pop()!.charAt(0).toUpperCase();
const avatarTone = (i: number) =>
  ["from-blue-300 to-indigo-400","from-rose-300 to-fuchsia-400","from-amber-300 to-orange-400",
   "from-emerald-300 to-teal-400","from-violet-300 to-purple-400","from-cyan-300 to-blue-400"][i % 6];

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
}

function AiFollowupPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const [tab, setTab] = useState<TabId>("queue");
  const [scenarioF, setScenarioF] = useState<Scenario | "all">("all");
  const [search, setSearch] = useState("");
  const [generatorLeadId, setGeneratorLeadId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const fnStats = useServerFn(getFollowupStats);
  const fnQueue = useServerFn(getFollowupQueue);
  const fnList = useServerFn(listFollowups);
  const fnUpdate = useServerFn(updateFollowupStatus);
  const fnDelete = useServerFn(deleteFollowup);

  const stats = useQuery({
    queryKey: ["followup-stats", tenantId],
    queryFn: () => fnStats({ data: { tenantId: tenantId! } }),
    enabled: !!tenantId,
  });

  const queue = useQuery({
    queryKey: ["followup-queue", tenantId, scenarioF],
    queryFn: () => fnQueue({ data: { tenantId: tenantId!, scenario: scenarioF, limit: 50 } }),
    enabled: !!tenantId && tab === "queue",
  });

  const suggestions = useQuery({
    queryKey: ["followups", tenantId, "suggested", scenarioF],
    queryFn: () => fnList({ data: { tenantId: tenantId!, status: "suggested", scenario: scenarioF, pageSize: 50 } }),
    enabled: !!tenantId && tab === "suggested",
  });

  const history = useQuery({
    queryKey: ["followups", tenantId, "all", scenarioF],
    queryFn: () => fnList({ data: { tenantId: tenantId!, status: "all", scenario: scenarioF, pageSize: 50 } }),
    enabled: !!tenantId && tab === "history",
  });

  const updateMut = useMutation({
    mutationFn: (v: { id: string; status: FollowupStatus }) => fnUpdate({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups", tenantId] });
      qc.invalidateQueries({ queryKey: ["followup-stats", tenantId] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups", tenantId] });
      qc.invalidateQueries({ queryKey: ["followup-stats", tenantId] });
      setPreviewId(null);
    },
  });

  const previewItem = useMemo(() => {
    if (!previewId) return null;
    return [...(suggestions.data?.items ?? []), ...(history.data?.items ?? [])].find((x) => x.id === previewId) ?? null;
  }, [previewId, suggestions.data, history.data]);

  const queueFiltered = useMemo(() => {
    const items = queue.data?.items ?? [];
    if (!search.trim()) return items;
    const t = search.trim().toLowerCase();
    return items.filter(
      (l) =>
        (l.full_name ?? "").toLowerCase().includes(t) ||
        (l.email ?? "").toLowerCase().includes(t) ||
        (l.phone ?? "").includes(t),
    );
  }, [queue.data, search]);

  if (!tenantId) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Chọn workspace để dùng AI Follow-up.</div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Follow-up"
        sub="AI gợi ý tin nhắn chăm sóc lead theo từng kịch bản. Bạn xem trước, chỉnh sửa và gửi thủ công."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Inbox} label="Tổng gợi ý đã tạo" value={String(stats.data?.total ?? 0)} delta={0} tone="primary" />
        <KpiCard icon={Sparkles} label="Đang chờ gửi" value={String(stats.data?.suggested ?? 0)} delta={0} tone="blue" />
        <KpiCard icon={Send} label="Đã gửi" value={String(stats.data?.sent ?? 0)} delta={0} tone="green" />
        <KpiCard icon={Target} label="30 ngày qua" value={String(stats.data?.last30d ?? 0)} delta={0} tone="indigo" />
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT…"
            className="pl-9 h-9"
          />
        </div>
        <Select value={scenarioF} onValueChange={(v) => setScenarioF(v as any)}>
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue placeholder="Tất cả kịch bản" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả kịch bản</SelectItem>
            {SCENARIOS.map((s) => (
              <SelectItem key={s} value={s}>{SCENARIO_LABEL_VI[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Body */}
      {tab === "queue" && (
        <QueueTable
          loading={queue.isLoading}
          items={queueFiltered}
          onGenerate={(id) => setGeneratorLeadId(id)}
        />
      )}

      {tab === "suggested" && (
        <SuggestionsTable
          loading={suggestions.isLoading}
          items={suggestions.data?.items ?? []}
          onPreview={setPreviewId}
          onMarkSent={(id) => updateMut.mutate({ id, status: "sent" })}
          onDismiss={(id) => updateMut.mutate({ id, status: "dismissed" })}
        />
      )}

      {tab === "history" && (
        <SuggestionsTable
          loading={history.isLoading}
          items={history.data?.items ?? []}
          onPreview={setPreviewId}
          onMarkSent={(id) => updateMut.mutate({ id, status: "sent" })}
          onDismiss={(id) => updateMut.mutate({ id, status: "dismissed" })}
          showStatus
        />
      )}

      {/* Generator dialog */}
      {generatorLeadId && (
        <GeneratorDialog
          tenantId={tenantId}
          lead={(queue.data?.items ?? []).find((x) => x.id === generatorLeadId) ?? null}
          onClose={() => setGeneratorLeadId(null)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["followups", tenantId] });
            qc.invalidateQueries({ queryKey: ["followup-stats", tenantId] });
          }}
        />
      )}

      {/* Preview dialog */}
      {previewItem && (
        <PreviewDialog
          item={previewItem}
          onClose={() => setPreviewId(null)}
          onMarkSent={() => updateMut.mutate({ id: previewItem.id, status: "sent" })}
          onDelete={() => deleteMut.mutate(previewItem.id)}
        />
      )}
    </div>
  );
}

/* ============================================================ */

function QueueTable({
  loading, items, onGenerate,
}: {
  loading: boolean;
  items: any[];
  onGenerate: (leadId: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted-foreground bg-muted/30">
              <th className="px-5 py-3 font-semibold">Lead</th>
              <th className="px-3 py-3 font-semibold">Trạng thái</th>
              <th className="px-3 py-3 font-semibold">Dự án quan tâm</th>
              <th className="px-3 py-3 font-semibold">AI Score</th>
              <th className="px-3 py-3 font-semibold">Tạo lúc</th>
              <th className="px-3 py-3 font-semibold text-right pr-5">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Đang tải hàng chờ…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Không có lead nào trong hàng chờ.</td></tr>
            )}
            {items.map((l, i) => (
              <tr key={l.id} className="border-t border-border hover:bg-muted/30 transition">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={["h-9 w-9 rounded-full bg-gradient-to-br shrink-0 grid place-items-center text-white text-[12px] font-bold", avatarTone(i)].join(" ")}>{initials(l.full_name)}</div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{l.full_name ?? "Khách chưa rõ tên"}</div>
                      <div className="text-[11px] text-muted-foreground">{l.phone ?? "—"} {l.email ? `· ${l.email}` : ""}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3"><span className="text-foreground/80">{l.status ?? "—"}</span></td>
                <td className="px-3 py-3">{l.project_name ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-3 py-3">
                  {l.score != null ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold ring-1 ring-emerald-100">
                      <Sparkles className="h-3 w-3" />{l.score}
                    </span>
                  ) : <span className="text-muted-foreground text-[11px]">—</span>}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{fmtDate(l.created_at)}</td>
                <td className="px-3 py-3 text-right pr-5">
                  <Button size="sm" onClick={() => onGenerate(l.id)} className="gap-1.5">
                    <Wand2 className="h-3.5 w-3.5" /> Tạo gợi ý AI
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuggestionsTable({
  loading, items, onPreview, onMarkSent, onDismiss, showStatus = false,
}: {
  loading: boolean;
  items: any[];
  onPreview: (id: string) => void;
  onMarkSent: (id: string) => void;
  onDismiss: (id: string) => void;
  showStatus?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted-foreground bg-muted/30">
              <th className="px-5 py-3 font-semibold">Lead</th>
              <th className="px-3 py-3 font-semibold">Kịch bản</th>
              <th className="px-3 py-3 font-semibold">Kênh</th>
              <th className="px-3 py-3 font-semibold">Xem trước</th>
              {showStatus && <th className="px-3 py-3 font-semibold">Trạng thái</th>}
              <th className="px-3 py-3 font-semibold">Tạo lúc</th>
              <th className="px-3 py-3 font-semibold text-right pr-5">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={showStatus ? 7 : 6} className="px-5 py-12 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Đang tải…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={showStatus ? 7 : 6} className="px-5 py-12 text-center text-muted-foreground">Chưa có gợi ý nào. Tạo ở tab "Hàng chờ chăm sóc".</td></tr>
            )}
            {items.map((it: any, i: number) => {
              const ch = (it.channel ?? "zalo") as Channel;
              const ChIcon = CHANNEL_META[ch].icon;
              const sc = (it.scenario ?? "new_lead") as Scenario;
              return (
                <tr key={it.id} className="border-t border-border hover:bg-muted/30 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={["h-9 w-9 rounded-full bg-gradient-to-br shrink-0 grid place-items-center text-white text-[12px] font-bold", avatarTone(i)].join(" ")}>{initials(it.lead?.full_name)}</div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{it.lead?.full_name ?? "Khách"}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{it.lead?.phone ?? "—"}{it.lead?.email ? ` · ${it.lead.email}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><Badge variant="secondary" className="font-medium">{SCENARIO_LABEL_VI[sc]}</Badge></td>
                  <td className="px-3 py-3">
                    <span className={["inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11.5px] font-medium", CHANNEL_META[ch].tone].join(" ")}>
                      <ChIcon className="h-3.5 w-3.5" /> {CHANNEL_META[ch].label}
                    </span>
                  </td>
                  <td className="px-3 py-3 max-w-[420px]">
                    <div className="line-clamp-2 text-foreground/85">{it.output ?? "—"}</div>
                  </td>
                  {showStatus && (
                    <td className="px-3 py-3">
                      <span className={["inline-flex items-center px-2 py-1 rounded-md text-[11.5px] font-semibold", STATUS_TONE[(it.status ?? "suggested") as FollowupStatus]].join(" ")}>
                        {STATUS_LABEL[(it.status ?? "suggested") as FollowupStatus]}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(it.created_at)}</td>
                  <td className="px-3 py-3 text-right pr-5">
                    <div className="inline-flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => onPreview(it.id)}>Xem</Button>
                      {it.status !== "sent" && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => onMarkSent(it.id)}>
                          <Check className="h-3.5 w-3.5" /> Đã gửi
                        </Button>
                      )}
                      {it.status !== "dismissed" && (
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onDismiss(it.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================ */

function GeneratorDialog({
  tenantId, lead, onClose, onCreated,
}: {
  tenantId: string;
  lead: any | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [scenario, setScenario] = useState<Scenario>(
    lead?.score >= 75 ? "high_score" : lead?.project_id ? "viewed_project" : "new_lead",
  );
  const [channel, setChannel] = useState<Channel>("zalo");
  const [tone, setTone] = useState("Chuyên nghiệp, ấm áp");
  const [extraNote, setExtraNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ subject: string; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!lead) return null;

  async function generate() {
    setGenerating(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-followup-generate", {
        body: { tenantId, leadId: lead.id, scenario, channel, tone, extraNote, persist: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult({ subject: data?.preview?.subject ?? "", message: data?.preview?.message ?? "" });
      onCreated();
      toast.success("Đã tạo gợi ý AI");
    } catch (e: any) {
      toast.error(e?.message ?? "Không tạo được gợi ý");
    } finally {
      setGenerating(false);
    }
  }

  function copy() {
    const text = channel === "email" && result?.subject
      ? `Tiêu đề: ${result.subject}\n\n${result.message}`
      : result?.message ?? "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Đã copy nội dung");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> Tạo gợi ý AI cho {lead.full_name ?? "khách"}
          </DialogTitle>
          <DialogDescription>
            AI sẽ soạn tin nhắn theo kịch bản và kênh bạn chọn. MVP: bạn copy/gửi thủ công.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-[12px]">Kịch bản</Label>
            <Select value={scenario} onValueChange={(v) => setScenario(v as Scenario)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCENARIOS.map((s) => <SelectItem key={s} value={s}>{SCENARIO_LABEL_VI[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Kênh</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="zalo">Zalo</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Tông giọng</Label>
            <Input value={tone} onChange={(e) => setTone(e.target.value)} className="mt-1.5" placeholder="Chuyên nghiệp, ấm áp" />
          </div>
        </div>

        <div>
          <Label className="text-[12px]">Yêu cầu thêm cho AI (tuỳ chọn)</Label>
          <Textarea
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
            placeholder="VD: Mời khách đi xem nhà mẫu cuối tuần này…"
            className="mt-1.5 min-h-[60px]"
          />
        </div>

        {result && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            {channel === "email" && result.subject && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Tiêu đề</div>
                <div className="font-semibold">{result.subject}</div>
              </div>
            )}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Nội dung</div>
              <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{result.message}</div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button size="sm" onClick={copy} className="gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copy
              </Button>
              {channel === "zalo" && lead.phone && (
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={`https://zalo.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" /> Mở Zalo
                  </a>
                </Button>
              )}
              {channel === "email" && lead.email && (
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={`mailto:${lead.email}?subject=${encodeURIComponent(result.subject ?? "")}&body=${encodeURIComponent(result.message)}`}>
                    <Mail className="h-3.5 w-3.5" /> Mở Email
                  </a>
                </Button>
              )}
              {channel === "sms" && lead.phone && (
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={`sms:${lead.phone}?body=${encodeURIComponent(result.message)}`}>
                    <Smartphone className="h-3.5 w-3.5" /> Mở SMS
                  </a>
                </Button>
              )}
              {lead.phone && (
                <Button asChild size="sm" variant="ghost" className="gap-1.5">
                  <a href={`tel:${lead.phone}`}><Phone className="h-3.5 w-3.5" /> Gọi</a>
                </Button>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          <Button onClick={generate} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {result ? "Tạo lại" : "Tạo gợi ý AI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({
  item, onClose, onMarkSent, onDelete,
}: {
  item: any;
  onClose: () => void;
  onMarkSent: () => void;
  onDelete: () => void;
}) {
  const ch = (item.channel ?? "zalo") as Channel;
  const sc = (item.scenario ?? "new_lead") as Scenario;
  const status = (item.status ?? "suggested") as FollowupStatus;
  const [copied, setCopied] = useState(false);

  function copy() {
    const text = ch === "email" && item.subject ? `Tiêu đề: ${item.subject}\n\n${item.output}` : item.output;
    navigator.clipboard.writeText(text ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Đã copy");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Xem trước tin nhắn
          </DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-2">
              <Badge variant="secondary">{SCENARIO_LABEL_VI[sc]}</Badge>
              <span className={["inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium", CHANNEL_META[ch].tone].join(" ")}>{CHANNEL_META[ch].label}</span>
              <span className={["inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold", STATUS_TONE[status]].join(" ")}>{STATUS_LABEL[status]}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="text-[12px] text-muted-foreground">
            Gửi cho <span className="font-semibold text-foreground">{item.lead?.full_name ?? "Khách"}</span>
            {item.lead?.phone && <> · {item.lead.phone}</>}
            {item.lead?.email && <> · {item.lead.email}</>}
          </div>
          {ch === "email" && item.subject && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Tiêu đề</div>
              <div className="font-semibold">{item.subject}</div>
            </div>
          )}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Nội dung</div>
            <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{item.output ?? "—"}</div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap sm:justify-between">
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Xoá
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
            </Button>
            {status !== "sent" && (
              <Button size="sm" onClick={onMarkSent} className="gap-1.5">
                <Send className="h-3.5 w-3.5" /> Đánh dấu đã gửi
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
