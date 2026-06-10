# Alert drawer: restore the "Rules to re-verify" section

**Date:** 2026-06-10
**Commit(s):** see `fix(alerts): restore the Rules-to-re-verify section …`

## What broke

The rounds 70-85 design merge (`b6876bf1`, 2026-06-05) rebuilt the alert
detail drawer body and dropped the `ReverifyRulesSection` import + JSX — but
kept everything that depends on it:

- the `reverifyIncomplete` gate that disables **Mark reviewed** on
  review-only rule-change alerts,
- the disabled button's tooltip ("Re-verify all rules below…") pointing at a
  section that no longer rendered anywhere,
- the `'A'` hotkey's silent no-op while the gate is closed,
- the comment claiming the drawer's `rules.listRules` query "shares one cache
  entry with ReverifyRulesSection".

The commit message's detailed keep/drop list for the drawer never mentions
the section — an accidental casualty, not a design decision (the 06-09
rule-library overview doc still describes the mount). Result: **Mark
reviewed was permanently disabled** on any alert carrying unreviewed
`reverifyRuleIds`; the only (undiscoverable) escape was accepting the same
rules in the Rules Library.

## Fix

Re-mounted `ReverifyRulesSection` between **The change** and **Affected
clients** (the action the change demands), byte-equivalent wiring to the
pre-`b6876bf1` mount. One className edit restyles the section as a white
sibling card on the redesigned gray drawer body (it previously used the same
`bg-background-subtle` token as the new body wash and would have vanished
into it). Zero i18n changes — all six of the section's strings were still in
both catalogs because `lingui extract` scans by glob, not import graph.

## Audit reference

2026-06-10 alerts audit, finding #17 (P2 batch).
