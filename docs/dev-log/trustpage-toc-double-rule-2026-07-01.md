# TrustPage "On this page" — remove doubled hairline

**Date:** 2026-07-01 · marketing polish

The `.trustpg__toc` contents block (Security/Privacy/Terms/Status) drew two
horizontal rules ~6px apart at its top: the `.trustpg__toc-label` full-width
`border-bottom` (the header underline) plus a `border-top` on every
`.trustpg__toc-item`, so the first row's rule sat directly under the underline
and read as a duplicate line.

Dropped the per-item `border-top` and kept the single full-width label underline
as the sole header rule; rows now separate on padding alone (`16px 0` → `14px 0`
to keep the vertical rhythm even). Shared component, so the fix applies to all
four trust pages. Verified via the running dev server: served CSS for
`.trustpg__toc-item` no longer carries `border-top`.
