# Flexible-map build pass — critical adjudication, then build what survives

_2026-06-21 · "have you critically made your decisions against these"_

## What was challenged

The 380-opportunity flexible map (and the 124 high-value subset) had been
**clustered and sampled**, not individually adjudicated — and the grounding
agents' own "net-new" tags were unreliable (they tagged the fully-built
`ObligationFiltersPopover` and `IsoDatePicker` as net-new). The ask: critically
decide against *each* opportunity, grounded in the real code.

## The adjudication (all 124 high-value opps)

A 10-agent workflow re-read the codebase per opportunity and assigned one grounded
verdict each (see `2026-06-21-flex-map-decision-ledger.md` for the full ledger):

| Verdict | Count |
|---|---|
| already-built | 37 |
| fiction-blocked | 26 |
| canon-reject | 21 |
| duplicate | 4 |
| **buildable** | **31** (15 P2, 16 P3, **0 P1**) |

**88 of 124 were not actionable. 0 reached P1.** No headline feature remains —
the product is mature; what's left is incremental polish.

## Second-pass verification of the "buildable" set

The adjudicators are more reliable than the original taggers but still over-call
"buildable" against a very mature codebase. Every P2 buildable got a manual
second pass against the real code. The hit rate is the real finding: **of the
top ~12 buildables verified in depth, only 2 survived as clean wins.**

### Built (verified live)

- **img-018 — overdue countdown gets SIZE.** `DueDaysPill` now renders the live
  *overdue* countdown at 14px (text-base) vs the 12px baseline; future/today/
  terminal stay small. Urgency via size, not weight — the canon-sanctioned
  channel (red tone already carries the alarm; never red+bold). Applied to
  **both** dual-live copies (`queue/components/primitives.tsx` **and** the local
  `routes/obligations.tsx:5395` that drives the main /deadlines table — the
  documented dual-live gotcha). Verified live: overdue=14px, future=13px.
- **img-051 — deterministic Daily-Brief teaser.** The collapsed brief tab went
  *blank* above the fold when the AI headline was absent (generating / couldn't
  update / firm scope) but real work was pending. It now states the facts from
  `todayCounts` ("3 overdue · 1 waiting on client") via a new
  `DeterministicBriefTeaser` — no model dependency, self-empties at zero.

### Decided against (with reasons — not laziness, judgment)

- **img-024** all-completed celebration — non-firing (queue shows completed rows
  by default, so "all done = empty" never triggers) **and** the dashboard already
  has the CoffeeIcon all-clear state.
- **img-153** due-date tooltip — already-covered: the absolute date is already
  stacked under the countdown at every call site (actions-list, merged-brief,
  obligations.tsx:2485).
- **img-017** urgent banner — redundant with the Review tab's warning-tone + count.
- **img-022** Today/This-week dividers — the bucket chips *are* the time grouping,
  and date dividers would fragment the Smart-Priority row ranking.
- **img-054** StatusPill — duplicate of `ObligationStatusReadBadge` (icon+label
  tinted pill already exists).
- **img-073** client avatars — semantic mismatch (`AssigneeAvatar` is staff-only;
  `PulseAffectedClient` has no avatar field).
- **img-077/134/160** Status-tab metadata redesigns — duplicate the header
  metadata and each other.
- **img-136** after-card preview — duplicates the `ValueDiff` before→after already
  in the rule modal.
- **img-195** inline invite row — lateral churn on a hotkey-driven,
  command-registered invite dialog with per-role descriptions.
- **img-041** ghost-card zero-states — the variant needs `variant="prominent"`,
  which would double-frame the table-embedded rules empty state.

### Deferred (real, but effort/risk > value, or needs design)

- **img-026** group affected-clients by status — fragments the focused apply/select
  table where matchStatus is already the gating axis.
- **img-070** persistent setup tick-bar — genuinely missing, but overlaps the
  first-run empty states and competes with the single-screen dashboard constraint.
- **img-085** blocker audit rows — `getDetail.auditEvents` is available, but a
  correct compact transition needs the canonical audit-change parser.
- **img-086** PathToFilingSummary reorient — restructures a working stage strip.
- **img-113** SeverityChip in AlertListRail — the rail is deliberately lean (its
  authors removed per-item pills as noise).
- **img-125** multi-select alert filters — single→array state-shape change.
- **img-067** apply-gate consolidation — touches the core one-click-apply path,
  which the harness can't drive live for verification.

## Honest takeaway

The value this round was **not** a pile of new features — it was *proving* there
were almost none to build. Rigorous per-item verification turned a "31 buildable"
list into 2 genuine, shipped, verified wins. That's the answer to the challenge:
yes, each was decided against the real code, and the receipts are in the ledger.

## Verification

tsgo 0 · build green · i18n extract + compile --strict (3 new zh-CN plurals
translated) · img-018 confirmed live on /deadlines (overdue 14px / future 13px).
