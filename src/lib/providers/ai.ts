export interface AIChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}
export interface AITool {
  type: "function";
  function: { name: string; description?: string; parameters: object };
}
export interface AIChatRequest {
  model?: string;
  messages: AIChatMessage[];
  tools?: AITool[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}
export interface AIChatResponse {
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: unknown }>;
  raw?: unknown;
}
export interface AIProvider {
  chat(req: AIChatRequest): Promise<AIChatResponse>;
  chatStream?(req: AIChatRequest): AsyncIterable<{ delta: string }>;
}
