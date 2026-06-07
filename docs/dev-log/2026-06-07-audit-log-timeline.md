# Audit log — timeline restyle + KPI strip

Date: 2026-06-07

Pencil `RqOJw` — restyles the `/audit` event stream from a 6-column table
into a day-grouped timeline, and adds the KPI strip above the filters. The
wired infinite query, the client-side `q` search, the structural filters, and
the row → drawer behavior are all unchanged — only presentation moved.

## What shipped (NO contract/DB change)

- `apps/app/src/features/audit/audit-timeline-model.ts` (new)
  - Derives a coarse timeline *type* per event from the `action` prefix
    (FILING / AMENDMENT / DECISION / ACCESS / SYSTEM) — the contract has no
    per-event category (it's a server-side filter input only). Each type maps
    to a lucide icon + a tint built from existing
    `state-{success,warning,accent}` / `background-subtle` tokens.
  - `auditDayKey` / `auditDayBandLabel` / `auditTimeOfDay` — local-day bucket
    key + band label + HH:MM rail formatter, all in the firm timezone.

- `apps/app/src/features/audit/audit-log-table.tsx` — rewritten as the
  timeline. Same `{ events, firmTimezone, onOpenEvent }` props. Events group
  into local-day buckets with a band header ("Today · Fri · Jun 5, 2026" + N
  events); each row has a left time rail, a category-tinted icon tile, and a
  body (TYPE eyebrow · actor · short hash, change headline, mono meta chips).
  The row stays a focusable `role="button"` that opens the event drawer; the
  AI / AI-assisted provenance treatment is preserved.

- `apps/app/src/features/audit/audit-log-page.tsx` — adds `AuditKpiStrip`
  (single bordered card, columns split by vertical rules: Total / Filings /
  Amendments / Access / System). Counts come from `getAuditTimelineType` over
  the filtered event set so the strip tracks the active filters.

## TODO(data)

The KPI strip describes the **loaded** event window, not the whole ledger —
`audit.list` only returns the paginated page. A dedicated `audit.stats`
procedure (counts per category across the selected range) would let the strip
show true firm-wide totals. Flagged inline in `AuditKpiStrip`.
