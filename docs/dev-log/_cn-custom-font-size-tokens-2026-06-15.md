# cn() was silently stripping custom font-size tokens (2026-06-15)

## Symptom
Yuqi asked (twice) for the table-header CAPS to be 1px smaller. I'd lowered
the `--text-column-label` token 12 → 11px, but the header kept rendering at
the inherited **13px** — the `<th>` didn't even carry the `text-column-label`
class in the DOM.

## Root cause
`cn()` (packages/ui/src/lib/utils.ts) is `extendTailwindMerge` that only
registered TWO custom font-size tokens — `caption` / `caption-xs`. Every
other custom size token (`column-label`, `item-title`, `row-anchor`,
`region-title`, …) was unknown to tailwind-merge, so when a component merged
one with a text COLOR in the same call — e.g. TableHead's
`cn('… text-column-label text-text-tertiary …')` — tailwind-merge treated
both as conflicting `text-*` utilities and **dropped the size**, keeping the
color. The token only ever worked where applied via a STATIC className
string (e.g. the `text-region-title` section h2), which never goes through
tailwind-merge.

So the token system was quietly half-broken: any custom size token combined
with a text color via `cn()` lost its size. The earlier `caption` fix
(2026-06-10) was the same bug, patched for one token only.

## Fix
Registered the FULL custom-size set in the `font-size` class group, so size
and color survive as distinct properties. One config change, fixes it
app-wide for every component using these tokens via `cn()`.

## Verify (fresh dev server)
The long-running Vite process was also serving a stale `table.tsx` (its
`<th>` lacked `data-slot="table-head"`); restarted it to get an honest read.
After the fix: Priorities `<th>` = **11px / 600** with `text-column-label`
applied; region-title h2 still 18px and the LIVE chip still 11px (no
regressions). tsgo clean.

This also makes the three earlier /today tweaks (committed in 0eb862e1)
fully land: alert description one line, priorities date 11px, header 11px.
