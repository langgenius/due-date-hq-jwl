---
title: 'Deadlines — readable detail URLs'
date: 2026-05-25
---

# Deadlines — readable detail URLs

## Context

The obligation detail URL had drifted into implementation state:

`/deadlines?row=<uuid>&drawer=obligation&id=<uuid>&tab=readiness`

That was hard to read, repeated the same UUID, and exposed more route mechanics than a CPA needs to see or share.

## Change

- Added canonical detail URLs in the form `/deadlines/<short-ref>`.
- Non-default detail tabs use `/deadlines/<short-ref>/<tab>`; the default Readiness tab omits the tab segment.
- Kept legacy `drawer/id/row/tab` query links compatible so old saved links continue to open.
- Updated row click, keyboard open, dashboard/picker navigation, Pulse affected-client links, and copy-link actions to emit the short URL.
- Added URL helper coverage for short-ref generation, legacy query cleanup, tab validation, and ambiguous-ref handling.

The short reference is for readability and to avoid putting the full internal UUID in the browser URL. Authorization still belongs to the scoped API calls.
