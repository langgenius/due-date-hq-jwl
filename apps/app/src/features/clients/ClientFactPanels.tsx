import { type ReactNode, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { CircleHelpIcon, SparklesIcon } from 'lucide-react'

import type {
  AiInsightPublic,
  ClientFilingProfilesReplaceInput,
  ClientPublic,
  ClientSourceDetailsUpdateInput,
} from '@duedatehq/contracts'
import type { ClientClassificationReason } from '@duedatehq/contracts/clients'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Field, FieldError, FieldLabel } from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

import { EmptyState } from '@/components/patterns/empty-state'
import { useEntityLabels } from '@/routes/clients'

import { ClassificationImpactDialog } from './ClassificationImpactDialog'
import { CLIENT_ENTITY_TYPES, getClientFilingStates } from './client-readiness'

const STATE_CODE_RE = /^[A-Z]{2}$/

export function RiskProfileSmartPriorityHelp() {
  const { t } = useLingui()
  const helpText = t`Risk profile feeds Smart Priority. Importance and recent late filings make this client's deadlines rank higher in work queues.`

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={t`Explain Risk profile`}
            title={helpText}
            className="inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-md text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          />
        }
      >
        <CircleHelpIcon className="size-3.5" aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="right" align="start" className="max-w-xs whitespace-normal text-left">
        {helpText}
      </TooltipContent>
    </Tooltip>
  )
}

function importanceLabel(value: number): ReactNode {
  if (value === 3) return <Trans>High</Trans>
  if (value === 1) return <Trans>Low</Trans>
  return <Trans>Medium</Trans>
}

function importanceSelectValue(value: number): '1' | '2' | '3' {
  if (value === 1) return '1'
  if (value === 3) return '3'
  return '2'
}

export function ClientJurisdictionPanel({
  client,
  isSaving,
  onSave,
}: {
  client: ClientPublic
  isSaving: boolean
  onSave: (input: ClientFilingProfilesReplaceInput) => void
}) {
  const { t } = useLingui()
  const primaryProfile =
    client.filingProfiles.find((profile) => profile.isPrimary) ?? client.filingProfiles[0] ?? null
  const [statesText, setStatesText] = useState(getClientFilingStates(client).join(', '))
  const [countiesText, setCountiesText] = useState(
    (primaryProfile?.counties ?? (client.county ? [client.county] : [])).join(', '),
  )
  const normalizedStates = Array.from(
    new Set(
      statesText
        .split(/[;,|]/)
        .map((state) => state.trim().toUpperCase())
        .filter(Boolean),
    ),
  )
  const normalizedCounties = Array.from(
    new Set(
      countiesText
        .split(/[;,|]/)
        .map((county) => county.trim())
        .filter(Boolean),
    ),
  )
  const stateInvalid = normalizedStates.some((state) => !STATE_CODE_RE.test(state))
  const countyInvalid = normalizedCounties.some((county) => county.length > 120)
  const profileByState = new Map(client.filingProfiles.map((profile) => [profile.state, profile]))
  const nextProfiles = normalizedStates.map((state, index) => {
    const existing = profileByState.get(state)
    return {
      state,
      counties: index === 0 ? normalizedCounties : (existing?.counties ?? []),
      taxTypes: existing?.taxTypes ?? [],
      isPrimary: index === 0,
      source: 'manual' as const,
    }
  })
  const currentSignature = JSON.stringify(
    client.filingProfiles
      .map((profile) => ({
        state: profile.state,
        counties: profile.counties,
        taxTypes: profile.taxTypes,
        isPrimary: profile.isPrimary,
      }))
      .toSorted((a, b) => a.state.localeCompare(b.state)),
  )
  const nextSignature = JSON.stringify(
    nextProfiles
      .map((profile) => ({
        state: profile.state,
        counties: profile.counties,
        taxTypes: profile.taxTypes,
        isPrimary: profile.isPrimary,
      }))
      .toSorted((a, b) => a.state.localeCompare(b.state)),
  )
  const hasChanges = currentSignature !== nextSignature

  const cancelEdit = () => {
    setStatesText(getClientFilingStates(client).join(', '))
    setCountiesText((primaryProfile?.counties ?? (client.county ? [client.county] : [])).join(', '))
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3">
        <Field>
          <FieldLabel htmlFor="client-jurisdiction-states">
            <Trans>Filing states</Trans>
          </FieldLabel>
          <Input
            id="client-jurisdiction-states"
            className="uppercase tabular-nums"
            placeholder="WA, CA"
            value={statesText}
            aria-invalid={stateInvalid}
            onChange={(event) => setStatesText(event.target.value.toUpperCase())}
          />
          {stateInvalid ? <FieldError>{t`Use 2-letter state codes`}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="client-jurisdiction-counties">
            <Trans>Primary counties</Trans>
          </FieldLabel>
          <Input
            id="client-jurisdiction-counties"
            value={countiesText}
            aria-invalid={countyInvalid}
            onChange={(event) => setCountiesText(event.target.value)}
          />
          {countyInvalid ? (
            <FieldError>{t`Each county must be 120 characters or fewer`}</FieldError>
          ) : null}
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!hasChanges || stateInvalid || countyInvalid || isSaving}
          onClick={() => {
            onSave({
              id: client.id,
              profiles: nextProfiles,
              reason: 'Fact profile filing jurisdiction edit',
            })
          }}
        >
          {isSaving ? t`Saving…` : t`Save`}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} disabled={isSaving}>
          <Trans>Cancel</Trans>
        </Button>
      </div>
    </div>
  )
}

export function ClientRiskInputsPanel({
  client,
  isSaving,
  onSave,
}: {
  client: ClientPublic
  isSaving: boolean
  onSave: (input: { id: string; importanceWeight: number; lateFilingCountLast12mo: number }) => void
}) {
  const { t } = useLingui()
  const [importanceWeight, setImportanceWeight] = useState<'1' | '2' | '3'>(
    importanceSelectValue(client.importanceWeight),
  )
  const [lateFilingCount, setLateFilingCount] = useState(String(client.lateFilingCountLast12mo))
  const lateFilingNumber = Number(lateFilingCount)
  const lateFilingInvalid =
    !/^\d+$/.test(lateFilingCount.trim()) || lateFilingNumber < 0 || lateFilingNumber > 99
  const hasChanges =
    Number(importanceWeight) !== client.importanceWeight ||
    lateFilingNumber !== client.lateFilingCountLast12mo

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel>
            <Trans>Importance</Trans>
          </FieldLabel>
          <Select
            value={importanceWeight}
            onValueChange={(value) => {
              if (value === '1' || value === '2' || value === '3') setImportanceWeight(value)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{importanceLabel(Number(importanceWeight))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="1">
                  <Trans>Low</Trans>
                </SelectItem>
                <SelectItem value="2">
                  <Trans>Medium</Trans>
                </SelectItem>
                <SelectItem value="3">
                  <Trans>High</Trans>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="risk-late-filing-count">
            <Trans>Late filings, 12mo</Trans>
          </FieldLabel>
          <Input
            id="risk-late-filing-count"
            type="number"
            min={0}
            max={99}
            className="tabular-nums"
            value={lateFilingCount}
            aria-invalid={lateFilingInvalid}
            onChange={(event) => setLateFilingCount(event.target.value)}
          />
          {lateFilingInvalid ? <FieldError>{t`Use a whole number from 0 to 99`}</FieldError> : null}
        </Field>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={!hasChanges || lateFilingInvalid || isSaving}
        onClick={() =>
          onSave({
            id: client.id,
            importanceWeight: Number(importanceWeight),
            lateFilingCountLast12mo: lateFilingNumber,
          })
        }
      >
        {isSaving ? t`Saving…` : t`Save risk profile`}
      </Button>
    </div>
  )
}

export function ClientRiskSummaryPanel({
  insight,
  isLoading,
  canRefresh,
}: {
  insight: AiInsightPublic | null
  isLoading: boolean
  canRefresh: boolean
}) {
  // 2026-05-26 (Yuqi /clients/[id] feedback #6+#7 — "pull the
  // badge + Refresh out to the TabSection title row; drop the bar"):
  // panel signature trimmed. The status badge + Refresh button + the
  // standalone header bar that hosted them are gone from this body;
  // the parent TabSection's `actions` slot now renders them next to
  // the section title.
  return (
    <div className="grid gap-3">
      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : insight ? (
        // 2026-05-26 (Yuqi feedback #6+#7): inline "Refreshed [date]"
        // line dropped — the parent TabSection's `summary` slot already
        // shows that same timestamp next to the section title.
        <div className="grid gap-3">
          {insight.sections.map((section) => (
            <InsightSection key={section.key} section={section} insight={insight} />
          ))}
        </div>
      ) : (
        // 2026-05-26 (Yuqi tab-body follow-ups, Task 2 / Fix #10):
        // canonical EmptyState replaces a silent `null` return. The
        // panel used to render the refresh button + nothing else when
        // no insight existed yet, which left the section looking
        // broken. Empty state explains the surface and tells the user
        // what to expect.
        <EmptyState
          icon={SparklesIcon}
          title={<Trans>No activity summary yet</Trans>}
          description={
            canRefresh ? (
              <Trans>
                Generate a plain-English recap of this client's recent recorded changes and where
                the record stands.
              </Trans>
            ) : (
              <Trans>Upgrade to Practice AI for an AI recap of recent client activity.</Trans>
            )
          }
        />
      )}
    </div>
  )
}

export function InsightStatusBadge({ status }: { status: AiInsightPublic['status'] }) {
  if (status === 'ready') {
    return (
      <Badge variant="success" className="text-xs">
        <Trans>Ready</Trans>
      </Badge>
    )
  }
  if (status === 'failed') {
    return (
      <Badge variant="warning" className="text-xs">
        <Trans>Failed</Trans>
      </Badge>
    )
  }
  if (status === 'stale') {
    // 2026-05-26 (Step 9 AI Visibility Audit F-021): tooltip
    // explains what stale means for an AI insight.
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge variant="info" tabIndex={0} className="cursor-help text-xs">
              <Trans>Stale</Trans>
            </Badge>
          }
        />
        <TooltipContent>
          <Trans>
            This AI insight was generated before the client's facts changed. Refresh to get an
            up-to-date summary.
          </Trans>
        </TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Badge variant="outline" className="text-xs">
      <Trans>Pending</Trans>
    </Badge>
  )
}

function InsightSection({
  section,
  insight,
}: {
  section: AiInsightPublic['sections'][number]
  insight: AiInsightPublic
}) {
  const citations = insight.citations.filter((citation) =>
    section.citationRefs.includes(citation.ref),
  )
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-text-primary">{section.label}</p>
      <p className="text-sm text-text-secondary">{section.text}</p>
      {citations.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {citations.map((citation) => (
            <InsightSourceChip key={citation.ref} citation={citation} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function InsightSourceChip({ citation }: { citation: AiInsightPublic['citations'][number] }) {
  const label = citation.evidence?.sourceId ?? citation.evidence?.sourceType ?? `#${citation.ref}`
  const chip = (
    <Badge variant="outline" className="max-w-full truncate text-xs">
      [{citation.ref}] {label}
    </Badge>
  )
  return citation.evidence?.sourceUrl ? (
    <a href={citation.evidence.sourceUrl} target="_blank" rel="noreferrer" className="max-w-full">
      {chip}
    </a>
  ) : (
    chip
  )
}

export function ClientSourceDetailsPanel({
  client,
  showSourceFields,
  isSaving,
  onSave,
}: {
  client: ClientPublic
  showSourceFields: boolean
  isSaving: boolean
  onSave: (input: ClientSourceDetailsUpdateInput) => void
}) {
  const [externalClientId, setExternalClientId] = useState(client.externalClientId ?? '')
  const [sourceStatus, setSourceStatus] = useState(client.sourceStatus ?? '')
  const [addressLine1, setAddressLine1] = useState(client.addressLine1 ?? '')
  const [city, setCity] = useState(client.city ?? '')
  const [postalCode, setPostalCode] = useState(client.postalCode ?? '')
  const [primaryPhone, setPrimaryPhone] = useState(client.primaryPhone ?? '')
  const currentValues = {
    externalClientId: client.externalClientId ?? '',
    sourceStatus: client.sourceStatus ?? '',
    addressLine1: client.addressLine1 ?? '',
    city: client.city ?? '',
    postalCode: client.postalCode ?? '',
    primaryPhone: client.primaryPhone ?? '',
  }
  const nextValues = {
    externalClientId,
    sourceStatus,
    addressLine1,
    city,
    postalCode,
    primaryPhone,
  }
  const hasChanges =
    nextValues.externalClientId.trim() !== currentValues.externalClientId ||
    nextValues.sourceStatus.trim() !== currentValues.sourceStatus ||
    nextValues.addressLine1.trim() !== currentValues.addressLine1 ||
    nextValues.city.trim() !== currentValues.city ||
    nextValues.postalCode.trim() !== currentValues.postalCode ||
    nextValues.primaryPhone.trim() !== currentValues.primaryPhone
  const reset = () => {
    setExternalClientId(currentValues.externalClientId)
    setSourceStatus(currentValues.sourceStatus)
    setAddressLine1(currentValues.addressLine1)
    setCity(currentValues.city)
    setPostalCode(currentValues.postalCode)
    setPrimaryPhone(currentValues.primaryPhone)
  }
  const save = () => {
    onSave({
      id: client.id,
      ...(showSourceFields
        ? {
            externalClientId: nullableTrim(externalClientId),
            sourceStatus: nullableTrim(sourceStatus),
          }
        : {}),
      addressLine1: nullableTrim(addressLine1),
      city: nullableTrim(city),
      postalCode: nullableTrim(postalCode),
      primaryPhone: nullableTrim(primaryPhone),
      reason: 'Client info source and contact details edit',
    })
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {showSourceFields ? (
          <>
            <ClientSourceDetailsField
              id="client-source-external-id"
              label={<Trans>External client ID</Trans>}
              value={externalClientId}
              onChange={setExternalClientId}
            />
            <ClientSourceDetailsField
              id="client-source-status"
              label={<Trans>Source status</Trans>}
              value={sourceStatus}
              onChange={setSourceStatus}
            />
          </>
        ) : null}
        <ClientSourceDetailsField
          id="client-source-address-line-1"
          label={<Trans>Address line 1</Trans>}
          value={addressLine1}
          onChange={setAddressLine1}
        />
        <ClientSourceDetailsField
          id="client-source-city"
          label={<Trans>City</Trans>}
          value={city}
          onChange={setCity}
        />
        <ClientSourceDetailsField
          id="client-source-postal-code"
          label={<Trans>ZIP / postal code</Trans>}
          value={postalCode}
          onChange={setPostalCode}
        />
        <ClientSourceDetailsField
          id="client-source-primary-phone"
          label={<Trans>Primary phone</Trans>}
          value={primaryPhone}
          onChange={setPrimaryPhone}
          type="tel"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!hasChanges || isSaving} onClick={save}>
          {isSaving ? <Trans>Saving…</Trans> : <Trans>Save client details</Trans>}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset} disabled={isSaving}>
          <Trans>Cancel</Trans>
        </Button>
      </div>
    </div>
  )
}

function nullableTrim(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function ClientSourceDetailsField({
  id,
  label,
  value,
  onChange,
  type = 'text',
}: {
  id: string
  label: ReactNode
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'tel'
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

const CLASSIFICATION_REASON_KINDS = ['correction', 'reclassification'] as const
type ClassificationReasonKind = (typeof CLASSIFICATION_REASON_KINDS)[number]

// Reclassification mechanisms, kept general across entity types (not
// S-corp-specific): `tax_election` covers Form 2553 / 8832 elections for any
// entity, the rest cover statutory conversions, M&A, and member-count changes.
const CLASSIFICATION_REASON_EVENTS = [
  'tax_election',
  'legal_conversion',
  'merger_or_reorganization',
  'ownership_change',
  'other',
] as const
type ClassificationReasonEvent = (typeof CLASSIFICATION_REASON_EVENTS)[number]

const NOTE_MAX_LENGTH = 280

// Effective-from-tax-year options for a reclassification, mirroring the
// "Add deadline" tax-year picker: six years starting at the prior calendar
// year (e.g. 2025–2030 in 2026) so a recently-effective change is selectable.
const EFFECTIVE_YEAR_OPTION_COUNT = 6
function buildEffectiveYearOptions(today = new Date()): string[] {
  const start = today.getFullYear() - 1
  return Array.from({ length: EFFECTIVE_YEAR_OPTION_COUNT }, (_, index) => String(start + index))
}

function useReasonEventLabels(): Record<ClassificationReasonEvent, string> {
  const { t } = useLingui()
  return {
    tax_election: t`Tax election (2553 / 8832)`,
    legal_conversion: t`Legal conversion`,
    merger_or_reorganization: t`Merger or reorganization`,
    ownership_change: t`Ownership change`,
    other: t`Other`,
  }
}

/**
 * `ClientClassificationPanel` — edits the client's `entityType`, the fact
 * that decides which federal forms the deadline generator emits. Tax
 * classification is intentionally NOT surfaced here: the operational tax
 * type is chosen per deadline, so entity type alone drives the recompute.
 *
 * Deliberately has NO transition restrictions — every entity type is
 * always selectable regardless of the current value. The impact preview +
 * reason are the safety net, not input limits. The primary button is
 * "Review impact…" (not "Save"):
 * it opens `ClassificationImpactDialog`, which previews the add/remove
 * fan-out and performs the atomic apply. This panel never mutates.
 */
export function ClientClassificationPanel({
  client,
  onApplied,
}: {
  client: ClientPublic
  onApplied: (result: { client: ClientPublic; addedCount: number; supersededCount: number }) => void
}) {
  const { t } = useLingui()
  const entityLabels = useEntityLabels()
  const reasonEventLabels = useReasonEventLabels()
  const currentYear = new Date().getFullYear()
  const effectiveYearOptions = buildEffectiveYearOptions()

  const [entityType, setEntityType] = useState<ClientPublic['entityType']>(client.entityType)
  const [reasonKind, setReasonKind] = useState<ClassificationReasonKind>('correction')
  const [reasonEvent, setReasonEvent] = useState<ClassificationReasonEvent | ''>('')
  const [effectiveYear, setEffectiveYear] = useState(String(currentYear))
  const [note, setNote] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const isReclassification = reasonKind === 'reclassification'
  const effectiveYearNumber = Number(effectiveYear)
  const noteOverLimit = note.length > NOTE_MAX_LENGTH
  const hasChanges = entityType !== client.entityType

  const candidate = { entityType }
  const reason: ClientClassificationReason = {
    kind: reasonKind,
    ...(isReclassification && reasonEvent ? { event: reasonEvent } : {}),
    ...(note.trim().length > 0 ? { note: note.trim() } : {}),
  }
  // Reclassification recompute touches only years >= this effective
  // year; corrections rewrite all monitored years, so the field is
  // omitted entirely (and required-validated server-side only for
  // reclassification).
  const effectiveFromTaxYear = isReclassification ? effectiveYearNumber : undefined

  const reset = () => {
    setEntityType(client.entityType)
    setReasonKind('correction')
    setReasonEvent('')
    setEffectiveYear(String(currentYear))
    setNote('')
  }

  const handleApplied = (result: {
    client: ClientPublic
    addedCount: number
    supersededCount: number
  }) => {
    onApplied(result)
    // Re-anchor the form to the freshly-saved classification so the
    // panel reflects the new truth and "Review impact…" disables again
    // until the next edit.
    setEntityType(result.client.entityType)
    setReasonKind('correction')
    setReasonEvent('')
    setEffectiveYear(String(currentYear))
    setNote('')
  }

  return (
    <div className="grid gap-3">
      <Field>
        <FieldLabel>
          <Trans>Entity type</Trans>
        </FieldLabel>
        <Select
          value={entityType}
          onValueChange={(value) => {
            if (value) setEntityType(value)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{entityLabels[entityType]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {CLIENT_ENTITY_TYPES.map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {entityLabels[entity]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>
          <Trans>Reason</Trans>
        </FieldLabel>
        <Select
          value={reasonKind}
          onValueChange={(value) => {
            if (value === 'correction' || value === 'reclassification') setReasonKind(value)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {reasonKind === 'reclassification' ? (
                <Trans>Reclassification (the entity changed type, effective a tax year)</Trans>
              ) : (
                <Trans>Correction (fix a data-entry error)</Trans>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="correction">
                <Trans>Correction (fix a data-entry error)</Trans>
              </SelectItem>
              <SelectItem value="reclassification">
                <Trans>Reclassification (the entity changed type, effective a tax year)</Trans>
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      {isReclassification ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel>
              <Trans>Event</Trans>
            </FieldLabel>
            <Select
              value={reasonEvent}
              onValueChange={(value) => {
                if (CLASSIFICATION_REASON_EVENTS.some((event) => event === value)) {
                  setReasonEvent(value as ClassificationReasonEvent)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t`Optional`}>
                  {reasonEvent ? reasonEventLabels[reasonEvent] : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CLASSIFICATION_REASON_EVENTS.map((event) => (
                    <SelectItem key={event} value={event}>
                      {reasonEventLabels[event]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="classification-effective-year">
              <Trans>Effective from tax year</Trans>
            </FieldLabel>
            <Select
              value={effectiveYear}
              onValueChange={(value) => {
                if (value) setEffectiveYear(value)
              }}
            >
              <SelectTrigger id="classification-effective-year" className="w-full tabular-nums">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {effectiveYearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : null}

      <Field>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor="classification-note">
            <Trans>Note</Trans>
          </FieldLabel>
          {note.length > 0 ? (
            <span
              className={
                noteOverLimit
                  ? 'text-xs tabular-nums text-text-destructive'
                  : 'text-xs tabular-nums text-text-tertiary'
              }
              aria-live="polite"
            >
              {note.length} / {NOTE_MAX_LENGTH}
            </span>
          ) : null}
        </div>
        <Textarea
          id="classification-note"
          value={note}
          rows={2}
          placeholder={t`Optional context for the audit log.`}
          aria-invalid={noteOverLimit}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!hasChanges || noteOverLimit}
          onClick={() => setDialogOpen(true)}
        >
          <Trans>Review impact…</Trans>
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset} disabled={!hasChanges}>
          <Trans>Cancel</Trans>
        </Button>
      </div>

      <ClassificationImpactDialog
        clientId={client.id}
        candidate={candidate}
        reason={reason}
        effectiveFromTaxYear={effectiveFromTaxYear}
        client={client}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onApplied={handleApplied}
      />
    </div>
  )
}
