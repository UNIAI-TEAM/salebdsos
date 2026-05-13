# Provider Implementation Stubs

Only the **interfaces** and **factory** are committed here to keep the
on-prem refactor non-breaking. Concrete implementations are added per
provider as they are needed.

Suggested order of implementation:

1. `storage.s3.ts` — wraps `@aws-sdk/client-s3` (works for AWS, MinIO, R2, Wasabi)
2. `email.smtp.ts` — wraps `nodemailer`
3. `ai.openai.ts` — fetch-based, no SDK
4. `ai.lovable.ts` — wraps current Lovable AI Gateway calls
5. `sms.esms.ts` — Vietnam-first SMS (eSMS.vn HTTP API)
6. `zalo.zns.ts` — Zalo ZNS template send
7. Remaining vendors

Each file exports a single `create(): Provider` function called by the factory.
Keep all vendor SDK imports inside these files so unused providers never enter
the bundle.

Reference call sites to migrate:
- `supabase/functions/ai-followup-generate/index.ts` → `getAI().chat(...)`
- `src/lib/lead-score.functions.ts` (`explainLeadScoreAI`) → `getAI().chat(...)`
- Any direct `supabase.storage.from(...).upload(...)` → `getStorage().putObject(...)`
- Future email/SMS/Zalo send actions in `ai_followups` flow → `getEmail/SMS/Zalo()`
