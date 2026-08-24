# Household Meals

A mobile-first Nuxt 4 app for planning a household's week of meals and
generating a shopping list from it. See `docs/` for the full spec:

- `docs/SPEC.md` — what to build
- `docs/DESIGN.md` — how it looks
- `docs/PLAN.md` — the order of work and phase gates
- `docs/INFRASTRUCTURE.md` — where it runs, secrets, operations
- `docs/DECISIONS.md` — decisions made during the build, and why

## Setup

No Docker, no local Postgres — local dev connects directly to the one
hosted Supabase project (DECISIONS.md H1). That means local dev shares data
with everything else; see "Deploying" below for how migrations still get
tested before they touch it.

```bash
npm install
cp .env.example .env   # fill in from the Supabase dashboard → Project Settings → API
npm run dev
```

A Google OAuth client configured per `docs/INFRASTRUCTURE.md` §9.1 is
required — Google sign-in does not work with placeholder credentials.

## Scripts

| Command             | Does                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`       | Dev server                                                                   |
| `npm run check`     | Typecheck + lint + format check + unit tests — the CI gate, runnable locally |
| `npm run test:unit` | Vitest                                                                       |
| `npm run test:e2e`  | Playwright — CI only (needs a local Supabase instance; see DECISIONS.md H1)  |
| `npm run format`    | Prettier, writes                                                             |

## Deploying (INFRASTRUCTURE.md §6.1, revised by DECISIONS.md H1)

Migrations are never deployed by Vercel — they're applied deliberately, by a
person, immediately before merging the code that depends on them. With no
local Postgres, CI is the rehearsal step instead of a local `db reset`:

1. Write the migration, push the branch. CI (`supabase db start` inside
   GitHub Actions — Docker there, never on your machine) applies every
   migration from zero and runs the RLS suite.
2. Once CI is green, link and push from your machine (no Docker needed —
   this is a plain network call to the hosted project):
   ```bash
   supabase link --project-ref jcsexloozdnpfhvxidjo
   supabase db push
   ```
3. Merge to `main` — code that uses the new schema deploys.

Reversing steps 2 and 3 is never safe: new code against an old schema is an
immediate 500. See `docs/INFRASTRUCTURE.md` §6 for the full rationale and
rollback story, and `docs/DECISIONS.md` H1 for why this differs from
INFRASTRUCTURE.md's original local-Postgres rehearsal step.

**Before touching the database:** read `docs/INFRASTRUCTURE.md` §8. Recipes
typed into this app are not backed up on the free tier — that's a stated,
accepted risk, not an oversight, and both household members should know it.
