# Alerts-page Vibma sweep + sidebar icon refresh + state badges import

Date: 2026-05-25
Branch: `design/preview-integration`

Second Vibma export of the day, covering 14 items on `/rules/pulse`
(Alerts) plus three add-ons: a sidebar icon set swap, a state-badge
primitive import, and a clarification on the dashboard header that
last commit center-aligned the wrong axis.

## Cluster A — `/rules/pulse` route (#1, #13)

- Dropped the breadcrumb (`Rule library › Alerts`). Alerts is now a
  top-level sidebar destination — the parent crumb back to the rule
  library no longer reflects the IA. `RulesPageShell` keeps its
  `title="Alerts"` h1, just without the eyebrow row above it.

## Cluster B — AlertsListPage (#3, #10, #14)

- **#3 / #14 Compact, no extra frame.** Inner gaps drop from `gap-5`
  to `gap-4`; outer padding (standalone path) from `p-4 md:p-6` to
  `p-3 md:p-4`. The "frame inside a frame" feeling was the page-shell
  padding + the embedded wrapper's own gap stacking — tightening both
  is enough.
- **#10 Reset → ghost inline.** Was a saturated outline button on
  the right edge of its own flex row. Moved inline with the four
  filter dropdowns, `variant="ghost"`, so it reads as a tertiary
  affordance ("clear what you've set") instead of competing with the
  filters.
- **State-chip strip** now leads each chip with the imported
  `StateBadge` SVG (motif/flag) before the two-letter code. Reads
  like a row of flags — recognition before reading.

## Cluster C — PulseAlertCard (#4, #5, #6, #7, #11)

- **#4 PulsingDot removed.** The colored dot kept getting flagged as
  meaningless; the `New` / `Applied` / `Snoozed` status badge + the
  destructive-tone confidence badge + the change-kind chip already
  carry every signal the dot was encoding.
- **#5 / #6 Richer card.**
  - Leading `StateBadge` so the jurisdiction reads at a glance.
  - `PulseSourceBadge` promoted from the footer to inline next to
    the source name. The badge wraps a real `<a target="_blank">` —
    the CPA can open the official source without ever opening the
    drawer.
  - Added `alert.summary` as a body line under the title (line-
    clamp-2). The AI's one-sentence explanation of the source change
    is now scannable at the list level.
- **#7 Snooze/Dismiss inconsistency** clarified inline + via the
  Review button's `title`. Snooze and Dismiss only render for
  `status === 'matched'` — on terminal alerts the parent omits the
  handlers and the Review button's tooltip says "read-only." Yuqi
  was reading the asymmetry as a bug; it's the canonical signal that
  the alert is closed.
- **#11 Low-confidence cue deduped.** The `PulseConfidenceBadge`
  already renders in the destructive tone when `confidence < 0.7`;
  the separate `<p>Low AI confidence. Review source details before
applying.</p>` line below was showing the same cue twice. Drawer
  still has the explicit one-paragraph warning + reason copy for
  the deeper read.

## Cluster D — Sidebar icon refresh

Per Yuqi's spec at the bottom of the export:

| Item         | Was             | Now              |
| ------------ | --------------- | ---------------- |
| Today        | LayoutDashboard | Calendar1        |
| Alerts       | Activity        | Megaphone        |
| Deadlines    | CalendarClock   | SquareChartGantt |
| Rule library | Library         | BookOpen         |

Both `navV2` and legacy branches updated. Unused imports
(`ActivityIcon`, `CalendarClockIcon`, `LayoutDashboardIcon`,
`LibraryIcon`) removed.

## Cluster E — StateBadge primitive (#9 partial)

Copied Yuqi's portable export
(`DueDateHQ_dashboard/.claude/worktrees/interesting-yonath-25dd01/
files/state-badges-export/StateBadges.tsx`) into
`apps/app/src/components/primitives/state-badge.tsx`. 51 hand-
designed SVGs (50 states + Federal + IRS alias), sizes `xs` 20px
through `xl` 88px. Used immediately in:

- AlertsListPage state-chip strip (badge → text → count)
- PulseStructuredFields jurisdiction fact (badge → code → full name)
- PulseAlertCard header (badge → source → title)

This is the partial coverage on Yuqi's #9 US-map filter ask — the
chip strip now visually identifies states by motif. The full SVG
US map (clickable states laid out geographically) is the next
polish round on top of this and is deferred (see "Deferred" below).

## Cluster F — Dashboard h2 clarification

Last commit center-aligned "Alerts" and "Actions this week" h2s
using a 3-col grid (1fr / auto / 1fr) — that was the _horizontal_
center. Yuqi clarified she meant the **vertical** alignment inside
the title row: "10 · sorted by priority" was sitting off the
visual middle of the larger "Actions this week" word because
`items-baseline` was the row alignment. Switched both headers to
`items-center`. Title, count, and meta caption now share a visual
midline.

## Cluster G — PulseStructuredFields (drive-by from cluster E)

The jurisdiction fact in the drawer now renders as
`[StateBadge] [FL code chip] Florida` — same code+name treatment
from the last commit, plus the new badge motif. Three concepts in
one fact, all visually distinct.

## Cluster H — Cross-cutting items addressed prior

- **#8 "What does Scope/Form/Deadline mean?"** — already fixed in
  a prior commit: `changeKindLabel` now returns
  `"Deadline shifted" / "Form updated" / "Who it applies to"` etc.
  The Vibma export was probably captured before that change
  landed. Nothing to do here.
- **#12 "Link to sources in the title row"** — already present:
  AlertsListPage's non-embedded header includes a `View sources →`
  link to `/rules/library` and a `View history →` link that
  pre-sets the status filter to `applied`. Both live in the
  shrink-0 cluster on the right of the h1 row.

## Verification

- `pnpm vp lint` → 0 errors, 0 warnings (665 files).
- `pnpm tsc -b` → no new errors. Pre-existing apps/server Cloudflare
  Workers type config issues unchanged.

## Deferred, with rationale

- **#2 Alert History as separate sub-page or sidebar entry.**
  Architectural decision. Today's "View history" link satisfies the
  immediate need (`?status=applied` etc. filters the same list).
  Promoting to a dedicated route + sidebar item is a bigger IA call
  — does it sit under Alerts, or as a peer? Counts? Date scopes?
  Tracked as a follow-up.
- **#9 Full clickable US map filter.** The chip strip + leading
  StateBadge in this commit gets ~70% of the value (visual state
  recognition, single-click filter). A real US map is a half-day
  project on its own (SVG layout, hit areas, hover states, zoom
  behavior on small viewports). Tracked as a follow-up.
- **#10 deferred** — info-icon audit, still tracked from prior
  commit.
