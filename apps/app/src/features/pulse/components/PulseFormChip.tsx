import { Badge } from '@duedatehq/ui/components/ui/badge'

// Mono-font form-code chip ("IRS 1120-S" / "Form 941" / "K-1") used
// in the Pulse alert card's top meta cluster. Per Pencil node xxNFC
// the form code reads in JetBrains Mono so it pops as a code
// identifier separate from prose; we accomplish the same effect via
// `font-mono` on the Badge primitive — the underlying chrome
// (radius, padding, border, hover) still ships from Badge.
//
// Optional — callers should pass the first matched form from the
// alert detail's `forms` array. When the detail is loading or the
// alert affects no specific form (e.g. `applicability_scope` /
// `source_status` changes), callers omit this primitive entirely.
function PulseFormChip({ form }: { form: string }) {
  return (
    <Badge variant="outline" shape="square" className="font-mono tracking-tight">
      {form}
    </Badge>
  )
}

export { PulseFormChip }
