# SeverityChip primitive — unify the severity/priority/risk chips

_2026-06-18 · design-call #1 of the pass-2 backlog_

The app had no canonical "level" chip: 21 severity/priority/impact/risk pills
wired their tones inline (`style={{ backgroundColor, color }}`) across TWO token
families for the same meaning — alerts used `--state-*`, rules/dashboard used
`--severity-*` — and the **same "High impact" tag rendered three different
colors** (neutral in PulseAlertRow, amber in AlertCard/PulseFormRevisedCard, RED
in AlertDetailDrawer + needs-attention-card).

## Decisions (Yuqi steered)

1. **Soft-tint severity ramp** — the primitive uses the `--severity-*` ramp
   (light tint ground + saturated text): `critical` red, `high` orange, `medium`
   amber, `neutral` gray. This visibly recolors the /alerts priority pills (high
   was peach `state-warning` → now orange) so every level chip reads as one family.
2. **Impact = neutral everywhere** — color encodes urgency/severity ONLY; client
   reach ("High impact") sits on a different axis, so it's a neutral tag. No row
   ever wears two alarms (red priority + amber impact).

## What shipped

New `apps/app/src/components/primitives/severity-chip.tsx`:
`<SeverityChip level={'critical'|'high'|'medium'|'neutral'} size shape icon>`.
Static class map (no dynamic `bg-severity-${level}` — would tree-shake out).
`shape="square"` for the registry eyebrow-tag treatment.

Migrated 6 surfaces off inline styles / Badge variants onto it:

- `PulseAlertRow` — priority pill (urgent→critical, high→high, normal→neutral) +
  the already-neutral impact pill.
- `AlertCard` + `PulseFormRevisedCard` — impact pill amber → **neutral**.
- `AlertDetailDrawer` + `needs-attention-card` — impact pill red → **neutral**.
- `jurisdiction-rule-table` — rule-risk pill off Badge `warning`/`secondary` onto
  the ramp (high→high orange, med/low→neutral, `shape="square"`).

`impactBadgeFromAlert` simplified to return `{ id }` only — the per-tier colors it
carried are gone (rendering now owns color via SeverityChip). Test updated.

Registered: DESIGN §4.11 primitive index + `/preview` specimen gallery
(`SeverityChip` + `SeverityChip square` rows).

Out of scope (left correct as-is): status pills (Badge), AI-confidence pills,
status dots, severity-section count Badge, SurfaceSummaryStrip bare-text tones,
and generation-preview's chip (already on `--severity-medium` tokens).

## Verification

- `tsgo` 0; 543 app tests pass (merged 2 chrome-test cases → 1); `vp check`
  clean (warnings pre-existing); i18n idempotent (labels are plain strings);
  build green — all four `severity-*-tint` + `text-severity-*` utilities present
  in output CSS (tree-shake confirmed).
- **Live (dev server /preview gallery):** the four chips' computed styles read
  red-50/red-600, orange-50/orange-600, warning-50/warning-600, gray-50/gray-600
  — four distinct correct tones, rounded-full, uppercase. No console errors.
- Gated /alerts + /dashboard couldn't be seeded for an in-context shot (local
  Worker/D1 demo-login returns 502) — they consume the same verified primitive.
