# 2026-06-11 — /alerts responsive contract + implementation

Audited /alerts at 7 widths (both modes), authored the breakpoint contract
(docs/Design/alerts-responsive.md, rhyming with the deadlines contract), and
implemented it:

- Pre-contract reality: the 380px rail was rigid at EVERY width — detail
  562px at 1024, 306px at 768 with the footer Dismiss clipped offscreen;
  fact grid stayed 4-col (cells ~116px); map view's fixed 460px list left
  the map ~500px at 1024.
- `AlertsListPage`: rail hidden below lg (split dissolves to drill-in;
  breadcrumb is the way back); map view stacks vertically below xl.
- `AlertDetailDrawer` + `DetailStatusBanner`: chrome padding px-12 →
  px-6 xl:px-12 (header / body / footer / both banner layouts).
- `AlertStructuredFields`: fact grid 4-col gated to xl (2-col below).
- Verified live at 1280/1024/900/768: zero x-overflow, footer intact,
  detail 818/686px at 900/768 (was 438/306), map stacks.

Mixed-file note: drawer + structured-fields carried the parallel session's
uncommitted work; committed via selective hunk staging (only the
xl:px-12 / xl:grid-cols-4 hunks), per the parallel-sessions git protocol.
