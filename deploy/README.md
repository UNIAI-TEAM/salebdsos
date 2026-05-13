# UNICOM NFC Platform — On-Premise Deployment Guide

This folder contains everything required to run the platform **without** Lovable Cloud,
on your own infrastructure (bare metal, VM, Kubernetes, or Docker Compose).

> The codebase still runs unchanged on Lovable Cloud. On-prem mode is enabled
> purely through environment variables and provider selection — no code fork.

## Contents

| Path | Purpose |
|------|---------|
| `.env.example` | Full list of environment variables |
| `docker/docker-compose.yml` | Single-host deployment (app + Postgres + MinIO + Redis) |
| `docker/Dockerfile` | Production image for the TanStack Start app |
| `docker/Caddyfile` | Reverse proxy + automatic HTTPS |
| `scripts/migrate.sh` | Apply SQL migrations in order |
| `scripts/backup.sh` | Nightly backup (DB + object storage) |
| `scripts/restore.sh` | Restore from a backup archive |
| `scripts/export-tenant.sh` | Export a single tenant's data as JSON+files |
| `scripts/import-tenant.sh` | Import a tenant export into another instance |
| `CHECKLIST.md` | Step-by-step go-live checklist |
| `BACKUP.md` | Backup/restore strategy + RPO/RTO |
| `DATA-EXPORT.md` | Per-tenant export/import format |
| `PROVIDERS.md` | How to swap Storage / Email / SMS / Zalo / AI providers |

## Quick start (Docker Compose)

```bash
cp deploy/.env.example .env
# edit .env — set POSTGRES_PASSWORD, JWT_SECRET, S3 creds, AI key, SMTP, etc.
docker compose -f deploy/docker/docker-compose.yml up -d
deploy/scripts/migrate.sh
```

App is now on `http://localhost:3000` (front it with Caddy/nginx for HTTPS).

## Architecture in on-prem mode

```
                ┌──────────────┐
   HTTPS  ───►  │   Caddy /    │  ───►  app (TanStack Start, Node 20)
                │   nginx      │            │
                └──────────────┘            ├─► Postgres 15  (data + auth)
                                            ├─► MinIO / S3   (files, brochures, avatars)
                                            ├─► Redis        (cache, rate-limit, queues)
                                            ├─► SMTP relay   (transactional email)
                                            ├─► SMS gateway  (Twilio / eSMS / VietGuys)
                                            ├─► Zalo OA API  (ZNS templates)
                                            └─► AI provider  (Lovable AI / OpenAI / Gemini / local Ollama)
```

All outbound integrations go through **provider abstractions** in
`src/lib/providers/` — switch vendors by changing `*_PROVIDER` env vars,
no code changes.
