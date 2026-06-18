# Pass-2 P1 defects

_2026-06-18_

The pass-2 per-skill audit (26 lenses; see the forthcoming
`full-app-audit-2026-06-18-pass2.md`) surfaced net-new defects pass 1 didn't reach.
This commit lands the genuine **P1s** — real bugs, not polish.

## Fixes

- **a11y — `iso-date-picker` day cells** (canonical date primitive, ~10 callsites):
  day buttons had only a bare numeric name ("15"). Added a full localized
  `aria-label` ("Wednesday, January 15, 2026", + ", today" on today's cell) via a
  UTC-consistent `Intl.DateTimeFormat`. Visible numeral unchanged.
- **a11y — obligations queue row**: `role="button"` carried `aria-selected` (invalid
  for button → ignored by AT) and no accessible name. Swapped to `aria-pressed` +
  `aria-label="Open deadline for {client}"`, matching the already-correct /clients row.
- **state — notification bell** (`alerts-notifications-bell.tsx`): `markRead` +
  `markAllRead` had no `onError` (silent fail; click navigates away), and the list
  had no `isError` branch (error-as-empty). Added an error toast to both mutations
  and an `isError` row with Retry — the same fix pass 1 applied to the notifications
  _page_ but the bell is a separate component.
- **state — audit `createDownloadUrl`**: no `onError` (its sibling `requestPackage`
  has one) → a failed export-URL sign was silent. Added the matching error toast.
- **UX — client-facing readiness portal**: the checklist card rendered the raw
  request-status enum (`sent`/`opened`) to non-expert tax clients, un-translated.
  Mapped to human, translated copy (In progress / Revoked / Expired).

## Verification

- `tsgo --noEmit` 0; `vp check` clean; 5 new strings translated to zh-CN
  (无法更新通知 / 无法加载通知。 / 无法打开导出 / 打开 {0} 的截止事项 / {0}，今天; In progress/Revoked/Expired
  already in catalog); `compile --strict` passes.
- (8 of the 26 pass-2 lenses were rate-limited mid-run and are being re-run; the
  full pass-2 doc + remaining net-new fixes follow.)
