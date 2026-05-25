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

## 2026-05-25 follow-up

- Fixed `rules.verifyCandidate` acceptance when the accepted concrete draft carries an `aiOutputId`:
  generated obligation evidence rows now link only to the created obligation, preserving the evidence
  writer invariant that exactly one of `obligationInstanceId` or `aiOutputId` is set.
- The concrete draft AI output id remains in the obligation `sourceEvidenceJson` payload so source
  provenance is still available without making the `evidence_link` row point at two targets.
- Mirrored the same fix in manual `obligations.createFromRule` generation for active practice rules.
- Validation: `pnpm --filter @duedatehq/server test -- src/procedures/rules/_obligation-generation.test.ts src/procedures/obligations/index.test.ts`; `pnpm exec vp check apps/server/src/procedures/rules/_obligation-generation.ts apps/server/src/procedures/obligations/index.ts apps/server/src/procedures/rules/_obligation-generation.test.ts apps/server/src/procedures/obligations/index.test.ts docs/dev-log/2026-05-24-rule-library-ai-draft-acceptance.md`.
