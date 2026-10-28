import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock('./omnichannel.server', () => ({ signatureEquals: (a: string, b: string) => a === b }));
import { checkTelegramWebhook, telegramWebhookUrl, telegramCall, telegramCredentials, sendTelegramMessage } from './telegram.server';
const fetchMock = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('TELEGRAM_API_KEY', 'test-connection'); vi.stubEnv('LOVABLE_API_KEY', 'test-gateway');
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function setup(binding: unknown, conv: unknown = { lead_id: 'lead' }, identities: unknown[] = [{ external_user_id: '42' }]) {
  mocks.from.mockImplementation((table: string) => {
    const q: Record<string, unknown> = {};
    for (const method of ['select', 'eq']) q[method] = vi.fn(() => q);
    q.maybeSingle = vi.fn(async () => ({ data: binding, error: null }));
    q.single = vi.fn(async () => ({ data: conv, error: null }));
    q.limit = vi.fn(async () => ({ data: identities, error: null }));
    return q;
  });
}
describe('Telegram delivery safeguards', () => {
  it('accepts only the public auth gate, never a 404 or redirect', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));
    await expect(checkTelegramWebhook('https://example.com/api/public/telegram/webhook')).resolves.toBeUndefined();
    for (const status of [404, 302, 200, 503]) {
      fetchMock.mockResolvedValueOnce(new Response('', { status }));
      await expect(checkTelegramWebhook('https://example.com/api/public/telegram/webhook')).rejects.toThrow(`[${status}]`);
    }
  });
  it('builds the configured HTTPS public address and rejects unsafe origins', () => {
    vi.stubEnv('TELEGRAM_PUBLIC_ORIGIN', 'https://salebdsos.lovable.app');
    expect(telegramWebhookUrl()).toBe('https://salebdsos.lovable.app/api/public/telegram/webhook');
    vi.stubEnv('TELEGRAM_PUBLIC_ORIGIN', 'http://example.com');
    expect(() => telegramWebhookUrl()).toThrow();
  });
  it('returns a confirmed Telegram message ID to the inbox', async () => {
    setup({ bot_id: 'bot', key_digest: telegramCredentials().digest });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, result: { message_id: 123 } })));
    expect(await sendTelegramMessage('tenant', 'conversation', 'Kiểm thử')).toEqual({ status: 'sent', externalId: '123', error: null });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ chat_id: '42', text: 'Kiểm thử' });
  });
  it('blocks missing or mismatched tenant bindings without sending', async () => {
    for (const binding of [null, { bot_id: 'bot', key_digest: 'wrong' }]) {
      setup(binding);
      await expect(sendTelegramMessage('tenant', 'conversation', 'Test')).rejects.toThrow();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('blocks a missing conversation or ambiguous customer without sending', async () => {
    const binding = { bot_id: 'bot', key_digest: telegramCredentials().digest };
    setup(binding, null);
    await expect(sendTelegramMessage('tenant', 'missing', 'Test')).rejects.toThrow();
    setup(binding, { lead_id: 'lead' }, [{ external_user_id: '42' }, { external_user_id: '43' }]);
    await expect(sendTelegramMessage('tenant', 'conversation', 'Test')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('surfaces Telegram rejection rather than claiming success', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: false, error_code: 403, description: 'bot was blocked by the user' }), { status: 403 }));
    await expect(telegramCall('sendMessage', {})).rejects.toThrow('[403/403]: bot was blocked by the user');
  });
});