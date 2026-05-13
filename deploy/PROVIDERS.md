# Provider Abstractions

All external integrations are behind interfaces in `src/lib/providers/`.
Switch vendors by changing env vars — no code change.

## Layout
```
src/lib/providers/
  index.ts          # factory: returns the configured provider per env
  storage.ts        # StorageProvider interface
  storage.s3.ts
  storage.local.ts
  email.ts          # EmailProvider interface
  email.smtp.ts
  email.resend.ts
  email.sendgrid.ts
  email.lovable.ts
  sms.ts            # SMSProvider interface
  sms.twilio.ts
  sms.esms.ts
  sms.vietguys.ts
  zalo.ts           # ZaloProvider interface
  zalo.zns.ts
  zalo.noop.ts
  ai.ts             # AIProvider interface (chat + tools)
  ai.lovable.ts
  ai.openai.ts
  ai.gemini.ts
  ai.anthropic.ts
  ai.ollama.ts
```

## Interfaces (illustrative)

```ts
export interface StorageProvider {
  putObject(key: string, body: Uint8Array | ReadableStream, contentType?: string): Promise<{ url: string }>;
  getObject(key: string): Promise<ReadableStream>;
  signGetUrl(key: string, ttlSeconds: number): Promise<string>;
  signPutUrl(key: string, contentType: string, ttlSeconds: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

export interface EmailProvider {
  send(msg: { to: string; subject: string; html: string; text?: string; replyTo?: string }): Promise<{ id: string }>;
}

export interface SMSProvider {
  send(msg: { to: string; text: string }): Promise<{ id: string }>;
}

export interface ZaloProvider {
  sendZNS(msg: { to: string; templateId: string; data: Record<string,string> }): Promise<{ id: string }>;
}

export interface AIProvider {
  chat(req: {
    model?: string;
    messages: Array<{ role: "system"|"user"|"assistant"|"tool"; content: string; tool_call_id?: string }>;
    tools?: Array<{ type: "function"; function: { name: string; description?: string; parameters: object } }>;
    stream?: boolean;
  }): Promise<{ content: string; toolCalls?: Array<{ name: string; args: any }> }>;
}
```

## Factory
```ts
// src/lib/providers/index.ts
export function getStorage()  { /* switch on STORAGE_PROVIDER */ }
export function getEmail()    { /* switch on EMAIL_PROVIDER */ }
export function getSMS()      { /* switch on SMS_PROVIDER */ }
export function getZalo()     { /* switch on ZALO_PROVIDER */ }
export function getAI()       { /* switch on AI_PROVIDER */ }
```

## Migration from current code
The codebase currently calls Supabase Storage and the Lovable AI Gateway
directly in a few places (followup edge function, sharing functions, lead
score). Refactor each call site to go through the factory:

```ts
// before
import { supabase } from "@/integrations/supabase/client";
await supabase.storage.from("brochures").upload(path, file);

// after
import { getStorage } from "@/lib/providers";
await getStorage().putObject(`brochures/${path}`, file);
```

This refactor is incremental — do one provider per PR, gated by a feature
flag (`STORAGE_PROVIDER=supabase` keeps existing behavior).
