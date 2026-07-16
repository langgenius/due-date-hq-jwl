# Interaction Spec — Browse & Filter (CPA Field Guide homepage)

Scope: the primary interaction on `/` — orienting within the directory and narrowing it.
Grounded in the real implementation in `cpa-tools-directory.html` (source) → `deploy/build.mjs` → `deploy/index.html`.

## 0. Components in scope

| Component        | Selector                                      | Role                                                        |
| ---------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Section-nav tabs | `.secnav a[data-spy]`                         | Navigate/orient across the 4 category sections (scroll-spy) |
| Firm-size filter | `.segset button[data-filter="seg"]`           | Single-choice filter: Any / Solo / Small / Mid+             |
| Result count     | `.rescount[aria-live]`                        | Feedback on how many tools match                            |
| Card grid        | `.card[data-seg]` inside `.section[data-cat]` | The filterable content                                      |
| Empty state      | `#empty`                                      | Zero-result fallback                                        |
| FAQ accordion    | `details.qa`                                  | Secondary; native disclosure                                |

Two **independent** state machines run here: **Filter** (user-driven) and **Scroll-spy** (scroll-driven). They share the DOM (filtering hides sections that scroll-spy reads) — that coupling is where the one real bug lives (§6, G1).

---

## 1. State model

### 1a. Filter machine

Single dimension on the homepage: `seg ∈ {any, solo, small, mid}` (the code also has a `cat` dimension, but no category control renders on `/`, so `cat` is pinned to `all`).

```
        click Solo            click Small           click Mid+
 (any) ───────────▶ (solo) ───────────▶ (small) ───────────▶ (mid)
   ▲  ◀──────────────  │  ◀──────────────  │  ◀──────────────  │
   └──────────────── click Any (from any state) ───────────────┘
```

Every transition runs `apply()`, a pure recompute over the DOM:

- `card.display = segMatch(card, seg) ? '' : 'none'` where `segMatch` = `seg==='all' || card.dataset.seg.split(',').includes(seg)`
- `section.display = (visibleCardsInSection > 0) ? '' : 'none'`
- `rescount.hidden = (seg === 'all')`; else text = `"<N> of 25 tools"`
- `#empty.display = (totalVisible === 0) ? 'block' : 'none'`

Invariants: exactly one segment has `aria-pressed="true"`; the count reflects post-filter totals; there is no async, so transitions are synchronous and atomic.

### 1b. Scroll-spy machine

State: `active ∈ {tax, monitor, pm, ledger}`, reflected as `.secnav a.active` (accent underline).
Rule (rAF-throttled scroll handler): `line = scrollY + 120`; `active = last section whose absolute top ≤ line`, defaulting to the first. Always exactly one active — never blank, never stuck (verified: top→Tax, scroll→tracks, back-to-top→Tax).

---

## 2. Micro-interactions

| #   | Trigger                              | Response                                                                | Timing / easing           |
| --- | ------------------------------------ | ----------------------------------------------------------------------- | ------------------------- |
| M1  | Hover a section tab                  | text `--soft → --ink`                                                   | 150ms ease                |
| M2  | Tab becomes active (scroll or click) | 2px accent underline fades in; text → accent, weight 600                | 150ms (border-color)      |
| M3  | Click a tab                          | anchor jump to `#sec-*`; `scroll-margin-top:60px` clears the sticky bar | instant (native)          |
| M4  | Hover a firm-size segment            | text → `--ink`                                                          | 150ms                     |
| M5  | Press a segment                      | pressed pill: white bg + `0 1px 2px` shadow; `aria-pressed=true`        | 150ms bg/color            |
| M6  | Filter applied                       | count swaps to "N of 25"; non-matching cards/sections leave layout      | text swap; layout instant |
| M7  | Hover a card                         | border `--line → --accent-line`; soft shadow; visit-arrow slides in     | 180–200ms ease            |
| M8  | Card enters viewport (first view)    | fade + rise (`translateY 12→0`)                                         | 500/550ms ease-out cubic  |
| M9  | Toggle a FAQ row                     | `+` glyph rotates to `×` (45°)                                          | 200ms ease                |
| M10 | Logo image decodes                   | fades in over the monogram fallback                                     | 250ms                     |

---

## 3. Animation

Motion inventory and the single easing family:

- **Enter / reveal** (M8): `opacity .5s ease, transform .55s cubic-bezier(0.2,0.8,0.2,1)` — decisive ease-out, no bounce. Observed once per card via IntersectionObserver, then the class is stripped (motion is a one-shot, not a permanent style).
- **State transitions** (hover/press/underline): 150–200ms, `ease`. Fast enough to feel instant, slow enough to read as intentional.
- **Sticky bar**: gains `.scrolled` shadow when `scrollY > 8`, `box-shadow .2s ease` — a depth cue that the bar has detached from the header.
- **Chevron** (M9): 200ms rotate; the disclosure panel itself is native `<details>` (no height tween — see G4).
- **`prefers-reduced-motion: reduce`**: all transitions/animations `none !important`; reveal forced to final state. Verified present. Nothing essential is conveyed by motion alone.

Principle check: motion here is **functional** (orientation, state confirmation, entrance), never decorative loops. Durations sit in the 150–550ms "UI motion" band. One easing curve family (ease / ease-out cubic) keeps it coherent.

---

## 4. Gestures / pointer

| Surface          | Desktop                                              | Touch                                                                                          |
| ---------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Section tabs     | hover + click (anchor)                               | tap; whole bar is a horizontal drag-scroll strip on mobile                                     |
| Firm-size filter | click                                                | tap; targets 33px (mobile) / 29px (desktop) — above WCAG 2.5.8 min                             |
| Cards            | hover reveals affordance; click name/visit navigates | tap navigates; no swipe gestures (a directory row, not a carousel)                             |
| FAQ              | click summary                                        | tap summary; 44px+ target                                                                      |
| Page             | wheel/trackpad scroll → scroll-spy                   | momentum scroll → scroll-spy; `scroll-margin-top` keeps anchored jumps clear of the sticky bar |

No custom gestures, no drag, no long-press — deliberate. The bar’s horizontal scroll on mobile is the only non-obvious pointer affordance; it’s discoverable because the segmented control peeks at the right edge.

---

## 5. Feedback

Every action has an immediate, legible confirmation:

- **Navigation**: active tab underline (visual) + `aria-current="page"` on inner-page nav (SR).
- **Filter**: pressed segment (visual) + `aria-pressed` (SR) + the list visibly shortening + `rescount` "N of 25" (visual) announced via `aria-live="polite"` (SR).
- **Hover intent**: card border/shadow + visit arrow — signals "this row is clickable."
- **No dead ends**: the count tells you _why_ the list is shorter; the empty state (if reached) names the situation.

---

## 6. Error / edge paths

| Path                     | Current behavior                                                                                                                          | Verdict                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Zero results             | `#empty` shows                                                                                                                            | **Unreachable today** — every firm-size value matches ≥1 tool per section. Kept as future-proofing. |
| Broken/missing logo      | on `error`/no-`src`, JS removes the `<img>` → monogram initials show                                                                      | ✅ handled                                                                                          |
| **Scroll-spy vs filter** | a `display:none` section returns `getBoundingClientRect().top = 0`, which passes the `≤ line` test → could mark a _hidden_ section active | 🔴 **G1 bug** — fix below                                                                           |
| No-JS / crawler          | all cards + sections render; filters/scroll-spy inert; native `<details>` still opens                                                     | ✅ graceful, and good for indexing                                                                  |
| Mobile SR user filtering | `.rescount` was `display:none` on mobile → not announced                                                                                  | 🟡 **G2 gap** — fix below                                                                           |

---

## 7. Loading

There is **no async loading state, by design**: HTML is static, logos are inlined data-URIs (zero network), fonts are system + local serif (no FOUT). The only "loading-like" moment is first-paint, handled by the reveal-on-scroll (§M8) so content arrives progressively rather than all at once. No spinners or skeletons — inventing one would be dishonest UI.

---

## 8. Gaps this analysis surfaced

- **G1 (fix now, correctness):** scroll-spy must skip hidden sections. Guard with `el.offsetParent !== null`.
- **G2 (fix now, a11y feedback):** on mobile, make `.rescount` visually-hidden (sr-only) instead of `display:none`, so the "N of 25" is still announced to screen readers when filtering.
- **G3 (spec only, currently unreachable):** empty-state recovery — if the empty state ever becomes reachable (e.g. adding a category filter back), it should include a "Show all firms" reset, per search-UX canon.
- **G4 (optional polish):** animate the `<details>` open/close height (~200ms) and add a ~120ms opacity fade to filtered cards, if a softer feel is wanted. Low priority; instant is defensible.
