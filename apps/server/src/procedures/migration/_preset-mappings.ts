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
 * not High. Prompt version is `preset@v1` so audit / evidence drawer can
 * distinguish fallback rows from genuine AI rows at a glance.
 */

export const PRESET_VERSION = 'preset@v1'
export const PRESET_FALLBACK_CONFIDENCE = 0.85

export type PresetId = 'taxdome' | 'drake' | 'karbon' | 'quickbooks' | 'file_in_time'

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

/**
 * "All IGNORE" fallback when AI is unavailable AND no preset is picked.
 * Forces the user to override at least one column manually before Continue.
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
    value === 'file_in_time'
  )
}
