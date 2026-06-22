# Marketing — site-wide design-system pass

**Date:** 2026-06-22
**Scope:** `apps/marketing/src/styles/marketing.css` (additive only) + new
`docs/Design/marketing-design-system.md`. Conservative audit/polish of the shared
foundation after the landing + subpage redesigns — no component churn.

## Audited
Type scale (display serif → eyebrow), spacing rhythm, readable measure, the `--m-*`
→ shared-primitive colour mapping, the 12-col grid tokens, the GSAP reveal +
reduced-motion baseline, and focus visibility.

## Changed (all additive, build-verified)
- **Readable measure** — `.m-lead` was uncapped; added `--m-measure: 68ch` and
  applied it. (Other copy classes already cap tighter.)
- **Motion tokens** — added `--m-ease` (cubic-bezier(0.22,1,0.36,1)), `--m-dur-fast`
  0.16s, `--m-dur` 0.24s; rewired `.m-btn`'s transition onto them (0.18→0.16s, the
  only behavioural delta).
- **Focus visibility** (was missing) — added `--m-focus-ring/-width/-offset` tokens
  and a zero-specificity `:focus-visible` rule scoped to
  `.m-section :where(a,button,[tabindex])` + `.m-btn`, so any component's own focus
  style still wins and the dark nav/footer chrome is untouched.

## Left alone (documented as recommendations)
- Neutrals are already navy-tinted upstream at the primitive tier (shared with the
  product UI) — changing them would be a cross-app regression.
- `.m-h2` (44px) vs `.m-page-title` (48px) never co-occur — merging = pure churn.
- `SectionEyebrow` tracking vs `.m-eyebrow` token; `--m-faint` contrast watch-item;
  `.m-page-note` 70ch; component-level motion-token adoption; dark mode — all in the
  doc's "recommendations not yet applied" section.

## Verified
`pnpm --dir apps/marketing build` → 76 pages, clean. No layout regression (token
additions + a measure cap + keyboard-only focus ring).

## Next
Phase 4 — whole-site design-critique (scored, with a fix list).
