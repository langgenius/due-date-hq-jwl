---
title: 'Clients detail — identity strip + Radar/Filings renames + hide Delete (stage 3c)'
date: 2026-05-19
area: app
---

# Clients detail — identity + naming + hide Delete (stage 3c)

The identity header was a stack of badges + a generic name + a small
entity sub-line. Stage 3c restructures it into a glanceable strip that
matches the reference design's title-row pattern, renames the Pulse
internal label to "Radar" wherever the user sees it, makes the Radar
impact panel render only when relevant, and hides the Delete affordance.

## Identity strip

New three-row layout in the header card:

1. **Status chips row** — Source · Readiness · Radar pill (only when
   active matches exist).
2. **Title row** — large client name + entity badge (uppercase, blue
   info chip) + state chips (uppercase, mono, dark-secondary, ≤3 visible
   with a `+N` overflow chip).
3. **Sub-line** — sentence-style summary, all separated by middots:
   - For LLC clients with a non-trivial tax classification: a leading
     "taxed as partnership / S corp / C corp / disregarded entity"
     phrase. Per anti-pattern #2 of the product model (LLC is not a
     fixed tax form), surfacing this matters even on the read view.
   - "N open filing(s)"
   - "next due {date}" when there's an upcoming open obligation
   - "all on track" or "N late" — driven by `workPlan.overdueOpenCount`

Removed: the entity-only sub-line, the standalone jurisdictions chip,
and the right-side Delete button.

## Hidden: Delete client

The Delete affordance is gone from the detail page surface. With it I
removed:

- The `Trash2Icon` import.
- The whole `AlertDialog` confirmation block at the bottom of
  `ClientDetailWorkspace`.
- `deleteClientMutation` (no longer triggered from any UI).
- The local `deleteDialogOpen` state.
- The `canDelete` prop on `ClientDetailWorkspace` and
  `ClientFactsWorkspace`.
- The `onClientDeleted` prop on the same components, and its callsites
  in `apps/app/src/routes/clients.tsx` and
  `apps/app/src/routes/clients.$clientId.tsx`.
- The corresponding `client.write` permission lookup in both routes.
- The `AlertDialog*` imports.

If/when a delete affordance returns, the right home is a kebab menu on
the identity header. Today's change is a clean removal so dead-code
warnings stay off.

## Renames

- **"Pulse impact"** → **"Radar impact"**. Empty-state copy updated too
  ("No Radar matches" / "This client is clear of the current Radar
  queue"). The user-facing label is now consistent with the sidebar's
  "Radar" entry; the internal `orpc.pulse.*` routes / component names
  ("`ClientPulsePanel`") are unchanged per the existing convention.
- **"Work plan"** → **"Filings & deadlines"**. Closer to the deadline
  ops vocabulary the product is built around. Description copy
  unchanged.

## Conditional Radar panel

The Radar impact card now renders only when:

- `pulseMatches.length > 0`, OR
- the pulse query is still loading.

Otherwise it's hidden — empty-state cards are noise on a page that
already has space-conscious collapsibles.

## Files

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`:
  - Rewrote the identity header (3 rows, drops standalone jurisdictions
    chip and the Delete button).
  - Added `ClientFilingStateChips`, `taxClassificationLabel`, and
    `formatClientIdentitySubLine` helpers.
  - Made Radar impact panel conditional on matches or loading.
  - Removed Delete UI and the entire `canDelete` / `onClientDeleted` /
    `deleteClientMutation` chain (incl. AlertDialog imports and
    `Trash2Icon` import).
  - Renamed "Work plan" → "Filings & deadlines", "Pulse impact" →
    "Radar impact" in surface copy.
- `apps/app/src/routes/clients.tsx`:
  - Dropped `canDeleteClients`, `handleClientDeleted`, and the
    corresponding workspace props.
- `apps/app/src/routes/clients.$clientId.tsx`:
  - Dropped `canDeleteClients`, `handleClientDeleted`, and the
    `useNavigate` / `useCallback` / `useQueryClient` imports that
    became unused.

## Validation

- `pnpm check` (579 files, 0 warnings, 0 errors)
- `pnpm --filter @duedatehq/app test -- --run` (40 files, 208 tests)
- Manual:
  - Side panel `http://localhost:5178/clients` → click a row: identity
    strip renders cleanly. No Delete button anywhere.
  - Full page `http://localhost:5178/clients/<id>`: same. State chips
    render uppercase mono.
  - Radar impact card hidden when no matches; appears only when there
    are active Radar alerts for the client.
  - Section title now reads "Filings & deadlines".

## Next stage

- **3d**: unified alerts band above Filings & deadlines that absorbs
  Radar matches + future extension-without-payment warning +
  missing-facts cue. Once present, the Radar impact panel can either
  fold into that band or move below the table.
