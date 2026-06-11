# UX copy batch 15 — marketing site (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md §2.14.

Factual care + jargon on apps/marketing/src/i18n/en.ts:

- Unqualified SLA "Every state filing notice and IRS update reaches Today + email within 24 hours" → "Monitored state filing notices and IRS updates reach Today and email within a day…" (scoped to monitored sources; "apply-to-12-clients button" → "one-click apply across affected clients", since 12 was a demo artifact).
- "generates the year's calendar in 30 minutes" → "in a typical 30-minute session — no per-client setup wizards" (typical, not promised).
- Engineering vocabulary off the sales page: "server-pre-aggregated… before the page even paints" → "loads instantly"; "Smart Priority is a pure-function sort — no LLM in the Today hot path" → "ranks by days remaining, evidence completeness, and alert status — no AI in the triage path".
- "Anything below 0.80 is non-blocking" (bare decimal) → plain-English confidence framing.
- Soft fear-mongering "The result is foreseeable and expensive: missed deadlines, compounded penalties…" → states the workflow problem instead.
- Tier-naming wobble unified: "practice workspace" / "production practice" / "1 practice workspace" → **practice** everywhere ("1 active practice"); "Per-firm" isolation pill → "Per-practice isolation" with a plain-English body.

en.ts parse-verified. Note: the zh-CN marketing mirror still carries the old strings — flagged for the zh parity pass.
