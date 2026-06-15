# Clients flow — exhaustive-review fixes (2026-06-16)

Ran a multi-agent review of the whole clients flow (9 dimensions, each
finding refuted-by-default through 3 independent verifiers). 38 raised, 16
adversarially-confirmed (≥2/3). Acting on the confirmed set in clusters.
(Many verifiers hit transient rate-limiting, so several raised findings were
dropped unverified — investigating those correctness ones separately.)

## Cluster 1 — Summary strip truthfulness under load
- **Fake zeros while loading [P1]**: the route skeleton gated only on
  `clientQuery.isLoading`, so once the client resolved the hero rendered
  Blocked 0 / Open 0 / Filed 0 with calm "None blocked / Nothing open"
  subtitles for the whole `obligations.listByClient` fetch. Threaded
  `isLoading={obligationsQuery.isLoading}` → `ClientSummaryStrip` →
  `StatBand loading` (the primitive's skeleton, already used by the list
  strip). The hero now shows a band skeleton, not false calm.
- **"Filed YTD" → "Filed" [P2]**: the stat is a status-based count
  (done/completed/paid) with no year-to-date window — the sibling /clients
  table column was deliberately renamed to "Filed" for exactly this reason,
  and the detail strip still said "YTD". Now both surfaces match. (This
  corrects my own earlier critique, which wrongly read these as two
  different metrics.)
- **Skeleton 3 tiles → 1 band [P2]**: the route skeleton rendered three
  `min-w-44` tiles while the real strip is a single full-width 5-column
  hairline band — a reflow jolt on paint. Replaced with the band-shaped
  `h-[100px] w-full` skeleton matching StatBand's own `loading` state, so
  skeleton→content doesn't reshape.

tsgo clean; "Filed" verified live on the detail strip.

## Cluster 2 — copy + accessibility
- **Reclassification mislabel [P1]** (ClassificationImpactDialog): the one
  dialog serves both reason kinds, but always said "Apply reclassification"
  / "Reclassified" / "Couldn't apply reclassification" — wrong for a
  data-entry correction. Branched the action copy on `reason.kind` (already
  in scope): corrections get "Apply change" / "Entity type updated" /
  "Couldn't update entity type."
- **Notes card nested interactive [P1 a11y]** (ClientNotesStrip): the whole
  card is `role="button"` and contained a focusable Edit `<Button>` — invalid
  nested-interactive content (two tab stops, ambiguous AT). The edit button
  opened the same editor as the card, so demoted the pencil to a decorative
  `aria-hidden` cue; the card stays the single control. Dropped the now-unused
  Button import.
- **Tax-attribute chips color-only [P2 a11y]** (ClientCompliancePosturePanel):
  on/off differed only by color + an aria-hidden check, so AT heard
  "Payroll", "Sales tax"… identically in both states. Added an `sr-only`
  ": active" / ": inactive" suffix (WCAG 1.4.1).
- **"(s)" plural hack [P3]** (ClientDetailWorkspace Setup-tab badge): the
  title/aria-label `${n} required fact(s) missing` was the only user-facing
  "(s)" in the app (a screen reader voices "open-paren s"). Replaced with a
  count ternary — not `plural()`, which crashes in a string prop (lingui
  footgun).
- **Phantom "Fix-now" [P3]** (FixNeedsFactsSheet): copy said "re-open
  Fix-now" but the real control is the "Fix now" button. Dropped the hyphen.

tsgo clean; detail page verified live.
