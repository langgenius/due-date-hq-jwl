# Obligations E2E filter label refresh

_2026-06-18_

The Deadlines toolbar search control now renders with the accessible name
`Filter client, form, or assignee` because the shared `SearchInput` primitive
defaults its aria label to the visible placeholder. The obligations E2E page
object still targeted the previous `Search client, form, or assignee` label, so
the two browser tests that fill the queue search field timed out even though the
field was visible.

Updated the page object locator to the current accessible name. The behavior
under test is unchanged: filling the field still writes `?q=...`, filters the
real seeded obligation rows, and supports the bulk-action flow.
