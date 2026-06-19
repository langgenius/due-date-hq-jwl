# Felt-state residue — "fix all"

_2026-06-19 · follow-up to the 2026-06-18 felt-state critique_

Went back through the deferred residue from
[felt-state-critique-2026-06-18](../Design/felt-state-critique-2026-06-18.md).
Two real fixes; two "residue" items verified canon-correct (no change); one parked
for a design decision.

## Fixed

- **`panels.tsx` — "Calculating the tax estimate" → "Tax estimate needed".** The
  copy fired for the `estimate_needed` payment state, which is an _awaiting-input_
  state (peers: "Awaiting client approval of estimate", "Payment scheduled with
  authority"). "Calculating" implied active system compute that isn't happening — a
  no-fiction violation. Two strings: the status line → "Tax estimate needed", the
  short pipeline label → "Estimate needed".
- **`login.tsx` — de-duped security messaging.** Expiry appeared in the left trust
  strip _and_ the form note; residency appeared in the strip _and_ the footer. Now
  one home each: expiry → form note (point of action), residency → trust strip,
  "Hosted in US-East" → footer. Removed the trust strip's expiry item + its now-unused
  `MailCheckIcon` import.

## Verified canon-correct — left as-is (sweep false-positives)

- `ClientDetailWorkspace` `py-1.5`/`py-2.5` header bands match
  `detail-section-card`'s two canonical header variants (`min-h-8 py-1.5` /
  `min-h-9 py-2.5`). Not off-scale.
- `SuccessModal` outer `rounded-lg` matches the Dialog primitive default.

## Deferred (needs a decision)

`BadgeStatusDot tone="info"` uses raw `bg-violet-500`. Tokenizing isn't mechanical —
the dot is used generically (members' pending-invite, not only waiting-on-client) and
violet now also means `review`, so a shared token would collide two semantics. Parked.

## Verification

- `tsgo` 0; i18n extract + 3 new zh-CN strings translated; `compile --strict` ok;
  build green.
