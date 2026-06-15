# Alert detail — design-critique spacing pass

_2026-06-15_

A polish pass on the alert-detail content (gap / padding / rhythm), from a
`/design-critique` review.

## What changed

- **Inter-section gap 40px → 32px** (`gap-10` → `gap-8`). 32px is the canonical
  major-section gap and the closest step to Pencil MASYz's ~30px content gap —
  the earlier gap-10 overshot it. Against the section-internal `gap-4` (16px) it
  holds a clean 2:1 between-vs-within ratio, so the flat (boxless) sections read
  as distinct without feeling sparse.
- **Removed the section bottom padding** (`pb-10` on the body wrapper → none).
  The docking decision footer (Stage 6) now closes the document; the 40px of
  trailing dead space below the last section is gone.

## Confirmed (no change needed)

- The condensed alert title still appears in the top bar on scroll
  (`heroScrolled` → breadcrumb "Alerts / <title>").
- Section hierarchy holds: action titles 18/600 primary, reference titles
  16/600 secondary, captions 14/tertiary, numbered badges, 11px uppercase grid
  labels → 14/600 values.

## Verified

DOM: sections gap 32px, wrapper padding-bottom 0. Live: bottom section + team
notes sit flush to the docked footer, no dead space. tsgo + vp check clean.
