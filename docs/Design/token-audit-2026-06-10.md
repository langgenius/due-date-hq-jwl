# Token audit — 2026-06-10

Triggered by Yuqi ("怎么这么大的字？token呢" → "花些时间检查整体token"). Scope:
`apps/app/src` + `packages/ui/src`. Type scale (per `project_today_design_system`):
24 / 16 / 14 / 12(`text-xs`) / 11(`text-caption`) / 10(`text-caption-xs`); radius
scale 0 / 4 / 8 / 12 / 999; "no 13/15/8 magic sizes", "no freelance radii (6/10/14)".

## 0. Token-DROP class (the "token呢" bug) — FIXED ✅

`text-caption` / `text-caption-xs` were the ONLY custom font-size tokens, and they
were being silently dropped by `cn()`/tailwind-merge when combined with a custom
text-color. Fixed in `packages/ui/src/lib/utils.ts` via `extendTailwindMerge`
(commit `3e2dae0e`). No other custom token group is at cross-property drop risk
(custom colors only ever collide with same-property colors, which is correct dedup).

## 1. Font-size discipline — 479 arbitrary `text-[Npx]` ⚠️ (biggest gap)

| arbitrary            | count | should be         | note                                       |
| -------------------- | ----- | ----------------- | ------------------------------------------ |
| `text-[11px]`        | 167   | `text-caption`    | exact token exists                         |
| `text-[13px]`        | 109   | —                 | **OFF-SCALE magic (13 forbidden)**         |
| `text-[10px]`        | 77    | `text-caption-xs` | exact token exists                         |
| `text-[12px]`        | 55    | `text-xs`         | exact token exists                         |
| `text-[15px]`        | 20    | —                 | **OFF-SCALE (15 forbidden)** — sidebar nav |
| `text-[14px]`        | 10    | `text-sm`         | exact token exists                         |
| `text-[9px]`/`[8px]` | 11    | —                 | **OFF-SCALE (8 forbidden)**                |
| `text-[16-44px]`     | ~30   | display           | headings; need display tokens or accept    |

- **~313** map to existing tokens (caption/caption-xs/xs/sm/base).
- **~140** are off-scale magic values the design system explicitly forbids (13/15/8).
- ⚠️ NOT a blind find-replace: `text-caption` also applies a line-height token, so
  swapping `text-[11px]`→`text-caption` can shift layouts — needs a careful pass.

## 2. Hardcoded hex colors — 19 sites ⚠️

`bg-[#fafbfc]`×4 · `border-[#17b26a40]`×2 · `bg-[#fef3f2]`×2 · `bg-[#e9ebf0]`×2 ·
`bg-[#e8f5ee]`×2 · `text-[#6B21A8]` · `ring-[#e2e5ea]` · `border-[#fecdca]` ·
`border-[#155aef33]` · `bg-[#fffbeb]` · `bg-[#fee4e2]` · `bg-[#92400E]`. Each should
resolve to a semantic token (background-_, state-_, divider-\*) — needs per-site match.

## 3. Radius — ~36 non-canonical sites ⚠️

- **Forbidden freelance** (memory: "never 6/10/14"): `rounded-[10px]`×8 +
  `rounded-l/r-[10px]`×2, `rounded-[14px]`×2, `rounded-[20px]`×2 → snap to 8 or 12.
- **Should use the named token**: `rounded-[12px]`×16 → `rounded-xl`;
  `rounded-[8px]`×1 → `rounded-lg`; `rounded-[4px]`×20 → `rounded` / compact.

## Recommended remediation (prioritized, each verified)

1. **Forbidden values first** (clear rule violations, smaller count): radius
   10/14/20 (~14 sites) + off-scale font 13/15/8 (~140) → decide the right token
   per cluster.
2. **Exact-token swaps** (font 11/10/12/14/16 → tokens; radius 12/8/4 → named) —
   careful with caption's line-height; do per-area + screenshot-verify.
3. **Hex → tokens** (19 sites) — match each to the nearest semantic token.

Scale (~530 edits) makes this a multi-wave effort, not a single pass.

## Remediation log

- **2026-06-10 — exact-token swap, font 11/10:** replaced `text-[11px]`→`text-caption`
  (145×) and `text-[10px]`→`text-caption-xs` (63×) across **49 files** (excluded the
  pre-login auth/onboarding surfaces + any file under concurrent edit). Both tokens
  are designed for these px with matching line-heights → no layout shift. Verified
  caption→11px / caption-xs→10px live. Remaining (per design decisions): off-scale
  13/15/8, 12/14/16→xs/sm/base (larger lh delta), hex (19), radius (mostly auth /
  nested-radius — intentional).

## 2026-06-11 — app-wide font-token sweep (Yuqi: "都用token了吗? be diligent")

Full inventory: ~90 arbitrary `text-[Npx]` (guard only watched 10–15px), 27
arbitrary leadings, 115 arbitrary trackings. Actions:

**New tokens:** `--text-micro` 9px/12 (the old "≤9 intentional" carve-out,
now real) · `--text-nav` 15px/20 (deadline navigator rail + ui-sidebar
recipe; NOTE the app's own nav renders 16px per the 2026-06-08 15→16 fold).

**Swapped (exact value/role matches, ~45 sites):** 9px→text-micro (×8) ·
10px→text-2xs · 13px→text-sm (×2) · 15px→text-nav (×3) · 16px/600
titles→text-item-title (×13, incl. list-rail's canonical RailTitle) ·
16px mono-bold KPI→text-lg font-bold · 18px→text-xl (×5) · 28px→text-2xl ·
32px→text-section-title (×3: StatBand, jurisdiction empty state,
ClientsEmptyState) · the `[&_th_button]:!text-xs/!font-semibold/!tracking`
triplets on /deadlines + /clients → `!text-column-label` (+ explicit
`!font-semibold` retained — the Button primitive's --tw-font-weight var
otherwise overrides the token's weight sub-key; caught as a live 600→500
regression during verification and fixed).

**Guard extended:** flags 9–18px + 28 + 32 (token-covered sizes) everywhere
outside the auth-exempt paths. Baseline shrank 6 → 4 (the remaining 16/17px
inside drawer condense-morphs + migration wizard).

**Deliberately NOT swept (recorded backlog):**
- Display ramp 20/22/24/26/30/44px (~12 sites: empty-state 22, stat-band 24,
  drawer morph pairs 16↔22, PulseFormRevisedCard 20, migration 26, panels 30,
  login 44) — needs a display-scale consolidation decision, not piecemeal
  snapping.
- Auth/onboarding surfaces — documented separate softer/larger scale
  (EXEMPT_PATHS), teammate actively editing login.tsx.
- 27 arbitrary leadings (mostly titles, allowed by doctrine) + 115 arbitrary
  trackings — next sweep candidate: consolidate the eyebrow-family trackings
  (0.5/0.6/0.7/0.8px) onto --tracking-eyebrow(-tight).

## 2026-06-11 PM — display ramp consolidated + eyebrow tracking merged

**Display ramp (the backlog from the morning sweep) — closed.** Two new
steps: `--text-surface-title` 22/28 (detail-drawer condense-morph expanded
end ×2, prominent EmptyState heading) and `--text-stat-value` 24/1 (StatBand
compact numeral). Everything else SNAPPED to existing steps: drawer-morph
collapsed 16 → text-item-title; numeral heroes 26 (migration ×2) + 30
(readiness panel) → text-2xl; rules.library "Recent changes" 20/-0.015em →
text-region-title (it IS a region anchor — size and tracking both fold into
the token); PulseFormRevisedCard muted "Open" 20 → text-xl; skip-modal 17 →
text-xl. The canonical ramp: 18 xl · 22 surface-title · 24 stat-value ·
28 2xl · 32 section-title · 36 display-large.

**Eyebrow tracking merged.** The 4 near-values (0.5/0.6/0.7/0.8px, 35 sites)
folded onto the em-based tokens: 0.5/0.6 → `--tracking-eyebrow-tight`
(0.06em), 0.7/0.8 → `--tracking-eyebrow` (0.08em). Sub-pixel deltas only;
em-based now scales with size. (--text-column-label/--text-chip-label carry
their own letter-spacing internally — untouched.)

**Guard: the net is now closed.** Flags ALL text-[9–32px] outside the auth
exemption; baseline shrank to ZERO grandfathered signatures. 33+ display
sizes (display-large/hero) and the documented auth scale remain outside.
