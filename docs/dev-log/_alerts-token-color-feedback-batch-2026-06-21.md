# Alerts — tokenize / color-canon / feedback batch

**Date:** 2026-06-21
**Surface:** `features/alerts/AlertDetailDrawer.tsx`,
`features/alerts/components/AlertCard.tsx`,
`features/alerts/components/AlertTeamNotes.tsx`

A curated batch of audited design fixes scoped to the Alerts feature. All
five applied; the optional sixth (queue-toggle tone) was skipped as
not-clearly-safe per the batch brief.

## 1 — Apply-now button used a TEXT token as a background (color canon)

`AlertDetailDrawer` "Ready to apply" section, Apply-now `<Button>`:
`bg-text-success hover:bg-text-success/90` → `bg-state-success-solid
hover:bg-state-success-solid/90`. A `--text-*` token is a foreground color;
the solid-fill background belongs on `--state-success-solid`. The icon halo
in the same banner moved from `bg-text-success/15` → the canonical
`bg-state-success-hover` (same recipe as the two ShieldCheck halos earlier in
the file).

## 2 — "Ready to apply" affirmation: no colored text on a tinted surface

The green affirmation banner (`bg-components-badge-bg-green-soft`) had a
green heading (`text-text-success`) and a green mono confidence span. Per
**no-colored-text-on-surface**, chroma lives in the container + icon circle,
not the text. Heading → `text-text-primary`; mono `conf NN%` span →
`text-text-secondary`. The green container, icon circle, and ShieldCheck stay
as the chroma carriers.

## 3 — AlertCard action pill: raw inline `style` colors → tone-keyed `cn()`

The top-right action-status pill set `style={{ backgroundColor:
actionPill.bg, color: actionPill.text }}` from raw CSS-var strings. Swapped to
a tone-keyed `cn()` map driven by `actionPill.id`:
- `needs-action` → `bg-state-destructive-hover text-text-destructive`
- `needs-review` / `closed` → `bg-state-base-hover text-text-secondary`

Same resolved colors, now via Tailwind utilities — no raw style colors. (The
`bg`/`text` fields on `actionPillFromAlert` remain because
`PulseFormRevisedCard` still reads them; that card is out of this batch's
scope.)

## 4 — AlertTeamNotes "Add note": in-flight spinner

The composer button was `disabled={!canSubmit}` (already includes
`!isPending`) but gave no progress feedback. Added the app's canonical
`Loader2Icon data-icon="inline-start" className="animate-spin"` while
`addNoteMutation.isPending`, matching `DecisionActions`.

## 5 — Tokenize off-scale `text-[13px]` workflow step label

`AlertDetailDrawer` workflow-timeline step title was `text-[13px]`. The
documented design intent (Yuqi "可以字号更小吗 / more delicate") is a step
*smaller* than the section body (`text-sm`/14), so it tokenizes to `text-xs`
(12), not `text-sm`. Comment updated to reflect 12/500.

## Skipped

**6 — /alerts Review/Active queue toggle tone.** A hierarchy/tone judgment on
an established toggle design; the brief said do it only if clearly safe.
Skipped to avoid disturbing the canonical toggle treatment.

## Verification

`tsgo --noEmit` clean; `vp run @duedatehq/app#build` succeeds. No `<Trans>`
strings changed, so no catalog extract/compile needed.
