# Placement Map + Per-Page Amendment Prompts (2026-06-05)

> **Completeness ledger (re-derived from source, not hand-typed).** Authoritative counts as of 2026-06-05:
>
> - **178** procedures defined in `packages/contracts/src/*` · **176** registered in `apps/server/src/procedures/index.ts` (router) · **0** residual parse misses (every registered procedure traces to a contract).
> - **Procedure-level gaps = 22:**
>   - **20 registered-but-never-surfaced** in `apps/app` (verified: no `orpc` aliasing/destructuring exists, so a literal `orpc.X.Y` grep is exhaustive; all 20 have zero refs in non-test source): `audit.getEvidencePackage`, `clients.createBatch`, `clients.updateTaxYearProfile`, `migration.getResumableImport`, `obligations.{applyReprojection, createBatch, createSavedView, deleteSavedView, listProjectedDeadlines, listSavedViews, previewReprojection, updateDueDate, updateSavedView}`, `pulse.{listAlertSourceCoverage, retrySourceHealth}`, `readiness.listByObligation`, `rules.{archivePracticeRule, rejectCandidate, rejectTemplate, updatePracticeRule}`.
>   - **2 defined-in-contract-but-NOT-registered** in the router (backend wrote the contract, never wired the handler): `clients.previewClassificationRecompute`, `clients.applyClassificationRecompute`.
> - **`dashboard.requestBriefRefresh`** was the 21st unused proc; it is **now wired** by the Daily Brief card, so it dropped off the list.
> - No frontend call references a non-existent procedure (a `pulse.list` hit was a comment artifact in a test, not a real call).
> - Every one of the 22 maps to a prompt below (§1 Placement Map + §2 prompts). Field-level gaps (returned data not rendered) are catalogued separately in §4.

**Author:** Yuqi (UX). This is the implementation companion to the gap analysis. It answers three things for every backend capability that isn't surfaced:

1. **Where** it belongs in the existing pages (not a new page).
2. **The wiring** — which oRPC procedure, query/mutation pattern, invalidation keys.
3. **A dispatch-ready prompt** — self-contained, so each can be run in its own worktree agent (matching this repo's workflow).

Conventions every prompt assumes: oRPC client is `orpc` from `@/lib/rpc`; queries use `useQuery({ ...orpc.X.Y.queryOptions({ input }) })`; mutations use `useMutation(orpc.X.Y.mutationOptions({ onSuccess }))` + `queryClient.invalidateQueries({ queryKey: orpc.X.Y.key() })`; all copy uses Lingui (`<Trans>` / ` t` ``); money via `formatCents`from`@/lib/utils`; tones follow DESIGN.md §7 (severity color is scarce). Contract edits require a `[contract]`PR label and re-running catalog extract. Every change ships a`docs/dev-log` entry.

---

## 0. Your question: is the exposure "just a column in the deadline table"?

**Both — they're complementary, not either/or.** A column answers "which deadlines carry the most money at risk" (portfolio scan); the panel answers "what exactly is the penalty on _this_ one and why" (the detail). Recommendation:

- **Deadline table (`/deadlines`):** add an optional **"Exposure" column** — right-aligned `formatCents(accruedPenaltyCents)`, `tabular-nums`, muted unless overdue. Sortable (lets a preparer sort by money-at-risk). Hidden by default in `compact` density; toggleable in the column menu. When `accruedPenaltyStatus !== 'ready'` show a quiet em-dash, not a zero.
- **Drawer Summary tab:** the full `ObligationExposurePanel` (hero + accordion breakdown + basis citations + the three states) — that's where the `formula`/`inputs`/`penaltySourceRefs` live, because a table cell can't hold them.
- **Queue band header (`obligations.tsx:4635`):** replace the hardcoded fake `"≈$11,840 penalty exposure"` with the real summed `accruedPenaltyCents` for the band.

So: **column = scan signal; panel = the explainer; band = the real total.** Full panel spec in [build-ready-exposure-and-brief-2026-06-05.md](build-ready-exposure-and-brief-2026-06-05.md).

---

## 1. Placement Map (feature → page → exact location)

| #   | Feature                      | Page / route                 | Exact location                                                           |
| --- | ---------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| 1   | Penalty exposure panel       | `/deadlines` drawer          | Summary `TabsContent`, after `PathToFilingSummary`                       |
| 1b  | Exposure column              | `/deadlines` table           | `use-obligation-queue-columns.tsx`, new optional column                  |
| 2   | Daily Brief card             | `/today` (dashboard)         | `routes/dashboard.tsx`, after PageHeader, before `NeedsAttentionSection` |
| 3   | Rule reject/edit/archive     | `/rules`                     | `rule-detail-drawer.tsx` action row + new dialogs                        |
| 4   | Saved Views                  | `/deadlines`                 | view bar above the queue table (`routes/obligations.tsx`)                |
| 5   | Readiness portal polish      | `/r/:token` public portal    | `routes/readiness.tsx`                                                   |
| 5b  | Request-history timeline     | `/deadlines` drawer          | Readiness `TabsContent`                                                  |
| 6   | Priority triage view         | `/alerts`                    | `AlertsListPage` — new sort/segment + row expander                       |
| 7   | Source health + coverage     | `/alerts`                    | new "Sources" panel/drawer off the alerts header                         |
| 8   | Resume import prompt         | wizard / `/today`            | `WizardProvider` open hook + optional dashboard banner                   |
| B1  | createBatch (deadlines)      | `/deadlines`                 | "+New" split-button → "Add several"                                      |
| B2  | reprojection drift report    | `/deadlines`                 | bulk/overflow menu → preview→apply dialog                                |
| B3  | projected-deadlines inbox    | `/deadlines`                 | count chip → filtered queue lens                                         |
| B4  | updateDueDate inline         | `/deadlines` drawer          | Summary deadline strip / Due cell                                        |
| B5  | clients.createBatch          | `/clients`                   | `ClientsCreateSplitButton` → "Paste many"                                |
| B6  | client tax-year edit         | `/clients/:id`               | `ClientCompliancePosturePanel` → editable                                |
| B7  | classification recompute     | `/clients/:id`               | entity-type editor + preview dialog _(needs router reg)_                 |
| B8  | client activity flags        | `/clients/:id`               | `ClientCompliancePosturePanel` → display+edit                            |
| B9  | triage tabs (month/long)     | `/today`                     | restore tabs on `DashboardActionsList`                                   |
| B10 | faceted filter bar           | `/today`                     | re-mount filter controls (facets already fetched)                        |
| B11 | Smart Priority "why" popover | `/today` + `/practice`       | rank cell popover + preview rows                                         |
| B12 | workload window picker       | `/workload`                  | `workload-page.tsx` header control                                       |
| B13 | calendar firm feed           | `/calendar`                  | add `{ scope:'firm' }` to cards array                                    |
| B14 | reminders hidden tiles       | `/settings/reminders`        | 2 more `StatTile`s                                                       |
| B15 | notifications filter+badge   | bell + `/notifications`      | bell `unreadCount`; page type filter + paginate                          |
| B16 | evidence model name          | `/deadlines` evidence drawer | `EvidenceDrawerProvider` footer                                          |
| B17 | audit actorType + search     | `/audit`                     | filter bar segmented control + server search                             |
| B18 | evidence-package detail+poll | `/audit`                     | export dialog status row + history                                       |
| B19 | temp-rule / coverage extras  | `/rules`                     | coverage tab + temporary-rules tab                                       |
| B20 | accrued-penalty roll-up tile | `/today`                     | summary strip tile                                                       |

---

## 2. Per-page amendment prompts

Each block is a self-contained prompt. Run in a worktree; one PR per block.

### `/today` — Dashboard (`routes/dashboard.tsx`)

**2A — Daily Brief card** _(flagship, no contract change)_

```
Add a Daily Brief card to the dashboard. The dashboard.load query already returns
`brief: DashboardBriefPublic | null` (dashboard.ts:167) but routes/dashboard.tsx never reads it.

1. Create apps/app/src/features/dashboard/daily-brief-card.tsx exporting <DailyBriefCard>.
   Props: { brief, scope, onScopeChange, onRefresh, refreshing }.
   - <Card className="bg-background-section"> with header: Astroid icon + "Your daily brief",
     a firm|me segmented toggle (Button group), a freshness Badge driven by brief.status
     (ready→"Updated {RelativeTime generatedAt}", stale→amber "Outdated", pending→spinner
     "Generating…", failed→destructive "Couldn't generate" with errorCode in a Tooltip),
     and a ghost Refresh button (RotateCwIcon) hidden while pending.
   - Body: parse brief.text on [n] tokens; each [n] → a small clickable Badge resolved via
     brief.citations.find(c=>c.ref===n); onClick calls openObligationDrawer(citation.obligationId);
     Tooltip shows citation.evidence.sourceType + a "View source ↗" TextLink when sourceUrl.
     Unmatched [n] render as plain text. Use formatRelativeTime / RelativeTime primitive.
   - Return null when brief == null. pending → 3-line Skeleton body.
2. In routes/dashboard.tsx:
   - Add a nuqs param `brief: parseAsStringLiteral(['firm','me']).withDefault('firm')`.
   - Pass `briefScope: brief` into dashboardTableInput.
   - const refresh = useMutation(orpc.dashboard.requestBriefRefresh.mutationOptions({
       onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() }) }))
   - Add refetchInterval to dashboardQuery: (q) => q.state.data?.brief?.status === 'pending' ? 4000 : false
   - Mount <DailyBriefCard brief={data?.brief ?? null} scope={brief} onScopeChange={…setBrief}
     onRefresh={() => refresh.mutate({ scope: brief })} refreshing={refresh.isPending} />
     directly after the error Alert, before <NeedsAttentionSection/>.
3. i18n: wrap all copy in <Trans>/t. Add a dev-log entry. Verify dashboard renders the brief.
```

**2B — Triage tabs (`this_month` / `long_term`)**

```
DashboardActionsList currently only renders the `this_week` triage tab (dashboard.tsx:454).
data.triageTabs returns all three. Add a segmented tab control above the actions list that
switches between this_week / this_month / long_term (use the existing `triage` nuqs param,
which already exists). Pass the selected tab's rows+count instead of hardcoding this_week.
Keep this_week the default.
```

**2C — Faceted filter bar**

```
data.facets (clients/taxTypes/dueBuckets/statuses/severities/evidence — each {value,label,count})
is fetched but the v2 UI dropped the controls (dashboard.tsx:58-60). Re-add a compact filter bar
above the actions list wired to the existing nuqs params (client/taxType/due/status/severity/evidence).
Render each facet as a multi-select chip group showing the server count per option. The query input
already forwards these. Keep it collapsible so the default view stays clean.
```

**2D — Accrued-penalty roll-up tile + 2E — Smart Priority "why" popover**

```
2D: data.summary carries totalAccruedPenaltyCents + accruedPenaltyReadyCount/NeedsInputCount/
UnsupportedCount. Add a StatTile "At risk" = formatCents(totalAccruedPenaltyCents), tone=critical
only when >0, into the actions summary strip; subtitle "{readyCount} estimated · {needsInputCount}
need inputs".
2E: DashboardTopRow.smartPriority is a full SmartPriorityBreakdown (score, rank, factors[] with
weight/rawValue/normalized/contribution/sourceLabel). actions-list.tsx shows only 2 factor labels.
Add a "Why this rank?" Popover on the rank cell rendering each factor as a row: sourceLabel +
rawValue + a contribution bar (Progress). Reuse the same popover on /practice PriorityPreviewTable rows.
```

### `/deadlines` — Obligation queue (`routes/obligations.tsx`, drawer, columns)

**3A — Exposure panel (Summary tab)** — see [build-ready doc](build-ready-exposure-and-brief-2026-06-05.md) §A. No contract change for Phase 1.

```
Create ObligationExposurePanel({row}) in features/obligations/queue/components/panels.tsx.
Drive state on row.accruedPenaltyStatus (ready|needs_input|unsupported):
- ready: hero formatCents(row.accruedPenaltyCents) + "as of {row.penaltyAsOfDate}" +
  AiProvenanceBadge; <Collapsible> per row.accruedPenaltyBreakdown[] item (label + formatCents,
  expand to formula + inputs via DetailRow); footer maps row.penaltySourceRefs[] to TextLinks
  with Tooltip (sourceExcerpt/effectiveDate/lastReviewedDate).
- needs_input: <Alert> "Estimate incomplete" + checklist of row.missingPenaltyFacts[] + a button
  that opens the existing penalty-inputs dialog (clients.updatePenaltyInputs) for row.clientId.
- unsupported: EmptyPanel quiet copy.
Mount <ObligationExposurePanel row={row}/> in the summary TabsContent (~line 1874) after
PathToFilingSummary. Guard: return null for obligationType==='internal_review'. Hero tone
text-text-primary; text-text-destructive only when row is in the overdue band.
```

**3B — Exposure column + kill fake placeholder**

```
[contract] In packages/contracts/src/obligation-queue.ts remove estimatedExposureCents,
exposureStatus, exposureCalculatedAt from ObligationQueueRowSchema.omit(...) so the row carries
the estimate. Then:
- In use-obligation-queue-columns.tsx add an optional "Exposure" column: right-aligned
  formatCents(row.estimatedExposureCents ?? row.accruedPenaltyCents), tabular-nums, muted unless
  overdue, em-dash when status!=='ready'. Sortable. Off by default in compact density.
- In routes/obligations.tsx:4630 replace the static "≈$11,840 penalty exposure" with the summed
  real exposure for the band's rows.
```

**3C — updateDueDate inline · 3D — createBatch · 3E — reprojection · 3F — projected inbox**

```
3C: Add an "Adjust due date" affordance — an inline ISO date editor (reuse iso-date-picker
primitive) on the drawer deadline strip — calling orpc.obligations.updateDueDate({id,currentDueDate}),
invalidate obligations.getDetail + list. Optional reason in a follow-up toast.
3D: Add "Add several deadlines" to the +New split-button → a multi-row sheet mapping to
orpc.obligations.createBatch({obligations: ObligationCreateInput[]}).
3E: Add "Check for date drift" to the queue overflow menu → a preview→apply dialog using
orpc.obligations.previewReprojection then applyReprojection. Reuse the Annual Rollover dialog
pattern (previewAnnualRollover→createAnnualRollover already wired). Show old→new date + disposition
badge (will_update / requires_review / no_verified_rule).
3F: Add a "Projected to confirm (N)" chip near the queue header → applies the projected lens
(list with confirmed=false) — listProjectedDeadlines powers the count; confirmObligations (already
wired) bulk-confirms.
```

**3G — Saved Views**

```
Add a view bar above the queue table in routes/obligations.tsx. Wire orpc.obligations.{listSavedViews,
createSavedView,updateSavedView,deleteSavedView}. Pinned views (isPinned) render as tabs that swap
the current filter+columnVisibility+density state (the queue already manages these locally — map them
to the view's query/columnVisibility/density). "Save view" captures current state + name; offer
rename/delete/pin. Show "Unsaved changes" when current state diverges from the active view.
```

**3H — drawer field exposures (extension/payment/review/efile/provenance)**

```
In the obligation drawer, surface fields already on `row` that aren't rendered:
- Extension tab: extensionState (full 8-state), extensionFiledAt, extensionAcceptedAt, extensionFormName.
- Summary milestones: paymentConfirmedAt, reviewerUserId+reviewCompletedAt ("Reviewed by X on Y"),
  full efileState (10 states).
- Provenance cues: a small badge for generationSource (migration/manual/annual_rollover/pulse) and a
  "verify period" chip when taxPeriodSource!=='verified' or taxPeriodReviewReason is set.
```

**5B — Readiness request-history timeline**

```
orpc.readiness.listByObligation({obligationId}) is unused. In the drawer's Readiness tab, below the
latest request, render a timeline of all requests: per request show status, sentAt, firstOpenedAt,
lastRespondedAt, recipientEmail, and per-item responses. "Opened 3 days ago, no response" is the
key CPA signal.
```

### `/clients` (list + `routes/clients.$id.tsx` detail)

```
B5 (paste-many): Add a "Paste/add multiple" option to ClientsCreateSplitButton → a repeatable-row
or textarea form mapping to orpc.clients.createBatch({clients: ClientCreateInput[]}).
B6 (tax-year edit): Make the tax-year/fiscal-year-end section of ClientCompliancePosturePanel
editable (inline or small sheet, mirroring updateJurisdiction/updateSourceDetails editors) via
orpc.clients.updateTaxYearProfile; toast the returned recalculatedObligationCount.
B8 (activity flags): Surface + make editable hasForeignAccounts/hasPayroll/hasSalesTax/has1099Vendors/
hasK1Activity. (Needs a client update path for these flags — coordinate a [contract] addition if none.)
B7 (classification recompute): Add an entity-type / tax-classification editor with a preview→apply
safety dialog (will_add/unchanged/orphan_safe/orphan_needs_confirmation dispositions) using
clients.previewClassificationRecompute + applyClassificationRecompute. NOTE: these are in the clients
contract but NOT yet registered in the server router — register them first, then build UI.
```

### `/alerts` — Pulse (`AlertsListPage`, `AlertDetailDrawer`)

```
6 (Priority triage): pulse.listPriorityQueue is already fetched but only used as a lookup
(AlertDetailDrawer.tsx:144). Render a Priority sort/segment on the alerts list: rows ordered by
priorityScore desc, a level badge (normal/high/urgent → neutral/amber/red), and an expandable
"Why prioritized" listing priorityReasons[] as "+{points} {label}" chips (keys: preparer_requested,
needs_review_matches, low_confidence, high_impact, source_attention). Keep apply/dismiss/snooze inline.

7 (Source health + coverage): Add a "Sources" panel/drawer off the alerts header.
- Source health: render pulse.listSourceHealth fully (replace the label-string-only use and the
  stubbed sourcesNeedingAttention()=[] in source-health-labels.ts). One row per source: label, tier,
  healthStatus chip, lastCheckedAt, nextCheckAt; on failure show consecutiveFailures + lastError.
  Sort failing/degraded to top. Add a "Re-check now" button → orpc.pulse.retrySourceHealth({sourceId})
  (currently unused) which returns the refreshed list.
- Coverage matrix: call orpc.pulse.listAlertSourceCoverage (currently unused). Render a jurisdiction×role
  grid (roles: primary_web_news/guidance_notice/email_signal/rule_source_watch/tax_type_sources/
  relief_or_disaster_signal/multi_agency_sources) with covered✓ / missing✗ / verified-N/A cells from
  coveredRoles/missingRoles/roleDetails; jurisdiction coverageLevel (missing/standard/comprehensive)
  as a summary chip; missingRoles+missingReason drive a gap callout.

B-pulse: surface PulseDetail.structuredChange (when present) and PulseAlertPublic.
duplicateSourceSnapshotCount ("confirmed by N sources") on the alert card.
```

### `/rules` — Rules console (`rule-detail-drawer.tsx`)

```
3 (reject/edit/archive — close the half-built flow): only acceptTemplate/verifyCandidate are wired;
the console already shows rejected/archived filter buckets that no action can reach.
- Add "Reject" beside Accept → dialog with required reason → orpc.rules.rejectTemplate({ruleId,
  expectedVersion,reason}). Handle version conflict.
- Add "Reject candidate" in the candidate section → orpc.rules.rejectCandidate({ruleId,reason}); show
  the draft's confidence+reasoning next to it.
- Add an "Edit" mode making the read-only ObligationRule editable → orpc.rules.updatePracticeRule
  ({rule, reviewNote}). Also wire createCustomRule for the "new rule" path.
- Add "Archive/Retire" (owner/manager) → orpc.rules.archivePracticeRule({ruleId,reason}).
B19: In the coverage tab surface RuleCoverageRow extras (missingSourceDomains, per-entity
entitySourceCoverage, rejected/archived/custom/pendingReviewCount). In the temporary-rules tab show
appliedObligationCount/activeObligationCount/revertedObligationCount + overrideType (extend vs waive).
```

### Settings & ops pages

```
/calendar (B13): In calendar-page.tsx the `cards` array hardcodes only {scope:'my'} though the card
component fully handles scope==='firm' (role-gated). Add {scope:'firm'} to the array. One-line unlock.

/settings/reminders (B14): reminders.overview returns 6 stats; the page renders 4. Add two StatTiles:
queuedTodayCount and failedLast7DaysCount (tone=critical when >0; deep-link to failed rows in Recent
sends, which already render failureReason).

/notifications + bell (B15): drive the bell badge from orpc.notifications.unreadCount (currently
computed client-side off a 20-item page). On /notifications add a `type` filter (the list input
accepts `type`) and "Load more" pagination via nextCursor (currently hardcoded status:'all', limit:50).

/workload (B12): workload-page.tsx hardcodes windowDays=7. Add a 7/14/30 segmented picker bound to
WorkloadLoadInput.windowDays (1–30) and feed it into the load query.

/audit (B17,B18): wire the unused `actorType` filter (user/system/ai/ai_assisted/ai_any) as a
segmented control and send the server-side `search` param (currently client-side only). For evidence
packages: render a package-history list + a per-package status row using orpc.audit.getEvidencePackage
(unused) that polls while status∈pending/running (so Download activates on ready) and shows
failureReason/expiresAt/sha256Hash/fileManifestJson. Also allow non-firm export scopes.

/migration (8): wire orpc.migration.getResumableImport (unused) — call it on wizard open (and/or a
dashboard banner). If non-null, show a Resume card before the fresh-start step: "{rawInputFileName},
{rowCount} rows, started {createdAt} — Resume / Discard" feeding the existing resumeBatchId path.

evidence drawer (B16): in EvidenceDrawerProvider footer, render EvidencePublic.model (which AI model
produced the output) next to confidence/timestamp.
```

---

## 3. Suggested build order (risk-ascending)

1. **One-line / additive, no contract:** calendar firm feed (B13), reminders tiles (B14), workload picker (B12), notifications badge (B15a), evidence model (B16).
2. **Additive components, no contract:** Daily Brief (2A), Exposure panel P1 (3A), Priority triage (6), Source health+coverage (7), readiness timeline (5B), Smart-priority popover (2E), triage tabs (2B).
3. **Flows / dialogs, no contract:** rule reject/archive (3), reprojection (3E), resume import (8), audit poll (B18).
4. **Contract changes (`[contract]` PR):** exposure column un-omit (3B), classification recompute router reg (B7), activity-flag update path (B8).

---

## 4. Field-level completeness (machine-verified, 2026-06-05)

Procedure-level gaps are provably complete (see top ledger). Field-level gaps — _procedure is called but returned data isn't rendered_ — were checked by extracting every field name (len≥8) declared in `packages/contracts/src/*` schemas (508 distinct) and subtracting every identifier token that appears anywhere in `apps/app/src` (18,880 tokens). **145 contract fields never appear in the frontend.**

**Caveat:** a zero-token field is strong evidence it isn't displayed, but not absolute proof — a value could be destructured under a renamed local. Conversely, many of the 145 are internal plumbing that _should_ never reach the UI. The curated, user-facing subset is below; the rest (IDs, hashes, `*ByUserId`, `metadataJson`, `rawRowJson`, `stripeCustomerId`, `baseVersion`, `isSystem`, …) are intentionally excluded.

### Already covered by a spec/prompt above (confirms the gaps)

- **Penalty/exposure (Spec 1, 2D):** `penaltyBreakdown`, `accruedPenaltyBreakdown`, `accruedPenaltyCents`, `penaltyAsOfDate`, `missingPenaltyFacts`, `penaltySourceRefs`, `penaltyFormulaLabel`, `penaltyFormulaVersion`, `penaltyFactsVersion`, `exposureCalculatedAt`, `amountCents`, `sourceRefs`, `effectiveDate`, `lastReviewedDate`, `totalAccruedPenaltyCents`, `accruedPenalty{Ready,NeedsInput,Unsupported}Count`, `evidenceGapCount`.
- **Obligation lifecycle (3H):** `extensionAcceptedAt`, `extensionFiledAt`, `extensionFormName`, `extensionDecidedByUserId`, `paymentConfirmedAt`, `reviewCompletedAt`, `reviewerUserId`, `efileAuthorizationForm`, `generationSource`, `taxPeriodReviewReason`, `rulePeriod`, `sourceEvidence`.
- **Reprojection (3E):** `oldBaseDueDate`, `newBaseDueDate`, `changedCount`, `requiresReviewCount`, `willUpdateCount`.
- **Classification recompute (B7):** `orphanNeedsConfirmationCount`, `orphanSafeCount`, `confirmedOrphanObligationIds`, `recalculatedObligationCount`, `addedCount`, `supersededCount`, `workflowFlags`, `unchangedCount`, `willAddCount`.
- **Source health/coverage (Spec 7):** `consecutiveFailures`, `lastError`, `lastFailureAt`, `lastSuccessAt`, `nextCheckAt`, `coverageLevel`, `coveredRoles`, `missingRoles`, `requiredRoles`, `roleDetails`, `missingReason`, `parserStatus`, `primaryWeb`, and the per-role `*SourceIds` arrays, `requiredSourceCount`, `highPrioritySourceCount`.
- **Priority queue (Spec 6):** `priorityReasons`, `priorityScore`.
- **Smart priority (B11):** `currentRank`, `currentScore`.
- **Readiness (5B):** `firstOpenedAt`, `lastRespondedAt`, `templateName`.
- **Reminders (B14):** `queuedTodayCount`, `failedLast7DaysCount`, `lastSentAt`.
- **Rules coverage (B19):** `archivedRuleCount`, `rejectedRuleCount`, `customRuleCount`, `archivedAt`, `reviewedBy`, `baseVersion`.
- **Audit (B18):** `fileManifestJson`, `rangeStart`, `rangeEnd`.

### NEW — found only by this field scan (not in the domain-agent reports)

- **B21 · Billing subscription status not surfaced** _(`features/billing`)_. `FirmBillingSubscriptionPublic` (firms.ts:177+) carries `trialStart`/`trialEnd`, `cancelAtPeriodEnd`, `canceledAt`, `cancelAt`, `scheduledFor` — **none referenced.** The billing page shows the plan but not "Trial ends {date}", "Cancels at period end {date}", or a pending scheduled plan change. The earlier "billing complete" verdict was wrong at the field level. **Add:** a trial banner + a "set to cancel / scheduled change" status line on the billing page.
- **B22 · Rule local-jurisdiction provenance not rendered** _(`features/rules`, rule detail)_. `ObligationRule` carries `sourceAuthority`, `localFactRequirements`, `localCode`, `localFacts`, `effectiveFromTaxYear`, `lastReviewedOn` — **none referenced.** The rule detail drawer doesn't show who the authority is, the local-fact inputs a local rule needs, or when it was last reviewed. **Add:** a provenance/local-facts block in the rule detail drawer (pairs with the rule-edit work in §2 `/rules`).
- **B23 · Workload capacity score / earliest deadline** _(`features/workload`)_. `capacityLoadScore` and `earliestFilingDeadline` never referenced — verify the manager capacity view renders the load score and each owner's earliest deadline (the manager-insights summary is shown, but these specific fields aren't).
- **B24 · Migration global confidence** _(migration wizard)_. `aiGlobalConfidence` (batch-level AI confidence) never referenced — consider a confidence indicator on the mapping/review step.
- **Smaller:** `notificationChannels` + `holidays` (calendar feed options), `requestedBy`/`receivedAt`/`resolvedAt` (readiness response/audit timestamps), `isEarlyWarning` (pulse alert flag) — verify or surface as appropriate.
