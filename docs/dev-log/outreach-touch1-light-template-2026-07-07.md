# Outreach: touch-1 swapped to a light, Inbox-friendly template

**Date:** 2026-07-07
**Area:** `outreach-kit/send-outreach.mjs`

## Why
The v11 touch-1 email was a rich HTML card (serif hero + Georgia alert table + cid-embedded logo
image). Live testing showed it lands in Gmail **Promotions**. A plain/light version of the same
message lands in **Primary/Inbox**. For cold outreach, Inbox placement beats a card nobody sees.

## Change
`buildTouch1()` now returns a **light template**: system-font, single-column, one subtle brand link,
a text signature, hairline footer — **no card, no table, no image attachment**. Copy rewritten to
the full product loop and reader-first:

> **Subject:** DueDateHQ — deadline monitoring for US CPAs, and who it hits
>
> When the IRS, a state, or FEMA moves a filing deadline, the hard part is knowing which of your
> clients it hits. DueDateHQ watches all three around the clock. The moment a date moves, it shows
> you exactly which clients are affected — with the official notice — and lets you update their
> deadlines in one click. Paste your client list; first sourced deadline in ~10 minutes. Want in?

- Keeps the per-recipient `Hi {first}` (from `firstNameOf`); subject is now universal (no track split).
- Dropped the wordmark image + its Buffer import; removed the dead v11 card code.
- Plain-text footer still appended by `withFooter()`; HTML footer inline. `astro`/`node --check` clean;
  dry-run confirms the new subject on every recipient.

## Note
Copy accuracy: the loop is monitor (IRS/state/FEMA) → who's affected → one-click apply → source — all
shipped (code-audited). Honest nuance kept out of the cold email: disaster changes are auto-detected
then partner-reviewed before apply, and apply is Pro/manager-gated (not "fully automatic").
Touch-2/3 unchanged (plain text from the sequence CSV; concierge `buildTouch2` still lives on an
unmerged branch).
