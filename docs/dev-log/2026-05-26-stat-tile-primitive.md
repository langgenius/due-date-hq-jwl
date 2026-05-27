# StatTile primitive extract — 2026-05-26

Closes audit P0 cross-surface #1 (the single most-fixable theme in
`docs/Design/ui-audit-2026-05-25.md`).

## The actual landscape at ship time

The audit catalogued **5 parallel implementations** of the "compact
metric tile" shape. By the time this commit started, **2 had already
been retired** during normal cleanup work:

| Surface          | Status when audit was written      | Status when this commit started                                      |
| ---------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `/clients`       | `ClientsStatTile` (text-xl)        | **Retired** by PR #25 (directory pivot)                              |
| `/clients/[id]`  | `ClientSummaryStrip.TileShell`     | Still present (Figma replica)                                        |
| `/opportunities` | `OpportunitiesStatTile` (text-2xl) | Still present                                                        |
| `/rules/library` | `StatTile` (text-xl)               | **Retired** by 2026-05-26 "seventy-second pass" (scoreboard distill) |
| Dashboard        | `ActionsSummaryTile` (text-lg)     | Still present                                                        |

Plus one the audit missed: `RemindersPage.StatTile` (settings-tier
Card + icon + caption — different design language).

## What shipped

### 1 · New shared primitive

`apps/app/src/components/patterns/stat-tile.tsx`

```tsx
<StatTile
  value={count}        // ReactNode | undefined; undefined → Skeleton
  label={<Trans>…</Trans>}
  tone="neutral"       // | "critical"
  href="/deadlines?…"  // OR onClick={…}; href wins
  ariaLabel={…}        // optional
/>
```

Visual contract (per DESIGN.md §3.2 _Tile value_ row, updated this
commit to point at the primitive):

- Frame: `rounded-md border border-divider-subtle bg-background-default px-4 py-3`
- Value: `text-xl font-semibold leading-tight tabular-nums tracking-tight`,
  tone-coded
- Label: `text-sm text-text-secondary`
- Skeleton: `h-7 w-12` in the value slot when value is undefined
- Interactive variants get `transition-colors` + hover bg + focus ring

### 2 · Migrated commodity consumers

- `apps/app/src/features/opportunities/opportunities-page.tsx`
  `OpportunitiesStatTile` → `StatTile` (3 call sites)
- `apps/app/src/features/dashboard/actions-list.tsx`
  `ActionsSummaryTile` → `StatTile` (1 call site, the summary strip)

Both local components deleted, leaving brief "retired → see primitive"
comments in their place for git-blame discoverability.

### 3 · Left bespoke (with documentation)

- **`ClientSummaryStrip.TileShell`** (`/clients/[id]`) — Figma-replica
  anchor tile. 12-px rounded `bg-util-colors-gray-25`, 30%-opacity
  label, special subline composition with per-segment tinting (the
  "Due May 6 · 17 days late" split). Different design language than
  the commodity strip — it's an anchor signal at the top of the page,
  not a row of summary chips.
- **`RemindersPage.StatTile`** (`/reminders`) — settings-tier tile
  inside Card chrome with an icon slot + small caption row.
  Settings surfaces deliberately keep Card framing; this primitive
  targets frameless body surfaces.

Both decisions are documented in the new primitive's doc-string so
future audits don't re-litigate.

## Why `text-xl` (not `text-lg` or `text-2xl`)

`text-xl semibold` is the DESIGN.md canonical scale for the _Tile
value_ role. Both surviving consumers had drifted:

- **Opportunities** went `text-2xl semibold` in the 2026-05-25 polish
  pass after Yuqi flagged the rule-library shape "felt thin". That
  was an over-correction.
- **Dashboard** went `text-lg medium` in the 2026-05-25 second pass
  because text-xl "competed with the page h1." That collision is
  itself an open audit finding (T1 — the dashboard h1 renders at
  text-xl via inline `<header>` markup, instead of routing through
  `PageHeader` which would render at text-2xl). When T1 ships, a
  text-xl tile value will read correctly as the smaller scale beneath
  a text-2xl h1.

So the apparent disagreement was two separate bugs masking a third.
`text-xl semibold` is right; T1 is the dependency.

## API choices

The audit's wish-list included `optional sublabel` and an `active`
pressed state. Neither surviving consumer uses them today, so they
didn't ship. Adding props for hypothetical consumers grows the API
surface for zero current value; restore from git history when a real
consumer needs them.

Tone is `'neutral' | 'critical'` — that covers both consumers.
ClientSummaryStrip wanted four tones (`warning` and `muted` too), but
ClientSummaryStrip stays bespoke, so we don't need them here.

## Verification

```bash
CI=true pnpm exec vp check
# → Found 0 errors and 9 warnings in 701 files (327.9s, 12 threads)
# File count went 700 → 701 (the new primitive).
# All 9 warnings are pre-existing in unrelated files.
```

## Status updates

`docs/Design/ui-audit-2026-05-25.md`:

- Top-10 #1 row: **Shipped 2026-05-26.** (annotated with extraction details)
- L8 (per-surface): **Shipped** — defer to #1.
- O1 and T3 deferred to #1 (no separate annotation needed; they
  already point at #1).

`docs/Design/DueDateHQ-DESIGN.md` §3.2:

- _Tile value_ role now points at the shared primitive AND
  documents the two bespoke variants (anchor / settings-tier).

## Out-of-scope follow-ups discovered

- **Audit T1** (dashboard h1 routes through `PageHeader`). With the
  shared primitive in place, T1 also fixes a latent visual issue —
  the text-xl tile value will read correctly only once T1 lands.
  Worth bundling with the next dashboard-touching commit.
- **Audit R1** (rules library progress bar + scoreboard restatement).
  The scoreboard distill that retired the rules-library `StatTile`
  may have addressed this; needs verification.
- **`ClientSummaryStrip.TileShell`** still has its own subline-tinting
  logic. If the SummaryStrip ever needs to consume the shared
  primitive (audit D4 follow-up), the subline contract becomes a
  point of friction. Cross that bridge then.
