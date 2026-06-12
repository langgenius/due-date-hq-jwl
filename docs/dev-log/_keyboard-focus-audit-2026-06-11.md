# 2026-06-11 — App-wide keyboard + focus audit

Systematic pass over every route + shared pattern for the house focus canon
(`focus-visible:ring-2 focus-visible:ring-state-accent-active-alt`, inset
variant sanctioned for full-bleed rows, 1px-inset variant for text inputs per
`packages/ui/src/components/ui/input.tsx`), keyboard reachability, Esc
behavior, tab order, skip link, and `<kbd>` convergence.

## Method

1. `grep outline-none|outline-hidden` (100 hits) → context-checked each for a
   ring on the same element; 16 candidates lacked one → triaged below.
2. AST-ish scan for `onClick` on non-interactive JSX tags (22 hits) → triaged.
3. Grep for non-canon ring colors/widths and `focus:`-prefixed rings.
4. Positive `tabIndex` grep → **zero hits**.
5. Esc / focus-return spot-checks on hand-rolled (non-base-ui) surfaces.

## Per-page audit table

| Surface                         | Verdict          | Notes                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| /today (dashboard)              | FIXED            | `actions-list.tsx` + `merged-brief-card.tsx` focusable rows had only a bg-change on focus → added inset canon ring. `needs-attention-card.tsx` source-link span converted to `role="link"` + `tabIndex` + Enter/Space + ring.                                                                                                                                                                                |
| /alerts (pulse)                 | FIXED + REPORTED | `PulseAlertRow.tsx` source span converted (role/tabIndex/keydown/ring). `AlertCard.tsx` needs-review tooltip icon (`tabIndex={0}`) got the canon ring. Reported: hover-only tooltip date spans (below).                                                                                                                                                                                                      |
| /alerts history                 | PASS             | Row uses ancestor ring; drawer breadcrumb fixed (below).                                                                                                                                                                                                                                                                                                                                                     |
| Alert detail drawer             | FIXED            | Breadcrumb "Alerts" button had text-color-only focus → canon ring. Hand-rolled `<kbd>` A/D hints → canonical `<Kbd>`.                                                                                                                                                                                                                                                                                        |
| Alert list rail                 | FIXED            | Source `role="link"` span had text-color-only focus → canon ring.                                                                                                                                                                                                                                                                                                                                            |
| /deadlines (table)              | FIXED + REPORTED | Raw `<kbd>N</kbd>` in Add-deadline dropdown → `<Kbd>`. Client-name click-target spans intentionally non-button (documented row-handler/shift-click interplay; row itself is keyboard-operable) — left as-is, see report. Calendar-sync custom scrim sits under a base-ui Popover (Esc handled).                                                                                                              |
| /deadlines/:ref (page)          | FIXED            | **Esc now closes the page** (same navigate-back as the breadcrumb/✕) — new page-mode-only handler in `ObligationQueueDetailDrawer`, quiet while typing or while any base-ui popup layer is open (new `isPopupLayerOpen()` probe). Also: "View all in Timeline →" link-button + `DeadlineCrumbBar` back-link + `PenaltyExposureCard` "View schedule" anchor + `ObligationListRail` load-more got canon rings. |
| /clients list + detail          | PASS             | All `outline-none` call sites carry the canon ring.                                                                                                                                                                                                                                                                                                                                                          |
| Email compose dialog            | FIXED            | Bare inline Subject `<input>` had no focus style → input-canon `focus-visible:ring-1` (+ rounded-sm). Body uses the `Textarea` primitive (already canon).                                                                                                                                                                                                                                                    |
| /rules library + review         | PASS             | Coverage-tab clickable div wraps a keyboard-operable inner `<button>` (redundant click-area, not a gap).                                                                                                                                                                                                                                                                                                     |
| /rules sources                  | PASS             | No findings.                                                                                                                                                                                                                                                                                                                                                                                                 |
| /calendar                       | PASS             | No outline-none / clickable-div findings.                                                                                                                                                                                                                                                                                                                                                                    |
| /audit-log                      | PASS             | Transition rows are `role`/`tabIndex`/`keydown`-complete with rings.                                                                                                                                                                                                                                                                                                                                         |
| /settings · practice · members  | PASS             | —                                                                                                                                                                                                                                                                                                                                                                                                            |
| /billing                        | EXCEPTION        | `upgrade-cta-button.tsx` uses `focus-visible:ring-state-warning-active` — intentional warning-toned CTA (accent-blue ring on the amber crown CTA would clash); documented here as the one sanctioned color deviation.                                                                                                                                                                                        |
| Migration wizard                | PASS             | Dropzones are `role="button"` + keydown + canon ring.                                                                                                                                                                                                                                                                                                                                                        |
| Auth (login / otp / 2fa)        | FIXED            | `otp-input.tsx` used `focus:`-prefixed ring → converged to `focus-visible:` (1px inset = input canon).                                                                                                                                                                                                                                                                                                       |
| App shell                       | FIXED            | **Skip link added** — first tab stop, `sr-only` at rest, surfaces as a card on focus, jumps to `<main id="main-content" tabIndex={-1}>`.                                                                                                                                                                                                                                                                     |
| Command palette / shortcut help | PASS             | Both ride base-ui `CommandDialog`/`Dialog` — Esc + focus return built in.                                                                                                                                                                                                                                                                                                                                    |
| SearchInput primitive           | FIXED            | Hand-rolled hotkey `<kbd>` hint chip → canonical `<Kbd>` (wrapped in the positioned span).                                                                                                                                                                                                                                                                                                                   |

## Reported (judgment calls, not fixed)

1. **Hover-only tooltips on non-focusable spans** — `PulseAlertRow.tsx`
   (rail date :384, compact time :474) and `needs-attention-card.tsx`
   (jurisdiction pill :227, relative time :270) render `TooltipTrigger` onto
   plain spans with no `tabIndex`; keyboard users can't summon the tooltip.
   Adding `tabIndex={0}` to every row's date would add serious tab-order
   noise — needs a design decision (e.g. fold the absolute time into the row's
   accessible name instead).
2. **Client-name click targets** in the deadlines queue
   (`use-obligation-queue-columns.tsx:236/250`, `obligations.tsx:2364`)
   are intentionally non-button spans (inline comment: a `<button>` would trip
   `isObligationQueueRowControlClick` and break row-open + shift-click range
   select). The row itself is focusable/operable, so keyboard parity exists.
3. **Alert detail drawer (panel mode on /alerts)** has no Esc-to-close —
   left alone since the alerts page's panel never claimed Esc; if parity with
   the deadline page is wanted, the same popup-guarded handler pattern applies.
4. **Pre-existing test failure** (clean tree, unrelated):
   `AlertsListPage.test.tsx > never fires per-row getDetail…` expects
   "Mar 15, 2026", DOM renders "Mar 15".

## Tab order / focus return

- Positive `tabIndex` values: none found.
- Dialogs/sheets/popovers/dropdowns are all base-ui → Esc + focus-return to
  trigger are built in; the only hand-rolled overlay layer (calendar-sync
  scrim) delegates open-state to a base-ui Popover.

## Dirty files skipped (other sessions own them)

None of the planned fixes landed in dirty files. Dirty at audit time:
`OnboardingSkipModal.tsx`, `AnnualRolloverDialog.tsx`, `accept-invite.tsx`,
`login.tsx`, `onboarding.tsx` — all audited read-only; no canon violations
found in them beyond what their owning sessions already touch.

## Verification

- `tsgo --noEmit` clean (0 errors).
- `vp fmt --write` over the 16 touched files.
- `vp test run obligations` → 91/91 pass. `vp test run alert` → 94 pass,
  1 pre-existing failure (verified failing on a stashed clean tree).
