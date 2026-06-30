# Select — compact `size="sm"` treatment (F-010)

**Date:** 2026-06-30 · consistency backlog

`SelectTrigger size="sm"` previously only set `h-8`; dense panels re-overrode
`h-8 rounded-lg text-xs` per call (4 sites in generation-preview-tab). Made `sm`
carry the full compact treatment (`h-8 + rounded-lg + text-xs`) so it's a token,
and migrated those sites to `size="sm"`. Zero visual change (sites already
rendered those exact values via overrides). Only 1 other `size="sm"` Select
existed (members inline cell-picker, which overrides to its own h-6) so no
regression risk. typecheck 0 errors.

`members-page` inline role-picker (`h-6` transparent cell editor, F-009) is a
distinct inline-cell pattern, left as a documented one-off.
