# Client detail — expansion redesign + StateBadge chips + tab breathing room

**Date:** 2026-06-11 — from Yuqi's review ("yes do them")

**Expanded-row action (DeadlineRowExpansion) — harsh-critique runthrough:**

- **Honest stepper:** the current stage now reads as **accent** (positional), not
  warning-amber ("In review" isn't a warning); and `blocked` never renders as a
  green "passed" dot — it falls to the muted/ghosted treatment (it's a side-state,
  not a milestone you complete). Removes the "everything before current is green"
  lie.
- **State-aware action:** terminal rows show a quiet "Filed ✓" affirmation instead
  of a dead, disabled "Mark filed" button; Snooze drops once filed.
- **Single exit:** removed "Activity on full page →" (it pointed at a tab of the
  very page "Open full deadline" opens). Footer is now one right-aligned link.

**StateBadge (#1):** the StatBand JURISDICTIONS chips swapped from raw
`<Badge variant="outline">{code}</Badge>` to the canonical `<StateBadge>` seal mark.

**Tab breathing room (#9):** ClientDetailTabTrigger `py-1.5` → `py-2.5`.

tsgo clean; verified live (Form CT-3 expansion + NY seal).
