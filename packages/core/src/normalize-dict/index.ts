/**
 * Local fallback dictionary for the Migration Copilot Step 3 Normalize
 * stage. Used when the AI Normalizer is unavailable (gateway not configured,
 * gateway error, schema fail) so the wizard can still finish.
 *
 * Authority:
 *   - docs/product-design/migration-copilot/02-ux-4step-wizard.md §6.2 / §6.5
 *   - docs/product-design/migration-copilot/04-ai-prompts.md §3 (entity / state)
 *
 * Coverage scope (Demo Sprint):
 *   - 8 entity types (the Default Matrix keys)
 *   - 50 US state codes + DC + a handful of common long-form / nickname inputs
 *
 * NOT a replacement for the AI Normalizer — confidence is fixed at 0.85 and
 * decisions get persisted with `userOverridden=false / model=null /
 * promptVersion='dictionary@v1'` so they show up in the Evidence drawer
 * with a neutral "verification needed" pill.
 */

export type EntityNormalized =
  | 'llc'
  | 's_corp'
  | 'partnership'
  | 'c_corp'
  | 'sole_prop'
  | 'trust'
  | 'individual'
  | 'other'

export const DICT_VERSION = 'dictionary@v1'
export const DICT_CONFIDENCE = 0.85
export const TAX_TYPE_DICT_VERSION = 'dictionary-tax-types@v1'
export const TAX_TYPE_DICT_CONFIDENCE = 0.85

const ENTITY_DICT: Record<string, EntityNormalized> = {
  llc: 'llc',
  'l.l.c.': 'llc',
  'limited liability company': 'llc',
  'limited liability co': 'llc',
  pllc: 'llc',
  'l.l.c': 'llc',

  's-corp': 's_corp',
  's-corporation': 's_corp',
  's corp': 's_corp',
  s_corp: 's_corp',
  s_corporation: 's_corp',
  's corporation': 's_corp',
  'corp (s)': 's_corp',
  'corp(s)': 's_corp',
  scorp: 's_corp',
  '1120s': 's_corp',
  '1120-s': 's_corp',
  '1120 s': 's_corp',

  'c-corp': 'c_corp',
  'c-corporation': 'c_corp',
  'c corp': 'c_corp',
  c_corp: 'c_corp',
  c_corporation: 'c_corp',
  'c corporation': 'c_corp',
  corporation: 'c_corp',
  inc: 'c_corp',
  'inc.': 'c_corp',
  '1120': 'c_corp',

  partnership: 'partnership',
  ptnr: 'partnership',
  partners: 'partnership',
  'gen ptnr': 'partnership',
  llp: 'partnership',
  lp: 'partnership',
  '1065': 'partnership',

  'sole proprietor': 'sole_prop',
  'sole proprietorship': 'sole_prop',
  'sole prop': 'sole_prop',
  'sole-prop': 'sole_prop',
  sole_prop: 'sole_prop',
  soleprop: 'sole_prop',
  schc: 'sole_prop',
  'sched c': 'sole_prop',
  'sched. c': 'sole_prop',
  'schedule c': 'sole_prop',
  'schedule c filer': 'sole_prop',

  trust: 'trust',
  'living trust': 'trust',
  'rev trust': 'trust',
  'revocable trust': 'trust',
  estate: 'trust',
  '1041': 'trust',

  individual: 'individual',
  'sole individual': 'individual',
  '1040': 'individual',
  personal: 'individual',
}

const STATE_LONG: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  calif: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  'washington dc': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
}

const STATE_CODES = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'DC',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
])

function canon(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export interface DictionaryHit<T> {
  normalized: T
  confidence: number
  promptVersion: typeof DICT_VERSION | typeof TAX_TYPE_DICT_VERSION
}

/** Return null when no dictionary entry matches; the service then writes a `needs_review` row. */
export function normalizeEntityType(raw: string): DictionaryHit<EntityNormalized> | null {
  const key = canon(raw)
  if (!key) return null
  const hit = ENTITY_DICT[key]
  if (!hit) return null
  return { normalized: hit, confidence: DICT_CONFIDENCE, promptVersion: DICT_VERSION }
}

/** State normalizer accepts 2-letter codes and a slim long-name dictionary. */
export function normalizeState(raw: string): DictionaryHit<string> | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const upper = trimmed.toUpperCase()
  if (STATE_CODES.has(upper)) {
    return { normalized: upper, confidence: 1.0, promptVersion: DICT_VERSION }
  }
  const alphaOnly = trimmed.replace(/[^a-z]/gi, '').toUpperCase()
  if (alphaOnly.length === 2 && STATE_CODES.has(alphaOnly)) {
    return { normalized: alphaOnly, confidence: DICT_CONFIDENCE, promptVersion: DICT_VERSION }
  }
  const longHit = STATE_LONG[canon(trimmed)]
  if (longHit) {
    return { normalized: longHit, confidence: DICT_CONFIDENCE, promptVersion: DICT_VERSION }
  }
  return null
}

export function normalizeTaxTypes(raw: string): DictionaryHit<string[]> | null {
  const value = raw
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
  if (!value) return null

  const out: string[] = []
  if (/\b1120[\s-]?s\b/.test(value) || value.includes('ct-3-s')) out.push('federal_1120s')
  else if (/\b1120\b/.test(value)) out.push('federal_1120')
  if (/\b1040\b/.test(value)) out.push('federal_1040')
  if (/\b1041\b/.test(value)) out.push('federal_1041')
  if (/\b1065\b/.test(value)) out.push('federal_1065')
  if (/\b990\b/.test(value)) out.push('federal_990')

  if (value.includes('ca llc') || value.includes('llc fee')) {
    out.push('ca_llc_franchise_min_800', 'ca_llc_fee_gross_receipts')
  }
  if (value.includes('ca franchise') || value.includes('ca 100')) {
    if (value.includes('100s')) out.push('ca_100s_franchise')
    else out.push('ca_100_franchise')
  }
  if (value.includes('ny ct-3-s') || value.includes('ct-3-s')) out.push('ny_ct3s')
  else if (value.includes('ny ct-3') || value.includes('ct-3')) out.push('ny_ct3')
  if (value.includes('it-204') || value.includes('it204')) out.push('ny_it204')

  const normalized = Array.from(new Set(out))
  return normalized.length > 0
    ? {
        normalized,
        confidence: TAX_TYPE_DICT_CONFIDENCE,
        promptVersion: TAX_TYPE_DICT_VERSION,
      }
    : null
}
