# Client detail — inline health pill (ibWOx)

**Date:** 2026-06-10

Pencil `ibWOx` puts a status pill inline with the client title (a green "● Healthy"
in the canvas). Restructured the PageHeader title slot from a stacked column to an
inline flex-wrap row, and added a derived health pill that reuses `Badge`:
- `needs_facts` (config gap) still wins → the "Add filing state" warning chip;
- else **At risk** (warning) when `workPlan.statutoryLateUnextendedCount > 0`;
- else **Healthy** (success) — both with a `bg-current` status dot.

Derived from the same real statutory-late signal the subtitle already shows; no new
field. tsgo clean; verified live (Meridian → "At risk"; clean clients → "Healthy").
