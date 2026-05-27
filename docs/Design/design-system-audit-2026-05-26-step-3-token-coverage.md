# Design-system token-coverage audit — 2026-05-26 (Step 3)

> Companion to the 86th-pass drift audit. The 86th pass closed
> ~110 sites of visual drift (color tokens, font-mono carve-outs,
> gap-scale, date-display canonical, table-card chrome). This audit
> covers the dimensions that pass didn't: **radius, shadow, icon
> sizing, padding, text-size, font-weight, height, arbitrary-value
> escape hatches.**
>
> Scope: every `.ts` / `.tsx` file under `apps/app/src/`.

## Summary

| Dimension                      |                                  Drift found | Fixed inline this commit |                            Documented as intentional |
| ------------------------------ | -------------------------------------------: | -----------------------: | ---------------------------------------------------: |
| Radius (`rounded-*`)           | 3 inline `shadow-[...]` + 0 forbidden values |                        3 | 6 (inset-shadow trick + brand glow + commented refs) |
| Shadow scale                   |                 3 hand-rolled custom shadows |                        3 |                                                    4 |
| Icon sizing                    |                                        **0** |                        0 |                                                    — |
| Semantic color tokens          |                                        **0** |                        0 |                                                    — |
| Padding / margin scale         |                             **0** real drift |                        0 |                 `p-3.5` (1 mention, in comment only) |
| Text-size scale                |                     6 sites of `text-[12px]` |                        6 |            `text-md` (28 uses) — distinct 14px token |
| Font-weight scale              |                                            0 |                        0 |   `font-bold` (4 uses) — stat numbers + brand ribbon |
| Fixed height (`h-N`)           |                                            0 |                        0 |                   `h-11` (3 uses) — 44px tap targets |
| Arbitrary-value escape hatches |                                    6 (above) |                        6 |               ~270 (column widths, eyebrow tracking) |

**Net commit impact**: 6 mechanical class-name swaps + 1 documentation doc.

## What was already clean (verified)

### Icon sizing (`size-N`)

Per `docs/Design/icon-sizing.md`:

| Token      | Use                                                            | Count |
| ---------- | -------------------------------------------------------------- | ----: |
| `size-3`   | Inside `<Badge>` (forced via `!important`); tiny inline glyphs |   168 |
| `size-3.5` | Inline-with-body-text (text-sm / text-base context)            |   107 |
| `size-4`   | Inside `<Button>` default; section-header glyphs               |   152 |
| `size-5`   | Decorative / standalone                                        |    30 |
| `size-6`   | Empty-state heroes                                             |    23 |
| `size-7`   | Larger heroes                                                  |    25 |
| `size-8`   | Avatar circles                                                 |    28 |

Outliers verified intentional:

- `size-9` (2 uses) — both are `grid place-items-center rounded-md` container squares (wizard step number, practice icon), not icons.
- `size-10` (4 uses) — same pattern (sidebar firm avatar, billing checkout icon, permission-gate hero).
- `size-2` (8 uses) — all bare colored dots (`rounded-full bg-state-*-solid`), the permitted "decorative dot" pattern per icon-sizing.md.

### Semantic color tokens

- Hex colors in className strings (e.g., `bg-[#FF0000]`): **0**
- Raw Tailwind palette colors (e.g., `bg-red-500`, `text-blue-600`): **0**
- All color usage flows through semantic token families:
  `text-text-*` · `bg-background-*` · `border-divider-*` · `bg-state-*-*`
  · `bg-components-badge-*` etc.

### Padding scale

Codebase uses `p-0/0.5/1/1.5/2/2.5/3/4/5/6/8/10/12` — every value is on
the 2px-multiple scale. The single `p-3.5` reference is inside a comment
("`p-3.5` → `p-3`") describing a past iteration, not actual className.

### Font-weight scale

`font-medium` (338) and `font-semibold` (149) are the dominant weights.
`font-normal` (19) for body text. The four `font-bold` usages are
verified intentional:

1. `members-page.tsx:632` — member count stat (`text-2xl tabular-nums`)
2. `members-page.tsx:654` — invitation count stat (same shape)
3. `generation-preview-tab.tsx:1164` — preview row count stat
4. `billing.tsx:808` — rotated brand-ribbon badge ("MOST POPULAR")

Stat-number heaviness and a brand ribbon are exactly where `font-bold`
beats `font-semibold`. Not drift.

### Fixed-height (`h-N`)

`h-14` (28) / `h-12` (23) / `h-8` (43) / `h-7` (30) form the row-height
canonical (workbench tables use `h-14`, drawer rows use `h-12`, chips
use `h-7` or `h-8`). The three `h-11` (44px) usages are verified
intentional:

- `obligations.tsx:5987` — deadline scope tab strip
- `billing.tsx:600` — plan tier segmented control
- (one comment ref)

44px is the iOS Human Interface Guidelines minimum tap target. These
are deliberate accessibility-driven heights for primary navigation
controls.

### Radius / Shadow

Already covered by the prior commit (DESIGN.md v2.1 reconciliation +
3 shadow-token fixes). Zero remaining drift.

## What was fixed this commit

### 6× `text-[12px]` → `text-sm`

In this app's overridden scale, `text-sm = 12px` (Tailwind default
14px is overridden in `primitives.css`). So `text-[12px]` is exactly
equivalent to `text-sm` and the arbitrary-value form bypasses the
token. Mechanical sweep, zero visual change.

Sites:

- `apps/app/src/features/auth/email-otp-sign-in-form.tsx:119, 126`
- `apps/app/src/features/onboarding/state-rule-activation-selector.tsx:109, 192`
- `apps/app/src/routes/login.tsx:224`
- `apps/app/src/routes/onboarding.tsx:154, 159, 192`

## Judgment-call drift (deferred)

### 6× `text-[13px]` — no token at this size

Six call sites use `text-[13px]` consistently for "body description
text smaller than text-md (14px) but larger than text-sm (12px)":

- `email-otp-sign-in-form.tsx:123` — the email address echo line
- `generation-preview-tab.tsx:1180` — rule row title
- `empty-state.tsx:48` — empty-state description
- `page-header.tsx:110` — page-header description
- `login.tsx:150` — login form description
- `_entry-layout.tsx:54` — entry-layout footer link

This is a **consistent-but-undocumented pattern**. Options:

1. **Add a `--text-body-secondary: 13px` token** in `primitives.css`
   and sweep these to `text-body-secondary` (or similar name).
2. **Snap to `text-md` (14px)** — slight bump but lands on existing
   token; risk: descriptions get visually heavier.
3. **Snap to `text-sm` (12px)** — slight reduction; risk: descriptions
   feel cramped against their text-sm/text-md siblings.

Deferred — needs a design call on which way to go. Holding the 13px
form preserves intent until the call is made.

### Larger inline custom shadows (intentional non-elevation uses)

- `apps/app/src/features/billing/upgrade-cta-button.tsx:37` —
  multi-layer brand-amber glow on hover. Specific `rgb(247_144_9_/_*)`
  values; not a token (and shouldn't be — it's a marketing CTA effect).
- `apps/app/src/routes/rules.library.tsx:2502, 2653, 3086` — three
  uses of `shadow-[inset_2px_0_0_var(--color-state-accent-solid)]`.
  These are **inset shadows used as zero-layout left-edge accent
  borders** — replacing with `border-l-2` would shift adjacent
  content by 2px. Trick, not drift.

### Other arbitrary values (verified intentional or scoped to context)

- `w-[...]` (188 uses) — overwhelmingly column min/max widths in
  `<TableHead>` (e.g., `w-[120px]`, `w-[90px]`). These are layout-
  driven sizing that doesn't map to a token by design.
- `tracking-[0.04em]`, `tracking-[0.06em]`, `tracking-[0.08em]` (52
  uses) — eyebrow / uppercase-kicker letter-spacing canonical. Could
  in theory become tokens but the values are explicit in DESIGN.md
  §3.3 and consistent across the app.
- `text-[10px]`, `text-[9px]` — tiny-chip text inside `size-5` /
  `size-3.5` circles for count badges. No Tailwind token at 9/10px.
- `text-[18px]` `text-[24px]` — Step 3 wizard stats, brand-ribbon
  text. Not heavy enough to standardize.

## Recommendations for follow-up

The visual / token layer is in excellent shape after this pass.
Suggested next focuses:

1. **Decide the `text-[13px]` question** — small commit, big clarity
   win on the description-text taxonomy.
2. **Step 6 (UX flow audit)** — interaction parity is the place
   where real audit value lives now. Examples to check:
   - Does Esc close every modal / drawer / popover?
   - Does Search behave identically on /clients, /deadlines,
     /rules/library?
   - Do all primary CTAs use the same button variant + size +
     position per surface family?
   - Do all dropdowns + popovers position consistently
     (align="start" vs align="end")?
3. **Companion-doc spot-check** — verify each of the 9 companion
   docs in DESIGN.md still reflects code reality (the §2.5
   reconciliation revealed at least one doc was out of date; others
   may be too).

## Verification

```
pnpm exec tsc -p apps/app/tsconfig.json --noEmit  → clean
pnpm exec vp lint apps/app                        → 0 warnings, 0 errors
```

## Files

- `apps/app/src/features/auth/email-otp-sign-in-form.tsx`
- `apps/app/src/features/onboarding/state-rule-activation-selector.tsx`
- `apps/app/src/routes/login.tsx`
- `apps/app/src/routes/onboarding.tsx`
- `docs/Design/design-system-audit-2026-05-26-step-3-token-coverage.md` (this file)
