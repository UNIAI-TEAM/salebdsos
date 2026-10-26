
- Bank reconciliation: webhook /api/public/bank-webhook auths by hashed per-tenant key in settings key "bank"; matching/allocation logic lives in src/lib/bank-recon.ts (pure, tested) so webhook and manual match share it.
- Departments reuse teams/team_members (is_lead = department head); scope rules live in src/lib/departments.ts (pure, tested) so every department-scoped server fn shares them.
- Executive AI tools share ai-agent-data safeguards for paginated reads, query failures, owner scoping and bounded history; chat instances are keyed by tenant to prevent cross-tenant conversation context.
- Shared page headers, KPI cards and section containers offer opt-in compact presentation; list pages use it without changing other screens or business behavior.
- Two-way inbox uses tenant/account-scoped channel_identities and atomic ingest_channel_message for deduplication; webhook signatures and encrypted tenant credentials are required, and customer linking is explicit rather than inferred from message text.
- Channel profile changes use authenticated atomic link_channel_profile; ingestion never guesses profiles from phones or reuses legacy conversations, preventing mixed-customer history and partial links.
