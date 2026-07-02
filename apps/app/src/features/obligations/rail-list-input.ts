// Build the deadline-detail navigator rail's `obligations.list` input from
// the live URL search string, so the rail order + filters mirror exactly
// what the /deadlines TABLE was showing when the user opened a row.
//
// This re-uses the table's own nuqs parser map
// (`obligationQueueSearchParamsParsers`) via nuqs's pure `createLoader` —
// the same parsers the table feeds into `useQueryStates` — plus the table's
// shared cleaning helpers, so the mapping stays in lock-step with
// routes/obligations.tsx's `queryInputWithoutCursor` (no hand-maintained
// drift between the two surfaces).
import { createLoader } from 'nuqs/server'

import { OBLIGATION_QUEUE_SEARCH_MAX_LENGTH, type ObligationQueueSort } from '@duedatehq/contracts'

import { obligationQueueSearchParamsParsers } from '@/features/obligations/queue/constants'
import {
  cleanEntityIdFilters,
  cleanStateFilters,
  cleanStringFilters,
  daysFilterValue,
} from '@/features/obligations/queue/helpers'
import type { ObligationQueueListInputWithoutCursor } from '@/features/obligations/queue/types'

// The table-route parsers default `sort` to `smart_priority`, but the rail's
// historical (and contractual) baseline when no `?sort=` is present is
// `due_asc` — internal due date ascending, matching the queue's opening
// order. Keep that baseline so a paramless URL behaves identically to before.
const RAIL_DEFAULT_SORT: ObligationQueueSort = 'due_asc'

const loadQueueSearch = createLoader(obligationQueueSearchParamsParsers)

/**
 * Parse a URL search string (e.g. `location.search`) into the
 * `obligations.list` input the rail should query with — sort + every
 * supported facet filter, cleaned the same way the table cleans them.
 *
 * `limit` is the caller's concern (the rail uses its own page size), so it
 * is passed in rather than baked here.
 *
 * Honors `exactOptionalPropertyTypes`: optional fields are omitted entirely
 * when empty rather than set to `undefined`.
 */
export function railListInputFromSearch(
  search: string,
  limit: number,
): ObligationQueueListInputWithoutCursor {
  const params = loadQueueSearch(search)

  const statusQuery = [...params.status]
  const searchQuery = params.q.trim().slice(0, OBLIGATION_QUEUE_SEARCH_MAX_LENGTH)
  const obligationQuery = cleanEntityIdFilters(params.obligation ? [params.obligation] : [])
  const clientQuery = cleanEntityIdFilters(params.client)
  // Rule ids are free-text catalog ids ("ny.it204.return.2025"), not UUIDs —
  // same cleaning as the table (routes/obligations.tsx ruleQuery), or the rail
  // would silently drop the filter the table is honoring.
  const ruleQuery = cleanStringFilters(params.rule)
  const stateQuery = cleanStateFilters(params.state)
  const countyQuery = cleanStringFilters(params.county)
  const taxTypeQuery = cleanStringFilters(params.taxType)
  const assigneeNameQuery = cleanStringFilters(params.assignee ? [params.assignee] : [])[0] ?? null
  const assigneeQuery = cleanStringFilters(params.assignees)
  const minDaysUntilDue = daysFilterValue(params.daysMin)
  const maxDaysUntilDue = daysFilterValue(params.daysMax)
  // The parsers default `sort` to `smart_priority`; treat the absence of an
  // explicit `?sort=` value as the rail's `due_asc` baseline.
  const hasExplicitSort = new URLSearchParams(search).has('sort')
  const sort: ObligationQueueSort = hasExplicitSort ? params.sort : RAIL_DEFAULT_SORT

  return {
    ...(statusQuery.length > 0 ? { status: statusQuery } : {}),
    ...(searchQuery ? { search: searchQuery } : {}),
    ...(obligationQuery.length > 0 ? { obligationIds: obligationQuery } : {}),
    ...(clientQuery.length > 0 ? { clientIds: clientQuery } : {}),
    ...(ruleQuery.length > 0 ? { ruleIds: ruleQuery } : {}),
    ...(stateQuery.length > 0 ? { states: stateQuery } : {}),
    ...(countyQuery.length > 0 ? { counties: countyQuery } : {}),
    ...(taxTypeQuery.length > 0 ? { taxTypes: taxTypeQuery } : {}),
    ...(assigneeNameQuery ? { assigneeName: assigneeNameQuery } : {}),
    ...(assigneeQuery.length > 0 ? { assigneeNames: assigneeQuery } : {}),
    ...(params.owner ? { owner: params.owner } : {}),
    ...(params.due ? { due: params.due } : {}),
    ...(params.dueWithin && params.dueWithin > 0 && params.dueWithin <= 30
      ? { dueWithinDays: params.dueWithin }
      : {}),
    ...(minDaysUntilDue !== undefined ? { minDaysUntilDue } : {}),
    ...(maxDaysUntilDue !== undefined ? { maxDaysUntilDue } : {}),
    ...(params.evidence === 'needs' ? { needsEvidence: true } : {}),
    ...(params.awaitingSignature ? { awaitingSignature: true } : {}),
    ...(params.projected ? { confirmed: false } : {}),
    ...(params.asOf ? { asOfDate: params.asOf } : {}),
    sort,
    limit,
  }
}
