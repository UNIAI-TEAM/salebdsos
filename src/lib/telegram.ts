import { z } from 'zod';

export const telegramUpdateSchema = z.object({
  update_id: z.number().int().nonnegative(),
  message: z.object({
    message_id: z.number().int(),
    chat: z.object({ id: z.number().int(), type: z.string() }),
    from: z.object({ id: z.number().int(), is_bot: z.boolean().optional(), first_name: z.string().max(160).optional() }).optional(),
    text: z.string().max(4096).optional(),
  }).optional(),
});

export function telegramInbound(input: unknown) {
  const update = telegramUpdateSchema.parse(input);
  const message = update.message;
  if (!message || message.chat.type !== 'private' || message.from?.is_bot || !message.text || message.from?.id !== message.chat.id) return null;
  return { userId: String(message.chat.id), eventId: String(update.update_id), body: message.text.slice(0, 2000), name: message.from.first_name ?? 'Khách Telegram' };
}