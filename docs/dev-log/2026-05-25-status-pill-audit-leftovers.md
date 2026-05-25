# 2026-05-25 — Status-pill audit leftovers (#5, #9, #10)

## Why

Closing the deferred items from
`docs/Design/status-pill-audit-2026-05-25.md`:

- **#5** — Members page family (`MemberStatusPill` +
  `InvitationStatusPill`) was inconsistent within one file:
  invitations went filled, members went outline.
- **#9** — `InsightStatusBadge` "Failed" was painted amber
  (`warning`), but the §3.1 ladder reserves amber for external
  pauses where no urgency exists.
- **#10** — The audit's §3 tone ladder hadn't landed in the
  canonical design doc; future chip additions had no single
  reference to consult.

## Shipped

### #5 — Members page family unification

`apps/app/src/features/members/members-page.tsx:974-995`

Before: `MemberStatusPill` used `outline` + `warning` dot (amber
dot on an active member — wrong tone) or `secondary` for
suspended. `InvitationStatusPill` was a filled `success` /
`warning` chip with a redundant dot inside the matching tone.

After: both pills are `outline` + tone-colored dot, matching the
audit §3.3 ornament rule (filled chip + dot is redundant; outline
chip + dot is the canonical pattern). Tones now follow §3.1:

- Member active → `success` dot (healthy)
- Member suspended → `disabled` dot (dormant)
- Invitation pending → `info` dot (active work in progress)
- Invitation expired → `warning` dot (external pause)

Net effect: Suspended and Expired now read as siblings of the
same chip family instead of looking like they belong to two
different visual systems.

### #9 — `InsightStatusBadge` "Failed" → destructive

`apps/app/src/routes/obligations.tsx:5685-5709`

Before: `Failed` → `warning` variant (amber chip).
After: `Failed` → `destructive` variant (red chip).

A failed AI insight is a hard failure of the operation — work
cannot proceed without intervention. Per the §3.1 ladder,
amber means "external pause, no urgency"; red means "hard block
/ failure". Re-aligned.

`ReadinessResponseStatusBadge` was already correct per the
audit (`need_help` = warning, `not_yet` = outline), so no change
there.

### #10 — Tone ladder added to canonical design doc

`docs/Design/DueDateHQ-DESIGN.md` §4.10 (new subsection).

Lifted §3 of the status-pill audit into a permanent home with
three sub-tables: tone → semantic, shape → category, ornament
rule. Cross-references §14.7 (`needs_review` dual-meaning
裁定) so the two don't drift. Adds a "落地纪律" callout
explicitly forbidding per-surface tone re-mapping.

The audit doc remains the long-form survey + change list; this
new §4.10 is the short-form spec future chip additions consult
first.

## Files touched

- `apps/app/src/features/members/members-page.tsx`
- `apps/app/src/routes/obligations.tsx`
- `docs/Design/DueDateHQ-DESIGN.md`

## Verification

- `vp check --fix` → markdown formatting fixed
- `vp check` → 0 lint/type errors across 672 files
