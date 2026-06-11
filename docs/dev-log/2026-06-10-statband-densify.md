# StatBand → information-dense

**Date:** 2026-06-10

Feedback (Yuqi, /clients KPI strip): "occupied too much space. be information
dense and clean."

Tightened the shared `StatBand` (`components/patterns/stat-band.tsx`):

- band padding `py-7` → `py-4`, mobile `gap-y-6` → `gap-y-4`
- column stack `gap-2` → `gap-1`
- value `text-[32px]` → `text-[26px]`
- loading skeleton `h-[132px]` → `h-[100px]` (matches the new measured height)

Net: ~132px → ~100px, same info, cleaner. `StatBand` is the one shared "card
summary" band across 5 surfaces (clients list + detail, sources, rule library,
alert history), so they all densify consistently. Verified live on /clients
(band 100px, 26px numbers, hierarchy intact).
