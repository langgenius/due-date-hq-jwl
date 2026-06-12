# Button size → context scale (audit + fixes)

Date: 2026-06-11

Yuqi: "is all the button size unified? there should be sizes tho — login uses
large, dashboard medium, rows small. audit thoroughly."

Audited ~458 `<Button>` instances by context. Sizes DO vary by context (good),
but it was **ad hoc at the edges**. Tally: `sm` 337, implicit-`default` ~92,
`xs` 46, `lg` 13.

## Findings → fixes

1. **Auth CTAs were off-scale.** login / accept-invite / onboarding full-width
   CTAs used hand-rolled `className="h-11"` AND `className="h-12"` (44/48px, no
   rule which) instead of any size variant. → Migrated all 11 to **`size="lg"`**
   (h-10/40px), on-scale, single height. (Per Yuqi: use existing `lg`, not a new
   `xl`.)
2. **Modal footers were split.** CreateClientDialog / CreateObligationDialog used
   implicit `default` (h-9); AnnualRolloverDialog + OnboardingSkipModal +
   AlertDialog footers (Wizard, WizardShell ×2, ImportHistoryDrawer) used `sm`
   (h-8). → Standardized ALL modal footers (Dialog + AlertDialog) to **`default`**
   by dropping `size="sm"`. (13 buttons.) The AnnualRollover `DialogTrigger`
   (toolbar button) correctly stays `sm` — it's a trigger, not a footer.
3. **No documented rule.** §4.8 listed the sizes but never said _when_ to use
   each. → Added the **size → context** table to DESIGN §4.8 (the enforceable
   rule): `lg` = auth/entry + empty-state hero; `default` = page-header actions +
   all modal footers; `sm` = toolbars / rows / inline; `xs` = dense. Same context
   uses ONE size; never hand-roll heights.

Contexts already consistent (no change): toolbars/rows = `sm`, empty-state heroes
= `lg`, page-header actions = `default`.

## Verify

tsgo 0 errors (aggregate); `vp check` clean on all touched files. login has 5
`size="lg"`, 0 `h-11`/`h-12` on Buttons across the 3 auth routes; 0 `size="sm"`
on AlertDialog footer buttons app-wide.
