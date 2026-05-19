// Human-readable labels for the raw tax-type codes used in the
// obligations table. The canonical codes live in
// `packages/core/src/default-matrix/index.ts` (and are extended by
// rule definitions). When a new code lands without a label here, the
// fallback gracefully returns a prettified version of the code so the
// UI never shows the bare snake_case string.
//
// Per the 2026-05-19 design call, dashboard surfaces should never
// expose `federal_1065`-style codes to end users.

const TAX_TYPE_LABELS: Record<string, string> = {
  // Federal
  federal_1040: 'Form 1040',
  federal_1040_sch_c: 'Form 1040 Sch C',
  federal_1040_estimated_tax: 'Form 1040-ES',
  federal_1041: 'Form 1041',
  federal_1065: 'Form 1065',
  federal_1065_or_1040: 'Form 1065 / 1040',
  federal_1120: 'Form 1120',
  federal_1120_estimated_tax: 'Form 1120-W',
  federal_1120s: 'Form 1120-S',
  federal_990: 'Form 990',

  // California
  ca_100_franchise: 'CA Form 100',
  ca_100s_franchise: 'CA Form 100S',
  ca_540: 'CA Form 540',
  ca_541: 'CA Form 541',
  ca_565_partnership: 'CA Form 565',
  ca_568: 'CA Form 568',
  ca_llc_franchise_min_800: 'CA LLC Tax',
  ca_llc_fee_gross_receipts: 'CA LLC Fee',
  ca_ptet_optional: 'CA PTET',

  // New York
  ny_ct3: 'NY CT-3',
  ny_ct3s: 'NY CT-3S',
  ny_it201: 'NY IT-201',
  ny_it204: 'NY IT-204',
  ny_it205: 'NY IT-205',
  ny_llc_filing_fee: 'NY LLC Filing Fee',
  ny_ptet_optional: 'NY PTET',

  // Texas
  tx_franchise_report: 'TX Franchise Report',
  tx_franchise_extension: 'TX Franchise Extension',

  // Florida
  fl_corp_income: 'FL Corporate Income',

  // Washington
  wa_b_o: 'WA B&O',

  // Illinois
  il_il1040: 'IL IL-1040',
  il_il1120: 'IL IL-1120',
}

function prettifyCode(code: string): string {
  // Last-resort transform for codes not in the table.
  return code
    .split('_')
    .map((segment) => {
      const upper = segment.toUpperCase()
      // Preserve state codes (2 letters) and common form numbers like
      // 1065, 540, etc.
      if (segment.length === 2 || /^\d/.test(segment)) return upper
      return segment.charAt(0).toUpperCase() + segment.slice(1)
    })
    .join(' ')
}

function formatTaxType(code: string): string {
  return TAX_TYPE_LABELS[code] ?? prettifyCode(code)
}

export { formatTaxType }
