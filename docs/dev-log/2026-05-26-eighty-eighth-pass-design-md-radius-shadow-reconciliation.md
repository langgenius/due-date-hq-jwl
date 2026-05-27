# Eighty-eighth pass — DESIGN.md §2.5 reconciliation + 3 shadow-token fixes

**Date:** 2026-05-26
**Branch:** `feat/jolly-hopper-46479d`

## What this pass does

Step 3 of the 9-step day plan kicked off as a design-system drift audit.
First grep against DESIGN.md §2.5 found that the doc and the code
**disagree on the canonical radius / shadow scale**:

- DESIGN.md §2.5 claimed only `rounded-sm` (4px), `rounded-md` (6px),
  `rounded-lg` (12px) were allowed, plus `shadow-subtle` and
  `shadow-overlay`.
- `packages/ui/src/styles/tokens/primitives.css` uses Tailwind v4 +
  Dify defaults verbatim: `rounded-sm`=4px, `rounded-md`=6px,
  **`rounded-lg`=8px**, **`rounded-xl`=12px**, `rounded-2xl`=16px, plus
  the full `shadow-xs/sm/md/lg/xl/2xl/3xl` scale (with `shadow-subtle`
  and `shadow-overlay` kept as legacy aliases).

The codebase has been built against the Dify scale (70 `rounded-lg`
uses for 8px-radius cards, 11 `rounded-xl` uses for 12px-radius drawers,
100 `rounded-full` for pills, 8 `shadow-sm` for default elevation, 3
`shadow-overlay` for modals — and **zero `rounded-md` uses, because
6px isn't a thing in this design**).

So the doc was aspirational and out of sync with the code. Per the
user's call (option 1 of the reconciliation question): **update
DESIGN.md to match reality.** The implementation is internally
consistent; the doc was the drift.

## Changes

### 1. DESIGN.md v2.0 → v2.1: §2.5 rewritten

Old version:

- 5-token shortlist (radius-sm / radius-md / radius-lg / shadow-subtle
  / shadow-overlay) presented as "唯一合法来源".
- "禁止 > 12px" rule that didn't match the codebase's 16px outliers.
- "禁止阴影的三个例外" framing that contradicted 30+ legitimate
  `shadow-sm` and `shadow-xs` uses already shipped.

New version:

- Lists the **actual** Tailwind v4 + Dify scale (rounded-sm through
  rounded-2xl, shadow-xs through shadow-3xl) with the project's
  semantic aliases `shadow-subtle` / `shadow-overlay` documented as
  the modal/popover canonical.
- Per-scenario usage table (Chip → rounded-sm; Card → rounded-lg;
  Drawer / Modal → rounded-xl + shadow-overlay; Pill → rounded-full).
- New "漂移判据" subsection enumerating what's STILL drift after the
  reconciliation: `rounded-3xl` (forbidden — zero uses, don't
  introduce), `rounded-2xl` (3 historical uses, prefer rounded-xl in
  new code), `shadow-2xl/3xl` in business components, and inline
  custom shadows that bypass the scale.
- Explanation paragraph at the bottom documenting why the doc
  changed: original v1.0 was aspirational; primitives.css implemented
  the Dify scale per the vite-plus template; v2.1 just acknowledges
  that.

Header bumped from v2.0 → v2.1.

### 2. Actual code drift fixed (3 sites)

After the reconciliation, the remaining real drift was small:

- **`apps/app/src/routes/obligations.tsx:7235`** (obligation drawer
  left edge) — was `shadow-[-4px_0_12px_-6px_rgb(0_0_0_/_0.08)]`,
  now `shadow-subtle`. Drawer edge shadow is the canonical use case
  for `shadow-subtle` per the new §2.5 table.
- **`apps/app/src/features/pulse/PulseDetailDrawer.tsx:1007`** (pulse
  drawer left edge) — same hand-rolled shadow string, same fix.
  These two were obvious duplicates of the same intent.
- **`apps/app/src/components/patterns/floating-action-bar.tsx:73`**
  (FloatingActionBar) — was
  `shadow-[0_20px_48px_-16px_rgb(0_0_0_/_0.18)]`, now `shadow-overlay`.
  Floating action bar is functionally an overlay surface; the
  canonical token for that elevation is `shadow-overlay`.

### What was NOT touched

- `apps/app/src/routes/rules.library.tsx:2502, 2653, 3086` — three
  `shadow-[inset_2px_0_0_var(...)]` uses. These are **not elevation
  shadows** — they're a left-edge accent border drawn via inset
  shadow so it doesn't push layout. Replacing them with a real
  `border-l-2` would shift adjacent content by 2px. Intentional and
  load-bearing.
- `apps/app/src/features/billing/upgrade-cta-button.tsx:37` —
  `hover:shadow-[0_0_0_1px_rgb(247_144_9_/_0.35),0_12px_28px_rgb(247_144_9_/_0.36)]`.
  This is a multi-layer brand-amber glow on the upgrade CTA hover
  state. Intentional brand-marketing effect with specific orange
  values that don't map to a token. Left as-is.
- 3 references to `rounded-2xl` in `needs-attention-section.tsx` +
  `floating-action-bar.tsx` — all in COMMENTS only (e.g., "earlier
  version used rounded-2xl"), no actual className use. Comments
  stay since they document why the current value was chosen.

## Verification

```
pnpm exec tsc -p apps/app/tsconfig.json --noEmit  → clean
pnpm exec vp lint apps/app                        → 0 warnings, 0 errors
```

Re-running the radius/shadow grep post-reconciliation surfaces zero
canonical-token violations remaining.

## Implication for the rest of step 3

After this commit, "drift from DESIGN.md" finally means something
auditable. The next sub-areas of the design-system audit that the
prior pass 86 audit didn't cover:

- **Icon sizing scale** — `size-3` / `size-4` / `size-5` / `size-6`
  consistency across same-context surfaces.
- **Padding/margin scale** — already partially covered by
  pass-86 gap-scale enforcement; padding scale not yet audited.
- **Semantic color token usage** — anything not using
  `bg-background-*` / `text-text-*` / `border-divider-*` /
  `bg-state-*-*` semantic families.
- **Button variant consistency** — every CTA on the same surface
  family should use the same button variant + size.

Each is its own focused audit. The pattern from this commit
(reconcile doc with reality first, then sweep real drift) is
generalizable.

## Files

- `docs/Design/DueDateHQ-DESIGN.md` (§2.5 rewritten; v2.0 → v2.1)
- `apps/app/src/routes/obligations.tsx` (1 shadow site)
- `apps/app/src/features/pulse/PulseDetailDrawer.tsx` (1 shadow site)
- `apps/app/src/components/patterns/floating-action-bar.tsx` (1 shadow site)
- `docs/dev-log/2026-05-26-eighty-eighth-pass-design-md-radius-shadow-reconciliation.md` (this file)
