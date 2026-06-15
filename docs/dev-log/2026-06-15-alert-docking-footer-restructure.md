# Alert detail — docking footer structural rethink

_2026-06-15_

Follow-up to Yuqi: "the sticky action bar should more naturally be part of the
detail sections as you scroll to the bottom … rethink the frontend ui
structure." The 40px bottom spacer alone wasn't enough — the bar still sat
full-bleed and flush against the last section when docked.

## What

Moved the decision bar from a sibling of the content column to the **last child
of the content column itself**, so it inherits:
- the **880px document measure** (centered on the same column as the sections —
  was full-bleed chrome), and
- the **section rhythm** — a ~24px gap now sits above it when docked, so it
  reads as the closing region in the flow, not a bar jammed to the edge.

`mt-auto` (with the content column now `flex-1`) still pins it to the bottom on
short alerts; `sticky bottom-0` still floats it over the document then docks it
at the end; `decisionDocked` still drops the float shadow once docked. The 40px
bottom spacer remains, so the docked bar settles with space beneath it.

## Verified

DOM at scroll-end: bar width 880, centered; 24px gap above the last section;
40px below; no float shadow (docked). Per-file vp check clean.

Note: a whole-project `tsgo` currently fails on `rule-detail-drawer.tsx` — that
is the parallel session's uncommitted WIP (its own `flat` prop half-removed),
not this change. The alert-detail file is type-clean.
