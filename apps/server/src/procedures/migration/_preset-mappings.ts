import type { MappingRow, MappingTarget } from '@duedatehq/contracts'

/**
 * Preset-Profile fallback mappings — used when the AI Mapper is not used or
 * unavailable and the user picked a Preset Profile in Step 1.
 *
 * Authority:
 *   - docs/product-design/migration-copilot/04-ai-prompts.md §2.1 (preset boost)
 *   - docs/product-design/migration-copilot/02-ux-4step-wizard.md §5.4 (fallback banner)
 *   - Public export / bulk-update docs for each supported source. Keep this
 *     list to fields those sources expose, not demo fixture enrichment fields.
 *
 * Confidence is fixed at 0.85 for fallback rows so the UI tags them Medium —
 * not High. Prompt version is `preset@v2` so audit / evidence drawer can
 * distinguish fallback rows from genuine AI rows at a glance.
 */

export const PRESET_VERSION = 'preset@v2'
export const PRESET_FALLBACK_CONFIDENCE = 0.85

export type PresetId =
  | 'taxdome'
  | 'drake'
  | 'karbon'
  | 'quickbooks'
  | 'file_in_time'
  | 'cch_axcess'
  | 'cch_prosystem_fx'
  | 'lacerte'
  | 'proseries'
  | 'ultratax_cs'
  | 'proconnect_tax'

const PRESET_MAPPINGS = {
  taxdome: {
    'account name': 'client.name',
    'contact name': 'client.name',
    'company name': 'client.name',
    name: 'client.name',
    state: 'client.state',
    'state/province': 'client.state',
    states: 'client.filing_states',
    jurisdictions: 'client.filing_states',
    'filing states': 'client.filing_states',
    'filing jurisdictions': 'client.filing_states',
    type: 'IGNORE',
    'account type': 'IGNORE',
    'tax id': 'client.ein',
    ein: 'client.ein',
    'tax entity type': 'client.entity_type',
    'tax return type': 'client.tax_types',
    'tax year type': 'client.tax_year_type',
    'fiscal year end': 'client.fiscal_year_end',
    fye: 'client.fiscal_year_end',
    'primary contact': 'client.primary_contact_name',
    'primary contact name': 'client.primary_contact_name',
    'linked contact #1': 'client.primary_contact_name',
    'primary contact email': 'client.primary_contact_email',
    email: 'client.email',
    'email address': 'client.email',
    assignee: 'client.assignee_name',
    'team members': 'client.assignee_name',
    'assigned team members': 'client.assignee_name',
    notes: 'client.notes',
  },
  drake: {
    'client name': 'client.name',
    name: 'client.name',
    'taxpayer name': 'client.name',
    ein: 'client.ein',
    'id number': 'client.ein',
    'taxpayer id': 'client.ein',
    state: 'client.state',
    states: 'client.filing_states',
    jurisdictions: 'client.filing_states',
    'return type': 'client.entity_type',
    'tax year type': 'client.tax_year_type',
    'fiscal year end': 'client.fiscal_year_end',
    fye: 'client.fiscal_year_end',
    email: 'client.email',
    'email address': 'client.email',
    'taxpayer email address': 'client.email',
  },
  karbon: {
    name: 'client.name',
    'organization name': 'client.name',
    'person/organization name': 'client.name',
    'legal name': 'client.name',
    'associated organization': 'client.name',
    'tax id': 'client.ein',
    state: 'client.state',
    states: 'client.filing_states',
    jurisdictions: 'client.filing_states',
    'entity type': 'client.entity_type',
    'tax year type': 'client.tax_year_type',
    'fiscal year end': 'client.fiscal_year_end',
    fye: 'client.fiscal_year_end',
    'primary contact': 'client.primary_contact_name',
    'primary contact name': 'client.primary_contact_name',
    'contact name': 'client.primary_contact_name',
    'contact email': 'client.primary_contact_email',
    'email address': 'client.primary_contact_email',
    email: 'client.email',
    'client owner': 'client.assignee_name',
    'client manager': 'client.assignee_name',
    'client owner & manager': 'client.assignee_name',
    owner: 'client.assignee_name',
    manager: 'client.assignee_name',
  },
  quickbooks: {
    customer: 'client.name',
    name: 'client.name',
    company: 'client.name',
    'company name': 'client.name',
    'display name': 'client.name',
    state: 'client.state',
    'billing state': 'client.state',
    states: 'client.filing_states',
    jurisdictions: 'client.filing_states',
    'filing states': 'client.filing_states',
    'customer type': 'client.entity_type',
    'tax year type': 'client.tax_year_type',
    'fiscal year end': 'client.fiscal_year_end',
    fye: 'client.fiscal_year_end',
    'primary contact': 'client.primary_contact_name',
    'primary contact name': 'client.primary_contact_name',
    email: 'client.email',
    'email address': 'client.email',
    note: 'client.notes',
    notes: 'client.notes',
  },
  file_in_time: {
    client: 'client.name',
    name: 'client.name',
    'company name': 'client.name',
    state: 'client.state',
    states: 'client.filing_states',
    jurisdictions: 'client.filing_states',
    'tax year type': 'client.tax_year_type',
    'fiscal year end': 'client.fiscal_year_end',
    fye: 'client.fiscal_year_end',
  },
  cch_axcess: {
    'client id': 'client.external_client_id',
    'client sub-id': 'client.external_client_id',
    'client guid': 'IGNORE',
    'name line 1': 'client.name',
    'name line 2': 'IGNORE',
    'sort name': 'client.name',
    'federal id': 'client.ein',
    'client type': 'client.tax_types',
    fye: 'client.fiscal_year_end',
    'address 1': 'client.address_line_1',
    city: 'client.city',
    state: 'client.state',
    zip: 'client.postal_code',
    zipcode: 'client.postal_code',
    phone: 'client.primary_phone',
    email: 'client.email',
    office: 'client.notes',
    'responsible staff': 'client.assignee_name',
  },
  cch_prosystem_fx: {
    'client id': 'client.external_client_id',
    'client sub-id': 'client.external_client_id',
    'name line 1': 'client.name',
    'name line 2': 'IGNORE',
    'sort name': 'client.name',
    'federal id': 'client.ein',
    'client type': 'client.tax_types',
    fye: 'client.fiscal_year_end',
    'address 1': 'client.address_line_1',
    city: 'client.city',
    state: 'client.state',
    zip: 'client.postal_code',
    phone: 'client.primary_phone',
    email: 'client.email',
    partner: 'client.assignee_name',
    manager: 'client.assignee_name',
    preparer: 'client.assignee_name',
  },
  lacerte: {
    'client number': 'client.external_client_id',
    'taxpayer first name': 'client.primary_contact_name',
    'taxpayer last name': 'client.primary_contact_name',
    'client name': 'client.name',
    'return type': 'client.tax_types',
    'ssn/ein': 'client.ein',
    'street address': 'client.address_line_1',
    city: 'client.city',
    state: 'client.state',
    zip: 'client.postal_code',
    'taxpayer phone': 'client.primary_phone',
    'taxpayer e-mail address': 'client.email',
    'taxpayer email address': 'client.email',
    preparer: 'client.assignee_name',
  },
  proseries: {
    'first name': 'client.primary_contact_name',
    'last name': 'client.primary_contact_name',
    'client name': 'client.name',
    'client status': 'client.source_status',
    'return type': 'client.tax_types',
    'ssn/ein': 'client.ein',
    'client street and apt address': 'client.address_line_1',
    'client city': 'client.city',
    'client state': 'client.state',
    'client zip': 'client.postal_code',
    'home phone': 'client.primary_phone',
    'mobile phone': 'client.primary_phone',
    email: 'client.email',
    preparer: 'client.assignee_name',
  },
  ultratax_cs: {
    'client id': 'client.external_client_id',
    'client name': 'client.name',
    entity: 'client.tax_types',
    'ssn/ein': 'client.ein',
    preparer: 'client.assignee_name',
    'street address': 'client.address_line_1',
    city: 'client.city',
    state: 'client.state',
    zip: 'client.postal_code',
    phone: 'client.primary_phone',
    email: 'client.email',
    status: 'client.source_status',
  },
  proconnect_tax: {
    'taxpayer name': 'client.name',
    'taxpayer email address': 'client.email',
    'taxpayer phone number': 'client.primary_phone',
    'business name': 'client.name',
    'email address': 'client.email',
    'phone number': 'client.primary_phone',
    'street address': 'client.address_line_1',
    city: 'client.city',
    state: 'client.state',
    'zip code': 'client.postal_code',
    'return type': 'client.tax_types',
    'tax year': 'IGNORE',
    refund: 'IGNORE',
    'taxes owed': 'client.estimated_tax_liability',
    'signing officer': 'client.primary_contact_name',
    preparer: 'client.assignee_name',
  },
} satisfies Record<PresetId, Record<string, MappingTarget>>

/**
 * Build mapping rows for a given preset against the actual headers we saw.
 * Headers without a known mapping fall to IGNORE so the user has to confirm
 * before Continue is enabled (UX §5.4).
 */
export function buildPresetMappings(
  preset: PresetId,
  headers: readonly string[],
  batchId: string,
): MappingRow[] {
  const dict: Record<string, MappingTarget> = PRESET_MAPPINGS[preset]
  const now = new Date().toISOString()

  return headers.map((header) => {
    const target = dict[normalizePresetHeader(header)] ?? ('IGNORE' as MappingTarget)
    const isHit = target !== 'IGNORE'
    return {
      id: crypto.randomUUID(),
      batchId,
      sourceHeader: header,
      targetField: target,
      confidence: isHit ? PRESET_FALLBACK_CONFIDENCE : null,
      reasoning: isHit ? `${preset} preset default mapping` : 'No preset rule matched',
      userOverridden: false,
      model: null,
      promptVersion: PRESET_VERSION,
      createdAt: now,
    }
  })
}

export const HEURISTIC_VERSION = 'heuristic@v1'
// Below LOW_MAPPING_CONFIDENCE (0.8) so every name-matched column surfaces as
// "needs review" in Step 2 — these are header-name guesses, not AI judgments.
export const HEURISTIC_CONFIDENCE = 0.7

/**
 * Generic, source-agnostic header dictionary used when the AI Mapper is
 * unavailable AND the user did NOT pick a preset. It recognises the common,
 * unambiguous column names that recur across every tax/practice tool so a
 * plain CSV still maps something instead of dead-ending at all-IGNORE.
 *
 * Curated (not auto-merged from PRESET_MAPPINGS) so genuinely ambiguous
 * headers — e.g. "return type" (entity vs tax type), "contact name" (client
 * vs primary contact), "email address" (client vs primary-contact email) —
 * stay out and fall to IGNORE for the user to resolve. Keep entries here only
 * when the target is the same across the tools that use the header.
 */
const GENERIC_HEADER_MAPPINGS: Record<string, MappingTarget> = {
  // Name
  'client name': 'client.name',
  name: 'client.name',
  'company name': 'client.name',
  'organization name': 'client.name',
  'legal name': 'client.name',
  'business name': 'client.name',
  'display name': 'client.name',
  'account name': 'client.name',
  'sort name': 'client.name',
  'taxpayer name': 'client.name',
  customer: 'client.name',
  'customer name': 'client.name',
  // Tax IDs
  ein: 'client.ein',
  fein: 'client.ein',
  'tax id': 'client.ein',
  'tax id number': 'client.ein',
  'federal id': 'client.ein',
  'federal ein': 'client.ein',
  'ssn/ein': 'client.ein',
  // External / source client id
  'client id': 'client.external_client_id',
  'client number': 'client.external_client_id',
  'client sub-id': 'client.external_client_id',
  // Location
  state: 'client.state',
  'billing state': 'client.state',
  county: 'client.county',
  city: 'client.city',
  'client city': 'client.city',
  zip: 'client.postal_code',
  zipcode: 'client.postal_code',
  'zip code': 'client.postal_code',
  'postal code': 'client.postal_code',
  'client zip': 'client.postal_code',
  'street address': 'client.address_line_1',
  'address 1': 'client.address_line_1',
  'address line 1': 'client.address_line_1',
  // Filing jurisdictions
  states: 'client.filing_states',
  jurisdictions: 'client.filing_states',
  'filing states': 'client.filing_states',
  'filing jurisdictions': 'client.filing_states',
  // Classification
  'entity type': 'client.entity_type',
  'tax return type': 'client.tax_types',
  'tax year type': 'client.tax_year_type',
  'fiscal year end': 'client.fiscal_year_end',
  fye: 'client.fiscal_year_end',
  // Contact
  email: 'client.email',
  'email address': 'client.email',
  'e-mail address': 'client.email',
  'primary contact': 'client.primary_contact_name',
  'primary contact name': 'client.primary_contact_name',
  'primary contact email': 'client.primary_contact_email',
  phone: 'client.primary_phone',
  'phone number': 'client.primary_phone',
  // Workflow
  preparer: 'client.assignee_name',
  status: 'client.source_status',
  'client status': 'client.source_status',
  notes: 'client.notes',
  note: 'client.notes',
}

/**
 * Deterministic name-matcher fallback. Maps each header through the generic
 * dictionary; unrecognised headers fall to IGNORE. Returns rows tagged at
 * HEURISTIC_CONFIDENCE so the UI flags them for review.
 */
export function buildHeuristicMappings(headers: readonly string[], batchId: string): MappingRow[] {
  const now = new Date().toISOString()
  return headers.map((header) => {
    const target =
      GENERIC_HEADER_MAPPINGS[normalizePresetHeader(header)] ?? ('IGNORE' as MappingTarget)
    const isHit = target !== 'IGNORE'
    return {
      id: crypto.randomUUID(),
      batchId,
      sourceHeader: header,
      targetField: target,
      confidence: isHit ? HEURISTIC_CONFIDENCE : null,
      reasoning: isHit
        ? 'Matched by column name (AI unavailable, no preset selected) — please review.'
        : 'No name match — please map manually.',
      userOverridden: false,
      model: null,
      promptVersion: HEURISTIC_VERSION,
      createdAt: now,
    }
  })
}

/**
 * "All IGNORE" fallback when AI is unavailable, no preset is picked, AND the
 * name-matcher recognised nothing. Forces the user to override at least one
 * column manually before Continue.
 */
export function buildAllIgnoreMappings(headers: readonly string[], batchId: string): MappingRow[] {
  const now = new Date().toISOString()
  return headers.map((header) => ({
    id: crypto.randomUUID(),
    batchId,
    sourceHeader: header,
    targetField: 'IGNORE' as MappingTarget,
    confidence: null,
    reasoning: 'No AI mapping available and no preset selected — please map manually.',
    userOverridden: false,
    model: null,
    promptVersion: PRESET_VERSION,
    createdAt: now,
  }))
}

function normalizePresetHeader(header: string): string {
  return header.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function isPresetId(value: string | null | undefined): value is PresetId {
  return (
    value === 'taxdome' ||
    value === 'drake' ||
    value === 'karbon' ||
    value === 'quickbooks' ||
    value === 'file_in_time' ||
    value === 'cch_axcess' ||
    value === 'cch_prosystem_fx' ||
    value === 'lacerte' ||
    value === 'proseries' ||
    value === 'ultratax_cs' ||
    value === 'proconnect_tax'
  )
}
