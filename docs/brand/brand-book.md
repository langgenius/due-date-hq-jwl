# DueDateHQ — Brand & Design System

The one place the brand identity (logo, color, type, voice) and the working
design system (tokens, primitives, surfaces) are described together. This is a
_reference_, not the source of truth — the source of truth is the code:

- Tokens → `packages/ui/src/styles/tokens/{primitives,semantic-light,semantic-dark}.css`
- Utility mapping → `packages/ui/src/styles/preset.css` (`@theme inline`)
- Product doctrine → `docs/Design/DueDateHQ-DESIGN.md` (canonical; §4.11 = enforceable primitive index)
- Live specimens → `/preview`

When code and this doc disagree, the code wins; fix this doc.

---

## 0 · Brand at a glance

DueDateHQ is a deadline/obligation **command center for CPA firms** — it monitors
regulatory sources, raises alerts on rule and date changes, and walks every client
obligation from _not started → filed → completed_.

**Mood:** precise · calm · dollar-aware · glass-box · keyboard-first.
**Lineage:** Ramp × Linear light workbench — _not_ Notion warmth, _not_ Stripe
gradient, _not_ Bloomberg neon.

### The two-layer color model (read this first)

The system deliberately runs **two palettes**. Conflating them is the most common mistake.

| Layer              | Where it lives                        | Anchor colors                                                                                      | Job                                    |
| ------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Brand identity** | Logo, favicon, auth chrome, marketing | Navy `#0A2540` · ivory `#F3EEE6` · signal cyan `#35D5FF` · serif                                   | Who we are. Fixed, never theme-shifts. |
| **Product UI**     | The working app (every route)         | Navy `#2E368C` accent (+ a brighter blue **highlight**) · gray neutrals · semantic severity/status | How the tool works. Themes light/dark. |

The brand ink navy `#0A2540` is **identity-only**. Inside the app the accent is two-tier:

- **Accent — calm default** (`--color-util-colors-primary-600` `#2E368C`, warm navy-indigo):
  buttons, links, selection. The everyday "you are here."
- **Highlight — louder** (`--color-brand-highlight` `#14C5F6`, a bright cyan-azure that ties
  back to the brand signal dot): for new/unseen markers, hints/nudges, and the one focused
  element. Out-shouts the navy; used sparingly, by exception. Live homes: every unread/unseen
  dot (notifications bell, alert rail, pulse rows, notifications page) and the `InfoBanner`
  hint strip (soft wash + cyan-ink lightbulb). Focus emphasis is applied deliberately
  per-screen — not a blanket focus-ring recolor (rings stay navy).

---

## 1 · Logo — the "stacked bars"

Supplied by Yuqi (2026-06-16), replacing the earlier "Radar D". Four rounded
horizontal bars, the third indented — an abstract timeline / schedule motif that
fits a deadlines product:

- **Four stacked bars** — rows on a timeline / agenda.
- **The indented third bar** — the break in the rhythm that gives the mark its tension.
- **App-icon form** — ivory bars (`--color-brand-ivory`) on a navy rounded square
  (`--color-brand-ink`). Navy + ivory only; no accent in the mark.
- **HQ** stays in the _wordmark_ as a quiet sans tag — the command center, not the mark.

### Wordmark

`DueDate` in the brand serif (`--font-serif`; New York on Apple, Georgia on
Windows) + `HQ` as a small, de-emphasized uppercase sans tag, + the divider + the
_for CPA firms_ tagline. Serif = trust; the sans tag signals software.

### Files

- `docs/brand/duedatehq-mark.svg` — mark, app-icon form (64×64)
- `docs/brand/duedatehq-lockup.svg` — full horizontal lockup
- `docs/brand/duedatehq-favicon.svg` — favicon, optically tuned for 16–32px
- In app: `components/primitives/brand-mark.tsx` (`BrandMark`), `public/favicon.svg`,
  `AuthBrandAnchor` in `features/auth/auth-chrome.tsx`

### Clearspace & minimum size

- **Clearspace** = the height of one bar on all sides; keep the lockup clear of it.
- **Minimum size**: mark 16px (favicon floor); full lockup 120px wide. Below the lockup
  minimum, use the mark alone.

### Do / Don't

- ✅ Mark sits on its own navy square; it can go on any surface.
- ✅ Preserve the supplied bar proportions + the indented third bar; scale uniformly.
- ❌ Don't recolor the mark to the product accent, or theme-shift it (navy + ivory only).
- ❌ Don't set the wordmark in the product sans, stretch it, or drop the `HQ` tag.
- ❌ Don't re-space, re-order, or straighten the bars — the indent is the mark.

---

## 2 · Color

### 2.1 Brand identity (theme-invariant) — `--color-brand-*`

| Token            | Hex       | Use                                         |
| ---------------- | --------- | ------------------------------------------- |
| `brand-ink`      | `#0A2540` | Logo square, wordmark, `<meta theme-color>` |
| `brand-ink-deep` | `#071A2E` | Pressed / high-contrast app icon            |
| `brand-ivory`    | `#F3EEE6` | Mark strokes reversed on navy               |
| `brand-signal`   | `#35D5FF` | The one live/monitoring accent (the dot)    |
| `brand-gold`     | `#B99B62` | Heritage secondary accent, sparing          |

### 2.2 Product UI — text & accent (semantic, light mode)

| Role                     | Token → value                                                                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text primary             | `text-primary` → gray-900 `#101828`                                                                                                                                                           |
| Text secondary           | `text-secondary` → gray-700 `#354052`                                                                                                                                                         |
| Text tertiary            | `text-tertiary` → gray-500 `#676F83`                                                                                                                                                          |
| Text muted               | `text-muted` → gray-400 `#98A2B2`                                                                                                                                                             |
| **Accent / primary CTA** | `util-colors-primary-600` `#2E368C` (warm navy-indigo; hover 700 `#222A6C`, solid 500 `#4350A3`)                                                                                              |
| Accent tint              | `state-accent-hover` `#EEF0FB` (50) · `-hover-alt` `#DADEF6` (100)                                                                                                                            |
| **Highlight**            | `--color-brand-highlight` `#14C5F6` (fills · dots · rings) · `-ink` `#066C98` (legible text/links on light) · `-soft` `#E3F6FD` (wash bg) — new/unseen · hints · focus emphasis, by exception |

**Highlight contrast rule:** `#14C5F6` is light — it **cannot** carry white text and is too
light for body text on white. On a `highlight` fill use **dark/navy text**; for highlight
_text or links_ use `highlight-ink`; for soft backgrounds use `highlight-soft`. Example: a
"New" pill = `bg-brand-highlight` + navy text, or `bg-brand-highlight-soft` + `text-brand-highlight-ink`.

### 2.3 Neutral ramp — `--color-util-colors-gray-*`

`25 #FCFCFD · 50 #F9FAFB · 100 #F2F4F7 · 200 #E9EBF0 · 300 #D0D5DC · 400 #98A2B2 ·
500 #676F83 · 600 #495464 · 700 #354052 · 800 #18222F · 900 #101828`

### 2.4 Semantics — color only for meaning

**"Color only for risk."** Gray is the default safe state — never green for baseline.

| Severity | Color                       |     | Status  | Color                    |
| -------- | --------------------------- | --- | ------- | ------------------------ |
| critical | red-600 `#D92D20`           |     | done    | green-600 `#079455`      |
| high     | orange-600 `#E04F16`        |     | draft   | gray-500 `#676F83`       |
| medium   | coral/warning-600 `#C83D2F` |     | waiting | blue-light-600 `#0086C9` |
| neutral  | gray-600 `#495464`          |     | review  | primary-600 `#155AEF`    |

Each ships a `-tint` (50) and `-border` (200/300) for soft fills. Full palettes
(red/green/yellow/orange/coral/blue/blue-light/indigo/violet/teal/pink/rose) exist
at 50–700 for charts and source badges.

### 2.5 Surfaces

White work surface (`background-default` `#FFFFFF`) **vs** warm-gray chrome
(`bg-canvas` / `background-canvas-warm` `#F6F5F3`, sidebar card `#F6F8FA`).
Content delineates with **hairline borders on white**, not gray fills.
Dividers: `subtle` 4% · `regular` 8% · `deep` 14% (black alpha).

---

## 3 · Typography

**Families:** `--font-sans` (Apple system / Segoe / Inter) for all UI · `--font-mono`
(Geist Mono) for every aligned numeral · `--font-serif` (New York / Georgia) for the
**logo wordmark only** — never body or UI copy.

### 3.1 Scale (real token values, px)

`micro 9 · 2xs 10 · badge/chip 11 · xs 12 · sm·description 13 · base·md 14 ·
lg 16 · xl 18 · surface-title 22 · stat-value 24 · 2xl 28 · section-title 32 ·
display-large 36 · display-hero 54 · hero 56`

The small end is a clean 1px ramp (11·12·13·14) — every name a distinct size; no
collisions. Body sizes carry snug ~1.33–1.39 paired line-heights.

### 3.2 Weight doctrine (400 / 500 / 600 only)

- **400** default body. **500** key data / row names / chips. **600** page + section
  titles, table column labels, row anchors.
- **Urgency = SIZE, not weight, and never color+bold together.** A red 16px/500
  signal beats bolding. Repeated anchors demote to 500.
- **Hierarchy needs two changes:** shift _both_ token and weight (`text-xl/600` title
  vs `text-sm/400` support) — same-size/different-weight reads flat.

### 3.3 Numerals & eyebrows

- **Numeric rule (数字铁律):** every vertically-aligned number (amounts, days, dates,
  EIN, IDs) uses `--font-mono` + `tabular-nums`.
- **Eyebrows:** UPPERCASE phrases use `tracking-eyebrow` 0.08em (`-tight` 0.06em for
  10–12px). Titles tighten with `tracking-title` -0.01em, display `-0.02em`.

---

## 4 · Space, radius, elevation

### 4.1 Spacing — 4px base

`space-1 4 · 2 8 · 3 12 · 4 16 · 5 24 · 6 32 · 8 48 · 12 80`.
In layout, prefer `gap-2 / 3 / 4 / 6`.

### 4.2 Radius (usage convention over the Tailwind default scale)

`4` compact chip/inline · `8` button · input · card · banner · dropdown ·
`12` modal · drawer · command palette · `999` pill · avatar · status dot ·
`0` inner section dividers. Never freelance values (no 6/10/14); never `rounded-3xl`;
never a per-side radius on a one-sided accent border.

### 4.3 Elevation — "1px line before shadow"

Cards default to **no outer shadow** — border + background contrast does the lift.

| Layer                      | Border          | Shadow           |
| -------------------------- | --------------- | ---------------- |
| Canvas / panel / card      | hairline (4–8%) | none             |
| Drawer / popover / tooltip | `divider-deep`  | `shadow-subtle`  |
| Modal / command            | `divider-deep`  | `shadow-overlay` |

Micro-shadows (blur ≤ 4) on small affordances only. Never blur ≥ 24 in product.

---

## 5 · Iconography & motion

- **Icons:** `lucide-react`, **outline only**, 1.5–2px stroke. Inline 16px, decorative
  ≤ 24px. No emoji in core UI.
- **Motion:** one tempo — `--default-transition-duration` 150ms, ease-out
  `cubic-bezier(0,0,0.2,1)` for hover/press/fade. Full-surface slides
  (sidebar/drawer) use `--ease-apple` `cubic-bezier(0.32,0.72,0,1)`. A global
  reduced-motion kill switch collapses all transitions to ~0.

---

## 6 · Voice & tone

Calm, precise, and dollar-aware. We state outcomes plainly; we don't hedge or hype.

- ✅ "Filed — 3 days ahead." · "$28,400 at risk · next 7 days." · "Source changed; review."
- ✅ Risk in **dollars first**, days second. AI output always carries an evidence
  `[source]` badge (glass-box).
- ❌ No alarmist all-caps walls, no exclamation pile-ups, no "Oops!" cutesiness.
- ❌ Status is **observed, not chosen** — never write copy that implies the user picks a
  state from a generic dropdown; surface the trigger that advanced it.

---

## 7 · Components — use the primitive

Every UI pattern has **ONE canonical primitive; never hand-roll.** The enforceable
index is `DESIGN.md §4.11`; live specimens render at `/preview`.

- **Foundational** (`packages/ui/components/ui`, 32): Button · TextLink · Input ·
  Textarea · Select · Combobox · Command · Checkbox · Switch · Slider · Segmented ·
  Tabs · Badge · Card · Alert · Dialog · AlertDialog · Sheet · Popover · Tooltip ·
  DropdownMenu · Table · Progress · Skeleton · Separator · Sidebar · Sonner (toast) …
- **Patterns** (`app/components/patterns`, 23): AppShell(+Nav, UserMenu) · PageHeader ·
  Breadcrumb · ListRail · StatBand · StatTile · FilterTrigger · TableHeaderFilter ·
  RowActionsMenu · FloatingActionBar · EmptyState · InfoBanner · StatusBanner ·
  DetailSectionCard · NeedsAttentionPanel · BulkConfirmDialog · KeyboardShell …
- **Primitives** (`app/components/primitives`, 16): BrandMark · CountPill · CountDotChip ·
  ToggleChip · StateBadge · StateSeals · SearchInput · DueDateLabel · RelativeTime ·
  IsoDatePicker · TaxCodeLabel · FieldLabel · ReadinessIndicator · LowConfidenceBadge ·
  AiProvenanceBadge · LocaleSwitcher.

### Button emphasis ladder

`primary` (blue fill) → `accent` (blue tint + blue border) → `secondary` (white +
hairline) → `tertiary` (gray-100 + hairline) → `ghost` (hover-only) → `link`; plus
`destructive-*` mirrors. One primary per view.

### Badge / status ladder

Tone (success / warning / info / destructive / secondary / outline) is the
non-negotiable semantic; shape (filled chip / outline chip / icon dot) derives from
category. **Filled chips never add a dot** (the dot is for outline only).

---

## 8 · Refused patterns

Stripe purple gradients · Bloomberg neon · Notion round warmth · green "OK" baseline ·
abstract decoration · large drop shadows · radius > 8px on buttons · serif in product
copy · emoji in core UI · unsourced AI output · red severity tint on a Filed row ·
brand navy used as a product accent · de-noising by deletion (always demote, keep the
decision info).
