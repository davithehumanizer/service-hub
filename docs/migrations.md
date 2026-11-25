# Database migrations

## What changed

`synchronize` was previously `true` on every service, in every environment.
TypeORM was therefore free to `ALTER` and `DROP` columns at boot to make the
database match the entities — the single largest data-loss risk in the stack.

It is now explicit and off by default:

```ts
const synchronize = process.env.TYPEORM_SYNCHRONIZE === 'true';
```

No inference from `NODE_ENV` (docker-compose sets `NODE_ENV: development` on the
api-gateway in production, so keying off it would have left synchronize on), and
no inference from the file extension either: containers run `npm run start:dev`
→ `nest start --watch`, which *compiles to `dist/` and runs the JavaScript*, so
a `__filename.endsWith('.ts')` check silently means "always production" — a
signal that happens to be safe but says the opposite of what it looks like.

To use synchronize while developing locally, set `TYPEORM_SYNCHRONIZE=true` in
that service's `.env`. Anywhere else, schema changes come from migrations.

## Starting from an empty database

The migrations cannot build the schema from nothing: they start from tables
that synchronize created while it was on — `users`, for one, has no migration.
A fresh database therefore needs synchronize on its first start, in every
service that has a database:

```bash
sed -i 's/^# TYPEORM_SYNCHRONIZE=true$/TYPEORM_SYNCHRONIZE=true/' backend/*/.env
```

Without it, repair-monitor-service fails its healthcheck on a missing table
and the api-gateway, which waits for it, never starts.

Once synchronize has built the schema, `typeorm:migrate` passes everywhere but
in devices-service, where `AddUrnToDevicesAndCategories1732012800000` finds its
columns already there and the whole batch rolls back. Locally, keep synchronize
on rather than migrate. Checked on a fresh clone on 2026-11-25.

## Path resolution

Entity and migration globs are resolved from the config file's own location:

```ts
const here = (glob: string) => path.join(__dirname, glob);
// entities:   here('../**/*.entity{.ts,.js}')
// migrations: here('../migrations/*{.ts,.js}')
```

This matters because **the compiled layout is not the same across services**:

| Layout | Services | Why |
|---|---|---|
| `dist/` | `oauth-service`, `repairers-service` | `tsconfig.json` sets `"include": ["src/**/*.ts"]`, so `rootDir` is `src` |
| `dist/src/` | all the others | no `include`, so the root-level `jest.config.ts` is part of the program and pushes `rootDir` up to the project root |

Resolving from `__dirname` is correct in every case — `dist/config/typeorm.js`
and `dist/src/config/typeorm.js` both find their sibling `../migrations`.

The one place that still needs a literal path is the TypeORM CLI in
`package.json`, which is set per service to match the table above. To check a
service after a build:

```bash
cd backend/<service> && npm run build && ls dist/config/typeorm.js dist/src/config/typeorm.js 2>/dev/null
```

## State of production

The `migrations` table on the production server was inspected directly:

```sql
SELECT * FROM migrations;
```

Every migration that exists on disk is already recorded there, **including all
three oauth-service ones**. There is therefore **no baseline to insert** — an
earlier draft of this document assumed otherwise and was wrong. Running
`typeorm:migrate` will only execute genuinely new migrations.

> **Note on `InsertTestOauthClient1719330000000`.** It *has* run in production,
> so a `test-client` / `test-secret` OAuth client with `{read,write}` scopes
> very likely exists in the live database. Its secret is in this repository's
> git history. Check and remove it:
> ```sql
> SELECT client_id, scopes, redirect_uris FROM oauth_clients WHERE client_id = 'test-client';
> DELETE FROM oauth_clients WHERE client_id = 'test-client';
> ```
> The migration itself is now a no-op, so it will not recreate the client.

## Pending migrations

Everything below is idempotent and none of it touches the `devices` table
(~1M rows) or rebuilds a large index:

| Service | Migration | Effect |
|---|---|---|
| `devices-service` | `AddIfixitWikiIdToCategories1763560000010` | `ADD COLUMN IF NOT EXISTS` on `device_categories` (small) |
| `repairers-service` | `NormalizeRepairerDeviceTypes1764100000000` | `UPDATE` on `repairer_devices` |
| `repairers-service` | `AddRepairerPartnerType1764200000000` | `ADD COLUMN IF NOT EXISTS` + `UPDATE` on `repairers` (~33k rows) |
| `repairers-service` | `CreateRepairerReports1764300000000` | `CREATE TABLE IF NOT EXISTS` |
| `user-management` | `CreateUserRefreshTokens1764400000000` | `CREATE TABLE IF NOT EXISTS` |
| `user-management` | `MoveGuestAccountsToUserRole1791990039257` | `UPDATE users`: accounts still holding the guest role get the user role; idempotent, not reverted |
| `user-management` | `RevokeUserGetAllFromNonAdmins1793884051516` | `DELETE` from `roles_permissions_permission`: only admin keeps `user.get_all`; idempotent |
| `oauth-service` | `HashOauthClientSecrets1764500000000` | Rewrites `oauth_clients.client_secret` (a handful of rows) |

`AddRepairerPartnerType` adds a `NOT NULL DEFAULT 'repairer'` column. On
PostgreSQL 11+ that is a metadata-only change — no table rewrite — so 33k rows
are not a concern. The database image is `pgvector/pgvector:pg14`.

## OIDC is live: order of operations

`oauth-service` backs the identity provider in production. Run it first and
verify before touching anything else:

```bash
docker compose exec oauth-service sh -c "npm run build && npm run typeorm:migrate"
```

Then confirm the provider still answers:

```bash
curl -s https://care2repair.eu/.well-known/openid-configuration | head -c 200
curl -s https://care2repair.eu/.well-known/jwks.json | head -c 120
```

`HashOauthClientSecrets` rewrites `oauth_clients.client_secret` in place.
Existing integrations keep their current secrets — only the storage format
changes, and `verifyClientSecret` accepts both formats, so the service
deployment and the migration can happen in either order.

It is **irreversible**: `down()` throws rather than pretending to restore
plaintext. Dump the table first if you want a way back:

```bash
docker compose exec db pg_dump -U postgres -t oauth_clients servicehub > oauth_clients-$(date +%F).sql
```

## Running migrations

**In production this is automatic.** `.github/workflows/deploy.yml` runs the
migrations after the containers come up, sequentially, and fails the deployment
if any of them fail. It also takes a compressed dump beforehand and smoke-tests
the site afterwards.

That step is not a convenience. With `synchronize` disabled, a service whose
migration has not been applied runs against a schema it does not recognise —
for `user-management` that means `login` fails outright, because issuing a
session inserts into `user_refresh_tokens`.

To run them by hand, per service, inside its container:

```bash
docker compose exec user-management sh -c "npm run build && npm run typeorm:migrate"
```

Or across all services that declare a migration script:

```bash
./scripts/run-all-migrations.ps1
```

Migrations are **not** run automatically at boot. Twelve services share one
database and therefore one `migrations` table; letting them all migrate
concurrently on startup invites races. Running them explicitly keeps the step
observable and ordered.

## Adding a migration

```bash
cd backend/<service>
npm run build
npx typeorm migration:generate -d <the DataSource path for that service> src/migrations/<Name>
```

Review the generated SQL before committing: `migration:generate` diffs entities
against the live database, so anything synchronize did by hand shows up here.

Prefer `IF NOT EXISTS` / `IF EXISTS` guards. Years of `synchronize: true` mean
the database may already contain what a migration is about to create.

## Take a dump first

Before the first migration run on any environment holding data you care about:

```bash
docker compose exec db pg_dump -U postgres servicehub > servicehub-$(date +%F).sql
```
