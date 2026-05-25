# 2026-05-25 — Clients import-history button copy

## Why

The `/clients` header action opened the import-history drawer, but its visible label
said "Archive". That read like a client archive/delete action even though the drawer is
for migration import history and recovery.

## Shipped

- Renamed the visible header action to "Import history".
- Aligned the button aria label/title with the drawer title.
- Swapped the icon from archive to history to match the destination.
