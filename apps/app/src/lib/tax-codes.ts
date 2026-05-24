// Centralized human-readable display + describe layer for the raw tax
// codes that flow through every CPA-facing surface (`federal_1120s`,
// `ca_568`, etc.). The canonical codes live in
// `packages/core/src/default-matrix/index.ts` and are extended by rule
// definitions; this file is the single source of truth for how those
// codes render to users.
//
// Per the 2026-05-19 design decision: no surface should expose raw
// snake_case codes. Show the human label inline; expose the raw code
// only inside a tooltip for traceability.

type TaxCodeMeta = {
  label: string
  jurisdiction: TaxJurisdiction
  description: string
}

type TaxJurisdiction =
  | 'Federal'
  | 'California'
  | 'New York'
  | 'Texas'
  | 'Florida'
  | 'Washington'
  | 'Illinois'
  | 'Multi-state'
  | 'Unknown'

const TAX_CODES: Record<string, TaxCodeMeta> = {
  // Federal
  federal_1040: {
    label: 'Form 1040',
    jurisdiction: 'Federal',
    description: 'Individual income tax return',
  },
  federal_1040_sch_c: {
    label: 'Form 1040 Sch C',
    jurisdiction: 'Federal',
    description: 'Sole proprietorship profit or loss',
  },
  federal_1040_estimated_tax: {
    label: 'Form 1040-ES',
    jurisdiction: 'Federal',
    description: 'Individual estimated tax',
  },
  federal_1040_extension: {
    label: 'Form 4868',
    jurisdiction: 'Federal',
    description: 'Individual return extension',
  },
  federal_1041: {
    label: 'Form 1041',
    jurisdiction: 'Federal',
    description: 'Trusts and estates income tax return',
  },
  federal_1065: { label: 'Form 1065', jurisdiction: 'Federal', description: 'Partnership return' },
  federal_1065_or_1040: {
    label: 'Form 1065 or 1040',
    jurisdiction: 'Federal',
    description: 'Partnership return or sole-prop, depending on entity',
  },
  federal_1120: {
    label: 'Form 1120',
    jurisdiction: 'Federal',
    description: 'C-corporation income tax return',
  },
  federal_1120_estimated_tax: {
    label: 'Form 1120-W',
    jurisdiction: 'Federal',
    description: 'Corporate estimated tax',
  },
  federal_1120s: {
    label: 'Form 1120-S',
    jurisdiction: 'Federal',
    description: 'S-corporation income tax return',
  },
  federal_4868: {
    label: 'Form 4868',
    jurisdiction: 'Federal',
    description: 'Individual return extension',
  },
  federal_7004: {
    label: 'Form 7004',
    jurisdiction: 'Federal',
    description: 'Business return extension',
  },
  federal_8868: {
    label: 'Form 8868',
    jurisdiction: 'Federal',
    description: 'Exempt organization return extension',
  },
  federal_941: {
    label: 'Form 941',
    jurisdiction: 'Federal',
    description: 'Employer quarterly payroll tax',
  },
  federal_payroll_deposit_monthly: {
    label: 'Payroll Tax Deposit',
    jurisdiction: 'Federal',
    description: 'Monthly payroll deposit schedule',
  },
  federal_990: {
    label: 'Form 990',
    jurisdiction: 'Federal',
    description: 'Exempt organization return',
  },
  federal_1099: { label: 'Form 1099', jurisdiction: 'Federal', description: 'Information return' },
  federal_1099_nec: {
    label: 'Form 1099-NEC',
    jurisdiction: 'Federal',
    description: 'Nonemployee compensation information return',
  },
  federal_fbar: {
    label: 'FBAR',
    jurisdiction: 'Federal',
    description: 'Foreign bank account report',
  },

  // California
  ca_100: {
    label: 'CA Form 100',
    jurisdiction: 'California',
    description: 'C-corporation franchise tax return',
  },
  ca_100_franchise: {
    label: 'CA Form 100',
    jurisdiction: 'California',
    description: 'C-corporation franchise tax return',
  },
  ca_100s: {
    label: 'CA Form 100S',
    jurisdiction: 'California',
    description: 'S-corporation franchise tax return',
  },
  ca_100s_franchise: {
    label: 'CA Form 100S',
    jurisdiction: 'California',
    description: 'S-corporation franchise tax return',
  },
  ca_540: {
    label: 'CA Form 540',
    jurisdiction: 'California',
    description: 'Resident individual income tax',
  },
  ca_541: {
    label: 'CA Form 541',
    jurisdiction: 'California',
    description: 'Trusts and estates income tax',
  },
  ca_565: { label: 'CA Form 565', jurisdiction: 'California', description: 'Partnership return' },
  ca_565_partnership: {
    label: 'CA Form 565',
    jurisdiction: 'California',
    description: 'Partnership return',
  },
  ca_568: { label: 'CA Form 568', jurisdiction: 'California', description: 'LLC return of income' },
  ca_llc_568: {
    label: 'CA Form 568',
    jurisdiction: 'California',
    description: 'LLC return of income',
  },
  ca_llc_annual_tax: {
    label: 'CA LLC Tax',
    jurisdiction: 'California',
    description: 'LLC $800 annual tax',
  },
  ca_llc_estimated_fee: {
    label: 'CA LLC Fee',
    jurisdiction: 'California',
    description: 'LLC estimated fee on gross receipts',
  },
  ca_llc_franchise_min_800: {
    label: 'CA LLC Tax',
    jurisdiction: 'California',
    description: 'LLC $800 annual tax',
  },
  ca_llc_fee_gross_receipts: {
    label: 'CA LLC Fee',
    jurisdiction: 'California',
    description: 'LLC estimated fee on gross receipts',
  },
  ca_ptet: {
    label: 'CA PTET',
    jurisdiction: 'California',
    description: 'Pass-through entity elective tax',
  },
  ca_ptet_optional: {
    label: 'CA PTET',
    jurisdiction: 'California',
    description: 'Optional pass-through entity elective tax',
  },

  // New York
  ny_ct3: {
    label: 'NY CT-3',
    jurisdiction: 'New York',
    description: 'C-corporation franchise tax return',
  },
  ny_ct3s: {
    label: 'NY CT-3S',
    jurisdiction: 'New York',
    description: 'S-corporation franchise tax return',
  },
  ny_it201: {
    label: 'NY IT-201',
    jurisdiction: 'New York',
    description: 'Resident individual income tax',
  },
  ny_it204: { label: 'NY IT-204', jurisdiction: 'New York', description: 'Partnership return' },
  ny_it204ll: { label: 'NY IT-204-LL', jurisdiction: 'New York', description: 'LLC filing fee' },
  ny_it205: {
    label: 'NY IT-205',
    jurisdiction: 'New York',
    description: 'Trusts and estates income tax',
  },
  ny_llc_filing_fee: {
    label: 'NY LLC Filing Fee',
    jurisdiction: 'New York',
    description: 'LLC annual filing fee',
  },
  ny_ptet: { label: 'NY PTET', jurisdiction: 'New York', description: 'Pass-through entity tax' },
  ny_ptet_election: {
    label: 'NY PTET election',
    jurisdiction: 'New York',
    description: 'Pass-through entity tax election',
  },
  ny_ptet_estimated_tax: {
    label: 'NY PTET estimated tax',
    jurisdiction: 'New York',
    description: 'Pass-through entity estimated tax',
  },
  ny_ptet_optional: {
    label: 'NY PTET',
    jurisdiction: 'New York',
    description: 'Optional pass-through entity tax',
  },

  // Texas
  tx_franchise_tax: {
    label: 'TX Franchise Tax',
    jurisdiction: 'Texas',
    description: 'Texas franchise tax',
  },
  tx_franchise_report: {
    label: 'TX Franchise Report',
    jurisdiction: 'Texas',
    description: 'Texas franchise report',
  },
  tx_franchise_extension: {
    label: 'TX Franchise Extension',
    jurisdiction: 'Texas',
    description: 'Texas franchise report extension',
  },

  // Florida
  fl_corp_income: {
    label: 'FL Corporate Income',
    jurisdiction: 'Florida',
    description: 'Florida corporate income tax',
  },

  // Washington
  wa_b_o: {
    label: 'WA B&O',
    jurisdiction: 'Washington',
    description: 'Washington business and occupation tax',
  },
  wa_combined_excise_quarterly: {
    label: 'WA Combined Excise',
    jurisdiction: 'Washington',
    description: 'Quarterly combined excise tax return',
  },

  // Illinois
  il_il1040: {
    label: 'IL IL-1040',
    jurisdiction: 'Illinois',
    description: 'Illinois individual income tax',
  },
  il_il1120: {
    label: 'IL IL-1120',
    jurisdiction: 'Illinois',
    description: 'Illinois corporate income tax',
  },
}

const JURISDICTION_PREFIX: Record<string, TaxJurisdiction> = {
  federal: 'Federal',
  fed: 'Federal',
  ca: 'California',
  ny: 'New York',
  tx: 'Texas',
  fl: 'Florida',
  wa: 'Washington',
  il: 'Illinois',
}

function inferJurisdiction(code: string): TaxJurisdiction {
  const prefix = code.split('_')[0]?.toLowerCase() ?? ''
  return JURISDICTION_PREFIX[prefix] ?? 'Unknown'
}

function prettifyCode(code: string): string {
  return code
    .split('_')
    .map((segment) => {
      const upper = segment.toUpperCase()
      if (segment.length === 2 || /^\d/.test(segment)) return upper
      return segment.charAt(0).toUpperCase() + segment.slice(1)
    })
    .join(' ')
}

/**
 * Human-readable label for a tax code. Falls back to a prettified
 * version of the snake_case if the code isn't in the table — never
 * shows a bare `federal_1120s` string.
 */
function formatTaxCode(code: string | null | undefined): string {
  if (!code) return ''
  return TAX_CODES[code]?.label ?? prettifyCode(code)
}

/**
 * Full meta about a tax code for tooltips and detail surfaces. Returns
 * a placeholder shape rather than `null` so callers can render without
 * a branch.
 */
function describeTaxCode(code: string | null | undefined): TaxCodeMeta & { code: string } {
  if (!code) {
    return { code: '', label: '', jurisdiction: 'Unknown', description: '' }
  }
  const meta = TAX_CODES[code]
  if (meta) return { ...meta, code }
  return {
    code,
    label: prettifyCode(code),
    jurisdiction: inferJurisdiction(code),
    description: '',
  }
}

export { formatTaxCode, describeTaxCode }
export type { TaxCodeMeta, TaxJurisdiction }
