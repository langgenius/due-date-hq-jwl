# Login — 7-point feedback pass (sizing, hierarchy, product story)

**Date:** 2026-06-26

Per Yuqi's annotated /login feedback (1512×861):

1. **Footer read "only on the left."** Its top hairline only showed against the light
   sign-in column; under the dark `ProductStory` panel the panel edge replaced it, so the
   divider looked half-width. Dropped the `border-t` — the footer is now a clean full-width
   strip (it was always 1512px wide; the asymmetric line was the artifact).
2. **ProductStory "better designed."** Added an eyebrow ("Every deadline, one workbench") above
   the promise, bumped the headline `text-lg` → `text-xl`, and gave the navy panel depth with a
   `from-brand-ink to-brand-ink-deep` gradient. Pushed the product-window mock down (`top-36` →
   `top-48`) to clear the taller copy block.
3. **Subhead → one line.** "One source of truth for every filing deadline across your firm." →
   "One source of truth for every filing deadline." + `text-nowrap`.
4. **"Closer."** Column rhythm tightened (`gap-7` → `gap-6`).
5. **Mail icon smaller.** Field adornment icons `size-4` → `size-3.5` (mail + return hint).
6. **Field + buttons taller.** Auth fields + buttons now `h-11` (44px) — one size above the
   in-app `h-9` canon — so the sign-in form reads as the page's primary action. Field and CTA
   stay matched (new `AUTH_BTN_H` const + `h-11` in `AUTH_FIELD_SKIN`).
7. **Tidy / hierarchy.** Net effect of 3–6: tighter, taller, clearer.

## Note

This intentionally _raises_ the login field/button height (h-9 → h-11) — the opposite of the
earlier "default size" pass. Auth is a deliberate surface variant (outlined-white, now taller);
the in-app form-control canon stays h-9.

## Verify

`pnpm check` 0 errors; `build` clean; `lingui compile --strict` clean (added zh-CN for the new
eyebrow + changed subhead). Live /login @1512: subhead 1 line, field/Send/Google all 44px, mail
14px, panel gradient applied, footer full-width with no half-line.
