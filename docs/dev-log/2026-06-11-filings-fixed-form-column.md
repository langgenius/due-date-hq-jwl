# Client detail — fixed-width form column (critique #3)

**Date:** 2026-06-11

The Filings-table form names didn't align — the form-code badge was `shrink-0`
(natural width), so a short code (`NY CT-3`) and a long one (`Form 1099-NEC`)
pushed the form name to different x positions. Gave the badge button a fixed
`w-[104px]` slot so the names align into a column. Verified live (restarted
dev server — names now line up across all rows).
