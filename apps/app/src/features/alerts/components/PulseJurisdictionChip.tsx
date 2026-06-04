import { Badge } from '@duedatehq/ui/components/ui/badge'

// Small jurisdiction-code chip ("CA" / "NY" / "FED") used in the
// Pulse alert card's top meta cluster. Per Pencil node xxNFC the
// state code sits as a bordered pill next to the form chip; both
// chips share the same canonical Badge primitive (variant=outline,
// shape=square) so any future restyle propagates to both.
//
// The chip carries the jurisdiction code verbatim — caller already
// has the value off the alert (`alert.jurisdiction`). Uppercase is
// the canonical jurisdiction-code rendering across the product;
// kept as a className override here rather than baked into Badge
// because most Badge callers DON'T want uppercase.
function PulseJurisdictionChip({ jurisdiction }: { jurisdiction: string }) {
  return (
    <Badge variant="outline" shape="square" className="uppercase tracking-wide">
      {jurisdiction}
    </Badge>
  )
}

export { PulseJurisdictionChip }
