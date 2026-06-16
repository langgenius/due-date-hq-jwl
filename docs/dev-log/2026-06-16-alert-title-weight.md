# Alert list title dialed back from 16/600 → 14/500 (Yuqi)

_2026-06-16_

Yuqi: "why the titles so big and bold". The /alerts row title (`PulseAlertRow`
`alert.title` <h3>) was `text-lg font-semibold` (16/600).

## Oscillation, resolved toward cohesion
A prior pass (2026-06-12, "flat hierarchies, nothing strong") had *bumped* the
title to 16/600 as "the one big ink jump per row." Now it reads too loud.
Dialed to **`text-base font-medium` (14/500)**: the headline still leads (it's
the largest text block on the row and heavier than the 12px meta) but no longer
shouts, and it now matches the deadline row weight for list-to-list cohesion.
The note in code records the lever for next time: if it reads flat, the dial is
weight (→ semibold), not size.

## Process note — the "I can't see your edits" trap
Yuqi reported not seeing committed/verified changes on localhost. Root cause: a
**stale HMR state** in their browser tab (removing a whole JSX branch — the #3
left time-rail — doesn't always Fast-Refresh cleanly). The code was correct on
disk and live on the server (verified: localhost:5173 rendered the new layout —
no 64px rail, time on the right). Fix on the human side is a hard reload
(Cmd+Shift+R). Also note there are TWO app dev servers running (5173 + 5177);
verify against the one the reviewer is actually viewing.
