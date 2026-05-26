# Seventy-eighth pass — /deadlines table + pagination as one bordered card

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Restructure the /deadlines table so the Table primitive and
the sticky pagination footer share a single rounded-bordered frame —
addresses Yuqi's "sticky pagination should be a relative part of the
table" feedback and the "I want border radius" follow-up.

## What was wrong

The Table and the sticky pagination strip were JSX siblings in the
scroll column:

```
<div ref={queueScrollRef}>
  …filter bars…
  <Table className="overflow-hidden rounded-md ...">…</Table>
  <div className="sticky bottom-[60px] ... bg-background-default">
    …pagination…
  </div>
</div>
```

That structure had two cosmetic problems:

1. **Pagination had no border-radius** — the table read as a
   rounded card on top of a square pagination strip. They didn't
   visually attach.
2. **They read as two separate elements** — the table card ended
   abruptly, then a pagination chip floated below. Yuqi wanted the
   pagination to be "a relative part of the table" — one continuous
   frame.

## What landed

Wrapped the Table + the sticky pagination in a single bordered
card. The wrapper now owns `rounded-md border border-divider-subtle
overflow-hidden`, so both children inherit the rounded corners via
the wrapper's clip:

```diff
- <Table className="overflow-hidden rounded-md ...">…</Table>
- <div className="sticky bottom-[60px] z-10 mt-auto ... bg-background-default">
-   …pagination…
- </div>

+ <div className="mt-auto flex flex-col overflow-hidden rounded-md border border-divider-subtle">
+   <Table className="rounded-none border-0 ...">…</Table>
+   <div className="sticky bottom-[60px] z-10 flex items-center justify-between border-t border-divider-subtle bg-background-default px-2 py-2">
+     …pagination…
+   </div>
+ </div>
```

Three concrete deltas:

- **`Table`** dropped its own `rounded-md overflow-hidden` (the
  wrapper now provides both). Added explicit `rounded-none
border-0` so the primitive's defaults don't fight the wrapper.
- **Pagination strip** moved INSIDE the wrapper, INSIDE the success
  branch of the loading/error/success ternary. Picked up `border-t
border-divider-subtle` so when the user scrolls to the end of the
  table the strip reads as a deliberate footer row above the last
  data row, not flush against it. Dropped its own `mt-auto`.
- **Wrapper** picks up `mt-auto flex flex-col` so the whole card
  pins to the bottom of the scroll column when the queue has fewer
  rows than the available viewport height.

## Why sticky positioning still works

`overflow-hidden` on the wrapper does NOT establish a new scroll
context — `position: sticky` looks past it to the nearest
scrollable ancestor (the outer `queueScrollRef` div with
`xl:overflow-y-auto`). So the pagination still pins at
`bottom-[60px]` of the page scroll, NOT relative to the wrapper.
The wrapper grows with its content (table + pagination), so the
sticky child never gets clipped by the wrapper's bounds.

This was the riskiest part of the change; verified the sticky
behavior by reading the spec carefully + cross-checking that the
wrapper is just a clip-and-frame, not a scroller.

## Side effect — pagination during loading / error states

Previously the pagination div was OUTSIDE the loading/error/success
ternary, so it rendered on loading + error states too (showing
"0 deadlines" with no rows). Now it lives INSIDE the success branch
only. Loading + error states no longer render a phantom pagination
strip — which is the correct behavior anyway (there's nothing to
paginate when there's no data).

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).

## Result

The /deadlines table now reads as a single rounded-bordered card:
TableHeader (dimmed bg) at the rounded top, data rows in the
middle, sticky pagination at the rounded bottom with a hairline
separator above. When scrolling, the pagination still pins at
viewport-bottom-60px and floats above the rows that would otherwise
scroll past; when the user reaches the actual end of the data, the
pagination sits flush at the card's bottom edge.
