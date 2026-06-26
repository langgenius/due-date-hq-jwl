# Hide the Agentation dev overlay by default

**Date:** 2026-06-26

Yuqi: "hide agentation." `agentation` is the in-app dev feedback/annotation overlay
(the source of the "Page Feedback" messages), mounted in `main.tsx` and already gated
to `import.meta.env.DEV` (never in production).

Added a second gate: it now also requires **`VITE_DEVTOOLS=1`**, so it's **off by
default** in dev. To bring the overlay back, add `VITE_DEVTOOLS=1` to
`apps/app/.env.local` and restart the dev server.

Note: this turns the in-dev feedback tool off for everyone by default — re-enable via
the env flag when you want to annotate.

## Verify

`pnpm check` 0 errors; `build` clean. Dev server restarted with the flag unset →
`#agentation-root` absent on /login.
