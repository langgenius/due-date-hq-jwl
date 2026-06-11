# Client detail review — pass 1 (token fixes)

**Date:** 2026-06-11

First, unambiguous items from Yuqi's /clients detail review:

- **StatBand value 26px → 24px** (shared band, all 5 surfaces) — per "24px" note.
- **Rail Active-alerts card**: removed the outer `p-4` (it double-padded the inner
  header row) and moved `rounded-lg`→`rounded-xl` + `overflow-hidden` so the gray
  header + rows sit flush, matching the History cards + the canonical card radius.

Larger structural items (Filings → fixed-column table, expanded-row action
critique, header/rail polish, state-badge audit) tracked for a focused pass.
