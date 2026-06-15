# /today "+" → Add menu (2026-06-15)

Yuqi: "the add icon should hover to show add client or import data."

The /today header "+" used to do exactly one thing — open the bulk import
wizard. It now opens a dropdown offering both ways a CPA grows the
workspace:

- **Add client** — the single-client `CreateClientDialog` (everyday path)
- **Import data** — the bulk migration wizard (onboarding / batch path)

## Build
- New `features/dashboard/add-menu.tsx` (`DashboardAddMenu`) encapsulates
  the whole thing: the `clients.create` mutation (invalidates clients +
  dashboard, toasts, navigates to the new client), the import-wizard
  handoff, both permission gates, and the two dialogs. Keeps `dashboard.tsx`
  thin — the route no longer owns the wizard handle, so its now-dead
  imports (useMigrationWizard, useFirmPermission, requiredRolesLabel,
  PlusIcon, toast) were removed.
- Trigger keeps the collapsed primary-icon look; `aria-label="Add"`.
- **Click-dropdown, not hover-menu** — hover-only menus are unreachable by
  keyboard and touch. The icon reveals the choice on click; each item is
  permission-gated independently (disabled + "Requires … access" caption
  when the role can't do it).
- Each item is a two-line label + caption ("Create one client by hand" /
  "Bulk import from a file or another tool"). The default DropdownMenuItem
  is single-line height, so items get `h-auto items-start py-2` and the
  icons `mt-0.5` to sit on the title baseline — measured: 48px + 63px, zero
  overlap.

## Verify
tsgo clean; menu verified live (2 items, correct copy, no overlap, opens on
the "+"); catalogs re-extracted + 56 zh-CN filled (6 mine, rest the parallel
session's pending strings) → strict compile green, no drift.
Entity labels inlined (not imported from routes/clients.tsx) to avoid a
feature→route dep; the `Record<ClientEntityType,string>` type makes tsgo
catch any enum drift.
