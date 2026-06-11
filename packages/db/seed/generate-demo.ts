/**
 * Demo data generator → emits `mock/demo.sql`.
 *
 * Run: `pnpm --filter @duedatehq/db demo:generate` (then `pnpm db:seed:demo`).
 *
 * Strategy: the IDENTITY scaffolding (users / orgs / members / firm_profiles /
 * invitations / subscriptions / firm rule-config) and the DELETE cleanup block
 * are PRESERVED verbatim from the current mock/demo.sql via statement-level
 * filtering. Everything else (the business data: clients, filing profiles,
 * obligations, and the supporting feature layer) is regenerated comprehensively
 * so every tax type, status, and sub-state is represented on every demo firm.
 *
 * "Today" anchor for the demo is 2026-06-02 (matches the dev clock), so due
 * dates are spread across overdue / today / this-week / this-month / future.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const sqlPath = resolve(here, '../../../mock/demo.sql')

// ---------------------------------------------------------------------------
// Preamble extraction: keep cleanup (DELETE*) + identity-table INSERTs.
// ---------------------------------------------------------------------------
const IDENTITY_TABLES = new Set([
  'user',
  'organization',
  'member',
  'firm_profile',
  'invitation',
  'subscription',
  'reminder_template',
  'rule_review_decision',
  'practice_rule',
  'practice_rule_review_task',
])

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let inString = false
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i]
    if (!inString && ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1
      if (i < sql.length) current += sql[i]
      continue
    }
    current += ch
    if (ch === "'") {
      if (inString && sql[i + 1] === "'") {
        current += sql[i + 1]
        i += 1
      } else {
        inString = !inString
      }
    } else if (ch === ';' && !inString) {
      const trimmed = current.trim()
      if (trimmed) statements.push(trimmed)
      current = ''
    }
  }
  const tail = current.trim()
  if (tail) statements.push(tail)
  return statements
}

function buildPreamble(): string {
  const existing = readFileSync(sqlPath, 'utf8')
  const kept: string[] = []
  for (const stmt of splitSqlStatements(existing)) {
    const head = stmt.replace(/^[\s\n]*/, '')
    if (/^DELETE\s/i.test(head)) {
      kept.push(stmt)
      continue
    }
    const name = head.match(/^INSERT(?:\s+OR\s+\w+)?\s+INTO\s+["`]?(\w+)/i)?.[1]?.toLowerCase()
    if (name && IDENTITY_TABLES.has(name)) kept.push(stmt)
  }
  return kept.join('\n\n')
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------
function uuid(prefix2: string, seq: number): string {
  // `NN000000-0000-4000-8000-<12 hex>` — mirrors the existing demo id scheme.
  return `${prefix2}000000-0000-4000-8000-${String(seq).padStart(12, '0')}`
}
function ts(iso: string): string {
  // iso = 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS'
  const full = iso.length === 10 ? `${iso} 00:00:00` : iso
  return `CAST(unixepoch('${full}') * 1000 AS INTEGER)`
}
function s(value: string | null): string {
  if (value === null) return 'NULL'
  return `'${value.replace(/'/g, "''")}'`
}
function num(value: number | null): string {
  return value === null ? 'NULL' : String(value)
}

// Add whole + half calendar months (half = +15 days), mirroring the app's
// computeExtendedFilingDeadline (no weekend rollover — close enough for a seed).
function addExtensionMonths(iso: string, months: number): string {
  const p = iso.split('-')
  const y = Number(p[0])
  const m = Number(p[1])
  const d = Number(p[2])
  const whole = Math.trunc(months)
  const base = new Date(Date.UTC(y, m - 1 + whole, 1))
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  base.setUTCDate(Math.min(d, lastDay))
  const extra = Math.round((months - whole) * 30)
  if (extra) base.setUTCDate(base.getUTCDate() + extra)
  return base.toISOString().slice(0, 10)
}
function minusDays(iso: string, days: number): string {
  const p = iso.split('-')
  const dt = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])))
  dt.setUTCDate(dt.getUTCDate() - days)
  return dt.toISOString().slice(0, 10)
}

const NOW = '2026-06-02'
const SEED_TS = '2026-05-20 09:00:00'

// Due-date buckets relative to NOW (2026-06-02).
const DUE = {
  overdue: '2026-05-12',
  today: NOW,
  thisWeek: '2026-06-05',
  thisMonth: '2026-06-22',
  nextMonth: '2026-07-15',
  future: '2026-09-15',
} as const

// ---------------------------------------------------------------------------
// Tax-type catalog (rule ids verified against the rule registry).
// ---------------------------------------------------------------------------
interface TaxMeta {
  ruleId: string
  form: string
  jur: string
  duration: number | null // statutory extension months; null = no fixed duration
  efile: boolean // carries an 8879-style e-file signature loop
  type: 'filing' | 'payment' | 'information' // obligation_type
  recurrence: 'once' | 'annual' | 'quarterly'
}
const TAX: Record<string, TaxMeta> = {
  federal_1040: {
    ruleId: 'fed.1040.return.2025',
    form: 'Form 1040',
    jur: 'FED',
    duration: 6,
    efile: true,
    type: 'filing',
    recurrence: 'annual',
  },
  federal_1040_estimated_tax: {
    ruleId: 'fed.1040.estimated_tax.2026',
    form: 'Form 1040-ES',
    jur: 'FED',
    duration: null,
    efile: false,
    type: 'payment',
    recurrence: 'quarterly',
  },
  federal_1041: {
    ruleId: 'fed.1041.return.2025',
    form: 'Form 1041',
    jur: 'FED',
    duration: 5.5,
    efile: true,
    type: 'filing',
    recurrence: 'annual',
  },
  federal_1065: {
    ruleId: 'fed.1065.return.2025',
    form: 'Form 1065',
    jur: 'FED',
    duration: 6,
    efile: true,
    type: 'filing',
    recurrence: 'annual',
  },
  federal_1120: {
    ruleId: 'fed.1120.return.2025',
    form: 'Form 1120',
    jur: 'FED',
    duration: 6,
    efile: true,
    type: 'filing',
    recurrence: 'annual',
  },
  federal_1120s: {
    ruleId: 'fed.1120s.return.2025',
    form: 'Form 1120-S',
    jur: 'FED',
    duration: 6,
    efile: true,
    type: 'filing',
    recurrence: 'annual',
  },
  federal_1120_estimated_tax: {
    ruleId: 'fed.1120.estimated_tax.2026',
    form: 'Form 1120-W',
    jur: 'FED',
    duration: null,
    efile: false,
    type: 'payment',
    recurrence: 'quarterly',
  },
  federal_990: {
    ruleId: 'fed.990.return.2025',
    form: 'Form 990',
    jur: 'FED',
    duration: 6,
    efile: true,
    type: 'filing',
    recurrence: 'annual',
  },
  federal_941: {
    ruleId: 'fed.941.return.2026',
    form: 'Form 941',
    jur: 'FED',
    duration: null,
    efile: false,
    type: 'filing',
    recurrence: 'quarterly',
  },
  federal_1099_nec: {
    ruleId: 'fed.1099_nec.2025',
    form: 'Form 1099-NEC',
    jur: 'FED',
    duration: null,
    efile: false,
    type: 'information',
    recurrence: 'annual',
  },
  federal_fbar: {
    ruleId: 'fed.fbar.automatic_extension.2025',
    form: 'FinCEN Form 114',
    jur: 'FED',
    duration: 6,
    efile: false,
    type: 'information',
    recurrence: 'annual',
  },
  ca_llc_568: {
    ruleId: 'ca.llc.568.return.2025',
    form: 'Form 568',
    jur: 'CA',
    duration: 7,
    efile: false,
    type: 'filing',
    recurrence: 'annual',
  },
  ca_100: {
    ruleId: 'ca.100.return.2025',
    form: 'Form 100',
    jur: 'CA',
    duration: 7,
    efile: false,
    type: 'filing',
    recurrence: 'annual',
  },
  ca_100s: {
    ruleId: 'ca.100s.return.2025',
    form: 'Form 100S',
    jur: 'CA',
    duration: 6,
    efile: false,
    type: 'filing',
    recurrence: 'annual',
  },
  ca_541: {
    ruleId: 'ca.541.return.2025',
    form: 'Form 541',
    jur: 'CA',
    duration: 6,
    efile: false,
    type: 'filing',
    recurrence: 'annual',
  },
  ny_it204: {
    ruleId: 'ny.it204.return.2025',
    form: 'Form IT-204',
    jur: 'NY',
    duration: 6,
    efile: false,
    type: 'filing',
    recurrence: 'annual',
  },
  ny_it205: {
    ruleId: 'ny.it205.return.2025',
    form: 'Form IT-205',
    jur: 'NY',
    duration: 5.5,
    efile: false,
    type: 'filing',
    recurrence: 'annual',
  },
  ny_ct3: {
    ruleId: 'ny.ct3.return.2025',
    form: 'Form CT-3',
    jur: 'NY',
    duration: 6,
    efile: false,
    type: 'filing',
    recurrence: 'annual',
  },
  ny_ct3s: {
    ruleId: 'ny.ct3s.return.2025',
    form: 'Form CT-3-S',
    jur: 'NY',
    duration: 6,
    efile: false,
    type: 'filing',
    recurrence: 'annual',
  },
  fl_f1120: {
    ruleId: 'fl.f1120.return.2025',
    form: 'Form F-1120',
    jur: 'FL',
    duration: 6,
    efile: true,
    type: 'filing',
    recurrence: 'annual',
  },
  tx_franchise_report: {
    ruleId: 'tx.franchise.annual_report.2026',
    form: 'TX Franchise Report',
    jur: 'TX',
    duration: null,
    efile: false,
    type: 'filing',
    recurrence: 'annual',
  },
  tx_pir_oir: {
    ruleId: 'tx.franchise.pir_oir.2026',
    form: 'PIR/OIR',
    jur: 'TX',
    duration: null,
    efile: false,
    type: 'information',
    recurrence: 'annual',
  },
}

// Rule ids end in their tax-year cohort (annual returns due during 2026 are
// the *.2025 cohort; in-year rules — estimated tax, quarterly 941, TX
// franchise — are *.2026). The seeded tax_year/tax_period must match the
// cohort, or annual returns get labeled one year ahead of the filing season.
function taxYearOf(meta: TaxMeta): number {
  return Number(meta.ruleId.slice(meta.ruleId.lastIndexOf('.') + 1))
}

// ---------------------------------------------------------------------------
// Firms (identity preserved; we only generate their business data).
// ---------------------------------------------------------------------------
interface Firm {
  id: string
  clientPfx: string
  oblPfx: string
  profilePfx: string
  owner: string
  ownerName: string
  members: { id: string; name: string }[]
  short: string
}
const FIRMS: Firm[] = [
  {
    id: 'mock_firm_brightline',
    clientPfx: '10',
    oblPfx: '20',
    profilePfx: '15',
    owner: 'mock_user_owner_sarah',
    ownerName: 'Sarah Martinez',
    short: 'Brightline',
    members: [
      { id: 'mock_user_owner_sarah', name: 'Sarah Martinez' },
      { id: 'mock_user_manager_miguel', name: 'Miguel Chen' },
      { id: 'mock_user_partner_priya', name: 'Priya Shah' },
      { id: 'mock_user_preparer_avery', name: 'Avery Patel' },
      { id: 'mock_user_coordinator_jules', name: 'Jules Rivera' },
    ],
  },
  {
    id: 'mock_firm_solo',
    clientPfx: '14',
    oblPfx: '24',
    profilePfx: '19',
    owner: 'mock_user_owner_sarah',
    ownerName: 'Sarah Martinez',
    short: 'Archive Solo',
    members: [{ id: 'mock_user_owner_sarah', name: 'Sarah Martinez' }],
  },
  {
    id: 'mock_firm_plan_solo',
    clientPfx: '11',
    oblPfx: '21',
    profilePfx: '16',
    owner: 'mock_user_plan_solo',
    ownerName: 'Sofia Solo',
    short: 'Solo Plan',
    members: [{ id: 'mock_user_plan_solo', name: 'Sofia Solo' }],
  },
  {
    id: 'mock_firm_plan_pro',
    clientPfx: '12',
    oblPfx: '22',
    profilePfx: '17',
    owner: 'mock_user_plan_pro',
    ownerName: 'Priya Pro',
    short: 'Pro Plan',
    members: [
      { id: 'mock_user_plan_pro', name: 'Priya Pro' },
      { id: 'mock_user_plan_pro_preparer', name: 'Parker Pro' },
    ],
  },
  {
    id: 'mock_firm_plan_team',
    clientPfx: '13',
    oblPfx: '23',
    profilePfx: '18',
    owner: 'mock_user_plan_team',
    ownerName: 'Taylor Team',
    short: 'Team Plan',
    members: [
      { id: 'mock_user_plan_team', name: 'Taylor Team' },
      { id: 'mock_user_plan_team_manager', name: 'Morgan Team' },
      { id: 'mock_user_plan_team_coordinator', name: 'Casey Team' },
      { id: 'mock_user_plan_team_preparer', name: 'Devin Team' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Client template (per firm). Entity types + states span the taxonomy.
// ---------------------------------------------------------------------------
interface ClientSpec {
  seq: number
  name: string
  entity: string // CLIENT_ENTITY_TYPES
  state: string
  county: string
  taxTypes: string[]
  ein: string | null
  liabilityCents: number | null
  equityOwners: number | null
}
const CLIENTS: ClientSpec[] = [
  {
    seq: 1,
    name: 'Avery Individual',
    entity: 'individual',
    state: 'CA',
    county: 'Los Angeles',
    taxTypes: ['federal_1040', 'federal_1040_estimated_tax'],
    ein: null,
    liabilityCents: 3200000,
    equityOwners: 1,
  },
  {
    seq: 2,
    name: 'Riverside Sole Prop',
    entity: 'sole_prop',
    state: 'NY',
    county: 'Kings',
    taxTypes: ['federal_1040'],
    ein: '94-1000002',
    liabilityCents: 1800000,
    equityOwners: 1,
  },
  {
    seq: 3,
    name: 'Arbor & Vale LLC',
    entity: 'partnership',
    state: 'CA',
    county: 'Los Angeles',
    taxTypes: ['federal_1065', 'ca_llc_568'],
    ein: '12-3456789',
    liabilityCents: 7800000,
    equityOwners: 3,
  },
  {
    seq: 4,
    name: 'Northstar S-Corp',
    entity: 's_corp',
    state: 'NY',
    county: 'New York',
    taxTypes: ['federal_1120s', 'ny_ct3s'],
    ein: '94-1000004',
    liabilityCents: 5500000,
    equityOwners: 4,
  },
  {
    seq: 5,
    name: 'Sunbelt Holdings Inc',
    entity: 'c_corp',
    state: 'FL',
    county: 'Miami-Dade',
    taxTypes: ['federal_1120', 'fl_f1120', 'federal_1120_estimated_tax'],
    ein: '94-1000005',
    liabilityCents: 16200000,
    equityOwners: 6,
  },
  {
    seq: 6,
    name: 'Magnolia Family Trust',
    entity: 'trust',
    state: 'CA',
    county: 'Orange',
    taxTypes: ['federal_1041', 'ca_541'],
    ein: '94-1000006',
    liabilityCents: 2600000,
    equityOwners: null,
  },
  {
    seq: 7,
    name: 'Harbor Lights Nonprofit',
    entity: 'other',
    state: 'NY',
    county: 'Kings',
    taxTypes: ['federal_990', 'ny_it204'],
    ein: '94-1000007',
    liabilityCents: null,
    equityOwners: null,
  },
  {
    seq: 8,
    name: 'Lone Star Ventures LLC',
    entity: 'llc',
    state: 'TX',
    county: 'Travis',
    taxTypes: ['federal_1065', 'tx_franchise_report', 'tx_pir_oir'],
    ein: '94-1000008',
    liabilityCents: 9900000,
    equityOwners: 5,
  },
  {
    seq: 9,
    name: 'Cascade Payroll Co',
    entity: 's_corp',
    state: 'CA',
    county: 'San Diego',
    taxTypes: ['federal_1120s', 'federal_941', 'federal_1040'],
    ein: '94-1000009',
    liabilityCents: 4100000,
    equityOwners: 2,
  },
  {
    seq: 10,
    name: 'Meridian Multistate Corp',
    entity: 'c_corp',
    state: 'NY',
    county: 'New York',
    taxTypes: ['federal_1120', 'ny_ct3', 'federal_1099_nec', 'ca_100'],
    ein: '94-1000010',
    liabilityCents: 13500000,
    equityOwners: 8,
  },
]

// ---------------------------------------------------------------------------
// Obligation scenario matrix. Each spec → one obligation. The set covers every
// status, extension state, e-file state, prep/review/payment sub-state,
// blocked-by dependency, obligation type, and due-date bucket.
// ---------------------------------------------------------------------------
type Scenario =
  | 'pending_upcoming'
  | 'overdue_penalty'
  | 'due_today'
  | 'this_week'
  | 'in_progress_prep'
  | 'prep_bookkeeping'
  | 'waiting_on_client'
  | 'review_in_review'
  | 'review_notes_open'
  | 'blocked'
  | 'extended_auto'
  | 'extended_manual'
  | 'extension_rejected'
  | 'awaiting_signature'
  | 'efile_signed'
  | 'efile_submitted'
  | 'efile_accepted'
  | 'efile_rejected'
  | 'paper_filed'
  | 'paid_confirmed'
  | 'payment_scheduled'
  | 'payment_needs_approval'
  | 'information_pending'
  | 'completed'
  | 'not_applicable'

interface OblSpec {
  seq: number
  client: number
  taxType: string
  scenario: Scenario
  due: keyof typeof DUE
  // `blocks` (seq of the obligation this one is blocked by) for blocked scenario
  blockedBy?: number
}
// 28 specs → applied to every firm. Aligned so taxType fits the client entity.
const OBLIGATIONS: OblSpec[] = [
  { seq: 1, client: 1, taxType: 'federal_1040', scenario: 'pending_upcoming', due: 'thisMonth' },
  {
    seq: 2,
    client: 1,
    taxType: 'federal_1040_estimated_tax',
    scenario: 'payment_scheduled',
    due: 'thisWeek',
  },
  { seq: 3, client: 2, taxType: 'federal_1040', scenario: 'overdue_penalty', due: 'overdue' },
  { seq: 4, client: 3, taxType: 'federal_1065', scenario: 'in_progress_prep', due: 'thisMonth' },
  { seq: 5, client: 3, taxType: 'ca_llc_568', scenario: 'extended_auto', due: 'overdue' },
  { seq: 6, client: 4, taxType: 'federal_1120s', scenario: 'awaiting_signature', due: 'overdue' },
  { seq: 7, client: 4, taxType: 'ny_ct3s', scenario: 'review_in_review', due: 'thisMonth' },
  { seq: 8, client: 5, taxType: 'federal_1120', scenario: 'extended_auto', due: 'overdue' },
  { seq: 9, client: 5, taxType: 'fl_f1120', scenario: 'waiting_on_client', due: 'nextMonth' },
  { seq: 10, client: 6, taxType: 'federal_1041', scenario: 'extended_auto', due: 'overdue' },
  { seq: 11, client: 6, taxType: 'ca_541', scenario: 'blocked', due: 'thisMonth', blockedBy: 10 },
  { seq: 12, client: 7, taxType: 'federal_990', scenario: 'efile_accepted', due: 'overdue' },
  { seq: 13, client: 8, taxType: 'federal_1065', scenario: 'efile_signed', due: 'thisWeek' },
  {
    seq: 14,
    client: 8,
    taxType: 'tx_franchise_report',
    scenario: 'extended_manual',
    due: 'overdue',
  },
  { seq: 15, client: 9, taxType: 'federal_941', scenario: 'paid_confirmed', due: 'overdue' },
  { seq: 16, client: 9, taxType: 'federal_1120s', scenario: 'efile_submitted', due: 'today' },
  { seq: 17, client: 10, taxType: 'federal_1120', scenario: 'efile_rejected', due: 'overdue' },
  { seq: 18, client: 10, taxType: 'ny_ct3', scenario: 'review_notes_open', due: 'thisMonth' },
  {
    seq: 19,
    client: 10,
    taxType: 'federal_1099_nec',
    scenario: 'information_pending',
    due: 'future',
  },
  { seq: 20, client: 2, taxType: 'federal_fbar', scenario: 'extended_auto', due: 'overdue' },
  { seq: 21, client: 7, taxType: 'ny_it204', scenario: 'completed', due: 'overdue' },
  { seq: 22, client: 10, taxType: 'ca_100', scenario: 'not_applicable', due: 'future' },
  { seq: 23, client: 6, taxType: 'ny_it205', scenario: 'extension_rejected', due: 'thisMonth' },
  {
    seq: 24,
    client: 5,
    taxType: 'federal_1120_estimated_tax',
    scenario: 'payment_needs_approval',
    due: 'thisWeek',
  },
  { seq: 25, client: 4, taxType: 'ny_ct3s', scenario: 'prep_bookkeeping', due: 'nextMonth' },
  { seq: 26, client: 8, taxType: 'tx_pir_oir', scenario: 'pending_upcoming', due: 'thisMonth' },
  { seq: 27, client: 9, taxType: 'federal_1040', scenario: 'paper_filed', due: 'overdue' },
  { seq: 28, client: 3, taxType: 'federal_1065', scenario: 'due_today', due: 'today' },
]

// Column order for obligation_instance INSERTs (fixed).
const OBL_COLUMNS = [
  'id',
  'firm_id',
  'client_id',
  'client_filing_profile_id',
  'rule_id',
  'tax_type',
  'tax_year',
  'tax_year_type',
  'jurisdiction',
  'obligation_type',
  'form_name',
  'authority',
  'recurrence',
  'risk_level',
  'generation_source',
  'tax_period_start',
  'tax_period_end',
  'tax_period_kind',
  'tax_period_source',
  'base_due_date',
  'current_due_date',
  'filing_due_date',
  'payment_due_date',
  'status',
  'blocked_by_obligation_instance_id',
  'extension_decision',
  'extension_memo',
  'extension_source',
  'extension_expected_due_date',
  'extension_decided_at',
  'extension_decided_by_user_id',
  'extension_state',
  'extension_form_name',
  'extension_filed_at',
  'prep_stage',
  'review_stage',
  'reviewer_user_id',
  'review_completed_at',
  'payment_state',
  'payment_confirmed_at',
  'efile_state',
  'efile_authorization_form',
  'efile_submitted_at',
  'efile_accepted_at',
  'efile_rejected_at',
  'estimated_tax_due_cents',
  'estimated_exposure_cents',
  'exposure_status',
  'penalty_breakdown_json',
  'penalty_formula_version',
  'exposure_calculated_at',
  'created_at',
  'updated_at',
]

interface OblRow {
  [k: string]: string | number | null
}

function buildObligationRow(firm: Firm, spec: OblSpec): { sql: string; id: string } {
  const tax = TAX[spec.taxType]!
  const taxYear = taxYearOf(tax)
  const client = CLIENTS.find((c) => c.seq === spec.client)!
  const id = uuid(firm.oblPfx, spec.seq)
  const clientId = uuid(firm.clientPfx, client.seq)
  const profileId = uuid(firm.profilePfx, client.seq)
  const baseDue = DUE[spec.due]
  const reviewer =
    firm.members.find((m) => /preparer|manager|partner/.test(m.id)) ?? firm.members[0]!

  // Defaults (every NOT-NULL-with-default column gets a sane value).
  const r: OblRow = {
    id: s(id),
    firm_id: s(firm.id),
    client_id: s(clientId),
    client_filing_profile_id: s(profileId),
    rule_id: s(tax.ruleId),
    tax_type: s(spec.taxType),
    tax_year: taxYear,
    tax_year_type: s('calendar'),
    jurisdiction: s(tax.jur),
    obligation_type: s(tax.type),
    form_name: s(tax.form),
    authority: s(tax.jur === 'FED' ? 'IRS' : tax.jur),
    recurrence: s(tax.recurrence),
    risk_level: s('med'),
    generation_source: s('manual'),
    tax_period_start: ts(`${taxYear}-01-01`),
    tax_period_end: ts(`${taxYear}-12-31`),
    tax_period_kind: s('calendar'),
    tax_period_source: s('client_default'),
    base_due_date: ts(baseDue),
    current_due_date: ts(baseDue),
    filing_due_date: ts(baseDue),
    payment_due_date: tax.jur === 'FED' && tax.type !== 'information' ? ts(baseDue) : 'NULL',
    status: s('pending'),
    blocked_by_obligation_instance_id: 'NULL',
    extension_decision: s('not_considered'),
    extension_memo: 'NULL',
    extension_source: 'NULL',
    extension_expected_due_date: 'NULL',
    extension_decided_at: 'NULL',
    extension_decided_by_user_id: 'NULL',
    extension_state: s(
      tax.duration !== null || spec.taxType === 'tx_franchise_report'
        ? 'not_started'
        : 'not_applicable',
    ),
    extension_form_name: 'NULL',
    extension_filed_at: 'NULL',
    prep_stage: s('not_started'),
    review_stage: s('not_required'),
    reviewer_user_id: 'NULL',
    review_completed_at: 'NULL',
    payment_state: s('not_applicable'),
    payment_confirmed_at: 'NULL',
    efile_state: s(tax.efile ? 'not_applicable' : 'not_applicable'),
    efile_authorization_form: 'NULL',
    efile_submitted_at: 'NULL',
    efile_accepted_at: 'NULL',
    efile_rejected_at: 'NULL',
    estimated_tax_due_cents: client.liabilityCents,
    estimated_exposure_cents: 'NULL',
    exposure_status: s('needs_input'),
    penalty_breakdown_json: s('[]'),
    penalty_formula_version: 'NULL',
    exposure_calculated_at: 'NULL',
    created_at: ts(SEED_TS),
    updated_at: ts(SEED_TS),
  }

  const decidedAt = ts('2026-04-20 10:00:00')
  const exposure = (cents: number, label: string, formula: string) => {
    r.estimated_exposure_cents = cents
    r.exposure_status = s('ready')
    r.penalty_breakdown_json = s(
      JSON.stringify([{ key: 'late_filing', label, amountCents: cents, formula }]),
    )
    r.penalty_formula_version = s('penalty-v1')
    r.exposure_calculated_at = ts(SEED_TS)
  }
  const extend = (manual: boolean) => {
    const original = baseDue
    const ext = manual
      ? addExtensionMonths(original, 6)
      : addExtensionMonths(original, tax.duration ?? 6)
    const target = minusDays(ext, 30) // internal target = a bit before the statutory extended date
    r.status = s('extended')
    r.extension_decision = s('applied')
    r.extension_memo = s('Client materials delayed; extension filed.')
    r.extension_source = s('Partner approval')
    r.extension_expected_due_date = ts(target)
    r.extension_decided_at = decidedAt
    r.extension_decided_by_user_id = s(reviewer.id)
    r.extension_state = s('filed')
    const extForm =
      spec.taxType === 'federal_1040'
        ? 'Form 4868'
        : ['federal_1041', 'federal_1065', 'federal_1120', 'federal_1120s', 'federal_990'].includes(
              spec.taxType,
            )
          ? 'Form 7004'
          : spec.taxType === 'federal_fbar'
            ? 'FinCEN Form 114'
            : tax.form
    r.extension_form_name = s(extForm)
    r.extension_filed_at = decidedAt
    r.filing_due_date = ts(ext)
    r.current_due_date = ts(target)
    r.payment_due_date = ts(original) // payment stays on the original date
  }

  switch (spec.scenario) {
    case 'pending_upcoming':
      break
    case 'due_today':
      break
    case 'this_week':
      break
    case 'overdue_penalty':
      exposure(240000, 'Late filing exposure', '$245 x 3 x 3 months')
      break
    case 'in_progress_prep':
      r.status = s('in_progress')
      r.prep_stage = s('in_prep')
      break
    case 'prep_bookkeeping':
      r.status = s('in_progress')
      r.prep_stage = s('bookkeeping_cleanup')
      break
    case 'waiting_on_client':
      r.status = s('waiting_on_client')
      r.prep_stage = s('waiting_on_client')
      break
    case 'review_in_review':
      r.status = s('review')
      r.prep_stage = s('prepared')
      r.review_stage = s('in_review')
      r.reviewer_user_id = s(reviewer.id)
      break
    case 'review_notes_open':
      r.status = s('review')
      r.prep_stage = s('prepared')
      r.review_stage = s('notes_open')
      r.reviewer_user_id = s(reviewer.id)
      break
    case 'blocked':
      r.status = s('blocked')
      r.blocked_by_obligation_instance_id = s(uuid(firm.oblPfx, spec.blockedBy!))
      break
    case 'extended_auto':
      extend(false)
      exposure(180000, 'Failure-to-pay (payment not extended)', '0.5% x balance x months')
      break
    case 'extended_manual':
      extend(true)
      break
    case 'extension_rejected':
      r.extension_decision = s('rejected')
      r.extension_memo = s('Client opted to file on time; extension declined.')
      r.extension_decided_at = decidedAt
      r.extension_decided_by_user_id = s(reviewer.id)
      r.extension_state = s('rejected')
      break
    case 'awaiting_signature':
      r.status = s('done')
      r.prep_stage = s('prepared')
      r.review_stage = s('approved')
      r.efile_state = s('authorization_requested')
      r.efile_authorization_form = s('Form 8879')
      break
    case 'efile_signed':
      r.status = s('done')
      r.efile_state = s('authorization_signed')
      r.efile_authorization_form = s('Form 8879')
      break
    case 'efile_submitted':
      r.status = s('done')
      r.efile_state = s('submitted')
      r.efile_authorization_form = s('Form 8879')
      r.efile_submitted_at = ts(minusDays(NOW, 1) + ' 14:00:00')
      break
    case 'efile_accepted':
      r.status = s('done')
      r.efile_state = s('accepted')
      r.efile_authorization_form = s('Form 8879')
      r.efile_submitted_at = ts('2026-05-08 14:00:00')
      r.efile_accepted_at = ts('2026-05-09 09:00:00')
      break
    case 'efile_rejected':
      r.status = s('review')
      r.efile_state = s('rejected')
      r.efile_authorization_form = s('Form 8879')
      r.efile_submitted_at = ts('2026-05-08 14:00:00')
      r.efile_rejected_at = ts('2026-05-10 09:00:00')
      r.review_stage = s('notes_open')
      break
    case 'paper_filed':
      r.status = s('done')
      r.efile_state = s('paper_filed')
      break
    case 'paid_confirmed':
      r.status = s('paid')
      r.payment_state = s('confirmed')
      r.payment_confirmed_at = ts('2026-05-15 09:00:00')
      break
    case 'payment_scheduled':
      r.obligation_type = s('payment')
      r.payment_state = s('scheduled')
      break
    case 'payment_needs_approval':
      r.obligation_type = s('payment')
      r.payment_state = s('client_approval_needed')
      break
    case 'information_pending':
      r.obligation_type = s('information')
      break
    case 'completed':
      r.status = s('completed')
      r.prep_stage = s('prepared')
      r.review_stage = s('approved')
      break
    case 'not_applicable':
      r.status = s('not_applicable')
      break
  }

  const values = OBL_COLUMNS.map((c) => String(r[c])).join(', ')
  return { sql: `  (${values})`, id }
}

// ---------------------------------------------------------------------------
// Emit business data.
// ---------------------------------------------------------------------------
const out: string[] = []
out.push(buildPreamble())
out.push('\n-- ====================================================================')
out.push('-- GENERATED BUSINESS DATA (packages/db/seed/generate-demo.ts)')
out.push('-- Comprehensive coverage: every demo firm has clients spanning all')
out.push('-- entity types + jurisdictions, and obligations covering every tax')
out.push('-- type, status, extension/e-file/prep/review/payment sub-state, a')
out.push('-- blocked-by dependency, penalties, and due dates across overdue /')
out.push('-- today / this-week / this-month / future. "Today" = 2026-06-02.')
out.push('-- ====================================================================')

// The preserved firm_profile insert predates the monitoring_start_date column,
// so it leaves it NULL. firms.listMine's output schema requires a date, and
// demo-login only backfills the 4 plan firms (not Archive Solo) — so set it for
// every mock firm here to keep firms.listMine valid.
out.push(
  "\nUPDATE firm_profile SET monitoring_start_date = '2026-01-01'\n" +
    "WHERE id LIKE 'mock_firm_%' AND monitoring_start_date IS NULL;",
)

// migration_batch (one applied batch per firm — powers the Migration demo +
// "imported" provenance on a couple of clients).
out.push('\nINSERT INTO migration_batch')
out.push(
  '  (id, firm_id, user_id, source, raw_input_file_name, raw_input_content_type, raw_input_size_bytes, mapping_json, preset_used, row_count, success_count, skipped_count, ai_global_confidence, status, applied_at, revert_expires_at, created_at, updated_at)',
)
out.push('VALUES')
out.push(
  FIRMS.map(
    (f) =>
      `  (${[
        s(uuid('30', FIRMS.indexOf(f) * 100 + 1)),
        s(f.id),
        s(f.owner),
        s('preset_karbon'),
        s('karbon-import.csv'),
        s('text/csv'),
        1884,
        s(
          '{"rawInput":{"kind":"csv","headers":["Client","EIN","State","Entity","Tax types"],"rowCount":10,"truncated":false},"mapperFallback":"preset"}',
        ),
        s('karbon'),
        10,
        10,
        0,
        0.96,
        s('applied'),
        ts('2026-05-18 09:20:00'),
        ts('2026-05-19 09:20:00'),
        ts('2026-05-18 09:00:00'),
        ts('2026-05-18 09:20:00'),
      ].join(', ')})`,
  ).join(',\n') + ';',
)

// clients
const CLIENT_COLUMNS = [
  'id',
  'firm_id',
  'name',
  'ein',
  'state',
  'county',
  'entity_type',
  'email',
  'notes',
  'assignee_id',
  'assignee_name',
  'importance_weight',
  'late_filing_count_last_12mo',
  'estimated_tax_liability_cents',
  'estimated_tax_liability_source',
  'equity_owner_count',
  'has_payroll',
  'has_sales_tax',
  'has_1099_vendors',
  'has_k1_activity',
  'has_foreign_accounts',
  'migration_batch_id',
  'created_at',
  'updated_at',
]
for (const f of FIRMS) {
  out.push(`\nINSERT INTO client\n  (${CLIENT_COLUMNS.join(', ')})\nVALUES`)
  const rows = CLIENTS.map((c) => {
    const assignee = f.members[c.seq % f.members.length]!
    const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '')
    return `  (${[
      s(uuid(f.clientPfx, c.seq)),
      s(f.id),
      s(`${c.name} (${f.short})`),
      s(c.ein),
      s(c.state),
      s(c.county),
      s(c.entity),
      s(`contact@${slug}.test`),
      s(`Demo ${c.entity} client.`),
      s(assignee.id),
      s(assignee.name),
      (c.seq % 3) + 1,
      c.seq % 3,
      num(c.liabilityCents),
      c.liabilityCents === null ? 'NULL' : s('demo_seed'),
      num(c.equityOwners),
      c.taxTypes.includes('federal_941') ? 1 : 0,
      0,
      c.taxTypes.includes('federal_1099_nec') ? 1 : 0,
      ['partnership', 's_corp', 'llc'].includes(c.entity) ? 1 : 0,
      c.taxTypes.includes('federal_fbar') ? 1 : 0,
      c.seq <= 2 ? s(uuid('30', FIRMS.indexOf(f) * 100 + 1)) : 'NULL',
      ts(SEED_TS),
      ts(SEED_TS),
    ].join(', ')})`
  })
  out.push(rows.join(',\n') + ';')
}

// client_filing_profile (one primary profile per client)
const PROFILE_COLUMNS = [
  'id',
  'firm_id',
  'client_id',
  'state',
  'counties_json',
  'tax_types_json',
  'is_primary',
  'source',
  'created_at',
  'updated_at',
]
for (const f of FIRMS) {
  out.push(`\nINSERT INTO client_filing_profile\n  (${PROFILE_COLUMNS.join(', ')})\nVALUES`)
  const rows = CLIENTS.map(
    (c) =>
      `  (${[
        s(uuid(f.profilePfx, c.seq)),
        s(f.id),
        s(uuid(f.clientPfx, c.seq)),
        s(c.state),
        s(JSON.stringify([c.county])),
        s(JSON.stringify(c.taxTypes)),
        1,
        s('demo_seed'),
        ts(SEED_TS),
        ts(SEED_TS),
      ].join(', ')})`,
  )
  out.push(rows.join(',\n') + ';')
}

// obligation_instance (the comprehensive matrix)
for (const f of FIRMS) {
  out.push(`\nINSERT INTO obligation_instance\n  (${OBL_COLUMNS.join(', ')})\nVALUES`)
  const rows = OBLIGATIONS.map((spec) => buildObligationRow(f, spec).sql)
  out.push(rows.join(',\n') + ';')
}

// ---------------------------------------------------------------------------
// Supporting feature layer — representative-but-present data for every feature,
// tied to the generated obligations/clients. Each table gets rows per firm.
// ---------------------------------------------------------------------------
function emit(table: string, cols: string[], rows: string[]): void {
  if (!rows.length) return
  out.push(`\nINSERT INTO ${table}\n  (${cols.join(', ')})\nVALUES`)
  out.push(rows.join(',\n') + ';')
}
// supporting id: feature prefix + per-firm offset so ids never collide.
function sid(prefix2: string, firmIdx: number, n: number): string {
  return uuid(prefix2, firmIdx * 1000 + n)
}
const obl = (f: Firm, seq: number) => uuid(f.oblPfx, seq)
const cli = (f: Firm, seq: number) => uuid(f.clientPfx, seq)
const row = (...vals: (string | number)[]) => `  (${vals.map(String).join(', ')})`

// Shared pulse alerts (regulatory relief) — firm-agnostic. Linked per-firm
// below so EVERY demo firm (incl. the dev auto-login Pro Plan) shows a rich
// Alerts page: every confidence band (0.94 → 0.46), every change_kind, a
// review-only threshold advisory, plus three pending_review samples that drive
// the Approve / Reject / Quarantine practice-review demo.
emit(
  'pulse',
  [
    'id',
    'source',
    'source_url',
    'published_at',
    'change_kind',
    'action_mode',
    'ai_summary',
    'verbatim_quote',
    'parsed_jurisdiction',
    'parsed_counties',
    'parsed_forms',
    'parsed_entity_types',
    'parsed_original_due_date',
    'parsed_new_due_date',
    'parsed_effective_from',
    'structured_change_json',
    'confidence',
    'status',
    'reviewed_by',
    'reviewed_at',
    'requires_human_review',
    'is_sample',
    'created_at',
    'updated_at',
  ],
  [
    // 001 — matched IRS disaster overlay (Apply path), high confidence.
    row(
      s(uuid('40', 1)),
      s('IRS Disaster Relief'),
      s('https://www.irs.gov/newsroom/tax-relief-in-disaster-situations'),
      ts('2026-05-18 07:30:00'),
      s('deadline_shift'),
      s('due_date_overlay'),
      s(
        'IRS extends selected CA business return deadlines for Los Angeles County to June 16, 2026.',
      ),
      s(
        'Affected taxpayers in Los Angeles County have until June 16, 2026 to file selected federal business returns.',
      ),
      // IRS disaster relief postpones FEDERAL business-return deadlines — the
      // county scopes WHICH clients are covered (those located in LA County),
      // not the form's jurisdiction. The forms are federal_1065/1120s (FED), so
      // the alert must be FED to match any real obligation; a 'CA' jurisdiction
      // matched nothing, which is why the live detail came up empty while the
      // hand-set card count below still read 2. Entity types include
      // `partnership` (the 1065 filer) so the LA-County partnership return is in
      // scope, and the original due date tracks that return's actual deadline
      // (DUE.today, 2026-06-02 → extended to 6/16) so exactly one obligation
      // matches and the count agrees with the drawer.
      s('FED'),
      s('["Los Angeles"]'),
      s('["federal_1065","federal_1120s"]'),
      s('["partnership","llc","s_corp"]'),
      ts(DUE.today),
      ts('2026-06-16'),
      ts('2026-05-18'),
      'NULL',
      0.94,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-05-18 08:30:00'),
      1,
      1,
      ts('2026-05-18 07:35:00'),
      ts('2026-05-18 08:30:00'),
    ),
    // 002 — applied CA FTB overlay (Revert/history path).
    row(
      s(uuid('40', 2)),
      s('CA FTB Newsroom'),
      s('https://www.ftb.ca.gov/about-ftb/newsroom/index.html'),
      ts('2026-05-17 07:30:00'),
      s('deadline_shift'),
      s('due_date_overlay'),
      s('FTB extends the LLC payment deadline to May 30, 2026 for San Diego County taxpayers.'),
      s(
        'The Franchise Tax Board extends the LLC payment deadline to May 30, 2026 for San Diego County taxpayers.',
      ),
      s('CA'),
      s('["San Diego"]'),
      s('["ca_llc_568"]'),
      s('["llc"]'),
      ts('2026-04-30'),
      ts('2026-05-30'),
      ts('2026-04-30'),
      'NULL',
      0.82,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-05-17 08:30:00'),
      1,
      1,
      ts('2026-05-17 07:35:00'),
      ts('2026-05-17 08:30:00'),
    ),
    // 003 — low-confidence NY DTF PTET advisory (review-only).
    row(
      s(uuid('40', 3)),
      s('NY DTF'),
      s('https://www.tax.ny.gov/bus/ptet/'),
      ts('2026-05-16 16:00:00'),
      s('form_instruction'),
      s('review_only'),
      s(
        'NY DTF clarifies the pass-through entity tax (PTET) election window. Low-confidence advisory — review applicability for your partnerships.',
      ),
      s('The PTET election for tax year 2026 must be made by March 15, 2026.'),
      s('NY'),
      s('[]'),
      s('["ny_it204"]'),
      s('["partnership"]'),
      'NULL',
      'NULL',
      'NULL',
      s('{"note":"PTET election reminder only."}'),
      0.58,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-05-16 16:30:00'),
      1,
      1,
      ts('2026-05-16 16:05:00'),
      ts('2026-05-16 16:30:00'),
    ),
    // 004 — sub-50% FL DOR corporate bulletin (very-low confidence).
    row(
      s(uuid('40', 4)),
      s('FL DOR'),
      s('https://floridarevenue.com/taxes/taxesfees/Pages/corporate.aspx'),
      ts('2026-05-15 17:00:00'),
      s('applicability_scope'),
      s('review_only'),
      s(
        'FL DOR corporate income-tax bulletin. Very-low-confidence extraction — applicability depends on entity status, fiscal year, and extension election.',
      ),
      s(
        'Corporate income tax filing dates may depend on entity status, fiscal year, and extension election.',
      ),
      s('FL'),
      s('[]'),
      s('["fl_corp_income"]'),
      s('["c_corp"]'),
      'NULL',
      'NULL',
      'NULL',
      s('{"note":"Applicability depends on fiscal year and extension election."}'),
      0.46,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-05-15 17:30:00'),
      1,
      1,
      ts('2026-05-15 17:05:00'),
      ts('2026-05-15 17:30:00'),
    ),
    // 008 — filing_requirement (Schedule K-3), review-only.
    row(
      s(uuid('40', 8)),
      s('IRS Bulletin'),
      s('https://www.irs.gov/forms-pubs/about-schedule-k-3-form-1065'),
      ts('2026-05-01 06:40:00'),
      s('filing_requirement'),
      s('review_only'),
      s(
        'IRS requires Schedule K-3 attachment for all partnership 1065 filings effective tax year 2026.',
      ),
      s(
        'All partnerships that file Form 1065 must now attach Schedule K-3 reporting items of international tax relevance, regardless of partner residency.',
      ),
      s('FED'),
      s('[]'),
      s('["federal_1065"]'),
      s('["llc","partnership"]'),
      'NULL',
      'NULL',
      ts('2026-01-01'),
      'NULL',
      0.92,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-05-01 07:10:00'),
      1,
      1,
      ts('2026-05-01 06:45:00'),
      ts('2026-05-01 07:10:00'),
    ),
    // 009 — applicability_scope (NY MTA surcharge expansion), review-only.
    row(
      s(uuid('40', 9)),
      s('NY DTF Newsroom'),
      s('https://www.tax.ny.gov/about/press/mta-scope-2026.htm'),
      ts('2026-04-27 11:00:00'),
      s('applicability_scope'),
      s('review_only'),
      s(
        'NY MTA surcharge scope expanded to Brooklyn and Queens for tax year 2026 (was Manhattan + Bronx only).',
      ),
      s(
        'The Metropolitan Transportation Business Tax Surcharge now applies to qualifying business activity sourced to Brooklyn (Kings County) and Queens in addition to the previously covered counties.',
      ),
      s('NY'),
      s('["Brooklyn","Queens"]'),
      s('["ny_mta_surcharge"]'),
      s('["llc","partnership","c_corp"]'),
      'NULL',
      'NULL',
      ts('2026-01-01'),
      'NULL',
      0.88,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-04-27 13:00:00'),
      1,
      1,
      ts('2026-04-27 11:15:00'),
      ts('2026-04-27 13:00:00'),
    ),
    // 00a — form_instruction (1120-S K-3 clarification), review-only.
    row(
      s(uuid('40', 10)),
      s('IRS Newsroom'),
      s('https://www.irs.gov/instructions/i1120sk3'),
      ts('2026-04-25 09:00:00'),
      s('form_instruction'),
      s('review_only'),
      s(
        'IRS clarifies 1120-S Schedule K-3 instructions for foreign-sourced shareholder income reporting.',
      ),
      s(
        'S corporations with shareholders receiving foreign-source income should report on Schedule K-3 Part X, lines 11 through 18, regardless of whether the corporation has international operations.',
      ),
      s('FED'),
      s('[]'),
      s('["federal_1120s"]'),
      s('["s_corp"]'),
      'NULL',
      'NULL',
      ts('2026-04-25'),
      'NULL',
      0.74,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-04-25 11:00:00'),
      1,
      1,
      ts('2026-04-25 09:15:00'),
      ts('2026-04-25 11:00:00'),
    ),
    // 00b — source_status (TX feed degraded), review-only.
    row(
      s(uuid('40', 11)),
      s('TX Comptroller'),
      s('https://comptroller.texas.gov/taxes/franchise/'),
      ts('2026-05-01 09:20:00'),
      s('source_status'),
      s('review_only'),
      s(
        'TX Comptroller RSS feed degraded — last successful poll 24h ago. No content gap detected, but watch this row for follow-ups.',
      ),
      s(
        'Source health status: degraded. Last successful poll completed 24 hours ago; manual verification recommended for upcoming TX franchise report cycles.',
      ),
      s('TX'),
      s('[]'),
      s('["tx_franchise_report"]'),
      s('["llc","c_corp"]'),
      'NULL',
      'NULL',
      ts('2026-05-01'),
      'NULL',
      0.95,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-05-01 09:30:00'),
      1,
      1,
      ts('2026-05-01 09:25:00'),
      ts('2026-05-01 09:30:00'),
    ),
    // 00c — new_obligation (WA tech surtax), review-only.
    row(
      s(uuid('40', 12)),
      s('WA Department of Revenue'),
      s('https://dor.wa.gov/taxes-rates/business-occupation-tax/special-tax-rates'),
      ts('2026-04-22 14:00:00'),
      s('new_obligation'),
      s('review_only'),
      s('WA introduces new gross receipts surtax for tech firms — first filings due Sept 30 2026.'),
      s(
        'Effective July 1 2026, businesses primarily engaged in software publishing, computer system design, or data hosting with WA-sourced gross receipts above $25M will be subject to a new 1.22% surtax. First quarterly returns are due September 30 2026.',
      ),
      s('WA'),
      s('[]'),
      s('["wa_tech_surtax_q3"]'),
      s('["c_corp","llc"]'),
      'NULL',
      ts('2026-09-30'),
      ts('2026-07-01'),
      'NULL',
      0.91,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-04-22 15:30:00'),
      1,
      1,
      ts('2026-04-22 14:15:00'),
      ts('2026-04-22 15:30:00'),
    ),
    // 00d — deadline_shift (IRS 1041 e-file outage), high confidence.
    row(
      s(uuid('40', 13)),
      s('IRS Newsroom'),
      s('https://www.irs.gov/newsroom/irs-1041-system-outage-relief'),
      ts('2026-04-26 16:30:00'),
      s('deadline_shift'),
      s('due_date_overlay'),
      s(
        'IRS extends 1041 fiduciary deadline 30 days due to e-file system outage affecting fiscal-year trusts.',
      ),
      s(
        'Fiscal-year fiduciary returns originally due April 15 2026 may be filed by May 15 2026 without penalty due to an extended e-file system outage affecting trust filings.',
      ),
      s('FED'),
      s('[]'),
      s('["federal_1041"]'),
      s('["trust"]'),
      ts('2026-04-15'),
      ts('2026-05-15'),
      ts('2026-04-26'),
      'NULL',
      0.96,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-04-26 17:00:00'),
      1,
      1,
      ts('2026-04-26 16:35:00'),
      ts('2026-04-26 17:00:00'),
    ),
    // 00e — deterministic IRS inflation threshold advisory (review-only).
    row(
      s(uuid('40', 14)),
      s('IRS'),
      s('https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026'),
      ts('2026-05-15 14:00:00'),
      s('threshold_advisory'),
      s('review_only'),
      s(
        'IRS released the annual inflation-adjustment Revenue Procedure. Review thresholds (gift/estate exclusions, estimated-tax safe harbor) — open the official source for the adjusted figures.',
      ),
      s('See the official IRS Revenue Procedure for the adjusted figures.'),
      s('FED'),
      s('[]'),
      s('[]'),
      s('[]'),
      'NULL',
      'NULL',
      'NULL',
      s(
        '{"kind":"threshold_advisory","sourceId":"fed.irs_inflation_adjustments_2026","sourceUrl":"https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026"}',
      ),
      1,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-05-14 14:30:00'),
      0,
      1,
      ts('2026-05-14 14:05:00'),
      ts('2026-05-14 14:30:00'),
    ),
    // 00f — dismissed AZ DOR storm notice (populates the history view).
    row(
      s(uuid('40', 15)),
      s('AZ DOR'),
      s('https://azdor.gov/news-events-notices'),
      ts('2026-05-13 16:00:00'),
      s('deadline_shift'),
      s('due_date_overlay'),
      s(
        'Arizona DOR posted a storm-extension notice. Dismissed — no matching clients in this practice.',
      ),
      s(
        'The Department announced relief for taxpayers affected by recent storms; certain filing and payment due dates may be extended.',
      ),
      s('AZ'),
      s('["Maricopa"]'),
      s('["federal_1065","federal_1120s"]'),
      s('["llc","s_corp"]'),
      ts('2026-04-15'),
      ts('2026-07-15'),
      ts('2026-05-13'),
      'NULL',
      0.68,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-05-13 16:30:00'),
      1,
      1,
      ts('2026-05-13 16:05:00'),
      ts('2026-05-13 16:30:00'),
    ),
    // 005 — pending_review sample for the Approve action.
    row(
      s(uuid('40', 5)),
      s('Practice Review · Approve Demo'),
      s('https://www.irs.gov/newsroom/tax-relief-in-disaster-situations'),
      ts('2026-05-01 10:00:00'),
      s('deadline_shift'),
      s('due_date_overlay'),
      s('Pending practice review sample intended for the Approve action.'),
      s(
        'Affected Los Angeles County business taxpayers may receive an additional filing extension.',
      ),
      s('CA'),
      s('["Los Angeles"]'),
      s('["federal_1065"]'),
      s('["llc"]'),
      ts('2026-05-15'),
      ts('2026-06-20'),
      ts('2026-05-01'),
      'NULL',
      0.88,
      s('pending_review'),
      'NULL',
      'NULL',
      1,
      1,
      ts('2026-05-01 10:01:00'),
      ts('2026-05-01 10:01:00'),
    ),
    // 006 — pending_review sample for the Reject action.
    row(
      s(uuid('40', 6)),
      s('Practice Review · Reject Demo'),
      s('https://dor.wa.gov/taxes-rates/business-occupation-tax'),
      ts('2026-05-01 10:05:00'),
      s('form_instruction'),
      s('review_only'),
      s('Pending practice review sample intended for the Reject action.'),
      s('The extracted date appears to describe a filing guide update, not a deadline extension.'),
      s('WA'),
      s('[]'),
      s('["wa_b_and_o"]'),
      s('["c_corp"]'),
      'NULL',
      'NULL',
      'NULL',
      'NULL',
      0.62,
      s('pending_review'),
      'NULL',
      'NULL',
      1,
      1,
      ts('2026-05-01 10:06:00'),
      ts('2026-05-01 10:06:00'),
    ),
    // 007 — pending_review sample for the Quarantine action.
    row(
      s(uuid('40', 7)),
      s('Practice Review · Quarantine Demo'),
      s('https://comptroller.texas.gov/taxes/franchise/'),
      ts('2026-05-01 10:10:00'),
      s('applicability_scope'),
      s('review_only'),
      s('Pending practice review sample intended for the Quarantine action.'),
      s(
        'The source copy conflicts with the extracted franchise report date and should be isolated.',
      ),
      s('TX'),
      s('[]'),
      s('["tx_franchise_report"]'),
      s('["llc"]'),
      ts('2026-05-15'),
      ts('2026-07-15'),
      'NULL',
      'NULL',
      0.34,
      s('pending_review'),
      'NULL',
      'NULL',
      1,
      1,
      ts('2026-05-01 10:11:00'),
      ts('2026-05-01 10:11:00'),
    ),
  ],
)

// Protective-claim / rights-window samples (review_only). These carry their
// cutoff in `protective_action_deadline` (the column the still-actionable /
// expiry predicate queries) plus the structured-change detail facts the alert
// card renders. One is still open (future deadline → active list) and one has
// lapsed (past deadline → drops out of active and shows as "Expired" in history).
// Separate INSERT so the base rows above need not carry the extra columns.
emit(
  'pulse',
  [
    'id',
    'source',
    'source_url',
    'published_at',
    'change_kind',
    'action_mode',
    'ai_summary',
    'verbatim_quote',
    'parsed_jurisdiction',
    'parsed_counties',
    'parsed_forms',
    'parsed_entity_types',
    'parsed_original_due_date',
    'parsed_new_due_date',
    'parsed_effective_from',
    'structured_change_json',
    'confidence',
    'status',
    'reviewed_by',
    'reviewed_at',
    'requires_human_review',
    'is_sample',
    'created_at',
    'updated_at',
    'parsed_effective_until',
    'protective_action_deadline',
  ],
  [
    // 020 — still-open COVID disaster-period refund window (deadline 2026-07-10).
    row(
      s(uuid('40', 20)),
      s('Taxpayer Advocate Service Blog'),
      s('https://www.taxpayeradvocate.irs.gov/taxnews-information/blogs-nta/'),
      ts('2026-05-20 09:00:00'),
      s('protective_claim_window'),
      s('review_only'),
      s(
        'Review whether clients should file protective refund claims for the COVID disaster period before the July 10, 2026 deadline.',
      ),
      s(
        'Taxpayers may preserve their right to a refund for the COVID disaster period by filing a protective claim on or before July 10, 2026.',
      ),
      s('FED'),
      s('[]'),
      s('[]'),
      s('[]'),
      'NULL',
      'NULL',
      ts('2020-03-13'),
      s(
        '{"kind":"protective_claim_window","actionDeadline":"2026-07-10","claimTaxYears":[2020,2021],"affectedTaxActs":["COVID disaster relief postponements"],"evidenceNeeded":["original filed return","proof of COVID-period postponement eligibility"],"legalUncertainty":"Whether the section 6511 refund lookback is extended by the disregarded COVID postponement periods (Notice 2023-21).","authorityRefs":["IRC 6511","Notice 2023-21"]}',
      ),
      0.9,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-05-20 10:00:00'),
      1,
      1,
      ts('2026-05-20 09:05:00'),
      ts('2026-05-20 10:00:00'),
      ts('2022-04-18'),
      ts('2026-07-10'),
    ),
    // 021 — lapsed 2019 protective window (deadline 2026-03-15, already past) —
    // exercises the "Expired" history tab/badge.
    row(
      s(uuid('40', 21)),
      s('IRS Internal Revenue Bulletins'),
      s('https://www.irs.gov/irb'),
      ts('2026-01-10 09:00:00'),
      s('protective_claim_window'),
      s('review_only'),
      s(
        'Protective refund-claim window for the 2019 tax year closed on March 15, 2026 — retained in history for the record.',
      ),
      s(
        'Protective claims for the 2019 tax year must have been filed on or before March 15, 2026.',
      ),
      s('FED'),
      s('[]'),
      s('[]'),
      s('[]'),
      'NULL',
      'NULL',
      ts('2019-01-01'),
      s(
        '{"kind":"protective_claim_window","actionDeadline":"2026-03-15","claimTaxYears":[2019],"affectedTaxActs":["COVID disaster relief postponements"],"legalUncertainty":"Lookback extension for the 2019 tax year under the disregarded COVID postponement periods."}',
      ),
      0.88,
      s('approved'),
      s('mock_user_owner_sarah'),
      ts('2026-01-10 10:00:00'),
      1,
      1,
      ts('2026-01-10 09:05:00'),
      ts('2026-01-10 10:00:00'),
      ts('2019-12-31'),
      ts('2026-03-15'),
    ),
  ],
)

// Source-health watchers (firm-agnostic) — power the Rules → Sources view and
// the source_status alert above. Idempotent: pulse_source_state isn't covered
// by the firm-scoped DELETE cleanup, so upsert on conflict.
out.push(`\nINSERT INTO pulse_source_state
  (source_id, tier, jurisdiction, enabled, cadence_ms, health_status, last_checked_at, last_success_at, last_change_detected_at, next_check_at, consecutive_failures, last_error, etag, last_modified, created_at, updated_at)
VALUES
  ('irs.disaster', 'T1', 'US', 1, 1800000, 'healthy', ${ts('2026-05-01 09:45:00')}, ${ts('2026-05-01 09:45:00')}, ${ts('2026-05-01 07:35:00')}, ${ts('2026-05-01 10:15:00')}, 0, NULL, 'mock-etag-irs-disaster', 'Fri, 01 May 2026 07:35:00 GMT', ${ts('2026-05-01 07:00:00')}, ${ts('2026-05-01 09:45:00')}),
  ('ca.ftb.newsroom', 'T1', 'CA', 1, 1800000, 'healthy', ${ts('2026-05-01 09:40:00')}, ${ts('2026-05-01 09:40:00')}, ${ts('2026-04-30 15:10:00')}, ${ts('2026-05-01 10:10:00')}, 0, NULL, 'mock-etag-ca-ftb', 'Thu, 30 Apr 2026 15:10:00 GMT', ${ts('2026-05-01 07:00:00')}, ${ts('2026-05-01 09:40:00')}),
  ('tx.cpa.rss', 'T1', 'TX', 1, 3600000, 'degraded', ${ts('2026-05-01 09:20:00')}, ${ts('2026-05-01 07:20:00')}, NULL, ${ts('2026-05-01 10:20:00')}, 1, 'RSS returned 304 after one retry.', NULL, NULL, ${ts('2026-05-01 07:00:00')}, ${ts('2026-05-01 09:20:00')}),
  ('wa.dor.news', 'T1', 'WA', 1, 3600000, 'healthy', ${ts('2026-05-01 09:10:00')}, ${ts('2026-05-01 09:10:00')}, NULL, ${ts('2026-05-01 10:10:00')}, 0, NULL, NULL, NULL, ${ts('2026-05-01 07:00:00')}, ${ts('2026-05-01 09:10:00')})
ON CONFLICT(source_id) DO UPDATE SET
  tier = excluded.tier,
  jurisdiction = excluded.jurisdiction,
  enabled = excluded.enabled,
  cadence_ms = excluded.cadence_ms,
  health_status = excluded.health_status,
  last_checked_at = excluded.last_checked_at,
  last_success_at = excluded.last_success_at,
  last_change_detected_at = excluded.last_change_detected_at,
  next_check_at = excluded.next_check_at,
  consecutive_failures = excluded.consecutive_failures,
  last_error = excluded.last_error,
  etag = excluded.etag,
  last_modified = excluded.last_modified,
  updated_at = excluded.updated_at;`)

emit(
  'pulse_source_snapshot',
  [
    'id',
    'source_id',
    'external_id',
    'title',
    'official_source_url',
    'published_at',
    'fetched_at',
    'content_hash',
    'raw_r2_key',
    'parse_status',
    'pulse_id',
    'ai_output_id',
    'failure_reason',
    'created_at',
    'updated_at',
  ],
  [
    row(
      s('mock_snapshot_irs_ca_fire_relief'),
      s('irs.disaster'),
      s('irs-2026-ca-fire-relief'),
      s('IRS announces CA fire relief'),
      s('https://www.irs.gov/newsroom/tax-relief-in-disaster-situations'),
      ts('2026-05-01 07:30:00'),
      ts('2026-05-01 07:35:00'),
      s('mockhashirsrelief'),
      s('mock/pulse/irs-ca-fire-relief.html'),
      s('extracted'),
      s(uuid('40', 1)),
      'NULL',
      'NULL',
      ts('2026-05-01 07:35:00'),
      ts('2026-05-01 07:45:00'),
    ),
    row(
      s('mock_snapshot_tx_retry'),
      s('tx.cpa.rss'),
      s('tx-franchise-feed-retry'),
      s('TX Comptroller feed retry'),
      s('https://comptroller.texas.gov/taxes/franchise/'),
      ts('2026-05-01 06:00:00'),
      ts('2026-05-01 09:20:00'),
      s('mockhashtxretry'),
      s('mock/pulse/tx-retry.xml'),
      s('failed'),
      'NULL',
      'NULL',
      s('Temporary upstream 503 after retry budget.'),
      ts('2026-05-01 09:20:00'),
      ts('2026-05-01 09:20:00'),
    ),
  ],
)

const supporting: Record<string, string[]> = {}
const add = (table: string, ...rows: string[]) => {
  ;(supporting[table] ??= []).push(...rows)
}

for (const f of FIRMS) {
  const i = FIRMS.indexOf(f)
  const aiOutId = sid('50', i, 1)

  // Migration Copilot AI trace — column mappings, value normalizations, and a
  // skipped-row error, all tied to this firm's applied migration_batch. Powers
  // the import-history detail (mapping confidence, normalization, errors).
  const migrationBatchId = uuid('30', i * 100 + 1)
  add(
    'migration_mapping',
    row(
      s(sid('31', i, 1)),
      s(migrationBatchId),
      s('Client'),
      s('client.name'),
      0.99,
      s('Column contains business names.'),
      0,
      s('openai/gpt-5-mini'),
      s('mapper@v1'),
      ts('2026-05-18 09:05:00'),
    ),
    row(
      s(sid('31', i, 2)),
      s(migrationBatchId),
      s('State'),
      s('client.state'),
      0.98,
      s('Two-letter jurisdiction values.'),
      0,
      s('openai/gpt-5-mini'),
      s('mapper@v1'),
      ts('2026-05-18 09:05:00'),
    ),
    row(
      s(sid('31', i, 3)),
      s(migrationBatchId),
      s('Entity'),
      s('client.entity_type'),
      0.96,
      s('Entity labels map to DueDateHQ taxonomy.'),
      0,
      s('openai/gpt-5-mini'),
      s('mapper@v1'),
      ts('2026-05-18 09:05:00'),
    ),
    row(
      s(sid('31', i, 4)),
      s(migrationBatchId),
      s('Tax types'),
      s('client.tax_types'),
      0.95,
      s('Mixed federal and state obligation hints.'),
      1,
      s('openai/gpt-5-mini'),
      s('mapper@v1'),
      ts('2026-05-18 09:06:00'),
    ),
  )
  add(
    'migration_normalization',
    row(
      s(sid('32', i, 1)),
      s(migrationBatchId),
      s('entity_type'),
      s('S Corporation'),
      s('s_corp'),
      0.98,
      s('openai/gpt-5-mini'),
      s('normalizer-entity@v1'),
      s('Common S corporation synonym.'),
      0,
      ts('2026-05-18 09:08:00'),
    ),
    row(
      s(sid('32', i, 2)),
      s(migrationBatchId),
      s('state'),
      s('Texas'),
      s('TX'),
      0.99,
      s('openai/gpt-5-mini'),
      s('normalizer-tax-types@v1'),
      s('State name normalized to postal code.'),
      0,
      ts('2026-05-18 09:08:00'),
    ),
    row(
      s(sid('32', i, 3)),
      s(migrationBatchId),
      s('tax_types'),
      s('1065, NY CT-3-S'),
      s('["federal_1065","ny_ct3s"]'),
      0.93,
      s('openai/gpt-5-mini'),
      s('normalizer-tax-types@v1'),
      s('Tax type dictionary match.'),
      1,
      ts('2026-05-18 09:09:00'),
    ),
  )
  add(
    'migration_error',
    row(
      s(sid('33', i, 1)),
      s(migrationBatchId),
      4,
      s('{"Client":"Draft Riverbend","State":"","Entity":"LLC"}'),
      s('STATE_REQUIRED'),
      s('State is required before default matrix can generate state obligations.'),
      ts('2026-05-18 09:12:00'),
    ),
  )

  // notification_preference — one per member.
  for (const [mi, m] of f.members.entries()) {
    add(
      'notification_preference',
      row(s(sid('64', i, mi + 1)), s(f.id), s(m.id), 1, 1, 1, 1, 1, ts(SEED_TS), ts(SEED_TS)),
    )
  }

  // ai_output (dashboard brief generation record).
  add(
    'ai_output',
    row(
      s(aiOutId),
      s(f.id),
      s(f.owner),
      s('brief'),
      s('dashboard-brief@v1'),
      s('openai/gpt-5-mini'),
      s(`dashboard:${f.id}:2026-06-02`),
      s(`hash-${f.id}-brief`),
      s(
        'Several deadlines need attention this week across the practice. Overdue returns carry the largest exposure.',
      ),
      s('[]'),
      s('allowed'),
      'NULL',
      ts('2026-06-02 08:00:00'),
      1840,
      188,
      1180,
      0.014,
    ),
  )

  // dashboard_brief — top 3 obligations.
  add(
    'dashboard_brief',
    row(
      s(sid('51', i, 1)),
      s(f.id),
      'NULL',
      s('firm'),
      s('2026-06-02'),
      s('ready'),
      s(`hash-${f.id}-brief`),
      s(aiOutId),
      s(
        'Several deadlines need attention this week. Overdue returns carry the largest exposure; a few are awaiting client signature.',
      ),
      s(JSON.stringify([obl(f, 3), obl(f, 8), obl(f, 6)])),
      s('[]'),
      s('demo_seed'),
      'NULL',
      ts('2026-06-02 08:00:00'),
      ts('2026-06-03 08:00:00'),
      ts(SEED_TS),
      ts('2026-06-02 08:00:00'),
    ),
  )

  // evidence_link — provenance on a couple of obligations (drawer Evidence tab).
  add(
    'evidence_link',
    row(
      s(sid('52', i, 1)),
      s(f.id),
      s(obl(f, 1)),
      'NULL',
      s('default_inference_by_entity_state'),
      s('default-matrix-v1'),
      'NULL',
      s('Federal 1040 due date inferred from entity type and tax year.'),
      s('individual / CA / 2026'),
      s('federal_1040 / 2026-06-22'),
      1.0,
      'NULL',
      s('default-matrix-v1.0'),
      ts('2026-05-18 09:00:00'),
      s(f.owner),
      ts('2026-05-18 09:20:00'),
      s(f.owner),
    ),
    row(
      s(sid('52', i, 2)),
      s(f.id),
      s(obl(f, 5)),
      'NULL',
      s('verified_rule'),
      s('ca.llc.568.return.2025'),
      'NULL',
      s('CA Form 568 filing deadline from the verified rule.'),
      s('ca_llc_568 / 2026'),
      s('Form 568 / extended'),
      1.0,
      'NULL',
      s('rule-v1'),
      ts('2026-05-18 09:00:00'),
      s(f.owner),
      ts('2026-05-18 09:20:00'),
      s(f.owner),
    ),
  )

  // ai_insight_cache — a client risk summary (client cards / opportunities).
  add(
    'ai_insight_cache',
    row(
      s(sid('70', i, 1)),
      s(f.id),
      s('client_risk_summary'),
      s('client'),
      s(cli(f, 3)),
      s('2026-06-02'),
      s('ready'),
      s(`risk-${f.id}-c3`),
      'NULL',
      s(
        JSON.stringify({
          sections: [
            {
              key: 'risk',
              label: 'Risk',
              text: 'High importance, recent late-filing history, and an open partnership deadline in the near window.',
              citationRefs: [],
            },
          ],
        }),
      ),
      s('[]'),
      s('demo_seed'),
      'NULL',
      ts('2026-06-02 08:00:00'),
      ts('2026-06-03 08:00:00'),
      ts(SEED_TS),
      ts('2026-06-02 08:00:00'),
    ),
  )

  // audit_event — a few representative actions.
  add(
    'audit_event',
    row(
      s(sid('60', i, 1)),
      s(f.id),
      s(f.owner),
      s('obligation_instance'),
      s(obl(f, 5)),
      s('obligation.extension.decided'),
      s('{"status":"pending"}'),
      s('{"status":"extended","filingDeadline":"extended"}'),
      s('Extension filed.'),
      s('iphash_demo'),
      s('uahash_demo'),
      ts('2026-06-02 09:15:00'),
    ),
    row(
      s(sid('60', i, 2)),
      s(f.id),
      s(f.members[Math.min(1, f.members.length - 1)]!.id),
      s('obligation_instance'),
      s(obl(f, 4)),
      s('obligation.status.updated'),
      s('{"status":"pending"}'),
      s('{"status":"in_progress"}'),
      'NULL',
      s('iphash_demo'),
      s('uahash_demo'),
      ts('2026-06-01 14:00:00'),
    ),
    row(
      s(sid('60', i, 3)),
      s(f.id),
      s(f.owner),
      s('migration_batch'),
      s(uuid('30', i * 100 + 1)),
      s('migration.batch.applied'),
      'NULL',
      s('{"successCount":10}'),
      'NULL',
      s('iphash_demo'),
      s('uahash_demo'),
      ts('2026-06-01 11:00:00'),
    ),
    // 2026-06-11 (Daily Brief recap demo data): completion + due-date-move
    // events INSIDE the recap window (the seeded dashboard visit below is
    // anchored 2026-05-31, so June 1-2 activity counts). Entities chosen for
    // status consistency: seq 6 (awaiting_signature) + seq 13 (efile_signed)
    // both END as status='done' with no baked contradicting timestamps.
    row(
      s(sid('60', i, 4)),
      s(f.id),
      s(f.owner),
      s('obligation_instance'),
      s(obl(f, 6)),
      s('obligation.status.updated'),
      s('{"status":"review"}'),
      s('{"status":"done"}'),
      s('Return filed; awaiting e-sign authorization.'),
      s('iphash_demo'),
      s('uahash_demo'),
      ts('2026-06-01 16:20:00'),
    ),
    row(
      s(sid('60', i, 5)),
      s(f.id),
      s(f.members[Math.min(1, f.members.length - 1)]!.id),
      s('obligation_instance'),
      s(obl(f, 13)),
      s('obligation.status.updated'),
      s('{"status":"review"}'),
      s('{"status":"done"}'),
      'NULL',
      s('iphash_demo'),
      s('uahash_demo'),
      ts('2026-06-02 10:05:00'),
    ),
    row(
      s(sid('60', i, 6)),
      s(f.id),
      s(f.owner),
      s('obligation_instance'),
      s(obl(f, 2)),
      s('obligation.due_date.updated'),
      s('{"currentDueDate":"2026-06-15"}'),
      s('{"currentDueDate":"2026-09-15"}'),
      s('Disaster-relief overlay applied.'),
      s('iphash_demo'),
      s('uahash_demo'),
      ts('2026-06-02 08:40:00'),
    ),
  )

  // user_dashboard_visit — recap anchor (Daily Brief "since your last visit").
  // Seeded to 2026-05-31 so the June 1-2 audit/reminder activity above lands
  // in the window. The repo re-stamps lastVisitAt on first real load and
  // preserves this as previousVisitAt, so the window survives the rollover.
  add(
    'user_dashboard_visit',
    row(s(sid('72', i, 1)), s(f.owner), s(f.id), ts('2026-05-31 18:00:00'), 'NULL'),
  )

  // audit_evidence_package — one ready export per firm.
  add(
    'audit_evidence_package',
    row(
      s(sid('61', i, 1)),
      s(f.id),
      s(f.owner),
      s('firm'),
      'NULL',
      ts('2026-05-01 00:00:00'),
      ts('2026-06-02 10:00:00'),
      4,
      s('[{"path":"audit/events.json","bytes":4200}]'),
      s('mocksha256'),
      s(`mock/audit/${f.id}-package.zip`),
      s('ready'),
      ts('2026-06-09 10:00:00'),
      'NULL',
      ts('2026-06-02 09:57:00'),
      ts('2026-06-02 09:58:00'),
    ),
  )

  // email_outbox — a sent reminder digest.
  add(
    'email_outbox',
    row(
      s(sid('62', i, 1)),
      s(f.id),
      s(`mock-email-${f.id}-digest`),
      s('pulse_digest'),
      s('sent'),
      s('{"subject":"Weekly deadline digest","recipientCount":3}'),
      ts('2026-06-01 09:31:00'),
      ts('2026-06-01 09:32:00'),
      'NULL',
      'NULL',
    ),
  )

  // in_app_notification — a couple per owner.
  add(
    'in_app_notification',
    row(
      s(sid('63', i, 1)),
      s(f.id),
      s(f.owner),
      s('deadline_reminder'),
      s('obligation_instance'),
      s(obl(f, 3)),
      s('Overdue return needs attention'),
      s('A federal 1040 is overdue and carries late-filing exposure.'),
      s('/deadlines'),
      s('{"severity":"critical"}'),
      'NULL',
      ts('2026-06-02 09:50:00'),
    ),
    row(
      s(sid('63', i, 2)),
      s(f.id),
      s(f.owner),
      s('audit_package_ready'),
      s('audit_evidence_package'),
      s(sid('61', i, 1)),
      s('Evidence package ready'),
      s('Your firm audit evidence package is ready to download.'),
      s('/audit'),
      s('{}'),
      ts('2026-06-02 10:05:00'),
      ts('2026-06-02 10:00:00'),
    ),
  )

  // reminder — scheduled member nudges tied to obligations.
  add(
    'reminder',
    row(
      s(sid('65', i, 1)),
      s(f.id),
      s(obl(f, 3)),
      s(cli(f, 2)),
      s('member'),
      s(f.owner),
      'NULL',
      s('in_app'),
      0,
      s('2026-06-02'),
      s('sent'),
      'NULL',
      s(sid('63', i, 1)),
      s(`${f.id}:${obl(f, 3)}:owner:0:in_app`),
      ts('2026-06-02 09:50:00'),
      'NULL',
      'NULL',
      ts('2026-06-01 09:45:00'),
    ),
    row(
      s(sid('65', i, 2)),
      s(f.id),
      s(obl(f, 1)),
      s(cli(f, 1)),
      s('member'),
      s(f.owner),
      'NULL',
      s('in_app'),
      7,
      s('2026-06-15'),
      s('pending'),
      'NULL',
      'NULL',
      s(`${f.id}:${obl(f, 1)}:owner:7:in_app`),
      'NULL',
      'NULL',
      'NULL',
      ts(SEED_TS),
    ),
  )

  // client_readiness_request + responses — tied to the waiting_on_client row.
  const reqId = sid('69', i, 1)
  const checklist = JSON.stringify([
    { id: 'organizer', label: 'Tax organizer complete' },
    { id: 'k1s', label: 'All K-1s received' },
    { id: 'bank', label: 'Year-end bank statements' },
  ])
  add(
    'client_readiness_request',
    row(
      s(reqId),
      s(f.id),
      s(obl(f, 9)),
      s(cli(f, 5)),
      s(f.owner),
      s('contact@sunbeltholdingsinc.test'),
      s(`readiness-hash-${f.id}`),
      s('responded'),
      s(checklist),
      ts('2026-06-20 00:00:00'),
      ts('2026-05-21 09:36:00'),
      ts('2026-05-21 09:50:00'),
      ts('2026-05-22 10:05:00'),
      ts('2026-05-21 09:36:00'),
      ts('2026-05-22 10:05:00'),
    ),
  )
  add(
    'client_readiness_response',
    row(
      s(sid('6a', i, 1)),
      s(f.id),
      s(reqId),
      s(obl(f, 9)),
      s('organizer'),
      s('ready'),
      'NULL',
      'NULL',
      ts('2026-05-22 10:00:00'),
    ),
    row(
      s(sid('6a', i, 2)),
      s(f.id),
      s(reqId),
      s(obl(f, 9)),
      s('k1s'),
      s('need_help'),
      s('Two K-1s still outstanding from the partnership.'),
      ts('2026-06-10 00:00:00'),
      ts('2026-05-22 10:05:00'),
    ),
  )

  // obligation_saved_view — a pinned filter per owner.
  add(
    'obligation_saved_view',
    row(
      s(sid('68', i, 1)),
      s(f.id),
      s(f.owner),
      s('Overdue & this week'),
      s('{"due":"overdue"}'),
      s('{"estimatedExposureCents":true,"readiness":true}'),
      s('comfortable'),
      1,
      ts(SEED_TS),
      ts(SEED_TS),
    ),
  )

  // calendar_subscription — owner's iCal feed.
  // 2026-06-08: id prefix was '681' (3 chars) which overflowed the first
  // UUID group to 9 chars (681000000-…), so the seeded ids failed the
  // `id: z.uuid()` output schema and every calendar.* RPC 500'd ("Output
  // validation failed"). Switched to the unused 2-char prefix '71' so the
  // first group is a valid 8 chars (71000000-…).
  add(
    'calendar_subscription',
    row(
      s(sid('71', i, 1)),
      s(f.id),
      s('my'),
      s(f.owner),
      s('redacted'),
      s(`cal-nonce-${f.id}`),
      s('active'),
      ts('2026-06-01 10:00:00'),
      'NULL',
      ts(SEED_TS),
      ts('2026-06-01 10:00:00'),
    ),
  )

  // client_email_suppression — one bounced contact.
  add(
    'client_email_suppression',
    row(
      s(sid('66', i, 1)),
      s(f.id),
      s(`bounced@${f.short.toLowerCase().replace(/\s+/g, '')}.test`),
      s(`suppress-${f.id}`),
      s('bounce'),
      ts(SEED_TS),
    ),
  )

  // llm_log — usage record for the brief.
  add(
    'llm_log',
    row(
      s(sid('67', i, 1)),
      s(f.id),
      s(f.owner),
      s('dashboard-brief@v1'),
      s('openai/gpt-5-mini'),
      s(`hash-${f.id}-brief`),
      1840,
      188,
      1180,
      0.014,
      s('allowed'),
      'NULL',
      1,
      'NULL',
      ts('2026-06-02 08:00:00'),
    ),
  )

  // pulse_firm_alert — link every approved shared alert to this firm so the
  // Alerts list + history + the PulseStatusBadge show full variety (matched /
  // applied / partially_applied / reviewed / dismissed) on each firm,
  // including the dev auto-login Pro Plan. The three pending_review pulses
  // (uuid 5/6/7) are intentionally NOT linked — they live in the review queue.
  const firmAlerts: Array<{
    n: number
    status: string
    matched: number
    needsReview: number
    dismissed?: boolean
    at: string
  }> = [
    // n=1 hero (Apply path): exactly one LA-County partnership 1065 (Arbor &
    // Vale, due today) matches the FED overlay above, so matched=1. Keep this in
    // step with the live detail — getDetail self-heals it on view, but the seed
    // should be correct on its own (digest email + first paint read it).
    { n: 1, status: 'matched', matched: 1, needsReview: 0, at: '2026-05-18 08:31:00' },
    { n: 2, status: 'applied', matched: 1, needsReview: 0, at: '2026-05-17 08:31:00' },
    { n: 3, status: 'matched', matched: 0, needsReview: 0, at: '2026-05-16 16:31:00' },
    { n: 4, status: 'matched', matched: 0, needsReview: 0, at: '2026-05-15 17:31:00' },
    { n: 8, status: 'matched', matched: 2, needsReview: 1, at: '2026-05-01 07:11:00' },
    { n: 9, status: 'partially_applied', matched: 1, needsReview: 1, at: '2026-04-27 13:01:00' },
    { n: 10, status: 'reviewed', matched: 1, needsReview: 0, at: '2026-04-25 11:01:00' },
    { n: 11, status: 'matched', matched: 0, needsReview: 0, at: '2026-05-01 09:31:00' },
    { n: 12, status: 'matched', matched: 1, needsReview: 2, at: '2026-04-22 15:31:00' },
    { n: 13, status: 'matched', matched: 1, needsReview: 0, at: '2026-04-26 17:01:00' },
    { n: 14, status: 'matched', matched: 0, needsReview: 0, at: '2026-05-14 14:31:00' },
    {
      n: 15,
      status: 'dismissed',
      matched: 0,
      needsReview: 0,
      dismissed: true,
      at: '2026-05-13 18:00:00',
    },
    // 020 — still-open protective window: shows firm-wide in the active list. The
    // demo firms only carry 2026 obligations, so the live affected-clients scan
    // (covered years 2019-2022) returns 0 — keep needsReview 0 so the badge
    // matches the detail. A real firm with covered-year filings shows candidates.
    { n: 20, status: 'matched', matched: 0, needsReview: 0, at: '2026-05-20 10:05:00' },
    // 021 — lapsed protective window: deadline passed, so listAlerts hides it and
    // listHistory surfaces it under the "Expired" tab. No covered-year obligations
    // in demo data → 0 review clients.
    { n: 21, status: 'matched', matched: 0, needsReview: 0, at: '2026-01-10 10:05:00' },
  ]
  add(
    'pulse_firm_alert',
    ...firmAlerts.map((a) =>
      row(
        s(sid('41', i, a.n)),
        s(uuid('40', a.n)),
        s(f.id),
        s(a.status),
        a.matched,
        a.needsReview,
        a.dismissed ? s(f.owner) : 'NULL',
        a.dismissed ? ts(a.at) : 'NULL',
        ts(a.at),
        ts(a.at),
      ),
    ),
  )

  // pulse_priority_review — a preparer flagged these alerts for review.
  // The presence of `requested_by` is what `listPriorityQueue` reads as
  // the `preparer_requested` (+30) scoring signal (see repo/pulse/scoped
  // `listPriorityQueue`), so marking the already-impactful matched alerts
  // (n=1 hero, n=8, n=12) lifts them into the HIGH/URGENT tiers and gives
  // the alert row its smart-priority "Why?" inset (Pencil g5kKJQ `IciLB`)
  // real reasons to show. The queue recomputes score/level/reasons live,
  // so the stored `priority_score` / reasons here are just a cache. Only
  // matched/partially_applied alerts qualify for the queue. The preparer
  // is the firm's preparer member when it has one, else the owner.
  const preparer = f.members[1]?.id ?? f.owner
  const reviewRequestedAlerts = firmAlerts.filter((a) => [1, 8, 12].includes(a.n))
  add(
    'pulse_priority_review',
    ...reviewRequestedAlerts.map((a) =>
      row(
        s(sid('42', i, a.n)),
        s(f.id),
        s(sid('41', i, a.n)),
        s(uuid('40', a.n)),
        s('open'),
        0,
        s('[]'),
        s('[]'),
        s('[]'),
        s('[]'),
        s('A preparer asked about this client.'),
        s(preparer),
        'NULL',
        'NULL',
        ts(a.at),
        ts(a.at),
      ),
    ),
  )
}

// Brightline-only overlay demo: an exception rule applied to its CA 568 row.
const bl = FIRMS[0]!
emit(
  'exception_rule',
  [
    'id',
    'firm_id',
    'source_pulse_id',
    'jurisdiction',
    'counties',
    'affected_forms',
    'affected_entity_types',
    'override_type',
    'override_value_json',
    'override_due_date',
    'effective_from',
    'effective_until',
    'status',
    'source_url',
    'verbatim_quote',
    'created_at',
    'updated_at',
  ],
  [
    row(
      s(uuid('42', 1)),
      s(bl.id),
      s(uuid('40', 2)),
      s('CA'),
      s('["San Diego"]'),
      s('["ca_llc_568"]'),
      s('["llc"]'),
      s('extend_due_date'),
      s('{"originalDueDate":"2026-04-30","newDueDate":"2026-05-30"}'),
      ts('2026-05-30'),
      ts('2026-04-30 15:00:00'),
      'NULL',
      s('applied'),
      s('https://www.ftb.ca.gov/about-ftb/newsroom/index.html'),
      s('FTB extends the LLC payment deadline to May 30, 2026 for San Diego County taxpayers.'),
      ts(SEED_TS),
      ts(SEED_TS),
    ),
  ],
)
emit(
  'obligation_exception_application',
  [
    'id',
    'firm_id',
    'obligation_instance_id',
    'exception_rule_id',
    'applied_at',
    'applied_by_user_id',
    'reverted_at',
    'reverted_by_user_id',
  ],
  [
    row(
      s(uuid('43', 1)),
      s(bl.id),
      s(obl(bl, 5)),
      s(uuid('42', 1)),
      ts(SEED_TS),
      s(bl.owner),
      'NULL',
      'NULL',
    ),
  ],
)

// Flush supporting tables in FK-safe order.
const SUPPORT_ORDER = [
  'migration_mapping',
  'migration_normalization',
  'migration_error',
  'notification_preference',
  'ai_output',
  'dashboard_brief',
  'evidence_link',
  'ai_insight_cache',
  'audit_event',
  'audit_evidence_package',
  'email_outbox',
  'in_app_notification',
  'reminder',
  'user_dashboard_visit',
  'client_readiness_request',
  'client_readiness_response',
  'obligation_saved_view',
  'calendar_subscription',
  'client_email_suppression',
  'llm_log',
  'pulse_firm_alert',
  // FK-safe: references pulse_firm_alert.id + pulse.id, both emitted above.
  'pulse_priority_review',
]
const SUPPORT_COLS: Record<string, string[]> = {
  migration_mapping: [
    'id',
    'batch_id',
    'source_header',
    'target_field',
    'confidence',
    'reasoning',
    'user_overridden',
    'model',
    'prompt_version',
    'created_at',
  ],
  migration_normalization: [
    'id',
    'batch_id',
    'field',
    'raw_value',
    'normalized_value',
    'confidence',
    'model',
    'prompt_version',
    'reasoning',
    'user_overridden',
    'created_at',
  ],
  migration_error: [
    'id',
    'batch_id',
    'row_index',
    'raw_row_json',
    'error_code',
    'error_message',
    'created_at',
  ],
  notification_preference: [
    'id',
    'firm_id',
    'user_id',
    'email_enabled',
    'in_app_enabled',
    'reminders_enabled',
    'pulse_enabled',
    'unassigned_reminders_enabled',
    'created_at',
    'updated_at',
  ],
  ai_output: [
    'id',
    'firm_id',
    'user_id',
    'kind',
    'prompt_version',
    'model',
    'input_context_ref',
    'input_hash',
    'output_text',
    'citations_json',
    'guard_result',
    'refusal_code',
    'generated_at',
    'tokens_in',
    'tokens_out',
    'latency_ms',
    'cost_usd',
  ],
  dashboard_brief: [
    'id',
    'firm_id',
    'user_id',
    'scope',
    'as_of_date',
    'status',
    'input_hash',
    'ai_output_id',
    'summary_text',
    'top_obligation_ids_json',
    'citations_json',
    'reason',
    'error_code',
    'generated_at',
    'expires_at',
    'created_at',
    'updated_at',
  ],
  evidence_link: [
    'id',
    'firm_id',
    'obligation_instance_id',
    'ai_output_id',
    'source_type',
    'source_id',
    'source_url',
    'verbatim_quote',
    'raw_value',
    'normalized_value',
    'confidence',
    'model',
    'matrix_version',
    'verified_at',
    'verified_by',
    'applied_at',
    'applied_by',
  ],
  ai_insight_cache: [
    'id',
    'firm_id',
    'kind',
    'subject_type',
    'subject_id',
    'as_of_date',
    'status',
    'input_hash',
    'ai_output_id',
    'output_json',
    'citations_json',
    'reason',
    'error_code',
    'generated_at',
    'expires_at',
    'created_at',
    'updated_at',
  ],
  user_dashboard_visit: ['id', 'user_id', 'firm_id', 'last_visit_at', 'previous_visit_at'],
  audit_event: [
    'id',
    'firm_id',
    'actor_id',
    'entity_type',
    'entity_id',
    'action',
    'before_json',
    'after_json',
    'reason',
    'ip_hash',
    'user_agent_hash',
    'created_at',
  ],
  audit_evidence_package: [
    'id',
    'firm_id',
    'exported_by_user_id',
    'scope',
    'scope_entity_id',
    'range_start',
    'range_end',
    'file_count',
    'file_manifest_json',
    'sha256_hash',
    'r2_key',
    'status',
    'expires_at',
    'failure_reason',
    'created_at',
    'updated_at',
  ],
  email_outbox: [
    'id',
    'firm_id',
    'external_id',
    'type',
    'status',
    'payload_json',
    'created_at',
    'sent_at',
    'failed_at',
    'failure_reason',
  ],
  in_app_notification: [
    'id',
    'firm_id',
    'user_id',
    'type',
    'entity_type',
    'entity_id',
    'title',
    'body',
    'href',
    'metadata_json',
    'read_at',
    'created_at',
  ],
  reminder: [
    'id',
    'firm_id',
    'obligation_instance_id',
    'client_id',
    'recipient_kind',
    'recipient_user_id',
    'recipient_email',
    'channel',
    'offset_days',
    'scheduled_for',
    'status',
    'email_outbox_id',
    'notification_id',
    'dedupe_key',
    'sent_at',
    'clicked_at',
    'failure_reason',
    'created_at',
  ],
  client_readiness_request: [
    'id',
    'firm_id',
    'obligation_instance_id',
    'client_id',
    'created_by_user_id',
    'recipient_email',
    'token_hash',
    'status',
    'checklist_json',
    'expires_at',
    'sent_at',
    'first_opened_at',
    'last_responded_at',
    'created_at',
    'updated_at',
  ],
  client_readiness_response: [
    'id',
    'firm_id',
    'request_id',
    'obligation_instance_id',
    'item_id',
    'status',
    'note',
    'eta_date',
    'created_at',
  ],
  obligation_saved_view: [
    'id',
    'firm_id',
    'created_by_user_id',
    'name',
    'query_json',
    'column_visibility_json',
    'density',
    'is_pinned',
    'created_at',
    'updated_at',
  ],
  calendar_subscription: [
    'id',
    'firm_id',
    'scope',
    'subject_user_id',
    'privacy_mode',
    'token_nonce',
    'status',
    'last_accessed_at',
    'revoked_at',
    'created_at',
    'updated_at',
  ],
  client_email_suppression: ['id', 'firm_id', 'email', 'token_hash', 'reason', 'created_at'],
  llm_log: [
    'id',
    'firm_id',
    'user_id',
    'prompt_version',
    'model',
    'input_hash',
    'input_tokens',
    'output_tokens',
    'latency_ms',
    'cost_usd',
    'guard_result',
    'refusal_code',
    'success',
    'error_msg',
    'created_at',
  ],
  pulse_firm_alert: [
    'id',
    'pulse_id',
    'firm_id',
    'status',
    'matched_count',
    'needs_review_count',
    'dismissed_by',
    'dismissed_at',
    'created_at',
    'updated_at',
  ],
  pulse_priority_review: [
    'id',
    'firm_id',
    'alert_id',
    'pulse_id',
    'status',
    'priority_score',
    'priority_reasons_json',
    'selected_obligation_ids_json',
    'confirmed_obligation_ids_json',
    'excluded_obligation_ids_json',
    'note',
    'requested_by',
    'reviewed_by',
    'reviewed_at',
    'created_at',
    'updated_at',
  ],
}
for (const table of SUPPORT_ORDER) {
  emit(table, SUPPORT_COLS[table]!, supporting[table] ?? [])
}

writeFileSync(sqlPath, out.join('\n') + '\n')
console.log(`[generate-demo] Wrote ${sqlPath}`)
console.log(
  `[generate-demo] Firms: ${FIRMS.length}, clients/firm: ${CLIENTS.length}, obligations/firm: ${OBLIGATIONS.length}`,
)
