# Deadline detail — fold Extension into the Status tab (2026-06-10)

Yuqi (c): the decideExtension flow (Form 7004/4868) was unreachable on the
standalone page — page mode's locked 4-tab bar (Status·Materials·Record·Audit)
has no Extension tab, so the legacy `<TabsContent value="extension">` never shows.

Folded the apply-extension action into the **Status tab** (page mode) as a
`DetailSectionCard` "Extension", placed after Penalty exposure:

- Rule summary line (form name + "defers filing, not payment").
- Apply form reusing the EXISTING `extensionDraft` state + `saveExtensionDecision`
  mutation (extended filing deadline when no duration rule, internal target date,
  source, decision memo) — same validation (`extensionManualDeadlineInvalid`,
  `internalTargetDateInvalid`, `saveExtensionPlanDisabled`).
- PaymentStillDueCallout when a payment is due; "Last decided" stamp + File/Reset.
- Shows only when a rule allows an extension OR one is already on file
  (`extensionPolicy?.available || row.extensionDecidedAt`). No fiction.

Panel/sheet mode (/clients) keeps the legacy Extension tab unchanged.

KNOWN FOLLOW-UP: the legacy Extension tab still contains the fictional
"Extension history" table (panels lines ~3791-3920, hardcoded sample rows) —
flagged for removal per the no-fiction rule (out of scope for this page-mode fold).

`tsgo --noEmit` clean (drawer).
