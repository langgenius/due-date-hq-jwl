# Deadline detail — Status-tab polish (2026-06-10)

Continuing the Qn4nX feedback batch. All edits at the drawer level (no
`panels.tsx` churn).

## #5 — stepper unboxed (反色 / no white bg / no border)

The milestone stepper (`PathToFilingSummary`) was sharing one white bordered box
with the active-stage card in page mode. Removed that box: the stepper now reads
directly on the gray content wash (page-mode wrapper `flex flex-col gap-4`, no
bg/border/padding).

## #6 — active-stage card bolder (更加大胆一点)

Wrapped just `ActiveStageDetailCard` in its own white card
(`rounded-[12px] border border-divider-regular bg-background-default p-5`) so the
current actionable stage stands out against the gray (border-driven prominence,
no shadow per the restrained-shadows rule). The stepper stays bare (#5).

## #7 / #8 — Recent activity rows

- #7: rows thinner — `py-3.5` → `py-2.5`, `gap-3` → `gap-2.5`.
- #8: smaller avatar — `AssigneeAvatar size="sm"` (28px) → `size="xs"` (20px).

## Verified

`tsgo --noEmit` clean. Live: stepper bare on gray, active card boxed + prominent,
activity rows tighter with small avatars.

## Still open (same batch)

#4 content↔stepper horizontal padding align · #10 rail status icon (expand label
when active) · #12 sticky footer more prominent · comment-cruft trim (app-wide).
