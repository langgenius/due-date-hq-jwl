# Breadcrumb pass across sub-pages

**Date:** 2026-05-21
**Branch:** `design/preview-integration`

## Problem

After landing on `/rules/sources`, `/rules/pulse`, `/audit`, `/members`,
`/billing`, `/practice`, `/account/security`, or `/clients/[id]`, the user
had no visible way back to the parent surface. The only existing pattern
was `SettingsBackLink` — a one-off `← Back to Settings` chip used on three
Settings sub-pages — and `OriginBreadcrumb`, which only renders for
filter drill-ins (`?from=coverage`). Neither covered the general "where
am I and how do I climb up" need.

## Approach

PageHeader already had an unused `eyebrow` slot at 11px / uppercase /
0.08em tracking. Reusing that visual rhythm for a breadcrumb keeps the
chrome quiet: no extra height, no new typographic weight.

Added one primitive and threaded one new prop:

```tsx
// apps/app/src/components/patterns/breadcrumb.tsx
<Breadcrumb items={[{ label: 'Rule library', to: '/rules/library' }, { label: 'Sources' }]} />
```

```tsx
// apps/app/src/components/patterns/page-header.tsx
<PageHeader breadcrumbs={[...]} title="Sources" />
```

The first segment with a `to` is treated as the "parent" — its `title`
attribute carries `Go back · ⌘[ / Ctrl+[` so users discover the native
browser back shortcut without us hijacking the keystroke. The last item
renders as plain text with `aria-current="page"`.

## Pages touched

| Page                | Breadcrumb                         |
| ------------------- | ---------------------------------- |
| `/rules/coverage`   | `Rule library › Coverage`          |
| `/rules/sources`    | `Rule library › Sources`           |
| `/rules/pulse`      | `Rule library › Pulse alerts`      |
| `/rules/preview`    | `Rule library › Preview & approve` |
| `/audit`            | `Settings › Audit log`             |
| `/reminders`        | `Settings › Reminders`             |
| `/members`          | `Settings › Members`               |
| `/practice`         | `Settings › Practice profile`      |
| `/account/security` | `Settings › Security`              |
| `/billing`          | `Settings › Billing`               |
| `/clients/[id]`     | `Clients › [client name]`          |

`/notifications` (Inbox) is a **top-level** sidebar destination, not a
Settings sub-page — no breadcrumb added.

`Dashboard`, `Obligations`, `Clients` (list), `Calendar`, `Rule library`,
`Opportunities`, `Settings` — all root-level destinations, intentionally
left without breadcrumbs.

## Cleanup

- Deleted `apps/app/src/components/patterns/settings-back-link.tsx`. The
  Audit / Reminders pages now use the structural breadcrumb instead of
  the bespoke `← Back to Settings` chip.
- `Clients › [client name]` replaced the standalone "Back to clients"
  ghost button on `/clients/[id]`, recovering ~36px of vertical space
  and matching the rest of the app.
- `OriginBreadcrumb` (the "Pre-filtered from Coverage · Clear" pill)
  stays — it's a filter-origin marker, structurally distinct from the
  IA breadcrumb. Both can coexist on the Library list page.

## Rule drawer exit affordance — already in place

While auditing the review-mode drawer (`?rule=<id>`), confirmed:

- ✅ X button in the drawer header with `aria-label="Close rule detail"`
  and `title="Exit review · Esc"`
- ✅ Esc key handler at `coverage-tab.tsx:385-391` wired to
  `setSelectedRuleId(null)`

Compact mode intentionally unmounts the page header (including the
breadcrumb) to maximize focus during review. The drawer's X button is
the in-context back-affordance; clicking it returns to the matrix view,
which re-mounts the breadcrumb.

## Files changed

- `apps/app/src/components/patterns/breadcrumb.tsx` (new)
- `apps/app/src/components/patterns/page-header.tsx`
- `apps/app/src/components/patterns/settings-back-link.tsx` (deleted)
- `apps/app/src/features/rules/rules-console-primitives.tsx`
- `apps/app/src/features/audit/audit-log-page.tsx`
- `apps/app/src/features/reminders/reminders-page.tsx`
- `apps/app/src/features/members/members-page.tsx`
- `apps/app/src/routes/rules.coverage.tsx`
- `apps/app/src/routes/rules.sources.tsx`
- `apps/app/src/routes/rules.pulse.tsx`
- `apps/app/src/routes/rules.preview.tsx`
- `apps/app/src/routes/practice.tsx`
- `apps/app/src/routes/account.security.tsx`
- `apps/app/src/routes/billing.tsx`
- `apps/app/src/routes/clients.$clientId.tsx`

Type-check: clean (`tsc --noEmit` exits 0 with no diagnostics).
