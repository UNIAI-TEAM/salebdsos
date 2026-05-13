# Backup & Restore Plan

## Targets
| Component | Tool | Frequency | Retention | RPO | RTO |
|---|---|---|---|---|---|
| Postgres | `pg_dump --format=custom` | hourly WAL + nightly full | 30 days local + 90 days off-site | ≤1 h | ≤2 h |
| Object storage | `aws s3 sync` (versioned bucket) | continuous (versioning) + nightly snapshot | 30 days versions | ≤15 min | ≤1 h |
| Secrets/.env | Vault snapshot | on change | indefinite | 0 | minutes |
| Container images | Registry retention | per release | last 10 tags | n/a | minutes |

## Layout
```
/var/backups/unicom/
  20260513T020000Z.tar.gz.gpg     # encrypted, contains db.dump + files/
  20260514T020000Z.tar.gz.gpg
  ...
```

## Cron entry
```
0 2 * * * BACKUP_PASSPHRASE=$(cat /etc/unicom/backup.pass) /opt/unicom/deploy/scripts/backup.sh >> /var/log/unicom-backup.log 2>&1
```

## Off-site replication
Use one of:
- `aws s3 cp` to a different cloud account/region
- `rclone copy` to Backblaze B2 / Wasabi / Storj
- Borg/Restic to a remote SSH host

## Restore drill (quarterly, mandatory)
1. Provision a clean host
2. `BACKUP_PASSPHRASE=… deploy/scripts/restore.sh /path/to/archive.tar.gz.gpg`
3. Boot app pointing at restored DB + bucket
4. Run smoke tests: login, view card, create lead, send AI follow-up
5. Record completion time → must be ≤ RTO

## Point-in-time recovery (Postgres)
Enable WAL archiving:
```ini
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://unicom-wal/%f'
```
Restore: base backup + replay WAL to target timestamp.
