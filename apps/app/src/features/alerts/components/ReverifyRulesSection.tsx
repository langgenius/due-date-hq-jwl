import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { ShieldAlertIcon } from 'lucide-react'

import type { ObligationRule } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'

import { orpc } from '@/lib/rpc'
import { RuleDetailCompact } from '@/features/rules/rule-detail-drawer'

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

  const ruleById = new Map<string, ObligationRule>(
    (rulesQuery.data ?? []).map((rule) => [rule.id, rule]),
  )
  const rules = reverifyRuleIds
    .map((id) => ruleById.get(id))
    .filter((rule): rule is ObligationRule => Boolean(rule))
  const openRule = openRuleId ? (ruleById.get(openRuleId) ?? null) : null

  return (
    <section className="flex flex-col gap-3 rounded-md border border-divider-regular bg-background-subtle px-4 py-4">
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
            className="flex items-center justify-between gap-3 rounded-md border border-divider-regular bg-background-default px-3 py-2"
          >
            <span className="min-w-0 truncate text-sm">{rule.title}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOpenRuleId(rule.id)}
            >
              <Trans>Re-verify</Trans>
            </Button>
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
