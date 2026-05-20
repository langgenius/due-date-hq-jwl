import { auditHandlers } from './audit'
import { calendarHandlers } from './calendar'
import { clientsHandlers } from './clients'
import { dashboardHandlers } from './dashboard'
import { evidenceHandlers } from './evidence'
import { firmsHandlers } from './firms'
import { migrationHandlers } from './migration'
import { membersHandlers } from './members'
import { notificationsHandlers } from './notifications'
import { obligationQueueHandlers } from './obligation-queue'
import { obligationsHandlers } from './obligations'
import { opportunitiesHandlers } from './opportunities'
import { pulseHandlers } from './pulse'
import { readinessHandlers } from './readiness'
import { remindersHandlers } from './reminders'
import { rulesHandlers } from './rules'
import { securityHandlers } from './security'
import { workloadHandlers } from './workload'
import { os } from './_root'

/**
 * Root oRPC router.
 *
 * Each domain has its own folder under `procedures/`. Per-domain `*Handlers`
 * objects fan out into the contract router shape here.
 *
 * Constraint (docs/dev-file/08 §4.1):
 *   - procedures may NOT import @duedatehq/db / its subpaths.
 *   - they receive the scoped repo via `context.vars.scoped` (tenant
 *     middleware injects it before this handler runs).
 */

export const router = os.router({
  audit: {
    list: auditHandlers.list,
    requestEvidencePackage: auditHandlers.requestEvidencePackage,
    getEvidencePackage: auditHandlers.getEvidencePackage,
    listEvidencePackages: auditHandlers.listEvidencePackages,
    createDownloadUrl: auditHandlers.createDownloadUrl,
  },
  calendar: {
    listSubscriptions: calendarHandlers.listSubscriptions,
    upsertSubscription: calendarHandlers.upsertSubscription,
    regenerateSubscription: calendarHandlers.regenerateSubscription,
    disableSubscription: calendarHandlers.disableSubscription,
  },
  firms: {
    listMine: firmsHandlers.listMine,
    getCurrent: firmsHandlers.getCurrent,
    create: firmsHandlers.create,
    switchActive: firmsHandlers.switchActive,
    updateCurrent: firmsHandlers.updateCurrent,
    previewSmartPriorityProfile: firmsHandlers.previewSmartPriorityProfile,
    backfillPenaltyExposure: firmsHandlers.backfillPenaltyExposure,
    listSubscriptions: firmsHandlers.listSubscriptions,
    billingCheckoutConfig: firmsHandlers.billingCheckoutConfig,
    softDeleteCurrent: firmsHandlers.softDeleteCurrent,
  },
  clients: {
    create: clientsHandlers.create,
    createBatch: clientsHandlers.createBatch,
    get: clientsHandlers.get,
    listByFirm: clientsHandlers.listByFirm,
    updateJurisdiction: clientsHandlers.updateJurisdiction,
    replaceFilingProfiles: clientsHandlers.replaceFilingProfiles,
    updateTaxYearProfile: clientsHandlers.updateTaxYearProfile,
    updatePenaltyInputs: clientsHandlers.updatePenaltyInputs,
    updateRiskProfile: clientsHandlers.updateRiskProfile,
    getRiskSummary: clientsHandlers.getRiskSummary,
    requestRiskSummaryRefresh: clientsHandlers.requestRiskSummaryRefresh,
    bulkUpdateAssignee: clientsHandlers.bulkUpdateAssignee,
    delete: clientsHandlers.delete,
  },
  obligations: {
    list: obligationQueueHandlers.list,
    getDetail: obligationQueueHandlers.getDetail,
    facets: obligationQueueHandlers.facets,
    listSavedViews: obligationQueueHandlers.listSavedViews,
    createSavedView: obligationQueueHandlers.createSavedView,
    updateSavedView: obligationQueueHandlers.updateSavedView,
    deleteSavedView: obligationQueueHandlers.deleteSavedView,
    exportSelected: obligationQueueHandlers.exportSelected,
    createBatch: obligationsHandlers.createBatch,
    previewAnnualRollover: obligationsHandlers.previewAnnualRollover,
    createAnnualRollover: obligationsHandlers.createAnnualRollover,
    updateDueDate: obligationsHandlers.updateDueDate,
    updateTaxYearProfile: obligationsHandlers.updateTaxYearProfile,
    updateStatus: obligationsHandlers.updateStatus,
    bulkUpdateStatus: obligationsHandlers.bulkUpdateStatus,
    decideExtension: obligationsHandlers.decideExtension,
    listByClient: obligationsHandlers.listByClient,
    getDeadlineTip: obligationsHandlers.getDeadlineTip,
    requestDeadlineTipRefresh: obligationsHandlers.requestDeadlineTipRefresh,
  },
  opportunities: {
    list: opportunitiesHandlers.list,
  },
  dashboard: {
    load: dashboardHandlers.load,
    requestBriefRefresh: dashboardHandlers.requestBriefRefresh,
  },
  evidence: {
    listByObligation: evidenceHandlers.listByObligation,
  },
  workload: {
    load: workloadHandlers.load,
  },
  pulse: {
    listAlerts: pulseHandlers.listAlerts,
    listHistory: pulseHandlers.listHistory,
    listSourceHealth: pulseHandlers.listSourceHealth,
    listSourceSignals: pulseHandlers.listSourceSignals,
    retrySourceHealth: pulseHandlers.retrySourceHealth,
    getDetail: pulseHandlers.getDetail,
    listPriorityQueue: pulseHandlers.listPriorityQueue,
    reviewPriorityMatches: pulseHandlers.reviewPriorityMatches,
    applyReviewed: pulseHandlers.applyReviewed,
    apply: pulseHandlers.apply,
    dismiss: pulseHandlers.dismiss,
    snooze: pulseHandlers.snooze,
    revert: pulseHandlers.revert,
    reactivate: pulseHandlers.reactivate,
    requestReview: pulseHandlers.requestReview,
  },
  migration: {
    createBatch: migrationHandlers.createBatch,
    uploadRaw: migrationHandlers.uploadRaw,
    stageExternalRows: migrationHandlers.stageExternalRows,
    cloneStagingRows: migrationHandlers.cloneStagingRows,
    listStagingRows: migrationHandlers.listStagingRows,
    runMapper: migrationHandlers.runMapper,
    confirmMapping: migrationHandlers.confirmMapping,
    runNormalizer: migrationHandlers.runNormalizer,
    confirmNormalization: migrationHandlers.confirmNormalization,
    applyDefaultMatrix: migrationHandlers.applyDefaultMatrix,
    dryRun: migrationHandlers.dryRun,
    apply: migrationHandlers.apply,
    discardDraft: migrationHandlers.discardDraft,
    revert: migrationHandlers.revert,
    singleUndo: migrationHandlers.singleUndo,
    getBatch: migrationHandlers.getBatch,
    listErrors: migrationHandlers.listErrors,
    listBatches: migrationHandlers.listBatches,
    listBatchClients: migrationHandlers.listBatchClients,
  },
  members: {
    listCurrent: membersHandlers.listCurrent,
    listAssignable: membersHandlers.listAssignable,
    invite: membersHandlers.invite,
    cancelInvitation: membersHandlers.cancelInvitation,
    resendInvitation: membersHandlers.resendInvitation,
    updateRole: membersHandlers.updateRole,
    suspend: membersHandlers.suspend,
    reactivate: membersHandlers.reactivate,
    remove: membersHandlers.remove,
  },
  notifications: {
    list: notificationsHandlers.list,
    unreadCount: notificationsHandlers.unreadCount,
    markRead: notificationsHandlers.markRead,
    markAllRead: notificationsHandlers.markAllRead,
    getPreferences: notificationsHandlers.getPreferences,
    updatePreferences: notificationsHandlers.updatePreferences,
    listMorningDigestRuns: notificationsHandlers.listMorningDigestRuns,
    previewMorningDigest: notificationsHandlers.previewMorningDigest,
  },
  readiness: {
    generateChecklist: readinessHandlers.generateChecklist,
    sendRequest: readinessHandlers.sendRequest,
    revokeRequest: readinessHandlers.revokeRequest,
    listByObligation: readinessHandlers.listByObligation,
  },
  reminders: {
    overview: remindersHandlers.overview,
    listTemplates: remindersHandlers.listTemplates,
    updateTemplate: remindersHandlers.updateTemplate,
    listUpcoming: remindersHandlers.listUpcoming,
    listRecentSends: remindersHandlers.listRecentSends,
    listSuppressions: remindersHandlers.listSuppressions,
  },
  rules: {
    listSources: rulesHandlers.listSources,
    listRules: rulesHandlers.listRules,
    listTemporaryRules: rulesHandlers.listTemporaryRules,
    listReviewTasks: rulesHandlers.listReviewTasks,
    listReviewDecisions: rulesHandlers.listReviewDecisions,
    acceptTemplate: rulesHandlers.acceptTemplate,
    bulkAcceptTemplates: rulesHandlers.bulkAcceptTemplates,
    rejectTemplate: rulesHandlers.rejectTemplate,
    createCustomRule: rulesHandlers.createCustomRule,
    updatePracticeRule: rulesHandlers.updatePracticeRule,
    archivePracticeRule: rulesHandlers.archivePracticeRule,
    previewRuleImpact: rulesHandlers.previewRuleImpact,
    previewBulkRuleImpact: rulesHandlers.previewBulkRuleImpact,
    draftConcreteRule: rulesHandlers.draftConcreteRule,
    verifyCandidate: rulesHandlers.verifyCandidate,
    rejectCandidate: rulesHandlers.rejectCandidate,
    coverage: rulesHandlers.coverage,
    previewObligations: rulesHandlers.previewObligations,
  },
  security: {
    status: securityHandlers.status,
    enableTwoFactor: securityHandlers.enableTwoFactor,
    verifyTwoFactor: securityHandlers.verifyTwoFactor,
    disableTwoFactor: securityHandlers.disableTwoFactor,
    revokeSession: securityHandlers.revokeSession,
    revokeOtherSessions: securityHandlers.revokeOtherSessions,
  },
})
