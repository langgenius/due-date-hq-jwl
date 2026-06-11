# Deadline detail (page mode) — tab bar joins the white header + key dates persist on scroll

Date: 2026-06-10
Surface: `/deadlines/:ref` (page mode — `isPageMode`) — `ObligationQueueDetailDrawer`
File: `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx` (only)

Both changes are gated on `isPageMode`. The `/clients` right-rail panel
(`mode === 'panel'`) and the cross-surface modal `Sheet` (`mode === 'sheet'`)
are untouched.

## Layout recap

In page mode the drawer body stacks, inside an `overflow-hidden flex-col`
`<aside>`:

1. `DeadlineCrumbBar` — non-scrolling
2. `DetailStatusBanner` (colored status band) — non-scrolling
3. `<header>` (WHITE, `bg-background-default`) — title + meta + key-date strip — **non-scrolling sibling**
4. `<div onScroll>` — the body scroll container (`flex-1 overflow-y-auto`, `bg-background-subtle` gray) — hosts the sticky tab bar + tab content
5. `<footer sticky bottom-0>`

Because the `<header>` is a non-scrolling sibling above the scroll container,
it stays pinned at the top while the tab content scrolls beneath. The on-scroll
handler flips `pageHeaderCollapsed` (threshold `scrollTop > 16`), which shrinks
the hero (title → 16px, meta hidden).

## #6 — the sticky tab bar reads as part of the WHITE header

Before: the sticky tab bar wrapper carried `bg-background-subtle` (gray) +
`pt-3 pb-3`, so it read as the START of the gray content, not part of the white
header. User feedback: "the tab bar should be part of the header."

After: in page mode the sticky tab-bar wrapper takes an opaque WHITE fill
(`bg-background-default`) and drops its leading `pt-3` (`pb-0`), so it butts
flush against the white header above it — banner · title+meta · key dates · tabs
all read as one continuous white identity zone. The white fill is opaque so the
gray tab content scrolls cleanly UNDER the bar when it's pinned (no
bleed-through). The `TabsList`'s existing `border-b border-divider-subtle` is the
white→gray seam; the gray wash begins only below that border. Panel/sheet keep
`pt-3` with no fill, unchanged.

## #7 — key dates no longer vanish on scroll

Before: the user noticed the key-date strip disappearing when the header
collapsed on scroll. The anchor dates (Filing / Internal / Payment) are
reference the CPA needs while reading the tab content.

After: the collapse is smarter. The key-date block stays in the
**non-scrolling white header** (so it never scrolls away), and it swaps form by
state:

- **Expanded** — the full three framed key-date cards (`PrimaryDeadlineStrip
variant="cards"`).
- **Collapsed** (on scroll) — a single condensed one-line summary
  (`Filing <date> · Internal <date> · Payment <date>`) so the pinned header
  stays compact yet the dates remain reachable.

The condensed line is built inline from the same real row fields the cards use
(`filingDueDate ?? baseDueDate`, `extensionInternalTargetDate ?? currentDueDate`,
`paymentDueDate`) via `formatDate` — no new data, no fiction. Labels use the `t`
macro (not `plural()`/`i18n._`, per the lingui footgun). Each leg is gated on its
date being present.

## Net effect

White header (banner · title+meta · key dates · tabs) on top, gray tab content
scrolling beneath the pinned white tab bar. On scroll the hero collapses but the
key dates persist as a one-line summary.

## Verification

- `tsgo --noEmit` clean
- `vp test -- run obligations` — 89 passed (7 files)
- `vp fmt --write` applied
- Manual: page mode at a short viewport — confirmed white header bg
  (`rgb(255,255,255)`), gray scroller bg (`rgb(242,244,247)`), sticky tab bar
  bg white with `border-b` seam, and the condensed `Filing · Internal · Payment`
  line rendered in the collapsed (103px) header after scrolling.
