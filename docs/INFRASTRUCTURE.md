# Infrastructure & Operations

**Status:** Draft for review · **Date:** 2026-08-24
**Companions:** `docs/SPEC.md` (what to build), `docs/DESIGN.md` (how it looks), `docs/PLAN.md` (the order of work)
**This document:** where it runs, how it gets there, what the secrets are, and what happens when it breaks.

Everything here is a **Phase 0 deliverable**. `PLAN.md` Phase 0 asserts "a real, deployable app" and its gate requires Google sign-in working on the deployed environment; this document is what makes that sentence mean something.

---

## 0. Locked decisions

| Area | Decision |
|---|---|
| **Hosting** | **Vercel**, Nuxt 4 SSR via the auto-detected Nitro `vercel` preset. Region `dub1` (Dublin) |
| **Database / auth / storage / realtime** | **Supabase**, one hosted project, region **Ireland (eu-west-1)** |
| **Environments** | **Local + production only.** No staging. Vercel previews point at the production database |
| **Supabase plan** | **Free tier**, upgraded when a documented trigger fires (§8.3) |
| **Domain** | **Vercel-provided `*.vercel.app`.** No custom domain in v1 |
| **Backups** | **Supabase built-in only.** Accepted as a known gap — see §8, which states plainly what this does and does not protect against |
| **CI** | GitHub Actions: `check` + migrations + RLS tests on every push. Vercel owns deployment |
| **Secrets** | Vercel environment variables. **The service-role key never leaves `server/`** |
| **Monitoring** | Vercel runtime logs + Supabase logs. No third-party APM in v1 |

---

## 1. Topology

```
        ┌─────────────────────────────────────────┐
        │  Vercel  (dub1)                         │
        │  ┌───────────────────────────────────┐  │
 phone ─┼─▶│ Nuxt 4 SSR  ·  <project>.vercel.app│ │
        │  │  app/      → browser bundle        │  │
        │  │  server/   → Nitro functions       │  │
        │  └───────────┬───────────────┬───────┘  │
        └──────────────┼───────────────┼──────────┘
                       │ anon key      │ service-role key
                       │ (user JWT,    │ (server only,
                       │  RLS applies) │  RLS bypassed)
                       ▼               ▼
        ┌─────────────────────────────────────────┐
        │  Supabase  (eu-west-1)                  │
        │  Postgres + RLS · Auth · Storage        │
        │  Realtime (shopping_list_items)         │
        └─────────────────────────────────────────┘
                       │
                       ▼  server-side fetch only
            world.openfoodfacts.org (§9.2)
```

Two paths into Postgres, and the distinction is the security model of the whole app:

- **Browser → Supabase, directly**, with the anon key and the user's JWT. Every read and write goes through RLS (`SPEC.md` §3). This is the default path and covers nearly everything.
- **Nitro → Supabase, with the service-role key.** Used by exactly one route family (`server/api/products/*`), because `products` has no client write grants at all. RLS does not apply here, so every such route is a place where a bug is a data breach. §5.3 states the rules.

---

## 2. Vercel

### 2.1 Project configuration

| Setting | Value | Why |
|---|---|---|
| Framework preset | Nuxt | Vercel detects Nuxt 4 and applies the Nitro `vercel` preset automatically |
| Build command | `npm run build` | Default; do **not** wire `npm run check` in here (see §2.2) |
| Install command | `npm ci` | Lockfile-exact, fails loudly on drift |
| Node version | **22.x** | Pinned in Project Settings **and** in `package.json` `engines`, so local and CI agree |
| Region | **`dub1`** (Dublin) | Same side of the Atlantic as the Supabase project and the users. Every SSR render and every list generation makes several round trips to Postgres; a US default region would add ~150ms to each |
| Deployment protection | **Vercel Authentication on Preview only** | Previews write to the production database (§3.2). They must not be publicly reachable |

Do **not** commit a `vercel.json` unless something below actually requires it. The zero-config path is well-trodden for Nuxt and every line of config is a line that can drift from the framework.

### 2.2 Do not put `npm run check` in the build command

`PLAN.md` §0.1 defines `npm run check` as typecheck + lint + unit tests. It belongs in **GitHub Actions** (§7), not in the Vercel build.

Vercel builds are for producing an artefact. If the gate lives only in the build command, then a broken build and a failed test are the same red X, the feedback is slower, and there is no cheap way to run the gate without also deploying. Keep them separate: CI says whether the code is correct, Vercel says whether it deploys.

### 2.3 The runtime, and one thing to watch

The Nitro `vercel` preset compiles `server/api/**` into serverless functions on the Node runtime. This is the right target here — the Open Food Facts fetch in §9.2 uses ordinary Node primitives, and the shopping-list generation route imports `app/utils/aggregate.ts` directly, which the Edge runtime would only complicate for no benefit.

**Cold starts.** Serverless functions idle out. The one place a user will notice is `POST /api/shopping-lists/generate` — pressed once a week, near-guaranteed to be cold, and doing real work. `DESIGN.md` §5.9 already specifies a "Working out quantities…" skeleton state for exactly this screen, which absorbs the cold start honestly. Budget ~1s of cold start on top of generation time and do not treat it as a bug.

**Function limits.** Default max duration on Hobby is 10s per invocation. List generation for a 21-slot week is a handful of queries and pure TypeScript, so this is not close — but the Open Food Facts fetch must carry its own timeout well inside that budget (§9.2), or a slow upstream turns into a hung function.

### 2.4 Preview deployments

Every push to a non-production branch gets a preview URL. They are genuinely useful here — `DESIGN.md`'s "definition of visually done" requires checking every screen at 390px on a real phone, and a preview URL is how that happens.

The cost of the no-staging decision (§3.2) lands here: **preview deployments read and write the production database.** The rules that follow from that:

- Preview deployments are protected by Vercel Authentication. Not optional.
- Previews are for **looking at UI**, not for exercising destructive paths. Do not test "leave household", list regeneration, or bulk deletes on a preview.
- A branch containing an unapplied migration will fail against production, because production's schema is older. That is correct and desirable: it forces migrations to be applied deliberately (§6) rather than arriving as a side effect of opening a pull request.

---

## 3. Supabase

### 3.1 Project

One project, region **Ireland (eu-west-1)**, matching Vercel's `dub1`. Cross-region latency between the SSR layer and Postgres is pure overhead on every render.

Free tier gives you: 500MB Postgres, 1GB storage, 5GB egress, 50k MAU, and unlimited API requests. Against the real workload — two users, a few hundred recipes, a few thousand rows — the only limit within a decimal order of magnitude is **storage**, and only via recipe images. At the ~1600px long-edge cap from `PLAN.md` §1.5, images land around 200–400KB, so 1GB is roughly 2,500–5,000 recipe photos. Not a concern.

### 3.2 One database, and what that costs

**Decision: local development plus one production Supabase project. No staging.**

Justification: this is a two-user household app. A staging environment doubles the OAuth configuration, doubles the migration ceremony, doubles the cost the moment either project goes Pro, and buys safety that a forward-only migration discipline plus CI's `supabase db reset` (§6.1, revised by DECISIONS.md H1 — there's no local Postgres to reset against anymore either) already largely provides.

What it actually costs, stated plainly so that nobody is surprised:

- A bad migration hits real data on first contact. `PLAN.md`'s standing rule — *migrations are forward-only, never edit one that has been applied to a shared environment* — stops being a nicety and becomes the primary safety mechanism. §6 defines the procedure that makes it survivable.
- Preview deployments share production data (§2.4).
- There is no rehearsal for a schema change. §6.3's rule — every migration must be applied to a freshly reset local database **and** to a local database restored from a production dump — is the substitute, and it is not optional.

**Revisit this when:** a third person joins the household, or the first time a migration causes real data loss. Either event makes staging cheaper than its absence.

### 3.3 Free-tier pausing — the gotcha that will actually bite

**Supabase pauses free projects after 7 consecutive days of inactivity.** A paused project must be restored manually from the dashboard, which takes a couple of minutes.

This app's usage pattern is *plan on Sunday, shop on Saturday* — a genuinely plausible fortnight-long gap over a holiday, and the failure surfaces at the worst possible moment: standing in a supermarket with a dead app.

**Mitigation (Phase 0 deliverable):** a GitHub Actions cron, twice weekly, issuing one trivial authenticated request against the REST API. Ten lines of YAML, free, and it resets the inactivity clock.

```yaml
# .github/workflows/keepalive.yml
name: keepalive
on:
  schedule: [{ cron: "0 9 * * 1,4" }]   # Mondays and Thursdays, 09:00 UTC
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS "$SUPABASE_URL/rest/v1/healthcheck?select=id&limit=1" \
            -H "apikey: $SUPABASE_ANON_KEY" -o /dev/null
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

Point it at a trivial, world-readable table created for this purpose — never at a household table, so the keepalive needs no privileges and leaks nothing if the workflow logs a response. GitHub disables scheduled workflows on repositories with 60 days of no activity, so if the repo goes quiet for a whole summer, both the keepalive and the project will sleep. That is acceptable; it is the case where nobody is using the app anyway.

### 3.4 Storage

One bucket, `recipe-images`, **private**, with policies scoping object paths by `household_id` per `PLAN.md` §1.1. Path convention:

```
recipe-images/{household_id}/{recipe_id}/{uuid}.jpg
```

The `household_id` prefix is what makes the storage policy expressible as a path check. Serve via signed URLs rather than making the bucket public — `PLAN.md`'s Phase 1 gate explicitly requires that a user in household B cannot fetch household A's image, and a public bucket makes that gate unpassable regardless of what the policy says.

### 3.5 Realtime

`shopping_list_items` must be added to the `supabase_realtime` publication, in a migration, or the tick-sync in `SPEC.md` §7 silently never fires:

```sql
alter publication supabase_realtime add table public.shopping_list_items;
```

Two things the plan should know:

- **Realtime respects RLS**, but only once the channel is set up as authorised. The subscription must carry the user's access token, and the `list_id` filter is a performance optimisation, *not* the security boundary. RLS is the boundary.
- Free tier allows 200 concurrent realtime connections and 2 million messages per month. Two phones ticking a shopping list is not a capacity question.

---

## 4. Environments

| Environment | App | Database | Purpose |
|---|---|---|---|
| **Local** | `nuxt dev` on `localhost:3000` | **Production Supabase, direct** (DECISIONS.md H1 — no local Docker) | All development happens against the one hosted project; migrations are rehearsed in CI instead of a local reset (§6.3) |
| **Preview** | `*.vercel.app`, per-branch, auth-protected | **Production Supabase** | Visual review on a real phone. UI only (§2.4) |
| **Production** | `<project>.vercel.app` | Production Supabase | The two phones that actually use it |

`localhost` is exempt from the browser's secure-context requirement, so the camera work in Phase 4 is developable locally — but **`BarcodeDetector` behaviour differs between desktop Chrome and iOS Safari**, which is precisely why `PLAN.md` §4.1 makes the ponyfill spike the first task of that phase, on a real device, over HTTPS. A preview deployment is how that spike gets a real HTTPS origin without touching production.

**All three rows share one database (DECISIONS.md H1, §3.2).** §3.2's "no staging" cost already accepted that Preview shares production data; Local now does too, since there's no local Postgres to isolate it. Be exactly as careful running `nuxt dev` as you would be on a preview URL — no exercising "leave household", regeneration, or bulk deletes against real data just to check something works.

---

## 5. Environment variables & secrets

### 5.1 The variables

| Variable | Local (`.env`) | Vercel scope | Exposed to browser? | Purpose |
|---|---|---|---|---|
| `SUPABASE_URL` | Local Supabase URL | Production + Preview | **Yes** | Project endpoint |
| `SUPABASE_KEY` | Local anon key | Production + Preview | **Yes** | Anon key. Safe to expose; RLS is what protects the data |
| `SUPABASE_SERVICE_KEY` | Local service key | **Production + Preview** | **NO — never** | Bypasses RLS entirely. Server-only |
| `OFF_USER_AGENT` | `HouseholdMeals/0.1 (contact@example.com)` | Production + Preview | No | Open Food Facts asks for a descriptive UA (`SPEC.md` §5) |
| `NUXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Per-scope | Yes | Absolute URLs for invite links (`SPEC.md` §2) |

`SUPABASE_URL` and `SUPABASE_KEY` are the names `@nuxtjs/supabase` reads by default — do not rename them. `SUPABASE_SERVICE_KEY` is the name the module's `serverSupabaseServiceRole()` helper expects.

`.env` is git-ignored. `.env.example` **is** committed, listing every key above with placeholder values, so a fresh clone tells you what it needs instead of failing mysteriously.

### 5.2 Local values, revised (DECISIONS.md H1)

With no local Postgres, `.env`'s `SUPABASE_URL` and `SUPABASE_KEY` come from the dashboard (**Project Settings → API**) and point at the hosted project directly, not at a local instance. The warning this section used to carry — "never point local at production" — is moot for the same reason: local *is* production now. What still applies: `SUPABASE_SERVICE_KEY` is exactly as dangerous locally as anywhere else (§5.3), and a `.env` mistake here modifies real data immediately, with no local sandbox to catch it first.

### 5.3 The service-role boundary

The service-role key bypasses RLS completely. It exists in this codebase for exactly one reason: `products` is a global cache with no client write grants (`SPEC.md` §3), so only the server may write it.

Three rules, and they are gate items in §11:

1. **`SUPABASE_SERVICE_KEY` is referenced only inside `server/`.** Any occurrence under `app/` or `shared/` is a build-failing error, not a code review comment.
2. **Never prefix it `NUXT_PUBLIC_`.** That prefix is what puts a value into the client bundle. There is no legitimate reason for a public runtime config entry to hold a secret.
3. **A route holding the service-role key must derive `household_id` from the user's session**, never from the request body. RLS is not there to catch you. `server/api/shopping-lists/generate.post.ts` should use the *user-scoped* client (`serverSupabaseClient`) and keep RLS active — it has no reason to bypass it.

A CI grep enforces rules 1 and 2:

```bash
! grep -rn "SERVICE_KEY" app/ shared/ 2>/dev/null
! grep -rn "NUXT_PUBLIC.*SERVICE" . --include="*.ts" --include="*.vue" 2>/dev/null
```

---

## 6. Migrations & deployment

### 6.1 Deployment

Vercel deploys on push. `main` → production; every other branch → a protected preview. There is no manual deploy step and no build server to babysit.

**Migrations are not deployed by Vercel.** They are applied deliberately, by a person, immediately *before* merging the code that depends on them. Ordering matters and only has one safe direction — revised by DECISIONS.md H1, since there's no local Postgres to reset against:

```
1. Write the migration, push the branch
2. CI applies every migration from zero + runs the RLS suite (§6.3, §7)
3. Once CI is green: `supabase link` + `supabase db push` ← schema goes to production
4. Merge to main                                          ← code that uses it deploys
```

Applying the schema first means production briefly runs old code against a new schema. Additive migrations — new tables, new nullable columns — are safe in that window, which is nearly everything in `PLAN.md`. The reverse order is never safe: new code against an old schema is an immediate 500.

### 6.2 Additive-only, in practice

Every migration in `PLAN.md` Phases 0–5 is additive. Keep it that way for as long as possible. When a genuinely destructive change becomes necessary (renaming a column, dropping one), do it as an expand/contract pair across two deployments:

1. **Expand** — add the new column, write to both, read from the old.
2. Deploy, verify, backfill.
3. **Contract** — read from the new, stop writing the old, drop it in a later migration.

With one database and no staging, this is not ceremony. It is the only way a schema change is reversible.

### 6.3 Rehearsing against production shape

Because there is no staging *and* no local Postgres (DECISIONS.md H1), CI's `supabase db start` + `db reset` — against a fresh, `seed.sql`-only database inside GitHub Actions — is the only rehearsal a migration gets before `supabase db push` touches the real project. It is a hard requirement before any push, and it is weaker than the original design: it proves a migration applies cleanly from zero, not that it survives real, messy production data (the dump-and-restore this section used to prescribe needed a local target to restore into).

A migration that works on an empty seeded database and fails on real data is the single most likely way this project loses information. `seed.sql` is deliberately tidy; production will not be. Read every migration against that risk by eye before pushing — CI going green is necessary, not sufficient.

### 6.4 Rollback

**Vercel:** instant. Promote the previous deployment from the dashboard. Always available, seconds.

**Supabase:** there is no rollback. Forward-only means the recovery path for a bad migration is a *new* migration that corrects it, written under pressure. This is the sharpest edge of the one-database decision, and it is the reason §6.3 exists. On the free tier, with no restorable backup (§8), a migration that destroys data destroys it permanently.

---

## 7. CI

Two workflows. Both free on GitHub Actions for a public or personal repository.

**`.github/workflows/check.yml`** — on every push and pull request:

| Step | Command | Guards |
|---|---|---|
| Install | `npm ci` | Lockfile drift |
| Check | `npm run check` | Typecheck, lint, unit tests (`PLAN.md` §0.1) |
| Secret boundary | the greps in §5.3 | Service key leaking into the client bundle |
| No Tailwind config | `! test -f tailwind.config.js` | `SPEC.md` §1's CSS-first rule; a Phase 0 gate item |
| Database | `supabase db start && supabase db reset` | Every migration applies cleanly from zero |
| RLS | the SQL test script (`SPEC.md` §9) | Cross-household isolation |

The Supabase CLI runs in Docker on the GitHub runner, which is supported and takes 60–90 seconds. Worth every second: `PLAN.md` adds an RLS assertion at every phase gate, and those assertions are only worth having if they run unprompted.

**`.github/workflows/keepalive.yml`** — §3.3.

### 7.1 Test authentication — decided in Phase 0, needed in Phase 5

`PLAN.md` §5.5 requires the Playwright happy path green in CI. **Google will not let you script its sign-in from a CI runner** — bot detection, device challenges, and a flow they change without notice. Left alone, this gate fails at the very end of the project, which is the worst possible time to find out.

It must be *decided* in Phase 0, while the auth code is open, even though it isn't *needed* until Phase 5.

**Decision: no test route, no test code in the app at all.** Playwright's global setup mints sessions through the Supabase Admin API against the **local** Supabase instance, and injects them into the browser context.

```
supabase/config.toml   (local only)   → enable the email+password provider
playwright/global-setup.ts:
  1. service-role client against the local instance
  2. admin.createUser() × 2   → alice@test.local, bob@test.local
  3. signInWithPassword()     → a real, valid session per user
  4. page.evaluate(supabase.auth.setSession(...)) on a blank page
  5. context.storageState()   → playwright/.auth/alice.json, bob.json
```

Tests then load a storage state and start signed in. Two users, because the household-sharing paths — invite, join, realtime tick sync, presence — cannot be tested with one.

Why this shape and not a `/api/_test/login` route:

- **Nothing ships.** A test-only route is code in the production bundle guarded by an environment variable, and the failure mode of a mis-set guard is an authentication bypass on the live app. This approach adds zero surface.
- **The password provider is enabled in `config.toml`, which is local-only configuration.** The hosted project keeps Google as its sole provider. There is no toggle that can be wrong in production because there is no toggle in production.
- **The sessions are real.** They go through Supabase Auth, carry a genuine JWT, and hit exactly the same RLS policies as a Google session. A hand-forged cookie would test the app against a fiction.

E2E therefore runs against `nuxt build && nuxt preview` with a local `supabase start`, in the same CI job that already runs `db reset` — not against a deployed environment. That also keeps the tests off production data, which matters more than usual given §3.2. **This is CI-only** (DECISIONS.md H1): `nuxt dev` on the development machine has no local Supabase to mint test sessions against, so `npm run test:e2e` isn't expected to run there.

**Phase 0 deliverable:** the global setup, the two fixtures, and one trivial signed-in smoke test. `PLAN.md` §0.1 already asks for "Playwright installed with one smoke test"; this is what that smoke test should be.

### 7.2 The healthcheck table

The keepalive in §3.3 needs something world-readable to select from. One migration in Phase 0:

```sql
create table public.healthcheck (id smallint primary key default 1, checked_at timestamptz default now());
insert into public.healthcheck (id) values (1) on conflict do nothing;
alter table public.healthcheck enable row level security;
create policy "healthcheck is readable by anyone" on public.healthcheck for select using (true);
```

Deliberately not a household table and deliberately holding nothing. The keepalive needs no privileges, and if a workflow log ever echoes the response it leaks a single timestamp.

---

## 8. Backups & data durability

### 8.1 What has been chosen

**Supabase built-in backups only, on the free tier.** Recorded honestly: **this means there is effectively no restorable backup.** Automated daily backups with 7-day retention are a Pro-plan feature; free projects do not provide a restore path you can rely on.

The exposure, concretely: the recipe library is hand-typed over months and exists nowhere else. A bad migration (§6.4), an accidental `delete`, or an account problem loses it permanently. No amount of care in `SPEC.md` changes that, because the risk is operational, not architectural.

This is an accepted risk, not an oversight. It is written here so the acceptance is deliberate and so the trigger to revisit it is unambiguous.

### 8.2 What partially compensates today

- **Migrations are forward-only and version-controlled.** The *schema* is fully reproducible from `supabase/migrations/` at any time. It is the data that is exposed.
- **`seed.sql` is a committed deliverable** (`PLAN.md` §1.1). A destroyed database can be rebuilt to a working, demonstrable state — just not to *your* state.
- **Nothing irreplaceable exists until Phase 1.** Through Phase 0 the database holds two profiles and a household. The risk begins the day the first real recipe is typed.

### 8.3 Upgrade triggers — review the plan when any of these fires

- **The recipe library passes ~15 real recipes.** That is the point where re-entry stops being an evening's annoyance and starts being a reason to stop using the app.
- **Phase 3's gate is reached** — a real shop in a real supermarket. From then on the data is load-bearing for a weekly routine.
- **Free-tier pausing is hit despite the keepalive** (§3.3).
- **A third person joins the household**, which also triggers the staging review in §3.2.

### 8.4 The escape hatch, kept ready

If a trigger fires, either of these closes the gap; both were costed during review and neither was chosen now:

- **Supabase Pro (~$25/mo)** — daily backups, 7-day retention, no pausing, branching available. Zero engineering effort.
- **A weekly `pg_dump` GitHub Action** — ~30 lines of YAML dumping to a private bucket or repository. Free, and it protects against the case Supabase's own backups do not: self-inflicted data loss noticed more than a week later.

Do not treat this section as settled. Re-read it at the Phase 3 gate.

---

## 9. Runtime concerns

### 9.1 Auth, redirect URLs, and the preview-URL problem

Google OAuth (`SPEC.md` §0) needs redirect URIs registered, and Google **does not support wildcards**. Preview deployments have a different hostname on every push. The naive reading is that OAuth cannot work on previews.

It works, because of an indirection worth understanding once:

1. Google is configured with **exactly one** authorised redirect URI — Supabase's fixed callback:
   `https://<project-ref>.supabase.co/auth/v1/callback`
   This never changes and is unaffected by Vercel hostnames.
2. Supabase then redirects onward to the app's own `redirect_to`, which is validated against **Supabase's** allow-list — and *that* list does support wildcards.

So the configuration is:

| Where | Setting |
|---|---|
| Google Cloud Console | Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` |
| Google Cloud Console | Authorised JavaScript origin: `https://<project>.vercel.app` |
| Supabase → Auth → URL Configuration | Site URL: `https://<project>.vercel.app` |
| Supabase → Auth → Redirect URLs | `http://localhost:3000/**`, `https://<project>.vercel.app/**`, `https://*-<scope>.vercel.app/**` |

Keep the preview wildcard as tight as the pattern allows — it is an open redirect surface, mitigated here by preview deployments being auth-protected (§2.2).

### 9.2 The Open Food Facts route

`server/api/products/[barcode].get.ts` is the only outbound call in the system, and the only place a third party's availability affects ours.

- **Timeout: 5 seconds**, via `AbortSignal.timeout(5000)`. Non-negotiable. `PLAN.md` §4.2 requires that an OFF outage degrades to manual entry rather than a hung request, and without an explicit timeout `fetch` will happily wait past the function's own limit and return a 504 with no useful message.
- **Cache first, always.** `products.fetched_at` older than 90 days triggers a refetch; otherwise it is a pure database read with no outbound request (`SPEC.md` §5). This is also a Phase 4 gate item verified in server logs.
- **Descriptive `User-Agent`** from `OFF_USER_AGENT`, as OFF's terms request.
- **Every failure mode returns a structured result, never a 500.** Not found, timeout, and upstream 5xx are all *expected* outcomes that the UI turns into the pre-filled manual entry form. A 500 produces `DESIGN.md`'s forbidden "Something went wrong"; a typed `{ status: 'not_found', barcode }` produces a useful screen.
- **Rate limiting.** OFF asks for ≤100 product queries/minute. Two users scanning by hand cannot approach it. The cache makes repeat scans free. No limiter needed in v1 — but the route must not be callable in a loop by an unauthenticated caller, so it requires a session like every other route.

### 9.3 Security headers

Set once in `nuxt.config.ts` via Nitro route rules, and verified in the Phase 5 gate alongside Lighthouse Best Practices ≥ 95:

- `Strict-Transport-Security` — Vercel serves HTTPS only; make it explicit.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self)` — the app needs the camera in Phase 4 and nothing else needs anything. Geolocation, microphone, and payment are all denied.

A full CSP is deferred. Nuxt's inline hydration scripts and the theme-flash-prevention script in `PLAN.md` §0.2 both need nonces or hashes to survive one, and getting it wrong breaks the app silently on a phone. Revisit if the app ever holds anything more sensitive than dinner plans.

---

## 10. Observability

No third-party APM in v1. It is two users; a bug report is a text message. What exists:

- **Vercel runtime logs** — 1 hour retention on Hobby. Enough to diagnose something that just happened, useless for anything historical. Know this before relying on it.
- **Supabase logs** — Postgres, Auth, and PostgREST logs in the dashboard, 1 day retention on free.
- **Structured server logging.** Every `server/api` route logs one line on failure with the route, the user's `household_id`, and the error cause. Free, and it is the difference between a readable log and a wall of stack traces.

**The known blind spot:** `DESIGN.md` §5.9 specifies optimistic ticking with a revert-and-toast on failure. If that fires in a supermarket, nobody will report it and no log will retain it. If ticks start failing silently, this is where you will wish there were error reporting. Sentry's free tier is a 20-minute integration; it is the first thing to add if the shopping list ever behaves oddly in the wild.

---

## 11. Phase 0 infrastructure checklist

Add to the `PLAN.md` Phase 0 gate:

**Hosting**
- [ ] Vercel project created, linked to the repository, Node pinned to 22.x, region `dub1`.
- [ ] Production deploys from `main`; a branch push produces a preview URL.
- [ ] Vercel Authentication is enabled on Preview and disabled on Production.
- [ ] A preview URL loads on a real phone over HTTPS.

**Supabase**
- [x] Project created in `eu-west-1`; `supabase link` works from a clean clone.
- [ ] `supabase db push` applies all migrations to production without error.
- [ ] `recipe-images` bucket exists, is **private**, and is path-scoped by `household_id`.
- [ ] `healthcheck` table migration applied (§7.2).
- [ ] Keepalive workflow committed, run manually once, and observed to succeed.

**Secrets**
- [ ] All five variables of §5.1 set in Vercel for Production **and** Preview.
- [ ] `.env.example` committed; `.env` git-ignored.
- [ ] CI grep proves `SERVICE_KEY` appears nowhere under `app/` or `shared/`.
- [ ] `SUPABASE_SERVICE_KEY` confirmed absent from the built client bundle (grep `.output/public`).

**Auth**
- [ ] Google OAuth: one redirect URI (the Supabase callback), origin set to the Vercel production URL.
- [ ] Supabase redirect allow-list covers localhost, production, and the preview wildcard.
- [ ] Sign-in works on **localhost**, on a **preview URL**, and on **production**.
- [ ] Signing in on a second device with a second Google account reaches the same household (this is the existing Phase 0 gate; it now has an environment to happen in).

**CI**
- [ ] `check.yml` green on a pull request: check, secret greps, no `tailwind.config.js`, `db reset`, RLS tests.
- [ ] A deliberately broken RLS policy makes CI fail (prove the test can fail before trusting that it passes).
- [ ] Playwright global setup mints two signed-in sessions against local Supabase, with **no test route in the app** (§7.1).
- [ ] The email+password provider is enabled in `config.toml` and **absent from the hosted project's providers**.
- [ ] One signed-in smoke test green in CI.

**Operations**
- [ ] §6.1's deploy order written into the repository README, not only here.
- [ ] §8 read and understood by both household members — specifically, that recipes typed in are not backed up.
- [ ] Security headers set and verified on the production URL.

---

## 12. Cost

| Item | Now | If triggers fire (§8.3) |
|---|---|---|
| Vercel Hobby | £0 | £0 (personal, non-commercial) |
| Supabase | £0 (free) | ~£20/mo (Pro) |
| Domain | £0 (`*.vercel.app`) | ~£10/yr if ever wanted |
| GitHub Actions | £0 | £0 |
| **Total** | **£0/mo** | **~£20/mo** |

Vercel's Hobby plan prohibits commercial use. A household meal planner is squarely within it; if this ever becomes something other people pay for, the plan changes before the first customer.

---

## 13. Accepted risks

Carried into `PLAN.md` §6 with these mitigations.

| Risk | Impact | Mitigation | Trigger to revisit |
|---|---|---|---|
| **No restorable backup on free tier** | Hand-typed recipe library lost permanently | Forward-only migrations; §6.3 rehearsal against a production dump; schema reproducible from git | §8.3 — ~15 recipes, or the Phase 3 gate |
| **Free project pauses after 7 days idle** | App dead in a supermarket, needs a manual dashboard restore | Twice-weekly keepalive cron (§3.3) | Any pause that happens despite it |
| **No staging; previews hit production data** | A bad migration or a destructive preview test hits real data | §6.3 rehearsal; previews are auth-protected and UI-only; additive-only migrations | Third household member, or first real data loss |
| **No migration rollback** | Recovery is a corrective migration written under pressure | Expand/contract for anything destructive (§6.2); additive-only through Phase 5 | Any non-additive migration |
| **1-hour log retention** | Cannot diagnose anything reported later than an hour after it happened | Structured single-line failure logs | Any unexplained failure in the wild → add Sentry |
| **`*.vercel.app` origin** | Changing the origin later orphans PWA state and breaks installed home-screen apps | Treat the production alias as permanent; if a custom domain is ever wanted, move **before** Phase 5 ships the PWA | Any desire for a custom domain |
| **Cold start on list generation** | ~1s wait on the weekly press of the most important button | `DESIGN.md` §5.9's "Working out quantities…" skeleton absorbs it | If it exceeds ~3s in practice |
