# On-Premise Go-Live Checklist

## 1. Infrastructure
- [ ] Linux host (Ubuntu 22.04+) with ≥4 vCPU / 8 GB RAM / 100 GB SSD
- [ ] DNS A/AAAA records → host
- [ ] Firewall: 80/443 open, 5432/6379/9000 closed to public
- [ ] NTP synced, swap configured, automatic security updates on
- [ ] Docker 24+ and docker-compose-plugin installed

## 2. Secrets
- [ ] All values in `.env` filled (see `.env.example`)
- [ ] `JWT_SECRET`, `SESSION_SECRET`, `BACKUP_PASSPHRASE` are 32+ random bytes
- [ ] DB and MinIO passwords rotated from defaults
- [ ] Secrets stored in vault (Vaultwarden / HashiCorp Vault / 1Password) — not git

## 3. Database
- [ ] PostgreSQL 14+ reachable via `DATABASE_URL`
- [ ] `pgcrypto`, `uuid-ossp`, `citext` extensions enabled
- [ ] `deploy/scripts/migrate.sh` run cleanly
- [ ] Initial owner user + tenant seeded
- [ ] Daily `pg_dump` backup configured (cron → `backup.sh`)

## 4. Object storage
- [ ] Bucket created with lifecycle rules (versioning + 30-day soft delete)
- [ ] CORS configured for `APP_URL`
- [ ] CDN (CloudFront / BunnyCDN / Cloudflare) in front for public assets
- [ ] Service-account credentials least-privilege (single bucket)

## 5. Auth
- [ ] `AUTH_PROVIDER` chosen and tested end-to-end (signup, login, reset)
- [ ] Google OAuth redirect URIs registered (if used)
- [ ] Email verification path verified

## 6. Provider integrations
- [ ] Email: send + receive bounce test
- [ ] SMS: send test to a real Vietnamese number
- [ ] Zalo OA: ZNS template approved + token refresh job scheduled
- [ ] AI: round-trip request + cost monitoring dashboard

## 7. Observability
- [ ] App logs → stdout → Loki/ELK/CloudWatch
- [ ] Metrics → Prometheus (`/metrics` endpoint)
- [ ] Sentry DSN set, source maps uploaded
- [ ] Uptime monitor pinging `/api/public/health`

## 8. Security
- [ ] HTTPS enforced (Caddy auto-TLS or Let's Encrypt)
- [ ] HSTS, CSP, X-Frame-Options headers verified
- [ ] RLS policies present on every tenant-scoped table (run `pnpm tsx scripts/check-rls.ts`)
- [ ] Penetration test report on file
- [ ] PII fields encrypted at rest (Postgres TDE or column-level pgcrypto)

## 9. Backup/restore drill
- [ ] `backup.sh` produces encrypted archive
- [ ] `restore.sh` succeeds on a clean host within RTO target (4 h)
- [ ] Archive shipped off-site (different region/provider)

## 10. Operations
- [ ] Runbook documented (incident response, on-call rotation)
- [ ] CI/CD pipeline pushes immutable image tags
- [ ] Blue/green or rolling deploy strategy in place
- [ ] Maintenance window scheduled monthly
