# Design system governance

> How the DueDateHQ design system stays coherent as it evolves — ownership,
> contribution, versioning, deprecation, and the quality bar. Written to match
> how this team _actually_ works (small team, single repo, commit-to-main), not
> a generic enterprise template. Governance is sized to the org, not aspired
> beyond it.

## TL;DR

- **Model:** hybrid, but light. There's no dedicated DS team and no ticket
  queue — anyone can extend the system, and the bar is enforced by review +
  `tsgo`/tests/`/preview`, not by a gatekeeper.
- **The contract is [§4.11 of DueDateHQ-DESIGN.md](./DueDateHQ-DESIGN.md)** (the
  primitive vocabulary table) plus the `/preview` gallery. If a pattern has a
  primitive, you use it; you never hand-roll.
- **The changelog is the dev-log.** No semver — single repo, zero external
  consumers, so the git history + `docs/dev-log/` entry per change _is_ the
  version record.

## Why this shape

A semver'd package, an RFC process, and a deprecation-window policy are the right
tools for a published library with external consumers on their own release
cadence. DueDateHQ's `packages/ui` is `0.0.0` and consumed by exactly one app in
the same repo — every consumer upgrades atomically in the same commit. Importing
the heavyweight process would be ceremony with no payoff. What a one-repo,
small-team system actually needs is a clear **contract**, a low-friction
**contribution path**, and a non-negotiable **quality bar**. That's what's below.

## 1. Ownership — where things live

| Layer          | Home                                                 | Owns                                                                                               |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Tokens         | `packages/ui/src/styles/tokens/*.css` + `preset.css` | color/space/radius/type primitives + the `@theme` re-export                                        |
| UI primitives  | `packages/ui/src/components/ui/`                     | framework-agnostic building blocks (Button, Input, Badge, Select…)                                 |
| App primitives | `apps/app/src/components/primitives/`                | DueDateHQ-domain marks (SeverityChip, CapsFieldLabel, StatusRing, TaxCodeBadge, JurisdictionChip…) |
| Patterns       | `apps/app/src/components/patterns/`                  | composed multi-primitive shells (StatBand, FilterTrigger, ListRail, app-shell-nav…)                |

Boundary rule: a component graduates **down** a layer (app → ui) only when a
second surface needs it AND it carries no DueDateHQ domain knowledge. Domain
marks stay in `app/primitives` even when widely used.

## 2. The contract — §4.11 + /preview

Two artifacts define the public surface of the system:

- **[DESIGN §4.11 primitive vocabulary](./DueDateHQ-DESIGN.md)** — the
  enforceable "use this primitive, never hand-roll" table. Every primitive has a
  row: what it's for, its import path, key variants, and what it is _not_.
- **`/preview`** — the living specimen gallery. Every primitive renders there
  with its variants. This is where a change is reviewed visually and where a new
  component proves it exists.

A change isn't "done" until both are updated. Adding a primitive that isn't in
§4.11 and `/preview` is the same as not shipping it — the next person won't find
it and will hand-roll a duplicate.

## 3. Contribution — the "both ways" rule

From the v2.4 sweep: consolidation runs **both directions**. When you find a
hand-rolled chip/card/link/control, you don't just style it — you move it onto
the primitive AND, if the primitive lacks the variant the design genuinely needs,
you add that variant to the primitive. Neither half alone is acceptable: a
one-off that bypasses the primitive is drift; a primitive that can't express a
real need forces the next one-off.

Lifecycle of a change (lightweight, no tickets):

1. **Identify** the need (a new mark, a missing variant, a drift to consolidate).
2. **Decide the home** (§1 table). Reuse before extend; extend before create.
3. **Build** with tokens (never hardcoded hex/px), all states, a11y, both themes.
4. **Register** in §4.11 + `/preview`.
5. **Verify** (§5 gauntlet).
6. **Record** in `docs/dev-log/` (the change + the why) and update any canon doc
   in `docs/Design/` the change touches.
7. **Commit** to `main` (small-team workflow; rebase, linear history).

When a change is a genuine design fork (a tone ramp, a token hue, a rename that
touches dozens of sites), it's **steered by the design owner before building** —
present the options, get the call, then execute. Don't blind-guess a decision
that spreads across the app.

## 4. Versioning & deprecation (single-repo edition)

- **No semver.** The git history is the version; the `docs/dev-log/` entry is the
  changelog line. Every change is described there with its rationale.
- **Breaking changes migrate atomically.** Because every consumer is in-repo,
  a rename/removal updates _all_ call sites in the same commit — no compat shim,
  no deprecation window. Example: the 2026-06-18 `FieldLabel → CapsFieldLabel`
  rename `git mv`'d the file, renamed 49 import sites, and updated the docs in one
  commit. `tsgo` is the safety net — a missed site fails the build.
- **Deprecation = deletion, once.** If a primitive is superseded, migrate its
  call sites and delete it in the same change. A "deprecated but still present"
  component in a single repo is just an un-migrated call site — finish the job.
- **Tokens are the exception that needs care.** A token utility is tree-shaken
  unless a scanned source file consumes the class, and `@theme` re-exports must
  exist in `preset.css` or the utility silently no-ops. Verify a new token by
  _consuming_ it and checking the built CSS — never by runtime injection.

## 5. Quality bar — the verification gauntlet

A component/change does not land until:

- [ ] `tsgo --noEmit` clean (0 errors)
- [ ] `vp check` clean (no _new_ lint/format findings)
- [ ] App tests pass (`pnpm -F @duedatehq/app test run`)
- [ ] Production build green (`vp run @duedatehq/app#build`) — catches token
      tree-shake regressions
- [ ] **Verified live** on the dev server, not from a screenshot — measure the
      real DOM (computed color/radius/structure). Stale bundles lie; the running
      app doesn't.
- [ ] i18n: new user-facing strings extracted + translated (zh-CN), `extract`
      idempotent, `compile --strict` passes
- [ ] Registered in §4.11 + `/preview`; canon docs updated; dev-log written
- [ ] Tokens only — no hardcoded hex/px; both light + dark themes work
- [ ] a11y — label/role/keyboard/focus; color is never the only signal

## 6. Operating principles

- **One canonical primitive per pattern.** The whole point of §4.11. Two
  components doing the same job is the failure mode — catch it in review.
- **Color is a budget, not decoration** (von-Restorff). Reserve hue for meaning;
  anchor/total stats stay neutral. See the StatBand color-budget note.
- **Demote, don't delete information.** De-noising keeps decision info in a
  quieter form; it doesn't strip facts.
- **No fiction on canvas.** Every datum/affordance traces to a real backend or is
  tagged net-new in a brief.
- **Treat governance as a product.** It has users (whoever extends the system)
  and it iterates — when a rule stops matching reality, change the rule, don't
  route around it.

_Established 2026-06-18. This doc reflects the practices already in force across
the 2026-06 primitive-unification + pass-1/pass-2 audit work; it codifies them so
they survive contributor turnover._
