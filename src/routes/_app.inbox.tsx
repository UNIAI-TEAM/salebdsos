import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  MessageCircle,
  MessagesSquare,
  Phone,
  PhoneCall,
  Search,
  Send,
  Mail,
  MessageSquare,
  Settings2,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, SectionCard } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getChannelSettings,
  getConversation,
  listConversations,
  saveCallResult,
  saveChannelSettings,
  sendMessage,
  startCall,
} from "@/lib/inbox.functions";
import {
  CALL_OUTCOMES,
  CHANNEL_LABEL,
  DEFAULT_CHANNEL_SETTINGS,
  SMS_PROVIDERS,
  TELEPHONY_PROVIDERS,
  formatDuration,
  type ChannelSettings,
} from "@/lib/channels";

export const Route = createFileRoute("/_app/inbox")({
  head: () => ({
    meta: [
      { title: "Hộp thoại khách hàng — SaleBDS OS" },
      { name: "description", content: "Gộp chat landing, Zalo OA và cuộc gọi có ghi âm của từng khách vào một hộp thoại." },
      { property: "og:title", content: "Hộp thoại khách hàng — SaleBDS OS" },
      { property: "og:description", content: "Một hộp thoại cho mọi kênh: chat trên trang dự án, Zalo OA và cuộc gọi có ghi âm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InboxPage,
});

const CHANNEL_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "web_chat", label: "Chat trên trang" },
  { value: "zalo", label: "Zalo OA" },
  { value: "call", label: "Gọi điện" },
  { value: "sms", label: "SMS brandname" },
  { value: "email", label: "Email" },
] as const;

const SEND_CHANNELS = [
  { value: "auto", label: "Theo kênh của khách" },
  { value: "zalo", label: "Zalo OA" },
  { value: "sms", label: "SMS brandname" },
  { value: "email", label: "Email" },
  { value: "note", label: "Ghi chú nội bộ" },
] as const;

function timeLabel(value: string) {
  return new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function InboxPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const qc = useQueryClient();

  const fetchList = useServerFn(listConversations);
  const fetchThread = useServerFn(getConversation);
  const send = useServerFn(sendMessage);
  const call = useServerFn(startCall);
  const saveCall = useServerFn(saveCallResult);
  const fetchChannels = useServerFn(getChannelSettings);
  const persistChannels = useServerFn(saveChannelSettings);

  const [channel, setChannel] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sendChannel, setSendChannel] = useState<string>("auto");
  const [emailSubject, setEmailSubject] = useState("Thông tin dự án");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [config, setConfig] = useState<ChannelSettings>(DEFAULT_CHANNEL_SETTINGS);
  const [callDialog, setCallDialog] = useState<{ callId: string; phone: string } | null>(null);
  const [callForm, setCallForm] = useState({ outcome: "connected", minutes: "1", recordingUrl: "", notes: "" });

  const listQuery = useQuery({
    queryKey: ["inbox", tenantId, channel, search],
    enabled: Boolean(tenantId),
    refetchInterval: 20000,
    queryFn: () => {
      if (!tenantId) throw new Error("Chưa chọn workspace");
      return fetchList({ data: { tenantId, channel, search: search || undefined } });
    },
  });

  const threadQuery = useQuery({
    queryKey: ["inbox-thread", tenantId, activeId],
    enabled: Boolean(tenantId && activeId),
    refetchInterval: 15000,
    queryFn: () => {
      if (!tenantId || !activeId) throw new Error("Chưa chọn hội thoại");
      return fetchThread({ data: { tenantId, conversationId: activeId } });
    },
  });

  const channelsQuery = useQuery({
    queryKey: ["channel-settings", tenantId],
    enabled: Boolean(tenantId),
    queryFn: () => {
      if (!tenantId) throw new Error("Chưa chọn workspace");
      return fetchChannels({ data: { tenantId } });
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["inbox", tenantId] });
    void qc.invalidateQueries({ queryKey: ["inbox-thread", tenantId, activeId] });
  };

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!tenantId || !activeId) throw new Error("Chưa chọn hội thoại");
      const fallback = threadQuery.data?.conversation.channel === "zalo" ? "zalo" : "web_chat";
      const channelToUse = sendChannel === "auto" ? fallback : sendChannel;
      return send({
        data: {
          tenantId,
          conversationId: activeId,
          body: draft.trim(),
          channel: channelToUse as "web_chat" | "zalo" | "note" | "sms" | "email",
          ...(channelToUse === "email" ? { subject: emailSubject } : {}),
        },
      });
    },
    onSuccess: (result) => {
      setDraft("");
      if (result.warning) toast.warning(result.warning);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const callMutation = useMutation({
    mutationFn: (phone: string) => {
      if (!tenantId) throw new Error("Chưa chọn workspace");
      return call({ data: { tenantId, conversationId: activeId ?? undefined, phone } });
    },
    onSuccess: (result, phone) => {
      if (result.warning) toast.info(result.warning);
      else toast.success("Đã bắt đầu cuộc gọi");
      setCallDialog({ callId: result.callId, phone });
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const callResultMutation = useMutation({
    mutationFn: () => {
      if (!tenantId || !callDialog) throw new Error("Thiếu cuộc gọi");
      return saveCall({
        data: {
          tenantId,
          callId: callDialog.callId,
          outcome: callForm.outcome,
          durationSeconds: Math.max(0, Math.round(Number(callForm.minutes || 0) * 60)),
          recordingUrl: callForm.recordingUrl.trim() || undefined,
          notes: callForm.notes.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Đã lưu kết quả cuộc gọi");
      setCallDialog(null);
      setCallForm({ outcome: "connected", minutes: "1", recordingUrl: "", notes: "" });
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const settingsMutation = useMutation({
    mutationFn: () => {
      if (!tenantId) throw new Error("Chưa chọn workspace");
      return persistChannels({ data: { tenantId, config } });
    },
    onSuccess: () => {
      toast.success("Đã lưu cấu hình kênh liên lạc");
      setSettingsOpen(false);
      void qc.invalidateQueries({ queryKey: ["channel-settings", tenantId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = listQuery.data?.items ?? [];
  const thread = threadQuery.data;
  const timeline = useMemo(() => thread?.messages ?? [], [thread]);

  const openSettings = () => {
    setConfig(channelsQuery.data?.config ?? DEFAULT_CHANNEL_SETTINGS);
    setSettingsOpen(true);
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <PageHeader
        title="Hộp thoại khách hàng"
        sub="Chat trên trang dự án, Zalo OA và cuộc gọi có ghi âm của cùng một khách nằm trong một hội thoại."
        action={
          <div className="flex items-center gap-2">
            <Badge variant={listQuery.data?.unreadTotal ? "destructive" : "outline"}>
              {listQuery.data?.unreadTotal ?? 0} chưa đọc
            </Badge>
            {channelsQuery.data?.canManage ? (
              <Button variant="outline" onClick={openSettings}>
                <Settings2 className="mr-1.5 h-4 w-4" /> Kênh liên lạc
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <SectionCard title="Hội thoại">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên hoặc số điện thoại"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CHANNEL_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setChannel(filter.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    channel === filter.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-3 space-y-2">
            {listQuery.isLoading ? (
              <li className="py-6 text-center text-sm text-muted-foreground">Đang tải…</li>
            ) : items.length === 0 ? (
              <li className="py-6 text-center text-sm text-muted-foreground">Chưa có hội thoại nào.</li>
            ) : (
              items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      activeId === item.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      {item.unread ? <Badge variant="destructive" className="shrink-0 text-[10px]">{item.unread}</Badge> : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.preview ?? "—"}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {CHANNEL_LABEL[item.channel] ?? item.channel}
                      {item.projectName ? ` · ${item.projectName}` : ""} · {timeLabel(item.lastAt)}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </SectionCard>

        <SectionCard
          title={thread ? thread.conversation.name : "Chọn một hội thoại"}
          action={
            thread?.conversation.phone ? (
              <Button
                size="sm"
                onClick={() => callMutation.mutate(thread.conversation.phone as string)}
                disabled={callMutation.isPending}
              >
                <PhoneCall className="mr-1.5 h-4 w-4" /> Gọi & ghi âm
              </Button>
            ) : undefined
          }
        >
          {!thread ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Chọn một khách ở danh sách bên cạnh để xem toàn bộ tin nhắn và cuộc gọi.
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{CHANNEL_LABEL[thread.conversation.channel] ?? thread.conversation.channel}</Badge>
                {thread.conversation.phone ? (
                  <a href={`tel:${thread.conversation.phone}`} className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {thread.conversation.phone}
                  </a>
                ) : null}
              </div>

              <div className="max-h-[52vh] space-y-2 overflow-y-auto rounded-xl border border-border p-3">
                {timeline.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Chưa có tin nhắn.</p>
                ) : (
                  timeline.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        message.direction === "out"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      } ${message.channel === "note" ? "border border-dashed border-warning bg-warning/10 text-foreground" : ""}`}
                    >
                      <p className="mb-0.5 text-[10px] font-semibold uppercase opacity-70">
                        {message.channel === "note" ? "Ghi chú nội bộ" : CHANNEL_LABEL[message.channel] ?? message.channel}
                        {message.sender_name ? ` · ${message.sender_name}` : ""}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      {message.attachment_url ? (
                        <audio controls src={message.attachment_url} className="mt-2 w-full" />
                      ) : null}
                      <p className="mt-1 text-[10px] opacity-70">
                        {timeLabel(message.created_at)}
                        {message.delivery_status === "pending" ? " · chờ gửi" : ""}
                        {message.delivery_status === "failed" ? " · gửi lỗi" : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {SEND_CHANNELS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSendChannel(option.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        sendChannel === option.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {option.value === "note" ? <StickyNote className="mr-1 inline h-3 w-3" /> : null}
                      {option.label}
                    </button>
                  ))}
                </div>
                {sendChannel === "email" ? (
                  <Input
                    value={emailSubject}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    placeholder="Tiêu đề email"
                  />
                ) : null}
                <div className="flex gap-2">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={2}
                    placeholder={
                      sendChannel === "note"
                        ? "Ghi chú cho đồng nghiệp…"
                        : sendChannel === "sms"
                          ? "Nội dung SMS (nên viết không dấu để tiết kì tiển)…"
                          : "Nhập tin nhắn trả lời khách…"
                    }
                  />
                  <Button
                    onClick={() => sendMutation.mutate()}
                    disabled={!draft.trim() || sendMutation.isPending}
                    className="h-auto"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {thread.calls.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cuộc gọi</p>
                  <ul className="space-y-2">
                    {thread.calls.map((item) => (
                      <li key={item.id} className="rounded-xl border border-border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{item.phone ?? "—"}</p>
                          <span className="text-xs text-muted-foreground">
                            {timeLabel(item.started_at)} · {formatDuration(item.duration_seconds)}
                          </span>
                        </div>
                        {item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}
                        {item.recording_url ? (
                          <audio controls src={item.recording_url} className="mt-2 w-full" />
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground">Chưa có ghi âm</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </SectionCard>
      </div>

      {/* Lưu kết quả cuộc gọi + ghi âm */}
      <Dialog open={Boolean(callDialog)} onOpenChange={(open) => !open && setCallDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kết quả cuộc gọi {callDialog?.phone}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Kết quả</Label>
              <Select value={callForm.outcome} onValueChange={(value) => setCallForm((prev) => ({ ...prev, outcome: value }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CALL_OUTCOMES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Thời lượng (phút)</Label>
              <Input
                className="mt-1"
                inputMode="decimal"
                value={callForm.minutes}
                onChange={(event) => setCallForm((prev) => ({ ...prev, minutes: event.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Đường dẫn ghi âm</Label>
              <Input
                className="mt-1"
                placeholder="https://… (tổng đài tự điền khi đã kết nối)"
                value={callForm.recordingUrl}
                onChange={(event) => setCallForm((prev) => ({ ...prev, recordingUrl: event.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Ghi chú</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={callForm.notes}
                onChange={(event) => setCallForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallDialog(null)}>Để sau</Button>
            <Button onClick={() => callResultMutation.mutate()} disabled={callResultMutation.isPending}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cấu hình kênh liên lạc */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kênh liên lạc</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold"><MessagesSquare className="mr-1.5 inline h-4 w-4" />Chat trên trang dự án</Label>
                <Switch
                  checked={config.webChat.enabled}
                  onCheckedChange={(value) => setConfig((prev) => ({ ...prev, webChat: { ...prev.webChat, enabled: value } }))}
                />
              </div>
              <Input
                className="mt-2"
                value={config.webChat.title}
                onChange={(event) => setConfig((prev) => ({ ...prev, webChat: { ...prev.webChat, title: event.target.value } }))}
                placeholder="Tiêu đề hộp chat"
              />
              <Textarea
                className="mt-2"
                rows={2}
                value={config.webChat.greeting}
                onChange={(event) => setConfig((prev) => ({ ...prev, webChat: { ...prev.webChat, greeting: event.target.value } }))}
                placeholder="Câu chào khách"
              />
            </div>

            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold"><MessageCircle className="mr-1.5 inline h-4 w-4" />Zalo OA</Label>
                <Switch
                  checked={config.zalo.enabled}
                  onCheckedChange={(value) => setConfig((prev) => ({ ...prev, zalo: { ...prev.zalo, enabled: value } }))}
                />
              </div>
              <Input
                className="mt-2"
                value={config.zalo.oaName}
                onChange={(event) => setConfig((prev) => ({ ...prev, zalo: { ...prev.zalo, oaName: event.target.value } }))}
                placeholder="Tên Official Account"
              />
              <Input
                className="mt-2"
                value={config.zalo.oaId}
                onChange={(event) => setConfig((prev) => ({ ...prev, zalo: { ...prev.zalo, oaId: event.target.value } }))}
                placeholder="Mã OA (khi đã có)"
              />
              <Input
                className="mt-2"
                value={config.zalo.oaLink}
                onChange={(event) => setConfig((prev) => ({ ...prev, zalo: { ...prev.zalo, oaLink: event.target.value } }))}
                placeholder="Link mở Zalo cho khách, ví dụ zalo.me/…"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Khi anh/chị có Official Account, gửi khoá kết nối để nhận và trả tin Zalo ngay trong hộp thoại này.
              </p>
            </div>

            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold"><PhoneCall className="mr-1.5 inline h-4 w-4" />Gọi điện có ghi âm</Label>
                <Switch
                  checked={config.telephony.enabled}
                  onCheckedChange={(value) => setConfig((prev) => ({ ...prev, telephony: { ...prev.telephony, enabled: value } }))}
                />
              </div>
              <Select
                value={config.telephony.provider}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, telephony: { ...prev.telephony, provider: value as ChannelSettings["telephony"]["provider"] } }))
                }
              >
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TELEPHONY_PROVIDERS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                value={config.telephony.hotline}
                onChange={(event) => setConfig((prev) => ({ ...prev, telephony: { ...prev.telephony, hotline: event.target.value } }))}
                placeholder="Số hotline của sàn"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <Label className="text-xs">Tự ghi âm mọi cuộc gọi</Label>
                <Switch
                  checked={config.telephony.recordCalls}
                  onCheckedChange={(value) => setConfig((prev) => ({ ...prev, telephony: { ...prev.telephony, recordCalls: value } }))}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Chưa có khoá tổng đài thì cuộc gọi vẫn được ghi nhận để Sale gọi tay rồi dán đường dẫn ghi âm vào hồ sơ khách.
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold"><MessageSquare className="mr-1.5 inline h-4 w-4" />SMS brandname</Label>
                <Switch
                  checked={config.sms.enabled}
                  onCheckedChange={(value) => setConfig((prev) => ({ ...prev, sms: { ...prev.sms, enabled: value } }))}
                />
              </div>
              <Select
                value={config.sms.provider}
                onValueChange={(value) =>
                  setConfig((prev) => ({ ...prev, sms: { ...prev.sms, provider: value as ChannelSettings["sms"]["provider"] } }))
                }
              >
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SMS_PROVIDERS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                value={config.sms.brandname}
                onChange={(event) => setConfig((prev) => ({ ...prev, sms: { ...prev.sms, brandname: event.target.value } }))}
                placeholder="Brandname hiển thị, ví dụ SALEBDS"
              />
              <Textarea
                className="mt-2"
                rows={2}
                value={config.sms.template}
                onChange={(event) => setConfig((prev) => ({ ...prev, sms: { ...prev.sms, template: event.target.value } }))}
                placeholder="Mẫu tin gửi khách sau khi để lại thông tin"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Dùng {"{brand}"} để chèn brandname. Khi có hợp đồng brandname, gửi em khoá kết nối để tin gửi tự động.
              </p>
            </div>

            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-sm font-semibold"><Mail className="mr-1.5 inline h-4 w-4" />Email cho khách</Label>
                <Switch
                  checked={config.email.enabled}
                  onCheckedChange={(value) => setConfig((prev) => ({ ...prev, email: { ...prev.email, enabled: value } }))}
                />
              </div>
              <Input
                className="mt-2"
                value={config.email.senderName}
                onChange={(event) => setConfig((prev) => ({ ...prev, email: { ...prev.email, senderName: event.target.value } }))}
                placeholder="Tên người gửi, ví dụ Sàn SaleBDS"
              />
              <Input
                className="mt-2"
                value={config.email.replyTo}
                onChange={(event) => setConfig((prev) => ({ ...prev, email: { ...prev.email, replyTo: event.target.value } }))}
                placeholder="Email nhận phản hồi"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <Label className="text-xs">Tự gửi email xác nhận khi khách để lại thông tin</Label>
                <Switch
                  checked={config.email.autoConfirm}
                  onCheckedChange={(value) => setConfig((prev) => ({ ...prev, email: { ...prev.email, autoConfirm: value } }))}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Email gửi theo sự kiện cần tên miền gửi email đã xác thực. Chưa có thì nội dung vẫn lưu trong hộp thoại để gửi sau.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Đóng</Button>
            <Button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
