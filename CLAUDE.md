# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" ? "Write tests for invalid inputs, then make them pass"
- "Fix the bug" ? "Write a test that reproduces it, then make it pass"
- "Refactor X" ? "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] ? verify: [check]
2. [Step] ? verify: [check]
3. [Step] ? verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# Service Hub — project rules

Conventions actually in force in this repository, verified against the code.
Most of them exist to stop a change that looks right and silently does nothing.

## Layout

13 NestJS services plus one Python one (`device-identification`) under
`backend/`, a CRA + TypeScript SPA under `frontend/`, one Postgres database
shared by all of them. The api-gateway is the only service
exposed to the browser; it reaches the others over TCP `ClientProxy` and awaits
them with `firstValueFrom`. Public routes are `/api/v1/...` — global prefix
`api` plus URI versioning defaulting to `1`.

## Backend conventions

- **Every input is a DTO.** A global `ValidationPipe` runs with
  `whitelist: true, transform: true`, so unknown properties are stripped rather
  than rejected: a field missing from the DTO does not arrive, it disappears.
  Never take `any` on a route body.
- **`@Permissions('x.y')` both enforces and documents.** It sets the metadata
  `PermissionsGuard` reads *and* emits the OAuth2 scope into Scalar, from one
  argument, so the two cannot drift. A handler without it is public.
- **A permission must exist in the database to work.** Declaring one in code and
  not seeding it silently refuses every guarded call. See `docs/OPERATIONS.md`
  § Permissions.
- **Secrets never leave a service by accident.** Sensitive columns are
  `select: false`, user objects go through `toSafeUser()`, and redaction happens
  once at the logger boundary (`common/log-redaction.ts`) so a stray
  `{ ...body }` cannot leak a credential.
- **Migrations, never `synchronize`.** File name is `<epoch-ms>-PascalCase.ts`
  in the service's `src/migrations/`. `docs/migrations.md` is the reference;
  read it before touching a schema.
- Swagger annotations (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) are expected
  on new routes — the Scalar reference is a deliverable, not a by-product.

## Frontend conventions

- HTTP goes through the shared axios instance in `services/api.ts` — it attaches
  the bearer token, the trace headers, and handles the 401 refresh. Do not call
  `fetch` or a fresh axios directly.
- State lives in `stores/*Slice.ts`, persisted with redux-persist. **Bump
  `PERSIST_VERSION` in `globalStore.ts` when a slice's shape changes in a
  breaking way**, or returning users rehydrate into a shape the code no longer
  understands.
- Sign-out is the `logoutUser` **thunk**, not the `logout` action. A slice that
  must clear on sign-out has to handle `logoutUser.fulfilled` *and*
  `logoutUser.rejected` — the session ends either way.
- **Four locales, always in step**: `frontend/public/locales/{en,fr,nl,de}/translation.json`,
  currently 1523 keys each. Adding a string to one and not the other three is a
  bug; the counts should match after any change.

## Traps that fail silently

These have each cost a release. They produce no error, no warning, no failing
test — only a feature that does nothing.

- **Tailwind is 2.2.19 with `purge`, no JIT.** Arbitrary values (`w-[42px]`,
  `bg-black/50`, `z-[60]`) and v3-only utilities (`shrink-0`, `grow`, `size-*`)
  generate **no CSS at all**. Check any unfamiliar class against
  `tailwind.config.js` before using it. A variant prefix works only on the
  utilities it is enabled for: `disabled:` on `opacity` and `cursor` alone
  (`variants.extend`), so `disabled:bg-gray-300` is silent until enabled there.
  `sidebar-colors.css` also redefines some palette hex values after Tailwind
  loads, so a config change alone can be cancelled at runtime.
- **A category's `name` is overwritten with the caller's locale.** Match on
  `canonicalName` for identity, use `name` only as a label — matching on `name`
  works in English and nowhere else.
- **The user id is `req.user.id` from the app's own JWT strategy, `sub` from
  OAuth2.** Reading one alone makes every signed-in user look like a guest, with
  no error raised.

## Tests and CI

- Pushing to `main` runs the unit tests of the 13 backend services, then
  deploys. Nothing else gates a merge — no lint step, no type-check step in CI.
- **`npm run test` fails on coverage, not only on failing tests.** Every service
  sets `collectCoverage: true` with a uniform threshold of 40% branches and 50%
  functions/lines/statements. Adding uncovered code to a service sitting near
  the line breaks its build.
- **The frontend has no tests at all** — no runner configured, zero spec files.
  Do not claim a frontend change is covered by tests, and verify it in a browser
  instead.

## Commits

- Conventional commits: `type(scope): subject`, lowercase — `feat`, `fix`,
  `refactor`, `test`, `style`, `docs`, `chore`. Roughly 44 of the last 58 follow
  it.
- **Bodies explain why, not what.** The convention here is a body that names the
  behaviour that was wrong, the reason it was wrong, and what was verified —
  including defects found along the way. The diff already shows what changed.

## Deeper documentation

`docs/OPERATIONS.md` — deploying, permissions, backups, rollback, versions.
`docs/migrations.md` — schema and migration mechanics.
Prefer extending these over duplicating them here.

## Versioning

**The git tag is the only source of truth for the version.** Nothing in the
repository carries a version number to bump, and nothing should start.

- **Never introduce or bump a version field to mark a release.** No `VERSION`
  file, no constant in the source. `frontend/package.json` says `0.4.0` under
  the template's name `windmill-dashboard-react` — it is not ours; leave it.
- The deploy runs `git describe --tags --always` on the server and passes it as
  a docker build argument, which CRA bakes into the bundle. It is displayed at
  the foot of the sidebar (`frontend/src/version.ts`,
  `Sidebar/SidebarContent.tsx`) so testers can quote it in a bug report. If a
  change breaks that chain — the Dockerfile `ARG`, the compose build arg, or
  the export in `deploy.yml` — the sidebar silently falls back to `dev`.
- Releases are tagged `vMAJOR.MINOR.PATCH` on `main`. MAJOR: a break in the
  citizen journey or the API contract, stays at 1. MINOR: a batch handed to the
  testers. PATCH: a fix released on its own.
- **Pushing a tag deploys nothing** — the workflow triggers on pushes to `main`
  only. A tag pushed after a deploy therefore only becomes visible at the next
  one. Pushing it during the backend test matrix, before the server pulls, is
  what makes the clean number appear on the day.
- Suggest tagging after a merge to `main`, but never create or push a tag
  without being asked: which commit and which number is a release decision.

Full procedure: `docs/OPERATIONS.md` § Versions.