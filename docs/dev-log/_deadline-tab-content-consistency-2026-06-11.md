# Deadline detail — tab-content unification onto DetailSectionCard (2026-06-11)

Yuqi: the Materials tab was "so ugly… each tab's content design should be
consistent." The four tabs (Status · Materials · Record · Audit) used three
different design languages. All four now share the Status tab's card system —
`DetailSectionCard` (gray band title, white body) with **one title per card**
(section-header-style.md §Register C: band title is the only title, secondary
meta/actions in `headerRight`).

## Per-tab before → after

- **Materials**: free-floating green readiness headline + progress + bare-h3
  "Materials checklist" stack → ONE card "Materials checklist" (headerRight =
  reference badge + Select-all + Add-item) whose body leads with the readiness
  summary demoted to a compact status line, then progress + legend, then the
  Outstanding/Received/Waived sections + send CTA. "Client request" (status
  badge → headerRight; inner gray box flattened — no frame-in-frame) and
  "Request history" become cards too. The Tax-year `<details>` stays a quiet
  collapsed settings footer (deliberate).
- **Record**: "Evidence to close out filing" section → card (complete/total
  fraction in headerRight); "Workpapers" h3 row → card (count + Add-workpaper
  stub in headerRight). AuthorityFactStrip + the Authority-citation `<details>`
  stay as the quiet reference footer (same pattern as Materials' tax-year
  footer; wrapping the strip would have been frame-in-frame).
- **Audit**: bare ObligationTimeline on the wash → "Audit trail" card (event
  count in headerRight), shared empty-state inside.

## Tab indicators — one vocabulary

Was a mix: Materials = accent count OR green ✓; Record = always-on count incl.
"0"; Audit = nothing. Now: **count pills only, shown only when non-zero**
(Materials keeps the accent tint as the "action needed" tone; Record/Audit
gray). The ✓ glyph and the odd "Record 0" are gone.

## Verified

tsgo 0 errors; obligations vitest 89/89. Live DOM check on
/deadlines/000000000003: Materials → "Materials checklist" band (#f9fafb);
Record → "Evidence to close out filing" + "Workpapers" bands; Audit → "Audit
trail" band; tab strip reads Status · Materials(14) · Record · Audit(3).
Note: cards render in panel/sheet modes too (DetailSectionCard is already the
shared vocabulary there — e.g. Recent activity); no mode forking added.
