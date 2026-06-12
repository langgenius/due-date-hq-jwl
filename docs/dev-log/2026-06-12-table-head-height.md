# 2026-06-12 — App-wide: shorter table header band

Yuqi: "all of the table heads should be the same, shorter height — like the
Alerts list."

`packages/ui/src/components/ui/table.tsx` — `TableHead` padding `py-3` → `py-2`
(header cell ~40px → ~35px) so the column-label row reads as a compact rule over
the data instead of a tall band competing with it. Body cells keep `py-4`.
One change, every table follows (/today Priorities, /deadlines, /clients,
/rules, alert history).

Verify: tsgo clean; /today Priorities header cell measured 35px (py 8px).
