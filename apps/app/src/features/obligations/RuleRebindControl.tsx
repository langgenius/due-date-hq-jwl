import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { PencilIcon } from 'lucide-react'
import { toast } from 'sonner'

import { RuleJurisdictionSchema } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@duedatehq/ui/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

/**
 * RuleRebindControl — corrects which rule a deadline cites as its authority.
 *
 * The deadline's matched rule was read-only: a wrong auto-match could only be
 * fixed by editing the rule globally (affecting every other deadline) or not
 * at all. "Change rule" sets a per-deadline ruleId override via
 * `obligations.rebindRule`; the detail then resolves the override first
 * (`matchedRule` = findRuleById(ruleId) ?? auto-match), so the chosen rule
 * shows on this deadline only.
 *
 * No "unbind": ruleId=null falls back to the auto-match heuristic (it can't
 * express "cite no rule"), so clearing wouldn't fix a bad match — only
 * overriding to the correct rule does. It's an attribution change only — no
 * due-date recompute (that's the rule's own job). Self-contained so the
 * 5,000-line detail drawer just drops it in.
 */
export function RuleRebindControl({
  obligationId,
  currentRuleId,
  jurisdiction,
}: {
  obligationId: string
  currentRuleId: string | null
  /** The obligation's jurisdiction (a free string on the row); validated
      against the rule-jurisdiction enum before it scopes the picker query. */
  jurisdiction: string
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)

  const parsedJurisdiction = RuleJurisdictionSchema.safeParse(jurisdiction)
  // Candidate rules: the firm's live rules for this jurisdiction. Fetched only
  // when the picker opens and the jurisdiction is a known rule jurisdiction.
  const rulesQuery = useQuery({
    ...orpc.rules.listRules.queryOptions({
      input: {
        ...(parsedJurisdiction.success ? { jurisdiction: parsedJurisdiction.data } : {}),
        status: 'active',
      },
    }),
    enabled: pickerOpen && parsedJurisdiction.success,
  })
  const rules = rulesQuery.data ?? []

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
  }
  const rebindMutation = useMutation(
    orpc.obligations.rebindRule.mutationOptions({
      onSuccess: () => {
        toast.success(t`Rule changed`)
        setPickerOpen(false)
        invalidate()
      },
      onError: (error) => {
        toast.error(t`Couldn't change the rule`, {
          description:
            rpcErrorMessage(error) ??
            t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  return (
    <div className="inline-flex items-center gap-1">
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          render={
            <Button type="button" variant="ghost" size="xs" disabled={rebindMutation.isPending}>
              <PencilIcon data-icon="inline-start" className="size-3.5" />
              <Trans>Change rule</Trans>
            </Button>
          }
        />
        <PopoverContent
          align="end"
          className="w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
        >
          <Command loop>
            <CommandInput autoFocus placeholder={t`Search ${jurisdiction} rules…`} />
            <CommandList className="max-h-[320px]">
              <CommandEmpty>
                {rulesQuery.isLoading ? (
                  <Trans>Loading rules…</Trans>
                ) : (
                  <Trans>No active rules in {jurisdiction} to bind to.</Trans>
                )}
              </CommandEmpty>
              {rules.length > 0 ? (
                <CommandGroup heading={t`Bind to rule`}>
                  {rules.map((rule) => (
                    <CommandItem
                      key={rule.id}
                      value={`${rule.title} ${rule.formName} ${rule.id}`}
                      onSelect={() => rebindMutation.mutate({ id: obligationId, ruleId: rule.id })}
                      aria-current={rule.id === currentRuleId ? 'true' : undefined}
                    >
                      <div className="flex w-full flex-col">
                        <span className="truncate text-sm font-medium text-text-primary">
                          {rule.title}
                        </span>
                        <span className="truncate text-xs text-text-tertiary">
                          {rule.formName} · {rule.id}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
