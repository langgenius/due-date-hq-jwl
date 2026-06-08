# /today — failed brief banner, quieter sparkles, static dot

Date: 2026-06-08

More Yuqi page-feedback.

## Daily Brief — thin failed banner (`daily-brief-card.tsx`)

"In one line, thin banner if it failed" + "Failed and retry together, not
separate". A failed brief now early-returns a **single thin banner**
(title · FAILED · short message · inline retry · close) at `py-2.5` instead of
the full card with body prose. Failed label and the retry sit in separate
clusters with clear spacing.

## Actions header sparkles (`actions-list.tsx`)

"colour?" — the `SparklesIcon` info trigger was accent-blue, competing with the
real accent cues. Stepped to `text-text-tertiary` (hover `text-secondary`) so it
reads as a quiet seal, not a second accent.

## Status dot — no pulse (`alerts/components/PulsingDot.tsx`)

"remove pulsing motion" — dropped the `animate-ping` expanding ring (and the now
unused `RING_BY_TONE` + `showRing`). With the earlier halo removal, the dot is a
flat status color. Doc comment updated.

## Deferred (contended file)

The alert-card "ugly CA jurisdiction label" tweak (drop the boxy frame, keep the
seal + code clean) is applied on disk in `needs-attention-card.tsx` but not
committed here — that file is owned by a concurrent rewrite in another session.

## Verify

tsgo clean; `/today` renders the thin failed banner; page fully functional. (A
transient `showRing` HMR error appeared mid-edit from Vite's stale transform; the
disk is clean and the page renders correctly after re-transform.)
