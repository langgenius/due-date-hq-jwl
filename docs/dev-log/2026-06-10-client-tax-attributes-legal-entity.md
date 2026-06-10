# Client detail — surface tax-attribute flags + legal entity

**Date:** 2026-06-10

Backend-completeness audit (Yuqi: "check if I put everything in client detail")
found `ClientPublic` fields that were never displayed:
- the 5 tax-attribute booleans (`hasPayroll`, `hasSalesTax`, `has1099Vendors`,
  `hasK1Activity`, `hasForeignAccounts`) — they **drive the deadline generator**
  (`deadline-category-suggestions.ts`) but were shown nowhere, despite the
  Compliance-posture card being subtitled "facts that drive the deadline generator".
- `legalEntity` (distinct from the tax `entityType`) — in the contract, rendered
  nowhere in the app.

Added both to `ClientCompliancePosturePanel`:
- **Tax attributes** row: 5 honest on/off chips — active = accent chip + check,
  inactive = muted — so the CPA reads the client's filing-relevant profile at a
  glance.
- **Legal entity** identity cell (clean per-value labels, e.g. single_member_llc →
  "Single-member LLC"); shown only when set (nullable secondary field, no
  "Not on file" clutter).

tsgo clean. Verified live: Meridian shows the 5 chips with `1099 vendors` active;
legal entity hidden (Meridian's is null).
