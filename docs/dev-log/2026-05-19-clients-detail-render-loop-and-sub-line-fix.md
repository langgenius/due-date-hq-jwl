---
title: 'Clients detail — bugfix pass: render loop, sub-line, button warnings'
date: 2026-05-19
area: app
---

# Clients detail — bugfix pass

After stage 3c shipped, the dev-server screenshot showed three symptoms
that pointed at the same root: the side panel rendered partially, the
identity sub-line displayed as bare middots (`· ·`), and "Filings &
deadlines" was visible only as a title with no body. Investigation
turned up three separate bugs.

## 1. Identity sub-line rendered as ". ." / " · · "

`formatClientIdentitySubLine` and `formatJurisdictionSummary` used
Lingui's `t\`${var} ...\``macro for interpolated synthesized strings.
The compiled Lingui catalog doesn't include those new keys yet, and the`--strict` `i18n:compile`script can't fill the gap until 28 missing
zh-CN translations land. In dev that runtime path produced empty
strings, which`parts.join(' · ')` then turned into a row of middots.

These strings are **synthesized data labels**, not user-facing copy
that needs translation contracts. They're built from counts and dates
that the existing date/number formatters already localize. So:

- Dropped `t\`...\``macros from`taxClassificationLabel`,
`formatClientIdentitySubLine`, and `formatJurisdictionSummary`. They
  now return plain JS template strings.
- Removed the `t` parameter from each function (and from the call
  sites). Type signature cleaner too.
- The 28-string i18n debt remains for the Trans-tagged strings that
  _do_ need translation (section titles, button labels, AI fallback
  copy); a follow-up pass can add zh-CN translations and re-enable
  `i18n:compile --strict`.

## 2. "Maximum update depth exceeded" — empty Filings & deadlines panel

The dev-server log captured a hard React error: `Maximum update depth
exceeded` and subsequent `removeChild` / `insertBefore` DOM errors.
That's why the obligations card rendered the `CardHeader` but no
`CardContent` — React bailed out of rendering the subtree.

Root cause: unstable references being fed into `useQuery` / `useQueries`
inputs and `useMemo` deps in `apps/app/src/routes/clients.tsx`:

- `[...OPEN_OBLIGATION_STATUSES]` allocated a fresh array on every
  render, changing the obligations.list query input each pass.
- `useQueries({ queries: (pulseAlerts ?? []).map(...) })` produced a
  fresh `queries` array each render.
- `pulseMatchesByClient = useMemo(..., [pulseDetailsQueries])` used the
  always-new `useQueries` return value as a dep, recomputing every
  render.

Together they kept invalidating the cache key + recomputing the
affected-client set + re-deriving filtered rows. The cascade was
enough to trip React's update-depth guard.

Fixes:

- Hoisted the static inputs to module-level constants:
  `CLIENTS_LIST_INPUT`, `OBLIGATIONS_LIST_INPUT`,
  `OPPORTUNITIES_LIST_INPUT`, `PULSE_HISTORY_INPUT`, and
  `OPEN_OBLIGATION_STATUSES` (now a typed `ObligationStatus[]`).
- Wrapped the `useQueries` `queries` array in `useMemo`, keyed on
  `pulseAlerts` so it only allocates when the source data changes.
- Replaced `[pulseDetailsQueries]` with a join-key of alert ids
  (`pulseDetailsKey`) so `pulseMatchesByClient` only recomputes when
  the underlying alerts actually change. Suppressed the
  `react-hooks/exhaustive-deps` rule for that single useMemo with an
  inline comment.

## 3. Base UI Button + `render={<Link>}` warnings

Two `Button render={<Link to=… />}` sites were missing
`nativeButton={false}`. Base UI's default `nativeButton=true` expects a
native `<button>` element; rendering an `<a>` triggered repeated dev
console errors. Fixed at:

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — the
  "Open full view" button inside the side panel.
- `apps/app/src/routes/clients.$clientId.tsx` — the "Back to clients"
  button at the top of the full-page route.

## Files

- `apps/app/src/routes/clients.tsx` — stable query inputs +
  `pulseDetailsKey` memo dep; added `ObligationStatus` import.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — dropped
  `t` from helper formatters; added `nativeButton={false}` to the
  "Open full view" button.
- `apps/app/src/routes/clients.$clientId.tsx` — `nativeButton={false}`
  on "Back to clients".

## Validation

- `pnpm check` (579 files, 0 warnings, 0 errors).
- `pnpm --filter @duedatehq/app test -- --run` (40 files, 208 tests).
- Dev server restarted at `http://localhost:5178/`. Verified the side
  panel renders the identity sub-line as text (e.g., `2 open filings ·
next due 2026-03-23 · all on track` for Arbor & Vale LLC) and the
  Filings & deadlines table populates.
