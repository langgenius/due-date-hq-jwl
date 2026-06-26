# Login — lockup + control size refinements

**Date:** 2026-06-26

Follow-up pass on the sign-in card after the wordmark2 lockup landed. Per Yuqi's review:

- **Lockup much smaller** — `AuthBrandAnchor` lockup on /login dropped `h-5` → `h-4` (16px).
  Now sits quietly above the "Sign in" title instead of competing with it.
- **Return hint → icon only, light.** Replaced the `<Kbd>Return ↵</Kbd>` chip inside the email
  field with a bare `CornerDownLeftIcon` (`size-4 text-text-muted`). Removed the now-unused
  `Kbd` import.
- **Buttons → default size.** Dropped `size="lg"` from every action button (Google SSO,
  Microsoft SSO, Send sign-in link, Verify & sign in, Resend). They render at the default
  `h-9`, matching the rest of the product's button rhythm.
- **"Already have a sign-in link?" bigger.** Bumped that recovery line + its `Open it now →`
  link to `text-sm` so the alternate path is legible, not a footnote.
- **"or continue with" lighter.** Divider label → `text-text-quaternary font-normal` so the
  SSO divider recedes behind the primary email flow.

## Verify

`pnpm check` (eslint + types) **0 errors**; `build` clean; `vp fmt --check` clean. Live
`/login` confirmed: lockup 16px, `CornerDownLeftIcon` present + no `kbd`, Send button 36px
(default `h-9`), divider label at 30% ink. CI green → `deploy-staging` ships.
