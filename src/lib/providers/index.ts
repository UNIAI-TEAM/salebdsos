// Provider factory. Returns the implementation selected by env vars.
//
// Concrete vendor modules are added incrementally (see ./STUBS.md).
// Until a vendor module exists, requesting it throws a clear error so the
// missing piece is surfaced at runtime rather than silently bundled.
//
// Add a new provider by:
//   1. Creating ./<kind>.<vendor>.ts that exports `create(): <Kind>Provider`
//   2. Adding a case in the corresponding loader below
//
// Vendor SDKs MUST be imported only inside the per-provider modules so unused
// vendors are not pulled into the bundle.

import type { AIProvider } from "./ai";
import type { EmailProvider } from "./email";
import type { SMSProvider } from "./sms";
import type { StorageProvider } from "./storage";
import type { ZaloProvider } from "./zalo";

type Loader<T> = () => Promise<{ create: () => T }>;

async function resolve<T>(
  kind: string,
  envVar: string,
  fallback: string,
  loaders: Record<string, Loader<T>>,
): Promise<T> {
  const choice = (process.env[envVar] ?? fallback).toLowerCase();
  const loader = loaders[choice];
  if (!loader) {
    throw new Error(
      `[providers] ${kind}: ${envVar}="${choice}" is not implemented yet. ` +
        `Available: ${Object.keys(loaders).join(", ") || "(none)"}. ` +
        `See src/lib/providers/STUBS.md`,
    );
  }
  const mod = await loader();
  return mod.create();
}

let _storage: StorageProvider | undefined;
let _email: EmailProvider | undefined;
let _sms: SMSProvider | undefined;
let _zalo: ZaloProvider | undefined;
let _ai: AIProvider | undefined;

export async function getStorage(): Promise<StorageProvider> {
  if (!_storage) {
    _storage = await resolve<StorageProvider>("storage", "STORAGE_PROVIDER", "s3", {
      // Add when implemented:
      // s3:    () => import("./storage.s3"),
      // local: () => import("./storage.local"),
    });
  }
  return _storage;
}

export async function getEmail(): Promise<EmailProvider> {
  if (!_email) {
    _email = await resolve<EmailProvider>("email", "EMAIL_PROVIDER", "smtp", {
      // smtp:     () => import("./email.smtp"),
      // resend:   () => import("./email.resend"),
      // sendgrid: () => import("./email.sendgrid"),
      // lovable:  () => import("./email.lovable"),
    });
  }
  return _email;
}

export async function getSMS(): Promise<SMSProvider> {
  if (!_sms) {
    _sms = await resolve<SMSProvider>("sms", "SMS_PROVIDER", "noop", {
      // twilio:   () => import("./sms.twilio"),
      // esms:     () => import("./sms.esms"),
      // vietguys: () => import("./sms.vietguys"),
      // noop:     () => import("./sms.noop"),
    });
  }
  return _sms;
}

export async function getZalo(): Promise<ZaloProvider> {
  if (!_zalo) {
    _zalo = await resolve<ZaloProvider>("zalo", "ZALO_PROVIDER", "noop", {
      // zns:  () => import("./zalo.zns"),
      // noop: () => import("./zalo.noop"),
    });
  }
  return _zalo;
}

export async function getAI(): Promise<AIProvider> {
  if (!_ai) {
    _ai = await resolve<AIProvider>("ai", "AI_PROVIDER", "lovable", {
      // lovable:   () => import("./ai.lovable"),
      // openai:    () => import("./ai.openai"),
      // gemini:    () => import("./ai.gemini"),
      // anthropic: () => import("./ai.anthropic"),
      // ollama:    () => import("./ai.ollama"),
    });
  }
  return _ai;
}
