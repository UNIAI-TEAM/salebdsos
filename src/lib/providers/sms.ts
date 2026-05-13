export interface SMSProvider {
  send(msg: { to: string; text: string; from?: string }): Promise<{ id: string }>;
}
