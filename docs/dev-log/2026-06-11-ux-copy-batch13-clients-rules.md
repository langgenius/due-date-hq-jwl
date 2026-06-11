# UX copy batch 13 — clients & rules remainder (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md §2.5 + §2.6.

Clients: "next due {date}" capitalized; needs-facts label "Needs filing state" → "Missing filing state" (aligns with the "Add filing state" action); CreateClientDialog "Client importance" → "Importance" (matches the facts panel).

Rules: review-state vocabulary locked to **"Awaiting review"** across the library group header, table column header, coverage tab, year diff, and states rail (alerts keep "Needs review" for the per-client AI flag — a different state). "Holiday rollover: source-adjusted" → "Holidays: uses the source's published calendar"; "Never re-reviewed" tooltip → "Created — not yet reviewed"; StatBand "Feeds monitored" → "Sources monitored" (S6 source-not-feed) with symmetric sub "{a} active · {p} paused"; "audit ledger" → "audit log"; "must be exactly one year" drops "exactly"; temporary chip "Due-date extension" → "Extension".

Already-resolved in source (no change needed): the bare "4 min" stat (has an "average import" label), "Nd late" in the clients directory (already verbose `<Plural>`), and the "Couldn't apply rule" dialog (already shows error.message + error.code).

Tests: clients + rules suites 80 passing. rules.library.test's 10 failures pre-date this batch (in-flight WIP needs a listReviewTasks mock).
