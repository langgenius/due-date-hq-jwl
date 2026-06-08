# /alerts rail — drop All/Unresolved toggle, search owns the bar

Date: 2026-06-09

Yuqi (D10/D11): every alert in the master rail is already unresolved, so the
All/Unresolved segmented was a near-no-op there (it stays on the main list page
where the distinction matters). Removed it from AlertListRail; the search now owns
the full filter bar (no expand/collapse dance needed). Dropped the `tab`/
`searchFocused` state, the `RailTab` type, and the `Segmented` import; `visible`
filters by search only.

## Verify
tsgo clean; rail head shows a single full-width "Search alerts" input, no toggle.
