export interface ZaloProvider {
  sendZNS(msg: { to: string; templateId: string; data: Record<string, string> }): Promise<{ id: string }>;
  sendOAMessage?(msg: { userId: string; text: string }): Promise<{ id: string }>;
}
