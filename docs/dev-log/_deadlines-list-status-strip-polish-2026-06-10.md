# /deadlines list — status pill-strip polish (2026-06-10)

Yuqi page feedback on the status scope pill-strip (obligations.tsx toolbar):

- **#1 remove "STATUS" label** — dropped the leading `ListChecksIcon` + "Status"
  eyebrow; the segmented control stands on its own.
- **#3 remove segmented-track border** — the pill track was
  `rounded-full border border-divider-subtle bg-background-subtle`; dropped the
  border, the soft fill alone defines the track.
- **#5 remove toolbar bottom border** — the sticky filter bar's
  `border-b border-divider-subtle` is gone (it stays opaque via
  `bg-background-default`, so rows still don't bleed when pinned).
- **#2 pill font** — pills were `text-base` (14px); tightened to `text-sm` for a
  filter strip that reads as secondary chrome, not body text.

`tsgo` clean. (ListChecksIcon import retained — still used by the empty-state.)
