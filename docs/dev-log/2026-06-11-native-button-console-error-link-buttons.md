# 2026-06-11 — Fix Base UI nativeButton console error on Link-rendered Buttons

Base UI's Button logs a console error when `render` swaps in a non-`<button>`
element while `nativeButton` is still true (its default): the component
expects native button semantics it can no longer rely on. The fix per Base
UI's guidance — and the convention already used at 20+ call sites in this
app (e.g. `permission-gate.tsx`) — is `nativeButton={false}`, which makes
Base UI add `role="button"` + keyboard handling to the anchor instead.

Three routes had `<Button render={<Link … />}>` without the prop:

- `routes/error.tsx` — `RouteErrorBoundary`'s "Return home" button (the
  reported instance)
- `routes/not-found.tsx` — the in-shell 404 page's "Go to Today" button
- `routes/accept-invite.tsx` — "Sign in" + "Go to Today" on the
  invalid-invite screen (surfaced in the console while verifying the first)

Verified in the dev server: the error boundary isn't URL-reachable (404s go
to the dedicated NotFound route), so a temporary throwing route exercised
it — boundary rendered with the button as a real `<a href="/">`, then the
NotFound and accept-invite pages were re-checked against a fresh console
buffer. Zero console errors/warnings after the fix; before it, the log
showed the Base UI error from all three components.
