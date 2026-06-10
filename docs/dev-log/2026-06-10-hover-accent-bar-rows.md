# Hover accent bar on all interactive table rows

**Date:** 2026-06-10

Yuqi loved the clients-list row hover (accent tint + a 2px inset left accent bar)
and asked to apply it to every hovered row in the app.

Baked it into the shared `TableRow` primitive
(`packages/ui/src/components/ui/table.tsx`) so every table that uses it gets the
treatment — gated to **interactive** rows via the established `cursor-pointer`
convention (callsites add it when the row has an onClick). Display-only tables
(no cursor-pointer) keep the neutral `hover:bg-state-base-hover` so they don't
falsely signal clickability. Selected rows (`data-[state=selected]`) carry the
same bar so hover→select reads as one motif.

Implementation note: gated in JS (`className?.includes('cursor-pointer')`) using
the *plain* proven `hover:bg-state-accent-hover hover:shadow-[inset_2px_0_0_var(
--color-state-accent-solid)]` classes — a CSS arbitrary variant on
`&.cursor-pointer:hover` did not compile reliably.

Verified live: `/rules/library?jurisdiction=AL` — all 10 interactive rule rows
now carry the accent-bar class (the table doesn't add it itself); `/members` &
`/reminders` (display tables) correctly keep the neutral hover. tsgo clean.

Covers all PRIMITIVE-based interactive tables. Bespoke clickable-row lists that
don't use the primitive (DeadlineRow, AlertListRail) still need the same
treatment applied directly — follow-up.
