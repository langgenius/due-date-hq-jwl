# 87th pass · Deferred bundle — closing the A→L follow-ups

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## What this pass attempts

The A→L audit listed six items as "deferred" — work that needed a
design judgment or design call before mechanical sweep was safe.
This pass works through all six in priority order. Three ship code,
three are honestly examined and reconciled as "audit only" with the
rationale documented for the next time someone considers them.

| Item                                          | Status                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| F-money — `formatDollarPrice` helper          | ✅ Shipped, 2 sites swept                                                                                      |
| G3 — motion-reduce on high-motion transitions | ✅ Shipped, 7 sites annotated                                                                                  |
| C3 — meta-label Badge variant                 | ⊘ Reconciled — sites are paired-with-context, not standalone                                                   |
| C2 — ChipToggle primitive                     | ⊘ Reconciled — sites use semantically different active palettes                                                |
| C4 — TriggerShell extraction                  | △ Partial — local `DropdownTriggerButton` in obligations.tsx (3 sites); broader cluster has too much variation |
| E3 — ListPageShell / filter unification       | ⊘ Reconciled — toolbar layer is deliberately custom per surface                                                |

## F-money — `formatDollarPrice` helper

**Shipped.** New helper in `apps/app/src/lib/utils.ts`:

```ts
export function formatDollarPrice(dollars: number): string {
  return new Intl.NumberFormat(intlLocale(), {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars)
}
```

Operates on **whole dollars** (distinct from `formatCents` which takes
integer cents). Locale-respecting via `intlLocale()` (the previous
hand-rolled `$${n.toLocaleString('en-US')}` hard-coded en-US).

Sites migrated:

- `apps/app/src/routes/billing.checkout.tsx:65`
- `apps/app/src/routes/billing.tsx:76`

## G3 — Reduced-motion opt-out

**Shipped.** The G3 dev-log flagged 11/124 transitions had
`motion-reduce:` modifiers and noted the remaining 113 were mostly
non-essential color/opacity transitions. Reviewing the inventory of
_motion-sensitive_ transitions (transform/width/height/grid-row
animation) flagged 16 candidates; 9 of those were small chevron
rotations (≤ 8px arcs), which `prefers-reduced-motion` is not
designed to suppress (WCAG 2.3.3 targets vestibular triggers —
parallax, large slides, swooping motion).

The 7 genuinely vestibular-sensitive transitions now opt out:

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx:2971` — full
  client-detail panel slide (xl+ width animation)
- `apps/app/src/features/migration/WizardShell.tsx:412` — wizard
  progress-bar width fill (500ms)
- `apps/app/src/routes/rules.pulse.tsx:105` — pulse panel layout
  resize when right-side detail opens
- `apps/app/src/routes/rules.library.tsx:1782` — rule-catalog
  breakdown bar segment width animation
- `packages/ui/src/components/ui/sidebar.tsx:385` — sidebar width
  collapse
- `packages/ui/src/components/ui/sidebar.tsx:419` — sidebar inset rail
  width
- `apps/app/src/features/billing/upgrade-cta-button.tsx:36` — 500ms
  shimmer sweep on the upgrade CTA pseudo-element (hides via
  `motion-reduce:before:hidden` rather than just `transition-none`,
  since the pseudo-element exists only for the motion)

Chevron rotations on disclosure toggles (`needs-attention-card`,
`coverage-tab`, `obligations`, `rules.library`, `settings`) keep
their transitions — 8px arcs are not vestibular triggers and would
feel broken-frozen with reduced motion.

## C3 — Meta-label Badge variant (reconciled, not shipped)

The original C3 deferral pointed at 3 sites. Re-examination shows
each is **paired-with-context**, not standalone drift:

- `ClientFactsWorkspace.tsx:5126` (entity-type pill) — its
  className is **deliberately matched** to the owner pill on the
  same row (h-7 / px-3 / border-divider-regular / bg-background-default).
  The in-file comment makes this explicit: "the two pills read as
  one coherent meta row." Lifting it to a Badge variant would break
  the visual pairing or force the owner pill to migrate too —
  cascading scope.
- `ClientFactsWorkspace.tsx:2661` (count bubble on tab trigger) —
  unique tab-bubble shape (`h-4 min-w-4 text-[10px]`), not a meta
  label.

Neither is a clean Badge variant target. **No migration; finding
documented.**

## C2 — ChipToggle primitive (reconciled, not shipped)

The C2 deferral pointed at 3 sites. Examination shows:

- `ClientFactsWorkspace.tsx:4913` is a dropdown **trigger**, not a
  toggle — opens a popover; active state is implicit (menu open).
- `obligations.tsx:10732` active state: `border-accent-default
bg-accent-tint font-medium text-text-accent` (accent tint).
- `rules.library.tsx:1888` active state: `border-text-primary
bg-text-primary text-text-inverted` (inverted solid).

The two real toggles use **semantically different active palettes**
(accent-tint vs inverted-solid). A unified primitive would either
need a `tone` API that bakes in the two different visual languages,
or it would force one site to change visually. The mismatched
palettes suggest these are deliberate per-context calls, not drift.

**No migration; finding documented.**

## C4 — Trigger-shell extraction (partial)

The C4 deferral inventoried 8 raw `<button>` "combobox / select
trigger" shells. Examination reveals two structural clusters:

**Cluster A — Input-style triggers (`bg-components-input-bg-normal`)** — 6 sites:

- `iso-date-picker.tsx`, `ClientCombobox.tsx`, `timezone-select.tsx`,
  `CreateObligationDialog.tsx` (×2), `generation-preview-tab.tsx`

These share a token-namespaced look that matches the design-system
`<Input>` primitive, but mix `h-8/h-9 + rounded-lg/rounded-md +
px-2.5/px-3` variations per call-site. A primitive would have to
encode the sizing mismatch — not yet a clean win. Defer until either
the design system promotes a "ComboboxTrigger" with its own opinion
or a UX pass aligns the sizing.

**Cluster B — Popover-style triggers (`bg-background-default`)** — 3 sites:

- `routes/obligations.tsx:4033` (export client picker)
- `routes/obligations.tsx:6650` (calendar vs fiscal year picker)
- `routes/obligations.tsx:7314` (email recipient picker)

Sites 4033 and 6650 are **byte-identical** class strings (h-9). Site
7314 is the same shape at h-10 with a disabled state. All three live
in one file. **Shipped: local `DropdownTriggerButton` helper inside
obligations.tsx** with a `size` prop (`'default'` = h-9, `'lg'` = h-10

- text-left + disabled handling). Three call-sites swap to:

```tsx
<DropdownMenuTrigger
  render={
    <DropdownTriggerButton size="lg" disabled={…}>
      <span className="truncate">{label}</span>
      <ChevronDownIcon …/>
    </DropdownTriggerButton>
  }
/>
```

Kept as a **local helper**, not promoted to `@duedatehq/ui`. Cluster
A's variation suggests there isn't yet a stable cross-app abstraction;
all three current callers live in one file.

## E3 — ListPageShell / filter unification (reconciled, not shipped)

The Layer E3 deferral asked whether a unified `<ListPageShell>`
primitive could converge filter chrome across list pages.

The 8 list-page surfaces (`/deadlines`, `/clients`, `/rules/library`,
`/alerts`, `/calendar`, `/audit`, `/members`, `/opportunities`) DO
share a top-level sequence: **PageHeader → toolbar → Table →
Pagination**. But:

- `PageHeader` is already canonical (28 instances).
- `Table` is already canonical (the design-system primitive).
- The **toolbar layer between them is structurally different per
  surface**: /deadlines uses 4× FilterTrigger; /alerts uses 1 +
  state-tilegram filter; /clients uses a vertical filter panel
  inside `ClientFactsWorkspace`; /rules/library uses an active-filter
  banner + per-state-row inline filtering. Each toolbar shape
  encodes a different filter UX, not drift.

A `<ListPageShell>` wrapping this sequence would mostly be typing +
slot organization, not a visual unification. The win would come from
a UX pass deciding "every list page should have the same filter
affordance" — that's a design redesign, not a token sweep. **No
migration; finding documented.**

The genuine "list-page composition pattern" is now documented here
for future passes:

```
<PageContainer>
  <PageHeader title eyebrow breadcrumbs actions description />
  {/* Toolbar — per-surface filter shape */}
  <Table>{/* via design-system primitive */}</Table>
  <Pagination />
</PageContainer>
```

## Verification

- `pnpm exec tsc --noEmit` clean for `apps/app`.
- 3 commits' worth of changes in this single pass touching: 1 new
  helper (formatDollarPrice), 1 new local component
  (DropdownTriggerButton), 7 motion-reduce annotations, 2 dollar-price
  migrations, 3 dropdown-trigger swaps.

## Cumulative tally — final (Layers A → L + deferred-bundle)

| Layer            | What snapped to a token / primitive         | Sites                                                                                   |
| ---------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| A (app)          | `tracking-eyebrow`                          | 33                                                                                      |
| A (ui+marketing) | `tracking-eyebrow`                          | 4                                                                                       |
| A-tight          | `tracking-eyebrow-tight` (new token)        | 8                                                                                       |
| B1 (app)         | `disabled:opacity-50`                       | 4                                                                                       |
| B1 (ui)          | `data-disabled:opacity-50`                  | 1                                                                                       |
| B2 (app)         | `focus-visible:ring-…`                      | 7                                                                                       |
| B2 (marketing)   | `focus-visible:ring-…`                      | 16                                                                                      |
| C1               | `PulseConfidencePill` (extracted)           | 2 files / 5 pill blocks                                                                 |
| C2               | _(audit only — semantically distinct)_      | 0                                                                                       |
| C3               | _(audit only — paired-with-context)_        | 0                                                                                       |
| C4               | local `DropdownTriggerButton`               | 3                                                                                       |
| D-ease           | `ease-apple` (new token)                    | 5                                                                                       |
| E                | _(audit only — clean)_                      | 0                                                                                       |
| E3               | _(audit only — toolbar custom per surface)_ | 0                                                                                       |
| F                | `formatDatePretty` (relative-time fallback) | 1                                                                                       |
| F-money          | `formatDollarPrice` (new helper)            | 2                                                                                       |
| G                | _(audit only — clean)_                      | 0                                                                                       |
| G3               | `motion-reduce:` on high-motion             | 7                                                                                       |
| H                | _(audit only — clean)_                      | 0                                                                                       |
| I                | _(covered by D-ease)_                       | 0                                                                                       |
| J                | _(audit only — clean)_                      | 0                                                                                       |
| K                | `z-[70]` escape hatch annotated             | 1 (doc)                                                                                 |
| L                | _(audit only — clean)_                      | 0                                                                                       |
| **Total**        |                                             | **92 sites · 5 pill blocks deduped · 3 new tokens · 2 new helpers · 1 local primitive** |
