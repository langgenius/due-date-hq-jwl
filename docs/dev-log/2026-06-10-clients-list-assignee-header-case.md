# Clients list — fix the lone uppercase column header

**Date:** 2026-06-10

On `/clients` (`ClientFactsWorkspace`), five column headers render title-case
("Client · States · Entity · Next due · Open deadlines") because the sortable
`SortButton` headers explicitly set `normal-case` (so they read as labels, not
eyebrows). The **Assignee** header is a plain `<span>` that didn't override the
table header's default `uppercase`, so it alone rendered "ASSIGNEE".

Added `normal-case` to the Assignee header span → "Assignee", consistent with the
rest. Verified live (computed `text-transform: none`, matching the Next-due
header).
