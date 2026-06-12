# UX copy batch 2 — retire the "caught up" cheer + factual fixes (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md, findings S2 + the three factual bugs.

A quiet queue is a fact, not an achievement. The congratulatory "caught up" family spoke consumer-fintech cheer to a stressed CPA; replaced with factual calm, one phrasing per surface type. Also fixed the audit's three factual/grammar bugs.

## Cheer family (9 sites)

| File                        | Before                                                        | After                                |
| --------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| splash.tsx                  | "Nothing changed while you were away — you're all caught up." | "No activity since your last visit." |
| needs-attention-section.tsx | "No alerts — you're caught up"                                | "No alerts right now"                |
| AlertsListPage.tsx          | "No alerts — you're caught up"                                | "No alerts right now"                |
| preview.tsx (specimen)      | same                                                          | "No alerts right now"                |
| actions-list.tsx            | "You're all caught up"                                        | "Your queue is clear"                |
| rules.library.tsx           | "You're all caught up"                                        | "Review queue is clear"              |
| FixNeedsFactsSheet.tsx      | "All caught up" (badge)                                       | "All resolved"                       |
| SurfaceSummaryStrip.tsx     | "All caught up" (zero-state)                                  | "Nothing pending"                    |
| sources-tab.tsx             | "You're already caught up — no still-open windows to add."    | "No still-open windows to add."      |

## Factual / grammar / tone bugs

- **merged-brief-card.tsx** — "You're clear — nothing due this month." rendered on `totalActive === 0`, which is not month-scoped (could be factually wrong) → "No open deadlines right now." Sibling "Nothing here. You're clear." → "No open deadlines."
- **Step4Preview.tsx** — broken passive "# clients have state deadlines that need reviewed practice rules first." → "…state deadlines waiting on rule review." (the next sentence already explains generation behavior).
- **MorningSweepDialog.tsx** — "Brewing your briefing…" (cheeky) → "Preparing your briefing…"; "AI summarisation unavailable." (British spelling + jargon) → "Briefing unavailable."
- **extension-chip.tsx / ClientDetailWorkspace.tsx** — all-caps shouting "payment is NOT extended" → "payment is not extended" (3 sites).

Tests updated alongside (AlertsListPage, actions-list, SurfaceSummaryStrip) — all pass. Catalog regen deferred to the end-of-series catalogs commit (see batch 1 log).
