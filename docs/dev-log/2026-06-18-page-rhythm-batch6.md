# Page-top vertical rhythm (audit batch 6a)

_2026-06-18_

Batch 6 of the [full-app audit](../Design/full-app-audit-2026-06-18.md). Unify the
page-top vertical rhythm to the dominant `pt-8 pb-12` (dashboard + obligations are
already canonical):

- `workload-page.tsx:84` — `pb-6` → `pb-12`
- `billing.tsx:296,324` (both render branches) — `py-6` → `pt-8 pb-12`
- `clients.$clientId.tsx:109` — off-scale `pt-5 md:pt-6` → `pt-6 md:pt-8` (detail-page
  archetype: brought on-scale + toward the pt-8 family without over-padding the
  tighter master-detail header)

## Column ladder — already live

The audit also recommended default-hiding the `taxCategory` + `evidenceCount`
columns on /deadlines. This is **already implemented**: both are in
`obligations.tsx` `DEFAULT_HIDDEN_COLUMN_IDS` (the default-visible set is ~8 cols).
No change needed.

The deeper clip-risk fix (viewport-gated `hidden xl:table-cell` ladder for the
`table-fixed` + `overflow-x-clip` queue) is left as a follow-up — the file
deliberately chose `overflow-x-clip` to avoid sticky-column trapping, so a
responsive column ladder there needs its own careful pass.

## Verification

- `tsgo --noEmit` → 0 errors; `vp check` clean. Layout class only.
