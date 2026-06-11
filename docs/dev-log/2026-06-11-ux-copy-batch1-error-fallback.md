# UX copy batch 1 — retire the network-blame error fallback (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md, finding S1.

The generic error description `"Check your network and try again. If this keeps happening, contact support."` appeared **108 times** across 31 files — pasted under every `Couldn't [verb] [object]` toast/alert title regardless of cause (validation, permissions, server errors alike). It blames the user's network by default, which violates the voice contract (calm · capable · sharp; never blame, one recovery step, support as last resort).

## Change

Mechanical sweep, one string (plus its short `<Trans>` variant):

- Before: `Check your network and try again. If this keeps happening, contact support.`
- After: `Try again in a moment. If it keeps failing, contact support.`
- Short variant (2 sites): `Check your network and try again.` → `Try again in a moment.`

The specific-cause behavior is unchanged: nearly all sites already render `rpcErrorMessage(err) ?? <fallback>`, so a real server message still wins; only the last-resort fallback is reworded. One test fixture (`AlertStructuredFields.test.tsx`) asserting the string was updated by the same sweep.

## Deliberate scope limits

- Per-context error descriptions (e.g. "Check the email address and resend" on the OTP send) are follow-up work — this commit only removes the systemic blame pattern without changing any error-handling logic.
- Catalog regeneration (`i18n:extract`/`compile`) is deferred to a single catalogs commit at the end of the copy-fix series, because the working tree carries unrelated WIP whose strings would leak into `--clean` extraction. zh-CN translation for the new fallback is prepared: 请稍后重试。如果持续失败，请联系支持团队。
