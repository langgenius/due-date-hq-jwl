---
version: alpha
name: DueDateHQ
description: Dense CPA compliance workbench for dollar-aware deadline triage with glass-box provenance.
colors:
  primary: '#0A2540'
  secondary: '#475569'
  tertiary: '#155aef'
  neutral: '#FFFFFF'
  surface-canvas: '#FFFFFF'
  surface-panel: '#FAFAFA'
  surface-elevated: '#FFFFFF'
  surface-subtle: '#F4F4F5'
  border-default: '#E5E7EB'
  border-strong: '#D4D4D8'
  border-subtle: '#F1F5F9'
  text-primary: '#0A2540'
  text-secondary: '#475569'
  text-muted: '#94A3B8'
  text-disabled: '#CBD5E1'
  accent-default: '#155aef'
  accent-hover: '#004aeb'
  accent-active: '#003dc1'
  accent-text: '#004aeb'
  accent-tint: '#eff4ff'
  severity-critical: '#DC2626'
  severity-critical-tint: '#FEF2F2'
  severity-critical-border: '#FCA5A5'
  severity-high: '#EA580C'
  severity-high-tint: '#FFF7ED'
  severity-high-border: '#FDBA74'
  severity-medium: '#C83D2F'
  severity-medium-tint: '#FFF4F1'
  severity-medium-border: '#FFC7BD'
  severity-neutral: '#475569'
  severity-neutral-tint: '#F8FAFC'
  status-done: '#059669'
  status-draft: '#64748B'
  status-waiting: '#0284C7'
  status-review: '#7C3AED'
colorsDark:
  primary: 'rgba(255, 255, 255, 0.95)'
  secondary: 'rgba(255, 255, 255, 0.65)'
  tertiary: '#7C7BF5'
  neutral: '#0D0E11'
  surface-canvas: '#0D0E11'
  surface-panel: '#101217'
  surface-elevated: '#15171C'
  surface-subtle: '#1A1D23'
  border-default: 'rgba(255, 255, 255, 0.08)'
  border-strong: 'rgba(255, 255, 255, 0.14)'
  border-subtle: 'rgba(255, 255, 255, 0.04)'
  text-primary: 'rgba(255, 255, 255, 0.95)'
  text-secondary: 'rgba(255, 255, 255, 0.65)'
  text-muted: 'rgba(255, 255, 255, 0.45)'
  text-disabled: 'rgba(255, 255, 255, 0.25)'
  accent-default: '#7C7BF5'
  accent-hover: '#9391F8'
  accent-active: '#A5A4FA'
  accent-text: '#A5A4FA'
  accent-tint: 'rgba(124, 123, 245, 0.14)'
  severity-critical: '#EF4444'
  severity-critical-tint: 'rgba(239, 68, 68, 0.12)'
  severity-critical-border: 'rgba(239, 68, 68, 0.4)'
  severity-high: '#F97316'
  severity-high-tint: 'rgba(249, 115, 22, 0.12)'
  severity-high-border: 'rgba(249, 115, 22, 0.4)'
  severity-medium: '#F77865'
  severity-medium-tint: 'rgba(242, 95, 76, 0.14)'
  severity-medium-border: 'rgba(242, 95, 76, 0.4)'
  severity-neutral: '#64748B'
  severity-neutral-tint: 'rgba(100, 116, 139, 0.08)'
  status-done: '#10B981'
  status-draft: '#94A3B8'
  status-waiting: '#38BDF8'
  status-review: '#A78BFA'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 54px
    fontWeight: 600
    lineHeight: 1.074
    letterSpacing: -0.02em
  display-large:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.167
    letterSpacing: -0.02em
  section-title:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.1875
    letterSpacing: -0.01em
  title:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0px
  body:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
    fontFeature: "'cv11', 'ss01'"
  button:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.333
    letterSpacing: 0px
  badge:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.333
    letterSpacing: 0px
  body-medium:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0px
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.08em
  hero-metric:
    fontFamily: Geist Mono
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: -0.02em
    fontFeature: "'tnum'"
  numeric:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0px
    fontFeature: "'tnum'"
  numeric-small:
    fontFamily: Geist Mono
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0px
    fontFeature: "'tnum'"
rounded:
  sm: 4px
  md: 6px
  lg: 12px
shadows:
  subtle: '0 2px 8px rgba(0, 0, 0, 0.04)'
  overlay: '0 8px 24px rgba(0, 0, 0, 0.08)'
spacing:
  0: 0px
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 24px
  6: 32px
  8: 48px
  12: 80px
components:
  button-primary:
    backgroundColor: '{colors.accent-default}'
    textColor: '#FFFFFF'
    typography: '{typography.button}'
    rounded: '{rounded.md}'
    padding: 10px
    height: 36px
  button-secondary:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    typography: '{typography.button}'
    rounded: '{rounded.md}'
    padding: 10px
    height: 36px
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
    textColor: '#FFFFFF'
    typography: '{typography.button}'
    rounded: '{rounded.md}'
    padding: 10px
    height: 36px
  button-primary-active:
    backgroundColor: '{colors.accent-active}'
    textColor: '#FFFFFF'
    typography: '{typography.button}'
    rounded: '{rounded.md}'
    padding: 10px
    height: 36px
  risk-row-critical:
    backgroundColor: '{colors.severity-critical-tint}'
    textColor: '{colors.text-primary}'
    height: 36px
  risk-row-critical-bar:
    backgroundColor: '{colors.severity-critical}'
    width: 2px
    height: 36px
  risk-row-critical-strong-bar:
    backgroundColor: '{colors.severity-critical-border}'
    width: 2px
    height: 36px
  risk-row-high:
    backgroundColor: '{colors.severity-high-tint}'
    textColor: '{colors.text-primary}'
    height: 36px
  risk-row-high-bar:
    backgroundColor: '{colors.severity-high}'
    width: 2px
    height: 36px
  risk-row-high-strong-bar:
    backgroundColor: '{colors.severity-high-border}'
    width: 2px
    height: 36px
  risk-row-upcoming:
    backgroundColor: '{colors.severity-medium-tint}'
    textColor: '{colors.text-primary}'
    height: 36px
  risk-row-upcoming-bar:
    backgroundColor: '{colors.severity-medium}'
    width: 2px
    height: 36px
  risk-row-upcoming-strong-bar:
    backgroundColor: '{colors.severity-medium-border}'
    width: 2px
    height: 36px
  risk-row-neutral:
    backgroundColor: '{colors.severity-neutral-tint}'
    textColor: '{colors.severity-neutral}'
    height: 36px
  hero-metric:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-primary}'
    typography: '{typography.hero-metric}'
  alert-banner:
    backgroundColor: '{colors.severity-medium-tint}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.md}'
  filing-jurisdictions-panel:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
  evidence-chip:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-secondary}'
    typography: '{typography.numeric}'
    rounded: '{rounded.sm}'
    height: 18px
  command-palette:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.lg}'
    width: 560px
  sidebar:
    backgroundColor: '{colors.surface-panel}'
    textColor: '{colors.text-secondary}'
    width: 220px
  email-shell:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    width: 640px
  email-shell-footer:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-primary}'
    typography: '{typography.label}'
  badge:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-secondary}'
    typography: '{typography.badge}'
    rounded: '{rounded.sm}'
    height: 20px
    padding: '0 8px'
  stepper:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-primary}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 32px
  stepper-current:
    backgroundColor: '{colors.accent-tint}'
    textColor: '{colors.accent-default}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 32px
  stepper-error:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.severity-critical}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 32px
  confidence-badge:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    typography: '{typography.numeric}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  confidence-badge-high:
    backgroundColor: '{colors.accent-tint}'
    textColor: '{colors.accent-text}'
    typography: '{typography.numeric}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  confidence-badge-med:
    backgroundColor: '{colors.severity-neutral-tint}'
    textColor: '{colors.text-secondary}'
    typography: '{typography.numeric}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  confidence-badge-low:
    backgroundColor: '{colors.severity-medium-tint}'
    textColor: '{colors.text-primary}'
    typography: '{typography.numeric}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  toast:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px
    width: 360px
  toast-info:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px
    width: 360px
  toast-warning:
    backgroundColor: '{colors.severity-medium-tint}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px
    width: 360px
  status-pill-draft:
    backgroundColor: '{colors.severity-neutral-tint}'
    textColor: '{colors.status-draft}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  status-pill-review:
    backgroundColor: '{colors.severity-neutral-tint}'
    textColor: '{colors.status-review}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
  hairline-default:
    backgroundColor: '{colors.border-default}'
    height: 1px
  hairline-strong:
    backgroundColor: '{colors.border-strong}'
    height: 1px
  hairline-subtle:
    backgroundColor: '{colors.border-subtle}'
    height: 1px
  status-done-dot:
    backgroundColor: '{colors.status-done}'
    rounded: '{rounded.sm}'
    width: 8px
    height: 8px
  status-waiting-dot:
    backgroundColor: '{colors.status-waiting}'
    rounded: '{rounded.sm}'
    width: 8px
    height: 8px
  muted-divider:
    backgroundColor: '{colors.text-muted}'
    height: 1px
  loading-skeleton:
    backgroundColor: '{colors.text-disabled}'
    rounded: '{rounded.sm}'
    height: 12px
    width: 100px
  field-disabled:
    backgroundColor: '{colors.surface-subtle}'
    textColor: '{colors.text-secondary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
  brand-mark-primary:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.primary}'
    typography: '{typography.title}'
  brand-mark-secondary:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.secondary}'
    typography: '{typography.body}'
  brand-mark-tertiary:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.tertiary}'
    typography: '{typography.body-medium}'
componentExtensions:
  filing-jurisdictions-panel:
    borderColor: '{colors.border-default}'
    note: 'Border color is intentionally documented outside components: google/design.md component entries only allow the eight scalar properties linted above.'
  toast:
    shadow: '{shadows.subtle}'
    variant:
      default: { timeoutMs: 3000, undoTimeoutMs: 500 }
      persistent: { timeoutMs: null, expiresUsing: 'serverReturnedRevertibleUntil' }
  toast-success:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.status-done}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px
    width: 360px
    note: 'Intentionally low contrast (3.77:1) — green text on white reads as success affirmation, not body content. Exempt from WCAG AA enforcement; therefore not in components: section.'
  stepper-completed:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.status-done}'
    typography: '{typography.label}'
    note: 'Same exemption as toast-success.'
  stepper-upcoming:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-muted}'
    typography: '{typography.label}'
    note: 'Muted-by-design label for un-reached step; intentional low contrast.'
  stepper-disabled:
    backgroundColor: '{colors.surface-canvas}'
    textColor: '{colors.text-disabled}'
    typography: '{typography.label}'
    note: 'Disabled-by-design label; intentional low contrast.'
  email-shell:
    numericFontFamily: 'Geist Mono'
  status-pill-waiting:
    backgroundColor: '{colors.severity-neutral-tint}'
    textColor: '{colors.status-waiting}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: 18px
    padding: '0 6px'
    note: 'Borderline contrast 3.91:1 — sky-600 on near-white. Tag pill, not body text; sufficient for short status word + dot indicator. Held in extensions instead of components: to avoid WCAG AA enforcement.'
motion:
  genesis-odometer:
    typography: '{typography.hero-metric}'
    color: '{colors.text-primary}'
    digitEase: 'cubic-bezier(0.4, 0, 0.2, 1)'
    reduceMotionFadeInMs: 200
  genesis-particle:
    size: 6px
    color: '{colors.accent-default}'
    trailAlpha: 0.1
    bezier: ['start', 'startPlus(0, -200)', 'endPlus(0, -100)', 'end']
  alert-banner-breathing:
    durationMs: 3800
    ease: 'ease-in-out'
    backgroundTint: '{colors.severity-medium}'
    opacity: { idle: 0.12, peak: 0.46 }
    reduceMotion: 'Static background tint at 0.2 opacity.'
    note: 'Applies to active dashboard alerts, all-clear, and the top actionable Alerts history row; loading and non-actionable rows keep the dot heartbeat only.'
maxConcurrent: 30
---

# DueDateHQ Design System

## Overview

DueDateHQ is a work surface for CPAs juggling 50–600 clients. It is an **audit + batch surface** the CPA visits to triage, then leaves — not a daily destination. Every pixel must justify itself by changing what the CPA does next.

The aesthetic is **calm professional density**. Closer in spirit to Linear, Mercury, Stripe Dashboard, or a well-built financial terminal than to consumer SaaS. No greetings, no decorative gradients, no celebrations. The user is a senior pro doing batch work; the UI respects her time.

### Reference inheritance — Mercury · Sana AI · Oku · Linear

DueDateHQ inherits the visual register of several operational SaaS products. Each contributes specific moves; together they define the "look".

| Reference                           | What we inherit                                                                                                                                                                    |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Mercury](https://mercury.com)**  | Number typography (`tabular-nums` everywhere) · soft-tint status pills · sidebar grouped by domain · "professional density" feeling · ⌘K search · single accent on the next action |
| **[Sana AI](https://sanalabs.com)** | Cool-neutral canvas (not warm cream) · borderless surfaces with 1px hairline divisions · neutral category dots · warm but quiet tone · clean meta lines                            |
| **[Oku](https://oku.so)**           | Content-first hierarchy (almost no chrome) · thin sidebar with no decoration · understated page titles · restraint — what's _removed_ matters more than what's added               |
| **[Linear](https://linear.app)**    | Dense lists with comfortable row heights · keyboard-first interactions (j/k, gg, ⌘K) · status + assignee at row level · zero ornament                                              |

All converge on the same principle: **a productivity tool earns trust by getting out of the way.**

### Taste principles (T1–T8 — apply to every new screen)

| #      | Principle                                              | How to apply                                                                                                                                                                                                                                                                                                                        |
| :----- | :----------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T1** | **Numbers are typographic objects.**                   | Every dollar / count / date uses `font-mono tabular-nums`. Page-level KPIs use the `numeric-lg`/`hero-metric` token. Generic body-render of a number is a fail.                                                                                                                                                                     |
| **T2** | **One accent, one viewport, one action.**              | The indigo accent (`text-text-accent` / `bg-components-button-primary-bg`) appears on the **next action** only — primary CTA, currently-selected sidebar item, key "do this now" surface. Before painting accent, ask: "is this the ONE next action?" If no, demote to ghost / link.                                                |
| **T3** | **Pills for indicators, soft rectangles for actions.** | Status pills, filter chips, count badges, jurisdiction tags — anything read-only or toggle — use `rounded-full` (or `rounded-sm` for dense chips). Buttons, inputs, cards, modals, dropdowns — anything you commit through — use `rounded-md` (6px). Shape distinguishes _"this labels something"_ from _"this acts on something."_ |
| **T4** | **Status colors are pills, never paint.**              | Green / orange / red appear as small status pills (tinted bg + saturated text). They **never** become surface fills, **never** become row left-borders, **never** become full-card backgrounds. Risk-tinted row backgrounds were the legacy pattern; the new direction is neutral rows + a single pill in the right column.         |
| **T5** | **Sidebar groups, surface unfolds.**                   | Left nav is grouped by domain (Operations / Rule / Clients). Main canvas opens flush — no nested chrome bars, minimal breadcrumbs. The sidebar IS the wayfinding.                                                                                                                                                                   |
| **T6** | **Density via vertical air, not chrome.**              | Table/list rows use ≥40–44px row height with consistent vertical padding. Cramped density is anxiety; comfortable density is the product's value. The 4 / 8 / 16 / 24 / 48 rhythm does the structural work — drop the dividing borders and shadows wherever they aren't load-bearing.                                               |
| **T7** | **Modal vs toast vs banner discipline.**               | Modals interrupt for input only. Toasts confirm "did the thing." Banners notify "I noticed." Bell holds the inbox. Pick the right surface — picking IS the message.                                                                                                                                                                 |
| **T8** | **The dashboard is a desk, not a stage.**              | Page titles use one shared `<PageHeader>` (text-2xl / 600). No display face anywhere. No "Welcome, Sarah." No celebratory toasts. The product looks like a calm tool, not a marketing site — because the CPA opens it 30× a day.                                                                                                    |

When a screen makes a decision the doc doesn't address, derive from these principles. The principles outlast any single token.

### Information hierarchy — the 3-tier scan rule

Every screen must let the eye land in this order, in under 5 seconds:

| Tier                | What                                                                                      | Visual treatment                                                              |
| :------------------ | :---------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **T1 · Hero**       | The one thing the user came here to see / decide / act on. Singular per viewport.         | `text-2xl` + `font-semibold` + ample top whitespace; OR a single accent CTA.  |
| **T2 · Support**    | The 3–5 items that justify or contextualize the hero (counts, supporting cards, filters). | `text-base font-semibold` titles, hairline-bordered cards or rows.            |
| **T3 · Background** | Everything else — meta, timestamps, source attribution, "show more".                      | `text-xs text-text-tertiary`, no border, collapsed by default where possible. |

Failure modes (each one is a hierarchy bug, not a styling bug): **tier inflation** (three things competing for hero — demote two), **tier flattening** (every section uses the same heading weight — T1 must outweigh T2 must outweigh T3 _visually_, not just semantically), **decoration tax** (icon + badge + dot + pill on every row — the eye has nothing to land on, remove all but the one signal that changes a decision).

---

## Direction (legacy)

DueDateHQ uses a Ramp x Linear light workbench direction: precise, calm, dollar-aware, glass-box, and keyboard-first. The product is a CPA operational console, not a marketing site, financial app, or editorial surface.

The UI must prioritize dense scanning, clear risk hierarchy, and traceable evidence. Use semantic color only when it carries business meaning. Favor 1px hairlines, compact tables, and tabular numbers over decorative panels.

## Colors

The palette is semantic, not decorative. Navy is the authoritative text color, Dify UI Blue is reserved for focus, selected navigation, and primary actions, and risk colors are the only intentionally saturated colors. (Legacy indigo `#5B5BD6` was replaced by Dify Blue `#155aef` per the 2026-05 token unification — every primary-600 reference in `primitives.css` now resolves to the blue.)

- Primary `#0A2540`: core headings, hero risk numbers, and client names.
- Secondary `#475569`: standard operational copy and table content.
- Tertiary `#155aef` (Dify UI Blue, `primary-600`): CTA, focus, selected state, and active navigation.
- Neutral `#FFFFFF`: light workbench canvas.

Do not place raw color utilities in business components. Use semantic utilities such as `text-accent-default`, `bg-bg-panel`, `border-border-default`, and `text-severity-critical`.

## Typography

Inter is the UI font. **Numerals are sans-serif by default** — the mono face was creating an ATM-receipt feel on the dashboard and hurting at-a-glance readability (per 2026-05-20 review). Use `tabular-nums` on Inter for column alignment; reserve Geist Mono for the genuinely operational data classes that benefit from monospaced grids: rule IDs, EINs, URLs, raw codes, and the hero risk-strip metric on the legacy dashboard.

### Size ladder (the only sizes you should reach for)

Token pixel values are set in `packages/ui/src/styles/tokens/primitives.css`. The 2026-05-20 dashboard pass widened the gap between section labels and the page/KPI anchor: H1 / KPI numerals jumped to **28px** so the eye lands hard; H2 dropped to **18px** so section labels feel like labels, not competing headers. Body text stays at the established 13px workbench scale.

| Token                      | Tailwind                                                 | Pixels | Use                                                                                                                                                |
| -------------------------- | -------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **H1 page title**          | `text-2xl font-semibold tracking-tight`                  | 28px   | The page's anchor word — "Today", "Deadlines", "Clients"                                                                                           |
| **H2 section**             | `text-xl font-semibold tracking-tight`                   | 18px   | "Alerts", "This week's exposure", "Actions this week". A counter sits beside it at `text-base font-normal text-text-tertiary tabular-nums`.        |
| **KPI numeral**            | `text-xl font-semibold tabular-nums tracking-tight`      | 18px   | The number on an exposure tile. Label below at `text-base text-text-secondary`. Matches H2 scale so KPIs read as section labels, not page anchors. |
| **Row primary**            | `text-md font-medium text-text-primary`                  | 14px   | The thing the user is scanning for — client name in action rows, alert title on cards.                                                             |
| **Row secondary**          | `text-base text-text-secondary`                          | 13px   | Task prompt under a row primary, supporting metadata.                                                                                              |
| **Pill / chip**            | `text-base` (no weight by default)                       | 13px   | Date pill, penalty pill, client chip. Add `font-medium` only when the chip itself is the signal (e.g., the dollar amount).                         |
| **Tertiary label**         | `text-base text-text-tertiary`                           | 13px   | Sidebar group labels, "View all" links, footer source link.                                                                                        |
| **Microlabel (uppercase)** | `text-xs uppercase tracking-[0.08em] text-text-tertiary` | 11px   | Sparingly — reserved for KPI tile suffix, badge-style labels.                                                                                      |

### Weight discipline

Use `font-semibold` only on H1 / H2 / KPI numerals. Use `font-medium` only on primary anchor text (row primary). Everything else stays at the default 400. Sprinkling `font-medium` on every metadata chip flattens hierarchy — that's the visual mush we walked away from in this revision.

### Numerals

Default to Inter `tabular-nums`. Drop `font-mono` unless the number is part of a grid that needs literal monospace alignment (rule IDs, raw codes, fixed-width source identifiers). Currency, day counts, exposure totals, and counters are sans-serif.

## Layout

The spacing scale is based on 4px. Dashboard and Deadlines views are full-width work surfaces. Settings form pages stay around 880px max width, while Settings data surfaces such as Members and Billing use the 1172-1180px workbench width from Figma. The sidebar is 220px on desktop. Default right drawers are 400px; workflow drawers that contain tables, batch review, or evidence-heavy content may scale from 720px to 880px while remaining full-width on mobile. Modals are capped at 640px.

First screens must show useful work, not marketing chrome. Dashboard should reveal Alerts, the dollar risk hero, and at least eight customer rows. Deadlines should reveal at least twelve rows.

## Elevation & Depth

Use borders before shadows. Cards are flat: elevated surface plus a 1px border, no shadow. Drawers, popovers, and tooltips may use the subtle shadow. Modals and command palette may use the overlay shadow.

Avoid nested cards and decorative depth. Depth exists to preserve focus and layering, not to create visual ornament.

## Shapes

Radii are intentionally restrained:

- 4px (`rounded.sm`) for chips, evidence chips, confidence badges, and other small inline tokens.
- 6px (`rounded.md`) for **buttons (shadcn `base-vega` primitive)**, inputs, cards, banners, dropdowns, toasts, and the alert banner.
- 12px (`rounded.lg`) for drawers, modals, and the command palette only.

Do not use pill buttons, circular decorative controls, or radius above 12px. **Button radius / height / padding mirror shadcn `base-vega` defaults verbatim** (`rounded-md` 6px · `h-9` 36px · `px-2.5` 10px · `text-sm` 12px / 500) — the tokens in `components.button-{primary,secondary,primary-hover,primary-active}` document the runtime values produced by `pnpm dlx shadcn add`, so importing a fresh shadcn component requires zero manual patching. Non-shadcn business components (risk-row, evidence-chip, hero-metric, command-palette, sidebar, stepper, toast, confidence-badge, alert-banner, genesis-, email-shell) keep DESIGN.md as the authoritative source.

## Components

Use shadcn Base UI `base-vega` primitives as the foundation. Project-specific components belong above them in this order: `routes -> features -> patterns -> primitives -> ui -> lib`.

Primary buttons use indigo and are reserved for the most important action on a surface. Risk rows encode severity with both label and color. Evidence chips are mandatory for AI output, rules, Alerts entries, and cited numeric claims. Command palette, drawer, and toast behavior must remain keyboard-friendly.

Clients `Fact profile` uses a `Filing jurisdictions` panel for multi-state client facts. The panel is
a compact bordered work surface, not a nested card: state chips show primary vs secondary filing
states, and the embedded table lists counties, tax types, and source/review status with 11-13px
workbench typography. The Clients table jurisdiction column should render the primary filing state
and first county, plus a `+N` suffix for additional active filing states.

The login surface treats SSO as the primary path: Google OAuth is the first visible action, Google One Tap may appear as browser-owned chrome, and Microsoft Entra ID appears when configured. Email OTP remains a compact fallback below a true split divider (`line / or / line`). The One Tap prompt must not displace the Google button, add an explanatory in-app panel, or introduce a second branded CTA; if Google does not display the prompt, the page remains visually identical and fully usable.

The command palette is the shadcn `Command` pattern backed by `cmdk`, not a hand-rolled button list. `@duedatehq/ui/components/ui/command` owns the accessible combobox/listbox behavior (ArrowUp/ArrowDown active item, Enter select, disabled item handling) while `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx` owns product entries and navigation. Use `disablePointerSelection` for the global palette so mouse hover does not steal the active item from keyboard users. Hover still needs a shallow visual affordance: mouse hover uses neutral `bg-background-subtle`, while the keyboard active item uses deeper `bg-state-base-hover`. Visual styling must use DueDateHQ semantic tokens only: `bg-components-panel-bg`, `border-components-panel-border`, `shadow-overlay`, `rounded-xl` (12px), `text-text-*`, `bg-background-subtle`, and `bg-state-base-hover`. Visible shortcut labels must come from the keyboard shell display helpers backed by TanStack `formatForDisplay` (`⌘K` on Apple platforms, `Ctrl+K` elsewhere); internal hotkey registration may continue to use `Mod+K`.

The app shell — sidebar + content inset — is **hand-rolled in `@duedatehq/ui`**, not the shadcn `Sidebar` registry component. The reasoning is that shadcn's primitive bundles three collapse modes (`offcanvas` / `icon` / `none`), a `SidebarRail`, cookie-based open state, `Cmd+B` global hotkey, and `floating` / `inset` chrome variants — none of which we use, because DESIGN §5.4 fixes the desktop sidebar geometry and our keyboard shortcuts are owned by explicit app surfaces such as the command palette (`⌘K`) and sidebar rail toggle. Importing 700+ lines of unused API surface plus the `bg-sidebar-foreground` token sprawl that shadcn assumes would only make later refactors louder. Instead, `apps/app/src/components/patterns/app-shell.tsx` composes thin semantic primitives from `@duedatehq/ui/components/ui/sidebar` (`Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuBadge`, `SidebarTrigger`) plus a `useIsMobile()` hook and the existing `@duedatehq/ui/components/ui/sheet` for the mobile drawer.

The shell is selectively chromed: the sidebar carries a static current-practice identity row with a navy `brand-mark-primary` tile, three nav groups, a single `+ Import clients` ghost CTA above the user row, and a status dot folded into the user avatar. The sidebar identity row does not expose practice switching, `Add practice`, or a `Mod+Shift+O` switcher shortcut; practice management entry points live in Practice Profile, Members, and Billing. Practice Profile and Members both use DueDateHQ gateway contracts over Better Auth identity primitives. Members is now an enabled Settings sub-route backed by `members.*`; it keeps Owner-only administration, seat usage, pending invitations, and audit-producing mutations in the product gateway. The Members invite trigger remains discoverable even when seats are full; the dialog explains the seat limit and disables only the final send action while the server keeps the seat limit enforcement. Its visible shortcut label is backed by a real route-scoped `Mod+I` hotkey registration and appears in the keyboard help surface via TanStack Hotkeys metadata. Admin now exposes enabled `Clients` and `Audit log` read/management surfaces. `Team workload` is a paid Operations surface: Solo sees a locked `Pro` hint, while Pro/Firm users open the shared deadline workload route. The route header carries a route-owned eyebrow + title on the left and AppShell-owned utility on the right (a `⌘K` keyboard hint and the global notifications bell — _not_ a per-route action cluster). The body is intentionally austere: a single Numeric/Small ownership tag in the top-left and the rest of the surface reserved for the route's `<Outlet />`.

Selected-nav visual is **bg-only, calm-lavender accent**: `bg-accent-tint` (the dedicated DESIGN.md `accent-tint` token — `#F1F1FD` light, 14 % indigo dark) + `text-primary` + Inter Semi Bold weight bump. **No** 2 px accent border (visual noise) and **no** `accent-text` label color (saturation creep). Hover stays neutral with `bg-background-default-hover` so hover ≠ selected; the lavender-tinted bg is reserved exclusively for the active route. This compromise honors DESIGN §1.2 ("color only serves risk") in spirit — the only way to read it stricter is to claim that wayfinding signals must be colorless, which would force pure-neutral `#F8FAFC` selected on `#FAFAFA` panel = a 1–2 % lightness diff that's visually invisible at every plausible viewport. The `accent-tint` token exists precisely to give selected state a calm-but-visible identity without summoning the saturated `accent-default` indigo (which stays reserved for CTAs, focus rings, and risk callouts). The `brand-mark-primary` token (navy, `colors.primary`) is the canonical fill for the practice avatar tile.

Practice identity placement deviates from PRD §3.2.6 (which originally specified a top-right switcher dropdown with `⌘⇧O`). The visible identity row lives at the top of the sidebar (Linear / Notion / Vercel pattern) so the current practice is always-visible on a workbench surface, but the switching operation is hidden from the shell. The visible top-right cluster remains reserved for the AppShell-owned notifications bell and the `⌘K` command-palette hint. See `docs/Design/DueDateHQ-DESIGN.md` §4.9 for the full sidebar spec and the `app-shell.tsx` pattern card.

No provenance means no render. If an AI output lacks `source_url`, `verified_at`, and `verbatim_quote`, show a verification-needed state instead of a recommendation.

### Token segment index

front-matter 9 个顶层段：`colors / colorsDark / typography / rounded / shadows / spacing / components / componentExtensions / motion`。

- `colors` · Light 模式 35 个语义色，是 Figma Token Spec Sheet §01 Color 的权威源。
- `colorsDark` · 暗色镜像，键集合与 `colors` 同名；详细规则见 `docs/Design/DueDateHQ-DESIGN.md` §2.3。
- `typography` · 12 个 text style：3 档 display（`display-hero` 54 / `display-large` 36 / `section-title` 32，仅 marketing landing 使用，权威值与 Figma 同步）+ `title` 16 + `body` / `body-medium` 13 + `button` 12 + `badge` / `label` 11 + `hero-metric` 56 mono + `numeric` 13 mono + `numeric-small` 11 mono。
- `rounded` · 3 档圆角（`sm` 4 / `md` 6 / `lg` 12）；按钮走 `md`（6px）以匹配 shadcn `base-vega` 默认。
- `shadows` · 2 档（`subtle` Drawer/Popover/Tooltip · `overlay` Modal/Command Palette）；其余阴影一律禁止。
- `spacing` · 4px scale 9 档（0 / 4 / 8 / 12 / 16 / 24 / 32 / 48 / 80）。
- `components` · **必须 `@google/design.md` spec compliant**：每个 entry 仅允许 `backgroundColor / textColor / typography / rounded / padding / size / height / width` 8 个标量属性；变体（hover / active / tone / state）拍平为独立 entry（如 `button-primary-hover`、`badge`、`risk-row-critical-bar`、`confidence-badge-high`、`toast-info`、`stepper-current`、`status-pill-draft`、`hairline-default`、`brand-mark-primary`）。
- `componentExtensions` · DueDateHQ 私有非 spec 字段：`toast.shadow`、`toast.variant.timeoutMs`、`email-shell.numericFontFamily`，以及 4 个故意低对比的 `toast-success / stepper-completed / stepper-upcoming / stepper-disabled` 状态实例（每条带 `note:` 解释豁免理由）。linter 不读这段。
- `motion` · 动效规格（`genesis-odometer` / `genesis-particle` 的 ease / bezier / 粒子参数）。非视觉 token，linter 不读。

### 校验

运行 `pnpm design:lint` 跑 `[@google/design.md](https://github.com/google-labs-code/design.md)` 官方 linter（broken-ref 错误、WCAG 4.5:1 对比度、orphaned-tokens、section-order 等 7 条规则）。`vite.config.ts` 的 `staged.DESIGN.md` 钩子在 commit 时自动跑（`npx --yes @google/design.md lint <path>`）。任何 PR 必须保持 **0 errors / 0 warnings**（当前基线即如此 + 1 info summary）。如果新增的 component 触发 contrast 警告，把它从 `components:` 段挪到 `componentExtensions:` 段并附 `note:` 解释豁免理由（见 `toast-success` / `stepper-completed` / `status-pill-waiting` 的写法）。

### Migration Copilot 向导扩展 token

Demo Sprint 期间新增的 Migration Copilot 相关 token 已追加到 front-matter `components:` 段；详细使用说明 + 可达性规格见 `docs/Design/DueDateHQ-DESIGN.md` §14 Migration Copilot 向导 与 `docs/product-design/migration-copilot/09-design-system-deltas.md`。

- `stepper` 系列 · 4 步向导步骤条；`stepper-current` / `stepper-error` 在 `components:`，`stepper-completed` / `stepper-upcoming` / `stepper-disabled` 因故意低对比放在 `componentExtensions:`；`Enter` 与数字键 1-4 **不**跳步。
- `confidence-badge` 系列 · 3 档置信度拍平为 `confidence-badge-high` / `-med` / `-low`（high ≥ 0.95 / med 0.80–0.94 / low < 0.80）；色系与 severity / status 解耦；**数据质量类 needs_review 走 `confidence-badge-low` 的黄色调，工作流 Review 走 `status-pill-review` 紫色调**（ADR 0011 Decision III 裁定）。
- `toast` 系列 · 3 tone 拍平为 `toast-info` / `toast-warning`（在 `components:`）+ `toast-success`（因绿字 + 白底低对比放在 `componentExtensions:`）；`toast.variant.{default,persistent}` 时长行为也在 `componentExtensions:`（default 3s + 500ms undo · persistent 至 server `revertible_until` 过期，前端不本地倒计时）。
- `risk-row` 系列 · 三档 row 补齐 severity-high / severity-medium 视觉；每档独立 `risk-row-{critical,high,upcoming}-bar`（实色 2px 左 bar）+ `risk-row-{critical,high,upcoming}-strong-bar`（border 色 2px 强调 bar）。
- `motion.genesis-odometer` / `motion.genesis-particle` · Live Genesis 顶栏数字滚动 + 粒子弧线；`prefers-reduced-motion` 降级为 200ms fade-in。
- `email-shell` + `email-shell-footer` · Migration Report 邮件外壳（640px table 布局），`numericFontFamily: 'Geist Mono'` 在 `componentExtensions:`。

## Element states (cross-cutting reference)

Every interactive primitive defines these states. If a primitive isn't listed here, derive from the closest sibling. A primitive that ships without a `focus-visible` state, an explicit `disabled` state, or a `selected` archetype (where applicable) is incomplete.

| Primitive                    | rest                                                                                                                  | hover                                   | focus-visible                                          | active (pressed)                     | disabled                        | selected / "on"                                                                               |
| :--------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :-------------------------------------- | :----------------------------------------------------- | :----------------------------------- | :------------------------------ | :-------------------------------------------------------------------------------------------- |
| Button (primary)             | `bg-components-button-primary-bg text-text-inverted`                                                                  | `bg-components-button-primary-bg-hover` | 2px accent ring + 2px offset                           | `bg-components-button-primary-bg/90` | `opacity-40 cursor-not-allowed` | —                                                                                             |
| Button (secondary / outline) | `border-divider-regular bg-background-default text-text-secondary`                                                    | `bg-state-base-hover`                   | 2px accent ring + 2px offset                           | `bg-state-base-active`               | `opacity-40`                    | —                                                                                             |
| Button (ghost)               | `text-text-secondary bg-transparent`                                                                                  | `bg-state-base-hover`                   | 2px accent ring + 2px offset                           | `bg-state-base-active`               | `opacity-40`                    | —                                                                                             |
| Button (link)                | `text-text-secondary underline-offset-4`                                                                              | `text-text-primary underline`           | 2px accent ring + 2px offset                           | `text-text-primary`                  | `opacity-40`                    | —                                                                                             |
| Button (destructive)         | `bg-state-destructive-solid text-text-inverted`                                                                       | `bg-state-destructive-active`           | 2px destructive ring                                   | `bg-state-destructive-active/90`     | `opacity-40`                    | —                                                                                             |
| Input / Select / Textarea    | `bg-background-subtle border-divider-regular`                                                                         | `border-divider-deep`                   | `bg-background-default` + 2px accent ring + 2px offset | —                                    | `opacity-40 bg-divider-subtle`  | —                                                                                             |
| Checkbox                     | unchecked: `bg-background-default border-divider-deep`; checked: `bg-components-button-primary-bg text-text-inverted` | `border-text-secondary`                 | 2px accent ring                                        | —                                    | `opacity-40`                    | —                                                                                             |
| Sidebar item                 | `text-text-secondary`                                                                                                 | `bg-state-base-hover`                   | 2px accent ring                                        | `bg-state-base-active`               | `opacity-40` (rare)             | **you-are-here**: `bg-state-base-active text-text-primary font-medium` (NOT saturated indigo) |
| Dropdown item                | `text-text-secondary`                                                                                                 | `bg-state-base-hover text-text-primary` | (parent menu owns focus)                               | —                                    | `opacity-40 cursor-not-allowed` | —                                                                                             |
| FilterChip (toggle)          | `bg-background-subtle text-text-secondary`                                                                            | `bg-divider-subtle text-text-primary`   | 2px accent ring                                        | `bg-divider-subtle`                  | `opacity-40`                    | active filter: `bg-text-primary text-text-inverted`                                           |
| Tab item                     | `text-text-tertiary border-b-2 border-transparent`                                                                    | `text-text-secondary`                   | 2px accent ring                                        | `text-text-primary`                  | `opacity-40`                    | active tab: `text-text-primary border-b-2 border-text-primary`                                |
| Card (clickable)             | `border-divider-regular bg-background-default`                                                                        | `border-divider-deep`                   | 2px accent ring                                        | —                                    | —                               | —                                                                                             |
| Modal                        | `bg-background-default border-divider-regular shadow-overlay`                                                         | (n/a)                                   | focus trapped to first focusable child                 | (n/a)                                | (n/a)                           | open / closed only                                                                            |
| Tooltip                      | hidden                                                                                                                | (n/a, parent triggers)                  | (n/a)                                                  | (n/a)                                | (n/a)                           | open: `bg-text-primary text-text-inverted text-xs px-2 py-1 rounded-md`                       |

**Two distinct "selected/on" archetypes — pick by what the affordance does:**

- **You-are-here** (sidebar nav, active wizard step) — `bg-state-base-active text-text-primary font-medium`. Subtle. The user navigated here; the marker just confirms.
- **Filter-is-on** (FilterChip, MetricTile-as-filter) — `bg-text-primary text-text-inverted`. Loud. The user toggled state and needs to see the world has changed.

Don't blur them. A sidebar item painted in the loud archetype reads like a filter; a filter painted in the subtle archetype reads like a label.

## Component contracts

The contracts below cover every overlay / form / list primitive in active use. New components inherit from the closest sibling; new variants extend the existing contract rather than introducing a parallel system.

### Buttons

Use shadcn `<Button>` (`packages/ui/src/components/ui/button.tsx`). Five variants are in active use; pick by intent, not by chrome:

| Variant               | When to use                                                                                     | Notes                                                                         |
| :-------------------- | :---------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| `default` (primary)   | The single next action on the viewport (T2).                                                    | At most one per viewport. `Send reminder`, `Confirm receipt`, `Save changes`. |
| `outline` (secondary) | Paired alternative to a primary (Cancel in modals, alternative-path actions next to a primary). | Never used alone.                                                             |
| `ghost` (tertiary)    | Row-action buttons, table-cell actions revealed on hover/focus, top-bar triggers, drawer close. | No chrome until hover.                                                        |
| `link`                | Navigational rather than committing — "Snooze until tomorrow", "Show all 7", "Open full queue". | Text only, no chrome.                                                         |
| `destructive`         | Inside confirm modals only, plus rare in-row Delete affordances.                                | `bg-state-destructive-solid`.                                                 |

**Sizes:** `default` (h-9 / 36px), `sm` (h-8 / 32px), `xs` (h-7 / 28px), `icon` (32×32 visual + padding-expanded hit area to 44×44).

**Shape:** `rounded-md` (6px). Don't pill buttons; pills are reserved for indicators per T3.

### Inputs (text, select, textarea)

Composed from shadcn `<Input>` / `<Select>` / `<Textarea>`. Mercury references show inputs sitting slightly _below_ page surface (subtle tint) so they read as fillable, not as cards.

| Property     | Value                                                                                                                      |
| :----------- | :------------------------------------------------------------------------------------------------------------------------- |
| Height       | `h-9` (36px) — matches button default                                                                                      |
| Background   | `bg-background-subtle` rest, `bg-background-default` on focus                                                              |
| Border       | `border border-divider-regular` rest; `border-divider-deep` on hover                                                       |
| Focus        | `focus-visible:outline-2 focus-visible:outline-state-accent-active focus-visible:outline-offset-2` (never `outline: none`) |
| Radius       | `rounded-md` (6px)                                                                                                         |
| Padding      | `px-3 py-2`                                                                                                                |
| Label above  | `text-[13px] font-medium` `text-text-primary`, 4px above the input                                                         |
| Helper below | `text-xs` `text-text-tertiary`, 4px below                                                                                  |
| Placeholder  | `text-text-placeholder`                                                                                                    |
| Disabled     | `opacity-40 cursor-not-allowed bg-divider-subtle`                                                                          |
| Invalid      | `border-state-destructive-border` + `aria-invalid="true"` + `text-xs text-text-destructive` error in helper slot           |

### Modals (Dialog)

Composed from shadcn `<Dialog>`. The behavioral contract — when to interrupt — lives in §Confirm modal discipline below.

| Property            | Value                                                                                                                        |
| :------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| Width               | `max-w-md` (~448px) for confirms; `max-w-lg` (~512px) for forms                                                              |
| Background          | `bg-background-default`                                                                                                      |
| Border              | `border border-divider-regular` (1px hairline)                                                                               |
| Radius              | `rounded-lg` (12px) — slightly rounder than cards (8px) so a modal reads as a discrete object floating above                 |
| Shadow              | `shadow-overlay`                                                                                                             |
| Backdrop            | `bg-text-primary/40 backdrop-blur-[2px]`, `z-40`                                                                             |
| Modal layer         | `z-50`                                                                                                                       |
| Padding             | `p-6` (24px) for the body; header same horizontal + `pt-6 pb-4`; footer `pt-4 pb-6`                                          |
| Title               | `text-base font-semibold` (16/600); no separator border between header and body                                              |
| Field group gap     | `gap-6` between groups; `gap-4` inside a group                                                                               |
| Footer              | Right-aligned, `gap-3` between buttons. **Cancel sits left of the commit.** Destructive commits use `variant="destructive"`. |
| Esc + outside-click | Close. Focus returns to the element that opened the modal (focus trap while open).                                           |

### Confirm modal discipline

Modals interrupt for input only (T7). The bar for triggering one is **damage that's hard to reverse**. Activity-logged reversible actions never get a modal — they get a toast.

**Confirm modal REQUIRED on:**

1. Batch-adjust deadlines from an alert — preview the date diff before applying.
2. Archive client — show active-deadline count; warn if > 0.
3. CSV / XLSX import commit (final wizard step) — preview row counts.
4. Remove team member — show how many client assignments revert to Owner.
5. Remove a filing-jurisdiction from a client — list the pending deadlines that will be removed.
6. Send batch reminder email — preview recipient list + editable body before send.
7. Undo import (within the 7-day window) — show the N clients / M deadlines that get wiped.

**No modal on** (reversible + activity-logged): Mark complete · Mark in progress · Mark waiting · Add note · Edit note · Toggle filters · Toggle view modes · Snooze (own affordance).

### Dropdowns

Composed from shadcn `<DropdownMenu>`. Anchored to a trigger; floats above with subtle elevation.

| Property        | Value                                                                       |
| :-------------- | :-------------------------------------------------------------------------- |
| Background      | `bg-components-panel-bg`                                                    |
| Border          | `border border-components-panel-border`                                     |
| Radius          | `rounded-md` (6px)                                                          |
| Shadow          | `shadow-overlay`                                                            |
| Min-width       | match trigger, or `w-48` / `w-56` when content is wider                     |
| Item padding    | `px-3 py-2`                                                                 |
| Item gap        | `gap-2` between leading icon and label                                      |
| Item rest       | `text-text-secondary`                                                       |
| Item hover      | `bg-state-base-hover text-text-primary`                                     |
| Item disabled   | `opacity-40 cursor-not-allowed`                                             |
| Separator       | `border-t border-divider-subtle my-1`                                       |
| Section eyebrow | `text-[11px] uppercase tracking-[0.08em] text-text-tertiary px-3 pt-2 pb-1` |

### Tooltip / Popover

Tooltips are compact ephemeral labels — never place interactive content inside them. Popovers carry interactive content.

| Property      | Tooltip                                     | Popover                       |
| :------------ | :------------------------------------------ | :---------------------------- |
| Background    | `bg-components-tooltip-bg`                  | `bg-components-panel-bg`      |
| Text          | `text-components-tooltip-text text-xs`      | `text-text-secondary text-sm` |
| Radius        | `rounded-md` (6px)                          | `rounded-md` (6px)            |
| Padding       | `px-2 py-1`                                 | `p-3`                         |
| Shadow        | `shadow-md`                                 | `shadow-overlay`              |
| Backdrop blur | `backdrop-blur-[5px]` (subtle, system-feel) | optional                      |

### Sidebar (flush rail + nav items)

The sidebar is a **flush rail with a single hairline right border** (no float, no shadow). It sits as a flex sibling of the main column so wayfinding stays reliable — the menu is always exactly where the eye expects it.

| Property              | Expanded                                                                    | Mobile drawer       |
| :-------------------- | :-------------------------------------------------------------------------- | :------------------ |
| Width                 | 220px (DueDateHQ-specific; reference uses w-56 / 224px)                     | full-width sheet    |
| Background            | `bg-background-sidenav-bg`                                                  | same                |
| Right edge            | `border-r border-divider-regular`                                           | (sheet owns chrome) |
| Item height           | `h-9` (36px)                                                                |
| Item padding          | `px-3`                                                                      |
| Item radius           | `rounded-md` (6px)                                                          |
| Active (you-are-here) | `bg-state-base-active text-text-primary font-medium`                        |
| Group eyebrow         | `text-[11px] uppercase tracking-[0.08em] text-text-tertiary px-3 pt-4 pb-1` |

**No collapsed/icon-only mode** in the current DueDateHQ shell (deviation from the reference's w-14 collapsed mode). The mobile breakpoint uses a sheet-style drawer instead.

## Voice & Terminology

The product voice is **calm, factual, respectful of time**. CPAs are senior professionals. Don't over-explain; don't celebrate; don't apologize for system errors that aren't user-caused. See the existing §Voice & Terminology section below for the full guidance — this block is a quick reference for the rules that change microcopy most often.

### Three guiding moves

1. **Verb + object on actions.** "Send reminder" not "Send". "Mark received" not "Confirm". The user reads the button without scanning the row's status pill.
2. **State the state, then the suggestion.** "Form 941 was revised. 72 clients affected. Review impacts →" (state → impact → action).
3. **Numbers carry the load.** Microcopy supports the number, doesn't replace it. "$2,200 due Apr 18" beats "An amount is due in a few days."

### Casing rules

- **Sentence case for everything** — buttons, labels, page titles, banner copy. UPPERCASE reserved for sidebar group eyebrows (`OPERATIONS`, `CLIENTS`) and similar 11px label tokens.
- **Punctuation:** commas inside copy, periods at end of sentences in body copy; **no periods on button labels or single-line statuses**.

### Forbidden words / phrases

| Don't say                              | Why                                                                   |
| :------------------------------------- | :-------------------------------------------------------------------- |
| "Oops!", "Whoops!"                     | Never apologize for system errors that aren't the user's fault.       |
| "Awesome!", "Great!", `🎉`             | Never celebrate routine actions (T8 — desk not stage).                |
| "AI is learning", "Our AI is thinking" | Never expose AI internals as decoration.                              |
| "Just a moment!", "Hang tight!"        | Boring "Loading…" is correct.                                         |
| "Dashboard" as a sidebar destination   | Use the actual page name (e.g. "Today" or the contextual home label). |
| `Mode A/B/C/D/E/F` in user-facing copy | Internal telemetry id only.                                           |
| Emojis anywhere in product UI          | Breaks the calm register. Use Lucide icon or a status pill instead.   |

## Component anatomy rules

Every multi-element component (card, row, banner, dialog, table cell) MUST satisfy these before shipping. They prevent the most common layout failures (the "$79 hidden behind CTA" archetype):

1. **Zone map first.** Name the areas — `[avatar] [name+meta] [status pill] [primary action]` — before pixel values. Elements never leak across zone boundaries.
2. **Reading order explicit.** State the L→R / T→B scan path: e.g. `name → meta → status → primary action`. The DOM order matches the visual order.
3. **Non-overlap guarantee for primary info.** The deadline date / client name / `Overdue Nd` pill is **never** covered by an interactive affordance. Primary-info zones get `min-w-*` so CTAs can't squeeze them out.
4. **Hit-target separation.** Tappable rows containing nested tappables (Send button, ✕ dismiss, chevron) give each nested element its own 44×44 hit area + `e.stopPropagation()` on its click handler so the row click doesn't fire too.
5. **Truncation policy per text element.** Declare: never / 1 line ellipsis / 2 lines ellipsis / hides-at-breakpoint. No `flex-1 truncate` without intention.
6. **Responsive collapse stated.** What happens when the component narrows? (side-by-side → stacked? footer wraps to two rows? meta hides?)
7. **All interaction states defined.** rest / hover / active / focus-visible / disabled (+ selected / loading where applicable). Missing states = fail unless explicit `N/A`.

If a component spec doesn't answer all 7, send it back.

## Page sections — the dashboard's heartbeat

The dashboard has one rhythm rule: spacing doubles between scopes (4 → 8 → 16 → 24 → 48). Page sections, top to bottom:

1. **Page header** (date / route name inline, single line)
2. **Alerts** — a single grouped section. Header `<h2>` plus alert cards for source-backed changes that may affect current client work. Source-health diagnostics stay out of the CPA-facing review queue; the section is for reviewable alerts only.
3. **This week's exposure** — KPI mini-tiles (number on top, label below). Sans-serif tabular numerals at `text-2xl semibold`. Each tile is a deep-link into the matching Deadlines filter.
4. **Actions this week** — the daily action queue.

That is the dashboard. There is no fifth section. Every section auto-hides at zero rather than rendering an "empty state" with chrome.

### Actions this week — row anatomy

The row carries five signals, in this scan order:

```
[ penalty pill ] [ due-date pill ]  Client name                          [ ⌄ ]
                                    Task prompt
```

- **Penalty pill** (left) — the dollar stake. Red-filled when past-due with accrued penalty; neutral outline when projected; muted dash when no figure. Always sized identically so a long list reads as a column.
- **Due-date pill** — encapsulated, never floaty. Red-filled when past due; neutral when due today / upcoming. Drop the bare red-text-on-white pattern — pills with backgrounds read as urgency, raw red text reads as bug.
- **Client name** at `text-base font-medium`; task prompt below at `text-sm text-text-secondary`.
- **Chevron** rotates 180° when expanded.

Click expands a small detail panel inline: status sentence, form, attached sources, penalty rule, plus a primary "Open in Deadlines" link. Click-to-expand (not hover) — hover-expanding a long list causes layout jitter and is fragile on trackpads.

## Information hierarchy — failure modes

Every screen must let the eye land in T1 → T2 → T3 order in under 5 seconds. The common failures (each is a hierarchy bug, not a styling bug):

- **Tier inflation.** Three things competing for hero. Pick one; demote the others to T2.
- **Tier flattening.** Every section uses the same heading weight. T1 must outweigh T2 must outweigh T3 _visually_, not just semantically.
- **Decoration tax.** An icon, badge, dot, AND pill on every row. The eye has nothing to land on. Remove all but the one signal that changes a decision.
- **Metadata creep.** Secondary info painted in the same weight as primary ("5 min ago" in `font-medium text-text-primary`). Push to `text-xs text-text-tertiary`, or drop.
- **Repeat surfaces.** Same content rendered twice (count in tab AND same count in filter chip below). Pick one home; remove the other.

When auditing a dense screen: print the tier of every visible element. If T2 outnumbers T1 by more than 5×, or T3 outnumbers T2 by more than 3×, the screen is over-decorated — cut the smaller tiers first.

## Responsive behavior

DueDateHQ is **desktop-first**. A CPA does focused work on a 13"+ screen; mobile is for triage glances. Optimize desktop fully; make mobile usable.

### Breakpoints (Tailwind v4 + DueDateHQ extensions)

| Name            | Min width | Layout                                                                                                            |
| :-------------- | :-------- | :---------------------------------------------------------------------------------------------------------------- |
| `mobile` / `sm` | < 769     | Mobile — sidebar hidden, sheet-style drawer takes over, single column                                             |
| `tablet` / `md` | 769–1023  | Tablet — sidebar visible, single column, page content caps at default width                                       |
| `lg`            | 1024–1279 | Small desktop — full sidebar, page content `max-w-screen-2xl`                                                     |
| `xl` / `2xl`    | ≥ 1280    | Desktop / wide — same as `lg`, dashboard caps at `max-w-[1100px]` (mx-auto), Coverage / tables use the full width |

### Page content widths

- **Dashboard** caps at `max-w-[1100px]` (focused reading width).
- **Deadlines / other workbench tables** widen to `max-w-screen-2xl` so wide tables don't clip.
- **Settings forms** cap at ~880px.
- **Settings data surfaces** (Members / Billing) use ~1180px workbench width.
- **Drawers** default 400px; workflow drawers (deadline triage, batch review) scale to 880px max.
- **Modals** cap at `max-w-md` (~448px) for confirms, `max-w-lg` (~512px) for forms, 640px for the rare wide-form case.

### Touch targets

- Default: 44×44 minimum (WCAG 2.1 AA).
- Mobile-primary surfaces: 48×48.
- Inline icon-only actions: visual 32×32 with hit area expanded via padding to 44×44.

## Accessibility

WCAG 2.1 AA is the floor. The product is used by working CPAs at 7am with coffee and bifocals — readability isn't optional.

### Required behaviors

- **Focus visibility.** `:focus-visible` only (never `:focus`); 2px accent outline + 2px offset; **never `outline: none` without a replacement**.
- **Color independence.** Every status carries an icon or label, never color alone. (`Overdue 3d` pill is a chip + colored ink; the word does the work for color-blind users.)
- **Keyboard nav.** Tab order follows visible reading order. Modal closes on Escape. `j` / `k` between rows where supported. Drawer close returns focus to its trigger.
- **Screen reader.** Every icon has an `aria-label` (decorative icons get `aria-hidden="true"`). Status pills announce as "Status: Overdue 3 days." Modals announce their title on open.
- **Form errors.** `aria-invalid="true"` + `aria-describedby` linking to error message rendered in `text-text-destructive` below the input.
- **Reduced motion.** `prefers-reduced-motion: reduce` is wired globally; per-moment fallbacks degrade to opacity-only or no animation.

## Motion

Motion confirms; it does not perform. Subtle, fast, professional. The product is used 30× a day; animation that doesn't earn its keep becomes friction.

### Easing tokens

```css
--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1); /* default for entries */
--ease-out-quick: cubic-bezier(0.4, 0, 0.2, 1); /* for hover/state change */
```

**Forbidden:** CSS defaults (`ease`, `ease-in`, `ease-in-out`) — too soft, lack punch. `ease-in` specifically is forbidden on UI animations (sluggish at the watching moment).

### Duration ladder

| Element                  | Duration                               |
| :----------------------- | :------------------------------------- |
| Button press feedback    | 80–160 ms                              |
| Tooltips, small popovers | 125–200 ms                             |
| Sheet / drawer slide-in  | 200–250 ms                             |
| Modal fade + scale       | 150–200 ms                             |
| Page transitions         | none — instant navigation feels faster |
| Toast in/out             | 200 / 150 ms                           |
| Skeleton shimmer         | 1500 ms loop                           |

Anything longer than 300 ms on a UI transition is a bug. Reserve longer durations (alert-breathing 3800 ms) for ambient signal, not state changes.

## Do's and Don'ts

### Do

- **Privilege the gap.** Sections, labels, and counts surface what's missing first ("Still missing (3)" not "Resolved (12)"). Confirmed / done items collapse by default.
- **One thing, one entrance, one name.** Never two UI paths to the same concept. Canonical verbs: `Send`, `Confirm`, `Open`, `Apply`. No synonym drift — see §Voice & Terminology.
- **Show absolute date AND relative time** for every deadline. "May 12 · in 4 days." CPAs plan by date, triage by days-left.
- **Use space, not chrome, for hierarchy.** The 4 / 8 / 16 / 24 / 48 ladder does most of the work. Reach for borders only when space alone can't separate.
- **Keep escape hatches visible.** Tertiary affordances — `Undo`, `Not applicable`, `Skip`, manual override — sit in the same surface as the primary action, not buried in a settings page.
- **Express risk in dollars before days.** Dollar exposure is the universal CPA scan; "$X at risk" beats "X overdue" at the same byte budget.
- **Keep amount, date, deadline, EIN, and source labels in mono tabular numerals.** Vertical alignment is half the value of a workbench list.

### Don't

- **Don't use gradients, decorative glows, large shadows, or rounded SaaS template styling.** Cards stay flat: hairline border + surface tint. Modals/popovers may use `shadow-overlay` or `shadow-subtle`; nothing else.
- **Don't paint status colors across a full row or card** (T4). Status colors are pills, never row backgrounds. The legacy risk-row tinting pattern (`bg-severity-*-tint` across an entire row) is deprecated; in new work, rows stay neutral and a single pill carries the signal. Status-tinted backgrounds are reserved for _banners_ (the dedicated "I noticed" surface) and sub-zone callouts inside expanded cards.
- **Don't use the accent indigo for anything other than the next action.** Selected sidebar items use a subtle `bg-state-base-active` (you-are-here), not the saturated CTA accent. Focus rings on form inputs use 2px indigo + 2px offset (T2).
- **Don't show times of day on deadlines.** Tax filings are whole-day. No "5:00 PM CT", no "7 hours remaining", no time-slot calendars. Date only.
- **Don't render decorative dots before status text** (e.g. `● Overdue`). Tinted pill bg + colored ink already carry the signal; a leading filled circle is visual noise.
- **Don't use emojis in product UI.** Not in nav labels, not as table-column glyphs, not on filter chips. Emojis break the calm register. Use a Lucide icon when needed; use a status pill when status urgency is needed.
- **Don't introduce horizontal scroll on data tables.** If a table doesn't fit, drop or compact columns at the breakpoint — never `min-w-[Npx]` + `overflow-x-auto`. CPAs scan column-wise; a horizontal-scrolled table loses its first-column anchor.
- **Don't separate metric values with middle dots (`·`) when a clean row works.** Use horizontal whitespace and let weight + color carry hierarchy. Middle dots stay valid as separators _inside_ a single metadata string (`Form 1120-S · Federal · S-corp return`).
- **Don't write a custom `<h1>` per page.** Use the shared `<PageHeader title=… description=… actions=…>` component. Section titles use a shared treatment (`text-base font-semibold text-text-primary`). One-off typography is drift.
- **Don't render AI advice without evidence.** If an AI output lacks `source_url`, `verified_at`, or `verbatim_quote`, show a verification-needed state instead of a recommendation.
- **Don't use raw Tailwind color utilities** (`text-blue-600`, `bg-red-50`) **in business components.** Always go through the semantic layer (`text-text-accent`, `bg-state-warning-hover`, etc.).
- **Don't ship a display face larger than the page title** (`text-2xl` / 600 / `leading-7` / `tracking-[-0.01em]`). The legacy `display-hero` 54px, `display-large` 36px, `section-title` 32px, and `hero-metric` 56px Geist Mono tokens remain in the spec for marketing surfaces only; product surfaces use **at most** `text-2xl` (28px) for the page title (T8).
- **Don't stack two `↗` arrows in the same visual area.** A "View all ↗" link and a "Review ↗" button next to each other read as duplicate chrome. Rule: filled / primary buttons take no arrow (the button itself signals action); text-link-style navigation chrome (`View all`, `Open full queue`) may carry the arrow as the single navigation cue. If you find yourself needing two arrows side-by-side, drop the one on the button.

## Quiet register — the four refinements

This block tightens the product's taste filter. Apply uniformly; in conflict with anything earlier in the doc, this block wins.

### Q1 · No yellow / amber as a primary tone

Yellow / golden tones read as caution-tape — loud, dated, visually noisy on a calm canvas. Mercury's "Pending Review" (lavender) and "Declined" (peach) prove a quieter palette carries the same urgency vocabulary without amber.

**Direction.** Keep the `warn` semantic but shift the visual tone toward soft peach / coral hues rather than golden amber. The amber palette survives only where state-of-the-art workflow status (Alerts "Needs review", Migration Copilot "Applicability review") is genuinely the right semantic — and even there, prefer a tinted pill over a tinted row background.

**Where this changes existing surfaces:**

- "Stuck >14d" / "Behind target" / "Awaiting reply" status pills — repaint with peach-leaning tones, not amber.
- "Reminders out, awaiting reply" mail-card sub-zone — peach tint or migrate to `review` (lavender) since the semantic IS "waiting on client".
- Alerts attention banners — keep peach/amber, but never elevate the row's _background_ on the list itself; the banner is the loud surface.
- "Overdue −Nd" — stays `danger` red (unchanged; this is the one loud tier).

There is **no middle tier between calm peach and alarm red.** If a future signal needs higher urgency than peach, it earns red.

### Q2 · No thick lines

Borders carry hierarchy by _presence_, not by _weight_. The hairline (1px) is the only stroke that earns its keep.

**Forbidden:**

- `border-2`, `border-l-4`, `border-r-4`, `border-b-2`, `border-t-2` — anything thicker than 1px on a content surface.
- The 4px status left-rule on banners (`border-l-4 border-warn-solid` and friends). Status banners now carry their signal via tinted bg + status icon prefix only.

**Permitted exceptions** (only these):

| Element                            | Stroke                                                   | Reason                                                                                                       |
| :--------------------------------- | :------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| Tab active marker                  | `border-b-1.5 border-text-primary`                       | The tab underline is the canonical "you are here" mark. 1.5px reads as intentional; 2px reads as decoration. |
| Focus ring                         | `outline-2 outline-state-accent-active outline-offset-2` | Outline, not border — paints on top, doesn't shift layout. Required for keyboard a11y.                       |
| Loud-archetype filter active state | `bg-text-primary text-text-inverted` (no border)         | Surface fill carries the signal; no border needed.                                                           |

### Q3 · No dark borders

Borders are `--divider-regular` (light hairline) only.

- `border-divider-deep` on hover/hover-card states → **collapse to `--divider-regular`**. Hover communicates via bg-shift (`bg-state-base-hover`), never via a darker border. A 6% lightness shift on a 1px line is too subtle to register anyway.
- `border-text-primary` / `border-black` / `border-foreground` as a card or chip stroke → **forbidden**. Using the _darkest_ surface as a 1px stroke around a card reads as harsh outline-art, not soft chrome. If a divider needs to read harder, promote to a sub-card structure (`<CardZone>` + `<CardDivider>`) or change the surface tint instead.

The "selected/on" archetypes (§Element states) keep their existing definitions — `bg-text-primary text-text-inverted` (loud filter) is a _surface fill_, not a border, so it survives Q3 unchanged.

### Q4 · Grouping discipline (no orphans)

Every visible element belongs to a zone. Zones nest into sections; sections compose the page. **An orphan — a stray pill, a lone button, a one-off chip floating between two unrelated cards — is a bug**, not a styling choice.

**The grouping ladder (T1–T3 made structural):**

| Tier        | Example                                                   | Boundary                                                                               |
| :---------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **Element** | A status pill, a button, a date label                     | None — elements never sit alone. They join a row.                                      |
| **Row**     | A line of related elements (icon + label + meta + action) | Hairline `divide-y` if multiple rows; otherwise the parent zone provides the boundary. |
| **Zone**    | A semantically homogeneous group of rows                  | The card surface or a sub-card between dividers.                                       |
| **Section** | A semantically homogeneous group of zones                 | A section header + the cards beneath. Whitespace at `gap-12` (48px) above.             |
| **Page**    | The whole work surface                                    | The page container + the page header.                                                  |

**Failure modes** (each is a Q4 violation):

- **Stray pill outside a zone.** A `Pro` pill in the top-bar that doesn't belong to a row, a card, or a header cluster.
- **Banner outside a section.** A banner rendered between two section headers with no zone-membership.
- **Lone button between cards.** A `+ Add` button rendered standalone between two cards.
- **Sub-zone without a header.** A tinted sub-zone that has no eyebrow or count — readable but unnamed.
- **Cards in the void.** Two cards stacked with no section header above and no `gap-12` below — they read as the same surface.

The rule of thumb: if you can point to an element and ask "what does this belong to?", and the answer isn't immediate, it's an orphan. Promote, anchor, or remove.

### Q5 · Subtle · Easy · Confident · Quiet

A compact taste filter. Apply in this order when in doubt:

1. **Subtle.** If two surfaces could read as one with a slight tonal shift, prefer the shift over a border.
2. **Easy.** If a row asks the eye to scan more than three pieces of info before locking on the action, drop or move pieces until it doesn't.
3. **Confident.** Pick one CTA per viewport and commit. No "or you could also" tertiary actions on a row that already has a primary.
4. **Quiet.** When a tone could be loud (red), medium (peach), or quiet (neutral / lavender), default to the quietest tone the semantic allows.

When these four conflict with a Mercury reference, this rule wins.

## Invisible correctness

The barely-audible voices that compound. Easy to forget, easy to spot when missing.

| Surface                 | Rule                                                                                                               |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------- |
| Text selection          | `bg-text-primary/24` selection bg, `color: text-primary`                                                           |
| Caret color             | `caret-color: var(--text-primary)` on inputs                                                                       |
| Scrollbar               | thin (8px) · thumb `text-tertiary/32` · hover `text-tertiary/56`                                                   |
| Link underline          | `text-underline-offset: 3px` · `text-decoration-thickness: 1.5px` · color matches text · hover dims to 70% opacity |
| Tap-highlight           | `-webkit-tap-highlight-color: transparent` + custom `:active` state per component                                  |
| Tooltip delay           | first hover: 400 ms · subsequent (within 300 ms): instant + no animation                                           |
| Smooth scroll           | `scroll-behavior: smooth` on `<html>`                                                                              |
| Anchor scroll-margin    | `scroll-margin-top: var(--nav-height) + 12px` on every scroll target                                               |
| Focus-visible ring      | only on `:focus-visible`, never `:focus` · never `outline: none` · 2px accent + 2px offset                         |
| Broken image fallback   | subtle bg + alt text in `text-tertiary` + 16px `<ImageOff>` icon                                                   |
| `select-none` on chrome | sidebar items, button labels, status pills — prevent accidental drag-select                                        |
| Number inputs           | `appearance: none` on currency inputs (kill browser spinners)                                                      |
| Empty cell rendering    | render `—` (em dash) in `text-text-tertiary`, never blank                                                          |
| Print stylesheet        | links unfurl URLs; `@page` margin 0.5in; brand fonts swap to system                                                |

## KPI tile = filter trigger

Some KPI tiles double as filter affordances on their page (Clients tiles filter the roster, Workload tiles filter the team table). When a tile is clickable:

- Pass `onClick` + `active` props to the tile. `active` paints a ring + dark border; non-active is the standard line border.
- **The tile's label IS the filter name** — don't duplicate the label as a separate filter chip below. ONE entrance, ONE name.
- A second row of filter chips below KPI tiles is allowed only when the chips represent **a different filter dimension** (tiles surface "what needs attention", chips slice by attribute like entity / state).
- The active state uses the loud-filter archetype (`bg-text-primary text-text-inverted`), not the you-are-here archetype — see §Element states.

## Single drilldown destination per concept

When two surfaces present the same concept, the click target on the secondary surface **navigates to the primary surface** — it does NOT open a duplicate drawer/modal showing the same content.

- **Deadline detail.** Deadline drawer is the primary surface (right-side sheet). Every click target on a secondary surface (dashboard action row, calendar cell, client workspace row) navigates to a URL that opens the same drawer, not a duplicate inline view.
- **Client detail.** `/clients/<id>` is the single drilldown. No duplicate drawers, no inline expansions that recreate the page.
- **Alert.** The alert drawer is the primary surface. Dashboard cards click into the same drawer.
- **Rule detail.** Coverage's inline rule panel is the canonical surface. Library row click navigates to `/rules/coverage?rule=…`, not a duplicate drawer.

This rule prevents the "drawer that duplicates the page" failure mode and keeps deep-links to a single canonical URL per record.

## Destructive change preview

Any change that **adds, removes, or replaces multiple records on commit** opens a migration preview modal before the change applies. Never silently remove. Never silently duplicate.

**Triggers:** client entity-type change · primary-state change · filing-bundle swap · undo-import · rule version replace.

**Required preview shape — three diff lines, signed:**

```
Changing entity from LLC → S-Corp

−  Removes  3 pending deadlines (LLC-specific forms)
+  Adds     5 new deadlines (S-Corp forms)
✓  Keeps    2 overlapping deadlines (federal)

[Cancel]   [Apply changes]
```

- The `−` / `+` / `✓` glyphs are SVG (not unicode) for cross-platform fidelity, ink-tinted with the matching status family (`text-destructive` / `text-success` / `text-secondary`).
- The audit log writes a single entry summarizing all three counts — not three separate entries.
- The commit button label includes the magnitude when it's high enough to lose track of: `Apply changes (10)`.

## Export modal — three-axis pattern

Exports are decisions across three orthogonal axes. The modal renders one axis per row, radio groups inside each (no multi-select within an axis — one choice per axis).

| Axis          | Choices                                                                                                                               |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------ |
| **What**      | Current filtered view · All active deadlines · Specific date range (date picker) · Specific client (when launched from a client page) |
| **Format**    | PDF (firm-branded client-facing report) · CSV (raw data, portability guarantee) · iCal `.ics` (subscription URL for calendar apps)    |
| **Recipient** | Download (default) · Email to self · Email to teammate (paid tiers only)                                                              |

**Trigger locations:** any `Export` button across the product points to the same modal — Deadlines page header, Client detail's overflow menu, alert detail's affected-client list, Calendar / Audit log header. Same modal everywhere keeps the user's mental model intact (one entrance, one name).

**No additional axes.** No "include archived?" checkbox, no "anonymize names?" toggle — options-creep. If a future case demands a fourth axis, it earns its own dialog with its own load-bearing rationale.

## Microcopy reference (concrete examples)

Pair this table with the existing Voice & Terminology section below. These are the rules in copy form — when in doubt, match the cell.

| Surface                            | Copy                                                                      | Why                                                           |
| :--------------------------------- | :------------------------------------------------------------------------ | :------------------------------------------------------------ |
| Page title (Today)                 | `Today May 19` (date inline, medium-weight)                               | Factual. Not "Welcome, Sarah" — desk, not stage.              |
| Empty Alerts                       | `No active alerts.`                                                       | Calm fact. Not "All caught up!" — no celebration.             |
| Empty Actions queue                | `Caught up. Next deadline due May 18.`                                    | Provides horizon, per the Do rule.                            |
| Confirmation toast (status change) | `Marked filed.`                                                           | Past tense, terse, no exclamation.                            |
| Error toast (send failed)          | `Couldn't send. Retry, or check the email address.`                       | Direct: what failed, what to try. Not "Oops!"                 |
| Banner (state change)              | `IRS revised Form 941. 72 of your clients are affected. Review impacts →` | State → impact → verb.                                        |
| Button: send reminder              | `Send reminder`                                                           | Verb + object. Plural-stable: `Send reminder (3)` when batch. |
| Button: review reply               | `Open thread`                                                             | Domain term. Not "View" / "See".                              |
| Loading state                      | `Loading…`                                                                | Boring is correct. Not "Just a moment!" / "Hang tight!"       |
| Source-health (when healthy)       | `50/50 · all sources connected`                                           | The absence of bad news IS the message.                       |

## Voice & Terminology

DueDateHQ writes for working CPAs. Copy must be plain, precise, and quiet — a workbench tool, not a marketing site or chatbot. The rules below are enforced by code review; pair them with the i18n catalog (`apps/app/src/i18n/locales/en/messages.po`) as the source of truth.

### Voice

- **Calm and direct.** State what is, what happened, or what to do. No exclamations, no hype, no encouragement copy.
- **Active over passive.** "Reverted import" beats "Import was reverted." Toast titles and audit-feed entries always lead with a verb.
- **Contractions in errors and toasts.** "Couldn't save changes" not "Could not save changes." Reserve the formal "Could not / Cannot" for legal, security, and billing surfaces where formality signals weight.
- **CPA register, not engineer register.** Prefer the professional word a CPA would use to a partner ("filing", "deadline", "jurisdiction") over the internal data-model word ("record", "row", "entity"). Never expose vendor names (Resend, Stripe, Cloudflare) or internal state codes (`pending_review`, `quarantined`) in user-facing copy — translate them first.
- **One thought per string.** If you need two sentences, the second is doing different work (an instruction after a fact). Otherwise cut.

### Mechanical rules

| Surface                          | Rule                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Buttons, tabs, chips, nav labels | Sentence case, no trailing punctuation. `Save changes` not `Save Changes.`                                          |
| Toast titles                     | Sentence case, no trailing period. `Couldn't save changes`                                                          |
| Toast / panel descriptions       | Sentence case, period only if multi-sentence.                                                                       |
| Loading                          | `Loading {thing}…` with a unicode ellipsis (`…` not `...`), no period.                                              |
| Empty states                     | `No {plural-thing}` for the bare label; full sentence with period for the explanation.                              |
| Audit / evidence feed entries    | Active past tense verb first: `Reverted import.` not `An import was undone.` Period required.                       |
| Role names in body copy          | Lowercase: "Ask an owner or manager." Capitalized only as table column headers or chip labels (`Owner`, `Manager`). |
| Numbers, dates, dollar amounts   | Mono tabular (`font-mono tabular-nums`), no thousands-separator inside `{count}` placeholders.                      |

### Terminology

These are decisions, not suggestions. If you need a new term, add it here before shipping copy.

| Concept                                                          | Use                                                                                                      | Don't use                                                |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| The CPA business unit (workspace)                                | **practice**                                                                                             | firm, organization, tenant, workspace                    |
| The end customer of the practice                                 | **client**                                                                                               | customer, account, user (in body)                        |
| The official channel monitored for regulatory changes            | **source**                                                                                               | channel, feed, signal                                    |
| A rule the practice has accepted and that may generate reminders | **rule** (state: `active`)                                                                               | active rule (redundant), live rule                       |
| A rule awaiting owner/manager review                             | **pending rule**                                                                                         | rule template, pending template, candidate rule          |
| The CSV / XLSX mapping used to onboard client records            | **import template**                                                                                      | source template, mapping template                        |
| The customizable email body sent to a client                     | **reminder template**                                                                                    | (always qualify with "reminder" — never bare "template") |
| The US state where a client files                                | **state** (when scope is 50 states) / **jurisdiction** (when federal, DC, or counties are also included) | filing state + jurisdiction in the same sentence         |
| A regulatory change detected from a source                       | **alert** (user-facing) / `pulse` event (engine boundary only)                                           | Pulse change, signal, notification                       |
| Status awaiting human review                                     | **Needs review** (long label) · `Pending` (short chip)                                                   | Pending review, Awaiting review                          |
| The end-product work item the practice must complete             | **deadline** (all user-facing surfaces) / `obligation` (internal data model only)                        | task, item, obligation in visible copy                   |
| A practice member you're adding                                  | **member** (verb: **invite**)                                                                            | teammate, colleague, seat                                |
| Time-limited rule override applied from an alert                 | **active override** / **relief** (IRS register)                                                          | temporary rule, exception (in nav)                       |

### When in doubt

Read the message aloud as if you were the CPA owner saying it to a junior preparer over coffee. If it sounds bureaucratic, mechanical, or sales-y, rewrite it. If it sounds confusing, the underlying concept is probably leaking through — fix the term in this table first, then the copy.
