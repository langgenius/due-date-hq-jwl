# 2026-05-27 — Agent υ (upsilon) audit-drain roadmap-defaults

Wave-5 drain pass. Ships safe defaults for previously-blocked
"needs Yuqi product call" findings so Yuqi can revert specifics
rather than design from scratch.

## Shipped (7)

### F10-03 — Status page link in entry-layout footer

`apps/app/src/routes/_entry-layout.tsx`

The "All systems operational" pill claimed status without linking
anywhere. Users seeing an outage had no way to verify or get
details. Wrapped the pill in an anchor to
`https://status.duedatehq.com` (default — Yuqi can swap to the
actual operational page if different). Opens in a new tab so the
entry surface (often mid-login) isn't lost; carries the same
hover/focus-visible treatment as the rest of the footer text.

### H1.4 — Shortcut hint chip on /alerts toolbar

`apps/app/src/features/pulse/AlertsListPage.tsx`

### H2.6 — Shortcut hint chip on /today toolbar

`apps/app/src/routes/dashboard.tsx`

### H2.7 — Shortcut hint chip on /clients + /rules/library toolbars

`apps/app/src/routes/clients.tsx`, `apps/app/src/routes/rules.library.tsx`

Discoverability fix. The keyboard shortcut help dialog opens on
`?` but that key was undiscoverable from every workbench surface
except `/deadlines` (which has a bottom-of-table hint strip).
Added a small `<kbd>?</kbd> for shortcuts` chip aligned right in
each page header — clicking opens the same dialog the `?` hotkey
opens. Hidden below `md` to avoid crowding the action cluster on
tablets/phones.

Implementation: new `ShortcutHintChip` primitive in
`components/patterns/kbd.tsx`, sharing the existing `Kbd` style.
Uses `useKeyboardShell().openShortcutHelp()` to invoke the
already-lazily-loaded `ShortcutHelpDialog`. Exported
`useKeyboardShell` from `keyboard-shell/index.ts` (was internal).

### F3.2 — Opportunities snooze duration picker

`apps/app/src/features/opportunities/opportunities-page.tsx`

The single Snooze button always wrote `until = now + 14 days`.
Power users had no way to express "shut up for a week" or "park
this for a quarter". Converted to a DropdownMenu with four
options: 7 / 14 (default) / 30 / 90 days. The contract still
takes `until` as ISO datetime — `days` is computed at the call
site. Success toast reads back the actual snooze window via a
plural macro keyed on the picked duration.

### F5-03 / F7-01 — Label-style fork resolution in onboarding

`apps/app/src/routes/onboarding.tsx`

Two form fields ("Practice name", "Internal deadline lead time")
used the uppercase-tracking-eyebrow label treatment, while
`/practice` (where the same fields are edited after setup) uses
the canonical sentence-case `<Label>` primitive. Same field read
in two different visual languages depending on the entry point.
Canonicalized onboarding to sentence-case `<Label>` matching
`/practice`. Section headers (like "State rule coverage
(optional)") keep the eyebrow style — they're section labels, not
field labels.

### F8-04 — "What changes" delta in billing checkout (bonus)

`apps/app/src/routes/billing.checkout.tsx`

The checkout screen read as a static "Confirm Pro 3 seats" page —
no acknowledgment that an existing customer is actually upgrading
FROM something. Added a small delta line under the H1
("Solo (1 seat) → Pro (3 seats)") when an active subscription
exists AND the user is changing plan (not just toggling interval
or re-confirming the current plan). First-time checkouts stay
clean.

## TSC

```
cd apps/app && pnpm exec tsc --noEmit
```

Clean.

## Lingui

10 new msgids; all zh-CN translated. `pnpm i18n:compile --strict`
passes.

## Tests

- `src/routes/rules.library.test.tsx` — 13 passed
- `src/features/pulse/AlertsListPage.test.tsx` — 1 passed
- `src/features/dashboard/actions-list.test.tsx`,
  `src/features/rules/coverage-tab.test.tsx`,
  `src/routes/onboarding-firm-flow.test.ts` — 26 passed

## Yuqi product calls that may need revert

1. **F10-03 status URL** — defaulted to
   `https://status.duedatehq.com`. If the actual operational
   page is `status.io/duedatehq` or anything else, swap the
   `href` in `_entry-layout.tsx:105`.
2. **F3.2 snooze options** — defaulted to 7/14/30/90 days. If
   Yuqi wants different durations (e.g. 1 day for shorter
   patience, 180 for half-year parking), tweak
   `SNOOZE_DURATION_DAYS` in `opportunities-page.tsx:328`.
3. **H1.4 / H2.6 / H2.7 chip copy** — defaulted to
   `<kbd>?</kbd> for shortcuts`. If Yuqi wants "Keyboard
   shortcuts" or "Press ? for help", swap the `<Trans>` text
   in `components/patterns/kbd.tsx`.
4. **F5-03 / F7-01 label canonical** — picked sentence-case
   `<Label>` per `/practice`. If Yuqi decides the eyebrow
   treatment is canonical instead, revert practice.tsx to match
   onboarding (not the other way around).
5. **F8-04 delta copy** — defaulted to "What changes ·
   Solo (1 seat) → Pro (3 seats)". If Yuqi wants stronger
   framing ("You're upgrading from…"), tweak in
   `billing.checkout.tsx:300`.
