# `/clients/[id]` IA fix + Pulse demo-data variety

## Context

Two threads, one commit.

### Thread 1 — Client detail IA critique + higher-effort fix

Yuqi asked whether the 4-tab split on `/clients/[id]` was reasonable and
logical. A scored critique (Nielsen heuristics + persona walkthrough) returned
**27/40** — solid B+, with the losses concentrated on three heuristics that
shared one root cause: **labels under-delivered on contents**.

Three priority issues:

1. **"Client info"** undersold 5 sections of structured tax-setup data
   (Compliance posture, Filing jurisdictions, Risk profile, Onboarding state,
   Import source). Users guessed the wrong tab when looking for the EIN or risk
   profile.
2. **"Suggested forms"** hid Future business cues (advisory / scope-review /
   retention) under a label that promised only tax-coverage gaps. The partner
   persona looking for upsell signals would never look here.
3. **"Activity"** tab mashed three time horizons: AI summary (synthesis) +
   Notes (write-mode) + Audit log (history). Notes especially was misplaced:
   it's the most-common coordinator (Jules) action and lived inside a
   read-mode tab.

Yuqi approved the higher-effort fix path: **rename + relocate Notes**.

A second round of critique on the Notes shape itself surfaced that I had
optimized for the wrong case. Three of four personas (Sarah, Avery, partner)
hit Notes **read-first**; only Jules (coordinator) is write-first. The
slide-in I built first forced a click to *read* — backwards. The correct
shape is **inline preview + slide-in editor**: notes are persistent client
context (like the EIN or owner), always visible when present, with editing
one click away.

### Thread 2 — Pulse alerts demo-data variety

While testing the IA changes, Yuqi noted the Alerts panel for Miguel Chen
(manager role on Brightline) only ever showed `deadline_shift` change kinds.
The Pulse drawer's chip vocabulary (`filing_requirement` /
`applicability_scope` / `form_instruction` / `source_status` /
`new_obligation`) was unexercised in demo. Same for firm-alert statuses —
only `matched` and `applied` appeared.

## Change

### IA — tab labels (URL keys stable; visible labels changed)

| URL key (stable) | Old label          | New label         |
| ---------------- | ------------------ | ----------------- |
| `?tab=work`      | Work               | **Filing plan**   |
| `?tab=info`      | Client info        | **Setup**         |
| `?tab=opportunities` | Suggested forms | **Opportunities** |
| `?tab=activity`  | Activity           | **History**       |

### Notes — new write path + inline preview pattern

**Contract** (`packages/contracts/src/clients.ts`)
- `ClientNotesUpdateSchema` + `ClientNotesUpdateOutputSchema`
- `clientsContract.updateNotes` procedure
- Re-exports from `packages/contracts/src/index.ts`

**DB / ports** (`packages/db/src/repo/clients.ts`, `packages/ports/src/clients.ts`)
- New `updateNotes(id, notes)` repo method
- Mirrored in the `ClientsRepo` port interface

**Server** (`apps/server/src/procedures/clients/index.ts`)
- New `updateNotes` handler — single-purpose, audited as
  `client.notes.updated`, short-circuits on no-diff, whitespace-trim → null
  normalization
- Three test mocks updated (`migration/_service.test.ts`,
  `obligations/_service.test.ts`, `obligations/index.test.ts`)

**UI** — two new components, both following the DS-first rule established
in `docs/Design/DueDateHQ-DESIGN.md` v2.2:

- **`<ClientNotesPanel>`** (`apps/app/src/features/clients/ClientNotesPanel.tsx`)
  — controlled slide-in editor. `Sheet` primitive, `Textarea`, save/cancel,
  char count, RBAC-aware. Open state lifted to the workspace so multiple
  affordances can trigger it.
- **`<ClientNotesStrip>`** (`apps/app/src/features/clients/ClientNotesStrip.tsx`)
  — inline preview shown above the alerts band. `Card tone="muted"
  radius="md" size="xs"` (from the design-system sweep). Auto-suppresses
  when notes are empty. Click anywhere on the strip → opens the slide-in.
  Edit affordance is a quiet ghost Button. Read-only viewers see the strip
  but no edit button.

**Workspace** (`apps/app/src/features/clients/ClientDetailWorkspace.tsx`)
- Tab labels renamed (preserving URL keys + comments documenting the rename)
- `notesOpen` state lifted to the workspace; `hasClientNotes` flag derived
- `<ClientNotesStrip>` mounted between the optional needs-facts InfoBanner and
  `<ClientActiveAlertsSection>` (read order: identity → context → urgency →
  stats → tabs)
- `<ClientNotesPanel>` mounted at the workspace tree's top level (alongside
  `FixNeedsFactsSheet`) — controlled
- Empty-state "Add notes" Button rendered in the PageHeader actions cluster
  only when notes are empty (the strip handles populated state)
- Notes block stripped from the History tab body — the tab now reads
  coherently as AI summary + Activity log
- `id="client-onboarding-state"` anchor added on the Onboarding state section
  for future deep-linking from missing-facts notifications (mirrors the
  existing `client-filing-jurisdictions` pattern)

### Pulse demo-data variety (`mock/demo.sql`)

Six new pulse rows + six new firm_alert rows attached to `mock_firm_brightline`
(Miguel's firm):

| Source                    | Change kind            | Confidence | Firm status        |
| ------------------------- | ---------------------- | ---------- | ------------------ |
| IRS Bulletin              | `filing_requirement`   | 0.92       | matched            |
| NY DTF Newsroom           | `applicability_scope`  | 0.88       | partially_applied  |
| IRS Newsroom (1120-S K-3) | `form_instruction`     | 0.74       | reviewed           |
| TX Comptroller            | `source_status`        | 0.95       | snoozed            |
| WA Department of Revenue  | `new_obligation`       | 0.91       | matched            |
| IRS Newsroom (1041)       | `deadline_shift`       | 0.96       | matched            |

Brightline now has **all 6 change kinds** + **5 of 7 firm-alert statuses**
exercised (`matched · applied · partially_applied · reviewed · snoozed`),
spanning low/medium/high confidence so `LowConfidenceBadge` and
`PulseConfidencePill` both render across surfaces. `StateTilegram` gains
chips for WA + FED in addition to the existing CA · NY · FL · TX cluster.

## Verification

- `pnpm exec tsc --noEmit` clean across `apps/app` + `apps/server`
- `pnpm run db:seed:demo` ran successfully — verified via wrangler:

  ```sql
  SELECT COUNT(*), GROUP_CONCAT(DISTINCT change_kind), GROUP_CONCAT(DISTINCT status)
  FROM pulse_firm_alert WHERE firm_id = 'mock_firm_brightline';
  ```

  Returns: `10, deadline_shift,filing_requirement,applicability_scope,form_instruction,source_status,new_obligation, matched,applied,partially_applied,reviewed,snoozed`

- `/` and `/preview` both serve 200

## Routes to walk for QA

- `/clients/[id]` for any Brightline client — confirm:
  - Tab bar reads **Filing plan · Setup · Opportunities · History**
  - When `client.notes` is non-empty: `<ClientNotesStrip>` renders below
    PageHeader, above the alerts band; click anywhere on it (or on the
    Edit button) opens the slide-in
  - When `client.notes` is empty: the strip is gone, the "Add notes"
    button renders in the header actions cluster
  - History tab no longer contains a Notes section
- `/today` while signed in as Miguel — Alerts panel shows the new variety
- `/rules/pulse` — alerts list filter chips (change_kind, status,
  jurisdiction) all have multiple options

## Next

Open polish work surfaced during the IA critique but NOT included here:

- **Opportunities count chip** on the tab bar (mirrors the Setup chip's
  pattern) — needs a server-side `clientOpportunities.unreadCount` field
  before the chip would be honest
- **Keyboard shortcuts** for tab switching (`g f / g s / g o / g h`)
- **Missing-facts deep-link auto-scroll** — anchor exists
  (`#client-onboarding-state`); needs the alert-email banner to route
  through `/clients/<id>?tab=info#client-onboarding-state`
- **Pulse variety** — round-2 ideas: `pending_review` rows to exercise the
  Approve/Reject/Quarantine flow; `dismissed` + `reverted` terminal states
  for the History tab in the Pulse drawer
