# State×tax programmatic matrix — spec locked, data collection gated

**Date:** 2026-07-31 · marketing SEO/GEO planning

`docs/marketing/state-form-matrix-spec-2026-07-31.md` locks the schema
(`STATE_TAX_ROWS` as a superset of `STATE_DEADLINES`, per-row source +
`verifiedOn`), the five-surface auto-propagation contract, the batch order
(franchise/annual-report → sales → withholding), and the two-pass verification
pipeline. Deliberately ships NO routes and NO data: every cell requires a new
first-party-verified fact from the state agency, and pages without verified
data must not exist — that discipline is the moat vs scaled-content abuse.
B1 (~40 cells) is the next unit of work, suited to a dedicated
verification-pipeline session.
