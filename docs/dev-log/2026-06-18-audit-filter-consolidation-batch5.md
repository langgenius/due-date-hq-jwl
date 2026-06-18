# Audit filter consolidation (audit batch 5b)

_2026-06-18_

Second half of [batch 5](2026-06-18-search-verb-discipline-batch5.md). Hick's-law
fix on `/audit`: the toolbar showed **five** filter controls at once (Category,
Time range, Action, Actor, Entity type) + search. Consolidated the three "refine"
facets behind one `Filters` trigger, mirroring the shipped `/alerts` pattern.

## Change (`features/audit/audit-log-page.tsx`)

- The Action / Actor / Entity-type `AuditFilterSelect`s moved into a `Popover`
  opened by a `FilterTrigger` ("Filters", `SlidersHorizontalIcon`, active-count
  badge = `refineActiveCount`). A gated `Clear these filters` `TextLink` clears just
  those three.
- Toolbar now reads **Category · Time range · Filters · Clear** (grid
  `repeat(2,…)_auto_auto`), down from five peer selects.
- Category + Time range stay inline (the two highest-frequency facets); the
  standalone `Clear filters` Button still resets everything.

## Verification

- `tsgo --noEmit` 0; `vp check` clean; `@duedatehq/app#build` exit 0.
- i18n: one new string `More filters` (trigger aria-label) translated to zh-CN
  (更多筛选); `Filters` / `Clear these filters` already in catalog; `compile --strict` passes.
- **Live UX not seedable here:** `/audit` requires the backend Worker + demo-login,
  which 500s in this dev env (no local seed). The nested overlay (Base UI `Select`
  inside Base UI `Popover`) relies on Base UI's floating-tree nesting — the same
  Popover-with-interactive-content shape used by `/alerts` and `TableHeaderMultiFilter`
  — and CI's `audit-log` e2e exercises the page. **Recommend a quick live glance**:
  open Filters → pick an Action; the popover should stay open and the count update.
