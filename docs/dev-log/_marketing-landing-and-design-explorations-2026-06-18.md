# Marketing: landing copy, positioning, and 9 reference design explorations

**Date:** 2026-06-18 · Docs/marketing only (no app/server/package code touched).

## What landed

A full marketing content + design exploration set under `docs/marketing/`, plus the product-marketing context at `.claude/product-marketing-context.md`.

**Copy & positioning**
- `landing-page-copy.md` — canonical, finalized landing + waitlist copy (lean 7-section page). Locked hero "Catch every tax-deadline change — and see exactly who it affects."; eyebrow "Never miss a deadline change · FED + 50 states + DC"; promise strip "Every deadline. Every change. Every client. Handled." Villain beat, Watch/Match/Apply, glass-box trust, what's-inside, FAQ, busy-season close, footer.
- `landing-page-structure.md` — lean section architecture + rationale.
- `landing-page-content.md` — long-form deck (superseded; kept for rationale + Deferred copy).
- `unique-selling-points.md` — code-grounded USP brief + competitor matrix. Positioning = the active monitor→match→apply loop.
- `landing-interactive-demo.md` — spec + dataset for the "try it" interactive module.
- `video-ideas.md` — 12 launch video concepts + a recommended slate.

**Design explorations (9 reference styles)**
- `design-systems/*.md` (9) — detailed "brand skill" design-system docs, one per reference (legora is the exemplar + carries §0 global build rules). References: legora, frontify, aave, acctual, pally, mews, autosend, visitors, voiceflow.
- `design-explorations/*.html` (9) — full standalone landing-page mockups, one per system. All **light-only** (no dark mode/sections), copy **adapted to each brand's voice** (locked headline kept), the document-intelligence visual (official notice → extracted change + affected clients) as the signature, honesty rules intact (no "AI"/"Radar"/pricing/fabricated proof; "sources we watch" strip).

## Guardrails honored
- No fabricated social proof; no "AI"/"Radar" in visible copy; no pricing on the page (early-access framing). Source/trust claims kept literally true; scope/speed allowed marketing-bold per direction. Live monitoring scope vs. 50-state rule coverage kept distinct.

## Recommended direction
Legora (#1, editorial trust + on-brand) → with Frontify's product-UI proof grafted in. Not yet wired into `apps/marketing`.
