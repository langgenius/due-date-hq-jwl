# 2026-05-28 · Rule Library Form summary count

Updated the jurisdiction summary row in Rule Library so the `Form` column shows the unique rule
count for the jurisdiction instead of the summed entity-applicability slots.

Example: a state with 10 rules now shows `10` on the summary row even if those rules apply across
32 entity columns. Expanded rule rows still use the same column for the concrete form/rule name.

DESIGN.md remains aligned; this is a data-semantics correction inside the existing table layout.
