# Design-system bidirectional sweep

## Context

Yuqi flagged that across the dashboard `/today` (and many other surfaces) the chrome was
not following the design system. Every chip, card, link, and pill was hand-rolled with
tokens — so the colors were correct, but the **shapes** drifted: a status badge here
used `rounded-sm`, the badge next to it used `rounded-md`, an inline link used
`text-muted hover:tertiary` and another used `text-tertiary hover:secondary`. The
chrome read as "tokens that happen to be the same family," not "instances of one
primitive."

The audit found **64 hand-rolled call sites** across the app (21 chips, 25 cards, 18
inline links/buttons). The root cause split into two:

1. **Call sites bypass primitives** — even when a primitive variant exists, the call
   site reaches for inline classes instead. This is a migration problem.
2. **Primitives don't cover what designs need** — e.g., `<Card>` had no `tone="warning"`
   axis for in-drawer tinted panels, so consumers hand-rolled `border-amber-…/bg-amber-…`.
   This is a primitive-coverage problem.

Yuqi's directive: "refactor means it is both ways synchronise: the design and the
design system." Migrating call sites without extending primitives leaves the door open
for the next drift; extending primitives without migrating leaves the existing drift in
place. Both directions, single sweep.

## Change

### Primitive extensions (`packages/ui/src/components/ui/`)

| Primitive       | New axis / variants                            | Why                                                                                                                  |
| --------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Badge`         | `shape="square"` (default `pill`)              | Per-line code chips + jurisdiction tags + form-code chips need `rounded-sm` instead of `rounded-full`                |
| `Badge`         | `size="lg"`                                    | Drawer-header chips (change-kind, source name) needed bigger padding + text than the default `h-5 text-xs`           |
| `Card`          | `size="xs"` (gap-2 / py-3 / px-3 / text-sm)    | Dashboard-density alert tiles ("NeedsAttentionCard") were hand-rolling `p-3 gap-2 text-sm` because Card had no xs    |
| `Card`          | `tone="warning" \| "accent" \| "muted"`        | In-drawer tinted panels (PulseDetailDrawer warning blocks) were hand-rolling `border-amber-…/bg-amber-…` per surface |
| `Card`          | `radius="md"` (default `xl`)                   | Dense in-page surfaces (workload, opportunities, AlertsListPage empty states) want `rounded-md` not marketing's `xl` |
| `TextLink`      | `variant="accent"`                             | 10+ hand-rolled `text-text-accent hover:underline` inline links — quieter than `<Button variant="link">`             |

### New primitive

- **`<TextLink>`** lives in `packages/ui/src/components/ui/text-link.tsx`. Three
  variants (muted / secondary / accent), two sizes (default / sm), `render` prop for
  polymorphism (use as `<button>` or wrap a React Router `<Link>`). Captures the
  ~58 `text-text-muted hover:text-text-tertiary` occurrences scattered across the app.

### Call-site migrations — 34 sites across 25 files

| Feature bucket             | Files | Highlights                                                                                                                                       |
| -------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `clients`                  | 4     | `ClientFactsWorkspace` (9 workspace panels → `Card`), `ClientCompliancePosturePanel` (section → `Card`), `ClientTitleSwitcher`, `ClientDetailDrawer` |
| `pulse`                    | 4     | `PulseDetailDrawer` (3 in-drawer tinted panels → `Card tone="warning"`/`accent`), `AlertsListPage` empty states → `Card radius="md"`, `PulseAlertCard` change-kind chip → `Badge variant="info" size="lg"`, `PulseStructuredFields` jurisdiction → `Badge shape="square"` |
| `obligations`              | 3     | Status pills → `Badge variant="destructive"/"warning"`, `timeline.tsx` accent eyebrow → `Badge shape="square"`, `ChecklistItemRow` icon button → `Button variant="ghost" size="icon-sm"` |
| `routes` (top-level)       | 6     | Count chips on `/obligations`, `/clients`, `/rules/library`, `/rules/pulse` headers → `Badge variant="secondary"/"destructive"`                  |
| `dashboard`                | 4     | `needs-attention-card` (xs Card), `needs-attention-section` (panel wash dropped), `actions-list` (Open-in-queue Badge), `changes-since-last-section` (TextLink) |
| `audit`                    | 1     | AI provenance + override indicators → `Badge variant="info"/"warning"`                                                                            |
| `migration`                | 2     | `WizardShell` modal → `Card`, `Step1Intake` preset switcher + paste-mode → `Button variant="outline"`/`link`                                      |
| `opportunities`            | 1     | Per-opportunity card → `Card size="sm"`, client links → `TextLink variant="secondary"`                                                            |
| Other small buckets        | ~8    | reminders, workload, calendar, auth, members, onboarding, `_surface-vocabulary`, `patterns/info-banner`                                          |

### Mechanism

Workflow with 22 agents in 4 phases:

1. **Triage** (3 parallel agents) — read every flagged site, decide existing primitive vs
   extension-needed. Output: structured `{primitive_extensions[], migrations[]}`.
2. **Extend primitives** (1 agent) — apply every proposed extension to the primitive
   source files only. Call sites untouched.
3. **Migrate** (~17 parallel agents, one per feature bucket) — consume the now-extended
   primitives, replace hand-rolled chrome.
4. **Verify** (1 agent) — full tsc, both routes 200, spot-check 3 migrated files.

`915,602` subagent tokens, `338` tool uses, `~12 min` wall-clock.

## Verification

- `pnpm exec tsc --noEmit -p apps/app/tsconfig.json` — clean
- `http://localhost:5173/` → 200
- `http://localhost:5173/preview` → 200 (gallery now renders the new variants)
- Spot-checks confirmed:
  - No raw hex values introduced
  - No half-step spacing (no `p-3.5`, `gap-2.5`, `text-[10px]`)
  - All `<Trans>` macros + lingui call-sites preserved
  - All `aria-label`s + `onClick` handlers + ARIA semantics preserved
  - Orphaned imports cleaned

## Routes to walk for visual QA

Yuqi to verify before next round. Tier-1 (most likely regression candidates):

- `/today` — alerts panel wash dropped, form chips on action rows now pill-shaped, "Open in queue" CTA visible on hovered row
- `/clients/[id]` — 9 workspace panels migrated to `<Card>`; verify spacing matches the previous hand-rolled chrome
- `/rules/pulse` → open a Pulse drawer — `<Card tone="warning">` panels and `<Badge shape="square">` chips inside

Tier-2: `/deadlines`, `/rules/library`, `/audit`, `/migration/new`

Tier-3: `/members`, `/workload`, `/opportunities`, `/reminders`, `/calendar`, `/login`, `/onboarding`, `/preview`

## Next

Round-2 audit will scan for the long tail not caught by round 1:

- Sidebar items (`<SidebarMenuButton>` consumers — check for hand-rolled chrome under the canonical sidebar primitives)
- Modal/dialog content surfaces
- Table cells with tinted backgrounds
- Form inputs that hand-roll their styling
- Tooltips, popovers, dropdowns

Likely another 20-30 sites depending on what the audit surfaces.
