import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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
  ArrowLeft, Bot, Check, CircleCheck, CircleDot, Inbox, ListFilter, PanelRight, Plus, Radio, UserRound, X, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { INBOX_LAYOUT_COPY as ui } from "@/lib/inbox-copy";
import { ChannelGlyph, isBrandChannel } from "@/components/app/channel-glyph";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  assignConversation,
  createCustomerFromConversation,
  getChannelSettings,
  getConversation,
  getInboxKit,
  listConversations,
  setConversationStatus,
  setConversationTags,
  saveCallResult,
  saveChannelSettings,
  sendMessage,
  startCall,
} from "@/lib/inbox.functions";
import { listAssignees } from "@/lib/tickets.functions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CALL_OUTCOMES,
  CHANNEL_LABEL,
  DEFAULT_CHANNEL_SETTINGS,
  SMS_PROVIDERS,
  TELEPHONY_PROVIDERS,
  formatDuration,
  type ChannelSettings,
} from "@/lib/channels";
import { ChatConnections } from "@/components/app/chat-connections";
import { INBOX_COPY as t, replyChannel, messengerWindowOpen, PENDING_INBOX_CHANNELS, canSendPendingChannel } from "@/lib/omnichannel";
import { inboxLeadChoices, linkConversationLead } from "@/lib/omnichannel.functions";
import { Link } from "@tanstack/react-router";
import { expandShortcut } from "@/lib/social";

const TAG_TONE: Record<string, string> = {
  blue: "border-info/30 bg-info/10 text-info", amber: "border-warning/30 bg-warning/10 text-warning",
  emerald: "border-success/30 bg-success/10 text-success", rose: "border-destructive/30 bg-destructive/10 text-destructive",
};
const TAG_DOT: Record<string, string> = { blue: "bg-info", amber: "bg-warning", emerald: "bg-success", rose: "bg-destructive" };
function initials(name: string) { return name.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toUpperCase(); }

export const Route = createFileRoute("/_app/inbox")({
  head: () => ({
    meta: [
      { title: `${t.title} — SaleBDS OS` },
      { name: "description", content: "Hội thoại khách hàng qua chat web, Zalo OA và Messenger; SMS và email chỉ gửi đi, với trạng thái kết nối rõ ràng." },
      { property: "og:title", content: `${t.title} — SaleBDS OS` },
      { property: "og:description", content: "Hội thoại khách hàng qua chat web, Zalo OA và Messenger; SMS và email chỉ gửi đi, với trạng thái kết nối rõ ràng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InboxPage,
});

const CHANNEL_FILTERS = [
  { value: "all", label: ui.all },
  { value: "web_chat", label: ui.chatWeb },
  { value: "zalo", label: "Zalo OA" },
  { value: "messenger", label: t.messenger },
  { value: "call", label: ui.callChannel },
  { value: "sms", label: t.smsOutbound },
  { value: "email", label: t.emailOutbound },
] as const;

const SEND_CHANNELS = [
  { value: "auto", label: ui.autoChannel },
  { value: "zalo", label: "Zalo OA" },
  { value: "messenger", label: t.messenger },
  { value: "sms", label: t.smsOutbound },
  { value: "email", label: t.emailOutbound },
  { value: "note", label: ui.note },
] as const;

function timeLabel(value: string) {
  return new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function InboxPage() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  useEffect(() => { setActiveId(null); setDraft(""); setSendChannel("auto"); }, [tenantId]);
  const qc = useQueryClient();

  const fetchList = useServerFn(listConversations);
  const fetchThread = useServerFn(getConversation);
  const send = useServerFn(sendMessage);
  const call = useServerFn(startCall);
  const saveCall = useServerFn(saveCallResult);
  const fetchChannels = useServerFn(getChannelSettings);
  const persistChannels = useServerFn(saveChannelSettings);
  const fetchLeadChoices = useServerFn(inboxLeadChoices), linkLead = useServerFn(linkConversationLead);
  const [linkOpen, setLinkOpen] = useState(false), [leadSearch, setLeadSearch] = useState("");
  const choices = useQuery({ queryKey: ["inbox-lead-choices", tenantId, leadSearch], enabled: Boolean(tenantId && linkOpen), queryFn: () => { if (!tenantId) throw new Error("Chưa chọn sàn"); return fetchLeadChoices({ data: { tenantId, search: leadSearch } }); } });
  const linkMutation = useMutation({ mutationFn: (leadId: string) => { if (!tenantId || !activeId) throw new Error("Chưa chọn hội thoại"); return linkLead({ data: { tenantId, conversationId: activeId, leadId } }); }, onSuccess: () => { setLinkOpen(false); refresh(); toast.success("Đã gắn hồ sơ khách"); }, onError: (e: Error) => toast.error(e.message) });

  const [channel, setChannel] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("");
  const fetchKit = useServerFn(getInboxKit);
  const saveTags = useServerFn(setConversationTags);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const messageArea = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sendChannel, setSendChannel] = useState<string>("auto");
  const [emailSubject, setEmailSubject] = useState("Thông tin dự án");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [config, setConfig] = useState<ChannelSettings>(DEFAULT_CHANNEL_SETTINGS);
  const [callDialog, setCallDialog] = useState<{ callId: string; phone: string } | null>(null);
  const [callForm, setCallForm] = useState({ outcome: "connected", minutes: "1", recordingUrl: "", notes: "" });

  const listQuery = useQuery({
    queryKey: ["inbox", tenantId, channel, search, tagFilter],
    enabled: Boolean(tenantId),
    refetchInterval: 20000,
    queryFn: () => {
      if (!tenantId) throw new Error("Chưa chọn workspace");
      return fetchList({ data: { tenantId, channel, search: search || undefined, tag: tagFilter || undefined } });
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

  const kitQuery = useQuery({
    queryKey: ["inbox-kit", tenantId],
    enabled: Boolean(tenantId),
    queryFn: () => { if (!tenantId) throw new Error(ui.missingTenant); return fetchKit({ data: { tenantId } }); },
  });
  const kit = kitQuery.data;
  const tagMeta = (key: string) => kit?.tags.find((t) => t.key === key);
  const tagsMutation = useMutation({
    mutationFn: (tags: string[]) => { if (!tenantId || !activeId) throw new Error(ui.missingConversation); return saveTags({ data: { tenantId, conversationId: activeId, tags } }); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-thread", tenantId, activeId] });
      qc.invalidateQueries({ queryKey: ["inbox", tenantId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const slashMatch = draft.match(/(?:^|\s)\/([a-z0-9_]*)$/i);
  const slashOptions = slashMatch && kit ? kit.quickReplies.filter((q) => q.shortcut.startsWith(slashMatch[1].toLowerCase())) : [];
  const applyQuick = (shortcut: string) => {
    const base = draft.replace(/\/[a-z0-9_]*$/i, "/" + shortcut);
    const out = expandShortcut(base, kit?.quickReplies ?? []);
    if (out !== null) setDraft(out.replace(/\{project\}/g, "dự án"));
  };

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["inbox", tenantId] });
    void qc.invalidateQueries({ queryKey: ["inbox-thread", tenantId, activeId] });
  };

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!tenantId || !activeId) throw new Error("Chưa chọn hội thoại");
      const fallback = replyChannel(threadQuery.data?.conversation.channel ?? "note");
      const channelToUse = sendChannel === "auto" ? fallback : sendChannel;
      return send({
        data: {
          tenantId,
          conversationId: activeId,
          body: draft.trim(),
          channel: channelToUse as "web_chat" | "zalo" | "messenger" | "note" | "sms" | "email",
          ...(channelToUse === "email" ? { subject: emailSubject } : {}),
        },
      });
    },
    onSuccess: (result) => {
      if (result.status === "sent") setDraft("");
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
  const visibleItems = unreadOnly ? items.filter(item => item.unread > 0) : items;
  const thread = threadQuery.data;
  const timeline = useMemo(() => thread?.messages ?? [], [thread]);
  useEffect(() => { const area = messageArea.current; if (area) area.scrollTop = area.scrollHeight; }, [activeId, timeline.length]);
  const selectedChannel = sendChannel === "auto" ? replyChannel(thread?.conversation.channel ?? "note") : sendChannel;
  const connection = channelsQuery.data?.connections.find(c => c.channel === selectedChannel);
  const channelBlocked = !canSendPendingChannel(selectedChannel) || (["zalo", "messenger"].includes(selectedChannel) && (!connection?.configured || !connection.enabled));
  const messengerLast = thread?.conversation.identities.find(i => i.channel === "messenger")?.last_inbound_at ?? null;
  const windowBlocked = selectedChannel === "messenger" && !messengerWindowOpen(messengerLast);

  const openSettings = () => {
    setConfig(channelsQuery.data?.config ?? DEFAULT_CHANNEL_SETTINGS);
    setSettingsOpen(true);
  };

  return (
    <div className="omni-inbox relative min-w-0">
      <header className="mb-3 flex min-h-9 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <MessagesSquare className="size-5 shrink-0 text-primary" />
          <h1 className="truncate text-lg font-semibold">{t.title}</h1>
          <span className="hidden text-xs text-muted-foreground sm:inline">{listQuery.data?.unreadTotal ?? 0} {ui.unread.toLowerCase()}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Popover><PopoverTrigger asChild><Button size="sm" variant="ghost" aria-label={ui.connections}><Radio className="size-4" /><span className="hidden sm:inline">{ui.channels}</span></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-80 max-w-[calc(100vw-32px)] p-3">
              <p className="mb-3 text-sm font-semibold">{ui.connections}</p>
              <div className="space-y-3" aria-label={t.channelStatus}>
                {channelsQuery.data?.connections.map(c => <div key={c.channel} className="flex items-start gap-2"><span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${c.configured && c.enabled && c.verified ? "bg-success" : "bg-muted-foreground"}`} /><div className="min-w-0"><p className="text-xs font-medium">{CHANNEL_LABEL[c.channel]}</p><p className="text-[11px] text-muted-foreground">{!c.configured ? t.disconnected : !c.enabled ? t.disabled : c.verified ? t.connected : t.configured} · {c.channel === "sms" || c.channel === "email" ? t.outboundOnly : t.twoWay}</p></div></div>)}
                {PENDING_INBOX_CHANNELS.map(c => <div key={c.channel} className="flex items-start gap-2" title={c.reason}><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" /><div><p className="text-xs font-medium">{c.label}</p><p className="text-[11px] text-muted-foreground">{t.disconnected} · {t.notActivated}</p></div></div>)}
              </div>
            </PopoverContent>
          </Popover>
          {channelsQuery.data?.canManage && <Button size="icon" variant="ghost" onClick={openSettings} title={t.settings} aria-label={t.settings}><Settings2 className="size-4" /></Button>}
        </div>
      </header>
      <div className="omni-workspace relative flex min-w-0 overflow-hidden rounded-lg border border-border bg-card" data-testid="inbox-workspace">
        <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-border md:w-72 xl:w-80`} aria-label={ui.conversations}>
          <div className="shrink-0 space-y-2.5 border-b border-border p-3">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">{ui.conversations} <span className="ml-1 text-xs font-normal text-muted-foreground">{items.length}</span></h2>
              <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className={`size-8 ${tagFilter ? "text-primary" : "text-muted-foreground"}`} aria-label={ui.tags} title={ui.tags}><ListFilter /></Button></PopoverTrigger><PopoverContent align="start" className="w-60 p-1"><Button variant="ghost" className="w-full justify-start" onClick={() => setTagFilter("")}>{ui.noTag}</Button>{kit?.tags.map(tag => <Button key={tag.key} variant="ghost" className={`w-full justify-start ${tagFilter === tag.key ? "text-primary" : ""}`} onClick={() => setTagFilter(tagFilter === tag.key ? "" : tag.key)}><span className={`size-2 rounded-full ${TAG_DOT[tag.tone] ?? "bg-muted-foreground"}`} />{tag.label}</Button>)}</PopoverContent></Popover>
            </div>
            <div className="relative"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={ui.search} className="h-9 rounded-md bg-muted/40 pl-9 text-xs" /></div>
            <div className="flex gap-1 rounded-md bg-muted/60 p-1" aria-label={ui.conversations}>
              <Button size="sm" variant="ghost" className={`h-7 flex-1 ${!unreadOnly ? "bg-card shadow-sm" : "text-muted-foreground"}`} onClick={() => setUnreadOnly(false)} aria-pressed={!unreadOnly}>{ui.all}</Button>
              <Button size="sm" variant="ghost" className={`h-7 flex-1 ${unreadOnly ? "bg-card shadow-sm" : "text-muted-foreground"}`} onClick={() => setUnreadOnly(true)} aria-pressed={unreadOnly}>{ui.unread}<span className="text-[10px]">{listQuery.data?.unreadTotal ?? 0}</span></Button>
            </div>
            <Select value={channel} onValueChange={setChannel}><SelectTrigger className="h-8 border-0 bg-transparent px-1 text-xs shadow-none" aria-label={ui.channels}><SelectValue /></SelectTrigger><SelectContent>{CHANNEL_FILTERS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select>
            {tagFilter && <Button size="sm" variant="secondary" className="h-6 text-[11px]" onClick={() => setTagFilter("")}>{tagMeta(tagFilter)?.label}<X className="size-3" /></Button>}
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin" data-testid="inbox-list">
            {listQuery.isLoading ? <li className="py-12 text-center text-xs text-muted-foreground">{ui.loading}</li> : visibleItems.length === 0 ? <li className="flex flex-col items-center gap-3 px-4 py-16 text-xs text-muted-foreground"><Inbox className="size-8 stroke-1 opacity-50" />{ui.empty}</li> : visibleItems.map(item => <li key={item.id}>
              <Button variant="ghost" onClick={() => { setActiveId(item.id); setDraft(""); setSendChannel("auto"); setDetailsOpen(false); }} className={`h-auto w-full justify-start gap-3 whitespace-normal rounded-none border-b border-border/50 px-3 py-3 text-left text-foreground hover:bg-muted/60 hover:text-foreground ${activeId === item.id ? "bg-primary-soft hover:bg-primary-soft" : ""}`} aria-pressed={activeId === item.id} data-testid="inbox-conversation">
                <div className="relative shrink-0"><span className="flex size-10 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{initials(item.name)}</span><ChannelGlyph channel={item.channel} className="absolute -bottom-1 -right-1 size-5 border-2 border-card shadow-sm" /></div>
                <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-semibold">{item.name}</p><time className="shrink-0 text-[10px] font-normal text-muted-foreground">{new Date(item.lastAt).toLocaleDateString("vi-VN", {day: "2-digit", month: "2-digit"})}</time></div><div className="mt-1 flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-xs font-normal text-muted-foreground">{item.preview ?? "—"}</p>{item.unread > 0 && <span className="grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{item.unread}</span>}</div><p className="mt-1 truncate text-[10px] font-normal text-muted-foreground">{CHANNEL_LABEL[item.channel] ?? item.channel}{item.projectName ? ` · ${item.projectName}` : ""}</p>{item.tags?.length ? <div className="mt-1 flex flex-wrap gap-1">{item.tags.map(key => { const meta = tagMeta(key); return meta ? <span key={key} className={`rounded px-1 text-[10px] ${TAG_TONE[meta.tone]}`}>{meta.label}</span> : null; })}</div> : null}</div>
              </Button>
            </li>)}
          </ul>
        </aside>
        <section className={`${activeId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`} aria-label={ui.messages}>
          {!thread ? <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-muted-foreground"><div className="grid size-20 place-items-center rounded-full bg-muted/50"><MessagesSquare className="size-9 stroke-1 text-primary" /></div><h2 className="text-sm font-medium text-foreground">{activeId && threadQuery.isLoading ? ui.loading : ui.select}</h2>{activeId && <Button size="sm" variant="ghost" className="md:hidden" onClick={() => setActiveId(null)}><ArrowLeft />{ui.back}</Button>}</div> : <>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-3 md:px-4">
              <Button size="icon" variant="ghost" className="shrink-0 md:hidden" aria-label={ui.back} onClick={() => setActiveId(null)}><ArrowLeft /></Button>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">{initials(thread.conversation.name)}</span>
              <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold">{thread.conversation.name}</h2><p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground"><ChannelGlyph channel={thread.conversation.channel} className="size-3.5" /><span className="truncate">{CHANNEL_LABEL[thread.conversation.channel] ?? thread.conversation.channel}{thread.conversation.phone ? ` · ${thread.conversation.phone}` : ""}</span></p></div>
              {thread.conversation.phone && <Button variant="ghost" size="icon" title={ui.call} aria-label={ui.call} onClick={() => { const phone = thread.conversation.phone; if (phone) callMutation.mutate(phone); }} disabled={callMutation.isPending}><PhoneCall /></Button>}
              <Button variant="ghost" size="icon" aria-label={ui.customer} title={ui.customer} aria-pressed={detailsOpen} className={detailsOpen ? "bg-primary-soft text-primary" : ""} onClick={() => setDetailsOpen(!detailsOpen)}><PanelRight /></Button>
            </header>
            {thread.conversation.needsIdentityReview && <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-warning/10 px-4 py-1.5 text-[11px] text-warning"><span>{t.review}</span><Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => setLinkOpen(true)}>{t.link}</Button></div>}
            <div ref={messageArea} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-muted/20 p-4 scrollbar-thin" data-testid="inbox-messages">
              {timeline.length === 0 ? <p className="py-10 text-center text-xs text-muted-foreground">{ui.noMessages}</p> : timeline.map(message => <div key={message.id} className={`flex flex-col ${message.direction === "out" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[90%] rounded-lg px-3 py-2.5 text-sm shadow-sm sm:max-w-[78%] ${message.channel === "note" ? "border border-dashed border-warning bg-warning/10 text-foreground" : message.direction === "out" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-card text-card-foreground"}`}>
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-medium opacity-80"><ChannelGlyph channel={message.channel} className={`size-3 ${message.direction === "out" && !isBrandChannel(message.channel) && message.channel !== "note" ? "bg-primary-foreground/20! text-primary-foreground!" : ""}`} />{message.channel === "note" ? ui.note : CHANNEL_LABEL[message.channel] ?? message.channel}{message.sender_name ? ` · ${message.sender_name}` : ""}</p>
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.body}</p>
                  {message.attachment_url && (message.channel === "call" ? <audio controls src={message.attachment_url} className="mt-2 max-w-full" /> : <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-2 block underline">{ui.attachment}</a>)}
                </div>
                <p className="mt-1 max-w-full text-[10px] text-muted-foreground">{timeLabel(message.created_at)}{message.direction === "out" ? ` · ${({ sent: t.sent, pending: t.pending, failed: t.failed, delivered: t.delivered, read: t.read } as Record<string, string>)[message.delivery_status] ?? message.delivery_status}` : ""}{message.error_message ? ` · ${message.error_message}` : ""}</p>
              </div>)}
            </div>
            <div className="relative shrink-0 border-t border-border bg-card p-3 pr-16" data-testid="inbox-composer">
              <div className="mb-2 flex items-center justify-between gap-2"><Select value={sendChannel} onValueChange={setSendChannel}><SelectTrigger className="h-7 w-auto max-w-full gap-2 border-0 bg-transparent px-1 text-xs shadow-none" aria-label={ui.reply}><SelectValue /></SelectTrigger><SelectContent>{SEND_CHANNELS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
                {kit?.quickReplies.length ? <Popover><PopoverTrigger asChild><Button size="icon" variant="ghost" className="size-7" title={ui.quick} aria-label={ui.quick}><Zap /></Button></PopoverTrigger><PopoverContent align="end" className="max-h-64 w-80 max-w-[calc(100vw-32px)] overflow-y-auto p-1">{kit.quickReplies.map(q => <Button key={q.shortcut} variant="ghost" className="h-auto w-full flex-col items-start gap-1 whitespace-normal py-2 text-left" onClick={() => setDraft(q.text.replace(/\{project\}/g, "dự án"))}><span className="text-xs text-primary">/{q.shortcut}</span><span className="line-clamp-2 text-xs text-muted-foreground">{q.text}</span></Button>)}</PopoverContent></Popover> : null}
              </div>
              {(selectedChannel === "sms" || selectedChannel === "email") && <p role="status" className="mb-2 text-[11px] text-muted-foreground">{t.outboundOnly} · {!connection?.configured ? t.disconnected : !connection.enabled ? t.disabled : connection.verified ? t.connected : t.configured}</p>}
              {(channelBlocked || windowBlocked) && <p role="status" className="mb-2 text-[11px] text-warning">{channelBlocked ? t.notConnected : t.windowClosed}</p>}
              {sendChannel === "email" && <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder={ui.emailSubject} className="mb-2 h-8 text-xs" />}
              {slashOptions.length > 0 && <div className="absolute bottom-full left-3 right-3 mb-1 rounded-md border border-border bg-popover p-1 shadow-soft">{slashOptions.slice(0, 6).map(q => <Button key={q.shortcut} variant="ghost" className="h-auto w-full justify-start py-2 text-xs" onClick={() => applyQuick(q.shortcut)}><span className="text-primary">/{q.shortcut}</span><span className="truncate text-muted-foreground">{q.text}</span></Button>)}</div>}
              <div className="flex items-end gap-2"><Textarea value={draft} onKeyDown={e => { if ((e.key === "Tab" || e.key === "Enter") && slashOptions.length > 0) { e.preventDefault(); applyQuick(slashOptions[0].shortcut); } }} onChange={e => setDraft(e.target.value)} rows={2} placeholder={sendChannel === "note" ? ui.noteDraft : sendChannel === "sms" ? ui.smsDraft : ui.draft} className="max-h-32 min-h-16 resize-none rounded-md border-0 bg-muted/40 text-sm shadow-none" /><Button size="icon" className="mb-1 shrink-0" title={ui.send} aria-label={ui.send} onClick={() => sendMutation.mutate()} disabled={!draft.trim() || sendMutation.isPending || channelBlocked || windowBlocked}><Send /></Button></div>
            </div>
          </>}
        </section>
        {thread && detailsOpen && <aside className="absolute inset-y-0 right-0 z-20 flex w-full flex-col bg-card md:w-64 md:border-l md:border-border xl:static xl:shrink-0" aria-label={ui.customer}>
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4"><h2 className="text-sm font-semibold">{ui.customer}</h2><Button variant="ghost" size="icon" aria-label={ui.close} onClick={() => setDetailsOpen(false)}><X /></Button></div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-xs">
            <div className="flex flex-col items-center gap-2 py-2"><span className="grid size-14 place-items-center rounded-full bg-secondary text-lg font-semibold">{initials(thread.conversation.name)}</span><p className="text-center text-sm font-semibold">{thread.conversation.name}</p><Badge variant="outline" className="gap-1 text-[10px]"><ChannelGlyph channel={thread.conversation.channel} className="size-3" />{CHANNEL_LABEL[thread.conversation.channel] ?? thread.conversation.channel}</Badge></div>
            <div><p className="mb-1 text-muted-foreground">{ui.phone}</p>{thread.conversation.phone ? <a href={`tel:${thread.conversation.phone}`} className="font-medium">{thread.conversation.phone}</a> : <p>{ui.noPhone}</p>}</div>
            <div><p className="mb-1 text-muted-foreground">{ui.project}</p><p>{items.find(i => i.id === activeId)?.projectName ?? ui.noProject}</p></div>
            <div className="space-y-2">{thread.conversation.leadId && <Button asChild size="sm" variant="outline" className="w-full"><Link to="/leads" search={{ lead: thread.conversation.leadId }}><UserRound />{ui.profile}</Link></Button>}<Button size="sm" variant="ghost" className="w-full" onClick={() => setLinkOpen(true)}>{t.link}</Button></div>
            {kit?.tags.length ? <div><p className="mb-2 text-muted-foreground">{ui.tags}</p><div className="flex flex-wrap gap-1.5" aria-label={ui.tags}>{kit.tags.map(tag => { const on = thread.conversation.tags.includes(tag.key); return <Button key={tag.key} size="sm" variant="outline" disabled={tagsMutation.isPending} onClick={() => tagsMutation.mutate(on ? thread.conversation.tags.filter(x => x !== tag.key) : [...thread.conversation.tags, tag.key])} className={`h-7 px-2 text-[11px] ${on ? TAG_TONE[tag.tone] : "border-dashed text-muted-foreground"}`}>{on ? <Check className="size-3" /> : <Plus className="size-3" />}{tag.label}</Button>; })}</div></div> : null}
            {thread.calls.length > 0 && <div><p className="mb-2 font-medium">{ui.calls}</p><ul className="divide-y divide-border">{thread.calls.map(item => <li key={item.id} className="py-3"><p className="font-medium">{item.phone ?? "—"}</p><p className="mt-1 text-[10px] text-muted-foreground">{timeLabel(item.started_at)} · {formatDuration(item.duration_seconds)}</p>{item.notes && <p className="mt-1 text-muted-foreground">{item.notes}</p>}{item.recording_url ? <audio controls src={item.recording_url} className="mt-2 w-full" /> : <p className="mt-1 text-[10px] text-muted-foreground">{ui.noRecording}</p>}</li>)}</ul></div>}
          </div>
        </aside>}
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}><DialogContent><DialogHeader><DialogTitle>{t.link}</DialogTitle></DialogHeader><Input placeholder="Tìm hồ sơ theo tên hoặc SĐT" value={leadSearch} onChange={e => setLeadSearch(e.target.value)} /><div className="max-h-72 space-y-1 overflow-y-auto">{choices.data?.map(l => <Button key={l.id} variant="ghost" className="h-auto w-full justify-start py-3" disabled={linkMutation.isPending} onClick={() => linkMutation.mutate(l.id)}>{l.full_name} · {l.phone ?? "—"}</Button>)}</div></DialogContent></Dialog>
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
            {tenantId && <ChatConnections tenantId={tenantId} config={config} onConfigChange={setConfig} />}
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
                Khoá Zalo OA được lưu qua ô bảo mật ở phía trên.
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
