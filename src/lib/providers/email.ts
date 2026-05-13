export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
  attachments?: Array<{ filename: string; content: Uint8Array; contentType?: string }>;
}
export interface EmailProvider {
  send(msg: EmailMessage): Promise<{ id: string }>;
}
