# Capability-gap audit — all 7 P1 "can see but can't act" fixes

**Date:** 2026-06-30 · capability-gap backlog

A 6-agent product-wide audit (lens: read-only dead-ends / one-way flows /
missing inverses / detour-only / orphaned surfaces) surfaced the class Yuqi
hit with "I can't add a state I skipped at onboarding." Fixed all 7 P1s. Audit
agents were fallible — verify every claim (#7 was already fully built; #2's
first attempt edited dead code `_GroupedRulesTable`, never rendered).

**#1 Remove/stop monitoring a jurisdiction** — new `rules.deactivateJurisdiction`
proc (archives a jurisdiction's engaged practice rules via the existing
archivePracticeRule path; audit-logged). AddStateCoverage map is now a full
add/remove surface (covered tile → confirm → archive). Fixed status logic:
candidateCount EXCLUDED from "engaged" (candidate = available template, not
engaged).

**#2 Archive rule** / **#3 Edit rule** — `archivePracticeRule` /
`updatePracticeRule` existed with no UI. Added a trailing ⋯ actions column to
`JurisdictionRuleRow` (jurisdiction-rule-table.tsx): Archive (reason dialog) +
Edit (title/formName only — dueDateLogic is a variant union without
`description` everywhere). Both gated to live rules; pending rules show only
"Copy rule ID".

**#4 Client rename** — net-new `clients.rename` (contract + port + repo
`updateName` + handler + audit `client.name.updated`). Pencil on
ClientTitleSwitcher H1, gated `client.write`. Verified end-to-end.

**#5 Source-revoked recovery** — the revoked banner dead-ended (all actions
disabled, no exit). Added a "Manage this source" link → /rules/sources?jur=.
(Re-trusting a revoked source is a deliberate decision left in the Sources
page, not a one-click here.)

**#6 Per-deadline rule re-bind** — net-new `obligations.rebindRule` (contract +
port + repo `updateRuleId` + handler + audit `obligation.rule.rebound`). New
`RuleRebindControl` on the Record-tab authority strip. `matchedRule` resolves
`ruleId` as an OVERRIDE (`findRuleById(ruleId) ?? auto-match`,
obligation-queue:410), so only "Change rule" is offered — "unbind" (null →
auto-match) can't express "cite no rule", so it was dropped as misleading.

**#7 Rule↔deadline round-trip** — already built (audit false positive): `?rule=`
forward filter is wired + consumed; reverse "Open rule →" links exist in the
Extension/Record tabs. No change.

**Activation-count fix (separate bug Yuqi flagged):** `activateOnboardingJurisdictions`
reported a misleading "N active" on single-state adds — `onboardingActivationJurisdictions`
always prepends always-on FED, and `activatedCount` re-counted FED's
already-active rules on every idempotent re-run. Now counts only true status
transitions (delta vs existing practice-row status). Fresh onboarding
unaffected (no practice rows → full count). Verified live: re-add CO returns 0
(was 21). Confirmed NOT a persistence bug — FED has 25 real active rows; states
sit in pending_review by design. 455 server tests pass.

Seed caveat: demo firm has no active state rules (all pending_review), so the
live positive paths for #1/#2/#3/#6 can't be visually demoed there — controls
render + gate correctly and mutations are reachable/typed; #4 fully verified.
