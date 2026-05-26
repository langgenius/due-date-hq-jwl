# Seventy-sixth pass — landed the 3 deferred items from 75th

**Date:** 2026-05-26
**Branch:** `design/filed-strip-dedup`
**Scope:** Wired the 3 follow-ups flagged in the 75th pass (P0-3
Generate draft, P1-4 WATCH tooltip, P2-2 client-impact count).
No more "deferred for later" — every critique item now landed.

## P0-3 — "Generate draft" button when AI draft isn't ready

Before this pass: opening a candidate rule whose AI concrete draft
hadn't been generated yet showed only "AI concrete draft is not
ready" in tertiary text + a disabled Accept button. The user could
**Skip → revisit → still no draft → Skip again** across a 456-rule
queue — an infinite loop.

`rule-detail-drawer.tsx` `CandidateReviewForm`:

```tsx
const draftMutation = useMutation(
  orpc.rules.draftConcreteRule.mutationOptions({
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: orpc.rules.listConcreteDrafts.key(),
      })
      toast.success(t`Draft generated`)
    },
    onError: (error) => {
      toast.error(t`Couldn't generate draft`, {
        description: rpcErrorMessage(error) ?? t`Try again, or skip this rule for now.`,
      })
    },
  }),
)
function requestDraft() {
  if (!sourceDefined || reviewSourceId.length === 0 || draftMutation.isPending) return
  draftMutation.mutate({ ruleId: rule.id, sourceId: reviewSourceId })
}
```

Passed `onGenerateDraft={requestDraft}` to `AiDraftReviewPanel`.
Inside the panel, the empty-state row now renders the message AND
an outline "Generate draft" button (SparklesIcon · `size="xs"`)
side-by-side. `generating` toggles the label to "Generating…" and
disables the button while in-flight.

The mutation invalidates `listConcreteDrafts` on success so the
next render picks up the freshly-generated draft from cache. The
parent already subscribes to that query for the Accept-flow, so
no extra wiring needed.

The outline button intentionally stays quieter than the primary
"Accept rule" CTA — this is the "make Accept possible"
pre-action, not the main decision.

## P1-4 — WATCH tag tooltip

The four authority-role chips (BASIS / CROSS-CHECK / WATCH /
EARLY WARN) on each evidence card were opaque to first-time
reviewers. "WATCH" especially — is that "watch out" (warning),
"watching" (monitoring), or something else?

`rules-console-model.ts` — added a description map:

```ts
export const RULE_AUTHORITY_ROLE_DESCRIPTION: Record<RuleEvidenceAuthorityRole, string> = {
  basis: 'Primary source — the authority this rule is based on.',
  cross_check: 'Supporting source that confirms the primary basis.',
  watch: 'Monitoring source — the rule cites this in case the authority changes its position.',
  early_warning: 'Advance signal that the rule may need to change soon.',
}
```

`rule-detail-drawer.tsx` `AuthorityRoleBadge`:

```diff
- <Chip variant="outline" tone="neutral">
+ <Chip
+   variant="outline"
+   tone="neutral"
+   title={RULE_AUTHORITY_ROLE_DESCRIPTION[role]}
+   className="cursor-help"
+ >
```

Native `title` attribute = zero JS overhead, browser-handled
delayed hover, screen-reader accessible. `cursor-help` signals
the affordance. Not a custom tooltip primitive because there's
nothing rich about the content — it's a four-word definition.

Kept "WATCH" as the label rather than renaming to "MONITOR" —
the chip is short for column real estate, and the tooltip now
carries the burden of explaining what "watch" means in this
context.

## P2-2 — Affected client count on Practice Review explainer

Before: the Practice Review section showed "Accepting will
activate this rule for client filings in {jurisdiction} for
{entity types}." The decision weight was identical whether
acceptance generated 0 deadlines or 47 — the user had no signal
about magnitude.

`rule-detail-drawer.tsx` `CandidateReviewForm`:

```tsx
const impactQuery = useQuery({
  ...orpc.rules.previewRuleImpact.queryOptions({
    input: { ruleId: rule.id, expectedVersion: rule.version },
  }),
  staleTime: 60_000,
})
const estimatedObligations = impactQuery.data?.estimatedObligationCount ?? null
```

Then below the explainer copy:

```tsx
{
  estimatedObligations !== null && estimatedObligations > 0 ? (
    <p className="text-xs text-text-tertiary">
      <Plural
        value={estimatedObligations}
        one="Generates ~# deadline across your current clients."
        other="Generates ~# deadlines across your current clients."
      />
    </p>
  ) : null
}
```

`<Plural>` for grammar correctness. The `~` prefix communicates
that this is an estimate (the actual count depends on per-client
applicability evaluation). Errors silently fall back to the
generic copy — if the preview can't load, we still render the
existing jurisdiction + entity text. `staleTime: 60_000` so
the count doesn't refetch on every navigation between rules in
the queue.

Field comes from `RuleBulkImpactPreviewSchema.estimatedObligationCount`
(reused — the existing schema already carries this for the bulk
preview).

## Bug found + fixed mid-pass

Compaction recovery turned up a hallucinated field name: I
initially passed `{ ruleId, version }` to `previewRuleImpact`,
but the actual `RuleVersionSelectionSchema` field is
`expectedVersion`. TS error caught it:

```
Type '{ ruleId; version }' is not assignable to
'{ ruleId; expectedVersion }'.
```

Fixed in this same pass — the dev log entry above already shows
the corrected `expectedVersion` form.

## Also removed: unused `useLingui` import call

When wiring P0-3 I added `const { t } = useLingui()` to
`AiDraftReviewPanel` planning to use runtime `t` strings, then
switched to `<Trans>` macros which don't need `t`. Cleaned up
the dead `useLingui()` call. The module-level import stays —
other functions in the file use it.

## Verification

- `pnpm check` — 0 errors, 9 pre-existing warnings (unchanged).
  All 9 warnings predate this pass:
  - 4 underscore-prefixed orphans in `obligations.tsx` (penalty
    breakdown / deadline tip — Risk tab removal residue)
  - 1 in `PulseDetailDrawer.tsx`
  - 1 in `packages/db/src/repo/migration.ts`
  - 1 in `obligations.tsx:4456` (statusDropdownOptions stash)
  - 2 unsafe-type-assertion warnings on obligations status labels

## Result

All three deferred items from the 75th-pass critique are now
landed. The Review Pending Rules modal has:

- A path forward when AI draft isn't ready (P0-3)
- Tooltips on the cryptic authority-role chips (P1-4)
- Magnitude signal on the Practice Review explainer (P2-2)

The 75th pass landed 5 of 7 critique items with two follow-ups
flagged for "real work to wire" — this pass closes them. Modal
should now score notably higher on the heuristic re-critique,
particularly on Heuristic 9 (Error Recovery — there's now a
recovery path from the dead-end empty state) and Heuristic 6
(Recognition Rather Than Recall — the WATCH tooltip + impact
count remove guesswork).
