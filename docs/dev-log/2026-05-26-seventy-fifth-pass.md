# Seventy-fifth pass — Review Pending Rules modal /critique

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Critique of the batch-review modal at /rules/library. 5
issues landed; Accept kept in-body per Yuqi's call; client-impact
count + WATCH tag tooltip flagged as follow-ups.

## What was wrong

Heuristics scored **21/40** — acceptable but five clear fixes:

- **P0-1**: Title hierarchy inverted. `DialogTitle` "Reviewing
  pending rules" was the prominent read; the actual rule title
  (the user's decision unit) was a smaller `text-base
font-semibold` h3.
- **P0-2**: "AI concrete draft is not ready" rendered in
  `text-severity-medium` (red/amber). That tone implies "broken",
  but the pre-generation state is just "pending." Wrong tone.
- **P1-1**: Five `text-caption uppercase tracking-wider
text-text-muted` kicker eyebrows (APPLICABILITY / DUE DATE /
  EXTENSION / EVIDENCE / PRACTICE REVIEW). The product retired
  this style on every other page; the modal hadn't followed.
- **P1-3 + P2-1 + P2-3**: Audit meta line carried three pieces of
  dev-internal noise — rule slug (`al.individual_income_return.
candidate.2026`), version (`v1`), and a "Needs review" status
  pill that was redundant on a queue named "Reviewing pending
  rules." The (?) icon was unlabeled.

## What landed

### P0-1 — Title hierarchy

`rules.library.tsx`:

```diff
- <h3 className="mb-3 text-base font-semibold text-text-primary">{current.title}</h3>
+ <h2 className="mb-4 text-xl font-semibold leading-tight text-text-primary">{current.title}</h2>
```

`<h3>` → `<h2>`; 16px → 20px. The DialogTitle ("Reviewing pending
rules") stays at `text-sm` as quiet chrome — modal purpose, not
user task. The rule title IS the task.

### P0-2 — AI draft tone

`rule-detail-drawer.tsx` AiDraftReviewPanel:

```diff
- <p className="text-xs text-severity-medium">{errorMessage}</p>
+ <p className="text-xs text-text-tertiary">{errorMessage}</p>
```

"AI concrete draft is not ready" now reads as informational, not
destructive. The disabled Accept button already communicates "you
can't proceed yet"; the message just explains why.

### P1-1 — Section eyebrows → canonical sm-semibold

Both `DetailSection` and `SectionLabel` (the two section-heading
primitives in `rule-detail-drawer.tsx`) updated:

```diff
- <p className="text-caption font-medium tracking-[0.08em] text-text-muted uppercase">
+ <h4 className="text-sm font-semibold text-text-primary">
```

Five eyebrows in a row are gone. Applicability / Due date /
Extension / Evidence / Practice review now share the same heading
weight every other product page uses.

### P1-3 + P2-1 + P2-3 — Audit meta line retired

The entire `<header>` block (rule slug · v · status pill) deleted
from `RuleDetailCompact`. Reasoning:

- **Rule slug**: dev-internal. A CPA reviewing rules doesn't need
  `al.individual_income_return.candidate.2026`; the human-readable
  title above already identifies the rule.
- **Version**: only meaningful to engineers debugging migrations.
- **Status pill**: redundant. Every rule in the batch-review
  queue is "Needs review" by definition. The (?) info icon
  attached to it was unlabeled chrome.
- **`RuleStatusInline`**: now unused, removed.

Recovery path documented in the inline comment — if a future
surface needs the rule id (deep-link share, support reference),
expose via "Copy rule id" affordance or a Details disclosure,
not as visible chrome.

## Kept per Yuqi's call (NOT landed)

- **P1-2 / P1-5**: Accept button stays in the Practice Review
  section's accent-bordered card. Did NOT move to footer.
  Rationale: the section's `border-state-accent-active-alt`
  frame already gives it action-zone weight; with the section
  label now sm-semibold (matching other sections), the visual
  emphasis still lands on the bordered surface.

## Flagged for follow-up (NOT touched this pass)

- **P0-3** — No path forward when AI draft isn't ready. Needs a
  "Generate draft" button wired to the actual draft-generation
  endpoint. The endpoint exists (`orpc.rules.requestConcreteDraft`)
  but isn't surfaced inline; a future pass should add the action
  - retry affordance.
- **P1-4** — "WATCH" tag on evidence cards is opaque to first-
  timers. Either rename (`MONITOR`) or attach a tooltip
  explaining "this source is being monitored but may change."
- **P2-2** — No client-impact count. "Accepting activates this
  rule for client filings in AL for individuals" — should show
  N affected clients. Needs the count plumbed in; not a one-line
  fix.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).

## Result

Modal now reads as a decision surface: rule title dominates, five
sections share the canonical heading weight, the action zone is
the only bordered card on the page, AI draft state reads as
informational not error. Dev meta (slug, version, redundant
status) is gone.

Side effect: `RuleDetailCompact` is also used in `coverage-tab.tsx`
(another rule-review context). All visual improvements propagate
there too — same audit, same fixes.
