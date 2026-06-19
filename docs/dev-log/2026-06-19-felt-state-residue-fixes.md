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
  strip _and_ the form note; residency appeared in the strip _and_ the footer.
  **Caught live:** the left strip is desktop-only (hidden < `lg`); the form note +
  footer are always visible. So the always-visible auth column stays canonical —
  expiry in the form note, residency in the footer — and the desktop strip is trimmed
  to its one distinct line, "No password, no token to lose." Each fact now appears
  once per viewport, with no mobile gap. Removed the now-unused `MailCheckIcon` +
  `ShieldIcon` imports.

  > First attempt (commit `50efb85e`) moved residency _out_ of the always-visible
  > footer into the desktop-only strip — which dropped it entirely on mobile. The
  > live mobile/desktop check caught it; this commit corrects the direction.

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
