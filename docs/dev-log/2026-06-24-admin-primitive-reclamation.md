# Admin/billing primitive reclamation + weight/badge sweep

**Date:** 2026-06-24  
**Scope:** routes/settings.profile.tsx, routes/practice.tsx, routes/billing.tsx, routes/billing.success.tsx, routes/billing.cancel.tsx, routes/settings.permissions.tsx, features/notifications/notification-preferences-page.tsx, features/members/members-page.tsx

## What changed

### 1. settings.profile.tsx — local SettingsCard + Field eliminated

- Deleted local `SettingsCard` (hand-rolled `<section rounded-xl border>` + two-div header/body chrome). Replaced with canonical `<Card>/<CardHeader>/<CardContent>` from `@duedatehq/ui/components/ui/card`. The danger-zone card keeps `className="border-state-destructive-hover-alt"` override.
- Deleted local `Field` (label+action+htmlFor span/label + children column). Replaced with canonical `<Field>/<FieldLabel>` from `@duedatehq/ui/components/ui/field`.
- Added `Card/CardHeader/CardTitle/CardDescription` and `Field/FieldLabel` imports; removed the local function definitions.
- `ReadonlyValue` kept as-is (not a re-invention of a shared primitive).
- Font-weight: `font-semibold` → `font-medium` on "Account initials" sub-label and "Delete account" danger text (red+bold ban).

### 2. features/notifications/notification-preferences-page.tsx — local Card/CardHead eliminated

- Deleted local `Card` (`<section rounded-xl border p-[22px_26px]>`) and `CardHead` (title+subtitle column). All four card usages (ChannelsCard, TypesMatrixCard, QuietHoursCard, MorningDigestCard) now use canonical `<Card>/<CardHeader>/<CardTitle>/<CardDescription>/<CardContent>`.
- Added canonical card imports; removed local function definitions.
- Font-weight: `font-semibold` → `font-medium` on channel name label, status "Enabled/Off" pill text, and type matrix row names.

### 3. routes/practice.tsx — icon data-icon + font-weight

- `RotateCcwIcon className="size-4" aria-hidden` → `RotateCcwIcon data-icon="inline-start"` (Reset to default button).
- `CalculatorIcon className="size-4" aria-hidden` → `CalculatorIcon data-icon="inline-start"` (Calculate preview button).
- `Loader2Icon className="size-4 animate-spin" aria-hidden` → `Loader2Icon data-icon="inline-start" className="animate-spin"` (preview pending state).
- `font-semibold` → `font-medium` on weight value readout (tabular-nums).

### 4. features/members/members-page.tsx — PlusIcon, shortcut Tooltip, CountPill

- `PlusIcon className="size-3.5" aria-hidden` → `PlusIcon data-icon="inline-start"` (canonical button icon slot).
- Keyboard shortcut hint span (`<span className="ml-1 font-mono text-caption-xs opacity-70">`) inside Invite button → moved to `<Tooltip>/<TooltipContent>` wrapping the button. Added `Tooltip/TooltipContent/TooltipTrigger` import.
- `<Badge variant="outline" shape="square" size="sm">` in `MembersSectionHeader` → `<CountPill tone="neutral">`. Added `CountPill` import from `@/components/primitives/count-pill`.

### 5. routes/billing.success.tsx — raw enum badge block removed

- Removed the `<div className="flex flex-wrap gap-2">` block that rendered `activeSubscription.status`, `activePlanName`, and `activeSubscription.billingInterval` as raw `<Badge variant="outline">` elements. The prose Alert above already confirms plan and status.
- Removed unused `Badge` import and unused `activePlanName` variable.

### 6. routes/billing.cancel.tsx — PageHeader added

- Added `<PageHeader breadcrumbs={[{label: t\`Billing\`, to: '/billing'}, {label: t\`Checkout canceled\`}]} title={<Trans>Checkout canceled</Trans>} />` to match the billing route family.
- Added `useLingui`, `Trans`, and `PageHeader` imports.

### 7. routes/billing.tsx — hero font-weight

- `text-xl font-semibold` (practice name) → `font-medium`.
- `text-2xl font-semibold` (current plan name) → `font-medium`.

### 8. routes/settings.permissions.tsx — font-weight

- `font-semibold` → `font-medium` on the info-notice text and scope-row labels (not page/section titles).

## Deferred

- **notifications-page.tsx type filter Select → FilterTrigger**: FilterTrigger wraps a Popover with custom content; the inbox type filter is a simple server-side Select — the abstraction doesn't fit cleanly without bigger surgery. Left as `<Select>`.
- **practice.tsx SettingsShell wrap**: structural change; existing Card usage is already canonical.
- **practice.tsx preview stat text-3xl font-semibold**: matches StatBand `text-stat-value font-semibold` pattern; leave.
- **practice.tsx table numeric cells font-semibold**: comparison table pattern; leave for consistency.
- **PlanOption min-h magic numbers** in billing.tsx: structural/layout concern, not a primitive re-invention.
