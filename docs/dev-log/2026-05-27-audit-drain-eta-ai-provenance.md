# Audit drain — η (eta) — AI provenance + actor type

**Date:** 2026-05-27
**Branch:** `design/audit-drain-eta-ai-provenance`
**Scope:** Step 9 AI-visibility findings F-008, F-022, F-023, F-035, F-036, F-037, F-039 — 7 findings closed.

---

## Why

Step 9's AI-visibility audit flagged a coherent cluster of P0/P1 gaps where
the AI-vs-human distinction is invisible to the CPA after a value lands.
Two server schema gaps blocked the rest:

- **F-008** — readiness checklist items lose AI provenance once persisted
  (the table only had a `source: 'template' | 'custom'` axis, which is
  orthogonal to "did an AI or a human author this?").
- **F-035** — audit events have no actor-type field; AI-driven writes
  fall through to either a human's name (if a CPA pressed apply on a
  Pulse alert) or "System" (if a cron fired the write), losing the
  signal a CPA needs when asking "did Andy add this deadline, or did
  the AI?"

Both required a schema change. This batch ships the schema, contracts,
RPC handlers, and UI surfacing in one coherent shipment so we don't end
up with half-typed columns.

## What shipped

### Schema (`packages/db/migrations/0030_ai_provenance_actor_type.sql`)

Three columns added to `obligation_readiness_checklist_item`:

- `origin: 'ai' | 'manual'` — provenance axis (NOT NULL, DEFAULT 'manual').
- `ai_generated_at` — timestamp, nullable.
- `user_edited_at` — timestamp, nullable. Stamped when the AI marker drops.

Three columns added to `audit_event`:

- `actor_type: 'user' | 'system' | 'ai' | 'ai_assisted'` — provenance axis
  (NOT NULL, DEFAULT 'user').
- `previous_actor_type` — nullable; surfaces F-023 reverse-provenance
  ("user X overrode an AI value").
- `ai_event_metadata_json` — nullable JSON; carries the F-037 disclosure
  (model, prompt version, token counts, latency, guard status, confidence,
  ai_output_id).

One new index: `idx_audit_firm_actor_type_time` (firm, actor_type, time).

### Migration safety on a 50M-row table

D1 / SQLite 3.35+ applies `ALTER TABLE ... ADD COLUMN DEFAULT 'literal'`
without rewriting existing rows — the default is stored as table metadata
and synthesised at read-time until a row is rewritten. That makes this
migration safe at scale: no long lock, no per-row write. The defaults are
conservative ('manual' / 'user'), so historical rows back-fill to the
safe NOT-AI assumption. If an analyst sees an old AI-written row as
'manual', they go hunting; the inverse (a human write mis-labelled as AI)
would be far worse for trust.

The new audit-event index will be built lazily by D1 on first query;
the table is append-only so concurrent writes are unaffected.

### Contracts (`packages/contracts/src/{audit,readiness}.ts`)

- `AuditActorTypeSchema`, `AuditActorTypeFilterSchema` (with `'ai_any'`
  convenience bucket for the audit-drawer segmented control).
- `AiEventMetadataSchema` (strict-parse; malformed payloads fail closed
  to `null` rather than blowing up the audit-list endpoint).
- `AuditEventPublic` gains `actorType`, `previousActorType`,
  `aiEventMetadata`.
- `AuditListInput` gains `actorType` filter.
- `ReadinessDocumentChecklistItemOriginSchema` + new fields on
  `ReadinessDocumentChecklistItemPublicSchema` (`origin`,
  `aiGeneratedAt`, `userEditedAt`).
- Ports (`packages/ports/src/audit.ts`, `packages/ports/src/readiness.ts`)
  mirror the new types so server-side code gets the typed surface.

### RPC handlers

#### F-022 / F-023 — AI marker drops + override audit event

`readiness.updateChecklistItem` now distinguishes a value-edit (label /
description / note change) from a status-only mutation. The procedure:

1. Sets `dropsAiOrigin: true` when the input contains label / description
   / note (value-touch). Status-only changes don't touch the value, so
   the AI marker stays — "marked received" is a confirmation, not an
   override.
2. The repo enforces the precondition: `dropsAiOrigin` only flips
   `origin` → `'manual'` (and stamps `user_edited_at`) when the row was
   actually `origin === 'ai'` before. Manual rows stay manual.
3. The repo attaches `previousOrigin` to the returned row so the
   procedure can shape the audit event without a second query.
4. When `previousOrigin === 'ai'` AND the procedure intent was a value
   touch, the audit event is written as:
   - `action: 'readiness.checklist_item.ai_overridden'` (distinct from
     the regular `updated` action so audit filters can target it).
   - `actorType: 'user'`, `previousActorType: 'ai'`.
   - `after.previousOrigin = 'ai'`, `after.origin = 'manual'`.

The pattern is the canonical F-022 implementation: **every AI-derived
value should drop its AI provenance marker once a human value-touches
it, AND that override should leave an audit trail**. Future surfaces
(rules concrete drafts, structured fields) should call into the same
shape — `dropsAiOrigin` intent at the handler boundary, repo enforces
the previous-was-ai check, procedure emits the override action.

#### F-035 / F-036 — audit actor type

`audit-writer` and `AuditEventInput` now accept `actorType`,
`previousActorType`, and `aiEventMetadata`. Defaults preserve existing
semantics — callers that don't pass `actorType` get `'user'` (the
historical default).

The `toAuditEventPublic` serialiser surfaces the new fields and
defensively parses `aiEventMetadataJson` through the strict Zod schema;
malformed payloads return `null` so the audit list endpoint never crashes.

### UI

- **`apps/app/src/components/primitives/ai-provenance-badge.tsx`** —
  new canonical Astroid marker + tooltip. Two variants: `inline` (small
  dot for inside a row title) and `chip` (bordered pill). Tooltip
  surfaces "Generated by AI" + the timestamp + the F-022 convention
  ("Edit this item to confirm. The AI marker will drop.").

- **`apps/app/src/features/obligations/ChecklistItemRow.tsx`** —
  renders `<AiProvenanceBadge>` next to the item title when
  `origin === 'ai' && userEditedAt === null`. The badge disappears as
  soon as the server flips the origin (F-022).

- **`apps/app/src/features/audit/audit-log-table.tsx`** —
  - `actorType === 'ai'` rows render a dedicated Astroid tile (accent
    tint) instead of the human-avatar bucket; the actor text shows "AI".
  - `actorType === 'ai_assisted'` rows keep the human avatar + name and
    add a small "AI-assisted" chip under the name (with a tooltip:
    "AI produced the value; the user applied it.").

- **`apps/app/src/features/audit/audit-event-drawer.tsx`** —
  - Header chips: Astroid pill for AI / AI-assisted; warning pill for
    "Overrode AI suggestion" (F-023).
  - Field grid: new "Actor type" row (User / System / AI / AI-assisted).
  - F-037 "AI trace" section: renders model, prompt version, token
    counts, latency, guard status, confidence, ai_output_id when present.
    Gracefully shows a "Trace metadata not recorded for this row"
    message for AI-originated events that pre-date the column.

### Tests

- `packages/db/src/repo/readiness.test.ts` — updated batch-size assertion
  (9 → 7) to match the new 14-column INSERT shape.
- `apps/server/src/procedures/readiness/index.test.ts` — three new tests
  for the F-022 / F-023 override path:
  - Label edit on an AI row flips origin to manual AND emits the
    `ai_overridden` audit action with `previousActorType: 'ai'`.
  - Status-only mutation (mark received) keeps the AI marker intact.
  - Label edit on a manual row uses the regular `updated` action.
- `apps/server/src/procedures/audit/index.test.ts` — two new tests for
  the F-037 metadata round-trip + the defensive malformed-payload guard.
- `packages/contracts/src/contracts.test.ts` — `AuditEventPublicSchema`
  fixture updated for new required fields.
- `apps/app/src/features/obligations/timeline.test.tsx`,
  `apps/app/src/routes/obligations.test.ts` — audit-event fixtures
  updated.

### i18n

22 new English msgids extracted; all translated to zh-CN. Lingui
compile passes strict.

## What's NOT in this batch

- **F-024 (rules concrete draft provenance)** — same pattern but a
  different table. Documented in the F-022 dev-log; out of scope for
  this shipment.
- **AI-generation paths that should set `origin: 'ai'`** — the
  schema + repo + procedure plumbing is in place, but no current call
  site of `createDocumentChecklistItems` passes `origin: 'ai'`. The
  feature is a no-op until a Brief / Pulse / AI-checklist path is
  wired (separate work, not in scope).
- **Audit drawer filter UI for actor_type** — the contract + repo
  filter is wired, but the filter dropdown in `audit-log-page.tsx`
  has not been extended with an "AI actions" segmented control.
  Deferred to keep the diff focused on schema + display surfaces.

## Files touched

```
packages/db/migrations/0030_ai_provenance_actor_type.sql          (new)
packages/db/migrations/meta/_journal.json
packages/db/src/audit-writer.ts
packages/db/src/repo/audit.ts
packages/db/src/repo/audit.test.ts
packages/db/src/repo/readiness.ts
packages/db/src/repo/readiness.test.ts
packages/db/src/schema/audit.ts
packages/db/src/schema/readiness.ts
packages/ports/src/audit.ts
packages/ports/src/readiness.ts
packages/contracts/src/audit.ts
packages/contracts/src/index.ts
packages/contracts/src/readiness.ts
packages/contracts/src/contracts.test.ts
apps/server/src/procedures/audit/index.ts
apps/server/src/procedures/audit/index.test.ts
apps/server/src/procedures/readiness/_public.ts
apps/server/src/procedures/readiness/index.ts
apps/server/src/procedures/readiness/index.test.ts
apps/app/src/components/primitives/ai-provenance-badge.tsx       (new)
apps/app/src/features/obligations/ChecklistItemRow.tsx
apps/app/src/features/obligations/timeline.test.tsx
apps/app/src/features/audit/audit-change-view.ts
apps/app/src/features/audit/audit-event-drawer.tsx
apps/app/src/features/audit/audit-log-labels.ts
apps/app/src/features/audit/audit-log-model.ts
apps/app/src/features/audit/audit-log-table.tsx
apps/app/src/routes/obligations.test.ts
apps/app/src/i18n/locales/en/messages.po
apps/app/src/i18n/locales/zh-CN/messages.po
docs/dev-log/2026-05-27-audit-drain-eta-ai-provenance.md         (new)
```

## Rollout

1. `pnpm db:migrate:local` to apply 0030 locally and verify the column
   adds are instant (DEFAULT-only ALTER, no rewrite).
2. `pnpm db:migrate:remote` against staging; observe D1 metrics during
   the lazy index build.
3. Once staging green, the same sequence in production. Backfill is
   implicit (NOT NULL DEFAULT 'manual' / 'user') — no separate
   backfill job needed.

Reverts are safe: dropping the new columns leaves the existing
schema intact; the application reads `origin` / `actorType` defensively
through schema defaults so a pre-migration deploy + post-migration
schema is forward-compatible too.
