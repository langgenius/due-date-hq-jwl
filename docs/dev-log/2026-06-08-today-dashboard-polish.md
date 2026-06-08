# /today dashboard polish batch

Date: 2026-06-08

Yuqi review of /today (9 items).

## Changes
- **Status-group band thinner** (actions-list.tsx): `py-1.5` → `py-1` (text-[11px] kept).
- **Section headers → eyebrow** (needs-attention-section.tsx "Alerts" + actions-list.tsx
  "Actions this week"): `text-base font-semibold text-primary` → `text-[14px]
  uppercase tracking-[0.4px] text-text-tertiary`.
- **Alert card hover emphasis** (needs-attention-card.tsx): on card hover the
  change-kind label → `group-hover:text-text-accent`; the confidence pill → its
  confidence-tier color (high green / med amber / low red via `aiConfidenceTier`).
- **Daily Brief** (daily-brief-card.tsx): title → `text-text-accent`; "FAILED"
  moved to the right cluster next to the retry icon; removed the card border
  (kept the soft fill).
- **Actions header Sparkles** (actions-list.tsx): trigger `cursor-help` →
  `cursor-default`; icon `hover:text-text-accent`.
- **Action row hover** (actions-list.tsx): the action-verb line gains
  `group-hover:font-medium group-hover:text-text-primary`.

## Verify
tsgo clean; /today at 1512×861 — Daily Brief accent title + FAILED-by-retry + no
border; ALERTS / ACTIONS THIS WEEK uppercase gray eyebrows; hover classes wired
on change-kind (accent), conf (tier), action verb (primary/medium). 
