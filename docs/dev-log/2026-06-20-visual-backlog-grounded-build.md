# Visual backlog — grounded build (inspiration board)

_2026-06-20 · "build all of the visual list"_

Before building, ran a 14-agent grounding pass (separate sessions) over the
inspiration-board candidates — each verifying the item against the REAL backend +
existing components, so we build real features, not fiction or rework. Triage:

- **already-built (3):** affected-clients recede-when-done (AffectedClientsTable
  already greys applied rows), tab count-badges (drawer already has per-tab chips),
  coachmark pill (the `InfoBanner` primitive already covers it).
- **fiction-blocked (2):** clients member role-selector pill (no per-obligation role
  assignment exists in the stack), Materials in-card upload progress (no file-upload
  infra at any layer — confirms the Record-tab storage gap).
- **rejected — canon (3):** sources active-row dark-inversion (row click already =
  open-source URL, not a selection model), deadlines two-signal rows (already
  co-linear), severity hatch texture on blocked (double-signal ban).
- **buildable (5):** built 3 below; 2 specced-and-deferred for cause.

## Built (3, verified)

- **Audit/Status timeline** (`obligations/timeline.tsx`) — dashed vertical connector
  (border-line vs solid bar) + future milestones ghosted to 45% opacity (img-178).
  Real data (audit events).
- **Materials tick-mark progress** (`queue/components/primitives.tsx`) — the smooth
  fill bar is now one segment per checklist item (received green / outstanding soft-
  red / waived grey), making "N of M done" concrete (img-074). Derived from the
  existing `counts` — no new prop or caller change. Dropped the now-unused `pct`.
- **/alerts source-error chip** (`AlertsListPage.tsx`) — a destructive Badge "N
  source errors" in the header, linking to /rules/sources, shown only when a
  monitored source is degraded/failing (img-151). Real data:
  `pulse.listSourceHealth[].healthStatus`. Kept the healthy/paused ratio SILENT
  (absence = all-clear, per the list's own grammar) rather than building the
  inspiration's ratio bar (not a canon primitive).

## Deferred — specced, not skipped

- **Metadata fact-rows card** (img-129/134/200) — a "Deadline details" DetailSectionCard
  on the Status tab. Deferred: risks duplicating facts the drawer's AuthorityFactStrip /
  hero already show ("one home per fact" canon); needs a dedup read of the 3k-line
  drawer first. Spec in hand (DetailRow grid of taxType/form/authority/etc.).
- **"AI is applying" gradient pill** (img-043) — real state (in-flight apply
  mutation), but its home is a standalone status indicator and the current apply
  flow shows an in-button spinner; dropping a separate pill needs a footer placement
  decision + live verification (flaky harness). Spec in hand (conic-gradient border,
  navy→cyan, via Tailwind `spin`, reduced-motion-safe).

## Verification

tsgo 0 (confirms `healthStatus` is real, not fiction); build green; 1 new zh-CN
string translated; compile --strict ok.
