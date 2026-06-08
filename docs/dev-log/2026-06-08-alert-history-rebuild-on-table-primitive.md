# /alerts/history — rebuild the table on the canonical <Table> primitive

Date: 2026-06-08

Feedback: _"yes, please rebuild but it should look the same."_ (Follow-up to
the cohesion pass — make the history table share real structure with every
other table, not just matching tokens.)

## Change (`AlertHistoryView.tsx`)

The hand-rolled flex grid is replaced with the canonical
`<Table>/<TableHeader>/<TableBody>/<TableRow>/<TableHead>/<TableCell>`
primitives — same DOM and style source as every other table in the app:

- **No horizontal scroll preserved**: `<Table className="table-fixed">` plus
  the ALERT `<TableCell>` truncating its title + meta means columns honor
  fixed widths (checkbox 52 / date 104 / juris 72 / status 132) and the
  ALERT column flexes — content truncates instead of widening the table. The
  `<Table>` root has no overflow wrapper, so a scrollbar can never appear.
- **Month bands + loading/empty**: full-width `colSpan={5}` rows. Month bands
  keep the gray-200 (`#e9ebf0`) group-header fill.
- **Look unchanged**: header inherits the canonical `<TableHead>` treatment
  (bg-section, 11/600, tracking-0.5, tertiary); `[&>td]:py-3` keeps the prior
  compact row height (canonical default is py-4); zebra disabled via per-row
  `even:bg-transparent`; active rows keep the accent wash (incl. on hover);
  16px checkboxes; status pills still the `<Badge>` primitive.
- Rows are clickable `<TableRow>`s (onClick + Enter/Space + focus ring); the
  checkbox cell stops propagation so ticking a row doesn't open the drawer.

Verified live on :5177 — visually identical to the pre-rebuild table.
Typecheck + lint clean.
