# 2026-06-11 — Hostile-data audit: dialog layer + entry pages

The two remaining injection-audit blind spots (dark mode explicitly
descoped — Yuqi "不做dark").

## Dialog layer

Code + live audit of the alert dialogs:

- **F-041 apply-verification gate** — REAL find: the Authority link
  renders `detail.alert.source` inside a `<Button>`, whose base is
  `whitespace-nowrap` with no truncation — a long authority name overflowed
  the 560px dialog horizontally, on the single most liability-critical
  surface in the product. Fixed: `max-w-full` on the button + truncated
  inner span. Live-verified by opening the real gate and injecting a
  120-char name: span truncates, dialog x-overflow 0.
- BulkConfirmDialog list: `min-w-0 truncate` already on item titles ✓.
- Confirm-applies dialog: clientName interpolates into wrapping prose ✓.
- AlertReviewRequestDialog: no user data ✓.
- Source-excerpt blockquote in the gate: `line-clamp-6` already ✓.

## Entry pages

Iframe injection over /login /two-factor /accept-invite /onboarding
/migration/new /splash:

- /accept-invite: clean. /migration/new + /splash h1s flagged by the
  auditor are app-authored copy (injection artifacts, not bugs).
- /login, /onboarding, /two-factor redirect while authenticated — not
  injectable from this session. Their surfaces are forms + fixed copy
  (low user-data risk); post-import migration steps (which DO render
  imported client names) need a real import run to audit and remain
  uncovered.
