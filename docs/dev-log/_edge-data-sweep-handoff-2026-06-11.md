# HANDOFF — 边缘数据专项 (Edge-/Hostile-Data Sweep)

Yuqi's ask: "边缘数据专项 — 长名字 / 0-1-200 条 / 巨额金额 / 缺失字段 / 跨时区
的逐表面轰炸 + 修复。" This is the third leg of the high-finish program (motion
grammar ✅ `ccad7f1a`, keyboard/focus audit in flight, CI screenshot regression
✅ `ee93a65e`). Goal: **every surface renders hostile-but-realistic data
gracefully** — nothing overflows, misaligns, lies, or falls back to a browser
default.

## 0. Preconditions (read first)

- **Wait for the keyboard/focus audit to land** before editing feature files —
  check `git log --oneline -5` for a commit referencing
  `_keyboard-focus-audit-2026-06-11.md`. Two passes editing the same feature
  files concurrently WILL collide.
- **One agent at a time.** On 2026-06-11 four parallel agents were killed by a
  platform-wide rate limit and a 1375-line unverifiable rewrite had to be
  discarded. Run the sweep as ONE worker (or yourself), surface by surface.
- **Before editing any file: `git status --short -- <file>`. If dirty, SKIP it
  and note it** — parallel sessions actively commit to main here. Stage
  selectively (never `git add -A`).
- The shared dev server (:5173) gets navigated/hijacked by other sessions and
  serves stale tabs. Verify via **DOM `preview_eval`** or by **curling the
  served module** (`curl -s http://localhost:5173/src/<path>.tsx | grep …`),
  not by screenshots alone. Browser staleness ≠ your change missing.

## 1. The hostile dataset (what to bombard with)

Inject realistic-hostile values, never fictional features:

| Dimension      | Values                                                                                                                                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Names          | client/form names at 60–80 chars ("Hudson & Wexford Riverside Properties Management Holding LLC (Pro Plan)"); unicode + diacritics ("Müller, Søren & 王"); single-char name                                                              |
| Counts         | 0 items · exactly 1 (plural check) · 14 · 200+ (rails/tables/timeline/checklist — checklist caps at 30, verify the cap UX)                                                                                                               |
| Money          | $0 · $0.01 · $1,234,567.89 · null cents (`estimatedTaxDueCents` absent)                                                                                                                                                                  |
| Dates          | due today · due yesterday · 400 days overdue · 3 years future · `null` filing/payment dates · fiscal-year ends · timezone edges (practiceTimezone vs UTC midnight — the codebase parses ISO by parts deliberately, see `formatRailDate`) |
| Missing fields | no assignee · no rule bound (`matchedRule` null) · no checklist · no penalty breakdown · no formName (falls back to taxType) · client record missing (orphaned deadline — there's a warning chip path)                                   |
| Status         | every one of the 10 ObligationStatus values; blocked WITH and WITHOUT `blockedByObligationInstanceId`                                                                                                                                    |
| Text           | a 500-char alert summary; an alert source-extract with markdown/HTML chars; empty-string vs null                                                                                                                                         |

## 2. How to inject

1. **Seed-level**: `mock/demo.sql` is the demo firm's data (the hudson-1040
   registry — see memory `data-consistency contract`). Make a LOCAL throwaway
   copy/branch with hostile values, reseed, walk the pages. Do NOT commit
   hostile seed data to main.
2. **e2e-level**: `e2e/fixtures` + `/api/e2e/session` seeding (used by the new
   visual-regression spec) — good for reproducible 0/1/200 counts.
3. Where injection is impractical, **prop-bomb in a scratch render** or
   audit-by-code (trace the formatter/clamp path) — but prefer seeing it live.

## 3. Surface-by-surface checklist (audit each; fix per §4)

For EACH: long-name overflow · count extremes · missing-field rendering ·
money/date formatting · plural correctness.

- **/today**: Priorities table rows (client cell truncation, why-now line),
  Alerts cards (long titles, 0-alert "caught up" state), Daily Brief counts.
- **/deadlines list**: client col (`min-w-44` + `line-clamp-1` — verify with
  80 chars + tooltip), due pills at 400d late, EXPOSURE col at $1.2M
  (tabular-nums alignment), 0-row filter result, group bands with 1 item,
  bulk-bar at 200 selected.
- **/deadlines/:id detail**: hero title (clamp-3 exists — verify), client chip
  at 80 chars, key-date cards with null dates (em-dash path exists) + huge
  buffer ("412 days before filing"?), banner at 400 days overdue, stepper with
  skipped stages, WorkflowMilestoneCard for ALL 10 statuses, What's-left at
  0/1/30 items, Materials tab (received 30/30, waived-only, degraded-AI
  banner), Penalty card $0 vs $1.2M vs missing-facts state, Extension card with
  no rule, Record tab 0 evidence (honest empty), Audit tab 200 events
  (scroll/perf), Ownership footer unassigned, navigator rail rows (description
  titles at 2-line clamp, "400d late").
- **/alerts list + detail**: rail rows with 500-char summaries, confidence 0%/
  100%, "No clients matched" vs 200 affected (the affected-clients table now
  collapses past 10 — verify), Extracted-facts grid with missing fields,
  source-extract quote overflow.
- **/clients list + detail**: StatBand at 0/huge, Filings table fixed columns
  with long form names.
- **/rules/library**: 456-rule list perf/scroll, long rule titles, review modal.
- **Calendar, audit-log, sources, settings/members/billing**: spot-check the
  same dimensions (tables + empty states).
- **Toasts/dialogs**: long names inside toast copy ("Marked X filed" with an
  80-char name), Undo button wrap.

## 4. Fix rules (the house canon)

- Overflow: `truncate`/`line-clamp-N` + `min-w-0` on the flex child + full
  value in `title=`. Never let a name push a layout.
- Numbers: `tabular-nums` wherever digits align; `formatCents` for money;
  pretty dates (`formatDatePretty`, year included where ambiguous) — NO raw
  ISO in UI (recently purged; don't reintroduce).
- Missing data: em-dash `—` (the established placeholder), or the surface's
  honest empty state. NEVER fabricate (no-fiction rule).
- Plurals: `<Plural>`/`<Trans>` components ONLY — `plural()` + `i18n._`
  CRASHES at runtime (memory: lingui footgun).
- Color: the one-red rule (banner is the page's single red statement); don't
  add alarm colors while fixing.
- Tokens/radius/type scale per `check:tokens` guard + DESIGN §4.11 primitives;
  text styles from the scale (caption11/xs12/sm13/base14…).
- Scope: targeted fixes only — do NOT restructure components while in there.

## 5. Verification + delivery

- `cd apps/app && pnpm exec tsgo --noEmit -p tsconfig.json` (ignore + list
  pre-existing errors in other sessions' files).
- `pnpm exec vp test run obligations` (89-91 green) + `alerts` if touched.
- `pnpm exec vp fmt --write <touched files>` only.
- Commit per-surface chunks; dev-log
  `docs/dev-log/_edge-data-sweep-2026-06-11.md` with a per-surface table:
  **pass / fixed (what) / reported (why not fixed)**. Commit messages end:
  `Co-Authored-By: <your model name> <noreply@anthropic.com>`
- Revert any local hostile seed before finishing.

## 6. Known-good context (don't re-fix)

Already handled elsewhere: hero title clamp-3 (`804325ad`), Materials received
rows legibility (`29f5b81e`), affected-clients collapse >10 (`4d710ff1`),
alerts hostile-data round (`fe93b432`), date-format ISO purge + overdue
de-dup (`2b50bd30`/`132cc346`), tab-content card unification (`38b67b7e`).
