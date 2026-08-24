# Recipe Model Spike

**Status:** Findings confirmed against real data — see update below · **Date:** 2026-08-24
**Companions:** `docs/SPEC.md` §2 (the schema under test), `docs/REAL-WEEK-EXAMPLE.md` (the real-recipe re-run this doc calls for)
**Cost:** half a day, no code
**Purpose:** find out whether real recipes fit `quantity / unit / ingredient` **before** Phase 0 writes a migration.

---

## 0. Read this first

The recipes below are **representative, not yours.** They are ten meals a UK two-person household plausibly cooks in a week, written out by hand against the `SPEC.md` §2 schema to see where the schema resists.

That substitution is the doc's one weakness, and it matters: your actual repertoire will expose at least one thing this didn't. **Re-run §1 with ten recipes you genuinely cook before accepting §3's decisions.** It takes an hour with a notepad and it is the last cheap moment to change the schema.

What follows is therefore a *provisional* set of findings — strong enough to act on, weak enough that a contradicting real recipe should win.

**Update:** that re-run happened — see `REAL-WEEK-EXAMPLE.md`. Five real meals rather than ten, supplied as a shopping list rather than full recipe cards, but real. It confirms F1, F11, and F13 directly and adds two low-severity findings (F14, F15), neither requiring a schema change. Treat this doc's findings as confirmed rather than provisional.

---

## 1. The ten recipes, as schema rows

Written exactly as `recipes` + `recipe_ingredients` would hold them. Where a line resisted the schema it is marked **⚠** and picked up in §2.

### 1.1 Spaghetti bolognese — `servings: 4`

| quantity | unit | ingredient | note |
|---|---|---|---|
| 500 | g | Beef mince | |
| 1 | unit | Onion | finely chopped |
| 2 | unit | Garlic cloves | crushed **⚠ F1** |
| 2 | unit | Chopped tomatoes | tinned **⚠ F2** |
| 2 | tbsp | Tomato purée | |
| 300 | ml | Beef stock | **⚠ F3** |
| 400 | g | Spaghetti | |
| — | to_taste | Salt | staple |
| — | to_taste | Black pepper | staple |
| 1 | tbsp | Olive oil | staple |

### 1.2 Chicken & chorizo traybake — `servings: 4`

| quantity | unit | ingredient | note |
|---|---|---|---|
| 8 | unit | Chicken thighs | bone-in, skin-on |
| 150 | g | Chorizo | sliced |
| 800 | g | New potatoes | halved |
| 2 | unit | Red peppers | sliced |
| 1 | unit | Red onion | wedges |
| 2 | tbsp | Olive oil | staple |
| 1 | tsp | Smoked paprika | staple |

### 1.3 Thai green curry — `servings: 4`

| quantity | unit | ingredient | note |
|---|---|---|---|
| 600 | g | Chicken breast | sliced |
| 4 | tbsp | Thai green curry paste | |
| 1 | unit | Coconut milk | tinned **⚠ F2** |
| 200 | g | Green beans | trimmed |
| 1 | unit | Coriander | to garnish **⚠ F4** |
| 300 | g | Jasmine rice | to serve **⚠ F5** |
| 1 | tbsp | Fish sauce | |

### 1.4 Chilli con carne — `servings: 4`

| quantity | unit | ingredient | note |
|---|---|---|---|
| 500 | g | Beef mince | |
| 1 | unit | Onion | diced |
| 2 | unit | Chopped tomatoes | tinned |
| 1 | unit | Kidney beans | tinned, drained |
| 2 | tsp | Ground cumin | staple |
| 1 | tsp | Chilli powder | staple |
| 300 | g | Long grain rice | to serve |

### 1.5 Fish pie — `servings: 4`

| quantity | unit | ingredient | note |
|---|---|---|---|
| 600 | g | Fish pie mix | |
| 1 | kg | Potatoes | for mash |
| 500 | ml | Whole milk | **⚠ F6** |
| 50 | g | Butter | staple |
| 40 | g | Plain flour | staple |
| 100 | g | Cheddar | grated |
| 200 | g | Frozen peas | |

### 1.6 Roast chicken dinner — `servings: 4` **⚠ F7 — the big one**

| quantity | unit | ingredient | note |
|---|---|---|---|
| 1 | unit | Whole chicken | ~1.6kg **⚠ F8** |
| 1.2 | kg | Potatoes | for roasting |
| 400 | g | Carrots | |
| 300 | g | Broccoli | |
| 4 | unit | Yorkshire puddings | frozen |
| 1 | unit | Gravy granules | **⚠ F3** |

### 1.7 Halloumi salad wrap — `servings: 2` *(lunch)*

| quantity | unit | ingredient | note |
|---|---|---|---|
| 225 | g | Halloumi | sliced |
| 4 | unit | Tortilla wraps | **⚠ F1** |
| 100 | g | Salad leaves | |
| 1 | unit | Cucumber | ½ used **⚠ F9** |
| 2 | tbsp | Sweet chilli sauce | |

### 1.8 Jacket potato with tuna mayo — `servings: 2` *(lunch)*

| quantity | unit | ingredient | note |
|---|---|---|---|
| 2 | unit | Baking potatoes | |
| 1 | unit | Tuna | tinned, drained |
| 2 | tbsp | Mayonnaise | staple |
| 2 | unit | Spring onions | sliced |
| 50 | g | Cheddar | grated |

### 1.9 Porridge — `servings: 2` *(breakfast)* **⚠ F10**

| quantity | unit | ingredient | note |
|---|---|---|---|
| 80 | g | Porridge oats | |
| 400 | ml | Whole milk | |
| 1 | tbsp | Honey | staple |

### 1.10 Full English — `servings: 2` *(breakfast, weekend)*

| quantity | unit | ingredient | note |
|---|---|---|---|
| 4 | unit | Sausages | |
| 4 | unit | Bacon rashers | **⚠ F1** |
| 2 | unit | Eggs | |
| 1 | unit | Baked beans | tinned |
| 2 | unit | Bread | slices, to fry **⚠ F1** |
| 200 | g | Mushrooms | |

**Totals:** 10 recipes → **57 distinct ingredients**, of which 12 are staples. 41 of 57 lines are `unit` or `g`.

---

## 2. Findings

Ordered by how much they should change the plan.

### F7 — One slot holds one recipe, and real dinners aren't one recipe 🔴 **Severity: high**

`meal_plan_entries` is unique on `(meal_plan_id, day_of_week, slot)`, so **a dinner slot holds exactly one recipe.** Recipe 1.6 is the problem in miniature: a roast is a chicken, roast potatoes, two veg, Yorkshires, and gravy. Written as one recipe it works — but only by pretending a composite meal is a single dish, which then means "roast potatoes" can never be reused alongside anything else.

The same shape recurs constantly and not just at Sunday lunch: curry **+** rice, chilli **+** rice, sausages **+** mash, anything **+** salad. §1 hid it by folding rice into the curry (F5), which is a workaround, not a model.

The cost of getting this wrong is asymmetric. Allowing multiple recipes per slot **now** is: drop one unique constraint, add `sort_order`, and render a slot as a small stack instead of a single row. Doing it **later** means a data migration plus rework of `MealSlotRow`, `RecipePickerSheet`, the aggregation input shape, and the `sources` jsonb — across the exact code Phase 3 depends on.

**Recommendation: allow multiple recipes per slot.**
- Drop the unique constraint to `unique (meal_plan_id, day_of_week, slot, recipe_id)` — the same recipe twice in one slot is still nonsense, two different recipes is not.
- Add `recipe_ingredients`-style `sort_order` to `meal_plan_entries`.
- `MealSlotRow` renders 1–3 stacked lines; the empty state is unchanged; the picker gains "Add another" rather than replacing.
- Aggregation needs **no change at all** — it already iterates entries independently, and `SPEC.md` §4's cook-once-eat-twice logic falls out identically.

This is the single most valuable thing the spike found and the reason it was worth doing before Phase 0.

### F11 — Weekly regulars have nowhere to live 🔴 **Severity: high**

Milk, bread, bananas, coffee, cat food, bin bags. Bought every single week, tied to no recipe, and **not** staples — a staple is something you already have (`is_staple` excludes it from the list); these are things you must buy *precisely because* you run out.

The schema's only home for them is `shopping_list_items` with `is_manual = true`. `SPEC.md` §4 preserves manual items across a *regeneration*, which is correct — but each week generates a **new list**, which starts with none of them. So the household re-types the same eight items every Sunday, forever, and the app is worse than the notes app it replaced for the items bought most often.

**Recommendation: add `ingredients.is_regular` (bool, default false).**
- List generation seeds every `is_regular` ingredient onto the new list, with no quantity, in its own aisle group like any other item.
- `/settings/pantry.vue` already exists as the screen for "ingredients with a flag" — it becomes two sections, STAPLES (never buy) and REGULARS (always buy), which is a genuinely clarifying pairing rather than a bolted-on second screen.
- One nullable column, one branch in the generation route, no new table, no new screen.

Cheap now, and the alternative is the household quietly going back to a paper list for the frequent half of their shopping.

### F3 — Stock, gravy, and other "made up" ingredients 🟠 **Severity: medium**

"300 ml beef stock" is what you *cook with*; "1 tub of stock cubes" is what you *buy*. The schema has one ingredient with one `default_unit` and no notion of a preparation. Recipes 1.1 and 1.6 both hit it.

Worse, stock is a near-staple: you buy cubes twice a year, so treating it as a normal ingredient puts "300 ml beef stock" on a shopping list, which is meaningless.

**Recommendation: no schema change.** Model stock, gravy granules, and stock pots as **staples** (`is_staple = true`) named for what you buy — "Beef stock cubes", "Gravy granules". The recipe line stays `300 ml Beef stock` for the cook's benefit, and it lands in "assumed you already have" where it belongs. Revisit only if a household repeatedly runs out mid-week.

Nutrition consequence: stock contributes salt and is excluded. Acceptable, and `SPEC.md` §5 already names salt as the least trustworthy figure.

### F1 — Count nouns confirm `unit_label` (review item B3) 🟠 **Severity: medium**

Sixteen lines across the ten recipes are counted things with a *specific* noun: cloves, rashers, slices, wraps, thighs, sausages, tins, sprigs. All of them currently render as `unit`, so the list says "3 unit" — and `DESIGN.md` §5.9's rule of rendering `3 unit` as bare "3" produces a shopping list that says **"Garlic cloves — 3"** (tolerable) alongside **"Bread — 4"** (four loaves? four slices?).

The genuinely dangerous case is garlic: measured in cloves in one recipe and bulbs in another, both land in the `count` family and aggregate to a single wrong number, silently. That is precisely the class of bug Phase 3 exists to prevent.

**Recommendation: confirm B3.** Add `ingredients.unit_label` (text, nullable) — "clove", "rasher", "slice", "tin". It is a property of the *ingredient*, not the line, which is what makes the ambiguity impossible: an ingredient is counted in exactly one thing, forever. Display becomes `3 cloves`; aggregation logic is untouched; `grams_per_unit` gains an obvious meaning ("one clove ≈ 5 g") and a much better form label.

### F2 — Tins are the case `grams_per_unit` was made for 🟢 **Severity: low — schema already handles it**

"2 tins chopped tomatoes" must shop as **2 tins** and compute nutrition as **800 g**. With F1 accepted this works exactly as designed: ingredient "Chopped tomatoes", `default_unit: unit`, `unit_label: "tin"`, `grams_per_unit: 400`. Shopping stays in the user's units per `SPEC.md` §2; nutrition resolves through the count rule in §5.

Worth calling out as a **positive** finding: the two-field design in §2 was not over-engineering, and tinned goods are the ingredient class most likely to actually *have* a barcode, so their `grams_per_unit` will often arrive free from Open Food Facts.

### F5 / F4 — "To serve" and "to garnish" 🟢 **Severity: low**

Rice served with a curry must reach the shopping list; a coriander garnish technically should too. Both work as ordinary lines with `note: "to serve"`. Slight over-shopping on garnishes (you buy a whole bunch for a sprig) is real but self-correcting once coriander becomes a `is_regular` item or gets ignored.

**Recommendation: no `is_optional` column in v1.** It sounds necessary and isn't; the `note` field carries it, and every optional-ingredient system ends up asking the user a question they don't want at 6pm on a Tuesday.

### F6 — Milk appears in recipes *and* is a weekly regular 🟠 **Severity: medium**

Recipes 1.5 and 1.9 use 500 ml and 400 ml of milk. The household also buys 4 pints every week regardless. Under F11 both happen: milk is `is_regular` **and** recipe-derived, so it appears twice — once with a quantity, once without.

**Recommendation:** when an ingredient is both regular and recipe-derived, emit **one** line carrying the recipe quantity, with the sources line noting it's also a regular. One extra condition in the generation route, and it prevents the most obviously silly output F11 could produce.

### F8 — Whole chicken: the count/mass boundary 🟢 **Severity: low**

"1 whole chicken (~1.6 kg)" is a count line whose mass matters. Handled by `grams_per_unit: 1600`. Noted only because it's the case where `grams_per_unit` is a *rough* figure — chickens vary by 300 g — which reinforces `SPEC.md` §5's insistence that nutrition is labelled an estimate.

### F9 — Part-used ingredients 🟢 **Severity: low, accepted**

"½ a cucumber" — you buy one, use half, and the other half either rots or gets used Thursday. `SPEC.md`'s count-rounds-up rule buys one cucumber, which is correct shopping behaviour and slightly wrong nutrition. Accepted; it is the pantry-as-inventory problem, explicitly deferred to v2.

### F10 — Breakfast barely needs recipes 🟠 **Severity: medium, product not schema**

Of 21 weekly slots, seven are breakfast, and six of those are "toast" or "cereal" — things nobody will ever create a recipe for. Porridge (1.9) is about the only breakfast that justifies a recipe row.

Two consequences worth carrying into Phase 2:

1. **The "Just a note…" path in `RecipePickerSheet` is load-bearing**, not a nicety. `PLAN.md` §2.3 already includes it; this is the evidence that it deserves equal design care.
2. **Breakfast will generate almost no shopping-list items**, because bread/milk/cereal are exactly the F11 regulars. Breakfast planning and breakfast shopping are served by two different mechanisms, and F11 is the one that matters.

Consider whether the planner should let a household **hide the breakfast row** entirely — a household setting, one boolean, and it removes a third of the planner's visual weight for households who don't want it. Not a v1 requirement; worth a line in the v2 list.

### F12 — Servings ranges 🟢 **Severity: trivial**

"Serves 4–6" is how recipes are actually written; `recipes.servings` is a single integer ≥ 1. **Convention: record the lower bound.** Under-stating servings over-shops slightly, which is the safe direction. One line in the recipe editor's helper text.

### F13 — The household-of-2 multiplier meets a recipe that serves 4 🟠 **Severity: medium, behavioural**

Seven of the ten recipes serve 4; the household is 2. The multiplier is therefore 0.5 on most dinners — and **nobody halves a bolognese.** They cook the full batch and eat it twice.

`SPEC.md` §4 handles this correctly *if* the user plans the leftovers as a second slot, at which point 0.5 + 0.5 = 1.0 and the shopping is right. But that is a **behaviour the app must teach**, not one users arrive with. If they plan bolognese once and cook the whole packet, the shopping list is half of what they used, every time.

**Recommendation:**
- This strengthens the case for C1's editable `households.portion_size` — a household that always cooks full batches can set it to 4 and stop fighting the arithmetic.
- Add one line of onboarding copy where the portion multiplier is explained (`/settings/household.vue` already has the plain-English block): *"Cooking once and eating it twice? Plan it in both slots and we'll shop for both."*
- The `MealSlotRow` "×2 portions" note from `DESIGN.md` §5.5 is the right surface for making the multiplier visible at the moment of planning. Keep it.

---

## 3. Decisions required

| # | Decision | Recommendation | Lands in |
|---|---|---|---|
| F7 | Multiple recipes per meal slot? | **Yes** — drop the unique constraint now | `SPEC.md` §2, Phase 2 migration |
| F11 | `ingredients.is_regular` for weekly buys? | **Yes** — one column, seeds each new list | `SPEC.md` §2, §4; Phase 1 migration; pantry screen |
| F1 | `ingredients.unit_label`? (review item B3) | **Yes** — confirmed by 16 lines | `SPEC.md` §2, §4; Phase 1 migration |
| F3 | Stock/gravy modelling | **Staples, named as bought.** No schema change | `seed.sql`, a note in §2 |
| F6 | Regular **and** recipe-derived | One line, recipe quantity wins | Generation route, Phase 3 |
| F5 | `is_optional` on recipe lines | **No.** `note` carries it | — |
| F12 | Servings ranges | Lower bound, by convention | Recipe editor helper text |
| F13 | Batch-cooking behaviour | Onboarding copy + editable `portion_size` | `DESIGN.md` §5.13, C1 |

**Net schema impact:** three columns and one relaxed constraint. Two of the three (`unit_label`, `is_regular`) are Phase 1; the constraint is Phase 2. None of it is a migration against meaningful data, because none of these tables exist yet — which is the entire point of having run this now.

---

## 4. What the spike says about the schema overall

It held up. Fifty-seven ingredients across ten real meals produced **three additive columns and one dropped constraint** — no restructuring, no table splits, no rethink of `ingredients` vs `products`, and no challenge to the generic-naming rule, which survived contact with tinned goods and branded-in-practice items like Yorkshire puddings.

The two findings that matter (F7, F11) are both things the schema *forbids* rather than things it models wrongly, and both are cheap to permit now and expensive to permit later. That asymmetry is exactly what a spike is for.

**One caveat, repeated:** re-run §1 against ten recipes you actually cook before the Phase 1 migration is written. If your repertoire includes baking, batch-cooked freezer meals, or anything portioned by "makes 12", expect at least one more finding — `recipes.servings` as a portion count is doing quiet work that muffins would break.
