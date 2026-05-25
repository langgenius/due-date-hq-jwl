# Pulse vocabulary unification — first pass

**Date:** 2026-05-21
**Branch:** `design/preview-integration`
**Reference:** `docs/Design/ux-audit-2026-05-21.md` P0 #2,
`docs/Design/pulse-vocabulary.md` (canonical spec)

## Why

The UX audit found Pulse alerts surfaced with three different names
("Pulse alert," "Pulse Changes," "Pulse updates"), inconsistent severity
labeling, and missing Snooze affordance everywhere except the detail
drawer. A new preparer couldn't tell that all three mounts described the
same artifact, and the most useful intermediate action (defer 24h) was
buried two clicks deep.

## What landed

**Canonical name everywhere.** "Pulse alert(s)" is the only user-visible
phrase for the artifact. Renames:

- `/rules/pulse` H1: "Pulse Changes" → "Pulse alerts"
- Email-prefs label: "Pulse updates" → "Pulse alerts"
- Morning-digest copy: "Pulse changes" → "Pulse alerts"
- List empty state: "No client-matching Pulse changes" → "No client-matching Pulse alerts"

(Internal symbols like `PulseChangesTab` left untouched — they're never
user-visible.)

**Snooze surfaced as first-class.** Per the canonical action order
(`Snooze · Dismiss · Review`), Snooze is now exposed on:

- The dashboard banner (`PulseAlertsBanner`) — new mutation + button, 24h default
- The `/rules/pulse` list cards (`PulseAlertCard`) — new `onSnooze` prop, wired in `AlertsListPage`

Snooze is **not** added to the dashboard `NeedsAttentionCard` — that
tile is a whole-card-as-Review button by design, and the drawer remains
the canonical workspace for all four verbs. The vocabulary doc captures
this exception.

**Banned "Hide."** Replaced with context-appropriate verbs:

- `needs-attention-section.tsx` System Status hide → "Collapse" (UI-only)
- `PulseAlertsBanner` source-attention hide → "Dismiss" (persists per-user)

**Harmonized reason-prompt copy.** Every Dismiss now asks
"Why is this alert not relevant?" — every Snooze asks "Why is this
alert not urgent right now?" Across the banner, list page, and (already)
the drawer's `PulseReasonDialog`.

## What didn't land (open follow-ups)

- **The `window.prompt` stopgap stays in the banner + list page.** The
  drawer's `PulseReasonDialog` (textarea + character count + audit
  helper text) is the better UX. Promoting it to a shared component
  reusable across mounts is the next step — but a bigger refactor than
  this PR.
- **Severity icon standardization.** Per vocab doc, standalone
  `AlertCircleIcon` / `AlertTriangleIcon` / `InfoIcon` should be reserved
  for source-health signals (which are system-status, not Pulse alerts).
  Current state: source-health uses those icons correctly. Pulse alerts
  use `PulsingDot` correctly. No drift to fix.
- **Apply action on the list-page card.** Vocab doc punted: "Apply
  belongs in the detail drawer (it's a workspace action, not a glance
  one)." Open question for a future review.

## Files touched

- `docs/Design/ux-audit-2026-05-21.md` (new — audit context)
- `docs/Design/pulse-vocabulary.md` (new — canonical spec)
- `apps/app/src/features/pulse/AlertsListPage.tsx` (string renames, Snooze mutation, prompt copy)
- `apps/app/src/features/pulse/PulseAlertsBanner.tsx` (Snooze mutation, button, "Hide" → "Dismiss", prompt copy)
- `apps/app/src/features/pulse/components/PulseAlertCard.tsx` (added `onSnooze` prop, canonical action order)
- `apps/app/src/features/dashboard/needs-attention-section.tsx` (System Status "Hide" → "Collapse")
- `apps/app/src/features/notifications/notifications-page.tsx` (email-prefs "Pulse updates" → "Pulse alerts" + morning-digest copy)

Type-check clean. No behavioral regressions — Snooze mutation reuses the
existing `orpc.pulse.snooze` contract with a 24h `until` window matching
the drawer's pattern.

## Score impact (per audit doc)

Dashboard heuristic #4 (Consistency & Standards) was 2/4. With banner +
section + Inbox now telling the same story with the same vocabulary,
expect this to move to 3/4 on the next critique pass. Heuristic #6
(Recognition over Recall) was 3/4; surfacing Snooze inline (so users
don't have to remember it lives only in the drawer) should also nudge it
upward.
