# Backend → UI Gap: Design Specs & Catalog (2026-06-05)

**Author:** Yuqi (UX) · **Method:** diffed all 176 oRPC procedures in the server router against every `orpc.*` call in `apps/app`, then compared the rich output schemas of wired procedures against what the UI actually renders.

This document has two parts:

- **Part A** — full design specs for the 8 highest-leverage gaps (backend done, UI absent or partial).
- **Part B** — a complete catalog of every other gap found, grouped by domain.

Field names, enum values, and contract line references below are pulled directly from `packages/contracts/src/*`.

---

# Part A — The 8 design specs

---

## Spec 1 — Obligation **Risk tab** (penalty & exposure)

### Purpose

A CPA's job is to keep clients from getting penalized. The backend already computes a full, itemized, daily-accruing penalty estimate with cited statutory authority for every obligation — and **none of it is visible**. Surfacing it turns the product from "a deadline list" into "an exposure manager": the CPA can see _how much money is at risk right now_ on each filing and _what's needed to make that number trustworthy_.

### Current state (the bug)

The `risk` tab is already declared in the tab type (`ObligationQueueDetailTab`) and listed in `obligation-type.ts:25`. It is configured to appear for `filing` and `payment` obligations (`obligation-type.ts:35,37`). **But `ObligationQueueDetailDrawer.tsx` has no render branch for it** — the tab is selectable (or silently dropped) and the body is empty. This is the single largest "computed-but-invisible" gap in the app.

### Data available (all from `obligation-instance.ts`, already in the `getDetail` payload)

| Field                                                                   | Type                                    | Meaning                                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| `estimatedExposureCents`                                                | int·nullable                            | Top-line total exposure                                                                 |
| `estimatedTaxDueCents`                                                  | int·nullable                            | Tax owed driving the penalty                                                            |
| `exposureStatus`                                                        | `ready` / `needs_input` / `unsupported` | Can we compute it?                                                                      |
| `penaltyBreakdown[]`                                                    | array                                   | Itemized penalty lines — each `{ label, amountCents, formula, inputs, sourceRefs[] }`   |
| `accruedPenaltyCents`                                                   | int·nullable                            | Penalty **as of today**, growing daily                                                  |
| `accruedPenaltyStatus`                                                  | `ready`/`needs_input`/`unsupported`     | —                                                                                       |
| `accruedPenaltyBreakdown[]`                                             | array                                   | Itemized accrued lines                                                                  |
| `penaltyAsOfDate`                                                       | date                                    | "Accrued through Jun 5, 2026"                                                           |
| `missingPenaltyFacts[]`                                                 | string[]                                | Exactly which inputs are missing (e.g. "balance due", "months late")                    |
| `penaltySourceRefs[]`                                                   | array                                   | Cited authority — each `{ label, url, sourceExcerpt, effectiveDate, lastReviewedDate }` |
| `penaltyFormulaLabel` / `penaltyFormulaVersion` / `penaltyFactsVersion` | string·nullable                         | Formula provenance                                                                      |
| `exposureCalculatedAt`                                                  | datetime·nullable                       | Freshness                                                                               |

### Layout

Render conditionally on `exposureStatus`:

**State A — `ready`:**

1. **Hero number:** `estimatedExposureCents` formatted as currency, with a small "as of {penaltyAsOfDate}" caption. If `accruedPenaltyCents` differs, show it as a live "accruing" figure with a subtle pulse/clock affordance ("growing ~$X/day" if derivable from breakdown).
2. **Itemized breakdown table:** one row per `penaltyBreakdown[]` item — `label`, `amountCents` (right-aligned), and an expandable `formula` + `inputs` detail ("Failure to file: 5% × $12,400 × 3 months = $1,860"). Use an accordion so the math is available but not noisy.
3. **Authority citations:** render `penaltySourceRefs[]` as a "Basis" footer — each a chip/link to `url` with hover showing `sourceExcerpt`, `effectiveDate`, and `lastReviewedDate`. This is the defensibility layer ("we're not guessing — here's the IRC section").
4. Footer: `penaltyFormulaLabel` + version, `exposureCalculatedAt`.

**State B — `needs_input`:** Lead with a "**Estimate incomplete**" callout listing `missingPenaltyFacts[]` as a checklist ("To estimate exposure we need: ☐ Balance due ☐ Months late"). Each item links to the client's penalty-inputs editor (`clients.updatePenaltyInputs`, already wired in the obligation queue). This converts a dead end into an action.

**State C — `unsupported`:** Quiet empty state — "Penalty estimation isn't available for this obligation type/jurisdiction yet." No alarm.

### States

- Loading: skeleton rows.
- `accruedPenaltyBreakdown` empty but `penaltyBreakdown` present → show estimate only, no accrued section.
- Numbers are cents → always divide by 100 and format with locale currency.

### Backend

Read-only; all fields already arrive via `obligations.getDetail`. No new procedure needed. (The dashboard summary also exposes `totalAccruedPenaltyCents` + `accruedPenaltyReadyCount`/`NeedsInputCount`/`UnsupportedCount` — see Spec 2 / Part B for a portfolio roll-up.)

---

## Spec 2 — Dashboard **Daily Brief** card

### Purpose

There's a server-generated AI narrative of the firm's day — _"3 returns are overdue, the Acme extension needs a signature, and CA FTB changed a deadline affecting 4 clients"_ — complete with citations linking each claim back to a specific obligation. The dashboard route **never reads it**. This is a finished AI feature with zero surface. It gives the CPA a 10-second "what matters today" before they touch the queue.

### Current state

`dashboard.load` returns `brief: DashboardBriefPublic | null` (`dashboard.ts:185`). `routes/dashboard.tsx` reads `summary`, `triageTabs`, `facets` but never `data.brief`. The refresh mutation `dashboard.requestBriefRefresh` is unused.

### Data (`DashboardBriefPublicSchema`, `dashboard.ts:167`)

| Field                       | Meaning                                                               |
| --------------------------- | --------------------------------------------------------------------- |
| `status`                    | `pending` / `ready` / `failed` / `stale`                              |
| `text`                      | The narrative (markdown-ish) with inline `[1]`,`[2]` refs             |
| `citations[]`               | each `{ ref, obligationId, evidence:{ sourceType, sourceUrl, ... } }` |
| `generatedAt` / `expiresAt` | freshness window                                                      |
| `errorCode`                 | populated on `failed`                                                 |
| `aiOutputId`                | for evidence drawer linkage                                           |

### Layout

A card pinned to the **top of `/dashboard`**, above the triage table:

- **Header:** "Your daily brief" + a freshness chip driven by `status`:
  - `ready` → "Updated {relative generatedAt}".
  - `stale` → amber "Outdated" + **Regenerate** button.
  - `pending` → "Generating…" with a spinner; poll/refetch.
  - `failed` → "Couldn't generate" + Retry (and show `errorCode` in a tooltip).
- **Body:** render `text`. Replace each `[n]` token with a clickable **citation chip** that maps via `citations[].ref` → `obligationId`; clicking opens that obligation's drawer (or scrolls to its row). On hover, show the citation's `evidence.sourceType` + a link to `sourceUrl`. This is a real evidence-traceability feature, not decoration.
- **Scope toggle:** `firm` ↔ `me` (the load input supports `briefScope`; refresh supports `scope`). Owners/managers default `firm`; preparers may prefer `me`.
- **Regenerate:** calls `requestBriefRefresh({ scope })`; on `{ queued: true }` flip the chip to "Generating…" and poll.

### States

- `brief === null` → render nothing (or a one-line "Brief not enabled").
- Empty `citations` → render `text` plainly.
- Respect `expiresAt` to decide when to auto-nudge "Regenerate".

### Backend

`dashboard.load` (already called — just read `.brief`) + wire `dashboard.requestBriefRefresh`.

---

## Spec 3 — Rule review: **Reject / Edit / Archive** (close the half-built flow)

### Purpose

The Rules console is the firm's compliance brain — it reviews template rules from the content team, verifies AI-drafted concrete rules, and lets the firm author custom rules. Today only the **"yes" path** exists: a reviewer can Accept a template and Verify a candidate, but cannot **reject** a bad one, **edit** a custom rule, or **archive** a retired one. Worse — the console already renders filter buckets for `rejected` and `archived` statuses (`rules-console-model.ts`), so the UI _implies_ these states exist but no action can ever produce them. Reviewers are stuck in a "skip and come back later" loop the code comments themselves complain about.

### Current state

Wired: `acceptTemplate`, `bulkAcceptTemplates`, `verifyCandidate`, `bulkVerifyCandidates`, `createCustomRule` (contract only — no authoring UI actually calls it). Unused: `rejectTemplate`, `rejectCandidate`, `updatePracticeRule`, `archivePracticeRule`. The full `ObligationRule` is rendered **read-only** in `rule-detail-drawer.tsx`.

### The four actions (all from `rules.ts`)

| Procedure             | Input                                           | Output               | UI                                                      |
| --------------------- | ----------------------------------------------- | -------------------- | ------------------------------------------------------- |
| `rejectTemplate`      | `{ ruleId, expectedVersion, reason }` (`:642`)  | `RuleReviewTask`     | "Reject" button beside Accept in the rule detail drawer |
| `rejectCandidate`     | `{ ruleId, reason }` (`:799`)                   | `RuleReviewDecision` | "Reject candidate" in the AI-candidate review section   |
| `updatePracticeRule`  | `{ rule: ObligationRule, reviewNote }` (`:647`) | `RuleReviewTask`     | "Edit rule" mode in the drawer                          |
| `archivePracticeRule` | `{ ruleId, reason }` (`:653`)                   | `RuleReviewTask`     | "Archive / Retire" action (owner/manager)               |

### Layout & flow

1. **Reject (template & candidate):** Add a destructive-secondary "Reject" button next to the existing Accept/Verify. On click → a small dialog with a **required reason** textarea (1–1000 chars; the contract enforces this). On success the rule moves to `rejected` and now _populates_ the already-existing `rejected` filter — closing the loop. For candidates, surface the draft's `confidence` + `reasoning` (`RuleConcreteDraft`) right next to Reject so a low-confidence draft is the obvious thing to kill.
2. **Edit (`updatePracticeRule`):** Add an "Edit" toggle to the rule detail drawer that makes the currently read-only `ObligationRule` fields editable (due-date logic, extension policy, evidence, entity applicability, quality checklist). Submitting requires a `reviewNote`. This is the bigger build — an authoring form — but it's the same schema the drawer already renders, just in edit mode. (Pairs with finally wiring `createCustomRule` for the "new rule" path.)
3. **Archive (`archivePracticeRule`):** An overflow-menu "Retire this rule" with a required `reason` confirm dialog. Moves rule to `archived`, populating that filter bucket.

### States

- Version conflicts: `rejectTemplate`/`acceptTemplate` carry `expectedVersion`; on a 409-style mismatch show "This rule changed since you opened it — reload."
- Permissions: edit/archive are owner/manager-gated.

---

## Spec 4 — **Saved Views** for the obligation queue

### Purpose

The obligation queue is the daily workspace. Preparers re-build the same filter + column + density combination every morning ("my overdue 1040s", "awaiting signature", "TX franchise this quarter"). The backend has full CRUD to persist these as named, pinnable, firm-shared views — but the UI re-implements all that state ephemerally in the URL, so it's lost on refresh and can't be shared as a named thing.

### Current state

Unused: `listSavedViews`, `createSavedView`, `updateSavedView`, `deleteSavedView`. The queue already manages `density`, column visibility, and all filters locally (nuqs/URL). A saved view persists _exactly_ that state, so wiring is mostly lifting current local state into these mutations.

### Data (`ObligationQueueSavedViewSchema`, `obligation-queue.ts`)

`{ id, name (≤80), query (the full filter record), columnVisibility, density (comfortable|compact), isPinned, createdByUserId, createdAt, updatedAt }`.

### Layout

A **view bar** above the queue table:

- **Pinned views render as tabs** (`isPinned: true`) — one click swaps the whole filter+column+density state. The currently-applied filters highlight the active tab; manual deviation shows an "Unsaved changes" affordance.
- **"Save view"** button → captures current `query` + `columnVisibility` + `density`, prompts for a `name`, optional "pin to tabs".
- **Manage:** rename (`updateSavedView`), delete (`deleteSavedView`), toggle pin. A "Views" dropdown lists all (pinned + unpinned).
- Since views are firm-shared (`firmId`) but stamped `createdByUserId`, show the author on hover; consider "Shared by {name}".

### States

- Empty: "No saved views yet — filter the queue, then Save view."
- Applying a view writes its `query` back into the URL params so deep-links still work.

### Backend

All four procedures. Map the queue's existing local filter state ⇄ `query` (it's a `z.record(string, unknown)` so it accommodates the current shape).

---

## Spec 5 — **Client Readiness Portal** polish (the client-facing flow)

### Purpose

This is the one surface a _client_ (not the CPA) sees — a public link where they confirm which documents they have for a filing. It's the flow a designer most directly owns, and it has trust/clarity gaps that cause dead links, confused clients, and dropped submissions.

### Current state

The portal route exists (`routes/readiness.tsx`) and renders item `label` + `description`, submits via the public submit. Gaps: it doesn't show link **expiry**, doesn't use the per-item **`sourceHint`** ("where to find this doc"), and has **no post-submit confirmation** screen.

### Data (`ReadinessPublicPortalSchema`, `readiness.ts`)

`{ requestId, firmName, senderName, clientName, taxType, currentDueDate, status, expiresAt, items[] }`. Each item (`ReadinessPublicPortalItemSchema`): `{ label, description, reason, sourceHint, responseStatus (ready|not_yet|need_help|null), note }`.

### Layout & changes

1. **Header trust block:** "{senderName} at {firmName} needs documents for your {taxType} due {currentDueDate}." Establishes legitimacy (clients are wary of links asking for tax info).
2. **Expiry banner:** "This link expires {expiresAt}." When `status === expired || revoked`, the existing dead-end screen is good — but add "Ask {senderName} to resend" copy. (Currently expiry is never shown, so a client can sit on a link until it silently dies.)
3. **Per-item guidance:** render `sourceHint` as helper text under each item ("Find this on your W-2, Box 1") and `reason` as a tooltip/expander ("Why we need this"). These fields exist specifically to help a non-expert and are currently dropped. ⚠️ _Contract note:_ `ReadinessPublicPortalItemSchema` extends `ReadinessChecklistItemSchema`, which **does** include `sourceHint`/`reason` — so they're already available on the portal payload. Verify they're populated server-side; if not, that's a one-line backend ask.
4. **Response controls:** each item is a 3-way `responseStatus` — **Ready** / **Not yet** / **Need help** — with an optional `note` (and the response schema even supports an `etaDate` for "I'll have it by…"). Make "Need help" prominent; it's the signal a CPA most wants.
5. **Post-submit terminal state:** on submit, replace the form with a "**Thanks — {senderName} has been notified.** You can close this page." confirmation (the `responded` status drives it). Today it only toasts and refetches, leaving the client unsure it worked.

### CPA-side companion (same domain)

Surface `readiness.listByObligation` (unused) as a **request-history timeline** in the obligation drawer, showing every send with its `sentAt` / `firstOpenedAt` / `lastRespondedAt` so the CPA can see "client opened it 3 days ago, hasn't responded" — today the drawer shows only the latest request's status.

---

## Spec 6 — **Priority queue** as a real triage surface

### Purpose

The regulatory-alerts system already _ranks_ alerts by genuine client impact and tells you _why_ each is urgent ("+ a preparer asked about this", "+ high client impact", "+ low confidence, needs a human"). The UI fetches this ranked list but uses it only as a lookup table — the ranking and the reasons are thrown away. Rendering it gives the firm a "work the most important regulatory changes first" queue instead of an undifferentiated list.

### Current state

`pulse.listPriorityQueue` is called, but `AlertDetailDrawer.tsx` only `.find()`s the `review` sub-object for the open alert. `level`, `priorityScore`, and `priorityReasons[]` are discarded.

### Data (`PulsePriorityQueueItemSchema`, `pulse.ts`)

`{ alert, level (normal|high|urgent), priorityScore (int), priorityReasons[], review|null }`. Each reason (`PulsePriorityReason`): `{ key, points, label }` where `key ∈ preparer_requested | needs_review_matches | low_confidence | high_impact | source_attention`.

### Layout

A **"Priority" view/tab on `/alerts`** (or reorder the main list by `priorityScore` with a toggle):

- Rows sorted by `priorityScore` desc, grouped/badged by `level` (urgent = red, high = amber, normal = neutral).
- Each row shows the alert summary + an **expandable "Why prioritized"** that lists `priorityReasons[]` as "+{points} {label}" chips ("+30 A preparer asked about this", "+20 High client impact"). This makes the score legible and trustworthy.
- Keep the existing apply/dismiss/snooze actions inline.

### States

- Empty: "No priority alerts — you're caught up."
- `review` present → show the in-flight review state inline (already partially handled).

### Backend

`pulse.listPriorityQueue` (already called — just render its full payload).

---

## Spec 7 — **Source health & coverage** observability + retry

### Purpose

The firm is trusting this product to _watch every tax authority for them_. The natural anxiety is "are you actually watching everything for my states, and is it working?" The backend answers both — per-source health (last check, failures, errors) and per-jurisdiction coverage by role — but the UI reduces all of it to a single "IRS + CA FTB + N more" label string, and the helper that should surface failing sources is **stubbed to return `[]`**. This is a credibility surface that's currently blank.

### Current state

`listSourceHealth` is called but only mined for a label; `sourcesNeedingAttention()` returns `[]` (stub). `listAlertSourceCoverage` and `retrySourceHealth` are entirely unused.

### Data

**Per-source** (`PulseSourceHealthSchema`): `{ sourceId, label, tier (T1/T2/T3), jurisdiction, purpose, enabled, healthStatus, lastCheckedAt, lastSuccessAt, nextCheckAt, consecutiveFailures, lastError }`.

**Per-jurisdiction coverage** (`PulseAlertSourceCoverageSchema`): `{ jurisdiction, status (covered|missing_source), coverageLevel (missing|standard|comprehensive), parserStatus (web_primary|email_signal_only|missing_source), requiredRoles[], coveredRoles[], missingRoles[], roleDetails[] (per-role status + reason), lastCheckedAt, lastSuccessAt, lastFailureAt, lastError, missingReason }`. Roles ∈ `primary_web_news, guidance_notice, email_signal, rule_source_watch, tax_type_sources, relief_or_disaster_signal, multi_agency_sources`.

### Layout

A **"Source coverage" panel** on `/alerts` (or a settings sub-page):

1. **Coverage matrix** — jurisdiction × role grid from `listAlertSourceCoverage`. Cell = covered ✓ / missing ✗ / verified-N/A. A jurisdiction's `coverageLevel` drives a summary chip (missing / standard / comprehensive). `missingRoles` + `missingReason` drive a "coverage gap" callout ("CA: we watch primary web + guidance notices but are missing the email-signal role").
2. **Source health list** — one row per source: `label`, `tier`, `healthStatus` chip, "last checked {lastCheckedAt}", "next check {nextCheckAt}", and on failure: `consecutiveFailures` + `lastError`. Sort failing/degraded to the top (replace the stubbed `sourcesNeedingAttention()`).
3. **Retry action** — on a degraded/failing source, a "**Re-check now**" button → `retrySourceHealth({ sourceId })`, which returns the refreshed source list. Gives a way to force a poll instead of waiting for `nextCheckAt`.

### States

- All healthy → a calm "All {n} sources healthy, last checked {time}" banner (this can stay as today's all-clear, just backed by real per-source data).

### Backend

`listSourceHealth` (render fully), `listAlertSourceCoverage` (new render), `retrySourceHealth` (new action).

---

## Spec 8 — Migration **"Resume your import"** prompt

### Purpose

Importing a client book is a long, multi-step wizard (map → normalize → matrix → dry-run → apply). If a user leaves mid-way, the draft is parked but the only way back is to _remember_ it's in a history drawer and dig it out. The backend has a purpose-built "what's my in-progress import?" lookup designed to offer Resume on return — it's just never called.

### Current state

`migration.getResumableImport` is unused. The resume _machinery_ works (`Wizard.tsx` accepts a `resumeBatchId`, rehydrates step from status), but every normal entry point (command palette, banner CTA) calls `openWizard()` with no batch → always starts fresh.

### Data (`getResumableImport` → `MigrationBatch | null`, `migration.ts:388`)

The in-progress batch (status ∈ `draft | mapping | reviewing`) or `null`. `MigrationBatch` carries `{ source, rawInputFileName, rowCount, status, aiGlobalConfidence, createdAt, updatedAt, ... }`.

### Layout

1. **On wizard open** (and/or as a dashboard banner on app return): call `getResumableImport`. If non-null, show a **Resume card** _before_ the fresh-start step: "You have an unfinished import — **{rawInputFileName}**, {rowCount} rows, started {createdAt}. **Resume** · **Discard**." Resume → feed the batch id into the existing `resumeBatchId` path; Discard → `discardDraft`.
2. Map `status` to the human step name ("paused at: Map columns" / "Review" / "Draft") so the user knows where they'll land.

### States

- `null` → no card; normal fresh wizard.
- Only one in-progress import exists per firm by design (the contract returns a single batch), so no list needed here — the full history drawer (already built) covers past batches.

### Backend

`migration.getResumableImport` (new call) + existing `resumeBatchId` flow + `discardDraft`.

---

# Part B — Complete catalog of every other gap

Grouped by domain. "Unused" = procedure never referenced in `apps/app`. "Field dropped" = procedure is called but these fields aren't rendered. "Flow gap" = a capability exists but the affordance is missing/partial.

## Obligations (core queue)

- **Unused · `createBatch`** — bulk/paste creation of many hand-entered deadlines at once (distinct from rule-driven `createFromRules` and CSV migration). Add "Add several…" to the +New menu.
- **Unused · `previewReprojection` + `applyReprojection`** — **date-drift report**: when a verified rule's computed date changes, already-generated deadlines carry a stale `baseDueDate`. Returns per-row `oldBaseDueDate → newBaseDueDate` + `disposition` (`will_update` / `requires_review` / `no_verified_rule`) + summary counts. Reuse the _exact_ preview→apply pattern Annual Rollover already uses.
- **Unused · `listProjectedDeadlines`** — a focused "**Projected deadlines to confirm (N)**" inbox: unconfirmed deadlines awaiting CPA confirmation before re-entering reminders. Today partially reachable via the queue's `projected` lens, but the purpose-built endpoint (groupable by `generationSource`) is unused.
- **Unused · `updateDueDate`** — inline "adjust due date" edit on a single obligation. Today dates change only indirectly via extension / tax-year flows.
- **Field dropped · extension pipeline** — `extensionState`, `extensionFiledAt`, `extensionAcceptedAt`, `extensionFormName` (the full 8-state extension lifecycle) not shown; the Extension tab uses only `decideExtension` + policy.
- **Field dropped · payment/review/efile** — `paymentConfirmedAt`, `reviewerUserId` + `reviewCompletedAt` ("who reviewed, when"), and the full 10-state `efileState` are collapsed into a milestone helper rather than shown as true pipeline states.
- **Field dropped · provenance** — `generationSource` (migration/manual/rollover/pulse) and `taxPeriodSource` + `taxPeriodReviewReason` ("verify this period") not surfaced as cues. `taxPeriodKind` (`short`, `52_53_week`) unbadged.

## Clients / Portfolio

- **Unused · `clients.createBatch`** — lightweight paste-many client creation (today: single dialog or the heavyweight CSV migration — nothing between).
- **Unused · `clients.updateTaxYearProfile`** — make a client's tax-year / fiscal-year-end **editable on the client page** (it's display-only there today; only editable deep inside an individual obligation drawer — backwards, since it's a client-level fact). Returns `recalculatedObligationCount` for a confirmation toast.
- **Unused (not yet in router) · `clients.previewClassificationRecompute` + `applyClassificationRecompute`** — entity-type / S-election / check-the-box (8832) change **with obligation-impact preview** (`will_add` / `unchanged` / `orphan_safe` / `orphan_needs_confirmation` dispositions + confirm-orphans flow + audit). A complete safety pattern, no UI at all. `entityType`/`taxClassification` are display-only. _(Phase 1 backend; design now so it's ready.)_
- **Field dropped · `ClientPublic`** — `legalEntity` never displayed. Activity flags `hasForeignAccounts` / `hasPayroll` / `hasSalesTax` / `has1099Vendors` / `hasK1Activity` are write-once at create and then invisible _and_ have no update path (surface + add edit, or they're dead data).
- **Flow gap · penalty inputs** — `estimatedTaxLiabilityCents` / `equityOwnerCount` editable only from the obligations queue, not the client page (same client-vs-obligation inversion as tax-year).

## Dashboard / Workload

- **Unused · `dashboard.requestBriefRefresh`** — the regenerate button (see Spec 2).
- **Field dropped · brief + citations** — entire `brief` object unrendered (Spec 2).
- **Field dropped · triage tabs** — `this_month` and `long_term` tabs returned but only `this_week` renders.
- **Flow gap · facet filters** — `DashboardFacetsOutput` (clients/taxTypes/dueBuckets/statuses/severities/evidence, each with server counts) is fetched but only used to read two numbers; the faceted-filter bar is dormant (v2 UI dropped controls).
- **Field dropped · penalty roll-up** — `summary.totalAccruedPenaltyCents` + `accruedPenaltyReady/NeedsInput/Unsupported` counts available for a portfolio exposure tile.
- **Flow gap · workload window** — `WorkloadLoadInput.windowDays` (1–30) is **hardcoded to 7**; add a 7/14/30 picker. (`managerInsights` — capacity owner, load score, unassigned/waiting/review backlogs — _is_ surfaced; only the window control is missing.)

## Smart Priority (cross-cutting)

- **Field dropped · factor breakdown** — `SmartPriorityBreakdown` carries per-factor `weight`, `rawValue` ("Due in 3 days"), `normalized`, `contribution`, `sourceLabel`, plus `score`/`rank`. The dashboard rank tooltip shows only 2 factor _labels_; the `/practice` weight-tuning preview shows score deltas but never _which factor_ moved. Add a "**Why this rank?**" popover with stacked factor-contribution bars (urgency/importance/history/readiness), and show the driving factor in the preview rows.

## Pulse / Alerts (beyond Specs 6–7)

- **Field dropped · `PulseDetail.structuredChange`** — machine-parsed change payload, unrendered (lower priority; untyped).
- **Field dropped · `duplicateSourceSnapshotCount`** — corroboration signal ("confirmed by N sources"), not on the alert card.
- **Field dropped · morning sweep `generatedAt`** — freshness deliberately dropped; flag only if wanted back.

## Rules (beyond Spec 3)

- **Field dropped · `RuleCoverageRow`** — `missingSourceDomains[]`, per-entity `entitySourceCoverage`, and `rejectedRuleCount` / `archivedRuleCount` / `customRuleCount` / `pendingReviewCount` lifecycle counts may not all render in the coverage tab.
- **Field dropped · `TemporaryRule`** — `appliedObligationCount` / `activeObligationCount` / `revertedObligationCount` split and `overrideType` (extend_due_date vs waive_penalty) — verify the temporary-rules tab shows these, not just a flat list.

## Readiness / Evidence / Reminders / Notifications (beyond Spec 5)

- **Unused · `readiness.listByObligation`** — request-history timeline (covered in Spec 5 CPA companion).
- **Field dropped · readiness lifecycle** — `sentAt` / `firstOpenedAt` / `lastRespondedAt` not shown in the drawer; only latest `status` + `expiresAt`.
- **Field dropped · `previewRequestEmail` template attribution** — `templateName`/`templateKey` not shown ("Using template: …" + edit link).
- **Field dropped · evidence `model`** — which AI model produced the output isn't shown in the evidence drawer (provenance/trust).
- **Field dropped · reminders overview** — `queuedTodayCount` and `failedLast7DaysCount` (a deliverability red flag) hidden; only 4 of 6 stat tiles render. The failed tile can deep-link to the failed rows (which already render `failureReason`).
- **Flow gap · calendar firm feed** — `scope: 'firm'` (practice-wide deadline feed) is fully plumbed in the card component but never added to the rendered list — a one-line, role-gated unlock.
- **Flow gap · notifications** — badge counts client-side off a 50-item page (`unreadCount` exists and is accurate); no type filter (the `type` param is unused) and no pagination (`nextCursor` unused) → older notifications unreachable.

## Admin / Audit / Migration (beyond Spec 8)

- **Unused · `audit.getEvidencePackage`** — no per-package detail view and, critically, **no polling**: a freshly-requested export sits on a stale `pending` badge and never flips to `ready` without closing/reopening. Add a package-history list + a polling status row that activates Download on `ready` and surfaces `failureReason` / `expiresAt` / `sha256Hash` / `fileManifestJson` (chain-of-custody). Also: only `scope:'firm'` exports are requested though `client`/`obligation`/`migration` scopes exist.
- **Field dropped · audit filters** — `actorType` filter (`user`/`system`/`ai`/`ai_assisted`/`ai_any` — the human/AI/system segmented control the schema clearly anticipates) is never sent; server-side `search` is unused (search is client-side over the current page only).
- **Flow gap · firm settings** — verify `coordinatorCanSeeDollars` actually renders a toggle (it's round-tripped in state but a control wasn't found).

## Verified complete (no action needed)

Members lifecycle (invite/role/suspend/reactivate/remove/cancel+resend), Security (2FA + session management), Billing (subscriptions + checkout), Opportunities (list/dismiss/snooze/restore/dismissed), Notification preferences, Reminder templates editing, and the Migration pipeline steps themselves are all well-surfaced — remaining gaps there are field-level only and listed above.
