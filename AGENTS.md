
- Bank reconciliation: webhook /api/public/bank-webhook auths by hashed per-tenant key in settings key "bank"; matching/allocation logic lives in src/lib/bank-recon.ts (pure, tested) so webhook and manual match share it.
