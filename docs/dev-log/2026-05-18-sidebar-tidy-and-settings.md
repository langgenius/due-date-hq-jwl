---
title: 'Sidebar Tidy & Settings Hub'
date: 2026-05-18
author: 'Claude'
area: app-shell
---

# Sidebar Tidy & Settings Hub

## Context

Following the Rules-tabs-to-pages refactor (see
[2026-05-18-rules-console-tabs-to-pages.md](2026-05-18-rules-console-tabs-to-pages.md)),
the sidebar still carried a "Practice" section with five workspace-config
destinations (Practice profile, Team workload, Members, Billing, Audit log)
plus three operational-config destinations (Reminders, Notifications,
Calendar sync). These are setup / governance surfaces touched a few times
per year, not daily work — they were pulling weight in a CPA's daily nav
that they hadn't earned.

The canonical product spec
(`美国小型会计事务所报税种类、流程与规则产品指南.pdf`) re-emphasizes that
the primary surface for a small CPA practice is the daily filing-season
workbench: **Dashboard · Obligations · Pulse · Clients · Opportunities ·
Rule library**. Workspace configuration belongs behind a Settings hub.

Pulse separately deserves promotion to a direct sidebar entry — it's the
"state-announcement loop" the problem statement calls the _spine_ of the
business, and burying it under a Rules collapsible parent diluted that.

## Change

- New route `/settings` (`apps/app/src/routes/settings.tsx`) — workspace
  config hub with four sections: Practice (Practice profile / Members /
  Team workload), Billing, Compliance (Audit log), Automation (Reminders
  / Notifications / Calendar sync). Each row links to its existing route
  (no URL migration; legacy bookmarks keep working).
- Sidebar (`apps/app/src/components/patterns/app-shell-nav.tsx`)
  rewritten to a flat 6-entry primary list — Dashboard · Obligations ·
  Pulse · Clients · Opportunities · Rule library — with a single
  Settings entry below in a muted footer group. Section labels
  ("Operations / Clients / Practice") all removed: at 6 entries they
  were adding weight without information.
- Pulse promoted to a direct entry. The collapsible Rules parent and its
  `NavMenuCollapsibleItem` component are removed. Rule library is a
  single direct entry pointing to `/rules/library`. Temporary rules is
  no longer a sidebar destination — it's a state of an applied Pulse
  alert, reachable from alert detail or obligation detail. A follow-up
  pass will surface "Status: Applied" as a filter inside the Pulse page
  for the rolled-up view.
- Command Palette gains a `Settings` entry. The existing per-route
  entries stay accessible via ⌘K (power users may still want them); a
  future pass can re-group them under a "Settings" group label.

The personal account surface (`/account/security`, sign-out, theme
toggle) stays in the existing `UserMenuTrigger` dropdown — different
conceptual level from workspace settings.

## Sidebar shape (before → after)

```
BEFORE                              AFTER
──────                              ──────
OPERATIONS                          Dashboard
  Dashboard                         Obligations
  Obligations                       Pulse
  Rules ▾                           Clients
    Coverage                        Opportunities
    Sources                         Rule library
    Rule library                    ─────
    Pulse changes                   Settings
    Temporary rules
  Reminders                         (UserMenuTrigger at footer
CLIENTS                              still holds Account security,
  Clients                            sign out, theme)
  Opportunities
PRACTICE
  Practice profile
  Team workload
  Members
  Billing
  Audit log
```

## Out of scope (next passes)

- Merge Coverage + Sources + Library content into one `/rules` page
  (currently three separate routes still backing the single sidebar
  entry).
- Re-group Command Palette entries: move hidden-from-sidebar routes
  into a `Settings` palette group instead of a flat `Navigate` list.
- Surface a "Status: Applied" filter on Pulse that exposes the
  Temporary rules data without needing a dedicated sidebar slot.

## Validation

- `pnpm check`
- `pnpm test`
