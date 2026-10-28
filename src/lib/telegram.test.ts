import { describe, expect, it } from 'vitest';
import { telegramInbound } from './telegram';
describe('Telegram private inbox', () => {
  const message = { message_id: 3, chat: { id: 42, type: 'private' }, from: { id: 42, first_name: 'Khách' }, text: 'Tư vấn đất' };
  it('receives private customer replies with retry event ID', () => expect(telegramInbound({ update_id: 100, message })).toEqual({ userId: '42', eventId: '100', body: 'Tư vấn đất', name: 'Khách' }));
  it('does not import group participants', () => expect(telegramInbound({ update_id: 100, message: { ...message, chat: { id: -1, type: 'group' } } })).toBeNull());
  it('rejects a mismatched sender', () => expect(telegramInbound({ update_id: 100, message: { ...message, from: { id: 99 } } })).toBeNull());
  it('does not ingest bot replies', () => expect(telegramInbound({ update_id: 100, message: { ...message, from: { id: 42, is_bot: true } } })).toBeNull());
});