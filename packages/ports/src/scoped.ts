import type { AiRepo } from './ai'
import type { AiInsightsRepo } from './ai-insights'
import type { CalendarRepo } from './calendar'
import type { AuditRepo } from './audit'
import type { ClientFilingProfilesRepo } from './client-filing-profiles'
import type { ClientsRepo } from './clients'
import type { DashboardRepo } from './dashboard'
import type { EvidenceRepo } from './evidence'
import type { MigrationRepo } from './migration'
import type { MutationLockRepo } from './mutation-lock'
import type { NotificationsRepo } from './notifications'
import type { ObligationsRepo } from './obligations'
import type { OpportunityDismissalsRepo } from './opportunities'
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
  readonly dashboard: DashboardRepo
  readonly obligations: ObligationsRepo
  readonly obligationQueue: ObligationQueueRepo
  // 2026-05-24 (critique P2): user-driven dismiss/snooze on
  // computed opportunities. Optional because legacy procedure paths
  // and some tests skip this — handlers default to "no dismissals"
  // when the repo isn't wired.
  readonly opportunityDismissals?: OpportunityDismissalsRepo
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
