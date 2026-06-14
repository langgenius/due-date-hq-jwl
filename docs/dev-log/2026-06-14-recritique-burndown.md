# 2026-06-14 — Re-critique burn-down (round 2)

A second full-app `/critique` (4 fresh-eyes review agents + detector) after
the 2026-06-12 fix pass. Score moved 20→23/40: the dangerous-P0 class stayed
fixed (none re-flagged), but fresh eyes at narrow viewport, two days of
date-drift, and one self-inflicted regression surfaced a new crop. The user
chose: fix **everything**, ordered honest-affordances → consistency+counts →
responsive; **desktop-xl is the target** (so sub-lg collapse is deferred).

## Landed this round

**Regressions I owned:**
- Workload "Share of open work" (which summed to ~167% across owners) →
  "Relative load" — the value is busiest-anchored, not share-of-total.
- 404 tab title was empty (an inline `<title>` competed with the app-wide
  `RouteDocumentTitle`); removed the duplicate, the route handle is the
  single source.

**Honest affordances (Tranche 1):**
- Profile name/email rendered as white input-shaped boxes (provider-owned,
  read-only) → locked treatment (lock glyph, no input chrome) + one caption.
  Danger-zone Export/Delete state their disabled reason as visible captions.
- Permissions dropped its dead Save/Discard pair — the page's own banner says
  read-only.
- Rules "Add rule" demoted from primary to outline (it opens a signpost, not
  an add flow); bulk-review Reject now arms a two-step confirm above 10 rules
  (you could previously reject 400+ statutory rules in one click while Accept
  capped at 100).
- Imports: the undo countdown vanished on expiry → "Revert window closed".
- Daily Brief failed state: amber dot + "Couldn't update" instead of a red
  "FAILED" badge on the primary dashboard (the deterministic recap is still
  accurate).

**Consistency + counts (Tranche 2):**
- One name per page: "Reminder emails" (was "Email Template"), "Profile" (H1
  was "Your account"), Members nav label (was "Team").
- Last "Pulse" codename leak (morning-digest copy) → "regulatory alerts".
- /deadlines: the 28 count is "filings tracked", not "active filings" — it no
  longer collides with the "15 open" shown on nav/Today/Workload.
- Rules review-queue blue dot now carries a "Needs review" label.

## Deferred — parallel-session contention (NOT done)

The other session is actively rebuilding `alerts/*`, `notifications-page`,
`sidebar`, and `permissions` this round (live HMR syntax errors in
AlertStructuredFields confirm it). Editing them now would clobber in-flight
work. Deferred until they settle:
- Alerts portfolio count 9 (nav) vs 4 (Today section) reconciliation.
- "conf" abbreviation on the alerts list.
- Notifications "Inbox" vs "Notifications" name; lowercase "all" filter.
- Sidebar active-nav double-encode (accent color + 600 weight).
- Permissions `Pulse alerts` scope description (line ~129).

## Note: accidental sweep

Commit `b2bf1ac7` (the blue-dot label) also carried the parallel session's
in-flight rules `KpiStrip`→`StatBand` migration that was uncommitted in
`jurisdiction-rule-table.tsx` (the pathspec pitfall). It typechecks and
renders cleanly (verified /rules/library?jurisdiction=CA), so their work is
preserved in main, not lost — left as-is rather than rewriting (which would
race them). This happens to close the "StatBand vs StatTiles on state-detail"
finding.

## False positives (verified, no change)

- "/deadlines 'No data' cell" — visible cell is an em-dash; "No data" is the
  `EmptyCellMark` aria-label surfaced in the a11y snapshot.
- "/audit Export disabled with no reason" — it has a tooltip + aria-describedby
  stating the plan/permission gate; the reviewer couldn't trigger the hover.
- "Reason dropdown pre-fills Correction" — defensible default; only written on
  an actual save, and forcing a placeholder adds friction to every entity edit.
- Sub-lg (~693px) table collapse — clean at 1280px; deferred per desktop-xl.
