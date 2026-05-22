---
title: 'Commit 3: D-2 + D-3 — detail header hybrid + split alerts band'
date: 2026-05-22
author: 'Yuqi pairing with Claude'
area: ux
---

# Client detail — header hybrid + alerts split

Third commit from `docs/Design/clients-list-and-detail-critique-2026-05-22.md`.
Two cross-cutting changes on `/clients/[id]` that share the same
header surface.

## D-2 — Header full hybrid

### Before

```
← Clients

Riverbend Draft Client ▾                 ‹ 1/9 ›   + Add deadline   View all obligations   View audit log
1 open filing · next due May 6, 2026 · 1 late

[LLC]  [PA]  [Imported]  [Ready for rules]                       ← separate identity strip below
```

Two visual rows of chrome (title, then identity strip), three peer
action buttons competing for primary status, and "1 late" rendered in
the same color as "1 open filing" — no urgency signal.

### After

```
← Clients

Riverbend Draft Client ▾   [LLC] [PA] [NJ] [• Needs filing state]    ‹ 1/9 › ···  Archive  + Add deadline
1 open filing · next due May 6 · 1 late                              ↑ red, font-medium

Imported                                                              ← quiet meta below header
```

Concrete changes:

1. **Identity chips inline with the title.** Entity badge + filing-
   state chips render in the same row as the H1 + switcher chevron.
   When clicking, the eye lands on identity + name as one unit.
2. **Readiness chip is conditional.** Only renders when
   `readiness.status === 'needs_facts'` (e.g. `Needs filing state`).
   When ready, no ghost slot — the row contracts.
3. **Tone-coded subtitle.** Reworked `formatClientIdentitySubLine`
   from a plain string to `renderClientHeaderSubLine` returning JSX:
   - `1 late` is `text-text-destructive` + `font-medium`
   - When zero overdue, swap in a `✓ All on track` positive chip
     (text-text-success + check icon)
   - Other parts stay neutral
4. **Action cluster simplified.**
   - Cycle arrows (J/K nav) stay at the start
   - **New** overflow `···` menu hosts Pin / Download / Edit / View
     audit log — see "Overflow menu" below
   - **New** `Archive` button (outline + `ArchiveIcon`) opens a
     confirm AlertDialog → calls `clients.delete` (soft-delete)
   - `+ Add deadline` stays as the primary green button on the right
   - **Dropped** the standalone `View all obligations` button (was a
     destination, not an action — filing-plan is on the same page)
   - **Dropped** the standalone `View audit log` button (moved into
     the overflow menu so the daily-driver actions don't compete)
5. **Identity strip below the header retired.** Entity + states +
   readiness moved into the title row. `ClientSourceMetaRow` keeps
   the provenance chip (`Imported` / `Manual`) visible as a quiet
   meta line — it's not a status to act on, just metadata. The
   `ClientRadarBadge` was retired entirely because Pulse alerts now
   render in their own section below the header (see D-3).

### Overflow menu (`···`)

Hosts lower-priority actions that don't belong on the primary button
row. Two semantic buckets:

- **Planned, not yet implemented** (stub `onClick` → toast that
  links to this sequencing doc):
  - `Pin to sidebar` — adds the client to a sidebar quick-access list
  - `Download client PDF` — exports a client dossier
  - `Edit client info` — inline edit of identity fields
- **Implemented** (real link):
  - `View audit log` — routes to `/audit?entityId=...&entityType=client`,
    gated on `permission.can('audit.read')`

The toast intentionally references the sequencing doc by filename so
when a teammate runs into the stub they can see exactly where the
follow-up is tracked.

### Archive

`clients.delete` is a server-side soft-delete (sets `deletedAt` +
writes an audit row). The UI calls the action `Archive` because:

- CPA compliance requires audit-trail retention; "Delete" implies
  irreversible data loss, which mis-frames the actual semantics.
- "Archive" is what a CPA naturally says when describing
  "hide from daily views but keep for the record."

Flow:

1. Click `Archive` in the header → opens AlertDialog
2. Dialog explains the soft-delete semantics in plain language
3. Confirm → mutation fires → success toast → navigate to `/clients`
4. The archived client disappears from the active list

Pattern lifted from `members-page.tsx`'s remove-member confirm.

## D-3 — Split `ClientAlertsBand` into header chip + dedicated section

### Before

Single warning strip rendered every active signal in the same
visual treatment, regardless of weight or audience:

```
⚠ 2 Pulse alerts affecting this client       View on Radar →
⚠ 1 filing extended — payment is NOT extended
⚠ Missing required facts                     Add facts →
```

Three different signals at the same weight is wrong:

- **Missing facts** is a _page-level setup gap_ — the page itself
  isn't usable until it's fixed.
- **Pulse alerts** are _in-flight events_ — external news affecting
  this client right now.
- **Extension/payment mismatch** is also in-flight, but derived.

The CPA can't tell whether the page needs configuration or whether
something is happening to this client externally.

### After

**Missing facts → red chip inline with identity chips in the header
row.** Visible from the page-title scan; clicking the chip jumps to
the missing-facts editor (`openMissingFacts`). When the field is
filled, the chip disappears — no permanent eyesore.

**Pulse + extension → dedicated `Active alerts for this client`
section below the header.**

```
[📢 ACTIVE ALERTS FOR THIS CLIENT                              · 2 ]
─────────────────────────────────────────────────────────────────
[Form 1120-S]  myPATH portal outage May 6-7 — filings paused     Review ›
               Pennsylvania Department of Revenue
─────────────────────────────────────────────────────────────────
⚠              1 filing extended — payment is NOT extended
               Form 1120-S
```

- Section label (uppercase eyebrow with `MegaphoneIcon` + count
  chip) makes the audience explicit
- Tone-coded amber strip on the section header background
- Per-alert cards with state/tax-type prefix chip, alert title,
  source line, and a `Review` link per Pulse match
- Section disappears entirely when nothing is active

The legacy `ClientAlertsBand` + its three sub-row components are
gone. `ClientActiveAlertsSection`, `ClientActiveAlertsPulseCard`,
and `ClientActiveAlertsExtensionCard` replace them.

## Files

- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  - Title prop now wraps `ClientTitleSwitcher` + identity chips in a
    single flex row
  - `formatClientIdentitySubLine` (string) → `renderClientHeaderSubLine`
    (ReactNode, tone-coded)
  - Actions: dropped `View all obligations` + `View audit log` as
    peer buttons; added `ClientHeaderOverflowMenu` + `Archive`
  - Retired the identity strip; added `ClientSourceMetaRow` for the
    quiet provenance chip
  - Retired `ClientAlertsBand` + its three sub-rows; added
    `ClientActiveAlertsSection` + two card components
  - Added `useNavigate` to ClientDetailWorkspace + `archiveMutation`
    - `AlertDialog` confirm dialog
  - Lucide imports: + `ArchiveIcon, DownloadIcon, MegaphoneIcon,
MoreHorizontalIcon, PencilIcon, PinIcon, ScrollTextIcon`;
    − `ArrowUpRightIcon`
  - - `AlertDialog*` and `DropdownMenu*` primitive imports
  - − unused `type RequiredClientFact` import
- M en + zh-CN message catalogs — 13 new strings, all translated
- A this dev-log

## Verification

- `npx tsc --noEmit -p apps/app/tsconfig.json` → clean
- `pnpm --filter @duedatehq/app i18n:compile --strict` → clean
- Manual:
  - Client with `Needs filing state`: red chip renders inline in
    title row; clicking jumps to the filing-jurisdictions editor;
    once filled, chip disappears
  - Client with overdue obligations: subtitle shows `1 late` in red
  - Client with zero overdue: subtitle shows `✓ All on track` chip
  - Action cluster: cycle arrows / ··· / Archive / + Add deadline,
    in that order
  - `···` menu: Pin/Download/Edit all toast "coming soon"; View
    audit log routes correctly
  - Archive button: confirm dialog explains semantics; confirming
    archives + navigates to /clients; toast confirms
  - Active-alerts section renders only when there's a Pulse match
    or extension mismatch; section header reads `ACTIVE ALERTS FOR
THIS CLIENT · N`

## What's still TODO from D-2

These three icons fire toasts today; wire to real features in their
own commits:

- D-extra-3a: Pin to sidebar (needs per-user favorites store)
- D-extra-3b: Download client PDF (needs export endpoint)
- D-extra-3c: Edit client info (needs `clients.update` mutation)

The sequencing doc already tracks these in the P2 backlog.

## What's next

Commit 4 (revised): the Work-section card-frame removal (D-5) and
positive status chip primitive (D-3 cont.) — both are visual-only and
land cleanly together. After that, we open the L-9 banner question
(in-place filter vs session snooze) since it's the last remaining
P0 item from the doc.
