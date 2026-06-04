import type { ReactNode } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, Astroid, CopyIcon, ExternalLinkIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { PulseDetail } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'

import { formatDate } from '@/lib/utils'
import { formatTaxCode } from '@/lib/tax-codes'
import { RULE_JURISDICTION_LABELS } from '@/features/rules/rules-console-model'
import { FieldLabel } from '@/components/primitives/field-label'

interface AlertStructuredFieldsProps {
  detail: PulseDetail
}

/**
 * Structured-fields panel inside the alert drawer body.
 *
 * 2026-05-25 (Yuqi review #11, #20, #21, #22, #23): rebuilt as a
 * three-column grid with sentence-case copy. Earlier version used
 * vertical FieldRows with label-left / value-right; the user's eye
 * had to ping-pong across an 880px-wide drawer to read each fact,
 * and the section labels were `text-xs uppercase tracking-wider`
 * which made them invisible against the body copy at the same size.
 *
 * New shape:
 *  - Two clearly-headed sections ("Source" and "Scope"), each as a
 *    titled card with a small accent rule under the heading. The
 *    heading is `text-sm font-semibold` (not the old caption-size
 *    eyebrow) so it reads as a section title, not row chrome.
 *  - Inside each card, facts live in a `grid-cols-2 md:grid-cols-3`
 *    arrangement — labels stack ABOVE their values, so the eye
 *    scans top-to-bottom across columns instead of zigzagging.
 *  - Source excerpt stays at the bottom as a distinct block (it's
 *    long-form text, not a key/value).
 *  - "Read official source" button lives at the top of the Source
 *    card next to the heading so it's discoverable without
 *    scrolling.
 */
export function AlertStructuredFields({ detail }: AlertStructuredFieldsProps) {
  const { t } = useLingui()

  const copySourceExcerpt = () => {
    void navigator.clipboard.writeText(detail.sourceExcerpt).then(
      () => toast.success(t`Source excerpt copied`),
      () => toast.error(t`Couldn't copy source excerpt`),
    )
  }

  // Source card facts — chronology + the actual deadline shift if
  // this is a due-date overlay. Listed in scan order: where it came
  // from, when it was published, when it takes effect, when it
  // expires, then the change itself.
  const sourceFacts: Array<{ key: string; label: ReactNode; value: ReactNode }> = []
  sourceFacts.push({
    key: 'authority',
    label: <Trans>Authority</Trans>,
    value: <span className="font-medium text-text-primary">{detail.alert.source}</span>,
  })
  sourceFacts.push({
    key: 'issued',
    label: <Trans>Issued</Trans>,
    value: (
      <span className="tabular-nums text-text-primary">{formatDate(detail.alert.publishedAt)}</span>
    ),
  })
  if (detail.effectiveFrom) {
    sourceFacts.push({
      key: 'effective',
      label: <Trans>Effective</Trans>,
      value: (
        <span className="tabular-nums text-text-primary">{formatDate(detail.effectiveFrom)}</span>
      ),
    })
  }
  if (detail.effectiveUntil) {
    sourceFacts.push({
      key: 'expires',
      label: <Trans>Expires</Trans>,
      value: (
        <span className="tabular-nums text-text-primary">{formatDate(detail.effectiveUntil)}</span>
      ),
    })
  }
  if (detail.alert.actionMode === 'due_date_overlay') {
    sourceFacts.push({
      key: 'shift',
      label: <Trans>Deadline shift</Trans>,
      value: (
        // 2026-05-25 (Yuqi Today #12 + #21): swapped the inline ' → '
        // glyph for a real ArrowRightIcon framed in warning amber.
        // Yuqi flagged that the most CONSEQUENTIAL fact in the
        // drawer — the date change — was visually identical to every
        // other key/value row. Now: the new date sits in
        // text-text-warning + font-semibold so the eye lands on it
        // first, and the arrow icon between makes "from → to"
        // unmistakable as a delta (not just two dates side by side).
        <span className="inline-flex items-center gap-2 tabular-nums">
          <span className="text-text-tertiary">
            {detail.originalDueDate ? formatDate(detail.originalDueDate) : t`Unknown`}
          </span>
          <ArrowRightIcon className="size-3.5 text-text-warning" aria-hidden />
          <span className="font-semibold text-text-warning">
            {detail.newDueDate ? formatDate(detail.newDueDate) : t`Unknown`}
          </span>
        </span>
      ),
    })
  } else {
    sourceFacts.push({
      key: 'mode',
      label: <Trans>Action mode</Trans>,
      value: (
        <span className="font-medium text-text-primary">
          <Trans>Review only</Trans>
        </span>
      ),
    })
  }

  // Scope card facts — who/what the alert applies to. Jurisdiction
  // first (most CPAs filter by state first), then counties, forms,
  // entity types, base rules.
  const scopeFacts: Array<{ key: string; label: ReactNode; value: ReactNode }> = []
  // 2026-05-25 (Yuqi Today #14 + Alerts second pass #10): the
  // jurisdiction fact is now a single integrated chip — leading
  // StateBadge motif, mono code, full state name — all inside one
  // bordered pill so it reads as one unit. Yuqi flagged the earlier
  // "StateBadge + outline Badge + tertiary text" treatment as three
  // separate visual elements ("要看做一个整体, 不要三个分开的个体").
  // The chip uses the canonical badge typography but expands
  // horizontally to hold the full label, so all three pieces sit on
  // the same baseline with consistent vertical padding.
  const jurisdictionFull = RULE_JURISDICTION_LABELS[detail.jurisdiction] ?? null
  scopeFacts.push({
    key: 'jurisdiction',
    label: <Trans>Jurisdiction</Trans>,
    value: (
      // 2026-05-26 (Yuqi thirty-second pass): state pill unified.
      // Was a `rounded-full` capsule with `font-mono` code; now
      // matches the drawer header kicker + card state pill — same
      // `rounded-sm` framed shape, no monospace on the 2-letter
      // code. Three different surfaces, one chip pattern.
      // 2026-05-29 (Yuqi /clients round 1 — "remove the state icon
      // everywhere"): SVG StateBadge dropped; the bordered pill +
      // jurisdiction code carries the identity on its own.
      // 2026-06-01: jurisdiction kicker swapped to the canonical
      // Badge primitive (shape="square" variant="outline"). Same
      // call as PulseDetailDrawer:710 — the two canonical
      // jurisdiction surfaces now share one primitive call.
      <Badge shape="square" variant="outline" className="gap-1.5">
        <span className="font-semibold uppercase tracking-wide text-text-primary">
          {detail.jurisdiction}
        </span>
        {jurisdictionFull ? <span className="text-text-secondary">{jurisdictionFull}</span> : null}
      </Badge>
    ),
  })
  if (detail.counties.length > 0) {
    scopeFacts.push({
      key: 'counties',
      label: <Trans>Counties</Trans>,
      value: (
        <div className="flex flex-wrap gap-1">
          {detail.counties.map((county) => (
            // 2026-05-26 (Yuqi seventeenth pass #4): counties are
            // proper nouns ("Los Angeles", "Cook"), not codes —
            // dropped `font-mono`. Entity types below stay mono
            // because they ARE codes ("1041", "1120-S", "1065").
            <Badge key={county} variant="secondary" className="h-7 text-sm">
              {county}
            </Badge>
          ))}
        </div>
      ),
    })
  }
  // 2026-05-25 (Yuqi Today #15): show the human-readable form label
  // ("FL Corporate Income"), not the snake_case tax code
  // ("fl_corp_income"). CPAs don't think in DB-key names; the alert
  // refers to a specific form they file with the state, and the
  // canonical name should appear here. `formatTaxCode` falls back to
  // a prettified version of the snake_case if the code isn't in the
  // central registry, so unknown forms still render readably instead
  // of as raw identifiers.
  scopeFacts.push({
    key: 'forms',
    label: <Trans>Forms</Trans>,
    value:
      detail.forms.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {detail.forms.map((form) => (
            <Badge key={form} variant="outline" title={form} className="h-7 text-sm">
              {formatTaxCode(form)}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-text-tertiary">
          <Trans>None</Trans>
        </span>
      ),
  })
  scopeFacts.push({
    key: 'entityTypes',
    label: <Trans>Entity types</Trans>,
    value:
      detail.entityTypes.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {detail.entityTypes.map((entity) => (
            // 2026-05-26 (Yuqi thirty-second pass): entity-type
            // badges drop `font-mono` + `uppercase`. These are
            // normalized labels (individual / llc / s_corp /
            // trust / sole_prop) — regular text reads more
            // naturally than mono caps for short noun chips.
            <Badge key={entity} variant="secondary" className="h-7 text-sm">
              {entity}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-text-tertiary">
          <Trans>None</Trans>
        </span>
      ),
  })
  if (detail.affectedRuleIds.length > 0) {
    scopeFacts.push({
      key: 'rules',
      label: <Trans>Base rules</Trans>,
      value: (
        <div className="flex flex-wrap gap-1">
          {detail.affectedRuleIds.map((ruleId) => (
            <Badge key={ruleId} variant="outline" className="tabular-nums">
              {ruleId}
            </Badge>
          ))}
        </div>
      ),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 2026-06-04 round 68 (Yuqi "can be in an AI icon besides
          Extracted FACTS title"): the GENERIC AI-extraction caveat
          banner was replaced with a tooltip-revealed Astroid AI
          icon next to the "Extracted facts" section header in
          AlertDetailDrawer. The threshold_advisory branch stays —
          its banner carries deterministic-source semantics, not the
          AI-extraction warning, so it can't collapse into the
          shared AI-icon tooltip. */}
      {detail.alert.changeKind === 'threshold_advisory' ? (
        // Threshold advisories are emitted deterministically (NOT AI-extracted)
        // and deliberately assert no dollar figures — so the AI-extraction
        // caveat would be both inaccurate and misleading here. Point the CPA at
        // the official Revenue Procedure to read the adjusted thresholds.
        <div className="flex items-start gap-2 rounded-md border border-divider-subtle bg-background-soft px-3 py-2 text-xs text-text-secondary">
          <Astroid className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" aria-hidden />
          <span>
            <Trans>
              This advisory points to an official IRS Revenue Procedure and asserts no specific
              dollar figures. Open the official source to read the adjusted thresholds and decide
              which clients are affected.
            </Trans>
          </span>
        </div>
      ) : null}
      {detail.alert.duplicateSourceSnapshotCount > 0 ? (
        <div className="rounded-md border border-divider-subtle bg-background-soft px-3 py-2 text-xs text-text-secondary">
          <Plural
            value={detail.alert.duplicateSourceSnapshotCount}
            one="# similar source update was merged into this alert."
            other="# similar source updates were merged into this alert."
          />
        </div>
      ) : null}
      <FactCard
        title={<Trans>Source</Trans>}
        action={
          // 2026-05-25 (Yuqi Today #17): "Open official source" used
          // to be a generic outline-button labeled with that generic
          // phrase. Yuqi flagged: "be a better button. maybe just a
          // link. also the name of the official source". Now: rendered
          // as a `link` variant with the actual source name (e.g.
          // "FL DOR Bulletin ↗"), which is the same string the CPA
          // sees on the source badge upstream and on the alert title.
          // The trailing arrow icon makes it read as "this opens an
          // external link" without needing the redundant label. Same
          // size token as the icon-only Copy button below so the
          // section header heights agree (#16).
          <Button
            nativeButton={false}
            variant="link"
            size="sm"
            className="h-7"
            render={<a href={detail.alert.sourceUrl} target="_blank" rel="noopener noreferrer" />}
          >
            {detail.alert.source}
            <ExternalLinkIcon data-icon="inline-end" />
          </Button>
        }
      >
        <FactGrid facts={sourceFacts} />
      </FactCard>

      <FactCard title={<Trans>Scope</Trans>}>
        <FactGrid facts={scopeFacts} />
      </FactCard>

      {/* 2026-05-25 (Yuqi Today #20): source excerpt no longer wrapped
          in a labeled FactCard. Yuqi flagged that "Source excerpt"
          doesn't need to be a section like Source — it's just a quote.
          Rendered as a flush bordered blockquote with the copy
          affordance pinned to the top-right corner. Sits directly
          under the Scope card as a quiet supporting paragraph, not
          a third heavy section. */}
      <div className="group/excerpt relative rounded-md border border-divider-subtle bg-background-soft px-4 py-3">
        <blockquote className="break-words pr-8 text-sm italic leading-relaxed text-text-secondary">
          “{detail.sourceExcerpt}”
        </blockquote>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t`Copy source excerpt`}
                onClick={copySourceExcerpt}
                className="absolute right-2 top-2 opacity-0 transition-opacity group-hover/excerpt:opacity-100 focus-visible:opacity-100"
              >
                <CopyIcon aria-hidden />
              </Button>
            }
          />
          <TooltipContent>
            <Trans>Copy source excerpt</Trans>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

// Visible card wrapper around a logical section. Header is a real
// `text-sm font-semibold` so it actually reads as a heading — the
// old `text-xs uppercase tracking-wider` blended with content at the
// same size + color (Yuqi #22).
//
// 2026-05-25 (Yuqi Today #13 + #16):
//   - Title bumped from `text-sm` → `text-base` font-semibold. At
//     text-sm the heading sat at the same scale as the fact labels
//     below it, blurring the section/content separation Yuqi
//     specifically asked the original FactCard refactor to fix.
//   - Header height locked to `h-11` via `min-h-11 items-center` so
//     all three FactCards (Source, Scope, Source excerpt) start
//     their content at the exact same vertical position — the
//     previous variable padding produced misaligned section starts
//     when the actions row had a button vs. an icon-only button.
// 2026-05-25 (Yuqi Alerts second pass #11): radius dropped from
// `rounded-md` (6px) to `rounded-xs` (2px) and body padding bumped
// from `p-4` to `px-6 py-5`. The smaller radius makes the FactCard
// read as document-style structural surface (not a UI chip); the
// generous padding gives the dense fact grid breathing room
// without competing with the surrounding drawer chrome.
function FactCard({
  title,
  action,
  children,
}: {
  title: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  // 2026-05-26 (Yuqi twenty-sixth pass): radius unified at
  // rounded-md (6px). Previously `rounded-[2px]` — too sharp
  // compared to the sibling Source excerpt frame and the
  // structured-change container which were both rounded-md.
  // All section frames in the drawer body now share the same
  // 6px radius.
  // 2026-05-26 (Yuqi drawer canonical — nested card padding):
  // FactCard is a NESTED card inside the drawer body. Previous
  // `px-6 py-5` matched the OLD drawer-body padding (px-6 py-5)
  // so they read as one rhythm. Drawer body is now `px-12 py-10`,
  // so FactCard should drop to the canonical "standard card"
  // padding (`p-4`) since it's a small framed surface inside the
  // bigger paper-document drawer. Header uses `px-4 py-2` so the
  // section title row stays compact and the visual weight sits
  // in the body. Section title bumped text-base → text-sm
  // font-semibold per canonical body-section heading.
  // 2026-05-26 (Yuqi forty-fifth pass — header bg):
  // header gets `bg-background-subtle` so the section title row
  // reads as a labeled cap on the card, like a manila folder tab.
  // Without the bg, the header looked like an unframed first row
  // of the body. The rounded-tl/tr-md keeps the bg flush with the
  // card's top corner radius. The body stays `bg-background-default`
  // (white) for the data content.
  return (
    // 2026-06-04 round 78 (Yuqi "finish the partially done first"
    // — detail panel #5 audit): FactCard chrome aligned to the
    // canonical card token combo used by /today's ActionsTable —
    // `rounded-[12px] border-divider-regular`. The previous
    // `rounded-md border-divider-subtle` was a one-off in the
    // drawer that broke the card-frame consistency the user asked
    // for in round 73 ("apply table design guideline").
    <section className="overflow-hidden rounded-[12px] border border-divider-regular bg-background-default">
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-divider-subtle bg-background-subtle px-4 py-2">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

// 2-column fact grid. Each cell stacks the label above the value so
// the eye scans top-to-bottom within a column, not left-right across
// the full drawer width.
//
// 2026-05-26 (Yuqi /alerts third pass #12, #13): grid-cols-3
// → grid-cols-2. At the drawer panel's 520–680px width the 3-column
// arrangement made each value column ~150px wide — too narrow for
// the "Authority" + "Source" content. 2 columns gives the values
// room to breathe and reads as a tidy 2x2 (or 2x3) layout. The
// section's horizontal real estate is wider per column, vertical
// space is paid for in extra rows.
function FactGrid({
  facts,
}: {
  facts: ReadonlyArray<{ key: string; label: ReactNode; value: ReactNode }>
}) {
  return (
    // 2026-05-26 (Yuqi forty-fifth pass — tighten fact grid):
    // gap-y-4 (16px) between rows felt loose at the new drawer
    // width — dropped to gap-y-3 (12px). The label-on-top stack
    // (label text-xs + value text-sm) already has ~24px row
    // height; gap-3 keeps the rows readable without yawning
    // whitespace between them.
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
      {facts.map((fact) => (
        <div key={fact.key} className="flex min-w-0 flex-col gap-1">
          <FieldLabel as="dt">{fact.label}</FieldLabel>
          <dd className="min-w-0 text-sm text-text-primary">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}
