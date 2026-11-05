# Operations runbook

Hard-won operational knowledge about running care2repair.eu. Written after the
2026-08-04 security release, which surfaced most of it the expensive way.

Schema and migration mechanics live in [migrations.md](migrations.md); this
document covers deployment, permissions and the traps that are not visible from
the code.

---

## Deploying

### The pipeline

Pushing to `main` runs everything: unit tests for the 13 backend services, then
on the server maintenance page on → dump → `down` → `build --no-cache` → `up` →
migrations → model assignment → maintenance page off → smoke test.

The workflow reaches the server through repository secrets, never through
values written in it: `SERVER_HOST`, `SERVER_USER` and `SSH_PRIVATE_KEY` for
the connection, and one `ENV_<SERVICE>` per service for the `.env` it uploads
(`ENV_FRONTEND`, `ENV_ICECAT_IMPORTER` for the two that are not services).

The model assignment (`models:assign`) links catalogue entries without a model
to theirs; on the first deployment of device models, that is all 1.12 M of
them, about 6 minutes. It then labels the variants of the models it touched,
and of any model whose variants lack the parts their label is made of
(`devices.variant_parts`, which the model page narrows the variants down by):
the first time, all of them, about 20 more minutes; afterwards, only new
entries. It never revisits an entry that has a model: after a change to the
normalisation rules, run it by hand with `--all`:

```bash
docker compose exec -T -e TYPEORM_LOGGING=false devices-service npm run cli -- models:assign --all < /dev/null
```

**If the step fails on a dropped connection, the assignment is probably still
running.** A broken ssh does not stop a `docker compose exec`: on 2026-10-13
the step died on "Broken pipe" after 9 minutes and `models:assign` finished
on its own 13 minutes later. Check before running it again, which would set
two assignments on the same rows:

```bash
docker compose top devices-service | grep models:assign
```

Then finish what the pipeline skipped: `search:sync-models`, removing the
maintenance page, the smoke test. The job now keeps its connections alive
(`ServerAliveInterval`), which should prevent it.

The same step then runs `search:sync-models`, which rewrites the
`device_models` search index from the table (about a minute and a half) and removes the
models deleted since; run it after any `models:assign` by hand. The index has
an explicit mapping, which a field cannot change in place: to change it,
delete the index (`curl -X DELETE localhost:9200/device_models` on the
server), then run the sync, which recreates it. Model search is empty until
the sync ends.

**Budget 30 to 45 minutes of downtime.** The `--no-cache` rebuild of 15 images,
each running a full `npm install`, dominates. This is a deliberate trade-off for
reproducibility, not an accident. The first deployment of device models adds
about 27 minutes, nearly all of it `models:assign`: rehearsed on a full copy of
production on 2026-10-13 (migrations 34 s, assignment 25 min, sync 92 s).
Restoring the dump, the only way back past `DropDeviceUnitColumns`, took 35
minutes there from a `pg_dump -Fc`; the pipeline's plain SQL dump restores in
one stream, so take a `-Fc` by hand before that deployment.

The pipeline takes a compressed dump before rebuilding, runs migrations
sequentially afterwards, and finishes with a smoke test that asserts — among
other things — that `POST /auth/refresh` with only an email is rejected. That
last check exists because it used to return a valid token for any account.

### Maintenance page

Apache on the host, not a container, shows
`deployment/maintenance/maintenance.html` with a 503 to every request while
the file `deployment/maintenance/ON` exists (`care2repair.eu.conf`). The
pipeline creates it before the dump and removes it once the models are
assigned, before the smoke test, which goes through the public address. A
deploy that fails in between leaves the page up on purpose: remove the file
once the site works. By hand, no reload is needed:

```bash
ssh <server> 'touch /opt/care2repair/deployment/maintenance/ON'   # on
ssh <server> 'rm -f /opt/care2repair/deployment/maintenance/ON'   # off
```

Without the file, the same page still answers a 503 that Apache raises
itself, when a container does not answer. A 503 sent by the API passes
through: never set `ProxyErrorOverride On`, or the gateway's own 503s (the
spare parts catalogue out of reach) would become the maintenance page. The
page is self-contained: anything it linked to would be asked of the stopped
frontend.

### Deploying by hand

For a risky release, disable the trigger first:

> GitHub → Actions → "Deploy to E6 Server" → ⋯ → **Disable workflow**

Doing it from the UI avoids a commit on the workflow file. Re-enable once the
site is validated.

The server is a git checkout of `main` in `/opt/care2repair`. Sequence:

1. **Pre-flight** — branch, local modifications, disk, memory, container health:
   ```bash
   ssh <server> 'cd /opt/care2repair && git status -sb && df -h / | tail -1 && docker compose ps'
   ```
2. **Maintenance page on**, then **dump** (see the warning below)
3. `git fetch origin && git reset --hard origin/main`
4. `docker compose -f docker-compose.yml -f docker-compose.efk.yml down && ... build --no-cache && ... up -d`
5. Migrations — `oauth-service` first, it backs the identity provider
6. Model assignment — `models:assign`, as above, without `--all`
7. Maintenance page off, verify, then re-enable the workflow

**Always check for locally modified tracked files before `reset --hard`.**
`kibana/kibana.yml` had drifted on the server for months: someone fixed
`rewriteBasePath` and `server.host` directly in production without committing.
A blind reset would have broken Kibana. When you find drift, bring it back into
the repository instead of restoring it by hand.

**After a failed build, rebuild without `--no-cache`.** The `npm install` layers
stay valid as long as no `package.json` changed, which turns a 40-minute rebuild
into a couple of minutes.

### Backups

```bash
docker compose exec -T db pg_dump -U postgres servicehub | gzip > backups/$(date +%F).sql.gz
```

**`docker exec -t` allocates a TTY, which rewrites LF into CRLF and silently
corrupts the dump.** A restore then "succeeds" while appending an invisible
carriage return to every text field — across a million devices. Use
`docker compose exec -T` (capital T), and verify before trusting it:

```bash
file backups/<dump>.sql.gz          # expect: gzip compressed data
gzip -t backups/<dump>.sql.gz       # expect: silence
gunzip -c backups/<dump>.sql.gz | head -c 2000000 | grep -c $'\r'   # expect: 0
```

### Rollback

Rolling the code back is only safe **before** migrations run. After
`HashOauthClientSecrets`, the stored client secrets are bcrypt hashes; older
code compares them as clear text in SQL and every OAuth integration fails. A
rollback past that point must restore the database dump too.

Every service shares one `migrations` table, and `typeorm:revert` undoes its
last row whichever service wrote it. Run from another service, it refuses
(`No migration … was found in the source code`) and changes nothing: revert in
the reverse order of the timestamps, each from the service that owns it.

---

## Versions

The version shown at the foot of the sidebar exists so a tester's report names
the build it came from. **The git tag is the only source of truth.** Nothing in
the repository carries a version number to bump — `frontend/package.json` still
says `0.4.0` under the template's name, and changing it would only create a
second number to keep in step with the first.

### The scheme

`vMAJOR.MINOR.PATCH`, tagged on `main` once a release is deployed and verified:

| | when |
|---|---|
| MAJOR | a break in the citizen journey or the API contract. Stays at 1 until then. |
| MINOR | a batch of work handed to the testers |
| PATCH | a fix released on its own |

### How the number reaches the browser

The deploy runs `git describe --tags --always` on the server and passes it as a
docker build argument, which CRA bakes into the bundle:

- exactly on a tag → `v1.2.0`
- three commits past one → `v1.2.0-3-g20a8152`
- before the first tag exists → the bare hash

The middle case matters: intermediate deploys happen, and the string still
names the exact commit a tester was on. Nothing has to be remembered at deploy
time — the number follows from the tags that exist.

A local `npm start` reads `dev`, since the build argument is not supplied.

### Tagging a release

Tag the commit that is actually deployed — the merge commit on `main`, not the
head of `dev`:

```bash
git fetch origin && git tag -a v1.2.0 origin/main -m "Release v1.2.0" && git push origin v1.2.0
```

Pushing the tag **does not deploy anything**: the workflow triggers on pushes to
`main` only.

**A tag can never be on the merge commit before that merge exists.** This is
git's mechanics, not a setting to fix, and it means the clean number is not the
default outcome. Either tag in the window between the merge and the server's
`git pull` — the backend test matrix runs first, which buys about ten minutes —
or the deploy stamps the long form and you correct it afterwards with the
rebuild below. Both are fine; `v1.0.0-4-gbcc32c0` names a commit exactly, it is
only longer to quote.

To move a tag placed on the wrong commit, delete it on the remote first
(`git push origin :refs/tags/v1.2.0`) — the deploy's `git fetch --tags --force`
is what lets the server pick up the correction. Prefer a new number over moving
a tag anyone else may have fetched.

### Correcting the number without a full deploy

When only the version string is wrong — the code on `main` is already what you
want live — rebuilding the frontend alone is enough. **Do not trigger a release
for this: it would cost 30 to 45 minutes of downtime to change a label.**

Tag first, then on the server:

```bash
cd /opt/care2repair
git fetch --tags --force origin
export REACT_APP_VERSION=$(git describe --tags --always)
docker compose -f docker-compose.yml -f docker-compose.efk.yml build service-hub-front
docker compose -f docker-compose.yml -f docker-compose.efk.yml up -d service-hub-front
```

Measured on 2026-08-21: **66 seconds to build, seconds of downtime on the SPA**,
and the other nineteen containers untouched. The `npm install` layer stays valid
as long as no `package.json` changed, so only the CRA build re-runs — the `ARG`
sits after every `COPY` in the Dockerfile precisely so that changing the version
invalidates nothing earlier.

`build` and `up -d` are separate on purpose: a failed build leaves the running
container serving the old bundle.

Verify in a browser, not with curl — the string is rendered by the SPA, so a 200
on `/` proves nothing. Open `/app/home` at a viewport of **1024px or wider**:
below Tailwind's `lg` breakpoint the sidebar is hidden and the version with it,
which reads as a failed rebuild when nothing is wrong.

This shortcut works for any change confined to the frontend bundle, not just the
version.

---

## Permissions

Adding a permission in code is not enough. Three independent mechanisms stand
between the declaration and the effect.

**1. The seed does not run at startup.**
`backend/user-management/src/migrations/seed.ts` is a standalone script. Until
`npm run seeds` runs, permissions declared in code do not exist in the database
and the API answers `Access denied: user lacks permissions`.

**2. The guest role is cached at boot.**
`RoleCacheService` loads it once in `onModuleInit`, with no TTL and no
invalidation. Anonymous users stay blocked until the gateway restarts.

**3. Permissions travel inside the JWT.**
Login builds `payload = { email, role, id }` with the fully populated role, and
`PermissionsGuard` reads `request.user.role.permissions` — the token's, not the
database's. Already-authenticated users must sign out and back in.

So the full ritual is:

```bash
docker compose exec -T user-management sh -c "npm run seeds"
docker compose restart api-gateway
# then ask users to sign out and back in
```

Verify against the database rather than the logs:

```sql
SELECT p.name, string_agg(r.name, ', ') AS roles
FROM permission p
LEFT JOIN roles_permissions_permission rp ON rp."permissionId" = p.id
LEFT JOIN roles r ON r.id = rp."rolesId"
WHERE p.name = '<permission>'
GROUP BY p.name;
```

Points 1 and 2 are design defects worth fixing — see *Known gaps* below.

---

## Entities and migrations

`synchronize: true` was enabled on all 12 services until 2026-08-04. Entities
therefore ran months ahead of the migration history without anyone noticing:
TypeORM created tables and columns at boot.

**A TypeORM entity never generates a migration on its own.**
`migration:generate` is a manual command whose output must be committed. Since
synchronize was disabled, any entity without a matching migration breaks at
runtime.

After changing an entity:

```bash
npm run build
npx typeorm migration:generate -d <datasource> src/migrations/MyChange
```

Before any schema-touching operation, ask TypeORM for the whole drift at once
rather than discovering gaps one production incident at a time:

```bash
docker compose exec -T <service> sh -c "npx typeorm schema:log -d <datasource>"
```

It is read-only. Separate real gaps from cosmetic ones: TypeORM auto-generates
index and constraint names that differ from explicit ones in migrations. On
`devices-service` it proposes dropping and re-adding `ifixit_wikiid`, which
would destroy data — one more reason synchronize stays off.

---

## Published ports and database password

Every port the compose files publish is bound to `127.0.0.1`: Apache, the
Fluentd logging driver and anyone logged in on the host reach them, nothing
outside does. Docker writes its own iptables rules and bypasses ufw, so the
binding is what keeps them closed. From another machine, use an SSH tunnel.

### Database password

The `postgres` password is `POSTGRES_PASSWORD` from the root `.env`, or
`password` when it is unset, which is what production runs on until it is
changed. The compose file hands it to every service through `environment:`,
which wins over `env_file:`: a `DATABASE_PASSWORD` in a service's `.env` is
ignored. The variable is only read when the volume is created, so changing it
on the server takes three steps:

```bash
cd /opt/care2repair
docker compose exec db psql -U postgres   # then: \password postgres
echo 'POSTGRES_PASSWORD=<the new one>' >> .env && chmod 600 .env
docker compose -f docker-compose.yml -f docker-compose.efk.yml up -d
```

The root `.env` is gitignored, so deploys keep it. `up -d` recreates every
service whose environment changed: plan it like a deploy.

---

## Local development

Values in `docker-compose.yml` are the **production** defaults. Override them
locally with a root `.env`, which Compose reads automatically and which is
gitignored:

```bash
cp env.example .env
```

Do not confuse it with the `env_file:` entries: those inject per-service
variables into containers, and that is where service settings belong
(`TYPEORM_SYNCHRONIZE`, `CORS_ORIGINS`, `THROTTLE_GLOBAL_LIMIT`,
`REFRESH_TOKEN_TTL_DAYS`, `DATABASE_*`, `JWT_SECRET`). The root `.env` only
rewrites the compose file.

Running `TYPEORM_SYNCHRONIZE=true` locally while designing an entity is fine —
just generate the migration before committing.

**Rebuild, do not restart, to test a source change.** Containers bake the code
in via `COPY`; `docker compose restart` reuses the old image.

---

## Verifying a change

Confirming that a change is *in place* does not prove it *breaks nothing*. Four
regressions reached production on 2026-08-04 despite each being "verified":

- `curl` confirmed the CSP headers were present — while every Material icon in
  the UI rendered as raw ligature text, because that same CSP blocked the Google
  font.
- Unit tests validated the logout thunk — while the real sequence navigated away
  before the state was cleared, and redux-persist restored the session.

**CSP, headers, guards and authentication flows are validated in a browser.**
The console (F12) names the offending directive on a CSP violation. Before
changing a CSP, inventory what the app actually loads:

```bash
grep -oE 'https?://[a-zA-Z0-9.-]+' frontend/public/index.html | sort -u
```

The frontend pulls four Google Fonts stylesheets, including **Material Symbols
Outlined** for every icon: `style-src` must allow `fonts.googleapis.com` and
`font-src` must allow `fonts.gstatic.com`.

**Before pushing, check that committed code does not import untracked files.**
A build failure exposed one such case; investigating found three more, including
a migration whose absence would have taken down the whole device catalogue:

```bash
git status --porcelain | grep '^??' | grep -E '\.(ts|tsx)$'
```

---

## Known gaps

Identified on 2026-08-04 and deliberately left open.

**Guards fail open.** `FlexibleAuthGuard` never rejects — it falls back to the
`guest` role and returns `true`. All protection therefore rests on
`@Permissions()` being present, and forgetting it opens the route. The fix
(global `APP_GUARD` plus an explicit `@Public()` decorator) means reclassifying
around 90 routes, and a misclassification breaks a public page with no test to
catch it. Do it on its own, with a browser smoke test of the public pages.

**The seed should run at bootstrap**, so that permissions declared in code are
guaranteed to exist.

**Permissions in the JWT** make any rights change invisible until re-login, and
the guest cache until restart. A TTL on `RoleCacheService`, or reading
permissions from the database, would fix both.

Smaller items: OIDC discovery advertises
`code_challenge_methods_supported: ['S256']` while the token endpoint always
requires a `client_secret`, so public PKCE clients cannot work; the `role` claim
embeds the full Role entity with its permissions in every token; there is no
revocation endpoint (RFC 7009).
