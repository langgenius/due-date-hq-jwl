# Clients table header → follow Deadlines (uppercase eyebrow)

**Date:** 2026-06-10

Feedback (Yuqi, /clients TableHead): "the table style should FOLLOW Deadline's
table. Please obey and polish."

The /deadlines obligation-queue table (`routes/obligations.tsx`) styles its `<Table>`
with an UPPERCASE header recipe: `[&_th]:bg-background-section`, `[&_thead_th]:h-9`,
and `[&_th_button]:!text-xs !font-semibold !uppercase !tracking-[0.5px]`. The
/clients table (`ClientFactsWorkspace`) had a bare `<Table className="table-fixed">`
with normal-case sort-button labels — so the two workbench tables diverged.

Applied the same header recipe to the /clients `<Table>`, and made the Assignee
header a plain span so it inherits the canonical uppercase TableHead style. This
**reverses** the earlier title-case Assignee fix (`57aeaca1`) — that read the
divergence backwards; the right target is to follow /deadlines (uppercase), not to
make the row internally title-case.

Verified live: all 6 headers compute `text-transform: uppercase`, 11px, on a
#f9fafb section-tinted header cell — matching /deadlines. tsgo clean (the 3
obligations.tsx errors are concurrent deadlines WIP).

Header-only for now; the body density (Deadlines uses text-base/px-3 vs the
clients list's text-sm/px-5 dense-scan) is left as a follow-up pending Yuqi's call.
