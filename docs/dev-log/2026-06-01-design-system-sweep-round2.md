# Design-system bidirectional sweep — round 2 (the long tail)

## Context

Round 1 (commit `5a2a4c6d`) caught the obvious surface-level chrome: 34 chips / cards /
links that read as "tokens that happen to be the same family" instead of "instances of
one primitive." Round 2's job: the long tail — surfaces round 1 didn't scan.

Five parallel discovery agents scanned five distinct surface classes:

1. **Sidebar + app-shell chrome** — top-bar elements, nav-item chrome
2. **Dialog / Sheet / Drawer / Popover content** — drawer-internal sections that
   hand-roll padding/gap instead of using built-in slots
3. **Table cells + row chrome** — status chips, filter chip rows, pagination, table
   empty states
4. **Forms + inputs + fields** — bare `<label>` + `<input>` pairs that should be
   `<Field>` + `<FieldLabel>` + `<Input>`
5. **Misc** — tooltips, dropdowns, kbd hints, loading skeletons, "—" empty-cell marks,
   "X ago" timestamps, AI provenance flags, avatar initials, toasts/banners

Discoveries surfaced 104 candidate sites. Triage consolidated to 87 migrations + 9
primitive extensions.

## Change

### Primitive extensions (9)

| Primitive   | New axis / variants                                            | Why                                                                                                                  |
| ----------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Card`      | `interactive={true}`                                           | Clickable cards (RuleEvidenceCard link, EvidenceCard, PulseAlertCard) get pointer + accent-border hover + focus ring |
| `Card`      | `emphasis="unread"`                                            | Accent left-rail (3px) for notifications, pulse bell items, dashboard needs-attention                                |
| `Card`      | `tone="accent-active"`                                         | Selected/focused state with deeper accent border + hover bg; distinct from quiet `tone="accent"`                     |
| `Badge`     | additional axes (~10 LoC)                                      | Refined size / shape / tone combinations the round-1 axes didn't cover                                               |
| `Field`     | additional variants (~40 LoC)                                  | Form chrome consolidation — `<FieldError>`, `<FieldDescription>`, density variants                                   |
| `Sheet`     | new slot / variant (~9 LoC)                                    | Drawer-internal sections that needed a canonical slot vs hand-rolled padding                                         |
| `Sidebar`   | refined sidebar primitives (~11 LoC)                           | Sidebar nav items + badge consumers consolidated                                                                     |

### Call-site migrations — 87 sites across 39 files

Spans 14 feature buckets: `clients`, `pulse`, `obligations`, `routes`, `audit`,
`migration`, `rules`, `evidence`, `dashboard`, `members`, `reminders`,
`notifications`, `workload`, `auth`, plus `patterns`.

**Notable consolidations:**

- `PulseConfidencePill` — 3 hand-rolled `<span>` tone branches collapsed to a single
  `<Badge>` call with `variant="warning"|"outline"|"info"`. The Astroid icon now
  inherits Badge's `[&>svg]:size-3!` sizing.
- `audit-log-table.tsx` — two diverging avatar branches (AI vs human) consolidated
  through the canonical `<AssigneeAvatar>` primitive.
- `needs-attention-card.tsx` — `formatRelativeTime()` string output replaced with the
  canonical `<RelativeTime>` primitive. Render now wraps `<time dateTime title>` for
  a11y + tooltip precision matching every other recency surface in the app.
- Sidebar consumers — nav item chrome that was hand-rolling `rounded-md p-2 hover:bg-state-base-hover`
  moved through the canonical `<SidebarMenuButton>` primitive.

### Mechanism

5 phases: **Discover (5 parallel) → Triage (1) → Extend primitives (1) → Migrate (~12
parallel by bucket) → Verify (1)**. Same Workflow-driven shape as round 1.

`2,005,621` subagent tokens, `831` tool uses, `~30 min` wall-clock, `22` agents total.

## Verification

- `pnpm exec tsc --noEmit -p apps/app/tsconfig.json` — clean
- `/` and `/preview` → 200
- Spot-checks: `audit-log-table.tsx`, `needs-attention-card.tsx`, `PulseConfidencePill.tsx`
  — all imports resolve, `<Trans>` macros intact, no raw hex outside intentional brand
  assets (state-badge.tsx US flag pixels + source-logos vendor SVGs)
- Half-step `gap-1.5` / `py-1.5` matches all in pre-existing non-migrated code; the
  migration agents introduced none

### Skipped (intentional, not bugs)

- `state-badge.tsx` SVG flag fills — brand-accurate US state flag pixels, not themable
  surfaces
- Vendor source logos (`quickbooks.svg`, `file-in-time.svg`) — third-party brand marks
- Historical hex strings inside `// comments` — documentation, not live styles

## Cumulative state (rounds 1 + 2)

| Metric                | Round 1 | Round 2 | Cumulative |
| --------------------- | ------- | ------- | ---------- |
| Discoveries           | ~64     | 104     | ~168       |
| Primitive extensions  | 6       | 9       | 15         |
| Migrations            | 34      | 87      | 121        |
| Files modified        | 25      | 39      | ~50 (with overlap) |
| Subagent tokens       | 916k    | 2.0M    | 2.9M       |

## Next

Round-2 verification reported "all migrations land cleanly. Ready to commit." The long
tail is meaningfully exhausted. Future rounds (round 3+) would scan:

- Settings page chrome density (forms + tile clusters that may still be hand-rolling
  card layouts inside settings)
- Marketing route surfaces (separate Astro app, currently out of scope of this sweep)
- Dark mode parity check — most extensions land on light-mode tokens; dark-mode visual
  parity should be confirmed with a theme-switched walkthrough
