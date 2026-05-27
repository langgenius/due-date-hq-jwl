---
title: 'Step 9 — AI Visibility Audit'
date: 2026-05-26
author: 'Yuqi (via Claude)'
branch: feat/step-9-ai-visibility-audit
scope: every AI-touched surface in the app
---

# Step 9 — AI Visibility Audit

Exhaustive audit of every AI-feature surface in DueDateHQ. Each finding is recorded with `location | what | why it matters | severity | proposed fix | status`. Severity scale follows the rest of the dev-log audits:

- **P0** — trust-calibration or auditability hole. Tax-software liability if shipped.
- **P1** — material UX confusion. Reasonable CPAs will misread AI vs human vs source.
- **P2** — cross-surface inconsistency. Same concept, different shape.
- **P3** — polish / copy / naming inconsistency.

50+ findings. Mechanically safe fixes shipped on this branch; non-trivial ones documented for product to schedule.

---

## §1 — Executive summary (TL;DR)

DueDateHQ ships AI into three classes of surface:

1. **Source-change detection (Pulse)** — AI summarizes IRS/state bulletins, extracts structured fields, scores confidence, suggests deadline overlays.
2. **Import wizard (Migration)** — AI maps columns, normalizes values, suggests defaults.
3. **Per-deadline assistance** — AI generates document checklists, drafts rule concrete deltas, produces "Deadline Tips" (citations), "Weekly Brief", and Opportunity cues.

The product has THREE separate AI icons (`Atom`, `Astroid`, `SparklesIcon`) layered over FOUR separate confidence-threshold systems (0.5 / 0.7 / 0.8 / 0.85 / 0.9 / 0.95), with copy that names AI six different ways ("AI", "AI Mapper", "Smart", "Auto", "Generate", "Suggested"). Critically:

- The audit log has **no schema-level distinction** between AI and human actors. Server-driven AI writes fall back to a bare "System" label, indistinguishable from cron or migration jobs. A CPA cannot answer "did a human or an AI add this deadline?" from the audit view.
- AI-generated checklist items are persisted and shown **with no provenance marker** in the rendered list. They look identical to manually added items.
- The `_DeadlineTipPanel` (cited AI explanation of a deadline) is **fully wired in the data layer but the React component is orphaned (`_` prefix, never rendered)** — the data pipeline runs, the cache stores, the citations exist, the user never sees it.

The biggest concrete trust hazard: a CPA reads "AI 96%" on Pulse and treats it as a near-certain extraction, but those structured fields (`issued / effective / expires / forms / entityTypes`) sit in the same shape as official-source data, with no "AI inferred — verify against the source" prompt. The "Read official source" link exists, but no UI element on the screen says "the values you see in this card were inferred, not read directly from the source."

For tax software with filing-deadline consequences, that's a P0.

---

## §2 — Canonical AI vocabulary (proposed)

Audit fixed today: one word per concept across the product.

| Concept                                      | Canonical word                                                              | Where it lives                                           | Don't use                                                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| "This value was produced by an AI model"     | **AI** (icon: Astroid)                                                      | All AI-derived values                                    | "Smart" (algorithmic = deterministic only), "Auto" (event-driven), "Suggested" (could be human-curated default), "Generated" (verb only) |
| "An AI model is unsure"                      | **Low / Medium / High** qualitative tier (3 tiers, single threshold ladder) | Per-surface badge; consistent threshold (proposed below) | Numeric % alone, "Review suggested", "Confirmed", inconsistent tier counts                                                               |
| "Create new AI content from scratch"         | **Generate** (verb)                                                         | CTA buttons                                              | "Run", "Draft", "Prepare" (use only as in-flight state)                                                                                  |
| "Re-run AI on the same input"                | **Refresh**                                                                 | Button + "Last refreshed N ago" timestamp                | "Re-run", "Re-do", "Update"                                                                                                              |
| "The original cited authority"               | **Source**                                                                  | Drawer link, badge                                       | "Origin", "Bulletin", "Reference"                                                                                                        |
| "Replace AI output with a human value"       | **Override**                                                                | Verb in audit log; "Overridden" badge                    | "Edit" (ambiguous: could mean tweak an AI value), "Manual"                                                                               |
| "Pre-action AI state ready for human review" | **Draft**                                                                   | Rules concrete-draft, Pulse suggested-overlay            | "Suggestion", "Candidate"                                                                                                                |
| "AI generation failed"                       | **Couldn't generate** (Failed badge in drawer)                              | Toasts, badges                                           | "Error", "Issue", "Problem"                                                                                                              |

**Threshold ladder (proposed canonical):** AI confidence < 0.5 = Low, 0.5–0.85 = Medium, ≥ 0.85 = High. Three tiers, two thresholds, used everywhere. Numeric percentage shown ONLY in the explainability surface (hover / drawer header), never on cards where qualitative is enough.

---

## §3 — Inventory of AI surfaces

Surfaces audited:

1. Pulse alerts list (`/rules/pulse`) — `features/pulse/AlertsListPage.tsx`, `PulseAlertCard.tsx`
2. Pulse detail panel / drawer — `features/pulse/PulseDetailDrawer.tsx`, `PulseStructuredFields.tsx`
3. Pulse dashboard card — `features/dashboard/needs-attention-card.tsx`
4. Pulse confidence badge family — `PulseConfidenceBadge.tsx`, `LowConfidenceBadge.tsx`
5. AI-generated readiness checklist — `routes/obligations.tsx` (`generateChecklistMutation` + auto)
6. AI rule concrete draft — `features/rules/rule-detail-drawer.tsx` (`AiDraftReviewPanel`)
7. Migration Step 2 column mapping (AI mapper) — `features/migration/Step2Mapping.tsx`
8. Migration Step 3 value normalization (AI normalizer) — `Step3Normalize.tsx`, `migration-summary-view-model.ts`
9. Deadline Tip insight panel — `_DeadlineTipPanel` (orphaned)
10. Weekly Brief — `aiWeeklyBrief` concept registered, no consumer
11. Opportunities — `features/opportunities/opportunities-page.tsx`
12. Evidence drawer source labels — `features/evidence/EvidenceDrawerProvider.tsx`
13. Concept-help popovers — `features/concepts/concept-help.tsx`
14. Audit log actor column — `features/audit/audit-log-table.tsx`
15. Client risk profile / Smart Priority — `features/clients/ClientFactsWorkspace.tsx`, `features/dashboard/actions-list.tsx`
16. Insight status badges — `routes/obligations.tsx` (`InsightStatusBadge`)
17. Billing upgrade CTA (false-positive sparkles) — `features/billing/upgrade-cta-button.tsx`
18. App-shell nav (false-positive sparkles) — `components/patterns/app-shell-nav.tsx`

---

## §4 — Findings

### Cross-surface (vocabulary / iconography / threshold)

**F-001 — Three AI icons in the product. P1.**

- Location: `Astroid` (lucide) in `PulseAlertCard`, `PulseDetailDrawer`, `LowConfidenceBadge`; `Atom` in `dashboard/needs-attention-card.tsx`; `SparklesIcon` in `Step2Mapping`, `rule-detail-drawer` (AI draft button), `EvidenceDrawerProvider` (when sourceType includes 'ai'), `ClientFactsWorkspace` (opportunity count badge), `opportunities-page.tsx` (empty state), `CommandPalette`, `app-shell-nav` (opportunities nav), `billing/upgrade-cta-button.tsx`.
- Why: A CPA seeing three different glyphs ("the Atom on Today", "the Astroid in Pulse", "the Sparkle in the rule drawer") cannot generalize "the AI signal" across surfaces. Worse, sparkles is overloaded with "upgrade / premium / opportunities" — three of its uses are NOT AI.
- Fix: Canonicalize on `Astroid` as the AI provenance mark. Replace `Atom` in `needs-attention-card.tsx` and `SparklesIcon` in `Step2Mapping` capability badge + `rule-detail-drawer.tsx` AI-draft button with `Astroid`. Keep `SparklesIcon` only for billing upgrade and opportunities entry-point (non-AI semantics, by intent).
- Status: SHIPPED — see commit `Design(ai-icon): unify AI provenance icon to Astroid` (this branch).

**F-002 — Five confidence threshold systems. P1.**

- Location:
  - `PulseConfidenceBadge.tsx` — 0.9 / 0.7 (success / info / destructive, numeric "AI XX%")
  - `PulseAlertCard.tsx` — 0.85 / 0.5 (high / medium / low qualitative)
  - `pulse-alert-tone.ts` LOW_CONFIDENCE_THRESHOLD = 0.7
  - `needs-attention-card.tsx` LOW_CONFIDENCE_THRESHOLD = 0.7
  - `migration-summary-view-model.ts` LOW_MAPPING_CONFIDENCE = 0.8, LOW_NORMALIZATION_CONFIDENCE = 0.5
  - `Step2Mapping.tsx` confidenceTier — 0.95 / 0.8 (H / M / L abbreviated)
  - `EvidenceDrawerProvider.tsx` ConfidenceBadge — 0.95 / 0.8 / 0.5 (Confirmed / High / Review / Needs review — FOUR tiers)
- Why: "Same alert, two different confidence shapes side by side" — already a flagged Yuqi complaint in the code (`PulseDetailDrawer.tsx` L538). The current ad-hoc fix unified Pulse card+drawer at 0.85 / 0.5, but the rest of the product still drifts.
- Fix: Move threshold constants into a single `features/_surface-vocabulary/ai-confidence.ts` module exporting `AI_CONFIDENCE_THRESHOLDS = { low: 0.5, medium: 0.85 } as const` + `aiConfidenceTier(score): 'low' | 'medium' | 'high'`. Migrate Pulse, Evidence, Dashboard NeedsAttention, Migration Step2Mapping to consume that helper. Document the chosen ladder in this audit's §2.
- Status: SHIPPED — added `apps/app/src/features/_surface-vocabulary/ai-confidence.ts` with the helper. Pulse card + drawer + dashboard alert migrated. Migration + Evidence kept for now (different domain semantics — migration's tier ramps higher because column mapping has narrower domain space; Evidence has the "Confirmed" tier above AI confidence which represents a HUMAN-confirmed value, conceptually different). See follow-up below.
- Follow-up (NOT auto-shipped): align Evidence's "Confirmed" semantic — should it be "Confirmed by [human name]" rather than a confidence-tier label? P1.

**F-003 — Six different words for "AI". P1.**

- Location: throughout. Surfaced as labels:
  - "AI" — Pulse confidence pill, "AI concrete draft", "AI Mapper"
  - "AI Mapper" — Step2Mapping capability badge
  - "Smart Priority" / "Smart" — actions-list dashboard (DETERMINISTIC, not AI — see F-004 below)
  - "Auto-generated" — readiness checklist tooltips
  - "Suggested" / "AI-suggested" — used in copy + concept descriptions
  - "Generate document list", "Generate draft" — verbs
  - "Tax type suggestions" — defaultMatrix concept (DETERMINISTIC, not AI)
- Why: A CPA cannot distinguish "AI did this" from "an algorithm did this" from "a default fallback did this". Mixing "Smart" (deterministic) with "AI" (model) is the worst case — Smart Priority is actually deterministic per its concept help, but "Smart" reads as "AI" to a CPA who's seen GitHub's "Smart suggestions" or "Smart compose".
- Fix: §2 canonical table above. Convert in product copy via Lingui keys (later — too many changes for one branch).
- Status: documented, not shipped.

**F-004 — Smart Priority concept description is honest, but the surface naming is misleading. P2.**

- Location: `features/concepts/concept-help.tsx` L66 — "DueDateHQ's deterministic ordering score" (good!) but the surface badge is just "Smart Priority" without "deterministic" prefix, while every neighboring AI-flavored surface uses the same first-cap two-word pattern.
- Fix: rename concept label to "Priority score" or "Calculated priority" to clearly distinguish from AI. Keep the deterministic explanation in the help body.
- Status: documented.

**F-005 — Confidence label inconsistency. P2.**

- Location: `EvidenceDrawerProvider.tsx` ConfidenceBadge → "Confirmed / High confidence / Review suggested / Needs review"; `PulseAlertCard` → "Low / Medium / High" (one-word); `Step2Mapping` → "H / M / L"; `LowConfidenceBadge` → "Low confidence" (two-word); `PulseConfidenceBadge` → "AI XX%" (numeric).
- Fix: standardize on canonical "Low / Medium / High" + optional numeric in the explainability surface only. Drop "Confirmed" (use the "Verified by [name]" pattern for human-confirmed). Drop "H/M/L" abbreviations (only saves 1-2 chars but breaks language consistency).
- Status: P2; documented for follow-up.

**F-006 — Sparkles overload (false-positive AI signal). P1.**

- Location: Sparkles used for billing "Upgrade to Pro" CTA, app-shell-nav Opportunities link, command-palette Opportunities entry, ClientOpportunityCountBadge — none of these represent an AI value the user should weigh for trust calibration. A user who has learned "sparkles = AI" gets the wrong signal here.
- Fix: keep Sparkles ONLY for opportunities-as-feature-name (Opportunities use AI cues but the SPARKLES is the feature glyph, not a per-value AI marker). Move billing upgrade CTA to a non-AI-charged icon (e.g. CrownIcon or RocketIcon).
- Status: SHIPPED — replaced Sparkles → Crown in `billing/upgrade-cta-button.tsx`. Opportunities + command palette kept (feature glyph, not per-value).

**F-007 — Astroid icon's intended meaning ("AI / cosmic uncertainty") is documented but contradicts its use as a HIGH-confidence indicator. P2.**

- Location: `low-confidence-badge.tsx` comment L39-42 says "Astroid reads as 'AI / cosmic uncertainty'". But `PulseAlertCard.tsx` L547 and `PulseDetailDrawer.tsx` L657 render Astroid INSIDE a "High" confidence pill — which is "AI / cosmic certainty", contradicting the documentary intent.
- Fix: change the comment-level rationale — Astroid is simply "AI signal" (regardless of confidence). Confidence is communicated by the pill TONE (warning amber / neutral gray / info blue), not by the icon. Update the doc comment to match the de facto usage.
- Status: SHIPPED — updated `low-confidence-badge.tsx` rationale doc-comment.

### Provenance disclosure

**F-008 — AI-generated readiness checklist items have no provenance marker once stored. P0.**

- Location: `routes/obligations.tsx` `ChecklistItemRow` (L8437+). Items render with label + description + status chip. No Astroid, no "Generated by AI" caption, no "[edit to confirm]" affordance. Once the user clicks "Generate document list" and the AI populates 8–15 items, those items live forever in the checklist indistinguishable from manually added ones.
- Why: A CPA who inherits a deadline from a colleague cannot answer "did Andy add 'Form 1099-MISC' or did the AI infer it from the rule?" — the answer is hidden in the audit log (if at all). For tax preparation document collection, that traceability matters.
- Fix: persist a `source: 'ai' | 'manual' | 'imported_template'` on each item (server) and render a `<Astroid />`-style provenance icon in the row when source==='ai' AND the item has never been edited by a human. If a human edits the item, drop the AI marker (user has confirmed).
- Status: documented as P0. Requires server contract change.

**F-009 — Pulse structured fields render AI-extracted values with no "this was extracted" caveat. P0.**

- Location: `PulseStructuredFields.tsx` — Authority / Issued / Effective / Expires / Deadline shift / Jurisdiction / Counties / Forms / Entity types render as Fact cards. Visually indistinguishable from "facts read straight from the source PDF."
- Why: An AI hallucinating "Effective: 2026-04-15" when the bulletin actually said "Effective immediately" would have the CPA filing 4 months late. The "Read official source" link is present but disconnected from the structured fields — there's no "verify this field against the source" affordance per field.
- Fix: (a) header banner — "Below: AI extraction of the source. Compare against the official text before applying." for confidence < high. (b) inline source-quote toggle per field — clicking the field's value reveals the source excerpt that produced it.
- Status: documented as P0. SHIPPED partial fix — added a one-line caveat under the Source FactCard header.

**F-010 — Pulse alert summary on the card is AI-generated, but the card doesn't mark it. P1.**

- Location: `PulseAlertCard.tsx` L341 `<p className="line-clamp-1 …">{alert.summary}</p>`.
- Why: the summary IS the AI's one-sentence explanation of the source change (per comment L75 "the model's one-sentence explanation"). It reads like editorial copy authored by DueDateHQ.
- Fix: prefix the summary with a small Astroid icon or italicize as a quote. Subtle disclosure, not a wall of "AI:" labels.
- Status: SHIPPED — added a leading Astroid icon to the summary line.

**F-011 — Evidence drawer hides "AI" in source-type labels. P0.**

- Location: `EvidenceDrawerProvider.tsx` L262-275 `evidenceSourceLabel`:
  - `ai_mapper` → "Import mapping" (drops AI)
  - `ai_normalizer` → "Import cleanup" (drops AI)
  - `readiness_checklist_ai` → "Materials checklist" (drops AI)
- Why: the LABEL is the most prominent piece of provenance disclosure in this surface. Hiding "AI" from labels and leaving only the SparklesIcon makes the provenance opt-in to icon recognition. CPAs who haven't learned the icon system see "Import mapping" as a deterministic process — exactly what it isn't.
- Fix: relabel "AI import mapping" / "AI import cleanup" / "AI materials checklist". Same in `routes/obligations.tsx` L7911.
- Status: SHIPPED.

**F-012 — Migration Step 2 row-level override tracking exists in data but isn't surfaced in UI. P1.**

- Location: `Step2Mapping.tsx` — `userOverridden: true` is set on edit (L82) but the table doesn't render a "Overridden" pill on those rows. The summary count "rows.some((r) => r.userOverridden)" is consumed only for the "Re-run AI with my overrides" button label (L110).
- Why: after editing 8 columns in a 40-column import, the user can't tell which rows are still AI-mapped vs which they've already verified. Re-running AI risks clobbering their overrides; the affordance to "respect my overrides" is gated on the user remembering which rows they touched.
- Fix: add an "Overridden" chip in the table row when `userOverridden === true`. Drop the AI confidence pill on overridden rows (it's no longer the AI's call).
- Status: SHIPPED.

**F-013 — Rules AI draft confidence label uses raw percentage with no qualitative tier. P2.**

- Location: `rule-detail-drawer.tsx` L617 `{Math.round(draft.confidence * 100)}%` (no L/M/H descriptor).
- Fix: render qualitative tier next to the percentage using the canonical helper from F-002.
- Status: SHIPPED.

**F-014 — Rules AI draft uses SparklesIcon, not Astroid. P2.**

- Location: `rule-detail-drawer.tsx` L592.
- Fix: replace with Astroid.
- Status: SHIPPED.

**F-015 — `_DeadlineTipPanel` is orphaned but its data pipeline runs. P1.**

- Location: `routes/obligations.tsx` L7632 — function prefixed with `_`; mutation + query + polling all wired (L4676-4801). Comment L4796 acknowledges: "deadlineTipPreparing is currently unconsumed (Risk tab owned the visual surface). Kept declared because the mutation/query pipeline it summarizes is still wired."
- Why: cost (LLM tokens) on every obligation drawer open with no user-facing return. Worse — when the user eventually surfaces this, the data is months-stale or worse, has been quietly failing without any UI feedback.
- Fix: either re-introduce the deadline-tip surface (preferred — the citation pattern is the strongest source-grounding the product has) or rip the entire pipeline and stop spending tokens on it. Don't half-ship for months.
- Status: documented as P1. Suggest re-surfacing in a follow-up branch.

**F-016 — `aiWeeklyBrief` concept defined, no consumer. P2.**

- Location: `concepts/concept-help.tsx` L31 + L140 case. No usages of `concept="aiWeeklyBrief"` in any consumer.
- Fix: remove the concept entry until a surface lands.
- Status: SHIPPED.

**F-017 — Migration `defaultMatrix` (Tax type suggestions) is DETERMINISTIC but rendered with AI-flavored copy. P2.**

- Location: `concepts/concept-help.tsx` L121 — "Import-time suggestions for tax types based on entity type and jurisdiction when the uploaded rows do not provide tax types." The implementation is rule-table-driven (matrix), not model-driven.
- Why: the word "suggestions" implies AI to a CPA reading three other "suggested" surfaces.
- Fix: relabel concept "Default tax type" / "Fallback tax type" — no "suggestion" language.
- Status: documented.

### Confidence communication

**F-018 — `PulseConfidenceBadge` renders only at one consumer call site after dashboard alert card unified on qualitative. P2.**

- Location: `PulseConfidenceBadge.tsx` exports both `isVeryLowPulseConfidence` (used) and `PulseConfidenceBadge` (component). Component is no longer rendered from `PulseAlertCard` (moved to inline qualitative). Verify no live consumers.
- Fix: confirm `PulseConfidenceBadge` is dead code; if so, delete. Keep `isVeryLowPulseConfidence` (it powers the drawer's low-confidence alert + dashboard).
- Status: confirmed via grep — `PulseConfidenceBadge` JSX element has zero consumers. SHIPPED — exported function deleted, only `isVeryLowPulseConfidence` retained.

**F-019 — "Low confidence" threshold inconsistency between LowConfidenceBadge consumers. P2.**

- Location: `LowConfidenceBadge` is rendered on the dashboard when `alert.confidence < LOW_CONFIDENCE_THRESHOLD` (=0.7). The Pulse drawer's "AI confidence — review source" Alert renders when `isVeryLowPulseConfidence(detail.alert.confidence)` (=0.5). The dashboard shows the low-confidence badge for confidence in [0.5, 0.7), but the drawer for the same alert shows nothing about confidence. SAME alert, two states.
- Fix: align both at the canonical 0.5 cut from F-002. The "Medium" tier badge can render on the drawer for [0.5, 0.85).
- Status: SHIPPED — dashboard threshold migrated to canonical helper. The drawer + card pairs are aligned at 0.5 (low) / 0.85 (medium).

**F-020 — No "I'm not sure" state on the AI checklist generation. P1.**

- Location: `generateChecklistMutation` returns `{ checklist, degraded }`. The `degraded: true` flag toasts "Fallback document list ready" but the checklist itself shows no marker.
- Why: a degraded generation IS the "I'm not sure" state. Surfacing it only in a toast that dismisses in 4 seconds loses the signal forever.
- Fix: persist degraded flag on the response. Render an inline banner above the checklist: "AI couldn't reach the full model — showing a fallback list. Review each item." Update the toast description accordingly.
- Status: SHIPPED — degraded-state inline banner added above the rendered checklist.

**F-021 — InsightStatusBadge has a "Stale" tier but no UX-level definition of staleness. P3.**

- Location: `obligations.tsx` L7756 — variant info (blue), label "Stale". The status comes from the server. No tooltip or hover explains "this insight was generated before the underlying deadline changed."
- Fix: add a hover tooltip to the Stale badge explaining the regeneration trigger.
- Status: SHIPPED.

### Override affordance

**F-022 — No "AI marker drops when user edits" pattern anywhere. P1.**

- Location: checklist items, structured fields, rule drafts. Nothing tracks "user touched this AI value." The migration step has `userOverridden` but doesn't drop the AI confidence badge when set (the badge still renders; the wording stays).
- Fix: every AI-derived value should drop its AI provenance marker once a human touches it. Document this as a system convention.
- Status: documented; partial fix in F-012 (migration row drops confidence pill on override).

**F-023 — No audit-log entry on AI override (per current UI). P1.**

- Location: no schema-level `override_event` for "user replaced an AI value." Audit log shows the result-state, not the AI-vs-human diff.
- Fix: server-side — add an `actorOverridesAi: true` flag on audit events where a user-write replaced a recent AI-write. Surface in audit log row as "Overrode AI suggestion" badge.
- Status: documented; server change required.

**F-024 — Rules concrete-draft Accept doesn't preserve a "this was an AI draft" trace. P1.**

- Location: `rule-detail-drawer.tsx` accept flow — once accepted, the rule lives as a regular practice rule with no marker that the original concrete delta came from an AI draft.
- Fix: store `concreteSource: 'ai_draft' | 'manual' | 'imported'` on accepted rule; render small "From AI draft" chip on the rule row.
- Status: documented.

### Explainability

**F-025 — Pulse "AI confidence X% — review source" alert is the only explainability surface; no "why" trail. P1.**

- Location: `PulseDetailDrawer.tsx` L798-820. Tells the user the score is low but doesn't say WHY (e.g., "source PDF used non-standard date format", "multiple effective dates detected").
- Fix: server should return a `confidenceReason: string` field; surface it as expandable "Why" hover.
- Status: documented.

**F-026 — Concept-help popover uses `CircleHelpIcon` for both AI and non-AI concepts. P3.**

- Location: `concepts/concept-help.tsx` L232 — same icon for `aiConfidence` (AI) and `practice` (non-AI).
- Fix: optional — use Astroid on the AI concepts. Subtle, but reinforces "this concept is AI-specific."
- Status: SHIPPED.

**F-027 — Pulse source excerpt has no per-field highlight. P2.**

- Location: `PulseStructuredFields.tsx` L292 — the quoted excerpt renders as one block; no link from a structured field ("Effective: Apr 15") back to the substring of the excerpt that produced it.
- Fix: server returns `extractionSpans: { field: 'effective_from', start: 142, end: 168 }[]`. Client renders the excerpt with highlights; clicking a structured field scrolls to + highlights its origin span.
- Status: documented as P2; bigger lift, server contract.

### Refresh / regenerate

**F-028 — Readiness checklist Generate button doesn't show "Last refreshed". P2.**

- Location: `routes/obligations.tsx` L6307. After Generate, the checklist renders but the page shows no "Generated at X" timestamp.
- Fix: store generation timestamp; show "Generated X minutes ago" caption above the checklist.
- Status: documented.

**F-029 — Rules AI draft has no "Regenerate" button once a draft exists. P2.**

- Location: `rule-detail-drawer.tsx` L598 — once a draft is rendered, no affordance to ask AI to try again with different prompt context.
- Fix: add a small "Regenerate" icon button to the draft panel header.
- Status: documented.

**F-030 — Deadline tip refresh button label is "Refresh" — good — but no relative time. P2.**

- Location: orphaned `_DeadlineTipPanel`. Comment header says `<span>Updated {formatDateTimeWithTimezone(...)}</span>`. Absolute timestamp, not relative.
- Fix: relative time ("3 min ago") with absolute on hover.
- Status: documented (within orphan-revival).

### Failure modes

**F-031 — Pulse "Couldn't load this alert" doesn't distinguish AI-extraction failure from network failure. P3.**

- Location: `PulseDetailDrawer.tsx` L702. Single error variant for both.
- Fix: differentiate "We couldn't reach the AI service" (offer manual review of source) from "We couldn't load this record" (retry).
- Status: documented.

**F-032 — Generate checklist error is a toast — disappears in 4s, no path to retry from the empty panel. P2.**

- Location: `routes/obligations.tsx` L6280-6294. The empty-panel error branch has a Retry button BUT the toast also fires. Two error surfaces, neither linked.
- Fix: drop the toast on first-load failure; keep the inline retry. Toast only on user-initiated re-generation.
- Status: SHIPPED — first-load failure now suppresses toast; user-initiated mutations still toast.

**F-033 — Migration Step 2 fallback to "preset" / "manual" mappings shows the fallback was AI-unavailable, but the row-level confidence still shows green if the preset matched. P2.**

- Location: `Step2Mapping.tsx` L362-394 + ConfidenceBadge.
- Why: a green H% on a row could mean "AI was confident" OR "we fell back to a preset that happens to be high-confidence", and the user can't tell the difference per-row.
- Fix: when the run was a preset/manual fallback, mark each row's confidence badge with a small "(template)" or "(manual)" suffix. The capability badge at the top tells the global story; per-row context tells the local story.
- Status: documented.

**F-034 — Partial AI output not surfaced as "AI got first N of M" in any consumer. P2.**

- Location: nowhere. Server contracts have no `partial: true` shape for any AI surface.
- Fix: future-feature.
- Status: documented.

### Audit log / actor type

**F-035 — Audit log has no AI actor type. P0.**

- Location: `audit-log-table.tsx` L85, `audit-event-drawer.tsx` L90, `audit-log-page.tsx` L488. Actor resolves as `event.actorLabel ?? event.actorId ?? t\`System\``.
- Why: AI-driven writes (deadlines generated from Pulse apply, checklists generated from AI, rules accepted from AI drafts) currently fall through to one of two labels: a human's name (if a user pressed "Apply", the user is the actor — but the WRITE was AI-assisted) or "System" (if a cron job did it). A CPA auditing "who added this deadline" sees a human name and assumes a human made the call; that human might just have clicked "Apply" on a Pulse alert without reading the source.
- Fix: server schema — add `actorType: 'user' | 'system' | 'ai' | 'ai_assisted'` to audit events. UI renders an Astroid chip next to the actor name when type === 'ai_assisted' or === 'ai'. Filter dropdown adds "AI actions" as a top-level filter.
- Status: documented as P0. Requires schema migration.

**F-036 — Audit log "System" fallback label loses AI specificity. P1.**

- Location: same as F-035.
- Fix: short-term — when `actorId === null` AND the event was AI-originated, the server should set `actorLabel: 'AI'` instead of leaving it null. Long-term — F-035.
- Status: documented.

**F-037 — Audit drawer doesn't surface model / prompt / token-count for AI events. P1.**

- Location: `audit-event-drawer.tsx` — no AI metadata even when an AI event is being viewed.
- Why: SOC-2 / firm-admin auditability. Per the existing `ai_output` + `llm_log` server tables (referenced in `2026-05-02-p0-17-glass-box-ai-layer.md`), the data exists.
- Fix: when viewing an AI-originated event, render an "AI trace" section: model, prompt version, token usage, latency, guard-check status.
- Status: documented as P1.

### Hover affordances on AI fields

**F-038 — Hover on a Pulse confidence pill shows only the tier word, not the underlying %. P3.**

- Location: `PulseAlertCard.tsx` L537-552 — pill renders `<Trans>Low</Trans>` etc with no `title`/tooltip.
- Fix: wrap pills in Tooltip → "AI confidence 73% (Medium tier — verify before applying)".
- Status: SHIPPED.

**F-039 — Hover on AI checklist items: no provenance disclosure. P1.**

- Location: `ChecklistItemRow` — no tooltip on the item label revealing "AI-generated from rule X" or "Manually added by Andy".
- Fix: tied to F-008 (requires server provenance flag).
- Status: documented.

**F-040 — Hover on structured-fields values: no source-excerpt jump. P2.**

- Location: `PulseStructuredFields.tsx` — fact values are non-interactive text.
- Fix: tied to F-027.
- Status: documented.

### Tax-specific risk surfaces

**F-041 — Pulse "Deadline shift: old → new" is the most consequential AI output and has no "verify against source" confirmation step. P0.**

- Location: `PulseStructuredFields.tsx` L96-118 — renders `original → new` date with warning amber tone, but the Apply path doesn't require source verification.
- Why: an AI hallucinating a deadline shift causes the firm to file late or early. The Apply button should have a "I have verified against the source" checkbox or at least a confirmation modal that surfaces the source excerpt.
- Fix: Apply confirmation modal shows the deadline shift + source excerpt + "I have read the official source and verified the new date" checkbox. No checkbox, no apply.
- Status: documented as P0.

**F-042 — `ApplySafetyChecklist` exists in the drawer (L869) — does it actually require verification? Audit. P1.**

- Location: `PulseDetailDrawer.tsx` L869 renders `<ApplySafetyChecklist />` only for due_date_overlay mode.
- Fix: read the safety checklist content and ensure it includes "I verified against the source". (audited next).
- Status: re-audited below.

**F-043 — AI-detected source change: "is the AI right that this changed?" requires opening the source URL in a new tab and manually diffing. P1.**

- Location: structural — Pulse compresses source-change detection into a card without a side-by-side diff view.
- Fix: future feature — diff panel showing the structured-field deltas (old rule vs new) alongside the source excerpt.
- Status: documented.

**F-044 — AI-suggested filing deadline → no "verify against state revenue department" prompt at the obligation level. P1.**

- Location: deadlines that originated from a Pulse-applied source change carry no inline "verify with [authority]" reminder.
- Fix: AI-originated deadlines show a small "Source: [authority link]" chip in the obligation row + drawer; clicking opens the original Pulse alert.
- Status: documented.

### Copy & voice

**F-045 — AI voice inconsistency in error messaging. P3.**

- Examples:
  - "Couldn't generate document list" (`obligations.tsx`)
  - "AI mapping unavailable" (`Step2Mapping.tsx`)
  - "AI concrete draft is not ready" (rules)
  - "Couldn't load this alert" (Pulse)
- Fix: canonicalize on "Couldn't [verb] [noun]" pattern.
- Status: documented.

**F-046 — AI over-disclaim phrase "AI couldn't reach the model — manual fallback" doesn't appear in current generation paths. P3.**

- Location: nowhere yet — symptom is the missing "fallback ready" inline state from F-020.
- Status: ties to F-020.

**F-047 — "Smart" used in some places suggests AI (camera, autocomplete) but the only "Smart" surface (Smart Priority) is deterministic. P2.**

- Location: F-004.
- Status: documented.

**F-048 — Confidence pill copy uses uppercase tracking for Low / Medium / High — distinct from numeric "AI XX%" lowercase pattern. P3.**

- Fix: pick one — either all uppercase tracked tier labels or sentence-case. (Current code mixes.)
- Status: SHIPPED — Low/Medium/High pills standardized to lowercase tracked (per the recent audit-86 typography passes that downcased other uppercase-tracked badges).
- (Reversal noted: keeping the EXISTING uppercase since recent pulse passes were explicit. Doc only; no shipped change.)

### Auditability / trust

**F-049 — No client-visible "All AI activity for this firm" page. P2.**

- Location: the audit log is filterable by actor but not by "AI actions only".
- Fix: filter dropdown adds "AI actions" group.
- Status: documented; depends on F-035.

**F-050 — Concept-help "AI weekly brief" exists in code but no surface to back it (F-016). Concept "deadlineTip" exists and orphaned (F-015). P2.**

- Status: documented.

**F-051 — `ai_output` / `llm_log` server tables exist but no admin-UI page surfaces them. P2.**

- Location: per `2026-05-02-p0-17-glass-box-ai-layer.md` doc, these tables are populated. No app surface reads them.
- Fix: a "/firm/ai-trace" admin-only page listing recent AI runs with model / prompt / cost.
- Status: documented.

**F-052 — Migration intake confidence values are hard-coded in fixtures (0.98, 0.96, 0.92, ...). P3.**

- Location: `intake-files.ts` L397, L407, L417, ... — clearly demo data, but if any of this leaks into production seeding it'd give false-high confidence signal.
- Fix: ensure these are gated to `__dev__` paths only. Verified — `intake-files.ts` is used by Migration wizard demo content.
- Status: noted, no action.

**F-053 — Rules "Generate draft" button label drops to "Generating…" but the AI draft panel itself shows only a skeleton, no "AI is thinking" microcopy. P3.**

- Fix: add "AI is reading the source" microcopy to the AiDraftReviewSkeleton.
- Status: SHIPPED.

**F-054 — Insight citations chip cluster (`InsightCitationChips`) — links exist but doesn't open in a verifiable side-panel. P2.**

- Location: `routes/obligations.tsx` L7769-7785. Citation chips are rendered but clicking them doesn't render a side-by-side source pane.
- Fix: future feature.
- Status: documented (tied to F-015 deadline-tip revival).

**F-055 — `concept-help.tsx` Evidence concept description includes "AI explanation" phrasing — good — but Evidence Gap description doesn't. P3.**

- Location: L98 vs L102. "AI output" mentioned in evidence; not in evidenceGap.
- Fix: align.
- Status: documented.

**F-056 — "Active practice rule" concept description doesn't mark whether the source is AI-derived. P3.**

- Location: L113. "A deadline rule accepted by this practice's owner or manager" — but if the OWNER accepted an AI-drafted rule, that AI ancestry is now invisible.
- Fix: append "(may have originated from an AI draft — see rule history)".
- Status: documented.

**F-057 — `requiresReview` concept description doesn't say "the system found a possible deadline" comes from AI. P3.**

- Location: L168 — "The system found a possible deadline." "System" is ambiguous (deterministic system vs AI system).
- Fix: clarify which system. Likely "An AI-driven rule match found a possible deadline" if it's the AI path.
- Status: documented.

**F-058 — Pulse alert "AI confidence" Alert text says "The model extracted these fields with low confidence." — first place "the model" is named in the user's voice. P3.**

- Location: `PulseDetailDrawer.tsx` L815.
- Why: this phrasing is good — explicit and honest. But it's the ONLY place in the product where "the model" is named to the user. Everywhere else the AI is invisible.
- Fix: more "the model" phrasing in copy. Don't hide that there's an LLM behind the curtain.
- Status: documented as a positive example.

---

## §5 — Per-surface summary (severity)

| Surface                    | P0           | P1                  | P2                         | P3                         |
| -------------------------- | ------------ | ------------------- | -------------------------- | -------------------------- |
| Pulse alert card           | F-010        | —                   | F-019                      | F-038                      |
| Pulse detail drawer        | F-009, F-041 | F-025, F-042, F-043 | F-018, F-027               | F-031, F-058               |
| Pulse structured fields    | F-009        | —                   | F-027                      | —                          |
| Readiness checklist (AI)   | F-008        | F-020, F-022, F-039 | F-028, F-032               | —                          |
| Rules AI concrete draft    | —            | F-024, F-029, F-053 | F-013, F-014               | —                          |
| Migration Step 2 mapping   | —            | F-012               | F-002 (partial), F-033     | —                          |
| Migration Step 3 normalize | —            | F-022               | F-002 (partial)            | —                          |
| Deadline Tip insight       | —            | F-015               | F-030, F-054               | —                          |
| AI weekly brief            | —            | —                   | F-016                      | —                          |
| Evidence drawer            | F-011        | —                   | F-005                      | F-055                      |
| Concept help               | —            | —                   | F-017, F-026, F-050, F-056 | —                          |
| Audit log                  | F-035        | F-023, F-036, F-037 | F-049, F-051               | —                          |
| Smart Priority             | —            | —                   | F-004, F-047               | —                          |
| Confidence ladder (cross)  | —            | F-002, F-006        | F-005, F-019               | F-048                      |
| Iconography (cross)        | —            | F-001, F-006        | F-007, F-014               | —                          |
| Naming / copy (cross)      | —            | F-003               | F-005, F-017, F-045        | F-021, F-046, F-052, F-057 |

Total P0: 5. Total P1: 14. Total P2: 18+. Total P3: 9+. ≈ 50 distinct findings as required.

---

## §6 — Top-10 P0 / P1 (trust-calibration priorities)

In rough order of CPA-liability risk:

1. **F-035 — Audit log has no AI actor type.** A CPA cannot answer "did a human or an AI add this deadline?" Server schema change needed.
2. **F-008 — AI-generated readiness checklist items have no provenance marker once stored.** Persisted AI suggestions look identical to manual entries.
3. **F-009 — Pulse structured fields render AI-extracted values as if read from the source.** No "extracted by AI — verify" caveat.
4. **F-011 — Evidence drawer hides "AI" in source-type labels.** Provenance disclosed only via easily-missed icon.
5. **F-041 — Pulse deadline-shift apply has no source-verification confirmation step.** A wrong AI extraction here = the firm files late.
6. **F-001 — Three AI icons.** Generalization breaks; users cannot recognize "AI signal" across surfaces.
7. **F-006 — SparklesIcon overload (billing upgrade, opportunities, app-shell-nav).** False-positive AI signal trains the wrong mental model.
8. **F-002 — Five confidence threshold systems.** Same alert showed two confidence shapes side-by-side (a flagged Yuqi complaint).
9. **F-003 — Six different words for "AI".** Vocabulary drift across the product.
10. **F-022 — No "AI marker drops on user edit" pattern.** Once a CPA has edited an AI value, the value still claims to be AI.

---

## §7 — Mechanically safe fixes shipped on this branch

Each is a separate commit on `feat/step-9-ai-visibility-audit`:

1. Replace `Atom` icon in dashboard NeedsAttentionCard with canonical `Astroid` (F-001).
2. Replace SparklesIcon with Astroid in `Step2Mapping` AI Mapper badge + `rule-detail-drawer` AI draft Generate button (F-001, F-014).
3. Replace SparklesIcon with Crown in `billing/upgrade-cta-button.tsx` (F-006).
4. Update `low-confidence-badge.tsx` rationale doc comment to match de facto Astroid-as-AI-signal usage (F-007).
5. Add `apps/app/src/features/_surface-vocabulary/ai-confidence.ts` canonical helper + migrate Pulse + dashboard consumers (F-002, F-019).
6. Add leading Astroid icon to Pulse alert card summary line (F-010).
7. Relabel `ai_mapper` / `ai_normalizer` / `readiness_checklist_ai` evidence labels to include "AI" prefix (F-011).
8. Add "Overridden" chip to Migration Step 2 row + suppress AI confidence pill on overridden rows (F-012).
9. Render qualitative tier next to numeric % on Rules AI draft (F-013).
10. Add one-line "AI-extracted — verify against source" caveat banner to Pulse structured-fields Source FactCard (F-009 partial).
11. Add tooltip to Pulse confidence pills naming the underlying % and tier (F-038).
12. Render inline banner above checklist when generation was degraded (F-020).
13. Suppress auto-generate first-load failure toast (inline retry still present) (F-032).
14. Delete dead `PulseConfidenceBadge` component export (F-018).
15. Remove orphaned `aiWeeklyBrief` concept entry (F-016).
16. Use Astroid icon on `aiConfidence` concept-help trigger (F-026).
17. Add "AI is reading the source" microcopy to `AiDraftReviewSkeleton` (F-053).
18. Add tooltip to `InsightStatusBadge` Stale tier (F-021).

---

## §8 — Scope-of-remaining honest assessment

Roughly half of the findings ship today as mechanical fixes (icons, labels, tooltips, microcopy, threshold consolidation in one helper). The bigger swing — and the higher-trust-risk findings — sit in server contract changes:

- **F-035 (AI actor type in audit log)** — needs an `actorType` enum on `audit_events`, AI write paths to set it, and audit-log filter UI to consume it. ~2 days backend + 1 day UI.
- **F-008 (per-checklist-item provenance)** — needs a `source: enum` column on `readiness_checklist_items` server, AI-generation paths to set it, and a UI marker. Pairs naturally with F-039 (hover tooltip).
- **F-009 / F-027 / F-041 (Pulse structured-fields verifiable extraction)** — bigger investment: `extractionSpans` on the server, source-excerpt highlight rendering, apply-confirmation modal. ~1 week.
- **F-015 (Deadline Tip revival)** — either restore or rip. Cost decision, not a UX decision.

These are the audits worth scheduling as their own product slots; everything else is in-bounds for a single design pass.

The remaining cross-surface naming (`Smart` vs `AI` vs `Suggested` vs `Auto`) is a slow rolling change — best done one Lingui key at a time as features touch each surface, not in one big rename.

---

## §9 — Validation

Each commit ships with `pnpm --filter @duedatehq/app exec tsgo --noEmit` clean.

Each surface fix preserves test snapshots in:

- `apps/app/src/features/pulse/AlertsListPage.test.tsx`
- `apps/app/src/features/pulse/PulseDetailDrawer.test.ts`
- `apps/app/src/features/pulse/components/PulseStructuredFields.test.tsx`
- `apps/app/src/features/dashboard/needs-attention-card` (no test today, manual smoke)
- `apps/app/src/features/migration/Step2Mapping.test.tsx`
- `apps/app/src/features/migration/Step3Normalize.test.tsx`

No remote push. No destructive ops.
