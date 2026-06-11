# Client detail — move active alerts into the right rail

**Date:** 2026-06-10

Feedback (Yuqi): "move alert to the right side panel as well."

Moved `<ClientActiveAlertsSection>` from full-width below the header into the right
rail (`ClientDetailRail`), leading the rail (most urgent) above Notes + Contacts.
Passed `alertMatches` + `extensionPaymentMismatches` through the rail; the section
self-suppresses at zero alerts.

Restacked `ClientActiveAlertsCard` for the 320px rail: the tax-code chip + Review
action share a top row, then the title + source take the full rail width below —
otherwise the title crushed to one-word-per-line. All design-system tokens, no
hex (`text-text-primary` / `text-text-tertiary` / reused Badge + Button).

The main column is now header → meta strip → tabs → filing plan. tsgo clean;
verified live.

## Refinement — clamp the rail alert title

The long alert title sprawled down the narrow rail even at full width. Clamped
it to 2 lines (`line-clamp-2`) + truncated the source, so each rail alert card
stays compact; full text is one click away via Review.
