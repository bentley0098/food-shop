# Decision Log

**Status:** Live · **Opened:** 2026-08-24
**Companions:** `SPEC.md`, `DESIGN.md`, `PLAN.md`, `INFRASTRUCTURE.md`, `RECIPE-MODEL-SPIKE.md`
**This document:** every decision taken during the pre-build CTO review, what was decided, why, and where it landed. One row per item, so each can be marked complete before Phase 0 opens.

Append new entries at the bottom. Never edit a closed one — supersede it with a new entry that references it, the same discipline as the migrations.

---

## Status at a glance

| ID | Item | Decision | Status |
|---|---|---|---|
| A1 | Infrastructure documented | Vercel + one Supabase project, free tier | ✅ Closed |
| A2 | Test authentication for CI | Supabase Admin API in Playwright setup, no test route | ✅ Closed |
| A3 | FK delete behaviour | Explicit `on delete` on every FK, rule table in SPEC §2 | ✅ Closed |
| A4 | `profiles` RLS | Self-or-household select, self-only update, `household_id` not client-writable | ✅ Closed |
| B1 | Double rounding | Round once in base units, then format; formatting never rounds | ✅ Closed |
| B2 | Rounding direction | Always up, never to-nearest | ✅ Closed |
| B3 | Count-noun ambiguity | `ingredients.unit_label` | ✅ Closed |
| B4 | Regeneration semantics | Match key + six defined cases | ✅ Closed |
| C1 | Household size | Editable `households.portion_size` | ✅ Closed |
| C2 | Staleness triggers | Three source tables, database triggers | ✅ Closed |
| C3 | One active list | Partial unique index | ✅ Closed |
| C4 | Invite code strength | 10-char Crockford base32, single-use, rate-limited | ✅ Closed |
| D1 | Offline shopping | Tick-only offline queue, in Phase 3 scope | ✅ Closed |
| D2 | Cold-start data entry | Paste-a-list bulk entry, in Phase 1 scope | ✅ Closed |
| E2 | Schema vs real recipes | Spike run; three columns, one relaxed constraint | ✅ Closed — confirmed against a real week (`REAL-WEEK-EXAMPLE.md`) |
| E3a | `products` phasing | `products` created in Phase 1, empty | ✅ Closed |
| E3b | Dimming and contrast | `--ui-text-dim` token, never `opacity` | ✅ Closed |
| F | Modal plumbing | Reka UI headless primitives | ✅ Closed |
| F7 | One recipe per slot | Slots hold one to three recipes | ✅ Closed |
| F11 | Weekly regulars | `ingredients.is_regular` | ✅ Closed |
| — | Estimates and risk owners | Per-phase day ranges; owner column | ✅ Closed |
| G1 | Household create/leave RPCs | `create_household()` and `leave_household()`, both SECURITY DEFINER | ✅ Closed |
| H1 | No local Docker | Local dev targets the hosted project directly; CI keeps Docker (GitHub-hosted, invisible locally) | ✅ Closed |
| H2 | Supabase region | `eu-west-1` (Ireland), not `eu-west-2` (London) — user is closer to Ireland | ✅ Closed |

**Open:** nothing blocking Phase 0. E2's caveat is resolved.

---

## A1 — Infrastructure

**Decided:** Vercel (`lhr1`) + one Supabase project (`eu-west-2`), free tier, `*.vercel.app`, local-and-production environments with no staging, Supabase's own backups only.

**Why:** two-user household app. Staging doubles cost and ceremony to buy safety that forward-only migrations plus a local rehearsal largely provide. The free-tier and backup choices were made with their consequences written down rather than assumed away.

**Landed in:** `INFRASTRUCTURE.md` (new, 501 lines) · `PLAN.md` §0.0 and the Phase 0 gate.

**Carries risk:** effectively no restorable backup (§8), and free-tier pausing (§3.3, mitigated by a keepalive cron). §8.3 names four triggers that force a review — the sharpest being ~15 real recipes and the Phase 3 gate. **This is the entry most likely to need reopening.**

## A2 — Test authentication

**Decided:** Playwright's global setup mints sessions through the Supabase Admin API against local Supabase and injects them into the browser context. The email+password provider is enabled in `config.toml` only. **No test route ships in the app.**

**Why:** Google cannot be scripted from CI, so the Phase 5 E2E gate was unreachable as written. A test-only login route would put an authentication bypass in the production bundle behind an environment-variable guard; this approach adds zero production surface, and the sessions are real ones that hit the same RLS policies.

**Landed in:** `INFRASTRUCTURE.md` §7.1 · `PLAN.md` §0.1 and the Phase 0 gate.

**Note:** built in Phase 0 though not needed until Phase 5 — while the auth code is open and the cost is an hour.

## A3 — Foreign key delete behaviour

**Decided:** every FK declares `on delete` explicitly. Cascade for children of a parent deleted as a unit; restrict (with the app clearing the reference first, and warning) for independent references; set null for attribution.

**Why:** Postgres defaults to `NO ACTION`, which surfaces as a constraint violation in front of a user. Twenty-odd FKs had exactly one delete behaviour defined between them.

**Landed in:** `SPEC.md` §2 (rule table at the top).

**Related:** `shopping_list_items.sources` holds recipe ids with no FK behind them, so the "why is this here?" sheet must render an unresolvable source gracefully rather than failing.

## A4 — `profiles` RLS

**Decided:** `select using (id = auth.uid() or household_id = auth_household_id())`; `update using (id = auth.uid())`; **`household_id` is not client-writable at all**.

**Why:** `/settings/household.vue` needs to read household-mates, and no policy existed. The non-writable `household_id` is the important half: without it, any user could join any household by guessing a uuid, which defeats every other policy in §3.

**Landed in:** `SPEC.md` §3 · `PLAN.md` §0.4.

**Also settled here:** wrap `auth_household_id()` in a scalar subquery in every policy so Postgres hoists it into an InitPlan instead of re-evaluating per row. And the helper must stay `SECURITY DEFINER` — that is what stops the policy on `profiles` recursing through a function that reads `profiles`.

## B1 — Double rounding

**Decided:** three separate steps — sum at full precision in base units; round **once**; then format. Formatting never rounds. The ≥1000 step is 100 (not 50) precisely so that the kg/l display is exact at one decimal place.

**Why:** SPEC's own rules contradicted each other. "Round to the nearest 50" plus "≥1000 g → kg to 1 dp" is two roundings stacked: 1,240 → 1,250 → "1.25 kg" → needs rounding again. That is the exact sin the "round once, at the end" rule exists to prevent, and it was float-fragile besides.

**Landed in:** `SPEC.md` §4 · `PLAN.md` §3.1 and its gate.

## B2 — Rounding direction

**Decided:** always `ceil` to the step. Never to-nearest.

**Why:** to-nearest rounds 102 g down to 100 g and 1,020 g down to 1,000 g. Under-buying breaks the meal you bought it for; over-buying by 8 g of mince is invisible and free. It also makes the rule uniform with counts, which already round up, rather than running two philosophies inside one function.

**Landed in:** `SPEC.md` §4 · `PLAN.md` §3.1.

## B3 — Count nouns

**Decided:** `ingredients.unit_label` (text, nullable) — "clove", "rasher", "tin", "slice". A property of the ingredient, not the line.

**Why:** confirmed by the spike — 16 of 57 ingredient lines are counted things with a specific noun. Without it the list reads "Bread — 4" and means slices, and garlic measured in cloves in one recipe and bulbs in another aggregates into one silently wrong number. Putting the label on the *ingredient* makes that ambiguity inexpressible: an ingredient is counted in one thing, forever.

**Landed in:** `SPEC.md` §2 and §4 · `DESIGN.md` §5.8 · `PLAN.md` §1.1, §1.2, §1.3.

**Explicitly not done:** adding "clove" and "tin" as units in the `units.ts` table. That turns the unit table into a taxonomy of nouns and forces aggregation to reason about whether a clove converts to a bulb.

## B4 — Regeneration semantics

**Decided:** match on `(ingredient_id, family)` for derived items and `custom_name` for manual ones. Six cases, all defined: unchanged keeps the tick; decrease applies silently; **increase keeps the tick and sets `previous_quantity` for a "now 800 g — was 500 g" badge**; no-longer-required-and-unticked is removed; **no-longer-required-but-ticked becomes a manual item**; manual items are always preserved.

**Why:** PLAN carried a gate item ("quantity change is surfaced, not silently overwritten") for behaviour that neither SPEC nor DESIGN described, and "still present" had no definition — it cannot be the row id, because regeneration computes a fresh set. The ticked-but-no-longer-required case is the one worth arguing for: the item is already in the trolley, and deleting it in front of the shopper is worse than a slightly wrong list.

**Landed in:** `SPEC.md` §2 (`previous_quantity`) and §4 · `DESIGN.md` §5.9 · `PLAN.md` §3.3 and its gate.

## C1 — Household size

**Decided:** `households.portion_size` (smallint, ≥1, default 2), seeded from the member count on create and on join, user-owned thereafter, with a stepper in Settings.

**Why:** deriving it from `count(profiles)` is elegant and wrong in four ordinary situations — the first user is alone until their partner joins, so the very first list they generate is halved; a member leaving silently rescales every future plan; the last member leaving makes it zero; and a household that batch-cooks wants 4 regardless of who lives there. It also makes the deferred per-slot eater counts an override of an existing number rather than a new concept.

**Landed in:** `SPEC.md` §0, §2, §4 · `PLAN.md` §0.5 and the risk register.

## C2 — Staleness

**Decided:** database triggers, covering **three** source tables — `meal_plan_entries`, contributing recipes, and contributing ingredients.

**Why:** the plan marked a list stale only on plan edits, which misses the two cases users hit most. Marking salt as a staple *after* generating a list is completely ordinary and left a silently wrong list with no banner. Trigger rather than route-level (PLAN asked for a choice) because staleness must hold whichever path wrote, and there are now three tables to cover.

**Landed in:** `SPEC.md` §4 · `PLAN.md` §3.3 and its gate.

## C3 — One active list

**Decided:** partial unique index `(household_id) where status = 'active'`.

**Why:** the UI says "*the* active list" throughout while the schema permitted many. One index makes the sentence true rather than hopeful.

**Landed in:** `SPEC.md` §2, §3 (RLS test case) · `PLAN.md` §3.2 and its gate.

## C4 — Invite codes

**Decided:** Crockford base32, **10 characters ≈ 50 bits**, CSPRNG, 72-hour expiry, single-use, 10 attempts per user per hour, generic failure message, regeneration invalidates outstanding codes.

**Why:** a short code plus an unthrottled RPC is a brute-forceable path into a stranger's household, and the blast radius is their entire food and household data. "Short, URL-safe" is a description, not a specification. The generic failure message matters: distinguishing "expired" from "invalid" tells an attacker which guesses were close.

**Landed in:** `SPEC.md` §3 · `PLAN.md` §0.5.

## D1 — Offline ticking

**Decided:** **in scope for Phase 3.** Tick-only offline queue in `useLocalStorage`, flushed on reconnect, last-write-wins on `checked_at`. Everything else stays strictly online.

**Why:** the list is used in a supermarket — steel shelving, basements, contended wifi — and the app as specified went read-only exactly there. It is affordable only because a tick is an idempotent boolean set on a known row, not a document edit, so no CRDT is needed and the scope stays at one operation.

**Landed in:** `SPEC.md` §0, §7, §10 · `DESIGN.md` §6 (offline strip copy differs on the list screen; checkboxes stay enabled) · `PLAN.md` §3.5b and its gate.

**Cost:** roughly +1 day in Phase 3, reflected in the estimate.

## D2 — Cold-start data entry

**Decided:** **in scope for Phase 1.** "Paste a list" in the recipe editor — a deliberately crude line parser behind an editable review step.

**Why:** before the app is useful once, someone types ~20 recipes and ~60 ingredients on a phone. That is the largest adoption risk in the project and nothing addressed it; Phase 4 gives the packaged minority a scanner while the bulk of entry stays manual. The review step is what makes a crude parser acceptable — a wrong parse is visibly wrong and one tap from fixed.

**Landed in:** `SPEC.md` §7, §10 · `DESIGN.md` §5.8 · `PLAN.md` §1.4 and its gate · risk register, ranked first.

**Cost:** roughly +½ day in Phase 1.

## E2 — Recipe model spike

**Decided:** run before any migration. Ten recipes written by hand against SPEC §2.

**Outcome:** the schema held. Fifty-seven ingredients across ten meals produced **three additive columns and one relaxed constraint** — no restructuring, no table splits, no challenge to the generic-naming rule. Two findings mattered (F7, F11) and both are things the schema *forbade* rather than modelled wrongly, which is the cheap-now-expensive-later category.

**Landed in:** `RECIPE-MODEL-SPIKE.md` (new).

**⚠️ Caveat, and the only one in this document:** the ten recipes are representative, not yours. **Re-run §1 with ten meals you actually cook before the Phase 1 migration is written.** An hour with a notepad. If your repertoire includes baking or anything portioned by "makes 12", expect at least one more finding — `recipes.servings` as a portion count is doing quiet work that muffins would break.

**Update — caveat addressed:** five real meals plus the hand-built shopping list they produced, supplied directly rather than reconstructed. Confirms F1, F11, and F13 against real data and adds two low-severity findings (F14 "either/or" ingredients, F15 unnamed staples), both resolved without a schema change. **Landed in:** `REAL-WEEK-EXAMPLE.md` (new); recommended as the actual `seed.sql` content in `PLAN.md` §1.1. Status below moved to closed.

## E3a — `products` phasing

**Decided:** `products` is created in the **Phase 1** migration, empty and unused, with its select policy. Phase 4 adds routes and UI only.

**Why:** PLAN claimed Phase 4 adds no migration to `ingredients` because the nutrition columns land in Phase 1 — but SPEC lists `product_id` among them, and a FK cannot reference a table that doesn't exist. Either `products` moves earlier or the claim is false. It moves.

**Landed in:** `PLAN.md` §1.1 and §4.2.

## E3b — Dimming and contrast

**Decided:** a `--ui-text-dim` token — `ash-500` `#736B5B` (**4.89:1** on `chalk-50`) and `soot-400` `#8C8374` (**5.0:1** on `soot-950`). Opacity-based dimming is banned for text.

**Why:** the design dimmed past days to 65% and checked items to 55%, while the Phase 5 gate requires all body text at ≥4.5:1, measured. `ash-600` at 65% opacity is roughly 4:1 and fails. Because opacity applies to the composited element it is also invisible to contrast checkers, so the failure would have survived to a manual audit. Ratios above were computed, not estimated.

**Landed in:** `DESIGN.md` §2.5, §3 (new subsection), §5.5, §5.9, §7 · `PLAN.md` §0.2.

**Why it was urgent:** the token block is written verbatim in Phase 0.2. Retrofitting means touching every screen that dims anything.

## F — Modal plumbing

**Decided:** Reka UI (headless, unstyled) under `BaseSheet`, `BaseSelect`, collapsibles, and popovers. `BaseButton`, `BaseInput`, `BaseChip`, `BaseToast` and every app component stay hand-built. Drag-to-dismiss stays ours.

**Why:** the visual language should stay bespoke — it is the strongest part of these documents. But what makes `BaseSheet` load-bearing is not visual: focus trap, `Esc`, scroll lock, focus restore, `aria-modal`, inert background, iOS keyboard behaviour. That is a week to build, a fortnight to finish debugging in the a11y pass, identical in every app that has ever had a bottom sheet, and invisible when subtly wrong until someone uses VoiceOver.

**Landed in:** `SPEC.md` §1 · `DESIGN.md` §4.1 · `PLAN.md` §0.1, §0.3.

**Effect on the plan:** roughly a week off Phase 0, and it is the assumption Phase 0's estimate rests on.

## F7 — More than one recipe per slot

**Decided:** unique constraint relaxed to `(meal_plan_id, day_of_week, slot, recipe_id)`, plus `sort_order`. A slot holds one to three recipes.

**Why:** the spike's most valuable finding. One-recipe-per-slot breaks on the most ordinary dinners there are — curry *and* rice, chilli *and* rice, sausages *and* mash, a roast that is a chicken plus potatoes plus two veg. Aggregation needs **no change at all**, because it already treats every entry as an independent contribution. Permitting it now costs one constraint and a column; retrofitting reworks the slot row, the picker, the aggregation input shape, and the `sources` jsonb — all in the code Phase 3 depends on.

**Landed in:** `SPEC.md` §2 · `DESIGN.md` §5.5 · `PLAN.md` §2.1, §2.2, §2.3 and its gate.

## F11 — Weekly regulars

**Decided:** `ingredients.is_regular` (bool). Seeded onto every new list with no quantity. `/settings/pantry.vue` becomes STAPLES and REGULARS. An ingredient can be neither but never both.

**Why:** milk, bread, bananas, bin bags are bought every week, tied to no recipe, and are **not** staples — a staple is something you already have; these must be bought precisely because you run out. Their only home was a manual item, and every week generates a fresh list, so the household would re-type the same eight items every Sunday and quietly go back to the notes app for the half of their shopping they do most often.

**Landed in:** `SPEC.md` §2, §4 · `DESIGN.md` §5.9, §5.13 · `PLAN.md` §1.1, §1.3 and its gate.

**Related:** an ingredient that is both regular and recipe-derived emits **one** line carrying the recipe quantity. Two lines for milk is the silliest output this feature could produce.

## Estimates and risk owners

**Decided:** per-phase ranges in focused working days — 10–13, 8–10, 5–7, 12–15, 8–10, 5–7; **48–62 days total**, roughly four to five months at three focused days a week. An Owner column on the risk register.

**Why:** "5 objectives" is not an estimate, and a risk with no name against it is a risk nobody is watching. The numbers are unpadded and assume the Nuxt 4 + Tailwind v4 spike finds nothing nasty and that Reka genuinely removes the modal plumbing.

**Landed in:** `PLAN.md` §0 and §6.

**Owner is currently `Lead` throughout** — replace with names the moment more than one person is building.

---

## G1 — Household create/leave RPCs

**Decided:** `create_household(p_name text)` and `leave_household()`, both SECURITY DEFINER, added alongside `accept_household_invite()`. Household creation and leaving are the two remaining ways `profiles.household_id` changes; SPEC.md §3's "not client-writable at all" only named the trigger and `accept_household_invite`, but the same reasoning applies to both — a raw client update is blocked by the column-level `REVOKE` in the profiles migration (DECISIONS.md A4), so every write path needs to be a SECURITY DEFINER function.

**Why:** implementing household creation as a plain client `insert` into `households` would still leave the question of who sets `profiles.household_id` afterward unanswered without a second, RLS-bypassing write — which is exactly what a SECURITY DEFINER RPC is for. `leave_household()` exists because DESIGN.md §5.13 specifies a "Leave household" action that PLAN.md's migration list didn't separately call out.

**Landed in:** `supabase/migrations/20260824103518_households_and_invites.sql` (`create_household`), `supabase/migrations/20260824110004_leave_household.sql` (`leave_household`) · `app/pages/onboarding/index.vue`, `app/pages/settings/household.vue`.

## H1 — No local Docker

**Decided:** local development connects directly to the one hosted Supabase project instead of running `supabase start` against a local Postgres. Migration rehearsal (INFRASTRUCTURE.md §6.3) moves to CI: pushing a branch runs `supabase db start` + `db reset` + the RLS suite inside GitHub Actions, which has Docker preinstalled on every runner — the user never installs or runs Docker themselves. Once CI is green, `supabase link` + `supabase db push` apply the migration to the hosted project directly; both are plain network calls, no Docker required. `npm run test:e2e` (Playwright, which needs a live Supabase Admin API to mint test sessions) is CI-only for the same reason.

**Why:** requested directly — Docker is unwanted overhead on the development machine. The trade-off, stated plainly: INFRASTRUCTURE.md's original design used a local Postgres specifically so an untested migration never hits the one shared project first go. That safety net now depends on CI running *before* `db push` rather than on a local rehearsal — still a real check, just a slower one (a push-and-wait instead of an instant local reset), and one that can be skipped if someone runs `db push` without waiting for CI. Worth knowing, not worth blocking on: this is a two-person household app, not a team that needs the guardrail enforced automatically.

**Landed in:** `README.md` (Setup, Deploying) · `.github/workflows/check.yml` (unchanged — already ran `supabase db start` inside the Actions runner, not on the host) · `docs/INFRASTRUCTURE.md` §4, §6.3, §7 (local-environment description and rehearsal step amended).

## H2 — Supabase region

**Decided:** the hosted Supabase project is in `eu-west-1` (Ireland), not the `eu-west-2` (London) originally specified in INFRASTRUCTURE.md §0. Vercel's project region should follow to `dub1` (Dublin) rather than `lhr1`, for the same colocation reasoning INFRASTRUCTURE.md §2.1 already gives — same-region round trips on every SSR render and list generation.

**Why:** the user is physically closer to Ireland than London; the reasoning behind picking *a* nearby region over a US default is unchanged, only which nearby region.

**Landed in:** `docs/INFRASTRUCTURE.md` §0, §1, §2.1, §3.1 (region references updated). Vercel project region is a dashboard setting, not code — set it to `dub1` when the Vercel project is created (INFRASTRUCTURE.md §11 checklist).

## What changed, in one paragraph

The product did not change. The schema gained **five columns** (`portion_size`, `unit_label`, `is_regular`, `previous_quantity`, `sort_order`), **one relaxed constraint** (recipes per slot), **one partial index** (one active list), and explicit delete behaviour on every foreign key. The plan gained an infrastructure phase, two scoped features (offline ticks, paste-a-list), real estimates, and a dependency that removes a week of modal plumbing. Three internal contradictions were resolved — double rounding, the products phasing claim, and opacity versus the contrast floor. Everything else is unchanged, because it was already right.
