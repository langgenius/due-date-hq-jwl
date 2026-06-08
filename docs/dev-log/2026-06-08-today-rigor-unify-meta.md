# /today — rigor + unification pass (Yuqi "更简略和统一, 再 rigorous 一点")

Date: 2026-06-08

The alert card's top meta row carried three different badge treatments that, side
by side, read as ad-hoc — the opposite of rigorous:

| element        | before                                   |
|----------------|------------------------------------------|
| jurisdiction   | `rounded-md` `px-2 py-[2px]` mono 11/600, border-**regular** |
| form (TaxCode) | `rounded-[5px]` `px-3 py-1` mono **12**/medium, gray fill |
| change-kind    | plain mono 10/600                        |

Pencil `VxRyF` actually defines the jurisdiction and form badges as the **same**
pill (radius 6, padding [2,8], mono 11/600, hairline) — the form only adds a gray
fill. Unified to that:

- **Jurisdiction pill** border `divider-regular` → `divider-subtle` (the design's
  `#10182814` hairline).
- **Form badge**: override the shared `TaxCodeBadge` chrome to match exactly —
  `rounded-md px-2 py-[2px] text-[11px] font-semibold` (was 12/medium, radius 5,
  px-3). Keeps its gray fill; keeps the shared component (cohesion) while reading
  as one system with the jurisdiction pill. Verified in preview: both render at
  11px/600.
- Change-kind stays a plain 10px mono label (neutral, per the two-color rule).

## Surface radius unified

The three page surfaces were `16 / 14 / 14`. Unified to **14** across the board —
Daily Brief `rounded-2xl (16)` → `rounded-[14px]`, matching the alert cards and
Actions table (Pencil card/table radius). One radius, one border tone
(`divider-subtle`), one rhythm.

## Verify

- tsgo 0; `vp check` 0 errors; dashboard tests 10/10 (+1 skip); meta-badge sizes
  confirmed equal (11px/600) via computed styles in preview.
