# Clients list — selected-row left accent stroke (handoff Surface 3)

**Date:** 2026-06-10
**Design source:** `docs/dev-log/2026-06-10-design-handoff-index.md` Surface 3 (line ~95):
the selected-row pattern is `fill state-accent-hover + 2px left accent stroke`,
matching the rules table (`Z0Q8Yk`) and the alert AffectedClients selected rows.

## Gap

`ClientFactsWorkspace.tsx` had the accent-hover **fill** (`[&_tr]:hover:!bg-state-accent-hover`)
but was **missing the 2px left accent stroke**, so the clients table didn't match
the canonical selected-row treatment used elsewhere.

## Change

Added `hover:shadow-[inset_2px_0_0_var(--color-state-accent-solid)]` (and the same
on `focus-visible`) to the table row. Used the **inset shadow** rather than a
`border-l-2` so it adds the accent bar without shifting layout — identical to the
verified rules-table accent-bar treatment (`jurisdiction-rule-table.tsx`).

`tsgo` clean. Visual confirmation pending — the dev backend Worker is currently
down (ECONNREFUSED on all /rpc), so the app renders blank; the CSS is the same
inset-shadow already verified on the rules table, so risk is nil.
