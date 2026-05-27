# 2026-05-27 — Audit drain: beta-rules (rule library surfaces)

Branch: `design/audit-drain-beta-rules` (starts at `c583b334`, batch 1).

Scope per agent assignment: `apps/app/src/routes/rules.library.tsx` and
`apps/app/src/features/rules/coverage-tab.tsx`. Walked each candidate
finding against current source (line numbers in the Step 6 cont audits
were stale because batch-1 + 9 of the original rule-library findings
had already shipped).

## What shipped

### 1. R3.5 — sr-only Escape hint moved to the top of the review-queue dialog

`apps/app/src/routes/rules.library.tsx` — `Dialog` body of the bulk
review modal. The `<span class="sr-only">Press Escape to close the
review queue.</span>` previously sat at the BOTTOM of `DialogContent`,
right after the footer. SR users heard the close affordance LAST — by
which point they had already navigated through hundreds of characters
of rule body. Moved the span to render immediately after the
`DialogTitle` inside the header, so the close hint is announced before
the rule body content begins.

One-line move; no copy change; no new msgid.

### 2. EntityCellContent — 5 hardcoded `title` + 5 hardcoded `sr-only` labels i18n drift

`apps/app/src/features/rules/coverage-tab.tsx` — `EntityCellContent`.
The coverage-table glyphs (active rule check / review triangle / "S"
source-only chip / X missing-source / em-dash not-applicable) each
carried a hover `title` and an `sr-only` label that were plain English
string literals. On a Spanish-locale firm the glyphs stayed English in
both hover tooltip and screen-reader output.

Hooked `useLingui` and wrapped all 10 strings in `t\`…\``. The four
sr-only labels (`Active`, `Review`, `Source only`, `Not applicable`)
deduplicate to existing msgids that were already translated in earlier
passes — only the five hover-`title` strings (and `No source`) are net
new msgids.

### 3. `labelForSourceState` returns translated short labels

Same file. The helper feeding the drill-in button's aria-label
(`Open ${fullName} rules for ${jurisdictionLabel(row.jurisdiction)} —
${labelForSourceState(sourceState)}`) returned plain English strings
(`'active'`, `'review'`, `'source only'`, `'no source'`, `'not
applicable'`). The aria-label was wrapped in `t\`\`` but the
interpolated short labels were not, so the screen-reader announcement
was bilingual mid-sentence.

Threaded the `useLingui` `t` macro through the helper signature and
wrapped each branch's return string. Updated the sole call site (line
1301) to pass `t` along.

### 4. "Review workspace" aria-label

Same file, line 798. The wrapping `<div aria-label="Review
workspace">` for the split-pane workspace was hardcoded English.
Wrapped with `t\`Review workspace\``. `useLingui` is already imported
at the top of `CoverageTab`.

### 5. `RuleReviewProgressBar` — visible segment labels + aria-label i18n drift

`apps/app/src/routes/rules.library.tsx` — `RuleReviewProgressBar`. The
top-of-page progress bar's `SEGMENT_LABEL` record carried seven
hardcoded English strings (`active` / `verified` / `need review` /
`candidate` / `rejected` / `archived` / `deprecated`) that rendered
BOTH visibly inside each segment AND fed the `breakdown` string used
for `aria-label`. Non-EN firms saw the entire status bar in English
plus an English screen-reader breakdown.

Promoted to `useLingui`-backed `t\`…\`` strings. The bar's aria-label
fallback (`'Empty rule catalog'`) and the breakdown wrapper (`Rule
catalog breakdown — ${breakdown}`) also wrapped.

### 6. RuleTableRow — `aria-label` for row + checkbox

`apps/app/src/routes/rules.library.tsx` — `RuleTableRow`. The clickable
row's `aria-label={\`Open rule details for ${displayTitle}\`}` and the
selection checkbox's `aria-label={\`Select ${displayTitle} for batch
review\`}` were unwrapped template literals. Added `useLingui` hook and
wrapped both with `t\`…\``.

### 7. StatusSectionHeaderRow — select-all checkbox aria-label

Same file, `StatusSectionHeaderRow`. The bulk-section checkbox's
`aria-label={\`Select all ${count} rules in ${label}\`}` was an
unwrapped template literal. Added `useLingui` hook and wrapped with
`t\`…\``.

### 8. SearchResultsTable — row aria-label

Same file, `SearchResultsTable`. The clickable search-result row's
`aria-label={\`Open rule details for ${rule.title}\`}` was an unwrapped
template literal. Added `useLingui` hook and wrapped with `t\`…\``.
This msgid (`Open rule details for {0}`) is the same shape as the one
in `RuleTableRow` (`Open rule details for {displayTitle}`) but Lingui
treats the placeholder names as distinct keys; translated both.

## What was checked + skipped

| ID | Reason |
| --- | --- |
| R3.2 | Accept-hotkey `querySelector` dependency. Per dev-log: needs refactor to expose explicit `onAccept` callback. Out of scope for mechanical pass. |
| R3.3 | KeyboardHints hidden below `sm` breakpoint. Dev-log: "needs design call." |
| R5.1 | "Creating…" spinner — already shipped (verified at `rules.library.tsx:3827-3835`). |
| R5.2 | Header "New rule" dead-end modal. Dev-log: feature work. |
| R5.3 | Tax-type free-form input → needs Combobox primitive. Dev-log: deferred. |
| R6.1 / R6.2 | `ActiveFilterChip` i18n — already shipped (verified at `coverage-tab.tsx:1023-1037`). |
| R6.3 | `EntityCoverageLegend` uppercase eyebrow — design call, the eyebrow is the legend's identifier. |
| #88 | Jurisdiction groups default-collapsed — needs interaction design call. |
| #89 | "+ Add rule" CTA differentiation — the gap row already has destructive bg + left rail + accent-text outline button; the visual differentiation is in place. Marked deferred in dev-log; not mechanical drift. |
| #90 | URL-state plumbing for flat-mode — refactor, not polish. |
| #91 | Bulk-accept checkbox flow — feature work. |
| #92 | Pending-review count badge. The `RuleQueueModeToggle` (`coverage-tab.tsx:1980-1989`) already renders the pending count inline as a tab badge (`{pendingCount}` next to "Pending"). The legacy `?library=pending_review` URL surface that the finding referenced was DROPPED in V3 per the `normalizeRulesLibrarySearch` comment at `rules.library.tsx:255-261`. No additional surface needed. |
| F9-06 | Empty-state copy already shipped (verified `RulesLibraryEmptyState` renders above the table at `rules.library.tsx:1500-1510`). |

## i18n

19 new msgids surfaced by `pnpm i18n:extract`. All translated:

| msgid | zh-CN |
| --- | --- |
| `active` | `活跃` |
| `Active rule for this entity` | `此实体的活跃规则` |
| `archived` | `已归档` |
| `candidate` | `候选` |
| `deprecated` | `已弃用` |
| `Empty rule catalog` | `规则目录为空` |
| `need review` | `待审核` |
| `No official source registered` | `未登记官方来源` |
| `No source` | `无来源` |
| `Official source registered; rule still needs review` | `已登记官方来源；规则仍需审核` |
| `Open rule details for {0}` | `打开 {0} 的规则详情` |
| `Open rule details for {displayTitle}` | `打开 {displayTitle} 的规则详情` |
| `Pending review for this entity` | `此实体待审核` |
| `rejected` | `已拒绝` |
| `Review workspace` | `审核工作区` |
| `Rule catalog breakdown — {breakdown}` | `规则目录分布 — {breakdown}` |
| `Select {displayTitle} for batch review` | `选择 {displayTitle} 进行批量审核` |
| `Select all {count} rules in {label}` | `选择 {label} 中的全部 {count} 条规则` |
| `verified` | `已核实` |

CPA vocab: 规则=rule, 审核=review/audit, 客户=client (not used in this
batch), 实体=entity, 来源=source. The four short status labels
(`active`/`verified`/`archived`/etc.) intentionally mirror the
sentence-case `t\`active\`` form (lowercase) per the existing pattern
in the SEGMENT_LABEL record; the title-case `Active` exists separately
in the catalog with `活跃` and is used in other surfaces.

## Verification

- `cd apps/app && pnpm exec tsc --noEmit` — clean (exit 0).
- `pnpm i18n:extract` — 19 new msgids, 0 missing after translation.
- `pnpm i18n:compile` — strict-mode pass.
- 10 distinct edits packaged as 8 findings (R3.5 + 7 i18n drift
  clusters across both files).

## What's NOT in this batch

- R3.2 hotkey refactor — requires changing `RuleDetailCompact`'s
  public interface to expose an `onAccept` callback ref. Out of scope.
- R3.3 mobile keyboard hints — needs design call on what the footer
  should wrap to.
- The remaining deferred R-series items per the source dev-log table.

## Commit

Single commit on `design/audit-drain-beta-rules`, format per assignment:
`Design(audit-drain-beta-rules): 8 findings — R3.5, R6.1-adj, R6.2-adj`
(adj = neighboring i18n drift found during the R6 sweep, plus the
RuleReviewProgressBar / RuleTableRow / StatusSectionHeaderRow /
SearchResultsTable cases in rules.library.tsx).
