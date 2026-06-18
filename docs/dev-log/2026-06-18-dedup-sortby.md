# /deadlines — one home for Sort-by (Hick's)

_2026-06-18 · design-call #4 of the pass-2 backlog_

The /deadlines toolbar exposed the grouping control (`group` param) **twice**: a
dedicated "Sort by" pill AND a "Sort by" submenu inside the View menu — with the
options in different orders (pill: due/urgency/client/filing; submenu:
urgency/due/client/filing). Two controls for one setting is a Hick's-law tax and
the drift made them look like different controls.

Yuqi added the visible pill on 2026-06-15 specifically to surface grouping out of
the View menu, so the pill is the intended home. Removed the duplicate submenu;
the View menu now owns Columns / Density / Actions only.

Verification: `tsgo` 0 (the pill still uses the radio components, no unused
imports); 543 app tests pass. (/deadlines is gated; change is a menu-item
removal, type-checked + tested.)
