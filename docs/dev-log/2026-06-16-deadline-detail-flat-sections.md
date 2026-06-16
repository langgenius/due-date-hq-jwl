# Deadline detail — flat tone-ranked sections (deadlines polish §11)

_2026-06-16_

The biggest 🔴 from the deadlines↔alerts audit: the deadline detail rendered
its sections in the **boxed** `DetailSectionCard` variant (gray-header
boxes-in-boxes), while the alert detail reads as a flat, tone-ranked document.
Migrated all 10 live sections in `ObligationQueueDetailDrawer.tsx` to
`variant="flat"` + `tone`, matching the alert detail and the
`detail_pane_surface_model` principle ("both detail panes are flat calm
documents").

## Sections → tone

| Tab            | Section                      | tone      |
| -------------- | ---------------------------- | --------- |
| Status         | Recent activity              | reference |
| Status         | Extension                    | action    |
| Status (panel) | Ownership                    | reference |
| Status (panel) | Linked from                  | reference |
| Materials      | Materials checklist          | action    |
| Materials      | Client request               | action    |
| Materials      | Request history              | reference |
| Evidence       | Evidence to close out filing | action    |
| Evidence       | Workpapers                   | reference |
| Audit          | Audit trail                  | reference |

`action` = the decision/work sections (18/600 primary header); `reference` =
look-up/history (14/600 secondary). Same ranking grammar as the alert detail.

## Padding nuance handled

`card → flat` drops the body's `px-5`, so the header now sits at the section
edge. The one **flush** section (Recent activity) had rows with their own
`px-5`, which would have left the header at the edge and the rows inset →
misaligned. Dropped the rows' `px-5` so they align to the flat header. The
non-flush sections go edge-to-edge cleanly; the Materials checklist's
interactive item rows keep their own framed chrome (tables-keep-their-frame,
matching alerts).

## Verified live (1512, deadline detail page)

- Status tab: Recent activity (flat, reference, row edge-aligned) + Extension
  (flat, action, fields edge-to-edge) — no boxes.
- Materials tab: Materials checklist flat (action) with its Select-all/Add-item
  headerRight; checklist items keep framed rows.
- tsgo + vp clean; obligations tests 6 files / 36 pass.

Stale "gray header band" comments updated to reflect the flat treatment.

Next in this arc: #12 not-found EmptyState, #25/#26 crumb (chevron→slash +
condensed-title-on-scroll). The obligations.tsx-bound batches (GroupBand list
adoption, Segmented scope) wait for the parallel session to commit its
obligations.tsx work; spec + critic fixes are ready.
