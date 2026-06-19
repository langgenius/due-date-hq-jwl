# Icon reference gallery (/icons)

_2026-06-18_

A new internal reference page listing every icon used across the app, mirroring
`/preview`'s public/no-shell treatment.

## What shipped

`apps/app/src/routes/icons.tsx` + a `/icons` lazy route (sibling of `/preview`):

- **177 lucide icons** — one entry per unique glyph, normalized to the `*Icon`
  export name (the codebase mixes `X` and `XIcon` aliases for the same glyph;
  these are deduped). Click any icon to copy its import name (`toast` feedback).
- Live filter input (the `Input` primitive) + a "N shown" count.
- Plain English, not localized — same convention as `/preview` (internal tool).

How the list was gathered (and how to refresh it — noted in the file header):
grep every `lucide-react` import across `apps/app/src` + `packages/ui/src`,
split the identifiers, strip the `Icon` suffix, dedupe, re-add `Icon`. Dropped one
non-icon artifact (`typeLucideIcon`, a `type` import). It's a dated SNAPSHOT — it
won't auto-track new icons; the header documents the one-liner to regenerate.

## Verification (live, dev server /icons)

- `tsgo` 0 (validates all 177 are real lucide exports); `vp check` clean; 543
  tests; build green.
- `/icons` renders 177 cells, each with a real `<svg>`; header + "177 shown"
  count correct; filtering "calendar" → 6 matches; no console errors.
- This is a public/no-shell route (like `/preview`), so unlike the auth-gated
  surfaces it was fully verifiable in the local dev server.

Note: covers lucide icons (the app's icon library). Custom mark components
(`StatusRing`, the brand bars mark, `StateBadge` seals) are bespoke SVG, not in
this lucide inventory — they live in `/preview`'s specimen rows.
