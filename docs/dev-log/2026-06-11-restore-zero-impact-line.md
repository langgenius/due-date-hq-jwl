# 2026-06-11 — Restore the zero-match impact line (demote, don't delete)

Yuqi course-correction on the de-noising passes: reducing noise must not
remove decision information — think about what the CPA needs from /alerts.

The one removal that crossed the line: dropping "No matching clients" from
zero-match rows entirely (my call during the critique fixes, not a Yuqi ask).
Client impact is triage question #1 — EVERY row must answer it, including
"zero". A row that says nothing can't be told apart from a row that hasn't
loaded, and "no client impact" is precisely the fact that lets a CPA skim
past an advisory quickly.

Restored as the QUIET form in both `PulseAlertRow` and `AlertListRail`:
- impacted > 0 → loud: Users icon + "Affects N clients" (secondary ink)
- impacted = 0 → quiet: "No client impact" (muted, no icon)

Copy upgraded from "No matching clients" (mechanism) to "No client impact"
(the conclusion the CPA actually needs).

Principle recorded in memory (`feedback_demote_dont_delete`): achieve calm
by demoting and consolidating, not by deleting; every triage-relevant fact
keeps exactly one home per surface.
