import type { Db } from './client'
import { makeAiInsightsRepo } from './repo/ai-insights'
import { makeAiRepo } from './repo/ai'
import { makeAuditRepo } from './repo/audit'
import { makeCalendarRepo } from './repo/calendar'
import { makeClientFilingProfilesRepo } from './repo/client-filing-profiles'
import { makeClientsRepo } from './repo/clients'
import { makeClientTaxYearProfilesRepo } from './repo/client-tax-year-profiles'
import { makeDashboardRepo } from './repo/dashboard'
import { makeEvidenceRepo } from './repo/evidence'
import { makeMigrationRepo } from './repo/migration'
import { makeMutationLockRepo } from './repo/mutation-lock'
import { makeNotificationsRepo } from './repo/notifications'
import { makeObligationsRepo } from './repo/obligations'
import { makePulseRepo } from './repo/pulse'
import { makeReadinessRepo } from './repo/readiness'
import { makeRuleConcreteDraftRepo } from './repo/rule-concrete-drafts'
import { makeRemindersRepo } from './repo/reminders'
import { makeRulesRepo } from './repo/rules'
import { makeObligationQueueRepo } from './repo/obligation-queue'
import { makeWorkloadRepo } from './repo/workload'
import type { ScopedRepo } from './types'

/**
 * Scoped repository factory — THE ONLY entry point procedures may use to reach D1.
 *
 * HARD CONSTRAINTS (docs/dev-file/06 §4 · docs/dev-file/02 §7):
 *   - Every repo method internally enforces `WHERE firm_id = :firmId`.
 *   - `firmId` is injected by middleware (from the better-auth session's `activeOrganizationId`);
 *     procedures must never take `firmId` from user input.
 *   - oxlint blocks direct `@duedatehq/db` imports and subpath imports from procedures.
 *
 * Phase 0 will instantiate concrete repos; Phase 1 adds Overlay-aware reads.
 */

/**
 * Placeholder that throws if any method on an unimplemented repo is called.
 * Concrete repos will be wired up per-domain in Phase 0 (see `./repo/*`).
 */
export function scoped(db: Db, firmId: string): ScopedRepo {
  return {
    firmId,
    ai: makeAiRepo(db, firmId),
    aiInsights: makeAiInsightsRepo(db, firmId),
    calendar: makeCalendarRepo(db, firmId),
    filingProfiles: makeClientFilingProfilesRepo(db, firmId),
    clients: makeClientsRepo(db, firmId),
    clientTaxYearProfiles: makeClientTaxYearProfilesRepo(db, firmId),
    dashboard: makeDashboardRepo(db, firmId),
    obligations: makeObligationsRepo(db, firmId),
    obligationQueue: makeObligationQueueRepo(db, firmId),
    workload: makeWorkloadRepo(db, firmId),
    pulse: makePulseRepo(db, firmId),
    readiness: makeReadinessRepo(db, firmId),
    ruleConcreteDrafts: makeRuleConcreteDraftRepo(db),
    rules: makeRulesRepo(db, firmId),
    mutationLock: makeMutationLockRepo(db),
    migration: makeMigrationRepo(db, firmId),
    notifications: makeNotificationsRepo(db, firmId),
    reminders: makeRemindersRepo(db, firmId),
    evidence: makeEvidenceRepo(db, firmId),
    audit: makeAuditRepo(db, firmId),
  }
}
