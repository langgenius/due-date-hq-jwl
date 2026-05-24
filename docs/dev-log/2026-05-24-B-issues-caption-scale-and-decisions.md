---
title: 'B-issues batch — caption type scale (B5) + decisions on B3/B4/B6/B7'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: typeset
---

# B-issues — caption type scale + considered-but-skipped notes

## Why

Following the deferred-items list, B2-B7 was the engineering batch.
B2 (pulse activeCount endpoint) shipped in its own commit
(`576c7b58`). This commit covers B5 (caption type scale) and
documents the four others I weighed and decided not to touch — each
for a different reason.

## What you decided to land vs. skip

| #   | Item                                     | Outcome                                                              |
| --- | ---------------------------------------- | -------------------------------------------------------------------- |
| B2  | Pulse `activeCount` endpoint             | ✅ Shipped in `576c7b58`                                             |
| B3  | ClientFactsWorkspace column-width tokens | ⏭️ **Kept inline** (intentional precise layout, would couple tables) |
| B4  | Opacity-overlay tokens                   | ⏭️ **Too few sites** (3 total, not a pattern)                        |
| B5  | Caption type scale                       | ✅ Shipped in this commit (146 sites)                                |
| B6  | Optimistic close on Pulse reason dialog  | ⏭️ **Reconsidered** — would be worse UX for audit-trail actions      |
| B7  | `mineTimelineTimestamps` cleanup         | ✅ Already done in earlier re-critique cleanup                       |

## B5 — Caption type scale (146 sites)

The codebase had 146 inline uses of `text-[10px]` (86) and
`text-[11px]` (60) — micro-typography below Tailwind's `text-xs`
(12px) "smallest readable" tier. Sites were:

- Eyebrow labels (uppercase + letter-spaced) — usually 10px
- Inline metadata + tabular gutters — usually 11px
- Dense badge interiors

Centralized as two tokens in `packages/ui/src/styles/preset.css`:

```css
--text-caption: 11px;
--text-caption--line-height: 16px;
--text-caption-xs: 10px;
--text-caption-xs--line-height: 14px;
```

Tailwind v4's `--text-*--line-height` convention sets a sensible
default so common pairings (uppercase eyebrow with tracking) read
tightly without an explicit `leading-N` on every site. The 14 sites
that DO set `leading-3` / `leading-4` explicitly continue to win
(explicit class beats implicit token line-height).

**Replacement scope:** 86 sites of `text-[10px]` → `text-caption-xs`,
60 sites of `text-[11px]` → `text-caption`. Across 32 files. Other
arbitrary text sizes (`text-[8px]`, `text-[9px]`, `text-[12px]` →
8 occurrences, `text-[13px]` → 9, `text-[14px]`, `text-[26px]`,
`text-[28px]`) left inline — each appears in few enough places that
tokenizing would invent semantics for outliers.

If you ever want to bump caption size from 11px to 12px, it's a
one-line edit in `preset.css` now.

## B3 — Column-width tokens (kept inline)

`ClientFactsWorkspace.tsx` has 9 distinct `w-[Npx]` values across
30 occurrences (`w-[80px]` 8×, `w-[120px]` 8×, plus 7 others). All
are hand-tuned for the filing-plan table specifically.

Tokenizing them globally as `w-col-narrow` / `w-col-default` / etc
would couple the filing-plan table's design to OTHER tables that
might want different column rhythm. The tokens would either need
to be filing-plan-specific (`w-fp-form`, `w-fp-date` — verbose) or
generic (which loses the precision).

The right time to tokenize: when a SECOND table needs the same
rhythm. Until then, the inline values are a self-documenting
design intent for this specific table.

## B4 — Opacity overlays (too few to tokenize)

Audit found only 3 sites using `bg-black/N` or `bg-white/N`:

- `billing/upgrade-cta-button.tsx`: `bg-white/35` (shimmer overlay)
- `obligations.tsx`: `bg-black/30` (modal backdrop — Base UI default)
- `billing.tsx`: `bg-white/20` (segmented control badge)

Three sites, three different values. That's not a pattern — it's
three independent design choices. Tokenizing as
`bg-overlay-dark` / `bg-overlay-light` would force one shape on
three contexts that legitimately differ. Revisit if brand adopts a
formal opacity-layer system.

## B6 — Optimistic close (reconsidered)

The deferred note said: "Currently waits for server roundtrip
before closing the dialog (200-500ms perceived delay). Could
optimistically close + toast on settle."

Reconsidered: PulseReasonDialog captures the **audit-trail reason**
for dismiss / snooze / mark-reviewed. The user has typed a few
sentences. If the network errors and the dialog has already closed,
the user has to:

1. Re-open the dialog
2. Re-type the entire reason
3. Re-submit

The current shape — dialog stays open with "Saving…" pending label
(landed in the interaction audit) + toast on error keeping the
dialog open for retry — is the **right** shape for this flow. The
200-500ms wait is acceptable cost for not losing the user's typed
context.

Optimistic close is a good pattern for low-cost actions ("Mark
read") where the user has invested no typing. It's the wrong
pattern for audit-trail reason capture.

## B7 — `mineTimelineTimestamps` (already done)

In the earlier re-critique cleanup commit (`7b2199f7`), this
function lost its misleading `stageKeys` parameter that pretended
to control matching but actually only sized the result. It's now
sized by the `TIMELINE_STAGE_COUNT` module constant, matching is
done by `timelineIndexForStatus()`. No further work needed.

## Verification

- `pnpm check` → 1392 files formatted, 655 lint+type clean.
- `pnpm test` → 295/295 green.

## Files touched (B5)

32 files across `apps/app/src` and `packages/ui/src/styles/preset.css`.
All mechanical substitutions of `text-[10px]` → `text-caption-xs`
and `text-[11px]` → `text-caption`.
