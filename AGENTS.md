
- Bank reconciliation: webhook /api/public/bank-webhook auths by hashed per-tenant key in settings key "bank"; matching/allocation logic lives in src/lib/bank-recon.ts (pure, tested) so webhook and manual match share it.
- Departments reuse teams/team_members (is_lead = department head); scope rules live in src/lib/departments.ts (pure, tested) so every department-scoped server fn shares them.
- Executive AI tools share ai-agent-data safeguards for paginated reads, query failures, owner scoping and bounded history; chat instances are keyed by tenant to prevent cross-tenant conversation context.
