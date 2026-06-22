# Soft-premium aesthetic pass — aurora generating border + setup-progress card

_2026-06-21 · Yuqi reference drop: "fun borders", "love the colours", "copy this
status", "sidebar shortcut card", "Almost There" card + checklist, duotone icons_

## The brief

Yuqi shared ~9 reference images and asked to "copy the aesthetics and apply to
the full product." The unifying language: **soft, warm, premium-playful** —
rounded cards, soft-tinted status colours, gentle gradients / aurora borders,
progress-conveying glyphs, and delightful progress visualizations (tick-marks,
rings). Each reference was matched to a real DueDateHQ moment before building.

## Already shipped (confirmed, not rebuilt)

- **"love the colours" + "copy this status"** (the Draft/In-progress/In-review/
  Completed icon-pills) → this is already our system: `StatusRing` (empty dashed
  ring → filling arc → solid check disc) + `ObligationStatusReadBadge` (soft-tint
  pill, icon + matching-tone label), adopted app-wide this design era. The
  reference _is_ our pattern; no rebuild needed.

## Built this pass (verified)

- **Aurora "generating" border** (ref: the "Brief is generating" pill) — the
  Daily Brief banner now wears a soft brand cyan → violet → warm halo that drifts
  behind it **only while the AI writes** (`isPending`). A blurred gradient layer
  set behind the opaque card leaks a few px past the edge; `@keyframes
ddhq-aurora-drift` (globals.css) sweeps the gradient; reduced-motion freezes it.
  The wait now reads as alive thinking, not a dead spinner. (tsgo + build verified;
  state-gated so it shows when a brief is regenerating.)
- **`TickProgress`** primitive (ref: the "Almost There" tick-mark bar) — a fixed
  row of thin ticks; the filled run ramps brand cyan → navy across its own length
  (computed per tick, like StatusRing's arc). Reusable for any progress moment.
  Verified live on /preview (28 ticks, gradient fill at 23/50/85%).
- **`SetupProgressCard`** (refs: the "Almost There" card + the Getting Started
  checklist) — a soft rounded card with a percent badge, the TickProgress bar, and
  a checklist whose icons read at a glance (green check = done, spinning loader =
  do next, dashed circle = later) + a CTA to the next step. **Self-dismisses** once
  every step is done. Every step is a REAL signal (live counts), never a fake
  checkbox. Verified live on /preview (33% badge, 28-tick bar, 3-step checklist).
- **Wired on /today**: the bare `needsRules` empty state ("No deadlines yet · Set
  up rules") is replaced by `SetupProgressCard` — same destination, but it now
  reinforces the done step (clients ✓), shows how close they are, and self-resolves
  the instant the first rule generates a deadline. The persistent setup-card idea
  Yuqi liked (sidebar refs), landed on the surface I own (the app shell sidebar is
  owned by a parallel session this session must not touch).

## Held for canon / a later pass

- **Duotone / colourful glyphs in buttons** (ref: blue book / yellow timer / green
  play-ring) — gorgeous, but broad application fights the deliberate
  calm-on-dense, restrained-monochrome-icon canon of the CPA workbench. Right home
  is delight surfaces (onboarding, empty states, success, marketing), not dense
  data tables. Deferred to a scoped pass rather than gaudying the workbench.
- **Sidebar placement** of the setup card — the app-shell sidebar is mid-change in
  a parallel session; the card lives on /today for now and can move to the sidebar
  footer (above the user profile) once that lands.

## Verification

tsgo 0 · build green · i18n extract + compile --strict (7 new strings, zh-CN
translated) · TickProgress + SetupProgressCard confirmed live on /preview. Note:
`login.tsx` is mid-redesign in a parallel session and was deliberately NOT staged.
