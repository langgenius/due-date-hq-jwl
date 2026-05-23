# 2026-05-24 · Rule Library AI draft acceptance semantics

Rule Library AI concrete drafts now treat source grounding as generation-time work, not an
accept-time live-source gate.

- `rules.verifyCandidate` accepts the cached successful `rule_concrete_draft` identified by
  `aiOutputId` instead of trusting a full draft body from the browser.
- Accepting a draft no longer refetches or revalidates the official source text against the excerpt.
  The reviewer can read the excerpt, open the evidence link, and accept the evidence-backed draft as
  shown.
- New concrete draft runs record source provenance in citations, including source URL, optional
  Pulse source snapshot, fetch/publish timestamps, source text, and excerpt.
- Future source changes remain Pulse-owned: changed snapshots/signals create review work and new
  concrete drafts rather than invalidating an already accepted practice review decision.
