# VoltaicOS security operations

## Required production variables

Set these in the hosting provider, never in source control or `VITE_*` variables:

- `NODE_ENV=production`
- `SESSION_SECRET` — at least 32 random bytes, rotated deliberately
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGINS` — comma-separated HTTPS origins for the deployed frontend only
- `ADMIN_EMAILS` — comma-separated authorized admin emails
- `DB_BACKUP_DIR` and `DB_BACKUP_RETENTION_DAYS` when using the JSON fallback
- `ALERT_WEBHOOK_URL` for critical-failure notifications (optional)

Do not put service-role keys, database passwords, session secrets, or webhook URLs in `VITE_*`, `NEXT_PUBLIC_*`, `src/`, or `public/`. If a secret was ever committed, revoke/rotate it at the provider before removing it from git.

## HTTPS and CORS

The API rejects plain HTTP in production and emits HSTS. Terminate TLS at the load balancer/Vercel, forward `X-Forwarded-Proto: https`, and redirect HTTP to HTTPS at the edge. The API does not redirect unsafe POST requests.

Set `CORS_ORIGINS=https://your-real-domain.example` (and any explicitly approved admin frontend origin). Requests with another browser `Origin` are rejected. CORS is not authentication; every private route still validates its Bearer token.

## Database backups

The long-running Node server schedules a daily JSON backup and retains 14 days by default. For Vercel/serverless, configure a provider cron to run:

```sh
npm run db:backup
```

Backups must be encrypted, access-controlled, and copied to durable external storage in production. The local JSON database is a development fallback only; use Supabase/Postgres with the RLS migration for production.

## Blue/green release runbook

1. Build a new immutable release and set a unique `RELEASE_ID`.
2. Deploy it to the green target with the same production env/secrets.
3. Check `/health` and run smoke tests against green, including an authenticated user route and an admin-denied route.
4. Shift the load balancer/Vercel alias to green atomically.
5. Monitor 5xx logs, rate-limit responses, latency, and the critical alert channel.
6. Roll back the alias to blue immediately if health or error-rate thresholds fail; keep blue available until green is stable.

The app exposes `RELEASE_ID` in structured startup/health data so the active target can be identified during a rollback.
