import * as authSchema from './schema/auth'
import * as auditSchema from './schema/audit'
import * as calendarSchema from './schema/calendar'
import * as dashboardSchema from './schema/dashboard'
import * as firmSchema from './schema/firm'
import * as notificationSchema from './schema/notifications'
import * as opportunitiesSchema from './schema/opportunities'
import * as readinessSchema from './schema/readiness'
import * as rulesSchema from './schema/rules'
import * as obligationSavedViewSchema from './schema/obligation-saved-view'
import { makeFirmsRepo } from './repo/firms'
import { makeAiRepo } from './repo/ai'
import { makeMembersRepo } from './repo/members'
import { makeMutationLockRepo } from './repo/mutation-lock'
import { makePulseOpsRepo } from './repo/pulse'
import { makeReadinessPortalRepo } from './repo/readiness'
import { makeRuleConcreteDraftRepo } from './repo/rule-concrete-drafts'
import {
  makeRemindersRepo,
  renderReminderTemplate,
  DEFAULT_REMINDER_TEMPLATES,
} from './repo/reminders'
import { makeRulesOpsRepo, makeRulesRepo } from './repo/rules'
import { makeCalendarFeedRepo, makeCalendarRepo } from './repo/calendar'

export { createDb } from './client'
export { scoped } from './scoped'
export { authSchema }
export { auditSchema }
export { calendarSchema }
export { dashboardSchema }
// firmSchema is exposed at the main entry (parallel to authSchema) so the
// auth-layer code paths that legitimately need to write firm_profile —
// the organization-create hook and the lazy-create branch in tenantMiddleware
// — can do so without direct schema subpath imports. Procedures still must go
// through `scoped()`; firm_profile is composed into the tenantContext by
// middleware, never read by procedures.
export { firmSchema }
export { notificationSchema }
export { opportunitiesSchema }
export { readinessSchema }
export { rulesSchema }
export { obligationSavedViewSchema }
export { makeFirmsRepo }
export { makeAiRepo }
export { makeCalendarRepo }
export { makeCalendarFeedRepo }
export { makeMembersRepo }
export { makeMutationLockRepo }
export { makePulseOpsRepo }
export { makeReadinessPortalRepo }
export { makeRuleConcreteDraftRepo }
export { makeRemindersRepo, renderReminderTemplate, DEFAULT_REMINDER_TEMPLATES }
export { makeRulesRepo }
export { makeRulesOpsRepo }
export type {
  Db,
  ScopedRepo,
  TenantContext,
  FirmProfile,
  NewFirmProfile,
  FirmsRepo,
  FirmMembershipRow,
  InvitationRow,
  MemberRow,
  MembersRepo,
  SeatUsage,
} from './types'
export type { ReadinessPortalRequestRow } from './repo/readiness'
