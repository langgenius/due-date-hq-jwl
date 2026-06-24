# Quality-gradient pass — signature moments for thin surfaces + 3 central items

**Date:** 2026-06-24
**Follows:** [full-product audit](../Design/full-product-ui-ux-audit-2026-06-24.md) + its
[P1 remediation](./_full-product-uiux-audit-remediation-2026-06-24.md).

The audit found a quality gradient: hero surfaces 3.5–4.5/5, supporting/system surfaces
1.5–3. This pass gives the thinnest surfaces ONE honest focal "signature moment" each
(grounded in the soft-premium vocabulary, **no fiction** — every datum traces to real data)
and closes the 3 deferred `NEEDS-CENTRAL` items. 4 worktree-isolated agents → cherry-pick →
central i18n.

## Signature moments

**/workload** (`32639d25`) — was 2/5, data-thin.
- **Busiest-owner hero:** the buried `·`-joined manager string is now a dominant named card
  — `AssigneeAvatar` + owner + open count + a real `capacityLoadScore`% `Progress` gauge.
- Honest load spine: owner rows sorted by real relative load, top owner emphasized,
  unassigned/"Risk" row distinct, identity glyph → `AssigneeAvatar`.
- `ManagerInsightMetric` (hand-rolled tiles duplicating StatBand) deleted → folded into
  `StatBand` (no primitive change needed — existing layout fit).

**Entry / trust** (`b313ea93`) — error 1.5/5, 2FA/splash austere.
- **error.tsx:** reframed from an anonymous red Alert to a calm, owned composition —
  brand anchor + soft `ServerOffIcon` in a warm stone well (no red triangle), blame-free
  headline ("…on our end / it's on us, not you"), clear "Try again" + "Go to Today".
- **two-factor:** OTP refined + a quiet `ShieldCheckIcon` reassurance strip ("your account
  is protected").
- **splash:** real time-of-day greeting (computed from the client clock — not fiction).
- Consolidated the repeated entry-H1 into a new in-app `AuthHeading` (auth-chrome.tsx) —
  no packages/ui token needed.

**/calendar + /reminders** (`29b82531`) — was 2/5, settings-y.
- **calendar:** per-provider `ProviderMark` glyphs (Google/Apple/Outlook, token-only via
  `color-mix`, no raw hex) + calm Connected/Not-enabled state; "How to subscribe" numbered
  steps; removed the wrong `font-mono` on human dates.
- **reminders:** honest `DeliverySummaryBand` ("N sent · N failed", backed by real
  `ReminderRecentSend.deliveryStatus`, last-20 qualifier); template inputs → `Field`/`FieldLabel`.

## Central items (the 3 NEEDS-CENTRAL from the remediation)
- **Tilegram unify** (`61a07e82`): `PulseAlertsMap` rewritten to consume the shared
  `us-jurisdiction-tiles` geometry (absolute SVG tiles, handles the fractional coords the
  old CSS-grid couldn't) — both maps now share one source, can't drift. Shared primitive
  untouched (backward-compatible). FED is now an inline tile.
- **StatBand cohesion** — resolved inside /workload (no card-mode variant required).
- **Auth-heading token** — resolved as the in-app `AuthHeading` component.

## No-fiction audit (signature work is where fake data creeps in — checked)
- workload load% = real `capacityLoadScore`; reminders sent/failed = real `deliveryStatus`
  counts; splash greeting = real clock. No invented charts/rates/sparklines.
- DEFERRED: real SVG brand assets for calendar providers (current `ProviderMark` is a
  token-only CSS approximation); accept-invite H1 → `AuthHeading` (out of the entry agent's
  file scope).

## Verify
`tsgo` app + ui clean; `vp run @duedatehq/app#build` clean (exit 0); i18n `extract`
0-missing after filling 37 zh-CN strings / `compile --strict` passes. 4 commits integrated
via worktree-isolation + clean cherry-pick.
