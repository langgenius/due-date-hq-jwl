import type { AiRepo } from './ai'
import type { AiInsightsRepo } from './ai-insights'
import type { CalendarRepo } from './calendar'
import type { AuditRepo } from './audit'
import type { ClientFilingProfilesRepo } from './client-filing-profiles'
import type { ClientsRepo } from './clients'
import type { ClientTaxYearProfilesRepo } from './client-tax-year-profile'
import type { DashboardRepo } from './dashboard'
import type { EvidenceRepo } from './evidence'
import type { MigrationRepo } from './migration'
import type { MutationLockRepo } from './mutation-lock'
import type { NotificationsRepo } from './notifications'
import type { ObligationsRepo } from './obligations'
import type { PulseRepo } from './pulse'
import type { ReadinessRepo } from './readiness'
import type { RemindersRepo } from './reminders'
import type { RuleConcreteDraftRepo } from './rule-concrete-drafts'
import type { RulesRepo } from './rules'
import type { ObligationQueueRepo } from './obligation-queue'
import type { WorkloadRepo } from './workload'

export interface ScopedRepo {
  readonly firmId: string
  readonly ai: AiRepo
  readonly aiInsights: AiInsightsRepo
  readonly calendar: CalendarRepo
  readonly filingProfiles: ClientFilingProfilesRepo
  readonly clients: ClientsRepo
  readonly clientTaxYearProfiles: ClientTaxYearProfilesRepo
  readonly dashboard: DashboardRepo
  readonly obligations: ObligationsRepo
  readonly obligationQueue: ObligationQueueRepo
  readonly workload: WorkloadRepo
  readonly pulse: PulseRepo
  readonly readiness: ReadinessRepo
  readonly ruleConcreteDrafts?: RuleConcreteDraftRepo
  readonly rules: RulesRepo
  // Optional for the same reason as the other non-firm-scoped repos above:
  // some legacy/test scoped doubles skip it. Mutating Pulse handlers fall back
  // to DB constraints when it isn't wired (see withPulseMutationLock).
  readonly mutationLock?: MutationLockRepo
  readonly migration: MigrationRepo
  readonly notifications?: NotificationsRepo
  readonly reminders?: RemindersRepo
  readonly evidence: EvidenceRepo
  readonly audit: AuditRepo
}
