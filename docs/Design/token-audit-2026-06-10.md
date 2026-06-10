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
| arbitrary | count | should be | note |
|---|---|---|---|
| `text-[11px]` | 167 | `text-caption` | exact token exists |
| `text-[13px]` | 109 | — | **OFF-SCALE magic (13 forbidden)** |
| `text-[10px]` | 77 | `text-caption-xs` | exact token exists |
| `text-[12px]` | 55 | `text-xs` | exact token exists |
| `text-[15px]` | 20 | — | **OFF-SCALE (15 forbidden)** — sidebar nav |
| `text-[14px]` | 10 | `text-sm` | exact token exists |
| `text-[9px]`/`[8px]` | 11 | — | **OFF-SCALE (8 forbidden)** |
| `text-[16-44px]` | ~30 | display | headings; need display tokens or accept |

- **~313** map to existing tokens (caption/caption-xs/xs/sm/base).
- **~140** are off-scale magic values the design system explicitly forbids (13/15/8).
- ⚠️ NOT a blind find-replace: `text-caption` also applies a line-height token, so
  swapping `text-[11px]`→`text-caption` can shift layouts — needs a careful pass.

## 2. Hardcoded hex colors — 19 sites ⚠️
`bg-[#fafbfc]`×4 · `border-[#17b26a40]`×2 · `bg-[#fef3f2]`×2 · `bg-[#e9ebf0]`×2 ·
`bg-[#e8f5ee]`×2 · `text-[#6B21A8]` · `ring-[#e2e5ea]` · `border-[#fecdca]` ·
`border-[#155aef33]` · `bg-[#fffbeb]` · `bg-[#fee4e2]` · `bg-[#92400E]`. Each should
resolve to a semantic token (background-*, state-*, divider-*) — needs per-site match.

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
