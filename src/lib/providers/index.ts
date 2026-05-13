// Provider factory. Returns the implementation selected by env vars.
// Implementations live in sibling files; this file is the single import
// point used by app code so vendor swaps stay zero-diff outside this folder.
//
// IMPORTANT: do not import vendor SDKs at the top of this file — keep them
// inside the per-provider modules so unused vendors are not bundled.

import type { AIProvider } from "./ai";
import type { EmailProvider } from "./email";
import type { SMSProvider } from "./sms";
import type { StorageProvider } from "./storage";
import type { ZaloProvider } from "./zalo";

let _storage: StorageProvider | undefined;
let _email: EmailProvider | undefined;
let _sms: SMSProvider | undefined;
let _zalo: ZaloProvider | undefined;
let _ai: AIProvider | undefined;

export async function getStorage(): Promise<StorageProvider> {
  if (_storage) return _storage;
  const p = process.env.STORAGE_PROVIDER ?? "s3";
  switch (p) {
    case "s3":    _storage = (await import("./storage.s3")).create();    break;
    case "local": _storage = (await import("./storage.local")).create(); break;
    default: throw new Error(`Unknown STORAGE_PROVIDER: ${p}`);
  }
  return _storage;
}

export async function getEmail(): Promise<EmailProvider> {
  if (_email) return _email;
  const p = process.env.EMAIL_PROVIDER ?? "smtp";
  switch (p) {
    case "smtp":     _email = (await import("./email.smtp")).create();     break;
    case "resend":   _email = (await import("./email.resend")).create();   break;
    case "sendgrid": _email = (await import("./email.sendgrid")).create(); break;
    case "lovable":  _email = (await import("./email.lovable")).create();  break;
    default: throw new Error(`Unknown EMAIL_PROVIDER: ${p}`);
  }
  return _email;
}

export async function getSMS(): Promise<SMSProvider> {
  if (_sms) return _sms;
  const p = process.env.SMS_PROVIDER ?? "noop";
  switch (p) {
    case "twilio":   _sms = (await import("./sms.twilio")).create();   break;
    case "esms":     _sms = (await import("./sms.esms")).create();     break;
    case "vietguys": _sms = (await import("./sms.vietguys")).create(); break;
    case "noop":     _sms = (await import("./sms.noop")).create();     break;
    default: throw new Error(`Unknown SMS_PROVIDER: ${p}`);
  }
  return _sms;
}

export async function getZalo(): Promise<ZaloProvider> {
  if (_zalo) return _zalo;
  const p = process.env.ZALO_PROVIDER ?? "noop";
  switch (p) {
    case "zns":  _zalo = (await import("./zalo.zns")).create();  break;
    case "noop": _zalo = (await import("./zalo.noop")).create(); break;
    default: throw new Error(`Unknown ZALO_PROVIDER: ${p}`);
  }
  return _zalo;
}

export async function getAI(): Promise<AIProvider> {
  if (_ai) return _ai;
  const p = process.env.AI_PROVIDER ?? "lovable";
  switch (p) {
    case "lovable":      _ai = (await import("./ai.lovable")).create();      break;
    case "openai":       _ai = (await import("./ai.openai")).create();       break;
    case "gemini":       _ai = (await import("./ai.gemini")).create();       break;
    case "anthropic":    _ai = (await import("./ai.anthropic")).create();    break;
    case "ollama":       _ai = (await import("./ai.ollama")).create();       break;
    default: throw new Error(`Unknown AI_PROVIDER: ${p}`);
  }
  return _ai;
}
