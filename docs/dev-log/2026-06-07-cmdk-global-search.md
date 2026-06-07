# ⌘K global search — entity search + restyle

Date: 2026-06-07

Pencil `v4WcY8` — restyles the command palette to the global-search shell
(filter pills, entity result rows with matched-substring highlighting, keyboard
hint footer) and wires the first real entity source: **clients**.

## What shipped (NO contract/DB change)

- `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx`
  - **Real client search.** Fetches `orpc.clients.listByFirm` (the same query
    the title switcher / cycle arrows use) while the palette is open, filters
    by name, caps to 6, and routes Enter to `clientDetailPath`. Earlier the
    palette honestly called itself a navigator because typing a client name
    returned "No commands found"; that gap is now closed for clients.
  - **Filter pills** (All / Clients / Deadlines / Alerts / Rules / Pages). All
    + Pages show everything; Clients shows entity rows; Deadlines / Alerts /
    Rules narrow the Pages list to that area (no entity backend wired for
    those here — see TODO).
  - **Matched-substring highlight** — the part of a client name matching the
    query renders in `text-text-accent`, the rest in `text-text-primary`.
  - **Footer** with keyboard hints (↑↓ navigate · ↵ open · esc close) + the
    "Global search · ⌘K" brand line.
  - Filtering is owned locally (`shouldFilter={false}`) so client search scans
    the full loaded window before capping, and the pills can scope nav +
    entities together. Permission-locked / disabled entries keep their badges.

## TODO(data)

Deadlines / Alerts / Rules have no client-side list query wired into the shell,
so their pills scope the Pages list rather than returning entity rows. A
unified `search.global` endpoint (indexing deadlines / alerts / rules and
ranking matches) would let those pills surface entity results like Clients
does. Until then every pill stays functional — none fakes rows it can't back.
