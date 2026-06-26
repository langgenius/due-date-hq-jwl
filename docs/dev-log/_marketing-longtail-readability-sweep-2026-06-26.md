# Marketing long-tail templates — readability sweep (2026-06-26)

Follow-up to the home readability pass: swept the template components that fan out to the
~175 SEO pages (states, guides, comparisons, coverage, trust/legal, pricing). The recurring
defect: **`--m-faint` only clears WCAG AA (4.5:1) on white — placed on `--m-section` /
`--m-accent-tint` header/peek bars it silently drops under AA**, and that pattern repeats
across every page that uses these templates.

## Fixes (verified live)

- **`--m-faint` → `--m-muted` wherever it sits on a tint** (the cross-cutting rule):
  - `GeoResourcePage` `.geo-peek__tag` (on `--m-section` bar) + `.geo-facts__head-src`
    ("A source on every date", on `--m-section`).
  - `StateDetailPage` `.std-kd__source-lead` ("Source for this date" — the label for the
    page's most important link) was 10px `--m-faint` on `--m-section` (~4.3:1) → `--m-muted`
    and bumped 10px → 11px. Verified live: `#676f83`, 11px.
- **A11y — comparison tables had no accessible column headers on desktop.**
  `GeoResourcePage` `.geo-cmp__head` was `aria-hidden` while carrying the real
  "DueDateHQ"/competitor labels, and the per-cell labels are `display:none` on desktop — so
  desktop screen-readers got no column context. Dropped `aria-hidden` (the header is already
  `display:none` ≤720px where the cell labels take over, so no mobile duplication). Verified:
  header now exposes "DueDateHQ" / "File In Time".
- **Line length** → house measure: `StateDetailPage` `.std-limits` 80ch → `var(--m-measure)`
  (verified 685px = 68ch); `StateCoveragePage` `.stcov__row-body` 70ch → 64ch (matches the
  page's other bodies); `TrustPage` `.trustpg__note` 72ch → 64ch.
- **Hierarchy** — `StateCoveragePage` `.stcov__row-view` ("View coverage →") was 600,
  competing with the 600 row name → 500 (one anchor per row, per the type-weight canon).
- **Size** — `GeoResourcePage` `.geo-peek__src` (source label, real sentence) 12px → 13px;
  `Pricing` `.pr__mcadence` 11px `--m-faint` → 12px `--m-muted`.

## Home P3 (same pass)

- `Surfaces` caption rail said "See in the tour" 3× → destination-predicting labels
  ("See the live feed" / "See the worklist" / "See it apply"; coverage kept "See coverage").
  EN + zh.

Build 191 pages clean. Compare + state pages spot-checked live.

## Rule of thumb recorded

`--m-faint` is for eyebrows/meta **on white only**; switch to `--m-muted` the moment the text
sits on a `--m-section`/`--m-accent-tint` surface. Prevents the same regression site-wide.
