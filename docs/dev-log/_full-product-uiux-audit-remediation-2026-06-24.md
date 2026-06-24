# Full-product UI/UX audit — remediation wave (P1 + cheap P2)

**Date:** 2026-06-24
**Audit record:** [docs/Design/full-product-ui-ux-audit-2026-06-24.md](../Design/full-product-ui-ux-audit-2026-06-24.md)

Acting on the 8-agent full-product audit. Applied the high-confidence P1 fixes (and the
cheap P2s) across the app via 6 worktree-isolated agents on disjoint file-areas, then
cherry-picked + integrated centrally. **No critical functional defects were found** in the
audit — these are consistency, primitive-reclamation, wiring, and a11y fixes. Two auditor
"P0s" were disproven before any work (alert-apply already has full toast feedback;
`invalidateDetail` was only missing the `clients.*` keys, not a P0).

## What shipped (6 area commits + central)

**Alerts** (`846c7715`)
- Eyebrow pill → `Badge`; low-confidence pills → `LowConfidenceBadge` (PulseAlertRow + AlertListRail); ~10 `font-semibold`→`font-medium` on data/labels.
- **Connection:** "View audit trail" `TextLink` → `/audit?entity=<alertId>` in the drawer Activity section.
- Fixed identical `Plural one="# open"` → `one="1 open"`.

**Clients + dashboard** (`3c75a76b`)
- Count badges → `CountPill`; active tab trigger + rail/card sub-headers + portfolio countdown hero (was size+color+bold triple-signal) → `font-medium`.
- **Connection:** client "Filed" stat is now clickable → `/deadlines?client&status=done,completed,paid` (matches Blocked/Open).
- 4 setup-section card wrappers `rounded-lg`→`rounded-xl`; needs-attention empty → `EmptyState` primitive; CoffeeIcon stroke 1.75→1.5.

**Deadlines + workload** (`f86edbc2`)
- `InternalVsFilingSchematic`: `rounded-md`→`rounded-lg`, `text-[10px]`→`text-caption-xs`, `text-white/NN`→`text-text-inverted/NN`.
- **Connection:** added `clients.listByFirm` + `clients.get` to `invalidateDetail()` (fixes stale /clients at-risk + client detail after a status change).
- Removed dead `deadlineTip` query/poll/mutation pipeline (retired Risk tab); `h-[44px]`→`h-11`.
- Workload: busiest-owner split out of a `·`-joined string into scannable elements; owner glyph `ClipboardListIcon`→`UserRoundIcon`.

**Rules + audit** (`8e707859`)
- Raw `<button>`/`linkClass` → `TextLink`/`Button`; high-severity pill → `Badge`.
- **A11y:** entity coverage matrix cells got `sr-only` text alternatives (was an inaccessible table); `<div role="button">` → real `<button>`.
- Removed dead `SHOW_COVERAGE_MAP` flag + branch.
- **Connection:** `auditEntityHref()` now maps `pulse_*` entity types → `/alerts?alert=` (alert audit rows were dead-ends).
- "Audit filters" tutorial `CardDescription` removed; count `Badge`→`CountPill`.

**Entry / front door** (`128d8d68`)
- **Login brand mark:** letter-"D" `rounded-2xl` square → real `AuthBrandAnchor`; SSO buttons' `rounded-xl` overrides removed; `Return ↵` → `Kbd`.
- Entry token harmony: `bg-bg-canvas`→`bg-background-subtle`, `border-border-default`→`border-divider-subtle`, footer type matched to AuthFooter.
- accept-invite: added SSO provider icons, inviter avatar → `AssigneeAvatar`, system-error copy voice.
- 2FA OTP digits → `font-medium`; `text-[28px]`→`text-3xl`; error.tsx wrapped with `AuthBrandAnchor` (was anonymous alert on blank canvas); fallback.tsx SR `role="status"`; splash `min-h-screen`→`h-dvh`.

**Admin / account / billing** (`2a886fc2`)
- **Local-primitive reclamation:** deleted local `SettingsCard`/`Field` (settings.profile) + local `Card`/`CardHead` (notification-preferences) → canonical `Card`/`Field`.
- members: `PlusIcon`→`data-icon`, shortcut hint → `Tooltip`, header count → `CountPill`.
- billing.success raw enum badges removed; billing.cancel gained a `PageHeader`; settings.permissions gained breadcrumbs.

**Central (this commit)**
- Tokenized the one live raw-hex: aurora gradient `#a78bfa`/`#f0a35e` → new decorative
  `--color-aurora-violet` / `--color-aurora-warm` tokens in `primitives.css` (verified
  emitted in the built CSS bundle).
- i18n: 3 new zh-CN strings filled (`1 open` plural, "View audit trail", "View filed
  deadlines"); compiled `--strict`.

## Deferred (with reasons — not fake-fixed)
- **AlertCard / PulseFormRevisedCard action pills** → SeverityChip: pills use inline colors
  from a data helper; can't map without a data-model change.
- **PulseAlertsMap → shared tilegram:** `US_JURISDICTION_TILES` uses fractional grid coords
  the CSS-grid map can't consume without a layout rewrite. (NEEDS CENTRAL.)
- **ManagerInsightMetric → StatBand:** StatBand is a full-width band; would need a
  card-container mode in `packages/ui`. (NEEDS CENTRAL.)
- **needs-attention-card jurisdiction chip:** the auditor mislabeled it — it's a `TaxCodeBadge`
  (form code), not a `StateBadge` (jurisdiction). Left as-is.
- **dashboard refresh control:** auditor called it a "raw div"; it's already a proper
  accessible `<button>`. Not a defect — left as-is.
- **Shared auth-heading type token** (repeated `text-3xl` H1 across entry): standardized to
  `text-3xl` for now; a named token is a possible follow-up. (NEEDS CENTRAL.)

## Verify
`tsgo` app + ui clean; `vp run @duedatehq/app#build` clean; aurora token confirmed in built
CSS; `i18n:extract` 0-missing / `compile --strict` passes. 6 area commits integrated via
worktree-isolation + cherry-pick (clean, disjoint file-areas).
