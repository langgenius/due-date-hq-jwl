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
    listSubscriptions: firmsHandlers.listSubscriptions,
    billingCheckoutConfig: firmsHandlers.billingCheckoutConfig,
    softDeleteCurrent: firmsHandlers.softDeleteCurrent,
  },
  clients: {
    create: clientsHandlers.create,
    createBatch: clientsHandlers.createBatch,
    get: clientsHandlers.get,
    usage: clientsHandlers.usage,
    seedSample: clientsHandlers.seedSample,
    removeSample: clientsHandlers.removeSample,
    listByFirm: clientsHandlers.listByFirm,
    updateJurisdiction: clientsHandlers.updateJurisdiction,
    replaceFilingProfiles: clientsHandlers.replaceFilingProfiles,
    updateTaxYearProfile: clientsHandlers.updateTaxYearProfile,
    updatePenaltyInputs: clientsHandlers.updatePenaltyInputs,
    updateRiskProfile: clientsHandlers.updateRiskProfile,
    updateSourceDetails: clientsHandlers.updateSourceDetails,
    previewClassificationRecompute: clientsHandlers.previewClassificationRecompute,
    applyClassificationRecompute: clientsHandlers.applyClassificationRecompute,
    updateNotes: clientsHandlers.updateNotes,
    rename: clientsHandlers.rename,
    getRiskSummary: clientsHandlers.getRiskSummary,
    requestRiskSummaryRefresh: clientsHandlers.requestRiskSummaryRefresh,
    bulkUpdateAssignee: clientsHandlers.bulkUpdateAssignee,
    delete: clientsHandlers.delete,
  },
  obligations: {
    list: obligationQueueHandlers.list,
    getDetail: obligationQueueHandlers.getDetail,
    setPinned: obligationQueueHandlers.setPinned,
    facets: obligationQueueHandlers.facets,
    listSavedViews: obligationQueueHandlers.listSavedViews,
    createSavedView: obligationQueueHandlers.createSavedView,
    updateSavedView: obligationQueueHandlers.updateSavedView,
    deleteSavedView: obligationQueueHandlers.deleteSavedView,
    exportSelected: obligationQueueHandlers.exportSelected,
    createBatch: obligationsHandlers.createBatch,
    createFromRule: obligationsHandlers.createFromRule,
    createFromRules: obligationsHandlers.createFromRules,
    previewAnnualRollover: obligationsHandlers.previewAnnualRollover,
    createAnnualRollover: obligationsHandlers.createAnnualRollover,
    confirmObligations: obligationsHandlers.confirmObligations,
    previewReprojection: obligationsHandlers.previewReprojection,
    applyReprojection: obligationsHandlers.applyReprojection,
    listProjectedDeadlines: obligationsHandlers.listProjectedDeadlines,
    updateDueDate: obligationsHandlers.updateDueDate,
    rebindRule: obligationsHandlers.rebindRule,
    updateTaxYearProfile: obligationsHandlers.updateTaxYearProfile,
    updateStatus: obligationsHandlers.updateStatus,
    markFiledRejected: obligationsHandlers.markFiledRejected,
    assign: obligationsHandlers.assign,
    snooze: obligationsHandlers.snooze,
    updateBlockedBy: obligationsHandlers.updateBlockedBy,
    updatePrepStage: obligationsHandlers.updatePrepStage,
    updateReviewStage: obligationsHandlers.updateReviewStage,
    bulkUpdateStatus: obligationsHandlers.bulkUpdateStatus,
    decideExtension: obligationsHandlers.decideExtension,
    bulkDecideExtension: obligationsHandlers.bulkDecideExtension,
    bulkExtensionDecisionPreview: obligationsHandlers.bulkExtensionDecisionPreview,
    updateEfileState: obligationsHandlers.updateEfileState,
    remindSignature: obligationsHandlers.remindSignature,
    signatureReminderPreview: obligationsHandlers.signatureReminderPreview,
    bulkRemindSignature: obligationsHandlers.bulkRemindSignature,
    bulkSignatureReminderPreview: obligationsHandlers.bulkSignatureReminderPreview,
    backfillSignatureLoop: obligationsHandlers.backfillSignatureLoop,
    requestInput: obligationsHandlers.requestInput,
    listByClient: obligationsHandlers.listByClient,
    getDeadlineTip: obligationsHandlers.getDeadlineTip,
    requestDeadlineTipRefresh: obligationsHandlers.requestDeadlineTipRefresh,
  },
  dashboard: {
    load: dashboardHandlers.load,
    welcomeRecap: dashboardHandlers.welcomeRecap,
    recordDashboardVisit: dashboardHandlers.recordDashboardVisit,
  },
  evidence: {
    listByObligation: evidenceHandlers.listByObligation,
  },
  workload: {
    load: workloadHandlers.load,
  },
  pulse: {
    // Key order mirrors pulseContract (see contracts/src/pulse.ts) — the
    // procedure-router parity test deep-equals Object.keys(router.pulse)
    // against Object.keys(pulseContract), so listAlertsForRule stays first.
    listAlertsForRule: pulseHandlers.listAlertsForRule,
    listAlerts: pulseHandlers.listAlerts,
    activeCount: pulseHandlers.activeCount,
    listHistory: pulseHandlers.listHistory,
    listSourceHealth: pulseHandlers.listSourceHealth,
    listAlertSourceCoverage: pulseHandlers.listAlertSourceCoverage,
    retrySourceHealth: pulseHandlers.retrySourceHealth,
    getDetail: pulseHandlers.getDetail,
    getDetailsBatch: pulseHandlers.getDetailsBatch,
    listPriorityQueue: pulseHandlers.listPriorityQueue,
    reviewPriorityMatches: pulseHandlers.reviewPriorityMatches,
    reviewDueDateOverlayDetails: pulseHandlers.reviewDueDateOverlayDetails,
    applyReviewed: pulseHandlers.applyReviewed,
    apply: pulseHandlers.apply,
    dismiss: pulseHandlers.dismiss,
    bulkDismiss: pulseHandlers.bulkDismiss,
    markReviewed: pulseHandlers.markReviewed,
    revert: pulseHandlers.revert,
    reactivate: pulseHandlers.reactivate,
    requestReview: pulseHandlers.requestReview,
    // Team notes (Pencil Aogxu §7) — order mirrors pulseContract.
    listAlertNotes: pulseHandlers.listAlertNotes,
    addAlertNote: pulseHandlers.addAlertNote,
    catchUpStillOpenWindows: pulseHandlers.catchUpStillOpenWindows,
    // 2026-06-05 (pre-CI green-up): `morningSweepSummary` was defined
    // on pulseContract + implemented in the handlers module but never
    // registered here, so the router-vs-contract parity check failed.
    // Trailing position mirrors the contract order in
    // packages/contracts/src/pulse.ts.
    morningSweepSummary: pulseHandlers.morningSweepSummary,
  },
  migration: {
    createBatch: migrationHandlers.createBatch,
    uploadRaw: migrationHandlers.uploadRaw,
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
    getResumableImport: migrationHandlers.getResumableImport,
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
    previewRequestEmail: readinessHandlers.previewRequestEmail,
    sendRequest: readinessHandlers.sendRequest,
    revokeRequest: readinessHandlers.revokeRequest,
    addChecklistItem: readinessHandlers.addChecklistItem,
    updateChecklistItem: readinessHandlers.updateChecklistItem,
    deleteChecklistItem: readinessHandlers.deleteChecklistItem,
    listByObligation: readinessHandlers.listByObligation,
  },
  reminders: {
    listTemplates: remindersHandlers.listTemplates,
    updateTemplate: remindersHandlers.updateTemplate,
    listRecentSends: remindersHandlers.listRecentSends,
  },
  rules: {
    listSources: rulesHandlers.listSources,
    listRules: rulesHandlers.listRules,
    listTemporaryRules: rulesHandlers.listTemporaryRules,
    listCatalogRelease: rulesHandlers.listCatalogRelease,
    listReviewTasks: rulesHandlers.listReviewTasks,
    listReviewDecisions: rulesHandlers.listReviewDecisions,
    acceptTemplate: rulesHandlers.acceptTemplate,
    bulkAcceptTemplates: rulesHandlers.bulkAcceptTemplates,
    diffAgainstPredecessor: rulesHandlers.diffAgainstPredecessor,
    bulkAcceptCarryforward: rulesHandlers.bulkAcceptCarryforward,
    activateOnboardingJurisdictions: rulesHandlers.activateOnboardingJurisdictions,
    deactivateJurisdiction: rulesHandlers.deactivateJurisdiction,
    rejectTemplate: rulesHandlers.rejectTemplate,
    createCustomRule: rulesHandlers.createCustomRule,
    updatePracticeRule: rulesHandlers.updatePracticeRule,
    archivePracticeRule: rulesHandlers.archivePracticeRule,
    previewRuleImpact: rulesHandlers.previewRuleImpact,
    previewBulkRuleImpact: rulesHandlers.previewBulkRuleImpact,
    draftConcreteRule: rulesHandlers.draftConcreteRule,
    listConcreteDrafts: rulesHandlers.listConcreteDrafts,
    verifyCandidate: rulesHandlers.verifyCandidate,
    bulkVerifyCandidates: rulesHandlers.bulkVerifyCandidates,
    rejectCandidate: rulesHandlers.rejectCandidate,
    coverage: rulesHandlers.coverage,
    previewObligations: rulesHandlers.previewObligations,
    listRuleNotes: rulesHandlers.listRuleNotes,
    addRuleNote: rulesHandlers.addRuleNote,
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
