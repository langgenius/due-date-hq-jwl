---
title: 'Detail-surface unification: drawer for triage, page for deep work'
date: 2026-05-20
author: 'Claude'
area: ui
---

# Detail-surface unification

## Context

Six detail nouns in the app had drifted across surface types — Obligation
in a drawer, Client mixed between drawer and dedicated page, Rule split
across drawer / dialog / inline, Notification in a drawer, Team member
on a page, Practice settings on a page. The mix forced CPAs to relearn
"how do I open this" per noun, and three of the detail surfaces (Client
drawer, Rule drawer, ad-hoc rule dialogs) competed for the same purpose
without consistent triage vs. deep-work affordances.

The approved decision map (from the design preview integration cycle):

| Noun             | Target                                | Reason                       |
|------------------|---------------------------------------|------------------------------|
| Obligation       | Drawer (unchanged)                    | Quick triage, return to list |
| Client           | Page (`/clients/<id>`)                | Deep context, multiple tabs  |
| Rule             | Inline panel in Coverage              | Already canonical            |
| Notification     | Drawer (unchanged)                    | Quick read + dismiss         |
| Team member      | Settings page (unchanged)             | Admin                        |
| Practice setting | Settings page (unchanged)             | Admin                        |

Rule of thumb: drawer for triage, page for deep work, dialog reserved
for confirmations and small forms only.

## Findings

Three offending detail surfaces in scope:

1. **Client drawer** in `ClientFactsWorkspace.tsx` — the table row click
   opened a right-side `<Sheet>` with the full `ClientDetailWorkspace`
   inside, and a separate "Open full view" button to escape to the
   dedicated `/clients/<id>` page. Two surfaces for the same noun.
2. **Rule library drawer** in `rule-library-tab.tsx` — clicking a rule
   row opened `RuleDetailDrawer` (a `<Sheet>` wrapping the same content
   the Coverage page already shows inline). Two surfaces for the same
   noun.
3. **Dashboard client-badge link** in `dashboard.tsx` — pointed to
   `/clients?clients=<id>&client=<id>`, which deep-linked into the
   Client drawer rather than the page.

Out of scope confirmed during audit (left alone):
- Pulse drawer — Pulse keeps drawer per the map.
- Obligation drawer — owned by another session; the existing "Open
  client detail" link in its header already points to `/clients/<id>`.
- Audit-event drawer, Evidence drawer, Import-history drawer — these
  surfaces aren't in the six-noun map and serve different purposes
  (audit reference, evidence pickers, batch lists).
- All Dialogs audited (`audit-log-page`, `members-page`, `obligations`
  saved-view and extension-memo dialogs, `WizardShell`, `ShortcutHelpDialog`,
  `app-shell-nav` command palette, `reminders-page`, `CreateClientDialog`)
  — every Dialog is a confirmation or small form. None render detail
  content for a noun.

## Decisions

### Client: drawer → page

- Removed the `<Sheet>` block from `ClientFactsWorkspace.tsx` along
  with all `selectedClient` / `onSelectClient` / `onClearSelectedClient`
  plumbing.
- Row click now calls `useNavigate('/clients/<id>')` directly.
- Removed the "Client detail" header button (which opened the drawer
  for the active client) — rows are now direct entry points; no extra
  CTA needed.
- Removed `data-state="selected"` highlighting from rows (no selection
  state remains).
- `clients.tsx` route trims the `client` URL key, the
  `handleSelectClient` / `handleClearSelectedClient` callbacks, and
  the `selectedClient` / `activeClient` derivations.
- `client-query-state.ts` drops the `client` parser.
- `CreateClientDialog` success now navigates to `/clients/<newId>`
  instead of pinning the new client open in the drawer.
- `ImportHistoryDrawer`'s "view imported client" navigates to the
  page instead of pinning the drawer.
- Dashboard `clientProfileHref` and the server-side opportunities
  `clientHref` now produce `/clients/<id>` instead of the old query-
  string form.

### Rule: drawer → inline-in-Coverage

- `rule-library-tab.tsx` no longer renders `RuleDetailDrawer`. The row
  click navigates to `/rules/coverage?rule=<id>` so the canonical
  inline panel (which Coverage already supports as URL-deep-linked
  state) handles the review.
- Dropped `selectedRuleKey` local state and the drawer-only
  `handleDrawerOpenChange` callback.

### Drawer file cleanup

- `rule-detail-drawer.tsx` keeps the file (Coverage imports
  `RuleDetailCompact` from it) but the now-unused `RuleDetailDrawer`,
  `RuleDetailContent`, and `RuleDrawerHeader` exports are removed along
  with the Sheet imports. `RuleDetailInline` and `RuleDetailCompact`
  remain as the canonical inline-rendering exports.

## Verification

- `vp check` passes on all `apps/app/src/` and `apps/server/src/`
  files. The 24 remaining errors are pre-existing config-file
  TypeScript module-resolution errors unrelated to this change
  (vite.config.ts, astro.config.mjs, lingui.config.ts).
- E2E expectations updated: `clients.spec.ts` and `opportunities.spec.ts`
  now expect `/clients/<uuid>` URLs after row / "Open client" clicks.
- Server unit test `opportunities/index.test.ts` updated to match the
  new `clientHref` output.

## Not in scope

- Tax-code rendering — separate workstream.
- Obligation drawer behavior, bulk actions, j/k nav — owned elsewhere.
- The Sheet primitive itself — already patched recently.
- Coverage inline panel structure — that's the canonical pattern this
  unification points to.
- v1/v2 feature-flag wiring.
