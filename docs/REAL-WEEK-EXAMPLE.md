# Real Week Example

**Status:** Reference data · **Date:** 2026-08-24
**Companions:** `RECIPE-MODEL-SPIKE.md` (the ten hypothetical recipes this checks against), `SPEC.md` §2/§4, `PLAN.md` Phase 1 (`seed.sql`)
**Source:** supplied by the user directly — five meals they actually cook, plus the shopping list they hand-built from them.

---

## 0. Read this first

`RECIPE-MODEL-SPIKE.md` §0 asked for exactly this: *"Re-run §1 with ten recipes you genuinely cook before accepting §3's decisions."* This is that re-run — five meals rather than ten, and given as **meals + a resulting shopping list** rather than full recipe cards with quantities. That shape difference is itself informative (see §3), and it means §1 below reconstructs per-recipe ingredient lines by working backward from the aggregate list — those quantities are estimates, marked **est.**, not the user's own numbers. The shopping list in §2 is exactly as given.

This is real evidence, not another hypothetical set, so where it disagrees with the spike, this doc wins.

---

## 1. The five meals, reconstructed as schema rows

Chicken totals **1800 g across three meals at 4 portions each** (per the user's own note) — 600 g per recipe — which is the anchor the reconstruction below is built around.

### 1.1 Chicken, Potatoes & Broccoli — `servings: 4`

| quantity | unit | ingredient | note |
|---|---|---|---|
| 600 | g | Chicken breast | est. |
| 800 | g | Potatoes | est., roasted |
| 300 | g | Broccoli | est. |
| 1 | unit | Onion | est. |
| — | to_taste | Salt | staple |
| — | to_taste | Black pepper | staple |
| 1 | tbsp | Olive oil | staple |

### 1.2 Turkey Burrito Bowl — `servings: 4`

| quantity | unit | ingredient | note |
|---|---|---|---|
| 500 | g | Turkey mince | est. |
| 2 | unit | Bell peppers | est. |
| 1 | unit | Taco/burrito seasoning | packet — **⚠ see F1 (unit_label)** |
| 1 | unit | Salsa | jar |
| 1 | unit | Avocado | or a tub of guac — **⚠ see F14** |
| 100 | g | Cheese | grated, est. |
| 1 | unit | Onion | est. |
| — | — | Rice | **missing from the real list — see F15** |

### 1.3 Chicken Pasta Bake — `servings: 4`

| quantity | unit | ingredient | note |
|---|---|---|---|
| 600 | g | Chicken breast | est. |
| — | — | Pasta (dry) | **missing from the real list — see F15** |
| 1 | unit | Pasta sauce | jar |
| 150 | g | Cheese | for topping, est. |
| 1 | unit | Onion | est. |

### 1.4 Chicken Noodle Stir Fry — `servings: 4`

| quantity | unit | ingredient | note |
|---|---|---|---|
| 600 | g | Chicken breast | est. |
| 1 | unit | Egg noodles | packet — **⚠ see F1** |
| 1 | unit | Stir fry sauce | packet — **⚠ see F1** |
| 1 | unit | Bell peppers | est., shared pool with 1.2 |
| 1 | unit | Onion | est. |

### 1.5 Steak & Homemade Chips — `servings: 4`

| quantity | unit | ingredient | note |
|---|---|---|---|
| 4 | unit | Steaks | **⚠ see F1 — unit_label "steak"** |
| 800 | g | Potatoes | est., for chips — shared pool with 1.1 |
| — | to_taste | Salt | staple |
| 1 | tbsp | Olive oil | staple |

**Totals (reconstructed):** 5 recipes, ~18 distinct ingredients before aggregation, 3 of them chicken-bearing and summing to the user's own 1800 g figure.

---

## 2. The real shopping list, as given

Exactly as supplied, grouped by aisle (`shared/constants/aisles.ts` walk order) and marked with the pantry concept each line demonstrates.

| Aisle | Item | Recipe-derived? | Pantry concept |
|---|---|---|---|
| Produce | Potatoes | ✅ (1.1 + 1.5, combined) | — |
| Produce | Broccoli | ✅ (1.1) | — |
| Produce | Bell Peppers | ✅ (1.2 + 1.4, combined) | — |
| Produce | Onions | ✅ (1.1–1.4, combined) | — |
| Produce | Avocado | ✅ (1.2) | `is_regular` candidate — see F14 |
| Meat & Fish | Chicken (~1800 g) | ✅ (1.1 + 1.3 + 1.4, combined) | — |
| Meat & Fish | Turkey Mince | ✅ (1.2) | — |
| Meat & Fish | Steaks | ✅ (1.5) | — |
| Dairy & Eggs | Cheese | ✅ (1.2 + 1.3, combined) | — |
| Cupboard | Taco/burrito seasoning | ✅ (1.2) | unit_label — F1 |
| Cupboard | Salsa | ✅ (1.2) | unit_label — F1 |
| Cupboard | Guac | ✅ (1.2, alt. to avocado) | F14 |
| Cupboard | Pasta Sauce | ✅ (1.3) | unit_label — F1 |
| Cupboard | Stir Fry packet sauce | ✅ (1.4) | unit_label — F1 |
| Cupboard | Egg noodles | ✅ (1.4) | unit_label — F1 |
| — | **Bagel Slims** | ❌ | `is_regular` |
| Dairy & Eggs | **Yoghurt** | ❌ | `is_regular` |
| Chilled | **Ham** | ❌ | `is_regular` |
| Cupboard | **Chocolate** | ❌ | `is_regular` |
| Cupboard | **Snacks** | ❌ | `is_regular` |

The five bolded **Extras** are exactly `is_regular` (F11 in the spike): bought every week, tied to no recipe. They're the strongest evidence in this whole document, because the user separated them into their own section *without having been told the concept exists* — that's the household's own mental model landing precisely on the schema's.

The user's own framing — **"excluding what's already in the pantry"** — is a plain-English restatement of `is_staple` (SPEC §0's "pantry staples excluded" line). Salt, pepper, oil, and (per F15 below) probably rice, dry pasta, and garlic are absent from this list not because they're unneeded but because the household already has them. That is the feature working as designed, one week early.

---

## 3. Findings

Cross-checked against `RECIPE-MODEL-SPIKE.md` §2. Confirms first, then what's new.

### Confirms F11 — `is_regular` 🟢

The **Extras** block (§2) is F11's exact prediction, unprompted: five items bought weekly regardless of what's cooked, kept visibly separate from the meal-derived list. No change needed — this is the strongest field confirmation the spike could ask for.

### Confirms F13 — batch-cooking math 🟢

The user's own arithmetic — *"about 1800g needed for 3 meals x4 portions each"* — is SPEC §4's aggregation rule (`multiplier = portion_size / servings`, summed across contributing recipes) done by hand, correctly, before ever seeing the app. It also confirms the **combine-across-recipes** behaviour matters in practice, not just in theory: Potatoes (1.1 + 1.5), Bell Peppers (1.2 + 1.4), Onions (1.1–1.4), and Cheese (1.2 + 1.3) all appear as **one line each** in the real list despite coming from different recipes — exactly SPEC §4's "group by `(ingredient_id, family)`, sum in base units" rule, and exactly what `aggregate.ts` (Phase 3.1) must reproduce.

### Confirms F1 — `unit_label` 🟢

Six of the real list's ~19 lines are convenience singles that must shop as **one packet/jar/tub**, not a weight: taco seasoning, salsa, guac, pasta sauce, stir fry sauce, egg noodles, plus steaks as a count noun. Same shape as the spike's cloves/rashers/tins, different vocabulary. No new schema need — `unit_label` already covers it (`1 packet`, `1 jar`, `4 steaks`).

### New — F14: "either/or" ingredients 🟠 Severity: medium, product not schema

**"Avocado / Guac"** is one shopping decision written as two acceptable outcomes — buy fresh and mash it, or buy it ready-made. `SPEC.md`/`RECIPE-MODEL-SPIKE.md` have no concept of a recipe line with a substitutable alternative; today it would have to be one ingredient chosen up front.

**Recommendation:** no schema change, same pattern as F5 (`note` carries it) — the recipe line names one ingredient (say, "Avocado"), and `note: "or shop-bought guac"` documents the swap for whoever's shopping. Revisit only if substitution turns out to be common across many recipes rather than this one.

### New — F15: staples the user never named 🟢 Severity: low, informational

Rice (implied by a burrito bowl) and dry pasta (implied by a pasta bake) never appear on the real list at all, and garlic doesn't either. Two readings, both consistent with the pantry model rather than in conflict with it:

- They're already `is_staple` for this household (a stocked cupboard of rice/pasta/garlic), so correctly excluded — the same mechanism that hides salt and oil.
- Or the user's hand-built list simply forgot them, which is itself evidence *for* building the app: a generated list can't forget an ingredient a recipe declares, a hand-written one can.

Either way, nothing to change. Worth carrying into `seed.sql`: mark rice, dry pasta, and garlic `is_staple = true` for the example household so the seeded aggregation output matches this real list exactly.

### New — F16: same generic name, different recipes, one line 🟢 Severity: low, positive

"Cheese" appears once despite covering a burrito-bowl topping and a pasta-bake topping — plausibly different cheeses in real life, but the household shops for both under one generic name. This is the locked **generic-naming decision** (SPEC §0) surviving contact with real data a second time (the spike's tinned-tomatoes/Yorkshire-puddings cases were the first): a household will collapse genuinely different products into one shopping-list line themselves, so the schema doesn't need to stop them.

---

## 4. What this changes

Nothing in the schema — no new column, no relaxed constraint. This data point closes `RECIPE-MODEL-SPIKE.md`'s standing caveat (and `DECISIONS.md` E2's "re-run provisionally closed" status) in the direction the spike already bet on: F1, F11, and F13 all land exactly as predicted against real data, and the two new findings (F14, F15) are both product-level and both resolved with "no schema change, `note` or `is_staple` already covers it" — the same low-cost pattern the spike's own low-severity findings used.

**Recommendation for `PLAN.md` §1.1's `seed.sql`:** use these five recipes (with the reconstructed quantities above tightened up by hand) as the seed data instead of inventing new ones, plus the five Extras as `is_regular` ingredients and rice/pasta/garlic as `is_staple`. It's real, it's already been hand-aggregated once by the person who'll use the app, and Phase 3's gate checklist ("a hand-computed week matches the generated list exactly") gets a hand-computation that actually happened rather than one written for the occasion.
