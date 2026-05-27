# Alert tone canonicalisation — 2026-05-26

Closes strategic theme #5 (alert visuals — `docs/Design/product-themes-2026-05-25.md`).
Also clears the last open recommendation from `status-pill-audit-2026-05-25.md`
§4 (item #10) and fixes a small regression that slipped through the
2026-05-25 follow-up pass.

## What this commit is NOT

This is **mostly documentation work**. The substantive code reconciliation
already shipped over 2026-05-25's status-pill-audit follow-up pass:

| §4 item | What                                                       | Shipped when                        |
| ------- | ---------------------------------------------------------- | ----------------------------------- |
| #1      | Dashboard row → canonical `ObligationStatusReadBadge`      | 2026-05-25                          |
| #2      | `EntityStateCell` review → blue                            | 2026-05-25                          |
| #3      | `CoverageCell` review → blue                               | 2026-05-25                          |
| #4      | `ClientReadinessBadge` drop inner `BadgeStatusDot`         | 2026-05-25                          |
| #5      | `MemberStatusPill` + `InvitationStatusPill` shape unified  | 2026-05-25                          |
| #6      | `rejection-chip` → canonical `Badge variant="destructive"` | 2026-05-25                          |
| #7      | `PulseSourceStatusBadge` → destructive + drop dot          | 2026-05-25                          |
| #8      | Drop `STATUS_DOT` export                                   | **Deferred** (one importer remains) |
| #9      | `InsightStatusBadge` "Failed" → destructive                | 2026-05-25                          |
| #10     | DESIGN.md tone-ladder cross-reference                      | **This commit**                     |

So "alert tone canonicalisation" landed as ~95% code, ~5% documentation
in this commit's case. The doc work is what makes the already-shipped
code legible to future readers.

## What shipped

### 1 · `CoverageLegend` regression fix

`apps/app/src/features/rules/rules-console-primitives.tsx:306`

```diff
-          <ToneDot tone="warning" />
+          <ToneDot tone="review" />
```

The 2026-05-25 audit §4 #3 flipped `CoverageCell` from amber to blue
("review = work in progress" semantic). The legend that explains those
dots was missed in that pass — so for ~24h the on-screen dots were
blue and the legend's swatch was amber. Legend ↔ cell now agree.

`ToneDot` already accepts `'review'` (line 232), so this is a pure
prop value swap.

### 2 · Audit doc § 5 — "Alert vs status: when to use which"

`docs/Design/status-pill-audit-2026-05-25.md` — new section appended.

Per the strategic-themes recommendation:

> Don't write a new doc until the existing two are reconciled — risk
> of fourth competing source of truth. Best move: extend
> `status-pill-audit-2026-05-25.md` with a "Alert vs status — when
> to use which" section.

Contents:

- **§5.1 The three layers** — explicit table of: User mental model
  (3 colors) ⊇ Status-pill ladder (6 tones) ⊇ Pulse subset (4 tones).
  None of these conflict; they're concentric narrowings.
- **§5.2 The Red/Yellow/Green decision tree** — ASCII walk-through
  that collapses the 6-tone ladder onto the 3 colors a CPA actually
  sees. Designed so a new contributor can pick the right tone for a
  new chip in <30 seconds.
- **§5.3 Common mistakes** — the four mistakes the audit caught in
  the wild (amber-for-act-now, red-for-data-quality, etc.) with the
  one-line correction for each.
- **§5.4 Pre-merge checklist** — five-item list to paste into any PR
  that introduces a new state chip.
- **§5.5 What this is NOT** — explicit anti-canon ("not a fourth doc",
  "not a re-design", "not a license to expand `pulseAlertTone()`")
  so this section doesn't get re-interpreted into scope creep.
- **§5.6 Open follow-ups** — item #8 (drop `STATUS_DOT`) and the
  Pulse-confidence threshold question, parked.

### 3 · DESIGN.md §4.10 forward-reference

`docs/Design/DueDateHQ-DESIGN.md` §4.10 — one paragraph added at top.

Before: §4.10 jumped straight into the 6-tone token table.
After: §4.10 first points readers at the audit §5.2 decision tree,
THEN drops into the token table. New chips get the 3-color mental
model first; the table is the confirmation pass.

Also documents the 3-layer model briefly inline so a reader who
arrives via §4.10 (not via the audit) sees the layering rule.

## Status updates

`docs/Design/status-pill-audit-2026-05-25.md` §4:

- New "Status (2026-05-26)" block notes items #1–#7 + #9 + #10
  shipped, item #8 deferred, and the CoverageLegend regression
  caught + fixed.

## What didn't change

- **No new doc file.** Per strategic themes, this would create a fourth
  competing source. Section lives inside the existing audit.
- **`pulseAlertTone()` API.** Pulse stays on its 3-level
  `urgent`/`informational`/`resolved` predicate. The bridge between
  Pulse's 4-tone subset and the broader 6-tone ladder is documented
  cross-referentially, not by changing either implementation.
- **The 6-tone ladder.** §3.1 of the audit is unchanged. The new
  §5.2 is a navigational layer ABOVE it, not a re-design.

## Verification

```bash
CI=true pnpm exec vp check
# Expected: 0 errors, pre-existing warnings unchanged
```

Manual verification candidates (no automated test exists for
visual swatch parity):

- `/rules` coverage table: open the page, confirm any rule with
  "review" state shows the blue (`text-text-accent`) dot AND the
  legend below shows the same blue swatch — not amber.

## Out-of-scope follow-ups discovered

- **Audit §4 item #8** — `STATUS_DOT` export drop. Worth bundling
  with the next obligation-status touch.
- **`PulseConfidenceBadge` threshold table** — currently three
  tiers (`>=0.9` high → success / `0.7-0.9` medium → info /
  `<0.7` low → destructive). The destructive choice for low confidence
  is correct per §5.2 (the CPA's action), but the threshold values
  themselves are tuning, not design canon. Documented in §5.6 so
  the next "should this be amber instead of red?" question gets
  the answer "no, walk §5.2."
- **Other surfaces where the legend ↔ cell pattern might drift**:
  worth a quick grep for `ToneDot tone="warning"` to find any other
  "review" surfaces that weren't updated alongside the 2026-05-25
  cell migration. (One pass: none found, but the codebase changes
  daily.)
