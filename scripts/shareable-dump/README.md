# Shareable dump

A copy of the database that another team can start a test platform from,
instead of an empty one. It holds no account, no personal data, no secret, and
nothing entered through the site, which on a test platform is test data.

What stays is what the imports wrote:

- the Icecat catalogue: devices, models, properties, categories;
- the repairers of the imported datasets, with the contacts they publish;
- the imported repair records, with any e-mail address removed from their text;
- the built-in entries of the API catalogue, the roles and permissions, the
  survey questions;
- the `migrations` table, so that the copy starts at the migration level of
  the database it came from. No `TYPEORM_SYNCHRONIZE` is needed, unlike with an
  empty database (`docs/migrations.md`, "Starting from an empty database").

Every table and every column is classified in `verify.sql`. A table or a
column it does not know makes it refuse the copy, so that a field added later
cannot leave unnoticed: classify it there, and in `sanitize.sql` if it holds
something to take out.

## Making one

Never on production: on a disposable copy of it.

1. Take a full dump of production with `pg_dump -Fc` (`docs/OPERATIONS.md`,
   "Backups": `exec -T`, never `-t`).
2. Restore it into a disposable database on your machine:

   ```bash
   docker compose exec -T db createdb -U postgres servicehub_share
   docker compose exec -T db pg_restore -U postgres -d servicehub_share --no-owner < production.dump
   ```

3. See what would go, without changing anything:

   ```bash
   (echo 'BEGIN;'; cat scripts/shareable-dump/sanitize.sql; echo 'ROLLBACK;') \
     | docker compose exec -T db psql -U postgres -d servicehub_share -v ON_ERROR_STOP=1 -f -
   ```

4. Clean and check in one transaction, so that a failed check changes nothing.
   It ends with `Shareable: every check passed.`, or lists what is wrong:

   ```bash
   cat scripts/shareable-dump/sanitize.sql scripts/shareable-dump/verify.sql \
     | docker compose exec -T db psql -U postgres -d servicehub_share -v ON_ERROR_STOP=1 -q -1 -f -
   ```

5. Export it, then scan its text for secrets:

   ```bash
   docker compose exec -T db pg_dump -U postgres -Fc --no-owner --no-privileges servicehub_share > servicehub-share.dump
   docker compose exec -T db pg_restore -f - < servicehub-share.dump | gitleaks stdin --redact
   ```

6. Drop `servicehub_share` and delete the production dump.

## Starting from one

1. Follow "Running it locally" in the README, but leave
   `TYPEORM_SYNCHRONIZE` off: the dump brings the schema.
2. Restore the dump into the empty database before the services start:

   ```bash
   docker compose up -d db
   docker compose exec -T db pg_restore -U postgres -d servicehub --no-owner --exit-on-error < servicehub-share.dump
   docker compose up --build
   ```

3. If your code is newer than the dump, run the pending migrations
   (`docs/migrations.md`, "Running migrations").
4. Sign up on the site, then make that account an administrator, and sign in
   again: permissions travel in the session token.

   ```bash
   docker compose exec -T db psql -U postgres -d servicehub -c \
     "UPDATE users SET \"isVerified\" = true, \"roleId\" = (SELECT id FROM roles WHERE name = 'admin') WHERE email = 'you@example.org'"
   ```

5. With Elasticsearch running (`docker-compose.efk.yml`), build the model
   search index; without it, search falls back to PostgreSQL:

   ```bash
   docker compose exec -T devices-service npm run cli -- search:sync-models
   ```

No OAuth client comes with the dump: an integration needs one added to
`oauth_clients`, its secret hashed with bcrypt. No uploaded photo either; the
Icecat pictures are links to Icecat. Each repairer's `source` names the dataset
it comes from, whose terms apply to it: `docs/data-sources.md`.
