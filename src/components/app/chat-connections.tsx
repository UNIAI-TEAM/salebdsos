import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INBOX_COPY as t, PENDING_INBOX_CHANNELS } from "@/lib/omnichannel";
import { getChatConnectionSetup, saveChatConnection, verifyChatConnection, saveAdditionalConnection, verifyAdditionalConnection } from "@/lib/omnichannel.functions";
import type { ChannelSettings } from "@/lib/channels";

export function ChatConnections({ tenantId, config }: { tenantId: string; config: ChannelSettings }) {
  const qc = useQueryClient();
  const save = useServerFn(saveChatConnection), verify = useServerFn(verifyChatConnection), setup = useServerFn(getChatConnectionSetup);
  const [channel, setChannel] = useState<"zalo" | "messenger" | "telegram" | "whatsapp" | "viber">("zalo");
  const saveAdditional = useServerFn(saveAdditionalConnection), verifyAdditional = useServerFn(verifyAdditionalConnection);
  const additional = channel !== "zalo" && channel !== "messenger";
  const [account, setAccount] = useState(config.zalo.oaId), [appId, setAppId] = useState(config.zalo.appId);
  const [secret, setSecret] = useState(""), [token, setToken] = useState(""), [busy, setBusy] = useState(false);
  const info = useQuery({ queryKey: ["chat-setup", tenantId], queryFn: () => setup({ data: { tenantId } }) });
  const change = (value: typeof channel) => { setChannel(value); setAccount(value === "zalo" ? config.zalo.oaId : value === "messenger" ? config.messenger.pageId : config[value].accountId); setSecret(""); setToken(""); };
  async function run(check: boolean) {
    setBusy(true);
    try {
      if (channel !== "zalo" && channel !== "messenger") {
        if (check) {
          await verifyAdditional({ data: { tenantId, channel } });
          toast.success(t.accountVerified);
        } else {
          await saveAdditional({ data: { tenantId, channel, accountId: account, ...(channel === "viber" && token ? { token } : {}) } });
          setToken(""); toast.success(t.saved);
        }
      } else if (check) {
        const r = await verify({ data: { tenantId, channel } });
        r.ok ? toast.success(t.connected) : toast.warning("Chưa xác minh được tài khoản hoặc đăng ký nhận tin.");
      } else {
        await save({ data: { tenantId, channel, accountId: account, ...(channel === "zalo" ? { appId } : {}), ...(secret ? { secret } : {}), ...(token ? { token } : {}) } });
        setSecret(""); setToken(""); toast.success("Đã lưu bảo mật. Chưa xác minh nhận tin.");
      }
      await qc.invalidateQueries({ queryKey: ["channel-settings", tenantId] });
      await qc.invalidateQueries({ queryKey: ["chat-setup", tenantId] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Không lưu được kết nối"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 border-b border-border pb-4">
    <div className="flex flex-wrap gap-2">{(["zalo", "messenger", "telegram", "whatsapp", "viber"] as const).map(c => <Button key={c} size="sm" variant={channel === c ? "default" : "outline"} onClick={() => change(c)}>{t[c]}</Button>)}</div>
    <div><Label htmlFor="channel-account">{channel === "telegram" ? t.botId : channel === "whatsapp" ? t.phoneNumberId : channel === "viber" ? t.viberUri : t.account}</Label><Input id="channel-account" value={account} onChange={e => setAccount(e.target.value)} /></div>
    {channel === "zalo" && <div><Label>{t.appId}</Label><Input value={appId} onChange={e => setAppId(e.target.value)} /></div>}
    {!additional && <div><Label>{t.secret}</Label><Input type="password" autoComplete="new-password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="••••••••" /></div>}
    {(!additional || channel === "viber") && <div><Label htmlFor="channel-token">{channel === "viber" ? t.botToken : t.token}</Label><Input id="channel-token" type="password" autoComplete="new-password" value={token} onChange={e => setToken(e.target.value)} placeholder="••••••••" /></div>}
    {!additional && <div><Label>{t.webhook}</Label><Input readOnly value={typeof window === "undefined" ? "" : `${window.location.origin}/api/public/${channel === "zalo" ? "zalo-webhook" : "integrations/facebook"}`} /></div>}
    {additional && <div className="space-y-2 text-xs text-muted-foreground"><p>{channel === "viber" ? t.viberSecure : t.secureLinked}</p><p>{t.noWebhook}</p><p role="status">{channel !== "zalo" && channel !== "messenger" && config[channel].accountVerified ? t.accountVerified : t.savedOnly}</p></div>}
    {channel === "messenger" && info.data?.verifyToken && <div><Label>{t.verifyToken}</Label><Input readOnly value={info.data.verifyToken} /></div>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !account} onClick={() => run(false)}>{t.save}</Button><Button variant="outline" disabled={busy} onClick={() => run(true)}>{additional ? t.verifyAccount : t.check}</Button></div>
    <section className="space-y-2 border-t border-border pt-3" aria-label={t.newChannels}>
      <h3 className="text-sm font-semibold">{t.newChannels}</h3>
      {PENDING_INBOX_CHANNELS.map(c => <div key={c.channel} className="space-y-1 border-b border-border py-2 last:border-0">
        <p className="text-sm font-medium">{c.label} · {t.disconnected}</p>
        <p className="text-xs text-muted-foreground">{c.reason}</p>
        {c.channel === "whatsapp" && <p className="text-xs text-muted-foreground">{t.whatsappCosts}</p>}
      </div>)}
      <p className="text-xs text-muted-foreground">{t.setupRequired}</p>
    </section>
  </div>;
}