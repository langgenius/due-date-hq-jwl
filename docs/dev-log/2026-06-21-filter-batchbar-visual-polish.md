# Visual polish: filter option count-pills + batch-bar status icon

_2026-06-21 · "polish the VISUAL/UI for things that already exist; add design
details" — audited existing components against the references, applied deltas_

Ran a parallel read-only audit of four component families (filter popover, bulk
bar, tables, dashboard) against the reference designs. Most were already on-spec —
the checkbox indeterminate (purple square + minus), status pills, jurisdiction
neutrality (§4.10), row dividers, and zebra striping all already match. Applied the
genuine, canon-safe visual deltas:

## Filter popover (`ObligationFiltersPopover`)
- **Option count → rounded grey pill, right-aligned.** Was bare `text-caption-xs`
  text sitting next to the label; now `ml-auto … rounded-full bg-background-section
  px-1.5 py-0.5`, so each row reads "label ········ N" in a capsule like the
  reference facet submenus.
- **Rows get `rounded-lg`** so the hover + selected wash read as a soft inset pill
  (ref: rounded-lg row hover), not a full-bleed band.

## Bulk action bar
- **"Set status" icon `CircleIcon` → `CircleDotIcon`** — the generic empty ring was
  a placeholder; a dot-in-circle reads as "choose a state," and avoids colliding
  with the StatusRing "not started" empty-ring glyph used elsewhere.

## Audited but deliberately NOT changed (already correct / canon)
- Checkbox indeterminate + checked (already the filled accent square + minus/check).
- Status rendered as filled tinted pills (our canon — not the ref's text-only, which
  would be a system-wide regression of the SeverityChip/status-badge family).
- Jurisdiction/form chips stay neutral (§4.10).
- Brief-card drop shadow — REFUSED: conflicts with the restrained-shadows canon
  (border + bg contrast carries the lift, not an outer shadow).
- Header StatBand on the deadlines table — real gap but a bigger add; deferred.

## Verification
tsgo 0 · build green · no new i18n strings. (Filter count-pill + rounded-row are
class-only; the harness can't reliably drive the cascading facet submenu, so
verified by tsgo/build rather than a synthetic click.)
