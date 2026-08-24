# Build Plan — Household Meal Planning & Shopping

**Status:** Draft for review · **Date:** 2026-08-24
**Companions:** `docs/SPEC.md` (what to build), `docs/DESIGN.md` (how it looks), `docs/INFRASTRUCTURE.md` (where it runs), `docs/RECIPE-MODEL-SPIKE.md` (why the schema is shaped this way), `docs/DECISIONS.md` (what was settled, and when)
**This document:** the order of work, the acceptance criteria, and the checklist that gets ticked.

---

## 0. How to read this plan

Each phase has four parts:

1. **Objective** — the one sentence that says why the phase exists.
2. **Done when** — the single demonstrable outcome from SPEC §8. If this can't be demoed, the phase isn't done, regardless of how many boxes are ticked.
3. **Work breakdown** — the tasks, grouped as *Data* → *Server* → *Client* → *Design* so that migrations land before the code that reads them.
4. **Phase gate checklist** — what gets verified and ticked. Nothing moves to the next phase with an unticked box in the gate, unless it is explicitly deferred with a note in this file.

### Phase shape at a glance

| Phase | Theme | Estimate | Gate |
|---|---|---|---|
| 0 | Foundations, infra, auth, household | **10–13 d** | Two accounts share one household |
| 1 | Ingredients & recipes | **8–10 d** | A recipe can be created and read back on mobile |
| 2 | Week planner | **5–7 d** | A full week can be planned and edited |
| 3 | **Shopping list — the product** | **12–15 d** | Plan → correct list → shop |
| 4 | Nutrition (manual-first) & barcode | **8–10 d** | Generic recipe shows a per-serving estimate with honest coverage |
| 5 | Polish, PWA, a11y | **5–7 d** | Installs to home screen, feels finished |
| | **Total** | **48–62 d** | |

**Read the estimates honestly.** They are *focused working days for one person who already knows this stack* — not calendar days, and not evenings. Built at two weeknights plus most of a weekend (call it three focused days a week), the total is **roughly four to five months**. Built full-time, six to nine weeks.

Two things those numbers assume: that the Nuxt 4 + Tailwind v4 spike in 0.1 doesn't turn up a nasty surprise, and that Reka UI (`DESIGN.md` §4.1) really does take the modal plumbing off the table. If either fails, Phase 0 is the phase that absorbs it.

The estimates are deliberately not padded.

Phase 3 is the product. Phases 0–2 exist to feed it; 4–5 make it pleasant. If the schedule compresses, **cut scope from 4 and 5, never from 3.**

### Standing rules that apply to every phase

- [ ] **Migrations are forward-only.** Every schema change is a new timestamped file in `supabase/migrations/`. Never edit a migration that has been applied on a shared environment.
- [ ] **RLS is written in the same migration as the table.** A table is never created without its policies in the same file.
- [ ] **Table grants are written alongside the policies, in the same migration.** A policy without a `GRANT` is a table nobody can query at all — Postgres checks privileges before RLS (DECISIONS.md H3, found by CI, not by review).
- [ ] **Every table added is added to the RLS isolation test** (`supabase/tests/rls.sql`) in the same PR.
- [ ] **Types are regenerated** (`shared/types/database.ts`) whenever a migration lands, and the regeneration is committed.
- [ ] **Components use semantic tokens** (`var(--ui-*)`), never raw ramp steps outside the brand primitives (DESIGN §3).
- [ ] **Every screen ships its empty, loading, and error state in the same PR as its happy path.** Retro-fitting states is how they end up missing.
- [ ] **No non-goals.** Check DESIGN §1.3 before merging any new visual surface.
- [ ] **Touch targets ≥ 44px, inputs ≥ 16px font.** Checked at review, not at the Phase 5 a11y pass.

---

## Phase 0 — Foundations, auth, household

**Objective:** Get a real, deployable Nuxt 4 + Supabase app where a signed-in user belongs to a household, and a second user can join it. Everything after this assumes `household_id` exists and is trustworthy.

**Done when:** two Google accounts, on two devices, resolve to the same `household_id` and both see the same household name in Settings.

### 0.0 Infrastructure

All of `INFRASTRUCTURE.md` §11, which is the checklist form of this task. Summarised: Vercel project on `dub1`, Supabase project on `eu-west-1` (`DECISIONS.md` H2), environment variables in both scopes, Google OAuth with the Supabase-callback indirection, the `healthcheck` table and keepalive cron, security headers. No local Docker (`DECISIONS.md` H1) — local dev connects to the hosted project directly.

**Do this before the scaffold, not after.** A deployed hello-world with working Google sign-in on a real phone takes a morning and de-risks the two things most likely to eat a week later — OAuth redirect configuration and the preview-URL problem (`INFRASTRUCTURE.md` §9.1).

### 0.1 Project scaffold & tooling

- Nuxt 4 with `app/` directory, TypeScript `strict: true`.
- Tailwind v4 via `@tailwindcss/vite`. **Assert there is no `tailwind.config.js`** — CSS-first only (SPEC §1).
- Modules: `@nuxtjs/supabase`, `@pinia/nuxt`, `@vueuse/nuxt`, `reka-ui`, `@nuxt/fonts`, `@vite-pwa/nuxt` (installed now, configured in Phase 5).
- Lint/format: ESLint (`@nuxt/eslint`) + Prettier, one `npm run check` script that runs typecheck + lint + unit tests.
- Vitest with `@nuxt/test-utils`.
- **Playwright with the test-auth global setup** (`INFRASTRUCTURE.md` §7.1) — two seeded sessions against local Supabase, no test route in the app, one signed-in smoke test. Built now because Google OAuth cannot be scripted in CI and Phase 5's gate depends on it.
- CI: a single workflow running `check`, plus `supabase db reset` + the RLS SQL test.

**Risk note:** Nuxt 4's `app/` layout and Tailwind v4's CSS-first config are both relatively new. Spend the first half-day proving `@theme` tokens resolve in a component before building anything on top of them.

### 0.2 Design foundations

- `app/assets/css/main.css` — full token block from DESIGN §3, verbatim: ramps, semantic aliases, `.dark` overrides, base layer, `u-label` / `u-num` / `u-display` utilities, focus-visible ring, reduced-motion block.
- Fonts: Fraunces (variable, `SOFT`/`WONK` axes) and Instrument Sans, self-hosted, `font-display: swap`, preloaded.
- `shared/constants/aisles.ts` — the eleven aisles in walk order with dot colour and Lucide icon name (DESIGN §2.1).
- Shadow tokens (`shadow-bar`, `shadow-sheet`) and motion tokens (`snap`, `move`, `sheet`) registered.
- **`--ui-text-dim` in both themes** (DESIGN §3). Dimming is a colour, never an opacity — three screens depend on it and retrofitting means touching all of them.
- Theme switching: `.dark` class on `<html>`, three-way System/Light/Dark persisted in `useLocalStorage`, no flash on load (inline script in `head`).

### 0.3 Primitives & shell

Build in this order, each with a story/demo page under a dev-only route:

- `BaseButton` (4 variants × 2 sizes, loading, disabled), `BaseInput`, `BaseChip`, `BaseToast` — hand-built.
- `BaseSheet`, `BaseSelect`, and the collapsible/popover primitives — **over Reka UI** (DESIGN §4.1), styled entirely with our tokens.
- `EmptyState` + the stencil marks (empty crate, blank week, unticked list) as inline SVG line art.
- `SkeletonRow`, `SkeletonCard`.
- `AppHeader` (56px, back chevron, ≤2 actions, hairline on scroll past 8px).
- `AppBottomNav` (4 tabs, safe-area, chalk-underline active state, badge slot for List, left rail at ≥lg).
- `layouts/default.vue` and `layouts/auth.vue`.

**`BaseSheet` is load-bearing** — it is the app's only modal pattern (DESIGN §4.1). Focus trap, `Esc`, body-scroll lock, focus restore, and `aria-modal` come from Reka and are **not** reimplemented; that decision is what makes this phase's estimate believable. What is still ours and still needs care: the visual treatment, the grab handle, drag-to-dismiss below 25%, and behaviour when the iOS keyboard opens under a sheet containing an input.

### 0.4 Auth & profiles

- Google OAuth configured in Supabase (local + hosted), redirect URLs for both.
- `@nuxtjs/supabase` route middleware: unauthenticated → `/login`; authenticated with no `household_id` → `/onboarding`.
- Migration: `profiles` table + `on_auth_user_created` trigger creating the row from Google metadata (`display_name`, `avatar_url`).
- **`profiles` RLS policies** exactly as SPEC §3 now specifies — self-or-household select, self-only update, and `household_id` not client-writable at all. The last of those is what stops a user joining any household by guessing a uuid.
- `useHousehold` composable — the **single** helper all household reads go through (SPEC §2, so the later many-to-many migration stays contained).
- Pinia `household` store.
- `/login` screen per DESIGN §5.2, including the dot-grid chalk texture and the OAuth error state.

### 0.5 Household create / invite / join

- Migrations: `households` (**including `portion_size`**, SPEC §2), `household_invites`, plus the `auth_household_id()` `SECURITY DEFINER` helper and the `accept_household_invite(p_code text)` RPC.
- **Invite codes to the specification in SPEC §3** — Crockford base32, 10 characters, CSPRNG, 72-hour expiry, single-use, 10 attempts per user per hour, generic failure message. This is the app's only trust boundary and "short, URL-safe" was not a specification.
- **`portion_size` seeded from the member count on create and on join, then user-owned.** The stepper in `/settings/household.vue` is the whole feature.
- **`household_invites` is never exposed to the client** — no select policy at all; joining goes only through the RPC (SPEC §3).
- Server routes: `server/api/invites/create.post.ts`, `accept.post.ts`.
- Screens: `/onboarding/index.vue` (create/join fork), `/onboarding/join.vue` (code entry, `?code=` prefill with the 400ms confirmation beat), invite display with the dashed coupon block, Copy / Share.
- `/settings/index.vue` and `/settings/household.vue` (member list, plain-English portion multiplier, regenerate code, leave household behind typed confirmation).
- Error cases each with their own message: invalid code, expired code, already in a household.

### Phase 0 gate checklist

**Infrastructure** — the full list is `INFRASTRUCTURE.md` §11; it is part of this gate, not a separate exercise.
- [ ] All of `INFRASTRUCTURE.md` §11 ticked (hosting, Supabase, secrets, auth, CI, operations).

**Build & tooling**
- [ ] `npm run check` passes clean (typecheck, lint, unit).
- [ ] `supabase start` → `supabase db reset` applies all migrations without error (verified in CI — no local Postgres, `DECISIONS.md` H1).
- [ ] CI runs check + migrations + RLS test on every push.
- [ ] No `tailwind.config.js` exists in the repo.

**Design foundations**
- [ ] Every token in DESIGN §3 resolves in a rendered component (spot-check one colour, one type step, one radius, one shadow).
- [ ] Fraunces variable axes (`SOFT 40`, `WONK 1`) visibly apply to `.u-display`.
- [ ] Dark mode toggles with no flash of light theme on hard reload.
- [ ] All eleven aisles present in `shared/constants/aisles.ts` in walk order.

**Primitives**
- [ ] Every primitive has been eyeballed in light and dark at 390px and 320px.
- [ ] `BaseSheet`: opens, traps focus, closes on `Esc`, closes on scrim tap, drag-dismiss below 25%, restores focus to the trigger, locks body scroll.
- [ ] `BaseButton` loading state does not change the button's width.
- [ ] `AppBottomNav` clears the iPhone home indicator (`env(safe-area-inset-bottom)` verified on a real device or simulator).
- [ ] Bottom nav becomes a left rail at ≥lg.
- [ ] Every interactive element shows the 2px beetroot focus ring on keyboard focus.

**Auth & household**
- [ ] Google sign-in works locally and on the deployed environment.
- [ ] A brand-new user lands on `/onboarding`, not on a broken home screen.
- [ ] `profiles` row is created automatically on first sign-in with name and avatar populated.
- [ ] Creating a household sets `profiles.household_id` and routes to the invite screen.
- [ ] **Two accounts on two devices share one household** (the gate).
- [ ] Invite link with `?code=` prefills and auto-submits.
- [ ] Invalid / expired / already-in-a-household each produce their own specific message.
- [ ] `household_invites` cannot be selected from the client (verified by an explicit failing query in the RLS test).
- [ ] RLS test: user in household A cannot read household B's `households` row.

---

## Phase 1 — Ingredients & recipes

**Objective:** Give the planner something to plan with. A household can build a canonical ingredient list and a recipe library, with images.

**Done when:** a recipe with ingredients and steps can be created on a phone and read back correctly.

### 1.1 Data

- Migrations: `ingredients`, `recipes`, `recipe_ingredients`, `recipe_steps` — each with RLS in the same file; child tables use the `exists (… parent.household_id = auth_household_id())` form. Every FK carries an explicit `on delete` per SPEC §2's table.
- **`products` is created in this phase too**, empty and unused, so that `ingredients.product_id` has something to reference. SPEC §2 lists `product_id` among the columns created now, and a FK cannot point at a table that doesn't exist — so either `products` lands here or the "Phase 4 adds no migration to `ingredients`" claim is false. It lands here: it is a table definition and a select policy, with no UI and no server route until Phase 4.
- `ingredients` carries all of SPEC §2's columns from the start: unique on `(household_id, lower(name))`, the nullable nutrition set (`nutrition`, `nutrition_source`, `grams_per_unit`, `density_g_per_ml`, `product_id`), plus **`unit_label`** and **`is_regular`**. Phase 4 then adds no migration to this table, as intended.
- Supabase Storage bucket for recipe images, with a policy scoping paths by `household_id`.
- `seed.sql` with a handful of **generically named** ingredients ("Chicken breast", not "Tesco Finest…" — the seed is the naming example everyone copies) and 3–4 realistic recipes so the planner and list have data to chew on from Phase 2 onward. **Seed data is a deliverable, not a convenience** — Phase 3's aggregation is untestable by hand without it. **Use `REAL-WEEK-EXAMPLE.md`'s five recipes as this data** rather than inventing new ones — they're real, and the hand-aggregated shopping list in that doc already exists as the expected output for the Phase 3 gate's "hand-computed week" check.

### 1.2 Units foundation

- `app/utils/units.ts` — the unit table from SPEC §4 (mass/volume/count/imprecise, factors to base), plus family lookup and base conversion.
- Display of counted quantities reads `unit_label` from the ingredient — `3 cloves`, not `3 unit` and not a bare `3`.
- Unit tests for conversion and family classification. This lands in Phase 1 because the recipe editor's unit select reads from it.

### 1.3 Ingredient management

- Ingredient combobox over household ingredients with an inline "Create '…'" option.
- Create-ingredient sheet: name, aisle select (with dot + icon), **count noun (`unit_label`), shown only when the unit is `unit`**, `is_staple` and `is_regular` switches (mutually exclusive, DESIGN §5.13), optional barcode field (scanner wired in Phase 4 — the field exists now, disabled with a note).
- **Generic-naming affordance ships here, not in Phase 4**: `Chicken breast` placeholder plus the "Generic, not a brand" hint (DESIGN §5.6). It costs nothing now and every ingredient created before Phase 4 is named under it.
- `/settings/pantry.vue` — **two sections, STAPLES and REGULARS** (DESIGN §5.13), with search across both, per-row switches, the two explainer blocks, and the first-run quick-add chips. The pairing is what makes either concept comprehensible: one is *you already have it*, the other is *you always need it*.

### 1.4 Recipe CRUD

- `/recipes/index.vue` — search, filter chips (All / Quick <30 min / Recently added), 2-col `RecipeCard` grid, empty state, and a **distinct no-results state**.
- `/recipes/[id].vue` — hero, title block, meta chips, **servings stepper with live client-side rescaling**, ingredients, method (hidden entirely at zero steps), sticky bottom action bar. `NutritionPanel` slot left empty until Phase 4.
- **Paste-a-list bulk entry** (SPEC §7, DESIGN §5.8) — `app/utils/parseIngredientLines.ts` plus the review sheet. Deliberately a crude parser behind an editable review step. This is the cheapest available mitigation for the largest adoption risk in the project (SPEC §10), and it belongs here because every recipe entered before it exists is entered the slow way.
- `/recipes/new.vue` and `/recipes/[id]/edit.vue` — single-column form, not a wizard. DETAILS / INGREDIENTS / METHOD sections, `IngredientRow` editor grid, drag reorder with keyboard ↑/↓, auto-growing step textareas with Enter-to-next, sticky save bar, unsaved-changes guard, inline on-blur validation.
- Delete with confirmation; deleting a recipe used in a plan must be handled — decide and document: **plan entries referencing a deleted recipe are removed and the affected slots emptied**, with the user warned by name of the weeks affected.

### 1.5 Image upload

- Camera / library picker, client-side resize before upload (cap the long edge at ~1600px), 4:3 preview with replace/remove, upload progress, failure state that keeps the rest of the form intact.

### Phase 1 gate checklist

- [ ] Ingredient names are case-insensitively unique per household (verified by attempting "Onions" then "onions").
- [ ] Create-ingredient sheet shows the generic-naming placeholder and hint.
- [ ] Seed ingredients are all generically named — no brand or pack size anywhere in `seed.sql`.
- [ ] Creating an ingredient inline from the recipe editor works without losing form state.
- [ ] A recipe with 0 steps renders with no METHOD section and no placeholder.
- [ ] A recipe with 20 ingredients scrolls and edits comfortably at 390px.
- [ ] Servings stepper rescales every quantity live and **never writes to the recipe**.
- [ ] Image upload works from camera and from library on iOS Safari and Android Chrome.
- [ ] Recipe images are scoped by household in Storage (a user in household B cannot fetch A's image path).
- [ ] Unsaved-changes guard fires on back navigation and on tab switch.
- [ ] Validation is inline and on blur — no summary block at the top.
- [ ] Empty, no-results, loading (skeleton grid), and error states all exist on `/recipes`.
- [ ] Unit tests pass for `units.ts`, including `unit_label` display ("3 cloves", never "3 unit").
- [ ] Pasting ten ingredient lines produces ten editable rows, with unmatched names offered for creation and unparseable lines surfaced rather than dropped.
- [ ] An ingredient can be a staple or a regular but never both.
- [ ] RLS test extended: household B cannot read A's recipes, recipe_ingredients, recipe_steps, or ingredients.
- [ ] Deleting a recipe referenced by a plan behaves as documented and warns first.
- [ ] **Gate:** a recipe created on a phone reads back correctly on the other household member's phone.

---

## Phase 2 — Week planner

**Objective:** Let the household write the week down. Seven days, three slots, Monday-start, editable and navigable.

**Done when:** a full week can be planned, edited, and navigated forward and back.

### 2.1 Data & dates

- Migrations: `meal_plans` (CHECK that `week_start` is a Monday; unique `(household_id, week_start)`), `meal_plan_entries` (**unique `(meal_plan_id, day_of_week, slot, recipe_id)`** and a `sort_order` column), with RLS.
- **A slot holds more than one recipe** (SPEC §2, `RECIPE-MODEL-SPIKE.md` F7). Curry *and* rice; a roast that is a chicken plus potatoes plus two veg. Permitting it now costs one constraint and a column; retrofitting it later reworks the slot row, the picker, the aggregation input shape, and the `sources` jsonb.
- `app/utils/dates.ts` — ISO week helpers, Monday-start, en-GB formatting, `YYYY-MM-DD` week keys. **Timezone handling is decided here:** `week_start` is a plain date, never a timestamp; all comparisons happen in local time.
- **Blank slots are absent rows** (SPEC §2) — no placeholder inserts, ever. Assert this in review.
- Plan rows are created lazily: the `meal_plans` row is upserted on the first entry written for that week.

### 2.2 Planner screen

- `/plan/index.vue` → redirect to the current week. `/plan/[week].vue` keyed by `YYYY-MM-DD`.
- Sticky week header: `‹ W/C 25 Aug ›`, "Today" button appearing only when the current week is off-screen, week changes pushed to the router so browser back works.
- Horizontal swipe between weeks (`useSwipe`) with a 180ms slide.
- `WeekDayCard` ×7 — today highlighted with the beetroot left rule and tinted header, past days in the current week in `--ui-text-dim` but still editable. **Dimming is the token, not opacity** (DESIGN §3).
- `MealSlotRow` — the `[label 76px][content 1fr][action 44px]` grid, empty variant, and a **filled variant that stacks one to three recipes** (DESIGN §5.5). "×2 portions" note when the multiplier ≠ 1 — this note is the app's main surface for teaching batch-cook planning (SPEC §4), so it is not decorative.

### 2.3 Slot assignment

- `RecipePickerSheet` — sticky search, RECENT row, ALL RECIPES list, pinned "Just a note…" and "New recipe" actions. **Autofocus only on pointer-fine devices** (DESIGN §5.5).
- "Add another" on a filled slot; clear an individual recipe or the whole slot.
- Clear via swipe-left (56px clay action) **and** long-press action sheet (Clear / Swap / Open recipe) — both, because swipe is undiscoverable and long-press is slow.
- Undo toast on clear.
- Note-only entries (`meal_plan_entries.note` with no recipe).

### 2.4 Home screen

- `/index.vue` per DESIGN §5.4: greeting row, Today hero card, shopping status card (three mutually exclusive forms — placeholder "Generate list" wired in Phase 3), rest-of-week strip (**the only horizontal scroll in the app**), recently cooked grid.
- Skeletons in the exact card shapes; fresh-household empty state.

### Phase 2 gate checklist

- [ ] `week_start` CHECK rejects a non-Monday date (verified with a direct insert).
- [ ] A week with zero entries has **no rows at all** in `meal_plan_entries` and no `meal_plans` row until first use.
- [ ] Same recipe can be placed in two slots and both entries persist independently.
- [ ] Two different recipes in one slot both persist, render as a stack, and can be removed independently.
- [ ] The unique constraint still rejects the *same* recipe twice in one slot.
- [ ] Week navigation via chevrons, swipe, and browser back all agree.
- [ ] "Today" button appears only when the current week is not in view.
- [ ] Today's card is visually distinct; past days are dimmed but still editable.
- [ ] Clearing a slot works by both swipe and long-press, and Undo restores it.
- [ ] Picker sheet does not autofocus search on mobile (keyboard doesn't cover the sheet).
- [ ] Note-only entry renders correctly in the slot and on the home screen.
- [ ] The whole planner is usable one-handed at 390px; verified at 320px without clipping.
- [ ] Home screen shows correct today/tomorrow content across a midnight boundary (test by clock change).
- [ ] Both household members see the same plan (write on one device, refresh on the other).
- [ ] RLS test extended to `meal_plans` and `meal_plan_entries`.
- [ ] **Gate:** a complete 21-slot week can be planned and then edited down to 5 slots without error.

---

## Phase 3 — Shopping list (the product)

**Objective:** Turn a plan into a correct, walkable shopping list that two people can tick off together in a supermarket.

**Done when:** plan → correct list → shop.

> This is the phase that justifies the app. It gets the most test coverage, the largest touch targets, and the highest scrutiny in review. Budget more time here than for 0–2 combined if necessary.

### 3.1 Aggregation engine — build and test this first, in isolation

`app/utils/aggregate.ts`, pure TypeScript, no Supabase imports. **Written and fully unit-tested before any UI exists**, because every bug here is invisible until you're standing in a supermarket.

Rules from SPEC §4:
- `multiplier = household.portion_size / recipe.servings`; each entry contributes independently.
- Group by `(ingredient_id, family)`; sum in base units at full precision.
- **Round once, upward, to a step**: `ceil` to 5 under 100, to 10 under 1000, to 100 at or above 1000; counts `ceil` to a whole number. Always up — rounding down under-buys, and under-buying breaks the meal.
- **Then format, and formatting never rounds.** ≥1000 divides by 1000 into kg/l, exact at 1dp because the step was chosen to divide cleanly. The old "nearest 50 above 1000 → kg to 1dp" was two roundings stacked.
- Two families for one ingredient → two lines, never converted.
- Imprecise units → listed with no quantity.
- Staples → diverted to the "assumed you have" bucket, never dropped.
- `is_regular` ingredients → seeded onto every new list with no quantity; an ingredient that is both regular and recipe-derived emits **one** line carrying the recipe quantity.

The named test cases (SPEC §9) are the acceptance criteria, not a suggestion:

- [ ] Cook-once-eat-twice: household 2, recipe serves 2, planned Mon lunch + Mon dinner → ingredients for 4 portions.
- [ ] Cross-family: 400 g tomatoes + 200 ml passata → two lines.
- [ ] Count round-up: 1.5 onions → 2.
- [ ] End-only rounding: seven contributions of 33 g → 231 g summed → **240 g** (not 7 × 35 = 245).
- [ ] Rounding is upward, not to-nearest: 102 g → 110 g, never 100 g.
- [ ] Formatting introduces no second rounding: 1,240 g → ceil-100 → 1,300 g → "1.3 kg" exactly.
- [ ] Regular ingredient with no plan contribution appears with no quantity; regular *and* recipe-derived appears once, with the quantity.
- [ ] Staple exclusion: salt appears in the staples bucket, not the main list.
- [ ] Fractional multiplier: household 3, recipe serves 4 → 0.75×.
- [ ] Null quantity ("to taste") → line with no quantity, no `NaN`.
- [ ] Empty plan → empty list, no crash.

### 3.2 Data & generation route

- Migrations: `shopping_lists` (**plus the partial unique index `(household_id) where status = 'active'`**), `shopping_list_items` with the `ingredient_id` XOR `custom_name` CHECK and the nullable `previous_quantity` column, plus RLS.
- `server/api/shopping-lists/generate.post.ts` — a **Nitro route, not a Postgres function** (SPEC §6), importing the same `units.ts`/`aggregate.ts` the client uses for preview.
- `sources` jsonb populated with contributing recipes and slots for the "why is this here?" tap.
- Aisle assigned from the ingredient at generation time.

### 3.3 Staleness & regeneration

- **Staleness is a database trigger, and it covers three tables, not one** (SPEC §4). Writes to `meal_plan_entries`, to a contributing **recipe** or its ingredients, and to a contributing **ingredient** (`is_staple`, `is_regular`, aisle) all set `is_stale = true`. Marking salt as a staple after generating a list is completely ordinary, and the obvious plan-only implementation misses it.
- A trigger rather than route-level, decided: staleness must hold regardless of which code path wrote, and there are now three source tables to cover.
- Regeneration implements **all six cases** in SPEC §4's table — match on `(ingredient_id, family)` or `custom_name`; quantity decreases apply silently; quantity increases set `previous_quantity` and surface a badge; a no-longer-required item that is **ticked becomes a manual item rather than disappearing**; manual items are always preserved.
- Confirm sheet states plainly what is preserved before regenerating.

### 3.4 List screen

`/list/[id].vue` per DESIGN §5.9:
- Sticky progress header — `num-lg` "12/27", presence avatars, 6px chalk progress rule with `bay-600` fill, overflow menu (Regenerate / Mark complete / Share).
- Stale banner, sticky with the header.
- `ShoppingListGroup` per aisle in walk order — sticky sub-headers that stack *under* the progress header, collapsible with state in `useLocalStorage` per list, auto-collapse when fully checked.
- `ShoppingItemRow` — 56px min, full-row hit area, real `<input type="checkbox">`, sources line, right-aligned tabular quantity, `3 unit` rendered as "3".
- **Tick-and-sink** — the app's signature motion: tick at 120ms, sink to the bottom of the group at 180ms, settle at 55% with a left-to-right strikethrough. Reduced-motion replaces it with an instant reorder.
- "Assumed you already have" collapsed section with per-item "Add to list".
- Add-item row pinned above the nav, aisle guessed from the name, Enter submits and keeps focus.
- Completion sheet when the last item is ticked. No confetti.
- `/list/index.vue` — active list card + past lists, past lists read-only.

### 3.5 Realtime & optimistic updates

- Supabase channel on `shopping_list_items` filtered by `list_id`.
- Optimistic local tick; failed write reverts the row and raises a toast.
- Partner's tick animates as if local, with a 20px avatar fading in for 3s. **No toast for partner ticks** — unbearable in a supermarket.
- Presence for the avatar pair in the header.
- Reconnect after backgrounding the app re-syncs state (this is the realtime bug you will actually hit).

### 3.5b Offline tick queue

The one exception to online-first (SPEC §7), and the reason the app works in an actual supermarket rather than only in a kitchen.

- `useTickQueue` — `{ item_id, is_checked, checked_at }` buffered in `useLocalStorage`, keyed by list.
- Flush on `online`, on visibility change, and on realtime reconnect. Last-write-wins on `checked_at`.
- Offline strip copy on this screen only: "You're offline — ticks are saved and will sync." **Checkboxes stay enabled**; add-item, regenerate, and complete disable as normal.
- Refuse to flush against a `completed` list — drop the queue with a toast rather than replaying stale ticks.
- **Scope is exactly ticks.** Everything else stays strictly online, which is what keeps this a day rather than a sync engine.

### 3.6 Ad-hoc items

- Manual items in the same table so ticking is identical.
- Manual items swipe-left to delete with undo; **recipe-derived items cannot be deleted**, only ticked or long-pressed for "Mark as already have".

### 3.7 States

Generating (skeleton groups + "Working out quantities…"), empty plan, completed (read-only, dimmed, "Completed 24 Aug"), regional error per group, offline strip.

### Phase 3 gate checklist

**Correctness (the ones that matter)**
- [ ] All eight aggregation unit tests above pass.
- [ ] A hand-computed week (worked out on paper from the seed data) matches the generated list **exactly**, quantity for quantity.
- [ ] Rounding happens once — verified by a test that would fail under per-entry rounding.
- [ ] Staples never appear in a main aisle group.
- [ ] The staples section is present even when empty-ish, and lists every excluded staple.

**Regeneration**
- [ ] Editing a plan with an existing list sets `is_stale` and shows the banner.
- [ ] Regenerate preserves ticks for items still present.
- [ ] Regenerate preserves **all** manual items, always.
- [ ] Regenerate removes items no longer required by the plan.
- [ ] Quantity **increase** on an already-ticked item keeps the tick and shows the "now 800 g — was 500 g" badge until acknowledged.
- [ ] A ticked item no longer required by the plan becomes a manual item rather than disappearing.
- [ ] Confirm sheet states what is preserved before the user commits.

**Shopping experience**
- [ ] Every row is ≥ 56px and the whole row is tappable.
- [ ] Groups render in the walk order from `aisles.ts`, always.
- [ ] Sticky aisle headers stack under the progress header, never over it.
- [ ] Tick-and-sink runs at 120/180ms and collapses to instant under `prefers-reduced-motion`.
- [ ] Checked state is legible without colour (strikethrough + opacity + glyph).
- [ ] Progress header announces "12 of 27 items" via `role="status" aria-live="polite"`.
- [ ] Collapse state persists per list across reloads.
- [ ] Add-item keeps focus after Enter for rapid entry.
- [ ] "Why is this here?" sheet shows the contributing recipes and slots.
- [ ] Completion sheet appears on the last tick and can be dismissed with "Keep shopping".

**Realtime**
- [ ] Two devices on the same list: a tick on one appears on the other within ~1s.
- [ ] Optimistic tick reverts with a toast when the write fails (test by killing the network mid-tick).
- [ ] Backgrounding and reopening the app re-syncs without duplicate or lost ticks.
- [ ] **Airplane mode mid-shop:** ticks continue to register, the strip says they will sync, and they land correctly on reconnect.
- [ ] Two devices ticking the same item while one is offline converge rather than fight.
- [ ] A queue flushed against a completed list is dropped with a toast, not replayed.
- [ ] Partner ticks raise **no** toast.
- [ ] Presence avatars appear and disappear correctly.

**Data**
- [ ] `ingredient_id` XOR `custom_name` CHECK rejects both-null and both-set.
- [ ] A second `active` list for one household is rejected by the partial unique index.
- [ ] Editing a recipe, and separately toggling an ingredient's staple flag, each set `is_stale` on the active list.
- [ ] RLS test extended to `shopping_lists` and `shopping_list_items`.
- [ ] **Gate: a real weekly shop is done with this app, in an actual supermarket, by two people.** Nothing else proves this phase.

---

## Phase 4 — Nutrition (manual-first) & barcode scanning

**Objective:** Attach nutrition to **generic** ingredients. Manual entry is the primary path; barcode scanning is the accelerator for the packaged minority (SPEC §5).

**Done when:** a recipe made of generic ingredients — some typed by hand, some scanned — shows a per-serving estimate with honest weighted coverage.

> **Ordering note:** build 4.4 (manual entry) *before* 4.3 (scanner). Nutrition must work end-to-end with the camera never opened, because most ingredients in this app have no barcode. Building the scanner first makes manual entry an afterthought, which is the exact failure this phase is shaped to avoid.

> **Do the iOS ponyfill spike on day one of this phase** (SPEC §10). iOS Safari has no `BarcodeDetector`; the ponyfill is load-bearing on the majority of likely devices. Discovering it doesn't work at the end of the phase is the worst outcome available here.

### 4.1 Ponyfill spike (first task, timeboxed)

- Prove `barcode-detector` decodes EAN-13 from a live camera stream on a real iPhone, in Safari, over HTTPS.
- Measure detection latency and bundle cost; lazy-load the ponyfill so it never lands in the main chunk.
- If it fails: the scanner becomes an Android/desktop enhancement and manual entry is the documented iOS path. Decide this in week one, not week three.

### 4.2 Products cache & server route

- **No migration to `products` or `ingredients` in this phase.** Both tables were created complete in Phase 1 precisely so that this phase adds server routes and UI only. If a migration turns out to be needed here, something in Phase 1 was wrong.
- `server/api/products/[barcode].get.ts` — cache hit, else fetch Open Food Facts, normalise, upsert, return.
- Descriptive `User-Agent` as OFF asks. Refetch only when `fetched_at` is older than 90 days.
- Map `product_name`, `brands`, `quantity`, `image_front_url`, `nutriscore_grade`, and `nutriments` → kcal, fat, saturates, carbs, sugars, fibre, protein, salt per 100 g/ml. `categories_tags` → best-effort aisle guess.
- Rate-limit and time-out the outbound fetch; an OFF outage must degrade to manual entry, not to a hung request.

### 4.3 Scanner UI

- Full-screen route-level overlay, always dark. Viewfinder cutout with turmeric corner brackets. No laser line.
- **"Enter manually" is always visible**, never hidden behind a failure (SPEC §5, §10).
- Haptic + bracket flash + freeze on detect, then `ProductCard` sheet.
- States: requesting permission, denied (with how to re-enable), unsupported device (straight to manual, no error framing), lookup failed / not found (barcode shown, "Add details manually" prefilled).

### 4.4 Manual nutrition entry (build this first)

The **primary** path, with equal design care (SPEC §5, §10). Two distinct entry points, easily confused:

- **Ingredient-level, no barcode involved** — the NUTRITION (OPTIONAL) disclosure in the create/edit ingredient sheet (DESIGN §5.6): seven per-100 g/ml fields, all optional, written to `ingredients.nutrition` with `nutrition_source = 'manual'`. Plus `grams_per_unit` and `density_g_per_ml`, surfaced only when `default_unit` makes them relevant. This is how loose produce and butcher-counter meat get nutrition, and it must be reachable without the camera ever existing.
- **Barcode not found** — the product form prefilled with the barcode, saved to `products` as `source: 'manual'`.

### 4.5 Linking rules

- "Link to ingredient" writes `product_id` and `nutrition_source = 'product'` — **nothing else**. Name, aisle, `default_unit`, and `is_staple` are untouched (SPEC §5). Assert this in a unit test; it is the single easiest thing to get wrong in the phase, and getting it wrong puts brand names into recipes.
- `ProductCard`'s confirmation line names the ingredient, not the packet (DESIGN §5.11).

### 4.6 Nutrition presentation

- `app/utils/nutrition.ts` — pure, unit-tested:
  - resolve each recipe line to grams (mass direct; volume × `density_g_per_ml`; count × `grams_per_unit`; imprecise excluded entirely);
  - **an unresolvable line is an uncovered line**, never a silently skipped one and never 1 ml = 1 g;
  - resolve nutrition per SPEC §5's order (product → manual → none);
  - sum, divide by `servings`, and report **mass-weighted** coverage alongside the raw count.
- Computed from **unrounded recipe quantities**, never from shopping-list quantities.
- `NutritionPanel` — "NUTRITION — ESTIMATE" header, weighted coverage line before any numbers, per-serving 4-column grid at coarse precision (kcal → nearest 10, macros → nearest gram, salt → 0.1 g), "Raw weights, before cooking" footnote, disclosure for saturates/sugars/fibre/salt.
- **"Not included" states the reason per ingredient** and routes to the fix — scan, enter manually, add a weight per item, or add a density (DESIGN §5.12).
- **Under 50% weighted coverage, figures collapse behind "Show estimate anyway."**

### Phase 4 gate checklist

- [ ] Ponyfill spike completed and its outcome recorded in this file.
- [ ] EAN-13 scans successfully on a real iPhone (Safari) and a real Android (Chrome).
- [ ] Ponyfill is lazy-loaded and absent from the initial bundle.
- [ ] Cache hit returns without an outbound request (verified in server logs).
- [ ] Records older than 90 days refetch; newer ones don't.
- [ ] OFF timeout / 500 / 404 each degrade to manual entry with a clear message.
- [ ] `products` cannot be written from the client (explicit failing insert in the RLS test).
- [ ] Camera permission denial shows the re-enable instructions and "Enter manually" as primary.
- [ ] A device with no camera goes straight to manual entry with no error framing.
- [ ] Manual entry is reachable in ≤2 taps from the ingredient sheet without opening the camera.
- [ ] An ingredient can be given full nutrition **with no barcode and no camera**, end to end.
- [ ] **Linking a product changes only `product_id` and `nutrition_source`** — name, aisle, `default_unit`, and `is_staple` are byte-identical after linking (unit test + manual check).
- [ ] No brand name, pack size, or product image appears anywhere in a recipe or on the shopping list — only behind the barcode icon's `ProductCard`.
- [ ] Count and volume lines resolve via `grams_per_unit` / `density_g_per_ml`, and lines lacking them are reported as **uncovered**, not skipped (unit test asserts coverage drops).
- [ ] Coverage is **mass-weighted**: a recipe of 600 g uncovered chicken + 2 g covered pepper reports low coverage, not 50%.
- [ ] Nutrition is computed from recipe quantities, not shopping-list quantities (unit test with a rounding-sensitive case).
- [ ] Nutrition is **never** shown without the estimate label and coverage line.
- [ ] Figures render at coarse precision — no two-decimal values anywhere in the panel.
- [ ] Weighted coverage under 50% hides the figures behind a disclosure.
- [ ] "Not included" gives a per-ingredient reason and routes to the matching fix.
- [ ] Nutri-Score badge uses official colours, appears only in `ProductCard`, and **never on a recipe**.
- [ ] Open Food Facts attribution present in Settings → About.
- [ ] **Gate:** a recipe of generic ingredients — mixed manual and scanned — shows a per-serving estimate with weighted coverage, and its ingredient names contain no brands.

---

## Phase 5 — PWA, states, accessibility

**Objective:** Make it feel finished and install it on the two phones that will actually use it.

**Done when:** it installs to the home screen and holds up under scrutiny.

### 5.1 PWA

- `@vite-pwa/nuxt` manifest: "Household Meals" / "Meals", `standalone`, `theme_color` `#FAF6EF` with media-matched `#14120F`.
- Maskable icon set (192/512 + maskable 512 with 20% safe padding), separate Apple touch icon.
- App-shell precache, online-first. **The one write that survives offline is the tick queue** (SPEC §7, Phase 3.5b) — the service worker must not interfere with it.
- `viewport-fit=cover` plus safe-area padding on the nav and every sticky bar.
- Splash with the Fraunces wordmark.

### 5.2 State audit

Walk every route and confirm empty / loading / error / offline. The offline strip (turmeric, persistent, mutating controls `aria-disabled` with labels intact, bay-100 for 2s on reconnect) is implemented once and verified everywhere.

### 5.3 Accessibility pass

Against DESIGN §7 as acceptance criteria, not aspirations.

### 5.4 Performance & polish

- Lighthouse on mobile; route-level code splitting; images sized and lazy-loaded below the fold.
- Reduced-motion sweep; dark-mode sweep on every screen.
- Error messages audited: every one names the thing that failed and what to do. **Zero instances of "Something went wrong."**

### 5.5 End-to-end test

Playwright happy path (SPEC §9): sign in → create recipe → plan week → generate list → tick item.

### Phase 5 gate checklist

**PWA**
- [ ] Installs to the home screen on iOS and Android.
- [ ] Launches standalone with no browser chrome.
- [ ] Icon renders correctly maskable (no clipped mark) on Android.
- [ ] Bottom nav clears the home indicator in standalone mode.
- [ ] `theme_color` matches the active theme in both light and dark.

**States**
- [ ] Every route has empty, loading, and error states — walked and ticked route by route.
- [ ] Offline strip appears, disables mutations, and clears on reconnect.
- [ ] No "Something went wrong" anywhere in the codebase (grep it).

**Accessibility**
- [ ] All body and label text ≥ 4.5:1; UI strokes ≥ 3:1 (measured, not assumed).
- [ ] Every target ≥ 44px; list and slot rows ≥ 56px.
- [ ] Layout survives 200% text size on every screen with no clipping.
- [ ] Visible focus ring on every interactive element; sheets trap and restore focus.
- [ ] Checkboxes are real inputs with labels; aisle groups are `<section aria-labelledby>`.
- [ ] Screen-reader pass on the shopping list with VoiceOver — the whole flow is operable.
- [ ] `prefers-reduced-motion` collapses all transitions and disables the sink.
- [ ] No state communicated by colour alone.

**Quality**
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
- [ ] Playwright happy path green in CI.
- [ ] Every screen checked at 390px and 320px, light and dark (DESIGN "definition of visually done").
- [ ] No shadow outside the two permitted tokens; no colour outside the token set.
- [ ] **Gate:** both household members have it installed and used it for one real week.

---

## 6. Risk register

Carried from SPEC §10 with an owner and an action against each. **Owner is a name, not a role** — replace `Lead` below once more than one person is building. A risk with no name against it is a risk nobody is watching.

| Risk | Owner | Impact | Mitigation | Phase |
|---|---|---|---|---|
| **Cold-start data entry** — ~20 recipes and ~60 ingredients typed by hand before the app is useful once | Lead | The most likely reason this is abandoned, ahead of any bug | Paste-a-list bulk entry ships in Phase 1, not later (SPEC §7); seed data is a deliverable | 1 |
| **No restorable backup on the free tier** | Lead | Hand-typed recipe library lost permanently | Accepted with named triggers and two costed escape hatches (`INFRASTRUCTURE.md` §8) | 0, review at 3 |
| Aggregation bugs invisible until in-store | Lead | Wrong shopping, loss of trust | Pure functions, unit tests written before UI, one hand-computed week verified end to end | 3 |
| Regeneration wipes or misleads on a half-shopped list | Lead | Worst possible in-store failure | All six preservation cases in SPEC §4 tested explicitly; confirm sheet states what is kept | 3 |
| **Supermarket connectivity** — the list goes read-only exactly where it is used | Lead | The product fails at its own core moment | Offline tick queue in Phase 3.5b; ticks stay enabled offline | 3 |
| iOS Safari lacks `BarcodeDetector` | Lead | Scanner dead on the likeliest device | Ponyfill spike as the **first task** of Phase 4; documented fallback if it fails | 4 |
| OFF coverage thin for own-brand and nil for loose produce | Lead | Manual entry is the main path, not the fallback | Build 4.4 before 4.3; never gate manual entry behind a scan failure | 4 |
| Linking a product renames the ingredient to the packet | Lead | Brand names leak into recipes and lists | Linking writes `product_id` + `nutrition_source` only; unit test and a gate item | 4 |
| `grams_per_unit` / `density_g_per_ml` mostly unset | Lead | Count and volume lines stay uncovered; coverage looks poor | Honest by design — weighted coverage names the missing field and routes to it | 4 |
| Nutrition coverage stays uselessly low | Lead | Feature is dead weight | Additive escape hatch: a `nutrition_refs` table as step 2.5 of SPEC §5's resolution order | post-4 |
| **Batch-cook planning is a learned behaviour** — recipes serve 4, households are 2, and nobody halves a bolognese | Lead | Lists short by half, every week, invisibly | Editable `portion_size`; the "×2 portions" note on the slot row; one line of onboarding copy | 0, 2 |
| Portion multiplier over-shops solo meals | Lead | Wasted food | Accepted for v1; per-slot counts are now an override of an existing number | — |
| Google-only auth; unscriptable in CI | Lead | Both members need Google accounts; E2E gate unreachable | Test-auth via Supabase Admin API decided and built in Phase 0 (`INFRASTRUCTURE.md` §7.1) | 0 |
| Nuxt 4 + Tailwind v4 both new | Lead | Scaffold churn | Half-day spike proving tokens render before building on them | 0 |
| Realtime desync after backgrounding | Lead | Ticks lost mid-shop | Explicit resync-on-resume test in the Phase 3 gate | 3 |
| **Free-tier project pausing** | Lead | App dead on a Sunday evening, manual restore needed | Twice-weekly keepalive cron (`INFRASTRUCTURE.md` §3.3) | 0 |

---

## 7. Deferred to v2 (recorded so it stays deferred)

- Per-slot eater counts (one nullable column on `meal_plan_entries`).
- Many-to-many households (`household_members` join table replacing `profiles.household_id`; all reads already behind `useHousehold`).
- Email magic-link auth.
- Pantry as inventory rather than a flag.
- Hiding the breakfast row entirely, for households who don't plan it (`RECIPE-MODEL-SPIKE.md` F10).
- `is_optional` on recipe lines — the `note` field carries "to serve" adequately for now (F5).
- Offline *write* beyond ticks — recipe editing, planning, and generation stay online.
- Prices, currency, budgeting — **explicitly out of scope, permanently** (SPEC §0).

---

## 8. Progress log

Append one line per phase gate as it closes: date, who verified, anything deferred.

| Date | Phase | Verified by | Notes / deferrals |
|---|---|---|---|
| | | | |
