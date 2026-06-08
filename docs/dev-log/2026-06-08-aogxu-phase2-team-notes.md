# Alert detail → Aogxu Phase 2 — Team notes (full-stack)

Date: 2026-06-08

Pencil Aogxu §7 "Team notes" — internal discussion threaded on an alert.
Full-stack, real data.

## Layers
- **Migration** `packages/db/migrations/0071_pulse_alert_note.sql` — new
  `pulse_alert_note` table (firm_id→cascade, alert_id→pulse_firm_alert cascade,
  author_id→user restrict, body, parent_note_id, created/updated ms) + index
  (firm_id, alert_id, created_at). (drizzle emitted it numbered 0056 off a stale
  journal baseline — renumbered to 0071 to follow the real wrangler sequence; the
  unmaintained drizzle _journal/snapshot left untouched.) Applied to local D1.
- **Schema** packages/db/src/schema/pulse.ts: `pulseAlertNote` + relations.
- **Repo** packages/db/src/repo/pulse/{shared,scoped}.ts: firm-scoped
  `listAlertNotes` (joined to author name) + `addAlertNote` (verifies alert ∈ firm).
- **Ports** packages/ports/src/pulse.ts: row types + two methods.
- **Contract** packages/contracts/src/pulse.ts: PulseAlertNoteSchema + list/add
  inputs + router entries.
- **Server** apps/server/src/procedures/pulse/index.ts: listAlertNotes (any
  member reads) + addAlertNote (requireCurrentFirmRole → capture author + audit
  write); registered + test doubles updated.
- **UI** apps/app/src/features/alerts/components/AlertTeamNotes.tsx + api.ts query
  options/invalidation; rendered as the last section of AlertDetailDrawer.

## Verify
Both tsgo projects clean; local migration applied; END-TO-END in preview — added
a note via the composer, it persisted to the table, refetched + rendered, composer
cleared, zero console errors.
