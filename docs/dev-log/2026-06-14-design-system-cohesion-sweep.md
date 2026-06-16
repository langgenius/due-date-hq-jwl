# 2026-06-14 — Design-system cohesion sweep (Today/Alerts/Deadlines/Rules)

`/design-critique` across the 6 core surfaces (Today, Alerts list, Alert
detail, Deadlines list, Deadline detail, Rule library): unify same-purpose
elements, find off-system values, sweep padding/gaps/radii/colours. Method:
deterministic scans (token discipline, off-scale radii, hardcoded color/shadow)

- 3 live computed-style inventory agents (one per 2 surfaces) + synthesis.

## Shipped

**Root-cause (its own entry, 2026-06-14-table-head-token-merge-fix.md):**
every table `<th>` rendered 13px/700 instead of 12px/600 — `cn()` dropped the
`text-column-label` size token against the color. Registered the full custom
`--text-*` family in tailwind-merge. Fixes every table header app-wide.

**Off-system token violations (Batch 1):**

- `rounded-md` (6px, off the 12/8/4 scale) → `rounded-lg`/`rounded`: nav-rail
  icon buttons, rule-drawer FactChip, deadlines skeletons.
- `font-bold` (700) on a chip eyebrow → `font-semibold`.
- arbitrary `text-[11px]` eyebrows/count-pills → `text-caption-xs`;
  `text-[16px]` urgency due-date → `text-lg` (16px token).
- `PulseFormRevisedCard`: dropped hardcoded `#6B21A8` (change-kind) and the
  `#92400E` + `-rotate-[11deg]` + bold NEW badge → token ink + canonical
  warning `Badge`. (Removed the only rotated element in the product.)
- preset.css caption comment corrected (claimed 10px; token is 11px).

**Cohesion (Batch 2):**

- Today "Priorities" table now matches the canonical /deadlines workbench
  cell metrics (12px x-inset + 14px body + h-9 header), was 20px/13px.
- Alerts SkeletonList borderless to match the loaded list (was flashing a
  frame border).

## Verified intentional — NOT discrepancies (corrected the audit)

- **SectionFrame (regular border) vs DetailSectionCard (subtle border)** is
  role-based and correct: table/surface cards app-wide use `divider-regular`
  (deadlines, clients, rules tables); in-pane detail sections use
  `divider-subtle`. Left as-is.
- Workbench vs registry table archetypes; `SearchInput` compact-vs-default
  variant; list-vs-detail jurisdiction richness; inset-shadow accent bars;
  data-value sizes (penalty $ text-2xl, priority score text-xl).

## Deferred — focused follow-up

CONTENDED (parallel session actively reworking these files — fix once settled):

- rules.library: `font-bold` on data (:4477/:915/:933), arbitrary
  `shadow-[0_-4px_12px_rgba(...)]` (:4229), raw inline `rounded-xl` cards (×4),
  and the section-title scale unification (text-xl/text-2xl headers →
  `text-region-title`/18 — this is where the title-scale drift actually lives).
- AlertDetailDrawer: `text-[11px]` ×2 (token-discipline), `font-bold` on the
  hero date value, raw `<a>` source link.

STRUCTURAL (own pass — needs a primitive change, not a className tweak):

- Hand-rolled "pick-one" selectors (Today buckets, Deadlines status strip) →
  extend `Segmented` to carry a leading dot + trailing count, then converge.
- Source link is hand-rolled 3 ways across alerts (row / rail / detail) → one
  `TextLink`-based treatment.

DEFERRED-minor: Deadlines toolbar height mix (search/filter h-36 vs buttons
h-32); alerts page container px-6 vs the px-8 standard.
