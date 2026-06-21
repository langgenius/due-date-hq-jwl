# Sidebar footer declutter — fix the "messy and squashed" bottom zone

**Date:** 2026-06-21
**Surface:** `components/patterns/app-shell-nav.tsx` (`SidebarSystemStatus`,
`NavGroupSection`)

The bottom of the rail (system-status line · hairline · Audit log · Settings ·
user chip) read as cramped and disordered. Three faults, one cause each:

1. **Status truncated mid-word.** `Monitoring 52 jurisdictions · swept May 1`
   overflowed the ~190px label slot at `text-sm` and cut off as
   "Monitoring 52 jurisdiction…". Now scope-only at `text-xs`
   (`Monitoring 52 jurisdictions`, verified scrollWidth == clientWidth, no
   clip). The "swept …" freshness moved into the existing hover tooltip — it
   was always there, so nothing is lost, just demoted.

2. **Inverted hierarchy.** The *passive* status line was the brightest element
   in the zone, sitting above the *actionable* Audit/Settings rows, which were
   washed out by a blanket `opacity-60` on the group content (muddied the
   already-tertiary icons into near-illegibility). Dropped the opacity wash —
   the utility rows are crisp now — and moved the status caption to the FOOT of
   the group, just above the user chip. It's demoted by **position** (paired
   with identity as a quiet "what we're watching" line), not by dimming.

3. **Seam wedged mid-stack.** The gradient hairline sat *between* the status
   line and the nav rows. Moved it to the TOP of the muted group so a single
   seam caps the whole footer zone. The footer now reads top-to-bottom as one
   tidy stack: seam → Audit log → Settings → status caption → user chip.

`NavGroupSection`'s `topSlot` prop renamed → `footerSlot` (it renders at the
foot now, not the top); both call sites (navV2 + legacy) updated. The
`SidebarFooter` "one line not two" invariant still holds (user chip drops its
own divider; the muted group owns the single hairline).

Collapsed rail: Audit/Settings icons are now full-tone like the rest of the
nav (no opacity wash), and the green status dot sits just above the avatar.
