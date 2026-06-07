# Cluster 6-remainder — annual rollover + onboarding rule-review

Date: 2026-06-07

Two **net-new** surfaces from the Pencil design refresh, plus two flagged conflicts.

## Shipped

### `c7xPK` — Annual rollover preview modal
- New `apps/app/src/features/obligations/AnnualRolloverDialog.tsx`, built on canonical
  `Dialog` + `Badge` + `Table` primitives (no new `@ui` components).
- Header (`repeat` icon, "tax year N → N+1"), Preview/Apply step pills, intro callout,
  3 disposition summary cards (Will update / Requires review / No verified rule),
  per-obligation table with `will_update` / `requires_review` / `no_verified_rule`
  taxonomy + changed-date highlighting, two-action footer.
- Triggered from the `/deadlines` PageHeader actions cluster (`routes/obligations.tsx`)
  via a new "Annual rollover" outline button.
- Responsive: summary cards stack on mobile (`sm:flex-row`); modal capped to
  `min(1040px, 100vw-2rem)`; body scrolls.

### `U8eGg` — Onboarding rule-review prompt
- New `apps/app/src/features/onboarding/rule-review-prompt.tsx`. Presentational
  `RuleReviewPrompt` reusing `jurisdictionLabel` from the rules console model.
- Centered 720px layout; per-jurisdiction rows (warning tile, name · rule count ·
  blocked badge, authority detail, Review CTA); info footer; Skip / Back / Review row.

## TODO(data) — flagged, not built
- **Rollover:** no `rollover`/`taxYear` contract, RPC, or route exists. Dialog renders a
  static `FALLBACK_PREVIEW`. Needs: preview fetch (`previewAnnualRollover`), row contract
  shape, two apply mutations (currently no-ops).
- **Rule-review:** `activateOnboardingJurisdictions` runs server-side but exposes no
  activation-summary output (rule counts, per-jurisdiction blocked counts, authority).
  Component takes these as props.

## Conflicts — deferred to design review (NOT silently reimplemented)
- **`E76U6Q`** (onboarding firm setup): proposes a 680px multi-step (Practice → Rules →
  Clients) form with two-column field row, timezone field, calendar widget. The live
  `/onboarding` is a deliberately single-page **400px** form whose width, hierarchy flip,
  helper-text placement, and state-grid sizing are all explicitly justified in dated code
  comments (2026-05-29). The state grid already exists as `StateRuleActivationSelector`.
  This is a redesign decision, not polish — needs a product call.
- **`H1YSCd`** (practice Smart Priority): shows **slider** controls + KPI strip. Live
  `/practice` uses number inputs with documented audit rationale (weights-total validation,
  preview tooltip reasons). There is **no Slider primitive** in `@ui`, and the KPI strip
  needs firm-contract fields that don't exist. Adopting it means a new primitive + contract
  changes.

## Pixel-exact compromises
- Verdant canvas theme intentionally not ported (brief); mapped to existing tokens.
- Rollover modal uses Dialog default `rounded-lg` (Pencil shows 16px) for consistency.
- Disposition badges use `info` / `warning` / `secondary` Badge variants (closest token
  match to the mock's blue/amber/grey pills).

## Verify
- `npx tsgo --noEmit -p apps/app` → 0 errors
- `pnpm --dir apps/app test -- src/routes/obligations --run` → 55/55
- `npx vp check` → 0 errors
