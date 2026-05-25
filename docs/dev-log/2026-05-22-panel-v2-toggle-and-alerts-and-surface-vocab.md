---
title: 'Obligation Panel V2 (opt-in toggle), Alerts vocabulary cleanup, SurfaceSummaryStrip primitive'
date: 2026-05-22
author: 'Yuqi pairing with Claude'
area: ux
---

# Three threads landed: panel V2 (toggle), alerts vocab, and surface-vocab Step 1

Companion plan docs (committed earlier today):

- `docs/Design/obligation-panel-v2-and-alerts-vocabulary.md`
- `docs/Design/unified-table-surface-vocabulary.md`

Three pieces of work shipped together so the merge stays tidy.

## Thread 1 — Alerts vocabulary

The sidebar said "Alerts", the page said "Pulse Notification", the
breadcrumb said "Pulse alerts." The `pulse-vocabulary.md`
single-source-of-truth doc said "Always 'Pulse alert' (singular noun)."
Three drift directions for the same surface.

Reconciled with an **engine-name vs surface-label split**: "Pulse" is
now only the internal engine name (code, ports, contracts, logs).
"Alerts" is the only user-facing label.

Renames:

- `apps/app/src/routes/rules.pulse.tsx` — page title + breadcrumb
- `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx` — palette entry label
- `apps/app/src/features/pulse/AlertsListPage.tsx` — H1
- `apps/app/src/features/dashboard/needs-attention-section.tsx` — section h2 + aria-label

The page-preferences and email-list copy keeps "Pulse alerts" because
those contexts genuinely need to disambiguate from other notification
types — the rule in the vocab doc covers that.

`docs/Design/pulse-vocabulary.md` got a 2026-05-22 revision section at
the top explaining the split. The old "Always 'Pulse alert'" rule
narrows in scope rather than getting overridden.

Bonus: added a TODO comment in `app-shell-nav.tsx` next to the
`useInboxUnreadCount()` call. The badge will overcount once
@-mentions / status notifications start landing. Tracked in the plan
doc for follow-up.

## Thread 2 — Obligation Panel V2 as an opt-in toggle

Yuqi shared three sketch screenshots of an alternative right-panel
shape with horizontal status pipeline + dispatched active-stage card

- sections instead of tabs + light footer.

Shipped V2 as an **opt-in toggle**, not a replacement. URL flag:

```
http://localhost:5173/obligations?id=…&drawer=obligation&panel=v2
```

Default = V1 (existing panel). Adding `?panel=v2` flips to the new
shape. Each panel has an inline link to switch:

- V1 chrome: "Try the new panel shape →" (sets `?panel=v2`)
- V2 chrome: "← Back to original panel" (clears the param)

New files:

- `apps/app/src/features/obligations/ObligationPanelV2.tsx` — the new shape (~430 lines)
- `apps/app/src/features/obligations/ObligationPanelDispatcher.tsx` — chooses V1 or V2
- `apps/app/src/features/obligations/use-obligation-panel-version.ts` — nuqs-backed version hook

Call-site swap (V1 → dispatcher):

- `apps/app/src/routes/obligations.tsx` — queue right column
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` — client detail right column

V2 is intentionally feature-thin. It demonstrates the **visual** shape:

- Compact header with jurisdiction chip + form + tax year
- 6-stage horizontal pipeline with first-entry date stamps (computed
  from `auditEvents` action='status_changed')
- Active-stage card that dispatches body content per status
  (`pending` / `waiting_on_client` / `blocked` / `review` / `done` / `completed`)
- Sections (not tabs): Deadlines, Period (fiscal-only), Evidence,
  Documents received
- Light footer: Copy link · Close

Status changes still happen in V1 for now — V2's pipeline is read-only
display. Promoting V2 (replacing V1) is a separate decision; the toggle
exists explicitly so designers can compare side by side before
committing.

## Thread 3 — Unified surface vocabulary, Step 1

Per `docs/Design/unified-table-surface-vocabulary.md`, the first
concrete primitive: `<SurfaceSummaryStrip>`.

This will replace three drifted shapes once Steps 2-5 land:

- Rule library V3's `StatsBar` (4 columns + entity chips)
- Clients list's `ClientsActionStrip` (3-tile grid)
- Obligations queue's scope-tabs-as-stats

New module:

- `apps/app/src/features/_surface-vocabulary/SurfaceSummaryStrip.tsx`
- `apps/app/src/features/_surface-vocabulary/SurfaceSummaryStrip.test.tsx` — 7 tests, all passing
- `apps/app/src/features/_surface-vocabulary/index.ts` — re-exports

Underscore-prefixed folder name advertises "this is a shared vocabulary
module, not a feature."

API shape:

```ts
<SurfaceSummaryStrip
  label="Clients"
  items={[
    { key: 'at-risk', value: 5, label: 'at risk', tone: 'warning', onClick: applyAtRiskFilter },
    { key: 'waiting', value: 12, label: 'waiting on client', tone: 'review' },
    { key: 'pulse', value: 2, label: 'Pulse hits', href: '/rules/pulse' },
  ]}
  loading={isLoading}
  detailHref="/clients/import-history"
  detailLabel="Import history"
/>
```

Zero-value items render with `text-text-muted` regardless of declared
tone — no more "0 needs review" screaming in red.

Steps 2–5 (apply to Rule library, Clients list, Obligations, then
convert Client detail Tabs → Sections) are queued for the next session.

## Verification

- `npx tsc --noEmit -p apps/app/tsconfig.json` → clean
- `pnpm --filter @duedatehq/app test -- run src/features/_surface-vocabulary` → 7/7 tests pass

## Files

### Thread 1 (Alerts)

- M `apps/app/src/routes/rules.pulse.tsx`
- M `apps/app/src/components/patterns/keyboard-shell/CommandPalette.tsx`
- M `apps/app/src/features/pulse/AlertsListPage.tsx`
- M `apps/app/src/features/dashboard/needs-attention-section.tsx`
- M `apps/app/src/components/patterns/app-shell-nav.tsx` (TODO comment)
- M `docs/Design/pulse-vocabulary.md` (engine-vs-surface split)

### Thread 2 (Panel V2)

- A `apps/app/src/features/obligations/ObligationPanelV2.tsx`
- A `apps/app/src/features/obligations/ObligationPanelDispatcher.tsx`
- A `apps/app/src/features/obligations/use-obligation-panel-version.ts`
- M `apps/app/src/routes/obligations.tsx` (call-site swap)
- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx` (call-site swap)

### Thread 3 (Surface vocab)

- A `apps/app/src/features/_surface-vocabulary/SurfaceSummaryStrip.tsx`
- A `apps/app/src/features/_surface-vocabulary/SurfaceSummaryStrip.test.tsx`
- A `apps/app/src/features/_surface-vocabulary/index.ts`

### Docs

- A `docs/dev-log/2026-05-22-panel-v2-toggle-and-alerts-and-surface-vocab.md` (this file)
