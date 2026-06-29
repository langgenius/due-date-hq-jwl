import type { ReactNode } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CalendarClockIcon, ClipboardListIcon } from 'lucide-react'

import type { PulseDetail } from '@duedatehq/contracts'

import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { formatDatePretty } from '@/lib/utils'
import { formatTaxCode } from '@/lib/tax-codes'

interface AlertStructuredFieldsProps {
  detail: PulseDetail
  /**
   * 2026-06-12 (info-organisation pass — Yuqi "text hierarchy and
   * organisation of information"): the do-by-when callout is the page's KEY
   * FACT and renders in the HERO (`section="key-fact"`), not buried inside
   * the details section. `details` (default) renders everything else — the
   * fact grid + caveats.
   */
  section?: 'key-fact' | 'details'
}

interface ProtectiveClaimFacts {
  actionDeadline: string | null
  claimTaxYears: string[]
  affectedTaxActs: string[]
  evidenceNeeded: string[]
  legalUncertainty: string | null
  authorityRefs: string[]
}

// AI-extracted facts for deadline-shift alerts, read from the freeform
// `structuredChange.deadlineShift` block. All fields are optional — OLD
// alerts carry no `deadlineShift`, so the reader returns null and the
// grid falls back to the generic cells.
interface DeadlineShiftFacts {
  reliefType: string | null
  deadlineTypes: Array<'filing' | 'payment'>
  optInRequired: boolean | null
  penaltyRelief: boolean | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compactText(value: unknown): string | null {
  if (typeof value === 'string') {
    const text = value.trim()
    return text.length > 0 ? text : null
  }
  if (typeof value === 'number') return String(value)
  if (!isRecord(value)) return null
  const title = compactText(value.title)
  const section = compactText(value.section)
  const url = compactText(value.url)
  return [title, section, url].filter(Boolean).join(' · ') || null
}

function textList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(compactText).filter((item): item is string => item !== null)
  }
  const text = compactText(value)
  return text ? [text] : []
}

function protectiveClaimFacts(detail: PulseDetail): ProtectiveClaimFacts | null {
  if (detail.alert.changeKind !== 'protective_claim_window') return null
  if (!isRecord(detail.structuredChange)) return null
  const actionDeadline = compactText(detail.structuredChange.actionDeadline)
  const legalUncertainty = compactText(detail.structuredChange.legalUncertainty)
  const facts = {
    actionDeadline,
    claimTaxYears: textList(detail.structuredChange.claimTaxYears),
    affectedTaxActs: textList(detail.structuredChange.affectedTaxActs),
    evidenceNeeded: textList(detail.structuredChange.evidenceNeeded),
    legalUncertainty,
    authorityRefs: textList(detail.structuredChange.authorityRefs),
  }
  const hasAnyFact =
    facts.actionDeadline ||
    facts.claimTaxYears.length > 0 ||
    facts.affectedTaxActs.length > 0 ||
    facts.evidenceNeeded.length > 0 ||
    facts.legalUncertainty ||
    facts.authorityRefs.length > 0
  return hasAnyFact ? facts : null
}

function deadlineTypeList(value: unknown): Array<'filing' | 'payment'> {
  if (!Array.isArray(value)) return []
  const seen = new Set<'filing' | 'payment'>()
  for (const item of value) {
    if (item === 'filing' || item === 'payment') seen.add(item)
  }
  // Stable filing-before-payment order so "Filing + Payment" reads consistently.
  return (['filing', 'payment'] as const).filter((kind) => seen.has(kind))
}

function optionalBool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

// Mirror of `protectiveClaimFacts`. Reads the AI-extracted
// `deadlineShift` block from the freeform `structuredChange` for
// `deadline_shift` alerts. Returns null when the alert isn't a deadline
// shift or carries no deadlineShift facts (every OLD alert) — the grid
// then keeps its generic cells, so nothing breaks or renders empty. The
// block is conventionally nested under `structuredChange.deadlineShift`;
// we also tolerate the keys being written at the top level of
// `structuredChange`.
function deadlineShiftFacts(detail: PulseDetail): DeadlineShiftFacts | null {
  if (detail.alert.changeKind !== 'deadline_shift') return null
  if (!isRecord(detail.structuredChange)) return null
  const block = isRecord(detail.structuredChange.deadlineShift)
    ? detail.structuredChange.deadlineShift
    : detail.structuredChange
  const facts: DeadlineShiftFacts = {
    reliefType: compactText(block.reliefType),
    deadlineTypes: deadlineTypeList(block.deadlineTypes),
    optInRequired: optionalBool(block.optInRequired),
    penaltyRelief: optionalBool(block.penaltyRelief),
  }
  const hasAnyFact =
    facts.reliefType !== null ||
    facts.deadlineTypes.length > 0 ||
    facts.optInRequired !== null ||
    facts.penaltyRelief !== null
  return hasAnyFact ? facts : null
}

// Day distance from today to an ISO `YYYY-MM-DD` deadline — null for any
// other string shape (the AI field is freeform text, so a non-date value
// just renders without a countdown rather than guessing).
function daysUntil(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const target = new Date(`${isoDate}T00:00:00.000Z`).getTime()
  if (!Number.isFinite(target)) return null
  return Math.ceil((target - Date.now()) / 86_400_000)
}

/**
 * The structured-facts body of the "Extracted facts" card:
 *
 *   1. Action-deadline hero (protective-claim alerts) — the one decision-
 *      critical date gets the same hero grammar as DeadlineChangeCard
 *      (big mono date + amber countdown), with the evidence checklist as
 *      a hairline sub-row: "do this, by then" in one block.
 *   2. ONE hairline fact grid (4-col, 2 on narrow) — uppercase mono label
 *      over a 13/500 value. One home per fact: cells that restated the
 *      header chrome or the Source & confidence card (Authority,
 *      Published, bare Jurisdiction) are gone; type-specific facts
 *      (affected years / tax acts / authority refs, relief type /
 *      deadline types / opt-in) merge into this grid instead of stacking
 *      a second lookalike grid below it.
 *   3. Quiet prose notes (legal uncertainty, threshold-advisory caveat).
 *
 * The verbatim source excerpt lives in the Source & confidence card —
 * its one home — not here.
 */
export function AlertStructuredFields({ detail, section = 'details' }: AlertStructuredFieldsProps) {
  const { t } = useLingui()

  // Null (not '—') when the alert carries no effective date, so the cell DROPS
  // instead of rendering a labelled em-dash that says nothing — matching the
  // "empty values drop their cell" rule the rest of the grid follows (the bare
  // "EFFECTIVE —" was the one cell that broke it).
  const effectiveValue = detail.effectiveFrom
    ? new Date(`${detail.effectiveFrom}T00:00:00.000Z`).getTime() <= Date.now()
      ? t`Immediate`
      : formatDatePretty(detail.effectiveFrom, { alwaysShowYear: true })
    : null
  const entityValue =
    detail.entityTypes.length > 0 ? detail.entityTypes.join(' · ') : t`All entity types`
  // 2026-06-14 (Yuqi #9 "Auto-applied" was confusing next to a manual Apply
  // button): the app NEVER auto-applies — apply is always human-triggered.
  // "Auto-applied" described the IRS relief being automatic for taxpayers,
  // which read as "DueDateHQ did it for you". Reworded to what the alert does
  // in the app: a due-date overlay you apply vs. a review-only advisory.
  const applyModeValue =
    detail.alert.actionMode === 'due_date_overlay' ? t`Adjusts due dates` : t`Review only`
  const protectiveFacts = protectiveClaimFacts(detail)
  const deadlineFacts = deadlineShiftFacts(detail)
  const actionDeadlineDays = protectiveFacts?.actionDeadline
    ? daysUntil(protectiveFacts.actionDeadline)
    : null

  // For deadline-shift alerts that carry AI-extracted relief facts, the
  // trailing slots show RELIEF TYPE / DEADLINE TYPES / OPT-IN instead of
  // the generic Entity types / Apply mode. When those facts are ABSENT
  // (every OLD alert), the generic cells keep the grid from showing
  // empty. Each AI-derived cell stays under the section's "AI parsed —
  // verify before Apply" subtitle.
  const deadlineTypesValue =
    deadlineFacts && deadlineFacts.deadlineTypes.length > 0
      ? deadlineFacts.deadlineTypes
          .map((kind) => (kind === 'filing' ? t`Filing` : t`Payment`))
          .join(' + ')
      : null
  const reliefCell = deadlineFacts?.reliefType
    ? {
        key: 'reliefType',
        label: <Trans>Relief type</Trans>,
        value: deadlineFacts.reliefType,
      }
    : null
  const deadlineTypesCell = deadlineTypesValue
    ? { key: 'deadlineTypes', label: <Trans>Deadline types</Trans>, value: deadlineTypesValue }
    : { key: 'entities', label: <Trans>Entity types</Trans>, value: entityValue }
  const optInCell =
    deadlineFacts && deadlineFacts.optInRequired !== null
      ? {
          key: 'optIn',
          label: <Trans>Opt-in</Trans>,
          value: deadlineFacts.optInRequired ? t`Required` : t`Not required`,
        }
      : { key: 'apply', label: <Trans>Apply mode</Trans>, value: applyModeValue }

  // One home per fact: no Authority cell (header meta + Source &
  // confidence citation), no Published cell (same homes), no bare
  // Jurisdiction cell (the header's seal chip) — counties are the only
  // scope detail with no other home, so they keep a cell. Empty values
  // ("—" forms) drop their cell instead of renting a slot to say nothing.
  const cells: Array<{ key: string; label: ReactNode; value: ReactNode }> = [
    ...(protectiveFacts && protectiveFacts.claimTaxYears.length > 0
      ? [
          {
            key: 'claimYears',
            label: <Trans>Affected years</Trans>,
            value: protectiveFacts.claimTaxYears.join(' · '),
          },
        ]
      : []),
    ...(protectiveFacts && protectiveFacts.affectedTaxActs.length > 0
      ? [
          {
            key: 'taxActs',
            label: <Trans>Affected tax acts</Trans>,
            value: protectiveFacts.affectedTaxActs.join(' · '),
          },
        ]
      : []),
    ...(protectiveFacts && protectiveFacts.authorityRefs.length > 0
      ? [
          {
            key: 'authorityRefs',
            label: <Trans>Authority refs</Trans>,
            value: protectiveFacts.authorityRefs.join(' · '),
          },
        ]
      : []),
    ...(reliefCell ? [reliefCell] : []),
    ...(effectiveValue
      ? [
          {
            key: 'effective',
            label: <Trans>Effective</Trans>,
            value: effectiveValue,
          },
        ]
      : []),
    ...(detail.forms.length > 0
      ? [
          {
            key: 'forms',
            label: <Trans>Affected forms</Trans>,
            value: detail.forms.map((form) => formatTaxCode(form)).join(' · '),
          },
        ]
      : []),
    ...(detail.counties.length > 0
      ? [
          {
            key: 'counties',
            label: <Trans>Counties</Trans>,
            value: detail.counties.join(', '),
          },
        ]
      : []),
    deadlineTypesCell,
    optInCell,
  ]
  // Pad the hairline matrix to a full 3-column row (Pencil MASYz) — the grid
  // wrapper's divider-colored bg shows through any unfilled slot as a gray block.
  const fillerCount = (3 - (cells.length % 3)) % 3

  // HERO key fact — ONE refined line (2026-06-12, Yuqi "太粗糙了…好难看"):
  // the first cut hoisted the whole callout (warning rule + caps eyebrow +
  // 28px date + evidence list) into the masthead, where the rule read as an
  // error marker and the date OUTSIZED the 22px title. Now: quiet sentence
  // lead-in, 20px mono date (one step under the title), countdown as the
  // single hot word. The evidence checklist lives in the details section.
  // Pencil MASYz: the hero do-by-when reads as a single red urgency chip —
  // calendar icon + "Act by {date}" + "· N days left" — a light-red pill, the
  // one urgent cue in the masthead.
  const keyFactLine = protectiveFacts?.actionDeadline ? (
    // 2026-06-15 (Yuqi "好粗糙" — too crude): refined to one quiet red cue.
    // The date reads as secondary context; only the countdown carries the red,
    // at medium weight (the design system bans red+bold double-highlight —
    // urgency is the colour, not a heavier weight). Roomier padding + a single
    // line so it reads delicate, not chunky.
    <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-state-destructive-hover px-3 py-1.5 text-sm">
      <CalendarClockIcon className="size-3.5 shrink-0 text-text-destructive" aria-hidden />
      <span className="text-text-secondary tabular-nums">
        {t`Act by ${formatDatePretty(protectiveFacts.actionDeadline, { alwaysShowYear: true })}`}
      </span>
      {actionDeadlineDays !== null ? (
        <>
          <span className="text-text-quaternary" aria-hidden>
            ·
          </span>
          <span className="font-medium text-text-destructive tabular-nums">
            {actionDeadlineDays > 0 ? (
              <Plural value={actionDeadlineDays} one="# day left" other="# days left" />
            ) : actionDeadlineDays === 0 ? (
              <Trans>Due today</Trans>
            ) : (
              <Plural value={-actionDeadlineDays} one="# day past" other="# days past" />
            )}
          </span>
        </>
      ) : null}
    </span>
  ) : null

  if (section === 'key-fact') return keyFactLine

  return (
    // Outer gap-4 separates the fact BLOCK (sub-header + grid) from the
    // supporting notes below it — evidence / caveats — so the table no longer
    // sits 6px under a caveat (Yuqi 2026-06-15 "too close to each other"). The
    // sub-header→grid pair stays tight inside its own gap-1.5 group.
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        {/* Parsed-fields sub-header (Pencil MASYz) — bold label left, the
          AI-verify reminder right, sitting tight above the fact grid (Yuqi
          2026-06-15 "the gap between parse fields and the table should be
          smaller"). */}
        {/* 2026-06-29 (Yuqi "no good text hierarchy"): "Parsed fields" was a
            14/600 primary header — the SAME weight as the card's "Change" title,
            so two bold headers stacked and the eye had no single anchor. Demoted
            to a quiet uppercase eyebrow (the band-title tier) so "Change" is the
            one bold header and this reads clearly as the grid's subordinate
            label, paired with the AI-verify note. */}
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold tracking-eyebrow text-text-tertiary uppercase">
            <Trans>Parsed fields</Trans>
          </span>
          <span className="text-xs text-text-tertiary">
            <Trans>AI parsed — verify before Apply</Trans>
          </span>
        </div>

        {detail.alert.duplicateSourceSnapshotCount > 0 ? (
          <div className="rounded-lg bg-background-soft px-3 py-2 text-xs text-text-secondary">
            <Plural
              value={detail.alert.duplicateSourceSnapshotCount}
              one="# similar source update was merged into this alert."
              other="# similar source updates were merged into this alert."
            />
          </div>
        ) : null}

        {/* Fact grid — Pencil MASYz: 3 columns of uppercase-label → value cells.
          2026-06-16 (Yuqi "avoid frames-in-frames" — the Change section is now a
          bordered white card): dropped the grid's OWN outer box (was rounded
          border) so it isn't a frame inside a frame. The internal cell hairlines
          stay (gap-px over the divider-bg); the section card is the only frame.
          2026-06-29 (Yuqi "padding looks incorrect"): the grid was double-indented
          — each cell's own px-5 added to the card body's px-5, so the cell labels
          sat 20px to the RIGHT of the "Parsed fields" header above them. Full-bleed
          the grid (-mx-5, matching the body inset) so the cell content (px-5) lines
          up flush under the header. The top/bottom hairlines come from `py-px`
          (the bg showing through a 1px inset), NOT a `border-y`: `--divider-subtle`
          is a translucent 4% ink, and a border STACKS over the grid's own
          `bg-divider-subtle` → ~8% (visibly darker than the gap-px inner lines).
          `py-px` uses the same bg-bleed as the inner hairlines, so every line is
          one uniform shade. */}
        <div className="-mx-5 grid grid-cols-3 gap-px py-px bg-divider-subtle">
          {cells.map((cell) => (
            // Fact cell: padding [10,20] (px-5 py-3), 11/600 uppercase
            // tertiary label over a 13/medium primary value. The grid's
            // gap-px + divider bg draw the right-/row-hairlines between
            // cells.
            // 2026-06-14 (Yuqi "table hierarchy is loose"): a tight key→value
            // pair — label = small 11px caption, value = 14/600 primary answer,
            // gap-0.5 so they bind as one unit, py-2.5 so the grid reads dense.
            // The size + weight gap (11/tertiary → 14/600 primary) is the layer.
            <div key={cell.key} className="flex flex-col gap-0.5 bg-background-default px-5 py-2.5">
              <CapsFieldLabel as="span" variant="group">
                {cell.label}
              </CapsFieldLabel>
              {/* Wrap to two lines instead of ellipsizing — Relief type /
                Affected tax acts are identity values; hiding them behind
                "…" defeated the grid. */}
              <span className="line-clamp-2 min-w-0 break-words text-sm font-semibold leading-snug text-text-primary">
                {cell.value}
              </span>
            </div>
          ))}
          {Array.from({ length: fillerCount }, (_, i) => (
            <div key={`filler-${i}`} className="bg-background-default" aria-hidden />
          ))}
        </div>
      </div>

      {/* Evidence to gather (Pencil MASYz) — a quiet gray panel: clipboard
          header + one document row per item. Sits after the fact grid as the
          "to file this, collect…" checklist. */}
      {protectiveFacts && protectiveFacts.evidenceNeeded.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg bg-background-subtle px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <ClipboardListIcon className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
            <Trans>Evidence to gather</Trans>
          </span>
          <ul className="flex flex-col gap-1.5">
            {protectiveFacts.evidenceNeeded.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm leading-snug text-text-secondary"
              >
                {/* A quiet bullet dot, not a file icon (Yuqi 2026-06-15) — the
                    items are evidence to gather, not documents on file. */}
                <span
                  className="mt-[7px] size-1 shrink-0 rounded-full bg-text-quaternary"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {detail.alert.changeKind === 'threshold_advisory' ? (
        // De-fill pass: neutral left-rule callout, same anatomy as the other
        // caveats (no gray slab).
        <div className="border-l-2 border-divider-deep py-0.5 pl-4">
          <p className="text-sm leading-relaxed text-text-secondary">
            <Trans>
              This alert points to the official IRS Revenue Procedure and asserts no specific
              threshold figures. Review the source before advising clients.
            </Trans>
          </p>
        </div>
      ) : null}

      {/* Legal uncertainty (Pencil MASYz) — a left-rule caveat: bold label
          on its own line over the secondary-prose explanation. */}
      {protectiveFacts?.legalUncertainty ? (
        <div className="flex flex-col gap-1 border-l-2 border-divider-deep pl-4">
          <span className="text-sm font-semibold text-text-primary">
            <Trans>Legal uncertainty</Trans>
          </span>
          <p className="text-sm leading-relaxed text-text-secondary">
            {protectiveFacts.legalUncertainty}
          </p>
        </div>
      ) : null}
    </div>
  )
}
