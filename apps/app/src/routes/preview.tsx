import { useEffect, useState } from 'react'
import {
  AlertCircleIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  SlidersHorizontalIcon,
  FilterIcon,
  ArrowRightIcon,
  CircleHelpIcon,
  MoonIcon,
  SunIcon,
  ArchiveIcon,
  Trash2Icon,
  PencilIcon,
  CopyIcon,
  InboxIcon,
  DollarSignIcon,
  AtSignIcon,
  CircleCheckIcon,
  CircleAlertIcon,
  ChevronDownIcon,
  CalendarClockIcon,
  MegaphoneIcon,
  HistoryIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { applyThemePreference, type ThemePreference } from '@duedatehq/ui/theme'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@duedatehq/ui/components/ui/alert-dialog'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@duedatehq/ui/components/ui/alert'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@duedatehq/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@duedatehq/ui/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@duedatehq/ui/components/ui/sheet'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from '@duedatehq/ui/components/ui/collapsible'
import { SearchableCombobox } from '@duedatehq/ui/components/ui/combobox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@duedatehq/ui/components/ui/command'
import {
  Field,
  FieldLabel as UiFieldLabel,
  FieldDescription,
  FieldError,
} from '@duedatehq/ui/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@duedatehq/ui/components/ui/input-group'
import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from '@duedatehq/ui/components/ui/preview-card'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@duedatehq/ui/components/ui/card'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'
import { Segmented } from '@duedatehq/ui/components/ui/segmented'
import { Separator } from '@duedatehq/ui/components/ui/separator'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Switch } from '@duedatehq/ui/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@duedatehq/ui/components/ui/tabs'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

import { CountDotChip } from '@/components/primitives/count-dot-chip'
import { LowConfidenceBadge } from '@/components/primitives/low-confidence-badge'
import { SearchInput } from '@/components/primitives/search-input'
import { ToggleChip } from '@/components/primitives/toggle-chip'
import { AiProvenanceBadge } from '@/components/primitives/ai-provenance-badge'
import { FieldLabel } from '@/components/primitives/field-label'
import { IsoDatePicker } from '@/components/primitives/iso-date-picker'
import { LocaleSwitcher } from '@/components/primitives/locale-switcher'
import { RelativeTime } from '@/components/primitives/relative-time'
import { StateBadge } from '@/components/primitives/state-badge'
import { TaxCodeLabel, TaxCodeBadge } from '@/components/primitives/tax-code-label'

import { StatTile } from '@/components/patterns/stat-tile'
import { Kbd, KbdHint } from '@/components/patterns/kbd'
import { InfoBanner } from '@/components/patterns/info-banner'
import { PageHeader } from '@/components/patterns/page-header'
import { Breadcrumb } from '@/components/patterns/breadcrumb'
import { EmptyState } from '@/components/patterns/empty-state'
import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { StatusBanner } from '@/components/patterns/status-banner'
import { FilterTrigger } from '@/components/patterns/filter-trigger'
import { FloatingActionBar } from '@/components/patterns/floating-action-bar'
import { RowActionsMenu } from '@/components/patterns/row-actions-menu'
import { TableHeaderMultiFilter } from '@/components/patterns/table-header-filter'
import { DestructiveChangePreview } from '@/components/patterns/destructive-change-preview'

// Feature-scoped components — small visual atoms that compose into route screens.
// Page-level components (AlertsListPage, ClientDetailWorkspace, Migration wizard,
// Dashboard sections, audit-log-page, etc.) are deliberately not previewed —
// they need RPC-loaded data, router context, or drawer providers to render.
import { AlertStatusBadge } from '@/features/alerts/components/AlertStatusBadge'
import { AlertStatusChip } from '@/features/alerts/components/AlertStatusChip'
import { DecisionActions } from '@/features/alerts/components/DecisionActions'
import { RelatedRuleRow } from '@/features/alerts/components/RelatedRuleRow'
import { RuleAcceptErrorDialog } from '@/features/rules/rule-detail-drawer'
import { AlertSourceStatusBadge } from '@/features/alerts/components/AlertSourceStatusBadge'
import { AlertSourceBadge } from '@/features/alerts/components/AlertSourceBadge'
import { AlertConfidencePill } from '@/features/alerts/components/AlertConfidencePill'
import { PulsingDot } from '@/features/alerts/components/PulsingDot'
import { StateTilegram } from '@/features/alerts/components/StateTilegram'
import { AlertCard } from '@/features/alerts/components/AlertCard'
import {
  AlertReadinessChip,
  AlertDecisionStatusNotice,
} from '@/features/alerts/components/AlertReadinessStatus'
import { AlertStructuredFields } from '@/features/alerts/components/AlertStructuredFields'
import { AffectedClientsTable } from '@/features/alerts/components/AffectedClientsTable'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { BlockedByChip } from '@/features/obligations/blocked-by-chip'
import { RejectionChip } from '@/features/obligations/rejection-chip'
import { StageActions } from '@/features/obligations/StageActions'
import { BlockerContextCard } from '@/features/obligations/BlockerContextCard'
import { UpgradeCtaButton } from '@/features/billing/upgrade-cta-button'
import { SurfaceSummaryStrip } from '@/features/_surface-vocabulary/SurfaceSummaryStrip'
import { ConceptHelp } from '@/features/concepts/concept-help'
import { Stepper } from '@/features/migration/Stepper'
import { SummaryMetric } from '@/features/migration/SummaryMetric'
import { FirmTimezoneSelect } from '@/features/firm/timezone-select'
import { AuditLogTable } from '@/features/audit/audit-log-table'
import {
  SectionFrame,
  SectionLabel,
  FilterChips,
  QueryPanelState,
  JurisdictionCode,
  ToneDot,
  HealthBadge,
} from '@/features/rules/rules-console-primitives'
import { ClientPeekHoverCard } from '@/features/clients/ClientPeekHoverCard'

import type {
  PulseAlertPublic,
  PulseAffectedClient,
  PulseDetail,
  AuditEventPublic,
  USFirmTimezone,
} from '@duedatehq/contracts'

// The gallery uses the canonical `Kbd` primitive from patterns/kbd
// directly instead of a local lookalike.

/**
 * `/preview` — a developer-facing component gallery for browsing the
 * DueDateHQ design system. Renders the live components with their real
 * tokens, hover states, focus rings, and motion. Unprotected — no auth
 * required so designers can poke at this without setting up a demo session.
 */

// Color tokens we want to surface at the top — the semantic ones designers
// reach for most often. Edit `packages/ui/src/styles/tokens/semantic-light.css`
// to change the values; this list is just a rendering manifest.
const COLOR_TOKENS: Array<{ name: string; cssVar: string; group: string }> = [
  { group: 'Text', name: 'text-primary', cssVar: '--text-primary' },
  { group: 'Text', name: 'text-secondary', cssVar: '--text-secondary' },
  { group: 'Text', name: 'text-tertiary', cssVar: '--text-tertiary' },
  { group: 'Text', name: 'text-accent', cssVar: '--text-accent' },
  { group: 'Text', name: 'text-destructive', cssVar: '--text-destructive' },
  { group: 'Text', name: 'text-success', cssVar: '--text-success' },
  { group: 'Text', name: 'text-warning', cssVar: '--text-warning' },
  { group: 'Background', name: 'background-default', cssVar: '--background-default' },
  { group: 'Background', name: 'background-soft', cssVar: '--background-soft' },
  { group: 'Background', name: 'background-inset', cssVar: '--background-inset' },
  { group: 'Background', name: 'bg-canvas', cssVar: '--bg-canvas' },
  { group: 'Border', name: 'divider-regular', cssVar: '--divider-regular' },
  { group: 'Border', name: 'divider-subtle', cssVar: '--divider-subtle' },
  { group: 'State', name: 'state-accent-active', cssVar: '--state-accent-active' },
  { group: 'State', name: 'state-accent-hover', cssVar: '--state-accent-hover' },
  { group: 'State', name: 'state-accent-active-alt', cssVar: '--state-accent-active-alt' },
  { group: 'State', name: 'state-destructive-hover', cssVar: '--state-destructive-hover' },
  { group: 'State', name: 'state-success-hover', cssVar: '--state-success-hover' },
  { group: 'State', name: 'state-warning-hover', cssVar: '--state-warning-hover' },
]

type SectionProps = { id: string; title: string; subtitle?: string; children: React.ReactNode }
function Section({ id, title, subtitle, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-divider-subtle pb-12">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

type RowProps = { label: string; children: React.ReactNode; mono?: string }
function Row({ label, children, mono }: RowProps) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-x-4 gap-y-2 border-t border-divider-subtle py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        {mono ? (
          <span className="mt-0.5 font-mono text-caption-xs text-text-tertiary">{mono}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

/** Gallery demo — opens the accept-mutation error dialog (Pencil `DGeuG`). */
function RuleAcceptErrorDialogDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Show accept error
      </Button>
      {open ? (
        <RuleAcceptErrorDialog
          ruleId="ak.individual_income_return.2026"
          error={{
            message:
              'The rule version changed while you were reviewing it. Reload to pick up the latest, then accept again.',
            code: 'CONFLICT',
          }}
          attempt={2}
          retrying={false}
          onRetry={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

const TOC: Array<{ id: string; label: string }> = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'typography', label: 'Typography' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'button', label: 'Button' },
  { id: 'toggle-chip', label: 'ToggleChip' },
  { id: 'badge', label: 'Badge' },
  { id: 'input', label: 'Inputs' },
  { id: 'field', label: 'Field · InputGroup' },
  { id: 'checkbox', label: 'Checkbox / Switch' },
  { id: 'select', label: 'Select' },
  { id: 'combobox', label: 'Combobox' },
  { id: 'collapsible', label: 'Collapsible' },
  { id: 'alert', label: 'Alert' },
  { id: 'card', label: 'Card' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'table', label: 'Table' },
  { id: 'tooltip', label: 'Tooltip · PreviewCard' },
  { id: 'skeleton', label: 'Skeleton' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'command', label: 'Command palette' },
  { id: 'toaster', label: 'Toaster' },
  { id: 'primitives', label: 'App primitives' },
  { id: 'date-state', label: 'Date · State · Tax · Time' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'page-chrome', label: 'Page chrome' },
  { id: 'table-patterns', label: 'Table patterns' },
  { id: 'bulk', label: 'Bulk actions' },
  { id: 'destructive', label: 'Destructive preview' },
  { id: 'pulse-bits', label: 'Pulse — status family' },
  { id: 'tilegram', label: 'StateTilegram' },
  { id: 'pulse-card', label: 'Pulse — cards' },
  { id: 'pulse-detail', label: 'Pulse — detail pieces' },
  { id: 'oblig-bits', label: 'Obligations — chips' },
  { id: 'oblig-blocks', label: 'Obligations — blocks' },
  { id: 'rules-console', label: 'Rules console primitives' },
  { id: 'migration-bits', label: 'Migration primitives' },
  { id: 'audit-table', label: 'Audit log table' },
  { id: 'firm-bits', label: 'Firm primitives' },
  { id: 'client-bits', label: 'Client hover card' },
  { id: 'feature-misc', label: 'Surface · Billing · Concepts' },
]

// === Feature-component fixture data ===========================================
// Built-from-scratch instances of the Pulse, audit, and obligation contract
// types so the data-heavy components have something realistic to render. None
// of this touches the network; it's purely visual fixture data.

const MOCK_PULSE_ALERT: PulseAlertPublic = {
  id: 'fa_mock_alert_ca_q3',
  pulseId: 'pulse_mock_ca_q3',
  status: 'matched',
  sourceStatus: 'approved',
  origin: 'live',
  actionDeadline: null,
  changeKind: 'deadline_shift',
  actionMode: 'due_date_overlay',
  firmImpact: 'matched',
  title: 'CA FTB extends Q3 estimated tax deadline by 14 days',
  source: 'CA FTB',
  sourceUrl: 'https://ftb.ca.gov/about-ftb/newsroom/news-releases',
  summary:
    'California Franchise Tax Board extended the Q3 2026 estimated payment deadline from Sep 15 to Sep 29 in response to Northern California wildfire disaster declarations affecting 4 counties.',
  publishedAt: '2026-05-28T15:00:00Z',
  dismissedAt: null,
  appliedAt: null,
  matchedCount: 12,
  needsReviewCount: 3,
  applyReadiness: { status: 'ready', missing: [] },
  duplicateSourceSnapshotCount: 0,
  confidence: 0.82,
  isSample: true,
  jurisdiction: 'CA',
  taxAreas: ['income_individual'],
  forms: ['1040-ES'],
}

const MOCK_PULSE_ALERT_LOW_CONF: PulseAlertPublic = {
  ...MOCK_PULSE_ALERT,
  id: 'fa_mock_alert_ny_form',
  title: 'NY DTF clarifies pass-through entity tax election',
  source: 'NY DTF',
  sourceUrl: 'https://tax.ny.gov',
  jurisdiction: 'NY',
  confidence: 0.46,
  matchedCount: 0,
  needsReviewCount: 7,
  changeKind: 'form_instruction',
  firmImpact: 'needs_review',
  applyReadiness: { status: 'needs_details', missing: ['new_due_date'] },
  status: 'reviewed',
  // NY PTE → business income, overriding the individual value from the spread.
  taxAreas: ['income_business'],
}

const MOCK_AFFECTED_CLIENTS: PulseAffectedClient[] = [
  {
    obligationId: 'obl_mock_acme_q3',
    clientId: 'cli_mock_acme',
    clientName: 'Acme LLC',
    state: 'CA',
    county: 'Sonoma',
    entityType: 'partnership',
    taxType: '1040ES',
    currentDueDate: '2026-09-15',
    newDueDate: '2026-09-29',
    status: 'review',
    matchStatus: 'eligible',
    reason: null,
  },
  {
    obligationId: 'obl_mock_brightline_q3',
    clientId: 'cli_mock_brightline',
    clientName: 'Brightline Cafe',
    state: 'CA',
    county: 'Mendocino',
    entityType: 'sole_prop',
    taxType: '1040ES',
    currentDueDate: '2026-09-15',
    newDueDate: '2026-09-29',
    status: 'waiting_on_client',
    matchStatus: 'eligible',
    reason: null,
  },
  {
    obligationId: 'obl_mock_northside_q3',
    clientId: 'cli_mock_northside',
    clientName: 'Northside Plumbing',
    state: 'CA',
    county: null,
    entityType: 's_corp',
    taxType: '1040ES',
    currentDueDate: '2026-09-15',
    newDueDate: null,
    status: 'review',
    matchStatus: 'needs_review',
    reason: 'County mismatch — verify before applying.',
  },
]

const MOCK_PULSE_DETAIL: PulseDetail = {
  alert: MOCK_PULSE_ALERT,
  jurisdiction: 'CA',
  counties: ['Sonoma', 'Mendocino', 'Napa', 'Lake'],
  forms: ['540-ES', '100-ES'],
  entityTypes: ['partnership', 'sole_prop', 's_corp'],
  originalDueDate: '2026-09-15',
  newDueDate: '2026-09-29',
  effectiveFrom: '2026-05-28',
  effectiveUntil: null,
  affectedRuleIds: ['rule_ca_q3_estimated', 'rule_ca_estimated_individual'],
  reverifyRuleIds: [],
  structuredChange: null,
  sourceExcerpt:
    'The Franchise Tax Board today announced postponement of the September 15, 2026 estimated tax payment deadline to September 29, 2026 for taxpayers in Sonoma, Mendocino, Napa, and Lake counties due to wildfire disaster declarations.',
  reviewedAt: null,
  applyReadiness: { status: 'ready', missing: [] },
  affectedClients: MOCK_AFFECTED_CLIENTS,
}

const MOCK_AUDIT_EVENTS: AuditEventPublic[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    firmId: 'firm_mock_brightline',
    actorId: 'mock_user_owner_sarah',
    actorLabel: 'Sarah Chen',
    actorType: 'user',
    previousActorType: null,
    aiEventMetadata: null,
    entityType: 'obligation',
    entityId: 'obl_mock_acme_q3',
    action: 'status_changed',
    beforeJson: { status: 'in_review' },
    afterJson: { status: 'waiting_on_client' },
    reason: 'Sent K-1 request to client',
    ipHash: null,
    userAgentHash: null,
    createdAt: '2026-05-30T19:42:11Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    firmId: 'firm_mock_brightline',
    actorId: null,
    actorLabel: null,
    actorType: 'system',
    previousActorType: null,
    aiEventMetadata: null,
    entityType: 'pulse_alert',
    entityId: 'fa_mock_alert_ca_q3',
    action: 'pulse_applied',
    beforeJson: { dueDate: '2026-09-15' },
    afterJson: { dueDate: '2026-09-29' },
    reason: 'Pulse rule rolled forward 12 deadlines.',
    ipHash: null,
    userAgentHash: null,
    createdAt: '2026-05-29T08:15:33Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    firmId: 'firm_mock_brightline',
    actorId: 'mock_user_owner_sarah',
    actorLabel: 'Sarah Chen',
    actorType: 'ai_assisted',
    previousActorType: 'user',
    aiEventMetadata: {
      model: 'claude-opus-4.7',
      promptVersion: 'v3.1',
      inputTokens: 2400,
      outputTokens: 312,
      latencyMs: 1420,
      confidence: 0.91,
    },
    entityType: 'obligation',
    entityId: 'obl_mock_brightline_q3',
    action: 'milestone_note_added',
    beforeJson: null,
    afterJson: { note: 'Awaiting July QuickBooks export.' },
    reason: null,
    ipHash: null,
    userAgentHash: null,
    createdAt: '2026-05-28T14:01:08Z',
  },
]

const MOCK_STAGE_TASKS = [
  {
    id: 't1',
    label: 'Mark as filed',
    flavor: 'mutation' as const,
    primary: true,
    hint: 'Move this obligation to the Filed state',
  },
  { id: 't2', label: 'Reassign owner', flavor: 'mutation' as const },
  { id: 't3', label: 'Open audit trail', flavor: 'routing' as const },
  {
    id: 't4',
    label: 'Email client confirmation of filing',
    flavor: 'manual' as const,
  },
]

// US-state alert counts used by the StateTilegram preview. Mixed numbers
// so each tone in the legend lights up.
const TILEGRAM_COUNTS = new Map<string, number>([
  ['CA', 14],
  ['TX', 9],
  ['NY', 7],
  ['FL', 5],
  ['WA', 4],
  ['IL', 3],
  ['CO', 2],
  ['MA', 2],
  ['OR', 1],
  ['AZ', 1],
  ['GA', 1],
])

// Typography scale — pulled from packages/ui/src/styles/preset.css. These
// are the size/weight pairings the design system uses. Update the strings
// here if the Tailwind config changes.
const TYPE_SCALE: Array<{ name: string; className: string; spec: string }> = [
  { name: 'Display', className: 'text-3xl font-semibold tracking-tight', spec: '30 / 36 · 600' },
  { name: 'H1', className: 'text-2xl font-semibold', spec: '24 / 32 · 600' },
  { name: 'H2', className: 'text-xl font-semibold', spec: '20 / 28 · 600' },
  { name: 'H3', className: 'text-lg font-semibold', spec: '18 / 26 · 600' },
  { name: 'Body large', className: 'text-base', spec: '16 / 24 · 400' },
  { name: 'Body', className: 'text-sm', spec: '14 / 20 · 400' },
  { name: 'Caption', className: 'text-xs', spec: '12 / 16 · 400' },
  {
    name: 'Eyebrow',
    className: 'text-xs font-semibold uppercase tracking-wider',
    spec: '11 / 14 · 600 uppercase',
  },
]

// Tailwind spacing scale (the values we actually use in DueDateHQ layouts).
// Each step = 0.25rem = 4px in the default Tailwind v4 setup.
const SPACING_STEPS: Array<{ token: string; rem: string; px: string }> = [
  { token: '0.5', rem: '0.125rem', px: '2px' },
  { token: '1', rem: '0.25rem', px: '4px' },
  { token: '1.5', rem: '0.375rem', px: '6px' },
  { token: '2', rem: '0.5rem', px: '8px' },
  { token: '3', rem: '0.75rem', px: '12px' },
  { token: '4', rem: '1rem', px: '16px' },
  { token: '5', rem: '1.25rem', px: '20px' },
  { token: '6', rem: '1.5rem', px: '24px' },
  { token: '8', rem: '2rem', px: '32px' },
  { token: '10', rem: '2.5rem', px: '40px' },
  { token: '12', rem: '3rem', px: '48px' },
  { token: '16', rem: '4rem', px: '64px' },
]

export function PreviewRoute() {
  const [tab, setTab] = useState('overview')
  const [checked, setChecked] = useState(true)
  const [switched, setSwitched] = useState(false)
  const [search, setSearch] = useState('')
  const [theme, setTheme] = useState<ThemePreference>('light')
  const [selectValue, setSelectValue] = useState('all')
  const [comboValue, setComboValue] = useState<string | null>(null)
  const [collapsibleOpen, setCollapsibleOpen] = useState(false)
  const [filterActive, setFilterActive] = useState(false)
  const [datePickerValue, setDatePickerValue] = useState('2026-09-15')
  const [tableFilterSelected, setTableFilterSelected] = useState<readonly string[]>([
    'in_review',
    'waiting_on_client',
  ])
  const [activeState, setActiveState] = useState<string | null>('CA')
  const [rulesFilter, setRulesFilter] = useState<'all' | 'verified' | 'draft'>('all')
  const [chipOn, setChipOn] = useState(true)
  const [timezone, setTimezone] = useState<USFirmTimezone>('America/Los_Angeles')
  const [affectedSelection, setAffectedSelection] = useState<Set<string>>(
    () => new Set(['obl_mock_acme_q3', 'obl_mock_brightline_q3']),
  )
  const [confirmedReviewIds, setConfirmedReviewIds] = useState<Set<string>>(() => new Set())

  // Static demo data
  const comboOptions = [
    { value: 'acme', label: 'Acme LLC', keywords: ['ca', 'partnership'], meta: 'CA · Partnership' },
    { value: 'brightline', label: 'Brightline Cafe', keywords: ['ny', 'llc'], meta: 'NY · LLC' },
    {
      value: 'northside',
      label: 'Northside Plumbing',
      keywords: ['tx', 's-corp'],
      meta: 'TX · S-Corp',
    },
    {
      value: 'quark',
      label: 'Quark & Daughters Inc.',
      keywords: ['de', 'c-corp'],
      meta: 'DE · C-Corp',
    },
  ]

  // Apply the selected theme to <html> so the whole preview reflects it.
  // The DueDateHQ theme module flips the `dark` class + writes the
  // meta[theme-color] tag for us.
  useEffect(() => {
    applyThemePreference(theme)
  }, [theme])

  return (
    <div className="min-h-screen bg-bg-canvas text-text-primary">
      <div className="mx-auto flex max-w-[1280px] gap-8 px-8 py-10">
        {/* Sticky TOC */}
        <nav className="sticky top-10 hidden h-[calc(100vh-5rem)] w-44 shrink-0 overflow-y-auto md:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Sections
          </p>
          <ul className="space-y-1.5">
            {TOC.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block text-sm text-text-secondary hover:text-text-primary"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 space-y-12">
          {/* Header */}
          <header className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
                DueDateHQ component library
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                Live preview of <code className="font-mono text-xs">@duedatehq/ui</code> primitives
                and <code className="font-mono text-xs">apps/app/src/components/</code> composed
                building blocks. All renders use the real semantic tokens — change a value in{' '}
                <code className="font-mono text-xs">
                  packages/ui/src/styles/tokens/semantic-light.css
                </code>{' '}
                and refresh.
              </p>
            </div>
            {/* Theme toggle — flips the whole preview between light + dark so
                designers can verify token mappings without leaving the page.
                Uses the shared <Segmented> (pick-one), like every other
                pick-one toggle in the app. */}
            <Segmented<ThemePreference>
              ariaLabel="Theme"
              value={theme}
              onValueChange={setTheme}
              options={[
                { value: 'light', label: 'Light', icon: SunIcon },
                { value: 'dark', label: 'Dark', icon: MoonIcon },
                { value: 'system', label: 'System' },
              ]}
            />
          </header>

          {/* Tokens */}
          <Section
            id="tokens"
            title="Color tokens"
            subtitle="Semantic light theme. These are the variable names to reference in code — never hardcode hex."
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
              {COLOR_TOKENS.map((tok) => (
                <div key={tok.cssVar} className="flex items-center gap-3 py-1.5">
                  <div
                    className="size-8 shrink-0 rounded border border-divider-regular"
                    style={{ backgroundColor: `var(${tok.cssVar})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-text-primary">{tok.name}</p>
                    <p className="truncate font-mono text-caption-xs text-text-tertiary">
                      {tok.cssVar}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Typography */}
          <Section
            id="typography"
            title="Typography scale"
            subtitle="The size/weight pairings used across DueDateHQ. Font family is the system stack — no custom font file."
          >
            <div className="space-y-3">
              {TYPE_SCALE.map((step) => (
                <div
                  key={step.name}
                  className="grid grid-cols-[100px_1fr_auto] items-baseline gap-4 border-t border-divider-subtle pt-3 first:border-t-0 first:pt-0"
                >
                  <span className="text-xs font-medium text-text-secondary">{step.name}</span>
                  <span className={`${step.className} text-text-primary`}>
                    The quick CPA filed the brown fox's 1120
                  </span>
                  <span className="whitespace-nowrap font-mono text-caption-xs text-text-tertiary">
                    {step.spec}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Spacing */}
          <Section
            id="spacing"
            title="Spacing scale"
            subtitle="Tailwind v4 spacing tokens. 1 step = 0.25rem = 4px."
          >
            <div className="space-y-1.5">
              {SPACING_STEPS.map((step) => (
                <div key={step.token} className="flex items-center gap-4 py-1">
                  <span className="w-12 font-mono text-xs font-medium text-text-secondary">
                    {step.token}
                  </span>
                  <div
                    className="h-3 bg-state-accent-active-alt"
                    style={{ width: step.rem }}
                    aria-hidden
                  />
                  <span className="font-mono text-caption-xs text-text-tertiary">
                    {step.rem} · {step.px}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Button */}
          <Section
            id="button"
            title="Button"
            subtitle="Emphasis ladder (primary → secondary → tertiary → ghost) + accent / link + a parallel destructive ladder + inverted-ghost for dark chrome. 8 sizes (4 text + 4 icon). Built on Base UI button; icon+label via data-icon attributes."
          >
            <Row label="Emphasis ladder" mono="variant=…">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="tertiary">Tertiary</Button>
              <Button variant="ghost">Ghost</Button>
            </Row>
            <Row label="Accent + link" mono="low-emphasis, attention">
              <Button variant="accent">Accent</Button>
              <Button variant="link">Link</Button>
            </Row>
            {/* On a gray section pane: secondary's white fill pops, tertiary
                keeps its boundary via the hairline, ghost stays invisible
                until hover — the three stay distinguishable. */}
            <Row label="On gray surface" mono="bg-background-section">
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-background-section p-3">
                <Button variant="secondary">Secondary</Button>
                <Button variant="tertiary">Tertiary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="accent">Accent</Button>
              </div>
            </Row>
            <Row label="Destructive ladder" mono="variant=destructive-*">
              <Button variant="destructive-primary">Primary</Button>
              <Button variant="destructive-secondary">Secondary</Button>
              <Button variant="destructive-tertiary">Tertiary</Button>
              <Button variant="destructive-ghost">Ghost</Button>
            </Row>
            {/* Inverted-ghost only reads correctly on dark chrome — the same
                bg-text-primary surface the alerts bulk-action bar uses. */}
            <Row label="Inverted (dark chrome)" mono="variant=inverted-ghost">
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-text-primary p-3">
                <Button variant="inverted-ghost" size="sm">
                  <ArchiveIcon /> Dismiss
                </Button>
                <Button variant="inverted-ghost" size="icon-sm" aria-label="Clear">
                  <XIcon />
                </Button>
              </div>
            </Row>
            <Row label="Legacy aliases" mono="default · outline · destructive">
              <Button variant="default">Default → primary</Button>
              <Button variant="outline">Outline → secondary</Button>
              <Button variant="destructive">Destructive → dest-secondary</Button>
            </Row>
            <Row label="Sizes" mono="size=…">
              <Button variant="primary" size="xs">
                Extra small
              </Button>
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="primary">Default</Button>
              <Button variant="primary" size="lg">
                Large
              </Button>
            </Row>
            <Row label="Icon sizes" mono="size=icon-*">
              <Button variant="secondary" size="icon-xs" aria-label="Add">
                <PlusIcon />
              </Button>
              <Button variant="secondary" size="icon-sm" aria-label="Add">
                <PlusIcon />
              </Button>
              <Button variant="secondary" size="icon" aria-label="Add">
                <PlusIcon />
              </Button>
              <Button variant="secondary" size="icon-lg" aria-label="Add">
                <PlusIcon />
              </Button>
            </Row>
            <Row label="With icon">
              <Button variant="primary">
                <PlusIcon /> Add deadline
              </Button>
              <Button variant="secondary">
                Continue <ArrowRightIcon />
              </Button>
              <Button variant="ghost">
                <FilterIcon /> Filter
              </Button>
            </Row>
            <Row label="Disabled">
              <Button variant="primary" disabled>
                Primary
              </Button>
              <Button variant="secondary" disabled>
                Secondary
              </Button>
              <Button variant="tertiary" disabled>
                Tertiary
              </Button>
              <Button variant="accent" disabled>
                Accent
              </Button>
            </Row>
          </Section>

          {/* ToggleChip */}
          <Section
            id="toggle-chip"
            title="ToggleChip"
            subtitle="The canonical engaged-filter / pick-one chip. Active = accent tint + accent border + accent text (an 'engaged' look, not a solid 'primary' fill). aria-pressed toggle. Used by the rules entity filter, command-palette scope pills, and the states-rail review toggle."
          >
            <Row label="Selected vs not" mono="selected=…">
              <ToggleChip selected={chipOn} onClick={() => setChipOn((v) => !v)}>
                Selected
              </ToggleChip>
              <ToggleChip selected={!chipOn} onClick={() => setChipOn((v) => !v)}>
                Not selected
              </ToggleChip>
            </Row>
            <Row label="With icon">
              <ToggleChip selected icon={FilterIcon} onClick={() => {}}>
                Needs review
              </ToggleChip>
            </Row>
            <Row label="With trailing count">
              <ToggleChip selected onClick={() => {}}>
                <span>Partnership</span>
                <span className="font-semibold tabular-nums text-text-accent">12</span>
              </ToggleChip>
            </Row>
            <Row label="Sizes" mono="size=…">
              <ToggleChip selected size="sm" onClick={() => {}}>
                Small
              </ToggleChip>
              <ToggleChip selected size="md" onClick={() => {}}>
                Medium
              </ToggleChip>
            </Row>
          </Section>

          {/* Badge */}
          <Section
            id="badge"
            title="Badge"
            subtitle="Inline status labels. The default variant uses the accent palette; pair with BadgeStatusDot for a leading dot."
          >
            <Row label="Variants" mono="variant=…">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
            </Row>
            <Row label="With status dot">
              <Badge>
                <BadgeStatusDot /> In review
              </Badge>
              <Badge variant="secondary">
                <BadgeStatusDot /> Filed
              </Badge>
            </Row>
            <Row label="With icon">
              <Badge>
                <CheckIcon /> Verified
              </Badge>
              <Badge variant="secondary">
                <XIcon /> Skipped
              </Badge>
            </Row>
          </Section>

          {/* Inputs */}
          <Section
            id="input"
            title="Inputs"
            subtitle="Text input, textarea, label — pair with Field wrappers in real use for helper text + error states."
          >
            <Row label="Text input">
              <div className="grid w-full max-w-md gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@firm.com" />
              </div>
            </Row>
            <Row label="With value">
              <div className="grid w-full max-w-md gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" defaultValue="Sarah Chen" />
              </div>
            </Row>
            <Row label="Disabled">
              <div className="grid w-full max-w-md gap-1.5">
                <Label htmlFor="dis">Read only</Label>
                <Input id="dis" defaultValue="locked@example.com" disabled />
              </div>
            </Row>
            <Row label="Textarea">
              <div className="grid w-full max-w-md gap-1.5">
                <Label htmlFor="notes">Milestone note</Label>
                <Textarea id="notes" rows={3} placeholder="What happened on this obligation?" />
              </div>
            </Row>
            <Row label="Search input" mono="<SearchInput />">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search clients, deadlines, rules…"
                className="w-full max-w-md"
              />
            </Row>
          </Section>

          {/* Field + InputGroup */}
          <Section
            id="field"
            title="Field · InputGroup"
            subtitle="Form-field wrappers. Field bundles label + control + helper/error text. InputGroup wraps an input with leading/trailing addons."
          >
            <Row label="Field (basic)" mono="<Field />">
              <Field className="w-full max-w-md">
                <UiFieldLabel htmlFor="field-ein">Federal EIN</UiFieldLabel>
                <Input id="field-ein" placeholder="00-0000000" />
                <FieldDescription>9-digit number assigned by the IRS.</FieldDescription>
              </Field>
            </Row>
            <Row label="Field (error)" mono="<Field /> + <FieldError />">
              <Field className="w-full max-w-md">
                <UiFieldLabel htmlFor="field-ein-bad">Federal EIN</UiFieldLabel>
                <Input id="field-ein-bad" defaultValue="not a number" aria-invalid />
                <FieldError>EIN must be 9 digits in the format XX-XXXXXXX.</FieldError>
              </Field>
            </Row>
            <Row label="InputGroup (leading $)" mono="<InputGroup />">
              <InputGroup className="w-full max-w-md">
                <InputGroupAddon>
                  <InputGroupText>$</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput placeholder="0.00" />
              </InputGroup>
            </Row>
            <Row label="InputGroup (leading icon)">
              <InputGroup className="w-full max-w-md">
                <InputGroupAddon>
                  <AtSignIcon className="size-4 text-text-tertiary" aria-hidden />
                </InputGroupAddon>
                <InputGroupInput placeholder="you@firm.com" />
              </InputGroup>
            </Row>
          </Section>

          {/* Checkbox / Switch */}
          <Section
            id="checkbox"
            title="Checkbox · Switch · Separator"
            subtitle="Selection primitives. Use Switch for instant-apply settings, Checkbox for multi-select and form fields."
          >
            <Row label="Checkbox">
              <div className="flex items-center gap-2">
                <Checkbox id="cb" checked={checked} onCheckedChange={(v) => setChecked(v)} />
                <Label htmlFor="cb">Remember this firm on this device</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="cb2" disabled />
                <Label htmlFor="cb2" className="text-text-tertiary">
                  Disabled
                </Label>
              </div>
            </Row>
            <Row label="Switch">
              <div className="flex items-center gap-2">
                <Switch id="sw" checked={switched} onCheckedChange={setSwitched} />
                <Label htmlFor="sw">Auto-file when ready</Label>
              </div>
            </Row>
            <Row label="Separator" mono="<Separator />">
              <div className="w-full max-w-md">
                <p className="text-sm">Above</p>
                <Separator className="my-3" />
                <p className="text-sm">Below</p>
              </div>
            </Row>
          </Section>

          {/* Select */}
          <Section
            id="select"
            title="Select"
            subtitle="Single-value dropdown with grouped options. For multi-select or async search, use SearchableCombobox."
          >
            <Row label="Default" mono="<Select />">
              <Select value={selectValue} onValueChange={(value) => setSelectValue(value ?? 'all')}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filter by owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>All</SelectLabel>
                    <SelectItem value="all">All owners</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>People</SelectLabel>
                    <SelectItem value="sarah">Sarah Chen</SelectItem>
                    <SelectItem value="avery">Avery Patel</SelectItem>
                    <SelectItem value="jules">Jules Rivera</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Row>
          </Section>

          {/* Combobox */}
          <Section
            id="combobox"
            title="Combobox (SearchableCombobox)"
            subtitle="Single-select with built-in fuzzy search. Use over Select when there are >10 options or when search by alias/EIN matters."
          >
            <Row label="Default" mono="<SearchableCombobox />">
              <SearchableCombobox
                value={comboValue}
                onValueChange={setComboValue}
                options={comboOptions}
                placeholder="Pick a client…"
                searchPlaceholder="Search by name, state, EIN…"
                emptyState="No clients match."
                groupHeading="Clients"
                className="w-72"
              />
            </Row>
          </Section>

          {/* Collapsible */}
          <Section
            id="collapsible"
            title="Collapsible"
            subtitle="Expand/collapse a panel. Base UI primitive — no animation by default; add transitions per surface."
          >
            <Row label="Default" mono="<Collapsible />">
              <Collapsible
                open={collapsibleOpen}
                onOpenChange={setCollapsibleOpen}
                className="w-full max-w-md"
              >
                <CollapsibleTrigger
                  render={
                    <Button variant="ghost" size="sm">
                      <ChevronDownIcon
                        className={collapsibleOpen ? 'rotate-180 transition' : 'transition'}
                      />
                      Advanced options
                    </Button>
                  }
                />
                <CollapsiblePanel className="mt-2 rounded-lg border border-divider-regular bg-background-default p-3 text-sm text-text-secondary">
                  Inner content. Use this for "show more" rows on settings, advanced filters, or
                  rarely-used form sections that shouldn't crowd the default view.
                </CollapsiblePanel>
              </Collapsible>
            </Row>
          </Section>

          {/* Alert */}
          <Section
            id="alert"
            title="Alert"
            subtitle="Inline informational / warning / error banners. AlertAction slot for a primary recovery CTA."
          >
            <Row label="Default">
              <Alert className="max-w-2xl">
                <AlertCircleIcon className="size-4" />
                <AlertTitle>Heads up — 3 deadlines move to waiting</AlertTitle>
                <AlertDescription>
                  We've drafted requests for the missing K-1s. Review before sending.
                </AlertDescription>
                <AlertAction>
                  <Button size="sm" variant="secondary">
                    Review
                  </Button>
                </AlertAction>
              </Alert>
            </Row>
          </Section>

          {/* Card */}
          <Section
            id="card"
            title="Card"
            subtitle="Surface container. Header / Title / Description / Action / Content / Footer slots are independent — use only what you need."
          >
            <Row label="Basic">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Q3 estimated tax — Acme LLC</CardTitle>
                  <CardDescription>Due Sep 15 · waiting on QuickBooks export</CardDescription>
                  <CardAction>
                    <Button variant="ghost" size="icon" aria-label="More">
                      <CircleHelpIcon />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-secondary">
                    Last touched 2 days ago by Avery. Next step: chase the client for July
                    statements.
                  </p>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button variant="primary" size="sm">
                    Mark done
                  </Button>
                  <Button variant="ghost" size="sm">
                    Open
                  </Button>
                </CardFooter>
              </Card>
            </Row>
          </Section>

          {/* Tabs */}
          <Section
            id="tabs"
            title="Tabs"
            subtitle="Used in detail panels and section switchers. State is controlled via `value` + `onValueChange`."
          >
            <Row label="Default" mono="<Tabs />">
              <Tabs value={tab} onValueChange={setTab} className="w-full max-w-xl">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="audit">Audit log</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="pt-4 text-sm text-text-secondary">
                  Overview content
                </TabsContent>
                <TabsContent value="notes" className="pt-4 text-sm text-text-secondary">
                  Notes content
                </TabsContent>
                <TabsContent value="files" className="pt-4 text-sm text-text-secondary">
                  Files content
                </TabsContent>
                <TabsContent value="audit" className="pt-4 text-sm text-text-secondary">
                  Audit content
                </TabsContent>
              </Tabs>
            </Row>
          </Section>

          {/* Table */}
          <Section
            id="table"
            title="Table"
            subtitle="Low-level table primitives. /deadlines and /clients compose on top of these with sorting, pagination, and row actions."
          >
            <Row label="Basic">
              <div className="w-full overflow-hidden rounded-lg border border-divider-regular">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obligation</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Form 1120 — Annual return</TableCell>
                      <TableCell>Acme LLC</TableCell>
                      <TableCell>Avery</TableCell>
                      <TableCell className="text-right tabular-nums">Sep 15</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Sales tax — California</TableCell>
                      <TableCell>Brightline Cafe</TableCell>
                      <TableCell>Jules</TableCell>
                      <TableCell className="text-right tabular-nums">Sep 30</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Q3 estimated</TableCell>
                      <TableCell>Northside Plumbing</TableCell>
                      <TableCell>Sarah</TableCell>
                      <TableCell className="text-right tabular-nums">Sep 15</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Row>
          </Section>

          {/* Tooltip + PreviewCard */}
          <Section
            id="tooltip"
            title="Tooltip · PreviewCard"
            subtitle="Hover affordances. Tooltip is for short text labels; PreviewCard is for richer hover previews of linked entities."
          >
            <Row label="Default">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button variant="ghost" size="icon" aria-label="Help">
                      <CircleHelpIcon />
                    </Button>
                  }
                />
                <TooltipContent>This client has no obligations yet</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<Button variant="outline">Hover me for shortcut</Button>} />
                <TooltipContent>
                  Press <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd> for command palette
                </TooltipContent>
              </Tooltip>
            </Row>
            <Row label="PreviewCard" mono="<PreviewCard />">
              <PreviewCard>
                <PreviewCardTrigger
                  render={
                    <a
                      href="#"
                      className="text-sm font-medium text-text-accent underline-offset-2 hover:underline"
                    >
                      Acme LLC
                    </a>
                  }
                />
                <PreviewCardContent className="w-80 space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary">Acme LLC</p>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Partnership · CA · EIN 12-3456789 · 14 active obligations
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <StatTile label="Open" value="14" />
                    <StatTile label="Waiting" value="3" tone="muted" />
                    <StatTile label="Overdue" value="0" tone="muted" />
                  </div>
                </PreviewCardContent>
              </PreviewCard>
            </Row>
          </Section>

          {/* Skeleton */}
          <Section
            id="skeleton"
            title="Skeleton"
            subtitle="Loading placeholders. Match the rough shape of the content that's coming."
          >
            <Row label="Row">
              <div className="flex w-full max-w-md items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </Row>
          </Section>

          {/* Overlays — click triggers to open */}
          <Section
            id="overlays"
            title="Overlays"
            subtitle="Modal, slide-over, popover, dropdown menu, confirm dialog. Click any trigger to open."
          >
            <Row label="Dialog" mono="<Dialog />">
              <Dialog>
                <DialogTrigger render={<Button variant="primary">Open dialog</Button>} />
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reassign deadline</DialogTitle>
                    <DialogDescription>
                      Pick a new owner for Form 1120 — Acme LLC. They'll get a notification.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-2 py-2">
                    <Label htmlFor="dlg-owner">New owner</Label>
                    <Input id="dlg-owner" defaultValue="Avery Patel" />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost">Cancel</Button>
                    <Button variant="primary">Reassign</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Row>

            <Row label="AlertDialog" mono="<AlertDialog />">
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive">Delete client</Button>} />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Acme LLC?</AlertDialogTitle>
                    <AlertDialogDescription>
                      14 deadlines and 8 documents will move to the trash. You can restore them
                      within 30 days.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Delete client</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Row>

            <Row label="Sheet" mono="<Sheet />">
              <Sheet>
                <SheetTrigger render={<Button variant="secondary">Open sheet</Button>} />
                <SheetContent className="w-[420px]">
                  <SheetHeader>
                    <SheetTitle>Obligation detail</SheetTitle>
                    <SheetDescription>
                      Form 1120 — Acme LLC · Due Sep 15 · Owner: Avery
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 space-y-3 px-4 py-2 text-sm text-text-secondary">
                    <p>
                      This is the slide-over pattern used by the deadline drilldown, the client
                      detail panel, and the rule editor. Right-side, full viewport height, 420px
                      wide.
                    </p>
                    <p>
                      Internal scroll, sticky header + footer. The chrome here is the same primitive
                      every panel reuses.
                    </p>
                  </div>
                  <SheetFooter>
                    <Button variant="ghost">Cancel</Button>
                    <Button variant="primary">Save changes</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </Row>

            <Row label="Popover" mono="<Popover />">
              <Popover>
                <PopoverTrigger render={<Button variant="outline">Open popover</Button>} />
                <PopoverContent className="w-72">
                  <PopoverHeader>
                    <PopoverTitle>Quick edit</PopoverTitle>
                    <PopoverDescription>Adjust the due date inline.</PopoverDescription>
                  </PopoverHeader>
                  <div className="grid gap-2 p-3 pt-0">
                    <Label htmlFor="pop-date">Due date</Label>
                    <Input id="pop-date" type="date" defaultValue="2026-09-15" />
                    <Button variant="primary" size="sm" className="mt-2 justify-self-end">
                      Save
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </Row>

            <Row label="DropdownMenu" mono="<DropdownMenu />">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="sm">
                      Row actions <CircleHelpIcon />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="w-52">
                  {/* Base UI GroupLabel needs a Menu.Group ancestor or it
                      throws "MenuGroupContext is missing" on open. */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Form 1120 — Acme LLC</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <PencilIcon /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CopyIcon /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ArchiveIcon /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-text-destructive">
                    <Trash2Icon /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Row>
          </Section>

          {/* Command palette */}
          <Section
            id="command"
            title="Command palette"
            subtitle="cmdk primitives. The real palette mounts inside a Dialog; here it's rendered inline so you can read the structure."
          >
            <Row label="Inline" mono="<Command />">
              <Command className="w-full max-w-md rounded-lg border border-divider-regular">
                <CommandInput placeholder="Type a command or search…" />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Navigate">
                    <CommandItem>
                      <InboxIcon /> Go to Today
                      <CommandShortcut>G T</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <InboxIcon /> Go to Deadlines
                      <CommandShortcut>G D</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <InboxIcon /> Go to Clients
                      <CommandShortcut>G C</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Actions">
                    <CommandItem>
                      <PlusIcon /> Add deadline
                      <CommandShortcut>N D</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <PlusIcon /> Add client
                      <CommandShortcut>N C</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </Row>
          </Section>

          {/* Toaster */}
          <Section
            id="toaster"
            title="Toaster (sonner)"
            subtitle="Global toast surface — mounted once in main.tsx. Use toast.* to fire. Tone matches the action result; default messages fade after 4s."
          >
            <Row label="Fire a toast" mono="toast.*">
              <Button
                variant="primary"
                onClick={() =>
                  toast.success('Deadline marked filed', { description: 'Form 1120 — Acme LLC' })
                }
              >
                Success
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast.info('3 reminders paused', { description: 'Client replied — review' })
                }
              >
                Info
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast.warning('Rule library is read-only this session', {
                    description: 'Switch to a writable env to edit.',
                  })
                }
              >
                Warning
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  toast.error('Could not save', { description: 'Network error. Try again.' })
                }
              >
                Error
              </Button>
            </Row>
          </Section>

          {/* App primitives */}
          <Section
            id="primitives"
            title="App primitives"
            subtitle="DueDateHQ-specific atoms in apps/app/src/components/primitives/."
          >
            <Row label="CountDotChip" mono="primitives/count-dot-chip">
              <CountDotChip count={3} tone="accent" label="need review" />
              <CountDotChip count={12} tone="warning" label="due this week" />
              <CountDotChip count={2} tone="destructive" label="overdue" />
              <CountDotChip count={8} tone="success" label="filed today" />
              <CountDotChip count={5} tone="muted" label="skipped" />
            </Row>
            <Row label="LowConfidenceBadge" mono="primitives/low-confidence-badge">
              <LowConfidenceBadge />
            </Row>
            <Row label="SearchInput" mono="primitives/search-input">
              <SearchInput
                value=""
                onChange={() => {}}
                placeholder="Search…"
                className="w-full max-w-md"
              />
            </Row>
            <Row label="FieldLabel" mono="primitives/field-label">
              <div className="w-full max-w-md space-y-1">
                <FieldLabel>Federal EIN</FieldLabel>
                <p className="text-sm text-text-primary">12-3456789</p>
              </div>
              <div className="w-full max-w-md space-y-1">
                <FieldLabel>State filing</FieldLabel>
                <p className="text-sm text-text-primary">California · Annual report</p>
              </div>
            </Row>
            <Row label="AiProvenanceBadge" mono="primitives/ai-provenance-badge">
              <span className="text-sm text-text-primary">
                Acme LLC will owe ~$4,200 in Q3 estimated
              </span>
              <AiProvenanceBadge generatedAt="2026-05-30T14:30:00Z" />
              <AiProvenanceBadge generatedAt="2026-05-30T14:30:00Z" variant="chip" />
            </Row>
            <Row label="LocaleSwitcher" mono="primitives/locale-switcher">
              <LocaleSwitcher />
              <LocaleSwitcher iconOnly />
              <LocaleSwitcher variant="ghost" />
            </Row>
          </Section>

          {/* Date · State · Tax · Time primitives */}
          <Section
            id="date-state"
            title="Date · State · Tax · Time"
            subtitle="DueDateHQ-specific data primitives. State icons, tax-code chips, ISO date picker, and the relative-time formatter."
          >
            <Row label="IsoDatePicker" mono="primitives/iso-date-picker">
              <IsoDatePicker
                id="dp-due"
                value={datePickerValue}
                onValueChange={(next) => setDatePickerValue(next ?? '2026-09-15')}
                ariaLabel="Due date"
              />
              <span className="text-xs text-text-tertiary">
                value: <code className="font-mono">{datePickerValue}</code>
              </span>
            </Row>
            <Row label="StateBadge" mono="primitives/state-badge">
              <StateBadge code="CA" />
              <StateBadge code="NY" />
              <StateBadge code="TX" />
              <StateBadge code="FL" />
              <StateBadge code="WA" />
              <StateBadge code="FED" />
              <StateBadge code="CA" size="lg" />
            </Row>
            <Row label="TaxCodeLabel" mono="primitives/tax-code-label">
              <span className="text-sm">
                Owner: Avery · Code: <TaxCodeLabel code="1120" /> · Quarterly:{' '}
                <TaxCodeLabel code="1040ES" />
              </span>
            </Row>
            <Row label="TaxCodeBadge" mono="primitives/tax-code-label">
              <TaxCodeBadge code="1120" />
              <TaxCodeBadge code="1040" />
              <TaxCodeBadge code="941" />
              <TaxCodeBadge code="W-2" />
            </Row>
            <Row label="TaxCodeBadge compact" mono='primitives/tax-code-label size="compact"'>
              <TaxCodeBadge code="1120" size="compact" />
              <TaxCodeBadge code="1040" size="compact" />
              <TaxCodeBadge code="941" size="compact" />
            </Row>
            <Row label="RelativeTime" mono="primitives/relative-time">
              <span className="text-sm">
                Last touched{' '}
                <RelativeTime
                  value="2026-05-28T10:00:00Z"
                  timeZone="America/Los_Angeles"
                  className="font-medium text-text-primary"
                />
              </span>
              <span className="text-sm">
                Filed{' '}
                <RelativeTime
                  value="2026-04-15T16:20:00Z"
                  timeZone="America/Los_Angeles"
                  className="font-medium text-text-primary"
                />
              </span>
            </Row>
          </Section>

          {/* Patterns */}
          <Section
            id="patterns"
            title="Patterns"
            subtitle="Reusable composed shapes in apps/app/src/components/patterns/. Patterns combine primitives into screen-level building blocks."
          >
            <Row label="StatTile" mono="patterns/stat-tile">
              <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
                <StatTile label="Due this week" value="14" />
                <StatTile label="Waiting on client" value="9" tone="muted" />
                <StatTile label="Overdue" value="3" tone="critical" />
              </div>
            </Row>
            <Row label="StatTile (with week-over-week trend)" mono="patterns/stat-tile">
              <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
                <StatTile label="In review" value="3" trend={{ delta: -1 }} />
                <StatTile label="Blocked" value="2" tone="critical" trend={{ delta: 1 }} />
                <StatTile label="Waiting on client" value="1" trend={{ delta: 0 }} />
              </div>
            </Row>
            <Row label="StatTile (custom trend tone)">
              <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
                <StatTile
                  label="Filed YTD"
                  value="248"
                  trend={{ delta: 28, toneOverride: 'success' }}
                />
                <StatTile
                  label="Open deadlines"
                  value="14"
                  trend={{ delta: 5, toneOverride: 'warning' }}
                />
                <StatTile
                  label="No prior data"
                  value="7"
                  trend={{ delta: 0, label: 'New metric' }}
                />
              </div>
            </Row>
            <Row label="InfoBanner" mono="patterns/info-banner">
              <InfoBanner
                icon={AlertCircleIcon}
                message="We auto-paused 3 reminders because the client replied. Review before resuming."
                className="max-w-2xl"
              />
            </Row>
            <Row label="KbdHint" mono="patterns/kbd">
              <KbdHint
                items={[
                  { keys: ['⌘', 'K'], label: 'command palette' },
                  { keys: ['?'], label: 'shortcuts' },
                ]}
              />
              <span className="text-sm text-text-secondary">
                Inline example: press <Kbd>⌘</Kbd>
                <Kbd>S</Kbd> to save
              </span>
            </Row>
            <Row label="EmptyState" mono="patterns/empty-state">
              <EmptyState
                icon={InboxIcon}
                title="No deadlines match your filters"
                description="Try widening the date range or clearing the owner filter to see more."
                cta={
                  <Button variant="secondary" size="sm">
                    Clear filters
                  </Button>
                }
                className="w-full max-w-2xl"
              />
            </Row>
            <Row label="EmptyState — prominent" mono="patterns/empty-state · variant=prominent">
              {/* Full-surface empty states (design replication). Responsive:
                  cards fill width and wrap on narrow viewports. */}
              <div className="flex w-full flex-col gap-4">
                <EmptyState
                  variant="prominent"
                  icon={CalendarClockIcon}
                  title="No deadlines yet"
                  description="Import your client book or add deadlines manually. We'll generate them automatically from the rules you activated."
                  cta={
                    <Button variant="outline" size="sm">
                      Import clients
                    </Button>
                  }
                  className="w-full"
                />
                <EmptyState
                  variant="prominent"
                  icon={MegaphoneIcon}
                  title="No alerts right now"
                  description="When IRS, CA FTB, or another monitored source publishes a change, it will land here."
                  className="w-full"
                />
                <EmptyState
                  variant="prominent"
                  icon={HistoryIcon}
                  title="No history yet"
                  description="Once you decide on alerts (apply / review / dismiss) they'll show up here as an immutable record."
                  cta={
                    <Button variant="outline" size="sm">
                      Go to alerts
                    </Button>
                  }
                  footer={
                    <div className="flex flex-col items-center gap-2">
                      <p className="font-mono text-column-label text-text-muted uppercase">
                        What gets recorded
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {['Apply', 'Review', 'Dismiss', 'Revert'].map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center gap-1.5 rounded-full border border-divider-regular bg-background-default px-2.5 py-1 text-xs font-medium text-text-secondary"
                          >
                            <CircleCheckIcon className="size-3.5 text-text-tertiary" aria-hidden />
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  }
                  className="w-full"
                />
              </div>
            </Row>
            <Row label="EmptyCellMark" mono="patterns/empty-cell-mark">
              <span className="text-sm">
                Owner: <EmptyCellMark label="Unassigned" /> · Due: <EmptyCellMark /> · Tags:{' '}
                <EmptyCellMark />
              </span>
            </Row>
          </Section>

          {/* Page chrome */}
          <Section
            id="page-chrome"
            title="Page chrome"
            subtitle="Top-of-page furniture — PageHeader, Breadcrumb, StatusBanner. These sit above the main content of each route."
          >
            <Row label="PageHeader" mono="patterns/page-header">
              <div className="w-full max-w-3xl rounded-lg border border-divider-regular bg-background-default p-6">
                <PageHeader
                  eyebrow="Client"
                  breadcrumbs={[{ label: 'Clients', to: '#' }, { label: 'Acme LLC' }]}
                  title="Acme LLC"
                  metaRow={
                    <>
                      <Badge variant="secondary">Partnership</Badge>
                      <StateBadge code="CA" size="sm" />
                      <span className="text-xs">EIN 12-3456789</span>
                    </>
                  }
                  description="Onboarded April 2024 · Coordinator: Jules Rivera"
                  actions={
                    <>
                      <Button variant="ghost">
                        <DollarSignIcon /> Billing
                      </Button>
                      <Button variant="primary">
                        <PlusIcon /> Add deadline
                      </Button>
                    </>
                  }
                />
              </div>
            </Row>
            <Row label="Breadcrumb" mono="patterns/breadcrumb">
              <Breadcrumb
                items={[
                  { label: 'Clients', to: '#' },
                  { label: 'Acme LLC', to: '#' },
                  { label: 'Form 1120' },
                ]}
              />
            </Row>
            <Row label="StatusBanner (info)" mono="patterns/status-banner">
              <StatusBanner
                className="w-full max-w-2xl"
                indicator={<CircleCheckIcon className="size-4 text-text-success" aria-hidden />}
                cta={
                  <Button variant="ghost" size="sm">
                    View details
                  </Button>
                }
              >
                Sync with Karbon completed — 247 deadlines refreshed, 3 conflicts to review.
              </StatusBanner>
            </Row>
            <Row label="StatusBanner (warning)">
              <StatusBanner
                className="w-full max-w-2xl"
                indicator={<CircleAlertIcon className="size-4 text-text-warning" aria-hidden />}
                cta={
                  <Button variant="secondary" size="sm">
                    Reconnect
                  </Button>
                }
              >
                Email sync is paused — your Microsoft 365 token expired 2 days ago.
              </StatusBanner>
            </Row>
          </Section>

          {/* Table patterns */}
          <Section
            id="table-patterns"
            title="Table patterns"
            subtitle="FilterTrigger, TableHeaderMultiFilter, RowActionsMenu — affordances layered onto the base Table primitives."
          >
            <Row label="FilterTrigger" mono="patterns/filter-trigger">
              <FilterTrigger active={false}>Owner</FilterTrigger>
              <FilterTrigger active onClick={() => setFilterActive((v) => !v)}>
                Owner: Avery
              </FilterTrigger>
              <FilterTrigger active leadingIcon={FilterIcon}>
                Status: 3
              </FilterTrigger>
              <FilterTrigger
                active={filterActive}
                onClick={() => setFilterActive((v) => !v)}
                noLeadingIcon
              >
                Toggle me
              </FilterTrigger>
            </Row>
            <Row label="TableHeaderMultiFilter" mono="patterns/table-header-filter">
              <TableHeaderMultiFilter
                label="Status"
                emptyLabel="No statuses match"
                searchable
                searchPlaceholder="Search statuses…"
                options={[
                  { value: 'not_started', label: 'Not started', count: 4 },
                  { value: 'in_review', label: 'In review', count: 12 },
                  { value: 'waiting_on_client', label: 'Waiting on client', count: 8 },
                  { value: 'blocked', label: 'Blocked', count: 2 },
                  { value: 'filed', label: 'Filed', count: 247 },
                  { value: 'completed', label: 'Completed', count: 190 },
                ]}
                selected={tableFilterSelected}
                onSelectedChange={setTableFilterSelected}
              />
            </Row>
            <Row label="RowActionsMenu" mono="patterns/row-actions-menu">
              <div className="group/row inline-flex items-center gap-3 rounded-lg border border-divider-subtle bg-background-default px-3 py-2">
                <span className="text-sm">Form 1120 — Acme LLC</span>
                <RowActionsMenu
                  label="Actions for Form 1120"
                  alwaysVisible
                  items={[
                    { label: 'Open', icon: ArrowRightIcon, onSelect: () => {} },
                    { label: 'Edit', icon: PencilIcon, onSelect: () => {} },
                    { label: 'Duplicate', icon: CopyIcon, onSelect: () => {} },
                    { separator: true },
                    { label: 'Archive', icon: ArchiveIcon, onSelect: () => {} },
                    {
                      label: 'Delete',
                      icon: Trash2Icon,
                      onSelect: () => {},
                      destructive: true,
                    },
                  ]}
                />
              </div>
            </Row>
          </Section>

          {/* Bulk actions */}
          <Section
            id="bulk"
            title="Bulk actions (FloatingActionBar)"
            subtitle="Appears when one or more rows are selected. Real instances are `position: fixed` and float at the bottom of the viewport; here it's rendered statically so you can see the chrome."
          >
            <Row label="FloatingActionBar" mono="patterns/floating-action-bar">
              <div className="relative w-full max-w-2xl rounded-lg border border-dashed border-divider-regular bg-background-soft p-8">
                <p className="text-center text-xs text-text-tertiary">
                  Imagine a table with 3 rows selected. The bar below floats over the viewport.
                </p>
                {/* override fixed positioning for the inline demo */}
                <div className="mt-6 [&_[role=region]]:static [&_[role=region]]:translate-x-0 [&_[role=region]]:mx-auto [&_[role=region]]:w-fit">
                  <FloatingActionBar ariaLabel="Bulk actions">
                    <span className="text-sm font-medium">3 selected</span>
                    <Separator orientation="vertical" className="h-5" />
                    <Button variant="ghost" size="sm">
                      <ArchiveIcon /> Archive
                    </Button>
                    <Button variant="ghost" size="sm">
                      <CopyIcon /> Duplicate
                    </Button>
                    <Button variant="primary" size="sm">
                      Mark filed
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Clear selection">
                      <XIcon />
                    </Button>
                  </FloatingActionBar>
                </div>
              </div>
            </Row>
          </Section>

          {/* Destructive change preview */}
          <Section
            id="destructive"
            title="Destructive change preview"
            subtitle="A diff-shaped preview shown in confirm dialogs before a risky action. Three glyph tones: keep (✓), change (~), delete (−)."
          >
            <Row label="DestructiveChangePreview" mono="patterns/destructive-change-preview">
              <DestructiveChangePreview
                title="Re-running the migration will:"
                lines={[
                  {
                    tone: 'keep',
                    label: 'Keep',
                    detail: '12 clients with confirmed mappings',
                  },
                  {
                    tone: 'add',
                    label: 'Add',
                    detail: '3 new obligations from the updated rule library',
                  },
                  {
                    tone: 'remove',
                    label: 'Remove',
                    detail: '2 draft deadlines from the prior dry-run',
                  },
                ]}
              />
            </Row>
          </Section>

          {/* Pulse — status family */}
          <Section
            id="pulse-bits"
            title="Pulse — status family"
            subtitle="The badge / pill / dot vocabulary used across /rules/pulse and its drawer. Tone matches the obligation status ladder."
          >
            <Row label="AlertStatusBadge" mono="features/pulse/AlertStatusBadge">
              <AlertStatusBadge status="matched" />
              <AlertStatusBadge status="partially_applied" />
              <AlertStatusBadge status="applied" />
              <AlertStatusBadge status="reverted" />
              <AlertStatusBadge status="dismissed" />
              <AlertStatusBadge status="reviewed" />
            </Row>
            <Row label="AlertStatusChip" mono="features/alerts/components/AlertStatusChip">
              <AlertStatusChip status="matched" timestamp="2h" />
              <AlertStatusChip status="applied" timestamp="Mar 4" />
              <AlertStatusChip status="partially_applied" timestamp="Mar 4" />
              <AlertStatusChip status="reviewed" timestamp="Mar 4" />
              <AlertStatusChip status="reverted" timestamp="Mar 6" />
              <AlertStatusChip status="dismissed" timestamp="Mar 5" />
            </Row>
            <Row label="DecisionActions" mono="features/alerts/components/DecisionActions">
              <div className="w-full max-w-[520px]">
                <DecisionActions
                  primary={{ label: 'Apply to 2 confirmed clients', icon: CheckIcon }}
                  secondary={{ label: 'Customize per client', icon: SlidersHorizontalIcon }}
                  tertiary={{ label: 'Dismiss alert', icon: XIcon }}
                />
              </div>
            </Row>
            <Row label="RelatedRuleRow" mono="features/alerts/components/RelatedRuleRow">
              <div className="w-full max-w-[520px]">
                <RelatedRuleRow
                  code="CA FTB-2026-12"
                  name="California state-level mirror"
                  description="State mirror of the federal disaster relief. Same scope, same dates. Applied automatically if the federal extension is applied."
                  onClick={() => {}}
                />
              </div>
            </Row>
            <Row label="RuleAcceptErrorDialog" mono="features/rules/rule-detail-drawer">
              <RuleAcceptErrorDialogDemo />
            </Row>
            <Row label="AlertSourceStatusBadge" mono="features/pulse/AlertSourceStatusBadge">
              <AlertSourceStatusBadge status="source_revoked" />
              <span className="text-xs text-text-tertiary">
                Renders null unless status === "source_revoked"
              </span>
            </Row>
            <Row label="AlertSourceBadge" mono="features/pulse/AlertSourceBadge">
              <AlertSourceBadge source="CA FTB" sourceUrl="https://ftb.ca.gov" />
              <AlertSourceBadge source="IRS" sourceUrl="https://irs.gov" />
              <AlertSourceBadge source="NY DTF" sourceUrl="https://tax.ny.gov" />
            </Row>
            <Row label="AlertConfidencePill" mono="features/pulse/AlertConfidencePill">
              <AlertConfidencePill confidence="low" />
              <AlertConfidencePill confidence="medium" />
              <AlertConfidencePill confidence="high" />
            </Row>
            <Row label="PulsingDot (tones × active)" mono="features/pulse/PulsingDot">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <PulsingDot tone="success" active label="Source healthy" />
                  <PulsingDot tone="warning" active label="Partial match" />
                  <PulsingDot tone="error" active label="Source revoked" />
                  <PulsingDot tone="normal" active label="Informational" />
                  <PulsingDot tone="disabled" label="Paused" />
                  <span className="ml-2 text-xs text-text-tertiary">active</span>
                </div>
                <div className="flex items-center gap-3">
                  <PulsingDot tone="success" active={false} label="Source healthy" />
                  <PulsingDot tone="warning" active={false} label="Partial match" />
                  <PulsingDot tone="error" active={false} label="Source revoked" />
                  <PulsingDot tone="normal" active={false} label="Informational" />
                  <PulsingDot tone="disabled" active={false} label="Paused" />
                  <span className="ml-2 text-xs text-text-tertiary">idle</span>
                </div>
              </div>
            </Row>
          </Section>

          {/* StateTilegram */}
          <Section
            id="tilegram"
            title="StateTilegram"
            subtitle="Tilegram-style US map used as the state filter on /rules/pulse. Each cell is clickable; states without counts dim out."
          >
            <Row label="StateTilegram" mono="features/pulse/StateTilegram">
              <div className="space-y-3">
                <StateTilegram
                  counts={TILEGRAM_COUNTS}
                  activeState={activeState}
                  onSelect={(code) => setActiveState((s) => (s === code ? null : code))}
                />
                <p className="text-xs text-text-tertiary">
                  Active: <code className="font-mono">{activeState ?? 'null (no filter)'}</code> ·
                  Click a state to toggle.
                </p>
              </div>
            </Row>
          </Section>

          {/* Obligation chips */}
          <Section
            id="oblig-bits"
            title="Obligations — chips"
            subtitle="The per-row identity and severity chips used in /deadlines and the obligation drawer."
          >
            <Row label="AssigneeAvatar" mono="features/obligations/AssigneeAvatar">
              <AssigneeAvatar name="Sarah Chen" isMine={false} title="Assigned: Sarah Chen" />
              <AssigneeAvatar name="Avery Patel" isMine={true} title="Assigned to you" />
              <AssigneeAvatar name="Jules Rivera" isMine={false} title="Assigned: Jules Rivera" />
              <AssigneeAvatar name="Priya Pro" isMine={false} title="Assigned: Priya Pro" />
              <AssigneeAvatar name="Taylor Team" isMine={false} title="Assigned: Taylor Team" />
            </Row>
            <Row label="BlockedByChip" mono="features/obligations/blocked-by-chip">
              <BlockedByChip
                parentObligationId="obl_abc12345"
                parentLabel="Form 1065 — partnership return"
                onOpen={() => {}}
              />
              <BlockedByChip
                parentObligationId="obl_abc12345"
                parentLabel="Form 1065 — partnership return"
                onOpen={() => {}}
                compact
              />
              <span className="text-xs text-text-tertiary">(default vs compact)</span>
            </Row>
            <Row label="RejectionChip" mono="features/obligations/rejection-chip">
              <RejectionChip />
              <RejectionChip compact />
              <span className="text-xs text-text-tertiary">(default vs compact)</span>
            </Row>
          </Section>

          {/* Misc feature pieces */}
          <Section
            id="feature-misc"
            title="Surface · Billing · Concepts"
            subtitle="Surface-strip summary primitive, the upgrade CTA used across plan gates, and the inline concept-help affordance."
          >
            <Row
              label="SurfaceSummaryStrip"
              mono="features/_surface-vocabulary/SurfaceSummaryStrip"
            >
              <SurfaceSummaryStrip
                label="Deadlines"
                items={[
                  { key: 'open', value: 14, label: 'open' },
                  { key: 'review', value: 3, label: 'in review', tone: 'review' },
                  { key: 'waiting', value: 8, label: 'waiting on client', tone: 'muted' },
                  { key: 'overdue', value: 2, label: 'overdue', tone: 'destructive' },
                ]}
                detailHref="#"
                detailLabel="View all"
              />
            </Row>
            <Row label="UpgradeCtaButton" mono="features/billing/upgrade-cta-button">
              <UpgradeCtaButton plan="pro" interval="monthly" />
              <UpgradeCtaButton plan="team" interval="yearly">
                Upgrade to Team (yearly)
              </UpgradeCtaButton>
            </Row>
            <Row label="ConceptHelp" mono="features/concepts/concept-help">
              <span className="text-sm text-text-secondary">
                What is <ConceptHelp concept="pulse" /> Pulse?
              </span>
              <span className="text-sm text-text-secondary">
                What is <ConceptHelp concept="aiConfidence" /> AI confidence?
              </span>
              <span className="text-sm text-text-secondary">
                What is <ConceptHelp concept="readiness" /> Readiness?
              </span>
              <span className="text-xs text-text-tertiary">
                Hover the (?) icon to see the popover
              </span>
            </Row>
          </Section>

          {/* Pulse — full alert cards */}
          <Section
            id="pulse-card"
            title="Pulse — full alert cards"
            subtitle="The big card shape from /rules/pulse and the smaller Today variant. Mocked PulseAlertPublic — no network calls."
          >
            <Row label="AlertCard (default)" mono="features/pulse/AlertCard">
              <AlertCard alert={MOCK_PULSE_ALERT} onReview={() => {}} />
            </Row>
            <Row label="AlertCard (active row)">
              <AlertCard alert={MOCK_PULSE_ALERT} onReview={() => {}} active showReadiness />
            </Row>
            <Row label="AlertCard (low confidence)">
              <AlertCard alert={MOCK_PULSE_ALERT_LOW_CONF} onReview={() => {}} />
            </Row>
          </Section>

          {/* Pulse — detail pieces */}
          <Section
            id="pulse-detail"
            title="Pulse — detail pieces"
            subtitle="Right-panel components from the Pulse drawer. AlertStructuredFields shows scope chips; AffectedClientsTable shows the row impact; readiness chips show whether the alert can be auto-applied."
          >
            <Row label="AlertReadinessChip" mono="features/pulse/AlertReadinessStatus">
              <AlertReadinessChip
                readiness={MOCK_PULSE_ALERT.applyReadiness}
                firmImpact={MOCK_PULSE_ALERT.firmImpact}
              />
              <AlertReadinessChip
                readiness={MOCK_PULSE_ALERT_LOW_CONF.applyReadiness}
                firmImpact={MOCK_PULSE_ALERT_LOW_CONF.firmImpact}
              />
            </Row>
            <Row label="AlertDecisionStatusNotice">
              <div className="w-full max-w-2xl">
                <AlertDecisionStatusNotice alert={MOCK_PULSE_ALERT} />
              </div>
            </Row>
            <Row label="AlertStructuredFields" mono="features/pulse/AlertStructuredFields">
              <div className="w-full max-w-2xl">
                <AlertStructuredFields detail={MOCK_PULSE_DETAIL} />
              </div>
            </Row>
            <Row label="AffectedClientsTable" mono="features/pulse/AffectedClientsTable">
              <div className="w-full">
                <AffectedClientsTable
                  rows={MOCK_AFFECTED_CLIENTS}
                  selection={affectedSelection}
                  confirmedReviewIds={confirmedReviewIds}
                  onChangeSelection={setAffectedSelection}
                  onToggleNeedsReviewConfirmation={(id, confirmed) =>
                    setConfirmedReviewIds((prev) => {
                      const next = new Set(prev)
                      if (confirmed) next.add(id)
                      else next.delete(id)
                      return next
                    })
                  }
                />
              </div>
            </Row>
          </Section>

          {/* Obligation blocks */}
          <Section
            id="oblig-blocks"
            title="Obligations — blocks"
            subtitle="The compound row pieces. StageActions clusters the per-stage CTAs; BlockerContextCard fetches a parent obligation live (skeleton without a real ID)."
          >
            <Row label="StageActions" mono="features/obligations/StageActions">
              <div className="w-full max-w-md rounded-lg border border-divider-regular bg-background-default p-4">
                <StageActions tasks={MOCK_STAGE_TASKS} onTaskClick={() => {}} />
              </div>
            </Row>
            <Row label="BlockerContextCard" mono="features/obligations/BlockerContextCard">
              <div className="w-full max-w-md space-y-2">
                <BlockerContextCard blockerId="" onOpen={() => {}} />
                <p className="text-xs text-text-tertiary">
                  Renders its skeleton state because the blockerId is empty (no live RPC). The
                  populated chrome appears at <code className="font-mono">/deadlines</code> when an
                  obligation has a blocking parent.
                </p>
              </div>
            </Row>
          </Section>

          {/* Rules console primitives */}
          <Section
            id="rules-console"
            title="Rules console primitives"
            subtitle="Small atoms shared across /rules/* (library, coverage, sources, pulse, temporary). They look quiet but they keep the rule pages consistent."
          >
            <Row label="JurisdictionCode" mono="features/rules/rules-console-primitives">
              <JurisdictionCode code="CA" />
              <JurisdictionCode code="NY" />
              <JurisdictionCode code="TX" />
              <JurisdictionCode code="FED" />
              <JurisdictionCode code="DC" />
            </Row>
            <Row label="ToneDot">
              <span className="inline-flex items-center gap-2 text-sm">
                <ToneDot tone="success" /> Verified
              </span>
              <span className="inline-flex items-center gap-2 text-sm">
                <ToneDot tone="warning" /> Needs review
              </span>
              <span className="inline-flex items-center gap-2 text-sm">
                <ToneDot tone="review" /> Awaiting approval
              </span>
              <span className="inline-flex items-center gap-2 text-sm">
                <ToneDot tone="disabled" /> Paused
              </span>
            </Row>
            <Row label="HealthBadge">
              <HealthBadge health="healthy" />
              <HealthBadge health="paused" />
            </Row>
            <Row label="SectionLabel">
              <SectionLabel>Verified rules</SectionLabel>
            </Row>
            <Row label="SectionFrame">
              <SectionFrame className="w-full max-w-2xl p-4">
                <p className="text-sm text-text-secondary">
                  Section frame is the standard inset-card chrome used to group rule rows on the
                  library and coverage tabs. Use it whenever the rules console needs a bordered
                  surface that nests inside the page chrome.
                </p>
              </SectionFrame>
            </Row>
            <Row label="FilterChips">
              <FilterChips
                value={rulesFilter}
                onValueChange={setRulesFilter}
                options={[
                  { value: 'all', label: 'All', count: 247 },
                  { value: 'verified', label: 'Verified', count: 182 },
                  { value: 'draft', label: 'Draft', count: 65 },
                ]}
              />
            </Row>
            <Row label="QueryPanelState">
              <div className="w-full max-w-md space-y-3">
                <QueryPanelState state="loading" message="Loading rule sources…" />
                <QueryPanelState state="error" message="Couldn't reach the rules service." />
              </div>
            </Row>
          </Section>

          {/* Migration primitives */}
          <Section
            id="migration-bits"
            title="Migration primitives"
            subtitle="Stepper + SummaryMetric — the small reusable pieces from /migration/new's wizard chrome."
          >
            <Row label="Stepper (step 1)" mono="features/migration/Stepper">
              <Stepper current={1} />
            </Row>
            <Row label="Stepper (step 3)">
              <Stepper current={3} />
            </Row>
            <Row label="SummaryMetric" mono="features/migration/SummaryMetric">
              <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
                <SummaryMetric label="Rows imported" value="3,412" />
                <SummaryMetric label="Conflicts" value="14" />
                <SummaryMetric label="Skipped" value="6" />
              </div>
            </Row>
          </Section>

          {/* Audit log table */}
          <Section
            id="audit-table"
            title="Audit log table"
            subtitle="The row chrome and actor / action / target columns from /audit. Each row is clickable to open the audit-event drawer (the click handler here is a no-op)."
          >
            <Row label="AuditLogTable" mono="features/audit/audit-log-table">
              <div className="w-full overflow-hidden rounded-lg border border-divider-regular">
                <AuditLogTable
                  events={MOCK_AUDIT_EVENTS}
                  firmTimezone="America/Los_Angeles"
                  onOpenEvent={() => {}}
                />
              </div>
            </Row>
          </Section>

          {/* Firm primitives */}
          <Section
            id="firm-bits"
            title="Firm primitives"
            subtitle="Firm-settings atoms — the timezone picker used by /practice+/settings."
          >
            <Row label="FirmTimezoneSelect" mono="features/firm/timezone-select">
              <div className="w-full max-w-md space-y-2">
                <Label htmlFor="tz-demo">Firm timezone</Label>
                <FirmTimezoneSelect id="tz-demo" value={timezone} onValueChange={setTimezone} />
                <p className="text-xs text-text-tertiary">
                  Current: <code className="font-mono">{timezone}</code>
                </p>
              </div>
            </Row>
          </Section>

          {/* Client hover card */}
          <Section
            id="client-bits"
            title="Client hover card"
            subtitle="The client-name hover preview used on /deadlines rows. Hovering triggers a live RPC fetch for the client — in this preview the panel shows the loading skeleton because no real client id resolves."
          >
            <Row label="ClientPeekHoverCard" mono="features/clients/ClientPeekHoverCard">
              <ClientPeekHoverCard clientId="cli_mock_acme">
                <TextLink variant="accent" size="sm">
                  Hover over Acme LLC (mock client id)
                </TextLink>
              </ClientPeekHoverCard>
              <span className="text-xs text-text-tertiary">
                Hover loads via oRPC; with a mock id the popover shows the skeleton state.
              </span>
            </Row>
          </Section>

          {/* Footnote */}
          <p className="pb-12 pt-6 text-xs text-text-tertiary">
            Routes: <code className="font-mono">apps/app/src/routes/preview.tsx</code> · Tokens:{' '}
            <code className="font-mono">packages/ui/src/styles/tokens/semantic-light.css</code> ·
            Primitives: <code className="font-mono">packages/ui/src/components/ui/</code> · Feature
            components: <code className="font-mono">apps/app/src/features/</code>
          </p>
          <p className="pb-12 text-xs text-text-tertiary">
            <strong className="text-text-secondary">Still not previewed</strong> — these are
            page-level shells, workspaces, or multi-step wizards that need router params, drawer
            providers, or full RPC data graphs to render meaningfully. To see them, sign in via the
            demo-login URL (top of this thread) and navigate to their host route:
            <br />
            <code className="font-mono">AlertsListPage</code> →{' '}
            <code className="font-mono">/rules/pulse</code> ·{' '}
            <code className="font-mono">PulseDetailDrawer</code> → opens from the same route ·{' '}
            <code className="font-mono">ClientDetailWorkspace</code> ·{' '}
            <code className="font-mono">ClientFactsWorkspace</code> ·{' '}
            <code className="font-mono">ClientCompliancePosturePanel</code> ·{' '}
            <code className="font-mono">ClientSummaryStrip</code> ·{' '}
            <code className="font-mono">ClientCycleArrows</code> → all on{' '}
            <code className="font-mono">/clients/[id]</code> · entire{' '}
            <code className="font-mono">migration/</code> wizard (Wizard, WizardShell, Step1–4) →{' '}
            <code className="font-mono">/migration/new</code> ·{' '}
            <code className="font-mono">NeedsAttentionCard</code>,{' '}
            <code className="font-mono">DashboardActionsList</code>,{' '}
            <code className="font-mono">ChangesSinceLastSection</code> →{' '}
            <code className="font-mono">/today</code> ·{' '}
            <code className="font-mono">CompletedKeyDates</code>,{' '}
            <code className="font-mono">ChecklistItemRow</code>,{' '}
            <code className="font-mono">CreateObligationDialog</code>,{' '}
            <code className="font-mono">ObligationPanelDispatcher</code> →{' '}
            <code className="font-mono">/deadlines</code> · audit drawer →{' '}
            <code className="font-mono">/audit</code> ·{' '}
            <code className="font-mono">StateRuleActivationSelector</code> →{' '}
            <code className="font-mono">/onboarding</code> ·{' '}
            <code className="font-mono">rules/coverage-tab</code>,{' '}
            <code className="font-mono">sources-tab</code>,{' '}
            <code className="font-mono">temporary-rules-tab</code>,{' '}
            <code className="font-mono">generation-preview-tab</code>,{' '}
            <code className="font-mono">rule-detail-drawer</code> →{' '}
            <code className="font-mono">/rules/*</code> ·{' '}
            <code className="font-mono">notifications-page</code>,{' '}
            <code className="font-mono">reminders-page</code>,{' '}
            <code className="font-mono">workload-page</code>,{' '}
            <code className="font-mono">members-page</code> → their own routes · all DrawerProvider
            components — they're React context providers, not visible UI.
          </p>
        </main>
      </div>
    </div>
  )
}
