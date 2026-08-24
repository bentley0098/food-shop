# Household Meal Planning & Shopping — Technical Spec (v1)

**Status:** Draft for review · **Date:** 2026-08-24

A mobile-first Nuxt 4 app where a household (typically two people living together) keeps a recipe library, plans breakfast/lunch/dinner across a Monday–Sunday week, and generates a consolidated shopping list from that plan. Barcode scanning pulls nutritional information for ingredients.

## 0. Locked decisions

| Area | Decision |
|---|---|
| **Ingredient granularity** | **Generic, not branded — "chicken breast", never "Tesco Finest chicken breast fillets". Recipes and lists both reference the generic concept.** |
| Barcode/nutrition | Open Food Facts, in MVP, server-cached. **Barcode + manual entry only — no generic food-composition database.** Products supply nutrition and nothing else |
| Household linking | Invite code + shareable link; one household per user |
| Portions | Editable household `portion_size`, seeded from the member count (no per-slot eater counts) |
| Shopping list | Aggregate + unit conversion + aisle grouping + pantry staples excluded + realtime tick-off + ad-hoc items |
| Auth | Google OAuth only |
| Units/locale | Metric, Monday-start weeks, en-GB. **No price or currency anywhere** |
| Recipes | Manual entry + barcode-assisted ingredient add. Ingredient lines are generic quantities (`600 g chicken breast`) |
| PWA | Installable, online-first. **One exception: shopping-list ticks queue offline and flush on reconnect** (§7) |

---

## 1. Stack

| Concern | Choice | Note |
|---|---|---|
| Framework | Nuxt 4 (`app/` dir), TypeScript strict | SSR on, SPA-ish after hydration |
| CSS | Tailwind v4 via `@tailwindcss/vite` | CSS-first `@theme` config in `app/assets/css/main.css`; **no `tailwind.config.js`** |
| Backend | Supabase (Postgres + Auth + Realtime + Storage) | |
| Supabase client | `@nuxtjs/supabase` | Route middleware, cookie-based session, typed client |
| State | Pinia (`@pinia/nuxt`) | Household + active-week stores only; prefer `useAsyncData` elsewhere |
| PWA | `@vite-pwa/nuxt` | Manifest, icons, app-shell precache |
| Headless primitives | **Reka UI** | Unstyled behaviour + ARIA under `BaseSheet` / `BaseSelect` / disclosures. Appearance is 100% `DESIGN.md` |
| Utils | `@vueuse/nuxt` | `useUserMedia`, `useLocalStorage`, swipe |
| Barcode | Native `BarcodeDetector` + `barcode-detector` ponyfill | Ponyfill required for iOS Safari |
| Testing | Vitest + `@nuxt/test-utils`; Playwright | |

Local dev connects directly to the one hosted Supabase project — no local Postgres (`DECISIONS.md` H1). Migrations and RLS are tested in CI instead, via the Supabase CLI's `supabase start` inside GitHub Actions, before `supabase db push` touches the hosted project.

---

## 2. Data model

All household data is scoped by `household_id`. Migrations live in `supabase/migrations/`.

**Every foreign key declares its delete behaviour explicitly.** Postgres defaults to `NO ACTION`, which surfaces as a constraint violation in front of a user rather than as anything intentional. The rule for this schema:

| Relationship | Behaviour | Why |
|---|---|---|
| Child rows of a parent the user deletes as a unit (`recipe_ingredients`, `recipe_steps`, `meal_plan_entries`, `shopping_list_items`, `household_invites`) | `on delete cascade` | The child has no meaning without the parent |
| A reference to something the user might delete independently (`meal_plan_entries.recipe_id`, `shopping_list_items.ingredient_id`) | `on delete restrict`, with the app clearing the reference first | The user must be warned and shown what breaks (§2.1), never surprised by a silent disappearance |
| Attribution (`created_by`, `checked_by`, `accepted_by` → `profiles`) | `on delete set null` | Content outlives the person who added it; a departed member must not take the household's recipes with them |
| `profiles.household_id` | `on delete set null` | Deleting a household orphans its members rather than deleting them |
| `ingredients.product_id` | `on delete set null` | The cache is disposable; the ingredient is not |

`shopping_list_items.sources` (jsonb) holds recipe ids with no FK behind them, so a deleted recipe leaves a dangling reference. The "why is this here?" sheet must render an unresolvable source as "a recipe that has since been deleted" rather than failing.

### Identity & household

- `profiles` — `id` (FK `auth.users`), `display_name`, `avatar_url`, `household_id` (nullable FK), `created_at`. Row created by an `on_auth_user_created` trigger.
- `households` — `id`, `name`, `portion_size` (smallint, ≥1, default 2), `created_by`, `created_at`.

**`portion_size` is the portion multiplier, and it is an editable number rather than a live count of members.** Deriving it from `count(profiles)` is more elegant and wrong in four ordinary situations: the first user is alone until their partner accepts the invite, so the very first list they generate is halved; a member leaving silently rescales every future plan; the last member leaving makes it zero; and a household that batch-cooks (see `RECIPE-MODEL-SPIKE.md` F13) wants 4 regardless of who lives there.

It is seeded from the member count when the household is created and when someone joins, then left alone — the user owns it after that. `/settings/household.vue` states it in plain English ("Recipes are scaled for **2** people") with a stepper. As a bonus, the per-slot eater counts deferred in §4 become an override of a number that already exists rather than a new concept.
- `household_invites` — `id`, `household_id`, `code` (unique, short, URL-safe), `created_by`, `expires_at`, `accepted_by`, `accepted_at`.

One household per user in v1. Migration path to many-to-many is a `household_members` join table replacing `profiles.household_id`; keep all household reads behind one helper so this stays a contained change.

### Ingredients & products

- `products` — **global, barcode-keyed cache of Open Food Facts data.** `id`, `barcode` (unique), `name`, `brand`, `image_url`, `package_qty`, `package_unit`, `nutrition` (jsonb, per 100 g/ml), `nutriscore`, `source` (`off` | `manual`), `fetched_at`. Readable by all authenticated users, written only by the server route.
- `ingredients` — **household-scoped generic items** ("Chicken thighs", "Onions"). `id`, `household_id`, `name`, `aisle` (enum), `default_unit`, `unit_label` (text, nullable — the count noun, see below), `product_id` (nullable → nutrition), `nutrition` (jsonb, nullable — manually entered per 100 g/ml), `nutrition_source` (`product` | `manual` | null), `grams_per_unit` (numeric, nullable — typical weight of one item, e.g. onion ≈ 150), `density_g_per_ml` (numeric, nullable — for volume lines, e.g. oil ≈ 0.92), `is_staple` (bool — pantry staple, excluded from lists), `is_regular` (bool — bought every week regardless of the plan, see below), `created_at`. Unique on `(household_id, lower(name))`.

**`unit_label` is what stops the count family being ambiguous.** Sixteen of the fifty-seven ingredient lines in `RECIPE-MODEL-SPIKE.md` are counted things with a specific noun — cloves, rashers, slices, wraps, thighs, tins. Without a label they all render as `unit`, so the list says "Bread — 4" and means slices, and — the genuinely dangerous case — garlic measured in cloves in one recipe and bulbs in another aggregates into one silently wrong number.

The label belongs to the **ingredient**, not the line, and that placement is the whole fix: an ingredient is counted in exactly one thing, forever, so the ambiguity cannot be expressed. Display becomes `3 cloves`. Aggregation logic is untouched. `grams_per_unit` gains a form label that finally makes sense — "one clove weighs about…".

**`is_regular` is the other half of the pantry model.** `is_staple` means *you already have it, keep it off the list*. `is_regular` means *you buy it every week whatever the plan says* — milk, bread, bananas, coffee, bin bags. These are neither recipe-derived nor assumed-present, and without a home for them the household re-types the same eight items every Sunday and quietly goes back to the notes app for the half of their shopping they do most often. List generation seeds every `is_regular` ingredient onto each new list with no quantity. `/settings/pantry.vue` becomes two sections — STAPLES (never buy) and REGULARS (always buy) — which is a clarifying pair rather than a bolted-on second screen.

**Names are generic by rule.** No brand, no pack size, no retailer. The create-ingredient sheet models this in its placeholder and hint; nothing enforces it in the database, because the honest enforcement mechanism is the UI at the one moment the user decides. `grams_per_unit` and `density_g_per_ml` exist only to make nutrition computable for count and volume lines (§5) — they are never used for shopping aggregation, which stays in the user's chosen units.

Two tables because a recipe references *the ingredient concept*, not a specific packet. Scanning a barcode links a product to an ingredient, giving it nutrition without coupling recipes to brands. `is_staple` is the whole pantry model — a flag, not an inventory. Salt/oil/pepper never hit the list, and the list shows a collapsed "Assumed you already have" section so nothing silently vanishes.

### Recipes

- `recipes` — `id`, `household_id`, `name`, `description`, `servings` (base yield, ≥1), `prep_minutes`, `cook_minutes`, `image_path` (Supabase Storage), `created_by`, timestamps.
- `recipe_ingredients` — `id`, `recipe_id`, `ingredient_id`, `quantity` (numeric, nullable for "to taste"), `unit`, `note`, `sort_order`.
- `recipe_steps` — `id`, `recipe_id`, `step_no`, `body`. Optional; recipes are usable with zero steps.

### Planning

- `meal_plans` — `id`, `household_id`, `week_start` (date, **CHECK constraint: must be a Monday**), `created_by`, timestamps. Unique `(household_id, week_start)`.
- `meal_plan_entries` — `id`, `meal_plan_id`, `day_of_week` (smallint 1–7, ISO: Mon=1), `slot` (enum `breakfast` | `lunch` | `dinner`), `recipe_id`, `note`, `sort_order`. Unique `(meal_plan_id, day_of_week, slot, recipe_id)`.

**A slot holds more than one recipe.** The obvious constraint — one recipe per slot — breaks on the most ordinary dinners there are: curry *and* rice, chilli *and* rice, sausages *and* mash, a roast that is a chicken plus potatoes plus two veg plus gravy. Forcing those into a single recipe row means "roast potatoes" can never be reused beside anything else.

The unique constraint therefore keys on `recipe_id` too: the same recipe twice in one slot is still nonsense, two different recipes is not. Aggregation needs **no change whatsoever** — it already treats every entry as an independent contribution, so §4's cook-once-eat-twice arithmetic falls out identically. `MealSlotRow` renders a short stack instead of a single row.

Permitting this now costs one constraint and a `sort_order` column. Retrofitting it later means a data migration plus rework of the slot row, the picker, the aggregation input shape, and the `sources` jsonb — all of it in the code Phase 3 depends on.

**Blank slots are simply absent rows** — 21 slots per week, most weeks have far fewer entries. No nullable placeholder rows to reason about.

### Shopping

- `shopping_lists` — `id`, `household_id`, `meal_plan_id`, `status` (`draft` | `active` | `completed`), `generated_at`, `completed_at`, `is_stale` (bool). **Partial unique index `(household_id) where status = 'active'`** — the UI says "*the* active list" throughout (§7), and one index is what makes that sentence true rather than hopeful.
- `shopping_list_items` — `id`, `list_id`, `ingredient_id` (nullable), `custom_name` (nullable), `quantity`, `unit`, `aisle`, `previous_quantity` (nullable — set when regeneration increases a ticked item's quantity, §4), `is_checked`, `checked_by`, `checked_at`, `is_manual`, `sources` (jsonb: which recipes/slots contributed, for the "why is this here?" tap).

`ingredient_id` XOR `custom_name` enforced by CHECK — ad-hoc items (bin bags, milk) live in the same table so ticking works identically.

---

## 3. Row Level Security

Every household table has RLS on with policies keyed to one `SECURITY DEFINER` helper:

```sql
create function public.auth_household_id() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.profiles where id = auth.uid()
$$;
```

- Household tables: `using (household_id = (select public.auth_household_id()))` for all of select/insert/update/delete.

  **Wrap the helper in a scalar subquery.** Written bare, Postgres re-evaluates the function once per row; wrapped, it is hoisted into an InitPlan and evaluated once per query. It makes no difference at two rows and a visible difference on a 200-item shopping list.
- Child tables (`recipe_ingredients`, `meal_plan_entries`, `shopping_list_items`): `exists (select 1 from parent p where p.id = <fk> and p.household_id = public.auth_household_id())`.
- `products`: select to `authenticated`; no client write grants at all.

- **`profiles`** — two policies, because a member must be able to see their household-mates in `/settings/household.vue` (avatars, names, "joined 12 Aug") and nobody else:
  - `select using (id = auth.uid() or household_id = (select public.auth_household_id()))`
  - `update using (id = auth.uid())` — you may edit only yourself, and `household_id` is not client-writable at all; it is set by the trigger on signup and by `accept_household_invite` (below). Allowing a client to write its own `household_id` would let any user join any household by guessing a uuid, defeating every other policy in this section.
  - No insert or delete policy: rows are created by the `on_auth_user_created` trigger and removed by the cascade from `auth.users`.

  The `SECURITY DEFINER` helper reads `profiles` while a policy *on* `profiles` calls the helper — this does not recurse, because `SECURITY DEFINER` bypasses RLS for the duration of the function. That is load-bearing and easy to break later by "simplifying" the helper to `SECURITY INVOKER`; don't.
- `household_invites`: **never exposed to the client directly.** Joining goes through `accept_household_invite(p_code text)`, a `SECURITY DEFINER` RPC that validates code + expiry, rejects users who already have a household, sets `profiles.household_id`, and stamps the invite accepted. Otherwise looking up an invite by code would require reading rows you don't belong to yet.

  **The invite code is this app's only trust boundary, so it is specified rather than described.** A successful guess grants a stranger read and write access to a household's entire contents.

  | Property | Value |
  |---|---|
  | Alphabet | Crockford base32 (`0-9A-Z` less `I`, `L`, `O`, `U`) — unambiguous when read aloud or typed off a screen |
  | Length | **10 characters ≈ 50 bits.** "Short" is not a specification; this is short enough to read down the phone and long enough that guessing is hopeless |
  | Generation | CSPRNG (`gen_random_bytes`), never `random()` |
  | Lifetime | `expires_at` defaults to **72 hours** |
  | Reuse | **Single-use.** `accepted_at` non-null causes rejection, regardless of expiry |
  | Rate limit | **10 attempts per user per hour**, enforced inside the RPC against an attempts table. A failed attempt returns the same generic "That code isn't valid" as an expired one — distinguishing them tells an attacker which guesses were close |
  | Regeneration | Issuing a new code for a household invalidates any outstanding unaccepted ones |

RLS is asserted by a SQL test script run against the local Supabase instance and in CI on every push. Coverage grows with each phase; the standing cases are:

- User in household A cannot read household B's recipes, plans, ingredients, or list items.
- User in household A cannot read household B's `profiles` rows, but can read their own household-mates'.
- No client can `select` from `household_invites` at all.
- No client can `insert` or `update` `products`.
- A client cannot `update` its own `profiles.household_id`.
- The one-active-list partial unique index rejects a second `active` list for the same household.

**Prove the test can fail.** A deliberately broken policy must turn CI red before the passing result is worth anything — this is a Phase 0 gate item, not a suggestion.

---

## 4. Portion & aggregation logic

The core of the app. Pure TypeScript in `app/utils/`, shared by the client preview and the server generation route — one implementation, directly unit-testable.

### Scaling

For each `meal_plan_entry`:

```
multiplier    = household.portion_size / recipe.servings
lineQuantity  = recipe_ingredient.quantity * multiplier
```

A recipe planned into two slots produces **two independent entries**, each contributing its own scaled quantity. Portion size 2, recipe serving 2, planned as Monday lunch *and* Monday dinner → 1.0 × 2 contributions = ingredients for 4 portions. This is exactly the cook-once-eat-twice case, and it falls out of the model rather than needing a special rule. No same-day detection required.

It is also a **behaviour the app has to teach**, not one users arrive with. Most recipes serve 4 and most households here are 2, so the multiplier sits at 0.5 on nearly every dinner — and nobody halves a bolognese. They cook the full batch and eat it twice. If that second meal is never planned, the list is short by half, every week. Two things address it: `portion_size` is editable, so a household that always cooks full batches sets it to 4 and stops fighting the arithmetic; and the planner states the multiplier at the moment of planning (the "×2 portions" note in `DESIGN.md` §5.5) rather than only in Settings.

Note the remaining consequence: **every planned slot assumes everyone eats.** Plan a lunch only you eat and you'll shop for two. Accepted for v1; the escape hatch is per-slot eater counts, now merely an override of `portion_size` rather than a new concept, added as one nullable column on `meal_plan_entries` with no data migration.

### Units

A single table in `app/utils/units.ts`:

| Unit | Family | Factor to base |
|---|---|---|
| `g` | mass | 1 |
| `kg` | mass | 1000 |
| `ml` | volume | 1 |
| `l` | volume | 1000 |
| `tsp` | volume | 5 |
| `tbsp` | volume | 15 |
| `unit` | count | 1 |
| `pinch`, `to_taste` | imprecise | — |

Counted things carry their noun on the ingredient (`unit_label`, §2), not in this table. `unit` stays the single count unit; "clove" and "tin" are labels applied at display time, never separate units — otherwise the table becomes a taxonomy of nouns and aggregation has to reason about whether a clove converts to a bulb.

### Aggregation

Group contributions by `(ingredient_id, family)` and sum **in base units**. Then round once, then format. The order matters and the three steps are separate:

**1. Sum.** In grams, millilitres, or counts. Full floating-point precision, no intermediate rounding. *Round once, at the end* — never per-entry, or seven small roundings drift into a wrong number.

**2. Round once, upward, to a shop-sensible step.**

| Family | Rule |
|---|---|
| count | `ceil` to a whole number — you cannot buy 1.5 onions |
| mass / volume, sum < 100 | `ceil` to the nearest **5** |
| mass / volume, sum 100–999 | `ceil` to the nearest **10** |
| mass / volume, sum ≥ 1000 | `ceil` to the nearest **100** |

**Always up, never to-nearest.** Rounding down under-buys, and under-buying breaks the meal you bought it for; over-buying by 8 g of mince is invisible and costs nothing. It also makes the rule uniform with the count rule, which already rounds up, instead of running two philosophies inside one function.

The step at ≥1000 is **100, not 50**, so that the kilogram display in step 3 is exact at one decimal place. A step of 50 produces 1,250 g → "1.25 kg", which then needs a second rounding — the precise sin this section exists to prevent. Above a kilo you are buying whole packs anyway, so the extra coarseness costs nothing real.

**3. Format. This step never rounds.** Mass ≥ 1000 g divides by 1000 and renders as kg; volume ≥ 1000 ml divides by 1000 and renders as l. Because step 2 chose a step that divides cleanly, the result is exact at one decimal place and no second rounding is possible. If a change to the step table ever makes formatting need to round, the step table is wrong, not the formatter.

Then:

- Same ingredient in two families (400 g tomatoes + 200 ml passata) → two separate lines, never a bogus conversion.
- Imprecise units → listed without a quantity.
- `is_staple` ingredients → diverted to the "assumed you have" section, never dropped.
- `is_regular` ingredients (§2) → seeded onto every newly generated list with no quantity, whether or not the plan calls for them.
- An ingredient that is **both regular and recipe-derived** — milk is the everyday case — emits **one** line carrying the recipe quantity, with the sources line noting that it is also a weekly regular. Two lines for milk is the most obviously silly output this feature could produce.

### Staleness

A generated list is a snapshot, and **three different edits invalidate it**, not one:

| Edit | Example |
|---|---|
| The plan | A slot is filled, cleared, or swapped |
| A contributing recipe | An ingredient is added to Thai curry, or a quantity changed |
| A contributing ingredient | Salt is marked as a staple; onions move aisle; milk becomes a regular |

Marking a list stale only on plan edits — the obvious implementation — misses the two cases users hit most. Toggling `is_staple` *after* generating a list is a completely ordinary thing to do, and it silently leaves a wrong list with no banner.

**Implemented as database triggers, not in the route.** `PLAN.md` asked for one or the other; a trigger is chosen because staleness must hold no matter which code path performed the write, including a direct client mutation, and because there are now three source tables to cover rather than one. Each trigger sets `is_stale = true` on any `active` list whose `sources` reference the changed row, which is a single indexed jsonb containment query.

### Regeneration

Regenerating **preserves ticked state for items still present, and always preserves manual items.** Silently wiping a half-shopped list is the obvious failure mode here.

"Still present" needs a definition, because it cannot be the row `id` — regeneration computes a fresh set of contributions. **The match key is `(ingredient_id, family)` for recipe-derived items and `custom_name` for manual ones.** Given that key, every item falls into exactly one of four cases:

| Case | Behaviour |
|---|---|
| Present, quantity unchanged | Row kept as-is. Tick preserved |
| Present, quantity **decreased** | Quantity updated silently. Tick preserved — you already have enough |
| Present, quantity **increased** | Quantity updated, tick preserved, and `previous_quantity` set so the row shows a `turmeric` "now 800 g — was 500 g" badge until tapped. **This is what "surfaced, not silently overwritten" means:** a ticked item whose requirement grew is the one case where a preserved tick is actively misleading, so it is preserved *and* flagged |
| No longer required, **unticked** | Removed |
| No longer required, **ticked** | **Converted to a manual item, not removed.** It is already in the trolley; deleting it in front of the shopper is worse than a slightly wrong list |
| Manual item | Always preserved, untouched, whatever else changes |

This adds one nullable column, `shopping_list_items.previous_quantity`, cleared when the badge is acknowledged.

The confirm sheet states plainly what is preserved before the user commits: *"Ticked items and anything you added by hand are kept."*

---

## 5. Barcode scanning & nutrition

Flow: camera → `BarcodeDetector` (ponyfilled) → `GET /api/products/:barcode` → `products` cache hit, or fetch `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`, normalise, upsert, return.

- **Server-side fetch, not client:** sidesteps CORS, centralises the cache, and lets us send the descriptive `User-Agent` Open Food Facts asks for.
- `products` **is** the cache; refetch only when `fetched_at` is older than 90 days.
- Mapped OFF fields: `product_name`, `brands`, `quantity`, `image_front_url`, `nutriscore_grade`, and `nutriments` → kcal, fat, saturates, carbs, sugars, fibre, protein, salt per 100 g/ml. `categories_tags` → best-effort aisle guess.
- **Miss or unrecognised barcode → manual entry form pre-filled with the barcode**, saved as `source: 'manual'`. Every scan path ends somewhere useful.
- Camera needs HTTPS (localhost is exempt). Permission denial and no-camera devices fall back to manual entry — the scanner is an accelerator, never a required path.

### Nutrition on generic ingredients

Nutrition attaches to the **ingredient**, not the recipe line, and resolves in one order:

1. `nutrition_source = 'product'` → the linked product's per-100 g/ml figures.
2. `nutrition_source = 'manual'` → figures typed into the ingredient sheet.
3. Neither → the ingredient contributes nothing and is named in "Not included".

**Linking a product writes `product_id` and nothing else.** Name, aisle, `default_unit`, and `is_staple` stay user-owned. Scanning a packet of chicken must never rename the ingredient to the packet — that is precisely the coupling the two-table split exists to prevent. The product's name, brand, and image are visible only in `ProductCard`, reached by tapping the barcode icon on the ingredient row.

**Manual nutrition entry is a first-class path with no barcode in it.** Reachable directly from the ingredient sheet — seven numbers per 100 g/ml, all optional. Since Open Food Facts has essentially nothing for loose produce, butcher-counter meat, or anything sold by weight, and those are most of what a generic recipe is made of, this is the *main* way nutrition arrives, not a fallback. The scanner is the accelerator for the packaged minority.

### Resolving a recipe line to grams

Per-100 g figures cannot be applied to `2 unit onions` or `1 tbsp oil` without a weight:

| Line family | Resolution |
|---|---|
| mass | direct (g, kg) |
| volume | `quantity_ml × density_g_per_ml`; **no density → line is uncovered** |
| count | `quantity × grams_per_unit`; **no gram weight → line is uncovered** |
| imprecise (`pinch`, `to_taste`) | excluded from both numerator and coverage |

Assuming 1 ml = 1 g, or silently skipping unresolvable lines while still counting them as covered, both produce a confident wrong number. An unresolvable line is an uncovered line.

### Coverage, precision, and honesty

- **Coverage is weighted by mass, not counted.** "6 of 9 ingredients" scores a pinch of pepper equal to 600 g of chicken. Report the share of resolved grams that carry nutrition data, and show the count alongside it as context.
- **Computed from unrounded recipe quantities**, never from shopping-list quantities. The list rounds to shop-sensible numbers (§4); feeding that back would stack two approximations for nothing.
- **All figures are raw / as-purchased.** No cooking-loss, trimming, or fat-absorption modelling. Stated once in the panel, not per figure.
- **Presented coarsely, because the underlying accuracy doesn't justify precision.** kcal to the nearest 10, macros to the nearest gram, salt to 0.1 g. Never two decimal places.
- **Salt and sugar are the least trustworthy figures** — seasoning is to-taste and brand variance is large. They live behind the disclosure, never in the top-line grid.
- **No Nutri-Score on a recipe.** It is a packaged-product metric; it appears only in `ProductCard`.
- **Always labelled an estimate, with coverage shown before any number.** Partial data presented as fact is worse than no data.

Recipe nutrition = sum over resolved, covered lines, divided by `servings`. Per-serving error is larger than whole-recipe error, because the eater's portion is not the recipe's portion.

Fresh produce largely has no barcode; that's inherent to the domain, not a bug to fix — it's why manual entry carries this feature.

---

## 6. Project structure

```
app/
  layouts/          default.vue (bottom tab nav), auth.vue
  pages/
    index.vue                    this week at a glance
    login.vue
    onboarding/index.vue, join.vue
    recipes/index.vue, new.vue, [id].vue, [id]/edit.vue
    plan/index.vue               → redirect to current week
    plan/[week].vue              week_start as YYYY-MM-DD
    list/index.vue, [id].vue
    settings/index.vue, household.vue, pantry.vue
  components/       AppBottomNav, WeekDayCard, MealSlotRow, RecipePickerSheet,
                    IngredientRow, BarcodeScanner, ProductCard, NutritionPanel,
                    ShoppingListGroup, ShoppingItemRow, EmptyState
  composables/      useHousehold, useCurrentWeek, useMealPlan,
                    useShoppingList, useBarcodeScanner, useTickQueue
  utils/            units.ts, aggregate.ts, dates.ts, nutrition.ts, parseIngredientLines.ts
server/api/
  products/[barcode].get.ts
  shopping-lists/generate.post.ts
  (invites are direct client RPCs, not server routes — DECISIONS.md H4)
shared/             types/database.ts (generated), constants/aisles.ts
supabase/           migrations/, seed.sql
docs/               SPEC.md, DESIGN.md, PLAN.md, INFRASTRUCTURE.md,
                    DECISIONS.md, RECIPE-MODEL-SPIKE.md
```

List generation is a **Nitro route, not a Postgres function** — it reuses the same `units.ts`/`aggregate.ts` the client uses for live preview, keeping one implementation and keeping the tricky rounding logic in plain testable TypeScript.

---

## 7. Mobile-first UI

- **Bottom tab bar** (Week / Recipes / List / Settings), respecting `env(safe-area-inset-bottom)`. Thumb-reachable; no top nav on mobile.
- **Week planner is a vertical scroll of 7 day cards**, each with three slot rows — not a horizontal 7×3 grid, which is unusable at 390 px. Empty slots render as tappable dashed placeholders. Today's card is highlighted.
- Tap a slot → **bottom sheet** recipe picker with search and recently-used. Swipe or long-press a filled slot to clear.
- Shopping list groups by aisle in supermarket walk order, with a sticky progress header ("12 of 27"). Checked items dim and sink to the bottom of their group.
- **Realtime tick sync** via a Supabase channel on `shopping_list_items` filtered by `list_id`, with optimistic local updates — both partners shopping together see the same list live.
- Touch targets ≥ 44 px; `text-base` minimum on inputs to stop iOS zoom-on-focus.

### Offline ticking — the one exception to online-first

Everything in this app is online-first except **ticking an item off the shopping list**, which buffers offline and flushes on reconnect.

The exception is not a hedge, it is the product's own use case. The list is used in a supermarket: steel shelving, basements, big-box interiors, contended public wifi. An app that goes read-only on a weak signal goes read-only exactly where it is used, at the only moment it matters, and the household goes back to a paper list.

It is affordable here only because a tick is not a document edit. It is an **idempotent boolean set on a known row id**, so the entire mechanism is:

- Queue `{ item_id, is_checked, checked_at }` in `useLocalStorage`, keyed by list.
- Apply optimistically to local state, exactly as an online tick already does (§7).
- Flush on `online`, on visibility change, and on reconnect of the realtime channel.
- Resolve conflicts by **last-write-wins on `checked_at`**. Two people ticking the same item is the common case and agreeing is the correct outcome; nothing needs a CRDT.
- Show the offline strip as normal, but with honest copy — *"You're offline — ticks are saved and will sync"* — and keep tick controls enabled while everything else stays disabled.

**Scope is exactly ticks.** Recipe editing, planning, list generation, and ad-hoc item creation all remain strictly online and disabled offline. The queue holds one kind of operation, which is what keeps it a day of work rather than a sync engine.

### Bulk ingredient entry

Cold-start data entry is the real adoption risk (§10), and the recipe editor is where it is paid. Alongside row-by-row entry, the INGREDIENTS section offers **"Paste a list"**: a textarea taking a block of lines from anywhere, parsed one line at a time into `{ quantity, unit, name, note }` and shown as an editable review list before anything is written.

The parser is deliberately unambitious — leading number, optional unit from the §4 table, remainder as the name, anything after a comma as the note. It matches existing ingredients case-insensitively and offers to create the rest. A wrong parse is visibly wrong and one tap from fixed, which is what makes a crude parser acceptable here and a clever one unnecessary.

---

## 8. Build phases

| Phase | Scope | Done when |
|---|---|---|
| 0 | **Infrastructure** (`INFRASTRUCTURE.md`), scaffold, Tailwind, Supabase local, Google OAuth, profiles trigger, household create/invite/join, test-auth for CI | Two accounts share one household |
| 1 | Ingredients + recipes CRUD, **paste-a-list bulk entry**, image upload | A recipe can be created and read back on mobile |
| 2 | Week planner, slot assignment, week navigation | A full week can be planned and edited |
| 3 | **List generation, aggregation, aisles, staples, regulars, tick-off, realtime, offline tick queue, ad-hoc items** | Plan → correct list → shop |
| 4 | Manual nutrition entry, barcode scanning, OFF integration, nutrition panels | A generic recipe shows a per-serving estimate with weighted coverage |
| 5 | PWA install, empty states, loading/error states, a11y pass | Installs to home screen, feels finished |

Phase 3 is the product. Phases 0–2 exist to feed it; 4–5 make it pleasant. Estimates and the phase-by-phase breakdown live in `PLAN.md`; decisions taken during review live in `DECISIONS.md`.

---

## 9. Testing

- **Vitest on `units.ts` / `aggregate.ts`** — highest-value tests in the codebase. Cover: the cook-once-eat-twice 4-portion case, cross-family separation, count round-up, **rounding up rather than to-nearest**, end-only rounding, **the kg/l format step introducing no second rounding**, staple exclusion, regular-ingredient seeding, the regular-and-recipe-derived single-line rule, and all six regeneration cases in §4 — including a ticked item that is no longer required becoming a manual item rather than disappearing.
- **Vitest on `nutrition.ts`** — gram resolution for each family, unresolvable lines counting as uncovered rather than skipped, mass-weighted coverage, and the linking rule leaving ingredient name/aisle/unit/staple untouched.
- SQL script asserting cross-household RLS isolation.
- Playwright happy path: sign in → create recipe → plan week → generate list → tick item.

---

## 10. Known risks

- **iOS Safari lacks `BarcodeDetector`** — the ponyfill is load-bearing on iPhone; validate it early in Phase 4 rather than discovering it at the end.
- **Google-only auth** means both household members need Google accounts. Adding email magic-link later is a Supabase config change plus a login button.
- **OFF coverage is thin for supermarket own-brand and non-existent for loose produce** — manual entry isn't a fallback, it's the primary path for a good share of ingredients, and its UX deserves equal care.
- **Nutrition coverage will be low early on** and climbs only as the household types values in. Accepted: the app is a planner and a shopping list first, and §5's weighted coverage line makes the gap visible rather than hiding it. The escape hatch, if coverage stays uselessly low, is seeding a generic food-composition table (UK CoFID or USDA FoodData Central) into a global `nutrition_refs` table with a nullable `ingredients.nutrition_ref_id` — an additive change that slots in as step 2.5 of §5's resolution order without touching recipes or lists.
- **`grams_per_unit` and `density_g_per_ml` will mostly be empty**, so count and volume lines start uncovered. This is honest rather than broken, but it means a recipe measured in spoons and whole vegetables may show very low coverage even with products linked.
- **The portion multiplier over-shops** for meals only one person eats (see §4). `portion_size` being editable covers the batch-cooking case; the solo-meal case waits for per-slot eater counts in v2.
- **Cold-start data entry is the largest adoption risk, ahead of anything technical.** Before the app is useful once, someone types ~20 recipes, ~60 ingredients, and (for §5) seven nutrition figures per ingredient. That is hours of phone typing paid up front for value delivered later. The paste-a-list parser in §7 roughly halves it; nothing else in v1 addresses it, and if the app is abandoned it will most likely be abandoned here rather than over a bug.
- **The offline tick queue is the one place local state can diverge from the server.** Last-write-wins on `checked_at` makes divergence converge rather than persist, but a phone that is offline for a very long time will flush stale ticks onto a list that has since been completed. Flushing is therefore refused against a `completed` list, and the queue is dropped with a toast rather than replayed.
