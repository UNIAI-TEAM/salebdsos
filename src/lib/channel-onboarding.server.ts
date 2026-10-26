import { INBOX_COPY as t } from "./omnichannel";
import type { OnboardingChannel } from "./channel-onboarding";

export async function inspectChannelAccount(channel: OnboardingChannel, accountId: string, viberToken?: string | null) {
  let response: Response;
  if (channel === "viber") {
    if (!viberToken) throw new Error(t.viberMissing);
    response = await fetch("https://chatapi.viber.com/pa/get_account_info", {
      method: "POST", headers: { "X-Viber-Auth-Token": viberToken, "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(8000),
    });
  } else {
    const gatewayKey = process.env["LOVABLE_API_KEY"];
    const key = process.env[channel === "telegram" ? "TELEGRAM_API_KEY" : "WHATSAPP_API_KEY"];
    if (!gatewayKey || !key) throw new Error(t.linkedMissing);
    const endpoint = channel === "telegram" ? "getMe" : "phone_number?fields=id,display_phone_number,verified_name";
    response = await fetch(`https://connector-gateway.lovable.dev/${channel}/${endpoint}`, {
      headers: { Authorization: `Bearer ${gatewayKey}`, "X-Connection-Api-Key": key }, signal: AbortSignal.timeout(8000),
    });
  }
  // Never return raw provider errors: they may echo submitted credentials.
  if (!response.ok) throw new Error(`${t.checkFailed} [${response.status}]`);
  const body = await response.json() as { ok?: boolean; status?: number; result?: { id?: number; first_name?: string }; id?: string; uri?: string; name?: string; verified_name?: string };
  const id = channel === "telegram" ? String(body.result?.id ?? "") : String(body.id ?? "");
  const matches = channel === "viber" ? (id === accountId || body.uri === accountId) : id === accountId;
  if (!matches || !id || (channel === "telegram" && body.ok !== true) || (channel === "viber" && body.status !== 0)) throw new Error(t.mismatch);
  return { providerId: id, name: (channel === "telegram" ? body.result?.first_name : body.name ?? body.verified_name)?.slice(0,160) ?? "" };
}