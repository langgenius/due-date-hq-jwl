# 2026-06-12 — Alert detail becomes a real document; list dates readable

Yuqi: "the alert detail looks so plain and no hierarchy, just floating around…
hate frames in frames in just lines — hard to distinguish sections, no way to
digest" + "the date on the list is toooo hard to read" + "ensure the page does
not look flat / no focus area."

The pendulum had swung from gray-soup to LINE-soup: outlined cards with
hairline headers + rule callouts = frames in frames. The fix is the document
model:

## Detail panel — flat document

- `DetailSectionCard` gains `variant="flat"`: no outline, no band, no header
  rule — a section is a region led by a 16/600 header. The alert drawer uses
  flat for all four sections; the deadline detail keeps `card`.
- Inter-section rhythm 16px → **40px** (gap-10): proximity does the grouping
  that boxes used to fake. Inside a section the gap stays 16px — the 2.5×
  whitespace step is the section boundary.
- **The 52px "Awaiting your decision" band is gone** — steady-state status is
  now a chip in the hero meta row (amber dot + text + "due in N days"),
  removing a whole horizontal stripe and anchoring status where the eye
  starts. Error/applied banners stay (they carry Retry/Undo actions).
- **Focal fact = the biggest type after the title:** action-deadline date and
  the deadline-shift NEW date go stat-tier 24px mono (rendered 28px). The
  panel's hierarchy now reads: 22px title → 28px mono date+countdown → 16px
  section headers → 14px body.
- The deadline callout loses its internal hairline (spacing separates the
  date from the evidence checklist). Only semantic tables (affected clients)
  keep frames.

## List — readable day dates

The de-gray pass left day labels as 12px caps-tertiary whispers. The date is
the band's payload: now **"May 20, 2026" 13/600 text-primary** sentence-case
with the weekday quiet beside it ("Today"/"Yesterday" keep the strong slot
with the date demoted to support). Each day group gets a visible head — the
list's rhythm anchors.

## Verify

tsgo clean. Instance 5189: band date 13/600 rgb(16,24,40); banner band gone;
hero chip renders; facts section border 0px; section headers 16/600; section
gap 40px; focal mono date 28px.
