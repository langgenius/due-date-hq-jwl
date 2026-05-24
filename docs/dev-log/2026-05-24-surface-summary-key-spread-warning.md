# 2026-05-24 — Surface summary React key spread warning

Fixed the React development warning on Rule Library / shared surface summary
strips where a `SurfaceSummaryItem` object containing `key` was spread into
`<SurfaceSummaryNumber />`.

Implementation:

- `SurfaceSummaryStrip` now destructures `key` in the `.map()` callback and
  passes it only to the wrapper JSX element.
- `SurfaceSummaryNumber` now accepts `Omit<SurfaceSummaryItem, 'key'>`, keeping
  the private child component from accidentally accepting React's special prop.
- Added a focused regression test that spies on `console.error` and verifies the
  React key-spread warning is not emitted.

Design alignment:

- No visual, copy, or route contract changed. `DESIGN.md` and the unified table
  surface vocabulary docs remain aligned.
