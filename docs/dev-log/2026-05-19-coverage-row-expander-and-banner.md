---
title: 'Coverage: always-on source banner + inline row-expander to replace repetitive drills'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage: always-on source banner + inline row-expander

## Context

Two issues raised in the same turn:

1. **"Why is the sources not showing?"** — the source-attention
   callout was conditional, rendering only when there was an
   incident. Silence-equals-OK is ambiguous (could mean loading,
   broken, or healthy). The user wants an always-visible source
   status banner with two states: green/healthy when all working,
   warning when some broken.

2. **"Click on a row just goes to obligation — feels repetitive."**
   Every cell drilled to a list view (Library/Sources/Catalog),
   forcing the user to leave-and-return for every row of investigation.
   The user picked **inline row-expander** as the fix; cell drills
   stay as power-user shortcuts.

## Change

### Always-on source banner

`SourceAttentionCallout` (only-when-incident) → `SourceStatusBanner`
(always renders, with two states):

| State                  | Treatment                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `attentionCount > 0`   | Warning pill — `bg-severity-medium/10`, alert-triangle icon, `"{N} sources need attention"`, links to `/rules/sources?health=degraded` |
| `attentionCount === 0` | Success pill — `bg-status-done/10`, check-circle icon, `"All {N} sources working"`, links to `/rules/sources` (no filter)              |

Borderless (per the "avoid borders" directive from the previous
turn); bg-tint alone carries the chrome. Both states sit in the same
slot so there's no missing-banner ambiguity.

### Inline row-expander

Row body is now clickable: clicking anywhere outside an inner
button or link toggles that jurisdiction's expanded state. Multiple
rows can be expanded simultaneously so the user can compare two
jurisdictions inline.

| Implementation      | Detail                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Component state     | `useState<Set<string>>(new Set())` keyed by jurisdiction code                                                     |
| Row attributes      | `role="button"`, `tabIndex={0}`, `aria-expanded={isExpanded}`, `aria-label={"… click to expand/collapse detail"}` |
| Visual hint         | Leading chevron in the JUR cell — `▶` collapsed, `▼` expanded (rotates 90° via CSS)                               |
| Expanded background | `bg-background-subtle/60` on the main row when expanded; the detail row uses `/30` for a subtle visual nest       |
| Click guard         | `target.closest('button, a')` in the row handler — clicks on inner interactives bypass row toggle                 |
| Keyboard            | `Enter` / `Space` toggle when row is focused; native Tab still cycles inner buttons                               |

**Cell-level drills** still work because each inner button now
explicitly calls `event.stopPropagation()` in its `onClick` —
clicking the `Pending` count drills to Library (skipping row
expansion), clicking the source descriptor drills to Sources, etc.

### Expanded row content

Drops in below the main row as a single sibling `<TableRow>` with
`colSpan={3 + 1 + ENTITY_DISPLAY.length}` = 11. Two-column grid
(`md:grid-cols-2`):

- **Left: PENDING RULES** — title list (up to 6 rules visible), each
  with a `Source ↗` link to the cited document. "Open all in Catalog
  →" header CTA opens Library filtered to this jurisdiction's pending
  queue. Overflow handled with `"+N more — open in Catalog to review"`.
- **Right: WATCHED SOURCES** — list of source titles (up to 6) each
  as an external link with the `ExternalLinkIcon` chip. Overflow:
  `"+N more"`.

Both lists hover-highlight individual items so the affordance is
clear. Empty states render gracefully ("No pending rules for this
jurisdiction.").

## Why the row-expander beats the rail-panel here

v6 had a persistent right-rail jurisdiction detail panel. The user
binned it because it competed with the table for screen real estate.
The row-expander is the middle ground:

- **No permanent layout cost** — the page is the table by default
- **Inline progressive disclosure** — expand only the rows you're
  investigating, scan-and-act on the same surface
- **Compare two rows** at once by expanding both
- **Keeps the V1 table-density** that the reference design earned

## Files

- `apps/app/src/features/rules/coverage-tab.tsx` (substantial edits)

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Browser preview at `/rules/coverage`:
  - Banner reads `"11 sources need attention →"` in warning tone
    (when seed data has degraded sources). Toggling all-healthy would
    show `"All 88 sources working →"` in success tone (verified via
    code path — banner always renders)
  - Click California row (on the JUR cell) → row expands; chevron
    rotates from ▶ to ▼; detail row appears with 6 pending rules
    on the left (each with Source ↗ link) and 6 watched sources on
    the right
  - Click again → row collapses
  - Click the `7` Pending count in the row → drills to Library
    (expansion does NOT also fire, thanks to stopPropagation)
  - Click the source descriptor → drills to Sources filtered by
    California
  - Keyboard: Tab into row → Enter expands → Tab into expanded
    content → links navigate as expected
  - Stats pills, search, and filter chip from previous turns all
    still work; URL state preserved

## Critique scores — updated

Previous pass: 32/40 (Good).

This pass primarily fixed:

- **Heuristic 7 (Flexibility & Efficiency)**: 3 → 4 (inline expansion
  removes the leave-and-return loop for the daily-use case)
- **Heuristic 1 (Visibility of System Status)**: 3 → 4 (banner is
  always visible, so the user always knows where source health stands)

Estimated total: **~34/40 — Good**.

## Open

- **Accept/Reject inline** in the expanded detail — currently the
  expanded rule list is read-only (links + source). Adding inline
  Accept/Reject (with the same two-step confirm from v6) would
  collapse the last "leave Coverage to do work" trip.
- **Persist expanded state in URL** — currently lost on refresh.
  Could add `?open=CA,NY` if shareable state proves useful.
- **Bulk select across expanded rows** — power-user feature for
  approving multiple pending rules at once.
