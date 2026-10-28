import { createFileRoute } from '@tanstack/react-router';
import { telegramInbound } from '@/lib/telegram';

export const Route = createFileRoute('/api/public/telegram/webhook')({
  server: { handlers: { POST: async ({ request }) => {
    const { telegramCredentials, telegramCall } = await import('@/lib/telegram.server');
    const { signatureEquals, receiveChannelMessage } = await import('@/lib/omnichannel.server');
    const creds = telegramCredentials();
    if (!signatureEquals(request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '', creds.secret)) return new Response('Unauthorized', { status: 401 });
    let inbound;
    try { inbound = telegramInbound(await request.json()); } catch { return new Response('Invalid update', { status: 400 }); }
    if (!inbound) return Response.json({ ok: true });
    const { supabaseAdmin: sb } = await import('@/integrations/supabase/client.server');
    const bot = await telegramCall('getMe');
    const { data: bindings, error } = await sb.from('telegram_bot_bindings').select('tenant_id,key_digest').eq('bot_id', String(bot.id)).eq('enabled', true).limit(2);
    const binding = bindings?.length === 1 ? bindings[0] : null;
    if (error || !binding || !signatureEquals(binding.key_digest, creds.digest)) return new Response('Unconfigured', { status: 403 });
    await receiveChannelMessage({ tenantId: binding.tenant_id, channel: 'telegram', accountId: String(bot.id), ...inbound });
    return Response.json({ ok: true });
  } } },
});