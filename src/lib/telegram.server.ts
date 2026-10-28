import { createHash } from 'crypto';
import { signatureEquals } from './omnichannel.server';

export function telegramCredentials() {
  const key = process.env['TELEGRAM_API_KEY'];
  const gateway = process.env['LOVABLE_API_KEY'];
  if (!key || !gateway) throw new Error('Chưa có kết nối Telegram cho dự án.');
  return { key, gateway, digest: createHash('sha256').update(key).digest('hex'), secret: createHash('sha256').update(`telegram-webhook:${key}`).digest('base64url') };
}

export function telegramWebhookUrl() {
  const origin = process.env['TELEGRAM_PUBLIC_ORIGIN'] ?? 'https://project--037ef328-074a-4c9e-8c29-68ffe926410e-dev.lovable.app';
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Địa chỉ Telegram phải là tên miền HTTPS công khai.');
  return `${url.origin}/api/public/telegram/webhook`;
}

export async function checkTelegramWebhook(url: string) {
  // No credential and no customer payload: only the route's auth gate may answer 401.
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', redirect: 'manual', signal: AbortSignal.timeout(10000) });
  if (response.status !== 401) throw new Error(`Địa chỉ nhận Telegram chưa sẵn sàng [${response.status}]. Chưa thay đổi kết nối.`);
}

export async function telegramCall(method: 'getMe' | 'getWebhookInfo' | 'setWebhook' | 'sendMessage', body?: object) {
  const { key, gateway } = telegramCredentials();
  const response = await fetch(`https://connector-gateway.lovable.dev/telegram/${method}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${gateway}`, 'X-Connection-Api-Key': key, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
  });
  const raw = await response.text();
  let payload: { ok?: boolean; description?: string; error_code?: number; result?: { id?: number; username?: string; first_name?: string; message_id?: number; url?: string; pending_update_count?: number; last_error_message?: string } };
  try { payload = JSON.parse(raw); } catch { throw new Error(`Telegram trả về phản hồi không hợp lệ [${response.status}].`); }
  if (!response.ok || payload.ok !== true) {
    // Provider descriptions are useful, but never reflect the gateway credential.
    const detail = (payload.description ?? 'Không có mô tả lỗi.').split(key).join('[ẩn]').split(gateway).join('[ẩn]').slice(0, 500);
    throw new Error(`Telegram từ chối yêu cầu [${response.status}/${payload.error_code ?? response.status}]: ${detail}`);
  }
  return payload.result ?? {};
}

export async function sendTelegramMessage(tenantId: string, conversationId: string, text: string) {
  const { supabaseAdmin: sb } = await import('@/integrations/supabase/client.server');
  const creds = telegramCredentials();
  const { data: binding, error } = await sb.from('telegram_bot_bindings').select('bot_id,key_digest').eq('tenant_id', tenantId).eq('enabled', true).maybeSingle();
  if (error || !binding || !signatureEquals(binding.key_digest, creds.digest)) throw new Error('Telegram chưa được bật cho sàn này.');
  const { data: conv, error: conversationError } = await sb.from('conversations').select('lead_id').eq('tenant_id', tenantId).eq('id', conversationId).single();
  if (conversationError || !conv) throw new Error('Không tìm thấy hội thoại Telegram trong sàn này.');
  let query = sb.from('channel_identities').select('external_user_id').eq('tenant_id', tenantId).eq('channel', 'telegram').eq('account_id', binding.bot_id);
  query = conv?.lead_id ? query.eq('lead_id', conv.lead_id) : query.eq('conversation_id', conversationId);
  const { data: identities, error: identityError } = await query.limit(2);
  if (identityError || identities?.length !== 1) throw new Error('Chưa xác định duy nhất khách Telegram.');
  const result = await telegramCall('sendMessage', { chat_id: identities[0].external_user_id, text });
  if (!result.message_id) throw new Error('Telegram chưa xác nhận gửi tin.');
  return { status: 'sent', externalId: String(result.message_id), error: null };
}