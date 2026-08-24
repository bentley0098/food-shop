# Design Plan — Household Meal Planning & Shopping

**Status:** Draft for review · **Date:** 2026-08-24 · **Companion to:** `docs/SPEC.md`

This document is the source of truth for how the app looks and behaves visually. It defines a brand, a token set, a component library, and a screen-by-screen layout spec, so that every page can be scaffolded independently and still land coherent.

---

## 1. Design position

### 1.1 What this app is, visually

Two people, one kitchen, one trolley. The app is used in three very different physical situations, and the design has to serve all three:

| Situation | Posture | Design consequence |
|---|---|---|
| **Planning** — sofa, Sunday evening, unhurried | Two hands, attention available | Can afford density, imagery, browsing pleasure |
| **Cooking** — kitchen, greasy hands, phone propped up | Glancing from a metre away | Large type, high contrast, no hover-dependent affordances |
| **Shopping** — supermarket, one hand, moving, poor light | Thumb only, half-attention | Huge targets, aisle-ordered, state visible at arm's length |

The shopping list is the product (SPEC §8). It gets the most design attention, the largest touch targets, and the highest contrast.

### 1.2 Brand idea — "Market & Notebook"

The visual language borrows from two familiar physical objects, neither of them "software":

- **The greengrocer's chalkboard** — stencilled uppercase labels, hand-scale numerals, deep saturated produce colours on an off-white ground, hairline rules instead of shadows.
- **The kitchen notebook** — warm paper, ink, things crossed out rather than deleted, a sense that the week is *written down*.

This gives us three concrete rules that fight the default look of generated interfaces:

1. **Warm ground, never grey.** The page is off-white paper (`chalk-50`), not `#F9FAFB`. Dark mode is warm charcoal, not blue-black.
2. **Hairlines, not shadows.** Structure comes from 1px warm-taupe rules and generous whitespace. Shadow is reserved for two things only: bottom sheets and the sticky nav/progress bars. Nothing "floats" for decoration.
3. **Produce colours, not tech colours.** Beetroot, bay leaf, turmeric. No indigo, no violet, no blue-to-purple gradient.

### 1.3 Explicit non-goals

Do not ship any of the following. They are the tells of a template:

- Purple/indigo → pink gradients, gradient text, glassmorphism, frosted blur panels.
- Emoji as iconography (🥕 🛒 ✅) anywhere in product UI.
- `rounded-3xl` cards with soft drop shadows floating on a grey background.
- Centred marketing hero with an oversized headline on an app screen.
- Decorative illustration that doesn't carry information.
- More than one accent hue on a single screen without a semantic reason.
- Animated gradients, shimmer on non-loading elements, or spring bounce on everything.

---

## 2. Brand foundations

### 2.1 Colour

Four families. Every colour has a job; nothing is decorative.

**Neutrals — "Chalk & Ink"** (the ground everything sits on)

| Token | Hex | Use |
|---|---|---|
| `chalk-0` | `#FFFDF9` | Raised surfaces: cards, sheets, sticky bars (light) |
| `chalk-50` | `#FAF6EF` | Page ground (light) |
| `chalk-100` | `#F1EBE1` | Subtle fills, input backgrounds, checked-row wash |
| `chalk-200` | `#E4DCCF` | **Hairline rules and borders** — the workhorse |
| `chalk-300` | `#CFC5B4` | Dashed empty-slot borders, disabled strokes |
| `ash-600` | `#5C5548` | Secondary text (6.8:1 on `chalk-50`) |
| `ash-700` | `#3D382E` | Strong secondary, icon default |
| `ink-900` | `#17150F` | Primary text |
| `soot-950` | `#14120F` | Page ground (dark) |
| `soot-900` | `#1D1A15` | Raised surface (dark) |
| `soot-800` | `#272219` | Fills (dark) |
| `soot-700` | `#373125` | Hairline (dark) |
| `soot-300` | `#A9A092` | Secondary text (dark, 7.3:1) |

**Beetroot — primary brand / actions**

`50 #FBEEF1` · `100 #F6D9E0` · `300 #DE93A6` · `500 #B04665` · **`600 #8E2C48` (brand)** · `700 #6E2038` · `900 #3D1220`

Solid `beetroot-600` on `chalk-50` is 7.4:1 — safe as a text colour *and* as a button ground with `chalk-0` label. In dark mode, interactive text uses `beetroot-300`; solid buttons keep `beetroot-600` with `chalk-0` text.

**Bay — success, completion, "done"**

`50 #ECF4F0` · `100 #D3E6DE` · `300 #85B5A5` · `500 #48806F` · **`600 #2F5D50`** · `700 #24483E` · `900 #14261F`

Used for ticked items, completed lists, and the progress rule. Deliberately *not* the primary — completion is the reward, and reserving a second hue for it makes progress legible at a glance in a supermarket aisle.

**Turmeric — attention, staleness, scanning**

`50 #FDF3DF` · `100 #FAE5B8` · `300 #EFC469` · **`500 #E0A32E`** · `700 #A8730F` · `900 #5C3D06`

Rule: **turmeric never carries text on a light ground.** `turmeric-500` is a fill or a stroke; text on `turmeric-100` is `turmeric-900`. Reserved for: stale-plan banner, scanner viewfinder brackets, "estimate" nutrition badges.

**Clay — destructive** — `100 #F7DDD6` · `600 #A33A21` · `900 #4A1A0E`. Destructive only; never used for emphasis.

**Aisle swatches.** Aisles need to be distinguishable when scanning the list, but eleven bright chips would be a rainbow. Each aisle gets a **muted dot + a stencil label**; the dot is a desaturated tint used at 8px, never as a background fill.

| Order | Aisle | Dot | Icon (Lucide) |
|---|---|---|---|
| 1 | Produce | `#4E7A3E` | `carrot` |
| 2 | Bakery | `#B07A34` | `croissant` |
| 3 | Meat & Fish | `#9B3B48` | `fish` |
| 4 | Dairy & Eggs | `#C9A227` | `egg` |
| 5 | Chilled | `#4A7E8C` | `refrigerator` |
| 6 | Frozen | `#5C74A8` | `snowflake` |
| 7 | Cupboard | `#8A6A46` | `package` |
| 8 | Herbs & Spices | `#6B7F3A` | `leaf` |
| 9 | Drinks | `#7A5AA0` | `cup-soda` |
| 10 | Household | `#6E6558` | `spray-can` |
| 11 | Other | `#8C8375` | `circle-dashed` |

Order is supermarket walk order and is a constant in `shared/constants/aisles.ts` — the list renders groups in this order, always.

### 2.2 Typography

Two typefaces, self-hosted via `@nuxt/fonts`, both variable.

**Display — Fraunces** (`opsz` 24–72, `wght` 400–700, `SOFT` 0–100, `WONK` 0–1)

Used for: screen titles, recipe names, day names, big numerals (progress counts, servings, nutrition figures). Set with `font-variation-settings: 'SOFT' 40, 'WONK' 1` at display sizes for the slightly-odd, warm character; `WONK 0` below 20px where the quirk becomes noise. This is the single strongest brand signal — a soft, editorial serif in an app that would otherwise default to a neutral grotesque.

**UI — Instrument Sans** (`wght` 400–700)

Used for: everything else — body, labels, buttons, inputs, metadata. Slightly narrow, well-drawn, quietly distinctive. Not Inter.

**Numerals.** Every quantity, count, and time uses `font-variant-numeric: tabular-nums`. Quantities sit in a right-aligned column on the shopping list and recipe ingredient rows; proportional figures would make them ragged.

**Scale** (mobile-first; `md:` steps noted where they change)

| Token | Size / line-height | Face | Use |
|---|---|---|---|
| `display` | 2rem / 1.05, `-0.02em` | Fraunces 600 | Login, onboarding, empty-state headline |
| `title-lg` | 1.5rem / 1.15, `-0.015em` | Fraunces 600 | Page titles, recipe name on detail |
| `title-md` | 1.25rem / 1.2 | Fraunces 600 | Day name on week card, sheet titles |
| `title-sm` | 1.0625rem / 1.3 | Instrument 600 | Card titles, recipe grid names |
| `body` | 1rem / 1.5 | Instrument 400 | Default. **Minimum size for any input** (iOS zoom) |
| `body-sm` | 0.875rem / 1.45 | Instrument 400 | Metadata, notes, helper text |
| `label` | 0.75rem / 1, `+0.08em`, uppercase | Instrument 600 | **Stencil label** — aisle headers, slot names, section rules |
| `num-lg` | 1.75rem / 1, tabular | Fraunces 600 | Progress "12/27", nutrition kcal |
| `num` | 1rem / 1.2, tabular | Instrument 500 | Quantities |

The `label` style is the second-strongest brand signal: small, uppercase, letterspaced, often paired with a hairline rule that runs to the edge of the container. It is how BREAKFAST / LUNCH / DINNER and aisle headers are set throughout.

### 2.3 Space, shape, structure

- **Spacing:** 4px base. Screen gutter `16px` mobile / `24px` ≥`md`. Vertical rhythm between sections `24px`; within a card `12px`.
- **Radius:** `sm 6px` (chips, checkboxes, inputs), `md 10px` (cards, buttons), `lg 14px` (images, hero), `sheet 20px` (top corners only), `full` (pills, avatars). Nothing larger than 20px — oversized radii are the template look.
- **Borders:** `1px solid chalk-200` is the default separator. Empty/placeholder states use `1px dashed chalk-300`. Focus uses a 2px `beetroot-600` ring with a 2px `chalk-50` offset.
- **Elevation:** exactly two shadows.
  - `shadow-bar` — `0 -1px 0 var(--color-chalk-200), 0 -8px 24px -12px rgb(23 21 15 / 0.18)` for sticky bottom nav / action bars.
  - `shadow-sheet` — `0 -2px 40px -8px rgb(23 21 15 / 0.28)` for bottom sheets and the scrim'd picker.
  - Cards get **no shadow**. Ever.
- **Max width:** content column caps at `640px` and centres on tablet/desktop; the bottom nav becomes a left rail at `≥lg` (see §5.1).

### 2.4 Iconography

**Lucide**, 20px default (24px in nav and on the scanner), stroke `1.75`, `currentColor`. Rounded caps, which matches Fraunces' softness. Icons are always paired with a text label or an `aria-label` — never a bare icon button without a name. No emoji, no filled icon sets, no mixing families.

One piece of custom drawing: a small set of **stencil marks** for empty states (an empty crate, a blank week grid, an unticked list) drawn as 1.5px-stroke line art in `chalk-300`, ~96px, no colour. These read as chalkboard sketches, not as stock illustration.

### 2.5 Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `snap` | 120ms | `cubic-bezier(.2,.8,.2,1)` | Checkbox tick, chip toggle, press states |
| `move` | 180ms | `cubic-bezier(.2,.8,.2,1)` | Row reorder, banner in/out, sheet content |
| `sheet` | 260ms | `cubic-bezier(.16,1,.3,1)` | Bottom sheet enter; exit at 200ms |

Rules: transform and opacity only. The one signature motion is the **tick-and-sink** on the shopping list — a checked item ticks (120ms), then its row translates to the bottom of its aisle group with a `move` transition and settles into `--ui-text-dim` with a strikethrough drawn left-to-right. Everything honours `prefers-reduced-motion: reduce`, which collapses all three tokens to 0ms and replaces the sink with an instant reorder.

### 2.6 Dark mode

Ships from day one — this app is used in a bedroom on Sunday night and a badly-lit supermarket. Class-based (`.dark` on `<html>`) with a three-way setting (System / Light / Dark) in Settings. Dark mode is a **warm** inversion: `soot` grounds, `chalk-50` text, hairlines at `soot-700`. Brand hues shift to their `300` tints for text/icons and keep `600` for solid fills. Beetroot-on-soot at `300` is 8.1:1.

---

## 3. Token implementation

Tailwind v4, CSS-first, in `app/assets/css/main.css`. No `tailwind.config.js` (SPEC §1).

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* neutrals */
  --color-chalk-0:   #FFFDF9;
  --color-chalk-50:  #FAF6EF;
  --color-chalk-100: #F1EBE1;
  --color-chalk-200: #E4DCCF;
  --color-chalk-300: #CFC5B4;
  --color-ash-500:   #736B5B;
  --color-ash-600:   #5C5548;
  --color-ash-700:   #3D382E;
  --color-ink-900:   #17150F;
  --color-soot-950:  #14120F;
  --color-soot-900:  #1D1A15;
  --color-soot-800:  #272219;
  --color-soot-700:  #373125;
  --color-soot-400:  #8C8374;
  --color-soot-300:  #A9A092;

  /* brand */
  --color-beetroot-50:  #FBEEF1;
  --color-beetroot-100: #F6D9E0;
  --color-beetroot-300: #DE93A6;
  --color-beetroot-500: #B04665;
  --color-beetroot-600: #8E2C48;
  --color-beetroot-700: #6E2038;
  --color-beetroot-900: #3D1220;

  --color-bay-50:  #ECF4F0;
  --color-bay-100: #D3E6DE;
  --color-bay-300: #85B5A5;
  --color-bay-500: #48806F;
  --color-bay-600: #2F5D50;
  --color-bay-700: #24483E;

  --color-turmeric-50:  #FDF3DF;
  --color-turmeric-100: #FAE5B8;
  --color-turmeric-300: #EFC469;
  --color-turmeric-500: #E0A32E;
  --color-turmeric-700: #A8730F;
  --color-turmeric-900: #5C3D06;

  --color-clay-100: #F7DDD6;
  --color-clay-600: #A33A21;
  --color-clay-900: #4A1A0E;

  /* type */
  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-sans: "Instrument Sans", ui-sans-serif, system-ui, sans-serif;

  --text-display: 2rem;      --text-display--line-height: 1.05;
  --text-title-lg: 1.5rem;   --text-title-lg--line-height: 1.15;
  --text-title-md: 1.25rem;  --text-title-md--line-height: 1.2;
  --text-title-sm: 1.0625rem;--text-title-sm--line-height: 1.3;
  --text-label: 0.75rem;     --text-label--line-height: 1;

  /* shape */
  --radius-sheet: 20px;

  /* motion */
  --ease-out-soft: cubic-bezier(.2,.8,.2,1);
  --ease-sheet: cubic-bezier(.16,1,.3,1);
}

/* semantic aliases — components reference these, not raw ramps */
:root {
  --ui-ground: var(--color-chalk-50);
  --ui-surface: var(--color-chalk-0);
  --ui-fill: var(--color-chalk-100);
  --ui-line: var(--color-chalk-200);
  --ui-line-soft: var(--color-chalk-300);
  --ui-text: var(--color-ink-900);
  --ui-text-muted: var(--color-ash-600);
  --ui-text-dim: var(--color-ash-500);
  --ui-accent: var(--color-beetroot-600);
  --ui-accent-text: var(--color-beetroot-600);
  --ui-done: var(--color-bay-600);
}
.dark {
  --ui-ground: var(--color-soot-950);
  --ui-surface: var(--color-soot-900);
  --ui-fill: var(--color-soot-800);
  --ui-line: var(--color-soot-700);
  --ui-line-soft: var(--color-soot-700);
  --ui-text: var(--color-chalk-50);
  --ui-text-muted: var(--color-soot-300);
  --ui-text-dim: var(--color-soot-400);
  --ui-accent: var(--color-beetroot-600);
  --ui-accent-text: var(--color-beetroot-300);
  --ui-done: var(--color-bay-300);
}

@layer base {
  html { background: var(--ui-ground); color: var(--ui-text); }
  body { font-family: var(--font-sans); }
  .u-label {
    font-size: var(--text-label); font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--ui-text-muted);
  }
  .u-num { font-variant-numeric: tabular-nums; }
  .u-display {
    font-family: var(--font-display); font-weight: 600;
    font-variation-settings: "SOFT" 40, "WONK" 1;
  }
  :where(button, a, input, [tabindex]):focus-visible {
    outline: 2px solid var(--ui-accent-text);
    outline-offset: 2px; border-radius: 6px;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: .01ms !important; transition-duration: .01ms !important;
    }
  }
}
```

**Rule for scaffolding:** components use semantic vars (`bg-[var(--ui-surface)]`, `border-[var(--ui-line)]`) or Tailwind utilities on the semantic aliases. Raw ramp steps (`beetroot-700`) appear only inside the brand primitives in §4.

### Dimming is a colour, never an opacity

Three places in this document de-emphasise text — past days on the planner, checked items on the shopping list, and staples in the "assumed you have" section. All three must use **`--ui-text-dim`**, never `opacity`.

Opacity is the obvious way to dim and it silently breaks §7's contrast floor. `ash-600` on `chalk-50` is 6.8:1; the same colour at 65% opacity is roughly 4:1 and **fails**, and at 55% it is far worse. Because opacity applies to the composited element it is also invisible to every contrast checker, so the failure survives right through to a manual audit with a colour picker.

`--ui-text-dim` is `ash-500` (`#736B5B`, **4.89:1** on `chalk-50`) in light and `soot-400` (`#8C8374`, **5.0:1** on `soot-950`) in dark. Both clear 4.5:1 with a margin, and both read as clearly recessive next to `--ui-text`.

`opacity` remains correct for whole-element treatments where no text contrast requirement applies: the disabled button state, the skeleton pulse, and elements mid-transition.

---

## 4. Component library

Build order roughly follows this table; every component ships with its empty/loading/error variant where applicable.

| Component | Phase | Notes |
|---|---|---|
| `AppBottomNav` | 0 | 4 tabs, safe-area, rail at ≥lg |
| `AppHeader` | 0 | Title + optional back + up to 2 actions |
| `BaseButton` / `BaseInput` / `BaseSelect` / `BaseSheet` / `BaseChip` / `BaseToast` | 0 | Primitives |
| `EmptyState` | 0 | Stencil mark + headline + one action |
| `SkeletonRow` / `SkeletonCard` | 0 | Loading |
| `IngredientRow` | 1 | Recipe editor + pantry |
| `RecipeCard` | 1 | Grid cell |
| `WeekDayCard` / `MealSlotRow` | 2 | Planner |
| `RecipePickerSheet` | 2 | Search + recent |
| `ShoppingListGroup` / `ShoppingItemRow` | 3 | The product |
| `ProgressBar` (chalk rule) | 3 | Sticky header |
| `BarcodeScanner` / `ProductCard` / `NutritionPanel` | 4 | Scanning |

### 4.1 Primitives

**Built on Reka UI, styled entirely by this document.** Reka is headless and unstyled — it ships behaviour and ARIA, no appearance — so every token, dimension, and rule in §2 and §3 still applies verbatim. Nothing here is a component library's look leaking into the app.

The split is deliberate. What makes `BaseSheet` load-bearing is not visual: focus trap, `Esc`, body-scroll lock, focus restore, `aria-modal`, inert background, and correct behaviour when the iOS keyboard opens underneath it. That is a week to build and a fortnight to finish debugging in the §7 screen-reader pass, it is identical in every app that has ever had a bottom sheet, and getting it subtly wrong is invisible until someone tries to use the app with VoiceOver.

| Primitive | Reka base | Why |
|---|---|---|
| `BaseSheet` | `DialogRoot` + `DialogContent` | The whole list above, for free and correct |
| `BaseSelect` | `SelectRoot` | Keyboard nav, typeahead, and the listbox ARIA pattern |
| Disclosures (nutrition, staples section, aisle groups) | `CollapsibleRoot` | Correct `aria-expanded` wiring, animatable height |
| Sources / "why is this here?" | `PopoverRoot` | Positioning and dismissal |

`BaseButton`, `BaseInput`, `BaseChip`, `BaseToast`, and every app component below stay hand-built. They are a `<button>`, an `<input>`, and a `<span>` with tokens on them; a dependency would add indirection and remove nothing hard.

**Drag-to-dismiss is still ours.** Reka does not provide it; it wraps `DialogContent` with a pointer handler and the `sheet` motion token.


**BaseButton** — heights `44px` (`md`, default) and `52px` (`lg`, used for any primary action in a sticky bar). Radius `10px`. Label `body` 600.

| Variant | Light | Dark |
|---|---|---|
| `primary` | `beetroot-600` bg, `chalk-0` text | same |
| `secondary` | `chalk-0` bg, `chalk-200` border, `ink-900` text | `soot-900` bg, `soot-700` border |
| `quiet` | transparent, `ash-700` text | transparent, `soot-300` text |
| `danger` | `clay-600` bg, `chalk-0` text | same |

Press state is `scale(0.98)` + 6% darken over 120ms — no ripple. Loading state swaps the label for a 16px spinner and keeps the button's width (prevents layout jump). Disabled: 40% opacity, `cursor-not-allowed`, still focusable with `aria-disabled`.

**BaseInput** — `min-height 48px`, `font-size 16px` minimum (non-negotiable, iOS zoom), `chalk-100` fill, `chalk-200` border, `6px` radius. Label above in `u-label`. Error state: `clay-600` border + message below in `body-sm`/`clay-600`, tied by `aria-describedby`. Numeric inputs use `inputmode="decimal"` and tabular figures.

**BaseSheet** — bottom sheet over Reka `DialogRoot`, `20px` top radius, `chalk-0`, `shadow-sheet`, scrim `ink-900/40`. A 36×4px `chalk-300` grab handle centred at top. Max height `85dvh` with internal scroll and a sticky title row. Drag-to-dismiss below 25% (ours, §4.1). Focus trap, `Esc`, body-scroll lock, and focus restore come from Reka and are not reimplemented. This is the app's primary modal pattern — **there are no centred dialogs on mobile.**

**BaseChip** — `28px` pill, `chalk-100` fill, `body-sm`. Selected: `beetroot-50` fill, `beetroot-600` text and border. Used for recipe meta (time, servings), filters, and aisle tags.

**BaseToast** — bottom, above the nav bar, `ink-900` on light / `chalk-0` on dark, `10px` radius, 4s auto-dismiss, one optional action (always "Undo"). Never stacks more than one; a second toast replaces the first.

**EmptyState** — stencil mark (96px, `chalk-300`), `title-md` headline in Fraunces, one line of `body-sm` muted copy, one primary button. Copy is specific and instructive, never cute: "No recipes yet — add the one you cook most often" beats "Nothing here!".

### 4.2 Navigation

**AppBottomNav** — fixed, `chalk-0`, `shadow-bar`, `padding-bottom: env(safe-area-inset-bottom)`. Four items: **Week** (`calendar-days`), **Recipes** (`book-open`), **List** (`shopping-basket`), **Settings** (`settings`). Each is a 24px icon + 11px label, target `≥56×48px`. Active state: icon and label in `beetroot-600` plus a 3px `beetroot-600` rule across the top of the item — a chalk underline, not a pill background.

Two badges: **List** shows a small `bay-600` count dot of unchecked items when a list is active; it turns `turmeric-500` when the list is stale.

At `≥lg` the bar becomes a 240px left rail with the same items stacked, brand wordmark on top, and the content column centred in the remainder.

**AppHeader** — not a heavy app bar. A `56px` row: optional back chevron (`chevron-left`, 44px target), title in `title-lg` Fraunces, up to two icon actions right. Transparent over the page ground; on scroll past 8px it gains a `chalk-200` bottom hairline (no shadow, no blur).

---

## 5. Screens

Every route from SPEC §6, with layout anatomy and states.

### 5.1 Shell & layouts

- `layouts/default.vue` — `AppHeader` slot, scrolling content region with `padding-bottom: calc(64px + env(safe-area-inset-bottom))`, `AppBottomNav`. Content capped at `640px`, centred.
- `layouts/auth.vue` — no nav, full-bleed, centred content, used by login and onboarding.

### 5.2 `/login`

The one screen allowed a brand moment. `chalk-50` ground, off-centre composition (content sits at ~40% height, not dead centre). Wordmark in Fraunces `display` with `WONK 1`. One line of positioning copy in `body`/`ash-600`. A single `secondary` Google button (Google's brand guidelines require their mark on a white/neutral surface — this is why it is not the beetroot primary). Below: a `body-sm` line about Google-only sign-in. A single 1px `chalk-200` rule and a `label` footer.

Background carries a very low-contrast chalk texture: a repeating 1px dot grid at 3% `ash-600`, 24px pitch. Subtle enough to read as paper, not as a pattern.

States: signing-in (button loading), OAuth error (inline `clay-600` message above the button, retriable).

### 5.3 `/onboarding/index` and `/onboarding/join`

Two-card fork on `auth` layout, `title-lg` "Set up your household".

- **Create** card — household name input, `primary` "Create household". On success → invite screen showing the code in `num-lg` Fraunces, letterspaced, on a `chalk-100` block with a dashed `chalk-300` border (a torn-coupon feel), plus "Copy link" and "Share" (`navigator.share` where available) and a "Skip for now" quiet button.
- **Join** card — six-character code input (`text-transform: uppercase`, `autocomplete: one-time-code`, tabular, `2xl` size, generous letterspacing), `primary` "Join". `/onboarding/join?code=` pre-fills and auto-submits after a 400ms confirmation beat so the user sees what happened.

Errors are specific: invalid code, expired code, already in a household — each with its own message and next action.

### 5.4 `/` — This week at a glance

The home screen answers three questions in order: *what am I eating today, what's coming, do I need to shop?*

1. **Greeting row** — `label` date ("MONDAY 24 AUGUST"), `title-lg` "This week".
2. **Today card** — the hero. `chalk-0` surface, `chalk-200` border, with a 4px `beetroot-600` rule down the left edge. Three slot rows (breakfast/lunch/dinner) with the recipe name in `title-sm` and a 40px rounded thumbnail; empty slots show a dashed placeholder and "Add".
3. **Shopping status card** — three mutually exclusive forms:
   - No list: "No list for this week" + `primary` "Generate list".
   - Active list: a chalk progress rule with `num-lg` "12/27" and "Continue shopping".
   - Stale list: `turmeric-100` fill, `turmeric-500` left rule, "Plan changed since this list was made" + "Regenerate".
4. **Rest of week strip** — a horizontally scrolling row of 6 compact day chips (day initial + a count of filled slots as small dots). This is the *only* horizontal scroll in the app, and it's a summary, not an editing surface.
5. **Recently cooked** — 2-col recipe grid, max 4, seeding the "cook it again" loop.

Loading: skeletons in the exact card shapes. Empty (fresh household): a single `EmptyState` with the crate mark and "Add your first recipe".

### 5.5 `/plan/[week]` — Week planner

Vertical scroll of seven `WeekDayCard`s (SPEC §7). No grid.

**Sticky week header** (below `AppHeader`, `chalk-0`, hairline bottom): `‹` `W/C 25 Aug` `›` with the date in Fraunces `title-md`, and a `quiet` "Today" button that appears only when the current week is off-screen. Horizontal swipe on the card stack also changes week (`@vueuse` `useSwipe`), with a 180ms slide. Week changes are pushed to the router so back works.

**WeekDayCard** — `chalk-0`, `chalk-200` border, `10px` radius, `16px` padding.
- Header row: day name in Fraunces `title-md` + date in `body-sm`/`ash-600`, right-aligned meal count.
- Today: 4px `beetroot-600` left rule + `beetroot-50` header tint. Past days in the current week: text in `--ui-text-dim`, still editable. **Not opacity** (§3).
- Three `MealSlotRow`s separated by hairlines that inset 12px from the left (so the stencil slot labels align).

**MealSlotRow** — `min-height 56px`, grid of `[label 76px] [content 1fr] [action 44px]`.

A slot holds **one to three recipes** (SPEC §2), so the content cell is a short vertical stack, not a single line: the first recipe in `body` 500, each subsequent one below it in `body-sm` with a 1px `chalk-200` rule between. Two lines is the common case — "Thai green curry" over "Jasmine rice". The action cell gains an "Add another" affordance once a slot is filled, and the stack tops out at three before the row starts fighting the 56px rhythm.
- Label column: `u-label` BREAKFAST / LUNCH / DINNER.
- Filled: 36px thumbnail (`8px` radius, `chalk-100` fallback with the aisle-style stencil mark), recipe name `body` 500 truncated to one line, `body-sm` muted servings note when the multiplier ≠ 1 ("×2 portions").
- Empty: full-width dashed `chalk-300` button, `body-sm`/`ash-600`, `+ Add`.
- Interaction: tap → `RecipePickerSheet`. Swipe-left on a filled row reveals a `clay-600` clear action (56px); long-press opens a small action sheet (Clear / Swap / Open recipe). Both paths exist because swipe is undiscoverable and long-press is slow.
- Clearing shows an Undo toast.

**RecipePickerSheet** — sticky search input at the top (autofocused only on pointer-fine devices; on mobile it opens unfocused so the sheet isn't half-covered by the keyboard). Sections: **RECENT** (horizontal row of 3 thumbnails), **ALL RECIPES** (rows with 44px thumb, name, time chip). A pinned bottom row offers "Just a note…" for a text-only entry (`meal_plan_entries.note`) and "New recipe".

### 5.6 `/recipes/index`

- Sticky search field (`search` icon, clearable) plus a single row of filter chips: All / Quick (<30 min) / Recently added.
- 2-column grid, `12px` gap, of **RecipeCard**: 4:3 image with `14px` radius (`chalk-100` + stencil mark when absent), name in `title-sm` clamped to 2 lines, and one meta line of `body-sm`/`ash-600` — "35 min · serves 4".
- FAB is *not* used. Instead the header carries a `primary` "New" button, and the empty state carries the same action — a floating circle would collide with the bottom nav.
- Empty: crate mark, "No recipes yet", "Add your first recipe".
- No results: a distinct state — "Nothing matches 'tofu'" with a "Clear search" quiet button.

### 5.7 `/recipes/[id]`

1. **Hero** — 4:3 image, full-bleed to the screen gutter, `14px` radius. Absent → `chalk-100` block with stencil mark and a "Add photo" quiet button for the owner.
2. **Title block** — recipe name `title-lg` Fraunces, description `body`/`ash-600`, meta chips row (prep, cook, serves).
3. **Servings stepper** — `− 4 +`, tabular numeral, with a `body-sm` note "Quantities shown for 4". Changing it live-rescales every quantity below (client-side, non-destructive; it never writes to the recipe). This is the clearest possible demonstration of the app's scaling model, so it sits high on the page.
4. **INGREDIENTS** — `u-label` header with a hairline to the edge. Rows: name left, quantity right in `u-num`. Ingredients with a linked product get a tiny `barcode` icon in `ash-600`; tapping opens the `ProductCard` sheet. Staples show a `chalk-100` "staple" chip.
5. **METHOD** — numbered steps; the number set in Fraunces `title-md` in `beetroot-600`, hanging in a 32px gutter. Hidden entirely when there are no steps (SPEC allows zero-step recipes) — no "no steps" placeholder.
6. **NUTRITION** — `NutritionPanel` (§5.12).
7. **Sticky bottom action bar** — `chalk-0`, `shadow-bar`: `primary` "Add to plan" (opens a day/slot picker sheet) and a `quiet` overflow (`Edit`, `Delete`).

### 5.8 `/recipes/new` and `/recipes/[id]/edit`

A single-column form, **not a wizard** — the whole recipe is visible and scrollable, which matches how people copy a recipe off a page.

- Sections separated by `u-label` headers + hairlines: DETAILS, INGREDIENTS, METHOD.
- Image field: a 16:9 dashed `chalk-300` drop target with `camera` / `image` actions; after upload, a 4:3 preview with a replace/remove overlay.
- **IngredientRow (editor)** — `[name combobox 1fr] [qty 72px] [unit select 88px] [drag 32px]`. The name field is a combobox over existing household ingredients with a "Create 'Chestnut mushrooms'" option at the bottom; creating inline opens a compact sheet for aisle + count noun (`unit_label`, shown only when the unit is `unit` — "counted in: cloves") + staple/regular switches + optional barcode scan.

  **The create-ingredient sheet teaches generic naming**, since this is the one moment the user decides (SPEC §2). Name placeholder is `Chicken breast`, with a `body-sm`/`ash-600` hint beneath: "Generic, not a brand — you'll pick the actual packet in the shop." Below the staple and regular switches sits a collapsed **NUTRITION (OPTIONAL)** disclosure containing "Scan a barcode", "Enter values manually" (seven per-100 g fields, all optional), and — where the ingredient's `default_unit` makes them relevant — "Weight of one" (`grams_per_unit`, shown for `unit`) and "Density" (`density_g_per_ml`, shown for `ml`/`l`). Collapsed by default: nutrition is never a barrier to creating an ingredient. A trailing "+ Add ingredient" dashed row always sits at the bottom, beside a `quiet` **"Paste a list"** action.

  **Paste a list** opens a sheet with one textarea and the hint "One ingredient per line — paste from anywhere." On submit it parses each line into quantity / unit / name / note (SPEC §7) and shows an editable review list: matched ingredients in `body` with a `check` glyph, new ones with a "will be created" chip and an aisle select defaulting to a guess, and unparseable lines left as raw text in the name field with the quantity blank. Nothing is written until the user confirms.

  This is the screen that decides whether the recipe library ever gets populated. Twenty recipes entered row by row on a phone is the most likely place this app is abandoned (SPEC §10), and the review step is what makes a deliberately crude parser acceptable — a wrong parse is visible and one tap from fixed. Reorder via drag handle (`grip-vertical`), keyboard-accessible with ↑/↓ when focused.
- Method steps: auto-growing textareas, Enter at the end of a step creates the next one.
- Sticky bottom bar: `primary` Save + `quiet` Cancel. Unsaved-changes guard on navigation.
- Validation is inline and on blur, never a summary block at the top.

### 5.9 `/list/[id]` — Shopping list

**The most important screen. Design it for one thumb, in motion, at arm's length.**

**Sticky progress header** (`chalk-0`, `shadow-bar` on scroll):
- Left: `num-lg` Fraunces "12/27" with `body-sm`/`ash-600` "items".
- Right: presence — up to two 24px avatars of household members currently on the list channel, overlapped.
- Full-width **chalk progress rule**: a 6px track in `chalk-100` with a `bay-600` fill, `10px` radius, animated at `move`. Not a thin hairline — it should be readable in peripheral vision.
- Overflow menu: Regenerate, Mark complete, Share.

**Stale banner** — when `is_stale`, a `turmeric-100` strip with a `turmeric-500` left rule directly under the header: "Plan changed since this list was made" + a `secondary` "Regenerate". Sticky along with the header, because the user needs it whenever they notice something missing. Regenerating opens a confirm sheet that explicitly states what is preserved: "Ticked items and anything you added by hand are kept."

**ShoppingListGroup** — per aisle, in walk order:
- Sticky sub-header at the scroll top: aisle dot (8px) + `u-label` name + `u-num` count ("4"), on a `chalk-50` ground so it reads as a divider rather than a card. Stacks under the progress header, never over it.
- Collapsible; collapse state persists in `useLocalStorage` per list.
- Fully-checked groups auto-collapse with a `bay-600` check and "All 4 done".

**ShoppingItemRow** — `min-height 56px`, full-row hit area.
- `[checkbox 28px] [name + sources 1fr] [qty auto]`
- Checkbox: a 28px square, `2px chalk-300` border, `6px` radius. Checked → `bay-600` fill, `chalk-0` `check` icon, 120ms scale-in. It looks like a box ticked with a pen, not a toggle switch.
- Name: `body` 500. Below, when `sources` has entries, a `body-sm`/`ash-600` line: "Thai curry · Wed dinner" — truncated, tappable to open a small sources sheet answering "why is this here?".
- Quantity: right-aligned `u-num` `body` 500, e.g. `600 g`, `3 unit` rendered as "3".
- Checked state: `chalk-100` wash, name in `--ui-text-dim` with a strikethrough drawn over 180ms, then the row sinks to the bottom of its group. **Dimming is the token, not opacity** (§3) — a checked item is still something you read in a badly-lit aisle. Optimistic locally; a failed write reverts the row and raises a toast; offline, the tick queues and syncs (SPEC §7).
- Manual items carry a 10px `pencil-line` icon before the name.
- Swipe-left on a manual item deletes with undo. Recipe-derived items cannot be deleted (only ticked) — deleting them would desync from the plan; long-press instead offers "Mark as already have".

**Regular items** carry no quantity and a small `repeat` glyph before the name, with a sources line reading "On every list". When an ingredient is both a regular and required by the plan, it appears **once**, with the recipe quantity (SPEC §4).

**Quantity-changed badge** — after a regeneration increases the quantity of an item you had already ticked, the row keeps its tick and gains a `turmeric-100` chip reading "now 800 g — was 500 g". Tapping the chip acknowledges and clears it. This is the one case where a preserved tick would otherwise mislead (SPEC §4).

**Assumed you have** — a collapsed section at the very bottom, `chalk-100` fill, `u-label` header "ASSUMED YOU ALREADY HAVE (6)", listing staples greyed out with a per-item "Add to list" action. Collapsed by default, but never absent — this is the visible half of the pantry model.

**Add item row** — pinned above the bottom nav: a `chalk-0` bar with a `plus` icon and "Add an item". Tapping expands it into an inline input with an aisle select that defaults to a guess from the name; Enter submits and keeps focus for rapid entry.

**Completion** — when the last item is ticked, the progress rule fills, and a bottom sheet offers "All done — mark this list complete?" with `primary` Complete and `quiet` "Keep shopping". No confetti.

States: generating (skeleton groups + "Working out quantities…"), empty plan ("Nothing planned this week" + link to the planner), completed (read-only, everything dimmed, banner "Completed 24 Aug", "Start a new list").

### 5.10 `/list/index`

Simple: the active list pinned at the top as a full card with progress, then a `u-label` "PAST LISTS" section of rows — week dates in Fraunces, item count, completion date, all in `body-sm`. Tapping a past list opens it read-only.

### 5.11 `BarcodeScanner`

Full-screen, always dark regardless of theme, opened as a route-level overlay rather than a sheet (it needs the whole viewport).

- Live camera fills the screen; a scrim at `ink-900/55` covers everything outside a centred **viewfinder cutout** — a 280×180 rounded rect with four `turmeric-500` corner brackets (2.5px, 28px long). No animated laser line.
- Instruction in `body`/`chalk-50` above the cutout: "Point at the barcode".
- Bottom controls on a scrim: `Cancel` (quiet, left), torch toggle (centre, when `ImageCapture` supports it), and — always visible — **`Enter manually`** as a `secondary` button. The escape hatch is never hidden behind a failure (SPEC §5, §10).
- On detect: haptic (`navigator.vibrate(12)`), brackets flash `bay-300`, scanner freezes, and a `ProductCard` sheet rises with the result.
- States: requesting permission (dark screen + explanation + "Allow camera"), denied (explanation + "Enter manually" as primary, plus how to re-enable in settings), unsupported device (straight to manual entry, no error framing), lookup failed / not found (sheet with the barcode shown in tabular figures and a `primary` "Add details manually" that pre-fills the form).

**ProductCard** (sheet) — 64px product image, brand in `u-label`, name in `title-sm`, pack size chip, Nutri-Score badge (official A–E colours, used *only* here, at 28px, and labelled), a 4-figure nutrition strip per 100 g, and two actions: `primary` "Link to ingredient", `quiet` "Not right — search again".

The confirmation line above the actions states what linking does, because the sheet is full of brand and the ingredient is not: **"Adds nutrition to *Chicken breast*. Your ingredient name doesn't change."** The ingredient name is set in `title-sm`, the product name in `body-sm`/`ash-600` — the generic item is the subject of the sentence, the packet is the detail (SPEC §5).

### 5.12 `NutritionPanel`

Never presented as fact (SPEC §5).

- `u-label` header "NUTRITION — ESTIMATE", with a `turmeric-500` `info` icon.
- Coverage line first, before any numbers. Coverage is **weighted by mass, not by count** (SPEC §5): a 4px mini-rule filled to the weighted proportion in `turmeric-500`, with "Covers 82% of this recipe by weight — 6 of 9 ingredients" in `body-sm`. The percentage leads; the count is context. If weighted coverage is under 50%, the figures collapse behind a "Show estimate anyway" disclosure — low-coverage numbers are worse than none.
- Per-serving figures in a 4-column grid: kcal (`num-lg` Fraunces), fat, carbs, protein; a disclosure expands to saturates, sugars, fibre, salt. **Coarse by rule** — kcal to the nearest 10, macros to the nearest gram, salt to 0.1 g. Never two decimals; false precision on an estimate reads as a lie.
- A single `body-sm`/`ash-600` footnote under the grid: "Raw weights, before cooking." Once, not per figure.
- Uncovered ingredients listed by name under **"Not included"**, each tappable, each showing *why* it's missing in `body-sm`/`ash-600` — "no nutrition yet", "needs a weight per onion", "needs a density". The reason determines the action: tapping opens the barcode scanner, the manual-nutrition form, or the `grams_per_unit` / `density_g_per_ml` field respectively. **The panel turns the gap into a specific task, not a generic prompt to go scanning** — most of these ingredients have no barcode to scan (SPEC §5).

### 5.13 Settings

- `/settings/index` — grouped rows under `u-label` headers, hairline-separated, 48px each, `chevron-right` affordances. **ACCOUNT** (avatar, name, email, sign out). **APPEARANCE** (theme: System/Light/Dark as a 3-way segmented control). **HOUSEHOLD** (name, member count → household page). **FOOD** (pantry staples → pantry page). **ABOUT** (version, Open Food Facts attribution — required, `body-sm` with a link).
- `/settings/household.vue` — household name (inline editable), member list with avatars and "joined 12 Aug", the **portion multiplier stated in plain English** in a `chalk-100` block: "Recipes are scaled for 2 people." Then the invite block (code in Fraunces `num-lg` on the dashed coupon block, Copy / Share / Regenerate), and a `danger` "Leave household" at the bottom behind a typed confirmation.
- `/settings/pantry.vue` — **two sections under `u-label` headers, because the pantry model has two halves** (SPEC §2). Search field at the top filters both.
  - **STAPLES** — on = never on the list. Explainer: "Staples are assumed to be in your cupboard and are left off the shopping list. They still show in a collapsed section so nothing disappears silently." Two quick-add chips for common staples on first run.
  - **REGULARS** — on = always on the list. Explainer: "Regulars go on every list whether or not you've planned a meal that needs them — milk, bread, bin bags." 
  
  The pairing is what makes either comprehensible: one is *you already have it*, the other is *you always need it*, and seeing them together is the only way the distinction lands. An ingredient can be neither, but never both; the switches are mutually exclusive and the second one turning on turns the first one off with a `body-sm` note saying so.

---

## 6. Cross-cutting states

**Loading.** Skeletons, not spinners, for anything with a known shape: `chalk-100` blocks at the real dimensions with a 1.4s opacity pulse (0.6→1.0), never a moving gradient shimmer. Spinners only inside buttons and for the barcode lookup.

**Errors.** Three tiers:
1. *Inline* — field validation, in place, `clay-600`.
2. *Regional* — a section fails; that section shows a `chalk-100` block with a one-line cause and a "Try again" quiet button. The rest of the page stays usable.
3. *Global* — auth loss or hard failure; full-page state with a stencil mark, plain-English cause, and one action.

Messages name the thing that failed and what to do. Never "Something went wrong."

**Offline.** Online-first with one exception (SPEC §7). On `navigator.onLine === false`, a persistent `turmeric-100` strip pins under the header. Mutating controls go disabled with `aria-disabled` and keep their labels. On reconnect the strip turns `bay-100` for 2s, then leaves.

The copy differs by screen, because the behaviour does:

- **Anywhere else:** "You're offline — changes won't save."
- **On the shopping list:** "You're offline — ticks are saved and will sync." Checkboxes stay **enabled**; everything else on the screen (add item, regenerate, complete) disables as normal. This is the whole point of the tick queue, and a strip claiming nothing will save while the ticks quietly do would be worse than no strip at all.

**Realtime presence.** When a household member ticks an item you're looking at, the row animates its tick as if you'd done it, and a 20px avatar fades in on the right of the row for 3s. No toast — toasts for a partner's every tick would be unbearable in a supermarket.

---

## 7. Accessibility

Targets are not aspirational; they're acceptance criteria for the Phase 5 a11y pass.

- **Contrast:** all body text ≥ 4.5:1, all `u-label` and secondary text ≥ 4.5:1 (verified above for `ash-600` and `soot-300`), UI strokes ≥ 3:1. Aisle dots are decorative and always accompanied by the aisle name.
- **Targets:** ≥ 44×44px everywhere; 56px on shopping-list rows and slot rows.
- **Type:** 16px minimum on inputs. Layout must survive `Settings → Larger Text` up to 200% — all containers use `min-height`, never fixed `height`, and no single-line truncation on a primary label except recipe names in the picker.
- **Focus:** visible 2px `beetroot-600` ring with offset on every interactive element. Sheets trap focus and restore it on close.
- **Semantics:** checkboxes are real `<input type="checkbox">` with labels. Aisle groups are `<section>` with an `aria-labelledby` pointing at the stencil header. The progress header is `role="status"` `aria-live="polite"` announcing "12 of 27 items".
- **Motion:** `prefers-reduced-motion` collapses all transitions and disables the sink animation.
- **Colour independence:** checked state carries strikethrough + a dimmed text colour + the tick glyph, not just `bay-600`. Stale state carries an icon and text, not just turmeric.

---

## 8. PWA presentation

- Manifest: `name` "Household Meals", `short_name` "Meals", `display: standalone`, `theme_color` `#FAF6EF` (light) with `media`-matched `#14120F` for dark, `background_color` matching.
- Icons: a maskable mark — a stencilled bay leaf inside a rounded square in `beetroot-600` on `chalk-0`. Sizes 192/512 plus maskable 512 with 20% safe padding. Apple touch icon supplied separately (no maskable support).
- Splash: `background_color` ground with the wordmark in Fraunces.
- `viewport-fit=cover` plus safe-area padding on the nav and any sticky bar, or the bottom nav sits under the home indicator on iPhone.

---

## 9. Delivery order

Design work maps onto SPEC §8 phases:

| Phase | Design deliverable |
|---|---|
| 0 | `main.css` tokens, fonts wired, primitives (button/input/sheet/chip/toast), `AppBottomNav`, `AppHeader`, `EmptyState`, skeletons, login + onboarding screens |
| 1 | RecipeCard, recipe index/detail/editor, IngredientRow, image upload UI |
| 2 | WeekDayCard, MealSlotRow, RecipePickerSheet, week header + swipe, home screen |
| 3 | **Shopping list in full** — progress header, aisle groups, item rows, tick-and-sink, staples section, ad-hoc add, stale banner, presence |
| 4 | BarcodeScanner overlay, ProductCard, NutritionPanel, manual-entry fallback form |
| 5 | PWA icons/splash, all empty/error/offline states audited, a11y pass, reduced-motion pass, dark-mode sweep |

### Definition of visually done (any screen)

1. Renders correctly at 390px and 320px wide.
2. Light and dark both checked.
3. Empty, loading, and error states exist and are designed.
4. Every target ≥ 44px; every interactive element has a visible focus ring.
5. Survives 200% text size without clipping.
6. No shadow outside the two permitted tokens; no colour outside the token set.
