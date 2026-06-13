# 2026-06-12 — Alert detail: scroll-spy section nav + red triage + tab-landing

Second half of the /alerts critique sweep (detail panel).

## Scroll-spy section nav (Yuqi: "tabs like the Deadline Detail panel, but the

## content is a long scroll — scrolling indicates which tab you're on")

Scroll-spy ANCHORS, not real tabs: the alert detail is one decide-flow document
(facts + clients + source must stay visible together), so true tabs would hide
evidence mid-decision. The spy nav gives the deadline-tabs orientation while
behaving as a table of contents:

- Sticky nav under the hero — `Change · Clients · Source · Activity` — text +
  accent underline, deliberately LIGHTER than the deadline pill tabs so it
  doesn't promise tab-switching behavior. Items adapt (Clients only when the
  group renders).
- Spy runs in the body's existing onScroll: active = last group card whose top
  crossed the 64px line; bottom clamp activates the last section when the
  container is scrolled out (short documents never cross the line otherwise).
- Click → smooth scrollIntoView; `scroll-mt-16` on the group cards lands them
  under the pinned nav. `DetailSectionCard` gained an `id` pass-through.

## Red triage (Yuqi: "too messy — ensure the user can focus")

First viewport previously fired six colored signals. Now:

- "Awaiting your decision" banner → new `pending` tone on DetailStatusBanner
  (quiet gray band, secondary text). Open work isn't an alarm.
- ACTION DEADLINE eyebrow + icon → muted/tertiary like every section label.
- The ONE hot cue left is the deadline countdown ("28 days left", amber; red
  only once past).

## Tab-landing + rail scroll (verified live)

(Shipped in the prior commit; verified here end-to-end:) opening an alert syncs
the Review/Active toggle to the alert's queue, and the rail scrolls the
selection to the top on first paint.

## Verify

tsgo clean. Live (contended preview — the Today session shares the tab; stale
detached-node probes produced false negatives until handles were re-queried
fresh): banner bg rgb(242,244,247); spy nav sticky, items Change/Source/
Activity for a no-client alert; at container bottom the clamp activates
Activity; screenshot shows the pinned nav + gray banner + collapsed header.
