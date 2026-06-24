import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { CheckIcon, ShieldAlertIcon } from 'lucide-react'

import type { ObligationRule } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'

import { orpc } from '@/lib/rpc'
import { RuleDetailCompact } from '@/features/rules/rule-detail-drawer'

function ruleNeedsReview(rule: ObligationRule): boolean {
  return rule.status === 'candidate' || rule.status === 'pending_review'
}

/**
 * "Rules to re-verify" — rendered inside an alert drawer when a source change
 * implicated verified rules that cite it (`detail.reverifyRuleIds`). Each rule
 * opens the same review modal as the Rules library; accepting it clears the
 * rule's source-drift gate. The CPA then marks the alert reviewed to close it.
 */
export function ReverifyRulesSection({
  reverifyRuleIds,
  onReverified,
}: {
  reverifyRuleIds: readonly string[]
  onReverified?: () => void | Promise<void>
}) {
  const [openRuleId, setOpenRuleId] = useState<string | null>(null)
  const rulesQuery = useQuery(
    orpc.rules.listRules.queryOptions({ input: { includeCandidates: true } }),
  )

  if (reverifyRuleIds.length === 0) return null

  // A version bump emits BOTH an active row and a pending_review row for
  // the same rule id (see listPracticeRules). Prefer the row that still
  // needs review so "Re-verify" opens the NEW version — the one whose
  // detail carries an Accept action. Once accepted, only the active row
  // remains and the rule renders as "Re-verified".
  const ruleById = new Map<string, ObligationRule>()
  for (const rule of rulesQuery.data ?? []) {
    const existing = ruleById.get(rule.id)
    if (!existing || (ruleNeedsReview(rule) && !ruleNeedsReview(existing))) {
      ruleById.set(rule.id, rule)
    }
  }
  const rules = reverifyRuleIds
    .map((id) => ruleById.get(id))
    .filter((rule): rule is ObligationRule => Boolean(rule))
  const openRule = openRuleId ? (ruleById.get(openRuleId) ?? null) : null

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-divider-subtle bg-background-default px-5 py-4">
      <div className="flex items-center gap-2">
        <ShieldAlertIcon className="size-4 text-text-secondary" aria-hidden />
        <h3 className="text-sm font-semibold">
          <Trans>Rules to re-verify</Trans>
        </h3>
      </div>
      <p className="text-sm text-text-secondary">
        <Trans>
          This official source changed. Re-verify each rule against the source, then mark this alert
          reviewed.
        </Trans>
      </p>
      <ul className="flex flex-col gap-2">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-divider-regular bg-background-default px-3 py-2"
          >
            {/* Title links to the rule's full page in the library (the
                cross-page "see this rule in context" path). Quiet variant so
                it reads as the rule name until hover — the Re-verify button
                stays the primary, in-context action. */}
            <TextLink
              size="sm"
              variant="quiet"
              className="min-w-0"
              title={rule.title}
              render={<Link to={`/rules/library?rule=${encodeURIComponent(rule.id)}`} />}
            >
              <span className="min-w-0 truncate">{rule.title}</span>
            </TextLink>
            {ruleNeedsReview(rule) ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setOpenRuleId(rule.id)}
              >
                <Trans>Re-verify</Trans>
              </Button>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-text-success">
                <CheckIcon className="size-3.5" aria-hidden />
                <Trans>Re-verified</Trans>
              </span>
            )}
          </li>
        ))}
      </ul>
      {rulesQuery.isLoading && rules.length === 0 ? (
        <p className="text-xs text-text-secondary">
          <Trans>Loading rules…</Trans>
        </p>
      ) : null}

      <Dialog
        open={openRule !== null}
        onOpenChange={(open) => {
          if (!open) setOpenRuleId(null)
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openRule?.title ?? ''}</DialogTitle>
            <DialogDescription>
              <Trans>Re-verify this rule against its official source.</Trans>
            </DialogDescription>
          </DialogHeader>
          {openRule ? (
            <RuleDetailCompact
              rule={openRule}
              onActionComplete={async () => {
                setOpenRuleId(null)
                await rulesQuery.refetch()
                await onReverified?.()
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
