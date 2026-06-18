# Accent-link → TextLink (audit batch 3)

_2026-06-18_

Batch 3 of the [full-app audit](../Design/full-app-audit-2026-06-18.md): the one
live §4.11 violation — 10 hand-rolled `text-text-accent … hover:underline` inline
links migrated onto the `TextLink variant="accent"` primitive (which exists for
exactly this; the raw-button audit couldn't catch them — they're `<Link>`/`<a>`/
`<button>`, not raw `<button>` only).

## Migrated (10 sites / 7 files)

- dashboard: `merged-brief-card.tsx`, `daily-brief-card.tsx` (×2), `needs-attention-section.tsx`
- `routes/rules.library.tsx` (×3: select-all/clear buttons + rollover-preview link)
- `routes/billing.checkout.tsx` (mailto support link)
- `obligations/queue/components/DeadlineRow.tsx` (client-summary link)
- `obligations/queue/ObligationQueueDetailDrawer.tsx` (jump-to-audit action)

Each preserved its destination / `onClick` / `state` / `target`; `<Link>` →
`render={<Link/>}`, `<a>` → `render={<a/>}`, `<button>` → default. Layout classes
kept; the accent recipe dropped (TextLink owns `inline-flex items-center gap-1
font-medium` + the accent tone).

## Two review catches

- **Size:** `TextLink` defaults to `text-xs`. Three links sit inline in
  `text-sm`/`text-base` paragraphs (merged-brief "open the queue", daily-brief
  alerts + deadlines lines) — added `size="sm"` so they don't shrink. The
  `rules.library` rollover-preview link sits in a `text-xs` block → default left.
- **i18n placeholder:** the billing.checkout mailto sat inside a `<Trans>`; swapping
  `<a>` → `<TextLink render={<a/>}>` re-extracted the placeholder from `<link>` to
  `<0>`, which emptied the zh-CN translation. Re-filled it
  (该方案暂时无法在线购买。<0>邮件联系支持</0>，我们会为你完成升级。).

Correctly skipped: `DeadlineRow.tsx:290/399` — `text-text-primary … hover:text-text-accent`
body-text links (accent on hover only, not the banned at-rest recipe).

## Verification

- `tsgo --noEmit` → 0 errors; `vp check` clean on tracked files.
- i18n `compile --strict` passes; extract+compile idempotent (diff = the one
  billing.checkout placeholder rename).
