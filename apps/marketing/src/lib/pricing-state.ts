// Plans aren't finalized yet, so /pricing shows a "coming soon" state instead of
// priced tiers. This single flag is the source of truth — imported by the Pricing
// component (gates the tier cards, comparison matrix, and FAQ) AND by the page
// wrappers (gates the priced Offers + FAQ in the JSON-LD, so the structured data
// always matches the visible page). Flip to `false` to bring the tiers back.
export const PRICING_COMING_SOON = true
