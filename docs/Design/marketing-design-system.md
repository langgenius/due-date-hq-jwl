# Marketing design system (`--m-*`)

The DueDateHQ marketing site (`apps/marketing`, Astro) has its own **semantic token tier**,
`--m-*`, that maps onto the SHARED `@duedatehq/ui` primitives — never onto raw hex. The product
UI keeps its own (denser) tier; both resolve to the same primitive palette, so the brand
navy/cyan/scales stay in one source of truth.

- **Single file:** `apps/marketing/src/styles/marketing.css` (imported via `globals.css`).
- **Light only** this pass. Every colour resolves through a semantic token that already has a
  dark variant in `semantic-dark.css`, so dark mode is a later retrofit, not a rewrite.
- **Rule:** new marketing components reference `--m-*` and the shared `.m-*` classes; they never
  hardcode `#2E368C`, gray hexes, durations, or focus rings.

This doc was produced during the 2026-06-22 site-wide system pass.

---

## 1. Type scale

Two type families do the work: a **display serif** (`Instrument Serif`) reserved for the hero
headline only, and a **sans** (`Instrument Sans`) for everything else. `Geist Mono` carries
data/dates/meta. The marketing scale is **fluid** (`clamp`) end-to-end; the values below are
`min → max` across the viewport range.

| Step | Class | Family | Size (min→max) | Line-height | Tracking | Role |
|---|---|---|---|---|---|---|
| Display | _(scoped in `Hero.astro`)_ | display serif | 40 → 76px | 1.02 | — | Hero headline ONLY. Out of the shared layer by design. |
| Page title | `.m-page-title` | sans 600 | 30 → 48px | 1.08 | -0.02em | Long-tail page H1 (rules · comparisons · guides · states · trust · pricing). `max-width: 18ch`. |
| Section H2 | `.m-h2` | sans 600 | 29 → 44px | 1.08 | -0.02em | Home section headlines. Supports `.ital` (italic span). |
| Page H2 | `.m-page-h2` | sans 600 | 22 → 30px | 1.20 | -0.015em | Long-tail block headings. `max-width: 24ch`. |
| CTA title | `.m-page-cta__title` | sans 600 | 22 → 28px | 1.25 | -0.015em | CTA-block headline. `max-width: 22ch`. |
| Lead | `.m-lead` | sans 400 | 17 → 20px | 1.55 | — | Home section lead paragraph. **Now capped at `--m-measure` (68ch).** |
| Page lead | `.m-page-lead` | sans 400 | 16 → 18px | 1.60 | — | Long-tail page lead. `max-width: 60ch`. |
| Body | `.m-page-body` | sans 400 | 15px | 1.70 | — | Long-tail flowing body. `max-width: 44ch` (narrow split column). |
| Card title | `.m-card__t` | sans 600 | 15px | 1.40 | — | Card / FAQ / trust-item title. |
| Card desc | `.m-card__d` | sans 400 | 13px | 1.65 | — | Card supporting copy (`--m-muted`). |
| Eyebrow | `.m-eyebrow` | sans 600 | 12px | — | `--m-ls-eyebrow` (0.14em), uppercase | Section kicker (`--m-faint`). |
| Note / meta | `.m-page-note`, `.m-page-reviewed` | mono | 12px | 1.50 | — | Mono meta (footnotes, "last reviewed"). |

### Scale logic / contrast

- **Display contrast is intentional.** The serif hero (≤76px) is the single dominant note; the
  next step down (`.m-page-title` / `.m-h2` at 44–48px) sits a clear tier below it — ratio ≈ 1.6.
- **Heading steps** land at roughly 48 / 44 / 30 / 28 at the wide bound. `.m-page-title` (48) and
  `.m-h2` (44) are close (≈1.09) **but never co-occur** — one is the long-tail H1, the other the
  home section head. The same is true of `.m-page-h2` (30) vs `.m-page-cta__title` (28). They are
  deliberately *not* merged because their `max-width` ch caps and roles differ.
- **Line-height tightens with size**: 1.02 display → 1.08 large heads → 1.20–1.25 mid heads →
  1.55–1.70 body. Larger type gets tighter leading; flowing body gets looser leading.
- **Tracking matches**: large heads get negative tracking (-0.02 / -0.015em) to close the gaps
  optical size opens up; body/lead run at default; eyebrows get the +0.14em uppercase treatment.

---

## 2. Spacing & rhythm

| Token / value | Where | Purpose |
|---|---|---|
| `.m-section` `padding-block: clamp(56px, 8vw, 104px)` | every home section | the airy home vertical rhythm |
| `.m-page-hero` `padding-block: clamp(48px,7vw,84px) clamp(32px,4vw,48px)` | long-tail hero | denser than home, asymmetric top/bottom |
| `.m-page-block` `padding-block: clamp(40px,5vw,64px)` + top hairline | long-tail content blocks | stacked editorial rhythm, tighter than home |
| `--m-eyebrow-gap: 16px` | `.m-eyebrow` margin-bottom | one canonical eyebrow→title gap |
| `--m-col-gap: clamp(20px,2.4vw,32px)` | 12-col grids | grid gutter |
| split gap `clamp(28px,4vw,48px)` | `.m-page-split` | lead↔cards gap |
| card grid gap `clamp(14px,1.6vw,18px)` | `.m-page-cards`, `.m-page-grid-3` | card grid gutter |

The rhythm is coherent: home sections are the airiest (up to 104px), long-tail blocks one tier
tighter (up to 64px), heroes between them. Internal margins cluster around a 14 / 16 / 18 / 20 /
24 / 28px family. No ad-hoc one-off values were found that warranted nudging this pass.

---

## 3. Readable measure

Flowing copy is capped so lines never exceed a comfortable reading length on wide viewports.

- **`--m-measure: 68ch`** — new shared ceiling (~66–70ch) for flowing body/lead.
- Applied to `.m-lead` this pass (it was previously **uncapped** — the one gap found).
- `.m-page-lead` (60ch), `.m-page-body` (44ch), `.m-page-cta__body` (62ch) already cap tighter
  and intentionally — left as-is.
- Headings cap by **ch** too (`.m-page-title` 18ch, `.m-page-h2` 24ch, CTA title 22ch) so titles
  wrap into pleasing 2–3 line stacks rather than one long line.

---

## 4. Colour

All `--m-*` colours resolve to shared semantic tokens, which resolve to the primitive palette.

| Token | Resolves to | Purpose | Notes |
|---|---|---|---|
| `--m-accent` | `primary-600` (#2E368C) | brand navy — primary button, links, focus ring | brand colour, unchanged |
| `--m-accent-strong` | `primary-700` | hover / pressed navy | |
| `--m-accent-tint` | `primary-50` (#eef0fb) | faint navy wash | |
| `--m-cyan` | `brand-highlight` (#14C5F6) | cyan — **delight surfaces only** | unchanged |
| `--m-ink` | `text-primary` → gray-900 `#101828` | headings / strong text | navy-tinted near-black |
| `--m-ink-2` | `text-secondary` → gray-700 `#354052` | body | navy-tinted |
| `--m-muted` | `text-tertiary` → gray-500 `#676f83` | supporting | |
| `--m-faint` | `text-quaternary` | eyebrows / meta | |
| `--m-on-accent` | `text-inverted` | text on the navy band | |
| `--m-canvas` | gray-100 `#f2f4f7` | cold page base | |
| `--m-surface` | `background-default` (white) | cards | |
| `--m-section` | `background-section` → gray-50 `#f9fafb` | gray band | |
| `--m-hairline` / `--m-hairline-2` | `divider-regular` / `divider-subtle` | borders | rgba navy-tinted |
| `--m-urgent` / `--m-ok` / `--m-danger` | warning / success / destructive text | risk semantics (red = risk only) | |

### Tint + contrast notes

- **The neutrals are already navy-tinted at the primitive tier** — `#101828`, `#354052`,
  `#676f83` all carry a cool/blue cast; none is a pure gray. The brief's "neutrals tinted toward
  navy" goal is therefore **already met upstream**, and those primitives are SHARED with the
  product UI, so they were deliberately **not** touched (would be a cross-app regression).
- **Contrast (on white `#fff`):**
  - `--m-ink` `#101828` → ~17:1 (AAA)
  - `--m-ink-2` `#354052` → ~10:1 (AAA)
  - `--m-muted` `#676f83` → ~5.3:1 (AA for normal text)
  - `--m-faint` (gray-400 `#98a2b2`) → ~2.6:1 — **eyebrows/meta only**, where it runs uppercase
    or as large/mono meta; acceptable for non-essential supporting text but should not carry body
    copy. (Noted as a watch-item, not changed.)
- Accent usage is purposeful: navy = the one action colour (primary button, links, focus); cyan
  is reserved for delight surfaces; red strictly for risk.

---

## 5. Grid

A single 12-column editorial grid, expressed as three tokens:

- `--m-maxw: 1240px` — one shared container width (`.m-section` max-width).
- `--m-gutter: clamp(22px, 5vw, 64px)` — page margins (`.m-section` inline padding).
- `--m-col-gap: clamp(20px, 2.4vw, 32px)` — the 12-col gutter.

Used by `.m-page-split` (`grid-template-columns: repeat(12, minmax(0,1fr))`) with a **5 / 7**
split (`.m-page-split__lead` spans 5, `.m-page-cards` spans 7). Responsive collapse:

- `≤1023px`: split columns go full-width (`1 / -1`); cards drop to 2-up.
- `≤560px`: card grids drop to 1-up.

---

## 6. Motion & timing

Progressive-enhancement reveal + a shared timing vocabulary.

- **Reveal:** `.m-js [data-reveal]` sets the hidden pre-reveal state (opacity 0, `translateY(18px)`)
  **only when JS is on** (`.m-js` is set on `<html>` before paint). GSAP (`ScrollMotion.astro`)
  animates to visible. Without JS, every `[data-reveal]` stays fully visible.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` forces `[data-reveal]` visible
  with no transform. `globals.css` also disables smooth scroll under reduced-motion.
- **Shared timing tokens (new this pass):**
  - `--m-ease: cubic-bezier(0.22, 1, 0.36, 1)` — gentle ease-out.
  - `--m-dur-fast: 0.16s` — hovers, focus, small affordances.
  - `--m-dur: 0.24s` — default state change.
  - `.m-btn` now consumes `--m-dur-fast` / `--m-ease` (same effective value as before — purely a
    tokenization, no visual change). Other components may opt in; nothing is forced onto them.

---

## 7. Focus visibility

There was **no global keyboard-focus treatment** on the marketing surfaces before this pass. Added:

- Tokens: `--m-focus-ring: var(--m-accent)` (on-brand navy), `--m-focus-width: 2px`,
  `--m-focus-offset: 2px`.
- Rule: `.m-section :where(a, button, [tabindex]):focus-visible, .m-btn:focus-visible` →
  `outline: 2px solid navy; outline-offset: 2px`.
- **`:focus-visible` only** — mouse/touch users never see the ring; keyboard users always do.
- `:where()` keeps the element-type part **zero-specificity**, so any component that already ships
  its own focus style wins. This is purely a baseline for the many raw `<a>`/`<button>` in
  editorial markup.
- Scoped to `.m-section` (+ `.m-btn`) on purpose — it does **not** reach the sticky nav/footer
  chrome, which ship their own dark-surface styles and should not get a navy ring.

---

## Recommendations not yet applied (judged too risky / out of scope this pass)

1. **`SectionEyebrow.astro` primitive uses `tracking-[0.18em]`** while the `.m-eyebrow` class uses
   `--m-ls-eyebrow` (0.14em). Two eyebrow implementations with different tracking. Converge on the
   token — but that's a **component edit** (out of scope for the CSS-only pass).
2. **`--m-faint` (gray-400, ~2.6:1 on white)** is below AA. It's used for eyebrows/meta only, which
   is defensible, but any place it carries essential text should step up to `--m-muted`. Audit at
   the component level before changing the token (it's shared).
3. **`.m-page-note` measure is 70ch** — marginally above the new 68ch ceiling. It's mono meta, so
   left alone; could adopt `--m-measure` for full consistency.
4. **`.m-h2` / `.m-page-title` near-collision (44 vs 48px)** is harmless today because they never
   co-occur. If a future page ever shows both, consider a deliberate one-step separation.
5. **Dark mode** is a deliberate non-goal this pass; the token mapping already supports a later
   retrofit via `semantic-dark.css`.
6. **Adopt `--m-dur`/`--m-ease` in component-scoped transitions** (Hero, nav, cards) for a fully
   unified motion feel — component edits, deferred so as not to risk the just-shipped pages.
