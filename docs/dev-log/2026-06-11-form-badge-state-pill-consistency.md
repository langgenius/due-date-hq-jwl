# 2026-06-11 — Form-badge + state-pill consistency sweep (all pages)

**Ask (Yuqi):** the form badge and the state pill must look the same on every
page — no per-surface variants, no missed details.

**Canon applied:** form badge = `TaxCodeBadge` (`primitives/tax-code-label`:
mono, `rounded-sm`, `bg-background-subtle`, `font-medium`, tooltip); state
pill = `Badge` (`ui/badge`) on the §4.10 tone ladder. Both swept app-wide.

## Form badge

- `TaxCodeBadge` grew the ONE sanctioned density variant: `size="compact"`
  (`px-1.5 py-0.5 text-caption-xs`, same chrome). Freelance className
  overrides of radius/bg/weight/padding are now banned (DESIGN §4.11 row
  added).
- Converted hand-rolled / drifted sites to the primitive:
  - `PulseAlertRow` + `AlertListRail` — dropped the `rounded-lg` corner
    override (the pulse-alert-chrome contract itself said "no className
    override on /alerts").
  - `PulseFormRevisedCard` AFFECTING pills — was a 12/700 bg-section span
    (Pencil QbZPm one-off); now stock TaxCodeBadge. Empty state renders a
    plain "—" instead of a dash-chip.
  - `Step3Normalize` (migration matrix) — raw snake_case codes in a
    rounded-lg panel-bg span → `TaxCodeBadge size="compact"` (human label +
    tooltip for free).
  - `generation-preview-tab` TAX TYPES chips — rounded/white span → stock.
  - `ClientDetailWorkspace` active-alerts card — `Badge variant="secondary"
uppercase` → TaxCodeBadge.
  - `DeadlineNavigatorRail` — its padding/text overrides became
    `size="compact"`.
  - Deleted `PulseFormChip.tsx` (unused, redundant with TaxCodeBadge).
- Intentionally NOT converted: jurisdiction-rule-table TYPE column (label is
  jurisdiction-stripped on purpose — now a `Badge variant="outline"`
  reference tag, not a TaxCodeBadge).

## State pill

- **Alerts:** `AlertStatusChip` (drawer hero) rebuilt on `Badge` with shared
  `ALERT_STATUS_VARIANT` + `ALERT_STATUS_ICON` exported from
  `AlertStatusBadge` — previously the SAME status painted amber-filled in
  the drawer and outline on the card (`matched`), the per-surface remapping
  §4.10 bans. Labels stay per-surface ("Awaiting decision · 2h" vs "Open";
  density-driven copy, same look). Verified side-by-side in /preview.
- **Rules / jurisdiction table:** hand-rolled STATUS_PILL + SEVERITY_PILL
  spans → Badge. Tone fix: `pending_review`/`candidate` now `info` (blue) —
  the hand-rolled pill painted them amber, contradicting both
  rules-console-model ("review is accent blue, NOT warning") and the blue
  leading row dot on the same row. Severity = `shape="square"` eyebrow chip
  (matches the alerts impact-chip family).
- **Rules / coverage tab:** `RuleStatusChip` + `RuleSelectionUnavailableChip`
  micro-spans (old `status-review`/`severity-medium` token family) →
  `Badge size="sm"` with info/warning/success/secondary.
- **Members:** Member/Invitation pills dropped the `rounded-sm` override —
  status pills are `rounded-full` per §4.10's shape table; stock Badge
  default size IS the old h-5/px-2/text-xs, so only the radius visibly
  changes.
- **Temporary rules:** dropped the freelance `h-[22px]` → stock Badge h-5.
- **Auth chrome:** `AuthStatusPill` hand-rolled `<a>` → `Badge
variant="outline"` + `BadgeStatusDot` with `render={<a/>}` (established
  pattern, cf. MonitoringChip).
- **Onboarding:** "{n} to review" hand-rolled warning span →
  `CountPill tone="warning"`.

**Commit boundary note:** the `jurisdiction-rule-table.tsx` pill hunks are
entangled with the parallel session's in-flight review-scope column work
(`scope` prop wired from `rules.library.tsx`), so they land with that
session's rules-table-polish commit rather than this one. `Step3Normalize`
was hunk-split: only the TaxCodeBadge change is in this commit; the motion
token swap stays with its owner.

## Verification

- `tsgo --noEmit` clean. Live-checked in preview: /rules/library table
  (outline TYPE, square MED, soft-green Active), /alerts form chips
  (4px radius, bg-subtle, weight 500), /preview AlertStatusBadge vs
  AlertStatusChip (identical bg/tone per status), /accept-invite auth pill
  (outline Badge + dot, renders as link).
- Note: Vite's watcher missed two writes mid-session (parallel session
  active in the same worktree); `touch` re-triggered the transform. Stale
  console-log buffer entries can show pre-fix ReferenceErrors — check the
  served module (`curl /src/...`) before trusting them.

## Left alone (documented intentional)

- Alert impact/severity + action pills in `pulse-alert-chrome` (Pencil-exact
  hex family, one shared source already; different semantic family from the
  status pill).
- Jurisdiction 2-letter code chips (reference tags, not form badges).
  → converged later the same day into the `JurisdictionChip` primitive,
  see `2026-06-11-jurisdiction-chip-active-queue-flag.md` (which also
  fixed the filled+dot ACTIVE queue flag).
- `ObligationStatusReadBadge` / `HealthBadge` / `AlertReadinessChip` /
  `AlertConfidencePill` / `MonitoringChip` — already on Badge with correct
  tones.
