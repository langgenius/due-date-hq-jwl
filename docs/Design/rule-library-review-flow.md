# Rule library review flow — design source-of-truth

**Date:** 2026-06-09
**Pencil source:** `~/Desktop/duedatehq_work.pen`
**Status:** Design approved; execution brief at `docs/dev-log/2026-06-09-alert-deadline-rule-detail-amendments.md`

This is the canonical design reference for the redesigned rule library review experience. Changes here override prior modal-driven design in `coverage-tab.tsx`.

---

## Why we're redesigning

Today's review surface is a centered `<Dialog>` (the BulkReviewModal at `apps/app/src/features/rules/coverage-tab.tsx:2100-2288`). Per user feedback and reviewer journey study:

1. **Cramped reading.** Fixed header (~120px) + fixed practice-review footer (~180px) leave ~400px of scroll in a 720px modal. Reviewing a multi-page Arizona individual income tax rule means scrolling within a small viewport.
2. **Wrong intent for the modal.** Modals exist for focus + commit. But the review action is _reading_, not committing. The commit is one click at the end.
3. **Single vs bulk conflation.** The bulk modal is the only review surface, even when the user wants to read ONE rule deeply.
4. **No URL state.** A reviewer can't share `/rules?ruleId=…` with a colleague. Refresh loses everything.

## What we're shipping

**Two complementary surfaces:**

1. **Inline rule detail panel** — when a single rule is clicked, the right column of `/rules` takes over with a summary-first card-stack detail. URL-routed via `?ruleId=`.
2. **Simplified bulk modal** — when multi-select + bulk action is used, the existing modal stays but tightens its concerns to batch-only.

**Both share:**

- Canonical bar-header card vocabulary (alert/deadline detail universe)
- The `DecisionActions` reusable component
- The `RuleStatusChip` reusable component (visual = `AlertStatusChip` variants)

---

## The 7-state flow

```
   [A] Library default ──user clicks single rule──▶ [B] Inline panel (summary)
        │                                                  │
        │ user multi-selects                               │ Read more chevron
        ▼                                                  ▼
   [G] Bulk modal                              [C] Same panel, section expanded
        │                                                  │
        │ Accept N                                         │ click Accept
        ▼                                                  ▼
   [F] Success: N rules                            [D] Impact preview modal
       activated                                           │
                                                           │ confirm
                                              ─────┬───────┴────────┐
                                                   ▼                ▼
                                             [F] Success      [E] Reject reason
                                                                    │
                                                                    ▼
                                                          [F] Reject success
```

### State A — Rule library default

- Page header (h64, breadcrumb "Rules / Rule library", filter chip "Awaiting review (N)" warning-hover, search 240w)
- Left column (380w): rule list card — rows show status dot + title + meta + chevron-right
- Right column (fill): **coverage map** — 9×6 jurisdiction tile grid with status counts in a legend

### State B — Single-rule inline panel (summary-first) — **canonical**

**Pencil ref:** `N2X10V` (inside `GHObe`)

Replaces the right column when a rule is clicked. URL becomes `?ruleId=…`. The rule list stays visible on the left; the clicked row is highlighted with the canonical selected pattern: fill `state-accent-hover` + 2px left accent stroke (matches `ZmsV3` row selection).

**8 sections (all use canonical bar-header card chrome):**

| #   | Section                  | Bar title           | Bar right                                                                | Default body                                                                                       | Read-more reveals                                 |
| --- | ------------------------ | ------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Rule under review (hero) | `Rule under review` | `Awaiting review · 2d` chip (warning-hover) + sub `Reason: new template` | Title + meta row + 2-line plain summary (ellipsized) + meta strip (AI 88% + source + audit ledger) | Full multi-paragraph plain summary                |
| 2   | Applicability            | `Applicability`     | `6 fields`                                                               | 3 chip fields (Entity · Files · Effective)                                                         | Full 6-field facts grid                           |
| 3   | Due date logic           | `Due date logic`    | `fixed_date`                                                             | Prominent `Due Apr 15, 2026` block + 1-line extension hint                                         | Full extension policy + edge cases                |
| 4   | Evidence                 | `Evidence`          | `2 sources`                                                              | Primary source row only                                                                            | All sources + authority tier + last-verified date |
| 5   | Impact                   | `Impact`            | `Estimated`                                                              | One-line summary                                                                                   | Per-client breakdown table                        |
| 6   | Practice review          | `Practice review`   | `Required before Accept`                                                 | Textarea + `0 / 1000` count + `View N team notes ↓` link                                           | Team notes history                                |
| 7   | Activity                 | `Activity`          | `3 events`                                                               | Most recent event only + `Show all 3 events ↓`                                                     | Full timeline                                     |
| 8   | Decision (footer)        | `Decision`          | `Pending · 2d in queue` chip                                             | Summary line + Accept + Reject + Skip + audit signature                                            | n/a (always expanded)                             |

**Pattern contract:** every section is collapsed by default. Expanding one section does NOT cascade-expand others. The eye knows what changed.

### State C — Read-more reveal (in-place expansion)

Trigger: user clicks `Read more` on any section.

- That section's summary body morphs to the full body
- `Read more ↓` flips to `Show less ↑`
- All other sections stay collapsed
- CSS `max-height` transition so the change is visible

### State D — Accept impact modal

- 580w centered Dialog over `#0F172A` 0.55 scrim
- Header: `shield-check` accent + `Confirm accept`
- Body: lede ("activate the rule for N clients, reversible within 7 days") + impact card (2 grouped bullet lists: WHAT HAPPENS · SIDE EFFECTS) + per-client preview (3 rows + `View all N clients` link) + reversible note
- Footer: `shield-check` + `This action is logged` · Cancel + primary `Activate rule`

### State E — Reject reason dialog

- 560w Dialog, `octagon-x` destructive header `Reject rule`
- Body: lede + reason chips (Wrong jurisdiction · Wrong dates · Duplicate rule · Other) — selected uses `destructive-hover` fill + check icon
- Free-text 1000-char note (auto-required when `Other` selected)
- Footer: alert-triangle + `Permanent for this version` destructive · Cancel + primary `Reject rule` destructive-solid

### State F — Post-accept success

- Inline panel stays in place; hero bar chip flips `Awaiting review` (warning) → `Applied · {date}` (success — reuse `AlertStatusChip applied` = `b75I5W`)
- Bar icon flips `triangle-alert` → `check-check`
- Decision section collapses to a slim confirmation row: `✓ Rule activated · N obligations created` + `Undo (7d)` tertiary
- Toast at page top-right + Activity timeline gains new event at top

### State G — Bulk modal (simplified, with Reject)

- 720w Dialog. Header: `layers` + `Bulk review` + `N selected` chip
- Body:
  - Selected rules list (N rows): checkbox + status dot + title + meta + per-row `pencil` (edit note) + `eye` (open in takeover) actions
  - Batch note textarea in `bg-subtle` band — char count + `Auto-suggest from queue reasons` sparkles link
  - Impact preview — 4 metric pills (New obligations · Affected clients · Coverage lift · Est. work)
- Footer: `alert-triangle` + `You can review individually any time` · `Reject N` (destructive outline) · Cancel · primary `Accept N` (accent-solid)

---

## Summary-first contract (per section)

> **Every section defaults to a summary. The user opts into depth.**

Rationale: a reviewer processes 10-30 rules per session. They need to skim, drill into 1-2 details, and decide. Forcing full expansion on every rule is the disease of today's modal. The summary version reads 5-10× faster.

Concrete rules:

1. **One slot of content + one read-more affordance per section.**
2. **No section auto-expands** on panel open — even the hero summary ellipsizes after 2 lines.
3. **Expanding one section does not expand others.** Independent disclosure.
4. **Read-more is always the last thing inside the body**, accent text + chevron-down. Click flips to chevron-up + "Show less".
5. **Summary copy is real and informative**, not a teaser. "Activates this rule for 12 clients → 47 new obligations → +8% AZ coverage" is the summary; the breakdown is the reveal.

---

## Components used

Pencil reusables built this turn — each has a React equivalent to scaffold (see dev-log §1.5).

| Pencil component                      | Pencil ID | React target                                 | Used in                                                   |
| ------------------------------------- | --------- | -------------------------------------------- | --------------------------------------------------------- |
| `AlertStatusChip · awaiting`          | `w4DBr`   | `AlertStatusChip status="matched"`           | Hero bar of State B                                       |
| `AlertStatusChip · applied`           | `b75I5W`  | `AlertStatusChip status="applied"`           | Hero bar of State F                                       |
| `AlertStatusChip · dismissed`         | `GzVzj`   | `AlertStatusChip status="dismissed"`         | Rule list rows + State F variants                         |
| `AlertStatusChip · partially_applied` | `g770iB`  | `AlertStatusChip status="partially_applied"` | Rule list rows                                            |
| `AlertStatusChip · reverted`          | `Cirrk`   | `AlertStatusChip status="reverted"`          | Rule list rows                                            |
| `AlertStatusChip · reviewed`          | `OMxu3`   | `AlertStatusChip status="reviewed"`          | Rule list rows + bulk modal                               |
| `RelatedRuleRow`                      | `G0zYC`   | `RelatedRuleRow`                             | Related rules section (alert detail; future rules detail) |
| `DecisionActions`                     | `fJtAo`   | `DecisionActions`                            | Decision footer of State B, alert detail footer           |

---

## Migration sequence

See `docs/dev-log/2026-06-09-alert-deadline-rule-detail-amendments.md` §3 for the full execution steps. Summary:

1. **Step 4a** (1d, low risk) — widen the existing Sheet
2. **Step 4b** (2-3d, medium risk) — move drawer → right-column takeover + `?ruleId=` routing
3. **Step 4c** (2d, medium risk) — refactor BulkReviewModal
4. **Step 4d** (3-5d, refactor) — rebuild RuleDetailCompact in summary-first card-stack with all 8 sections

Steps are **independent** — you can ship Step 4a alone if scope is tight. The UX improves at every step.

---

## What this design replaces / supersedes

- **Replaces:** the BulkReviewModal as the only review surface. Bulk modal still exists (simplified) for batch flows.
- **Supersedes:** the RuleDetailCompact drawer (`rule-detail-drawer.tsx:218-312`) as a side drawer. Becomes a right-column takeover.
- **Does NOT replace:** the rule library page (`coverage-tab.tsx`) itself or the jurisdiction coverage map (it moves to a header strip or collapsed sidebar; doesn't disappear).

---

## Decisions still open

| Decision                                                         | Owner        | Default if not made                        |
| ---------------------------------------------------------------- | ------------ | ------------------------------------------ |
| Rename DB `matched` → `awaiting_decision`?                       | Eng          | NO — display-only rename in chip component |
| Related rules — ship in v1 or v1.1?                              | Product      | v1.1 (defer; not blocking)                 |
| Coverage map — header strip or collapsed sidebar after takeover? | Design + Eng | Header strip (less state machinery)        |
| Per-field confidence on Applicability cells (<70% warning tick)? | Product      | Strip from model output for v1             |
| Partial extraction state (em-dash + "Not in source")?            | Product      | Render em-dash, no hover tooltip in v1     |
