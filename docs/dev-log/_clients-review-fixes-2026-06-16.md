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

## Cluster 3 — master/detail row feedback + empty state
- **Opened row had no selected state [P1]**: clicking a filing row opens the
  obligation in the side panel (`activeObligationId`), but that id was never
  threaded into `DeadlineRow`, so `isActive` stayed false and nothing showed
  which row produced the open panel. Threaded `activeObligationId` →
  `ClientWorkPlanPanel` → `FilingPlanYearSection` → `DeadlineRow isActive`
  (the accent fill already existed) and added `aria-current="true"` on the
  active row. Verified live: the open row now carries the accent + announces
  as current.
- **Filing-plan empty state de-jargoned [P1]**: "Run migration or generate
  rules…" (engineering verbs, no next step) → "Add this client's filing
  state and entity type in Setup, and the rule library generates its
  deadlines automatically" — CPA-facing, points to the Setup tab.

Deferred (scoped follow-ups, need DeadlineRow keyboard/aria rework or
panel-level handling, riskier than warranted here):
- The inline-expand disclosure chevron never rotates on this surface (the
  row opens a panel, not inline content) — now cosmetically a static "open"
  affordance; a proper open-in-panel glyph / mode is a follow-up. `isActive`
  + `aria-current` resolve the core "no feedback" problem.
- Keyboard Escape on a focused row doesn't close the panel it opened (best
  fixed at the panel level — Escape-to-close on the obligation aside).
- Filing-plan tab count (unbounded) vs rows (capped 100) — only diverges at
  >100 deadlines/client (documented rare edge); add "showing N of M" later.

Cohort decisions flagged, NOT changed (would fork app-wide conventions):
- Filing-plan column legend `font-bold` (700) uppercase micro-label — the
  identical class is the convention on /alerts + ~15 surfaces; changing one
  line forks the cohort. Type-weight cap vs convention is an app-wide call.
- Four Setup section frames hand-roll `rounded-lg border p-4` rather than the
  Card primitive — but Card adds `shadow-xs`; the shadowless inset-frame is
  the app-wide inset-section pattern, so converting would add unwanted lift.

Note: ClientWorkPlanPanel also carries the prior (stopped) session's
floating-bar scroll-clearance change (complete, builds on the earlier
TabSection refactor) — included here since it's clients work in a file this
pass owns.

tsgo clean; master/detail highlight verified live on Meridian.
