---
title: 'Client peek: switched from click-to-open drawer to hover-triggered PreviewCard'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: clients
---

# Client peek: hover card replaces click drawer (Obligations queue)

## Change

The eye icon on Obligations queue rows used to open a slim
`ClientDetailDrawer` (Sheet sliding in from the right) on **click**.
It now opens a **hover-triggered popover** (`ClientPeekHoverCard`,
backed by Base UI's `PreviewCard` primitive) anchored next to the
eye icon.

Same content (name, entity/state/readiness chips, single-line next
due, Open full page + All obligations buttons), just delivered via
hover instead of click. The popover stays open as the cursor moves
into it so the action buttons remain clickable.

## Why

Earlier today: the click-to-open drawer was redesigned to a slim
identification peek (committed `9063090`). User feedback: "can it
just be a brief tooltip instead?"

A tooltip is a better fit for the "wait, who is this client?"
question — it reads as ambient, doesn't shift focus, costs zero
clicks. The previous drawer was a heavier modal surface than the
question warranted.

## New primitive

`packages/ui/src/components/ui/preview-card.tsx` wraps Base UI's
`PreviewCard` (separate from Popover, which is click-driven). Same
API shape as the existing Popover wrapper so callers stay
predictable:

```tsx
<PreviewCard>
  <PreviewCardTrigger render={<button>…</button>} delay={150} closeDelay={200} />
  <PreviewCardContent side="bottom" align="start">
    …
  </PreviewCardContent>
</PreviewCard>
```

Delays on the Trigger (150ms open, 200ms close) reduce flicker on
accidental cursor passes and give the user time to move into the
popover content without it dismissing mid-traversal.

## New peek component

`apps/app/src/features/clients/ClientPeekHoverCard.tsx`. Single
prop interface — `<ClientPeekHoverCard clientId={x}>{triggerElement}</ClientPeekHoverCard>`.
The trigger element is whatever the call site already had (eye
icon button, name span, etc.); the popover renders the slim peek
body.

Body content matches the previous drawer:

- Name + caption ("S corp · 1 open obligation")
- Identity chips (entity, state, readiness)
- Single-line next due (with `TaxCodeLabel` for friendly form names)
- Open full page + All obligations buttons

Data fetching only fires when the popover actually mounts — Base
UI's PreviewCard unmounts content when closed, so the queries
don't run until the first hover.

## What migrated, what didn't

| Call site                                                           | Status                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `apps/app/src/routes/obligations.tsx:1199` — queue row eye icon     | **Migrated.** Wraps eye button with `<ClientPeekHoverCard>`. No more `openClientPeekDrawer` call. |
| `ClientFactsWorkspace.tsx:484, 801` — related-client list eye icons | **Not yet migrated.** Still uses the click drawer via `useClientDrawer`. Follow-up.               |
| `obligations.tsx:3626` — other "open client" trigger                | **Not yet migrated.** Follow-up.                                                                  |

The `ClientDetailDrawer` component remains mounted at the shell
layout via `ClientDrawerProvider` for the unmigrated call sites.
Once all four sites are migrated, the drawer + provider can be
retired entirely.

## Test plan

- `/obligations`, hover the eye icon on any row (visible on row
  hover or keyboard focus). Popover opens with identity + next-due
  - action buttons.
- Move cursor INTO the popover — stays open.
- Move cursor away from both → popover dismisses after ~200ms.
- Tab to the eye icon → popover opens via keyboard focus.
- Click "Open full page" inside the popover → navigates to
  `/clients/[id]`.
- Other surfaces with eye icons (e.g. Client detail page's related
  client list) still use the click drawer; behavior unchanged
  there until separate migration.
