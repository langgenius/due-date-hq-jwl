# Analytics (Amplitude)

Product analytics for the pre-launch activation funnel. **Production builds only,
and disabled by default** — it reports only when `import.meta.env.PROD` is true
AND `VITE_AMPLITUDE_API_KEY` is set. The dev server (`vp dev`), tests, and local
previews are always a silent no-op (the SDK is never even downloaded), so
non-prod never pollutes the analytics project.

## Files

- `events.ts` — typed event-name constants (`ANALYTICS_EVENTS`) + property types.
  Single source of truth in code; mirrors the Amplitude Govern tracking plan
  (project **827681**). Add a constant the moment you wire a new call site.
- `pii-guard.ts` — drops PII keys (name/email/ssn/ein/phone/address…) and any
  string value that looks like an SSN/EIN/email/phone. **The hard boundary for a
  tax product.** All payloads pass through it before send.
- `index.ts` — public API: `initAnalytics`, `track`, `identifyUser`,
  `setFirmGroup`, `resetAnalytics`, `setSuperProperties`, and the redirect-safe
  sign-in markers (`markSignInPending` / `consumeSignInMarker`).

## Enabling

Set the build env var (see `apps/app/.env.example`):

```
VITE_AMPLITUDE_API_KEY=<browser-sdk-key>   # project 827681, US server zone
```

Then redeploy. No code change needed to turn it on or off. Note: this only
matters for production builds — a key in a local `.env.local` still does nothing
under `vp dev` because of the `import.meta.env.PROD` gate.

## Model

- **B2B**: firms are the Amplitude group type `firm` (`setFirmGroup`). Funnels
  and retention roll up to the account.
  ⚠️ The `firm` group type must exist in Amplitude (Settings → Groups) for group
  properties to land — create it once.
- **Lazy + queued**: the SDK loads via `import()` after a key is present; calls
  made before it finishes are queued and flushed in order.

## Adding an event

1. Add the name to `ANALYTICS_EVENTS` in `events.ts` (must match Govern exactly).
2. `track(ANALYTICS_EVENTS.yourEvent, { ...props })` at the call site. Fire
   conversion events (Practice Created, Import Confirmed, Checkout Completed)
   from the **success** path, not the click.
3. Mirror the event + its properties in Amplitude Govern.

The full 105-event plan lives in Govern; only events the app currently emits have
constants here.
