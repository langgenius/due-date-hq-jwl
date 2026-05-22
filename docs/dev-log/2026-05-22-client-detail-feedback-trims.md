---
title: 'Detail trims: fix chip click bug, drop Imported, drop Team tile; seed user-journey doc'
date: 2026-05-22
author: 'Yuqi pairing with Claude'
area: ux
---

# Detail-page feedback trims after the D-2/D-3 pass

Quick follow-up commit after Yuqi reviewed Commit 3 + 4 in the demo
space. Three small fixes and one strategic doc.

## 1. Fix: readiness chip click target

The "Needs filing state" chip in the title row was a `<Badge>` wrapped
in a `<button>`. Two problems:

- Nested-interactive DOM (the title is an `<h1>`; a button inside an
  h1 inside a flex row inside the PageHeader is fragile).
- The wrapper button's hit area was the Badge's intrinsic size, but
  the flex alignment caused inconsistent click behavior.

**Fix:** use the Badge primitive's own `render` prop (base-ui's
`useRender`) to make the Badge **itself** the `<button>` root. One
interactive element, one hit target, no wrapper.

```tsx
<Badge variant="destructive" render={<button type="button" onClick={openMissingFacts} />}>
  <BadgeStatusDot tone="error" />
  <MissingFactsLabel readiness={readiness} />
</Badge>
```

## 2. Drop the Imported / Manual provenance chip

`ClientSourceMetaRow` (added in D-2 as a quiet replacement for the
old identity strip's source badge) is removed.

Reasoning:

- Most clients are `Manual` by default; labeling it adds noise
- The `Imported` chip never changed a CPA's behavior — provenance is
  an audit-time question, not a daily-driver scan signal
- Import history is still discoverable via the `/clients` header's
  Import-history drawer

## 3. Drop the Team tile from `ClientSummaryStrip`

The Team tile counted unique `reviewerUserId`s across the client's
obligations — a weak signal that didn't tell the CPA who's actually
on this client. Yuqi flagged it: "team 需要展示吗?"

Two-tile shape now: **Next due / At risk**. The `teamCount` useMemo
is gone too.

A proper Owner / avatar-stack treatment (matching the obligations
queue's owner column) is queued as a follow-up — see the
user-journey doc below.

## 4. New: user-journey design placeholder

Yuqi's review surfaced the bigger strategic question:

> 因为现在 xxx at risk, 点击会去别的页面，现在一整个链路和 user
> journey 和 experience 都很零碎了。这是一个产品整体的问题，你需要
> 设计所有的用户动线，另外准备。

I created `docs/Design/clients-user-journey-2026-05-22.md` as a
holder. It captures:

- The problem (most signals on `/clients/[id]` eject the user)
- A table of every clickable element + where it currently goes
- The strategic question: workspace vs. dashboard contract
- 5 sub-questions to design through (at-risk in-place, Pulse review
  in-place, Team / Owner surfacing, audit log panel-vs-page,
  cross-surface state after destructive actions)
- A "next session" plan for when Yuqi runs the focused effort

The doc is **explicitly not** a design — it's a scope holder. No
follow-up commit should try to "implement" it as-is.

## Files

- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  - Readiness chip: drop `<button>` wrapper, use Badge `render` prop
  - Remove `<ClientSourceMetaRow>` render in the body
  - Delete the `ClientSourceMetaRow` component definition (still
    keeps `ClientSourceBadge` since it's used in the list-page row)
- M `apps/app/src/features/clients/ClientSummaryStrip.tsx`
  - Remove Team tile + its `teamCount` useMemo
  - Switch grid from `sm:grid-cols-3` to `sm:grid-cols-2`
- A `docs/Design/clients-user-journey-2026-05-22.md` (placeholder
  scope holder for the strategic effort)
- A this dev-log

## Verification

- `npx tsc --noEmit -p apps/app/tsconfig.json` → clean
- Manual:
  - Click "Needs filing state" chip → reliably opens filing-
    jurisdictions editor + scrolls
  - Page body no longer shows "Imported" / "Manual" pill below
    header
  - SummaryStrip shows 2 tiles (Next due / At risk), not 3
