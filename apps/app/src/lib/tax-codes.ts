// Tax-code display layer moved to @duedatehq/core/tax-codes (2026-06) so the
// same human labels render on server surfaces (e.g. the signature-reminder
// email) — not just the app. Re-exported here so existing `@/lib/tax-codes`
// imports keep working unchanged.
export { formatTaxCode, describeTaxCode } from '@duedatehq/core/tax-codes'
export type { TaxCodeMeta, TaxJurisdiction } from '@duedatehq/core/tax-codes'
