// Back-compat shim. The canonical implementation now lives in
// `@/lib/tax-codes` as `formatTaxCode`. New code should import from
// there directly and prefer `<TaxCodeLabel>` / `<TaxCodeBadge>` for
// visible chips. Kept this file so existing imports don't break.

import { formatTaxCode } from '@/lib/tax-codes'

const formatTaxType = formatTaxCode

export { formatTaxType }
