// Shared constants, derived literal-union types, schemas and URL search-param
// parsers for the obligation queue route (/deadlines).
// Extracted from routes/obligations.tsx.
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from 'nuqs'

import {
  ReadinessChecklistItemSchema,
  type AuditEventPublic,
  type MemberAssigneeOption,
  type ObligationQueueDensity,
  type ObligationQueueRow,
  type ObligationQueueSort,
  type ReadinessDocumentChecklistItemPublic,
} from '@duedatehq/contracts'
import { ALL_STATUSES, type ObligationStatus } from '@/features/obligations/status-control'
import { DEADLINE_DETAIL_TABS } from '@/features/obligations/deadline-detail-url'

import type { ClientFilterOption, FilterOption, ObligationQueueCursor } from './types'

export const ALL_SORTS = [
  'smart_priority',
  'due_asc',
  'due_desc',
  'updated_desc',
] as const satisfies readonly ObligationQueueSort[]

export const OWNER_FILTERS = ['unassigned'] as const

export const DUE_FILTERS = ['overdue'] as const

export const EVIDENCE_FILTERS = ['needs'] as const

export const DETAIL_DRAWERS = ['obligation'] as const

export const DETAIL_TABS = DEADLINE_DETAIL_TABS

export const DENSITY_OPTIONS = [
  'comfortable',
  'compact',
] as const satisfies readonly ObligationQueueDensity[]

export const DEFAULT_SORT: ObligationQueueSort = 'smart_priority'

export const DEFAULT_DENSITY: ObligationQueueDensity = 'comfortable'
// 2026-05-26 (Yuqi /deadlines #2): explicit "Group by" mode. Default
// `due` keeps the chronological flat list the current product
// optimises for. `client` clusters rows under client section
// headers (with aggregate metadata). `status` clusters by status
// (Blocked / Waiting on client / In review / Filed / Not started).
// 2026-05-26 (Yuqi follow-up — "remove group by status, since there
// is already the top tab switch between status"): Status is no
// longer a Group-by option. The scope-tab band above the table
// already filters by status (All / Past due / This week / Not started
// / Waiting on client / Blocked / In review / Filed), so adding it
// as a grouping axis was a redundant control. Group-by now offers
// only "Due date" (default flat list) and "Client" (per-client
// cluster headers). Legacy URLs with `?group=status` fall back to
// the default `due` via nuqs's `parseAsStringLiteral` rejection.

export const GROUP_OPTIONS = ['due', 'client'] as const

export type ObligationQueueGroup = (typeof GROUP_OPTIONS)[number]

export const DEFAULT_GROUP: ObligationQueueGroup = 'due'

export const DEADLINE_TIP_REFRESH_POLL_INTERVAL_MS = 3_000

export const DEADLINE_TIP_REFRESH_TIMEOUT_MS = 60_000

export const EMPTY_OBLIGATION_QUEUE_ROWS: ObligationQueueRow[] = []

export const EMPTY_ASSIGNEES: MemberAssigneeOption[] = []

export const EMPTY_DOCUMENT_CHECKLIST: ReadinessDocumentChecklistItemPublic[] = []

export const EMPTY_FACET_OPTIONS: FilterOption[] = []

export const EMPTY_CLIENT_OPTIONS: ClientFilterOption[] = []

export const INITIAL_CURSOR: ObligationQueueCursor = null

export const PAGE_SIZE = 50
// Client-side pagination window over the cumulative useInfiniteQuery
// buffer. The page size is now derived from the viewport height
// (2026-05-26, /deadlines sixty-fifth pass #14) so the table fills
// the screen with as many rows as fit and the user never gets a
// "half-full page above the pagination footer" view on short
// monitors or a "scroll to see anything" view on tall monitors.
// See `useResponsivePageSize` below — the floor/ceil + per-row
// estimate live there. The constants here are clamp bounds so the
// table never collapses to <8 rows or balloons past ~40 even on
// huge displays (40 already taxes scan readability).

export const CLIENT_PAGE_SIZE_MIN = 8

export const CLIENT_PAGE_SIZE_MAX = 40
// Estimated per-row height in the current rendering. 56px = h-14
// (the canonical workbench-table row height shared with /clients +
// /rules/library after the 2026-05-26 cross-table element unify
// pass). Was 48 briefly during a tighter-density experiment; bumped
// back so all three tables share the same row pitch. If row chrome
// changes again, re-measure with a quick `getBoundingClientRect().
// height` test and adjust — undershooting fills the viewport
// partially, overshooting scrolls.

export const CLIENT_ROW_HEIGHT_PX = 56
// Page chrome above + below the rows: page header + breadcrumb +
// filter scope-tabs + filter action-chips + table header + pagination
// footer + page bottom padding ≈ 320-360px. We pick 360 to leave
// a small buffer so the last row is never clipped under the
// footer. If the chrome grows or shrinks materially, tune here.
// PAGE_CHROME_PX retired 2026-05-26 — responsive page size now
// measures the scroll container's clientHeight directly, see
// useResponsivePageSize. INSIDE_CHROME_PX replaces this constant
// (defined near the hook).

export const REPLACE_HISTORY_OPTIONS = { history: 'replace' } as const

export const DAYS_FILTER_MIN = -3650

export const DAYS_FILTER_MAX = 3650

export const THIS_WEEK_MAX_DAYS = 7

export const INSIDE_CHROME_PX = 96

export const DAY_MS = 86_400_000
// OBLIGATION_QUEUE_TABLE_PILL_CLASSNAME retired 2026-05-26 with the
// sixty-fifth pass #17 DueDaysPill cleanup — the Badge wrapper was
// dropped so the shared text-xs token is no longer in use.
// Width of the Due column. Tokenized so the magic-number doesn't fight
// long client-name wraps if the table layout shifts.

export const OBLIGATION_QUEUE_DUE_COL_WIDTH = 'min-w-[148px]'

export const NON_HIDEABLE_COLUMNS = new Set(['select'])
// Columns that ship hidden by default and are opt-in via the
// Columns dropdown. The default visible set was trimmed to 6
// (2026-05-21) — Select · Client · Form · Status · Due · Owner —
// per design call: 12 columns is too much for skim-reading, and
// power users can opt into the rest from the Columns menu. Smart
// Priority is hidden by default but the queue still sorts by it
// (sort=smart_priority); enable it from the menu when you want
// the tier label rendered as a cell.

export const DEFAULT_HIDDEN_COLUMN_IDS = [
  'smartPriority',
  'clientState',
  'clientCounty',
  'dueDateExact',
  'daysUntilDue',
  'evidenceCount',
] as const
// Columns that auto-collapse when the detail panel is open.
// 2026-05-25 (Yuqi Deadlines #11): widened the auto-hide set to
// keep only Client + Internal Due in the queue while the drawer is
// open. Status / Priority / Days-until-due all repeat information
// the drawer header / body already surfaces for the focused
// obligation, and the queue here only needs to support row-to-row
// navigation — name + when-it's-due. State / County / Tax type /
// Assignee / Evidence were already in the auto-hide set from the
// earlier 2026-05-21 panel-fit pass for the same reason (panel
// header carries them). On close, the user's saved column choices
// come back because we strip the auto-hidden set from the saved
// `hidden` URL state before persisting (see onColumnVisibilityChange).
// 2026-05-26 (Yuqi feedback #8): the auto-hide set when the right
// panel is open shrunk significantly. Yuqi's call: task/deadline
// (taxType + daysUntilDue) and status should stay visible alongside
// the client name so the table still tells the row's primary story
// even with a 600px panel claiming half the width. Now only the
// secondary / state-cluster columns auto-hide; the row anchor
// (Client + Form + Due + Status) survives the panel-open layout.

export const PANEL_OPEN_AUTO_HIDDEN_COLUMN_IDS = [
  'clientState',
  'clientCounty',
  'assigneeName',
  'evidenceCount',
  'smartPriority',
] as const

export const OBLIGATION_QUEUE_ROW_CONTROL_SELECTOR =
  'button,a[href],input,label,select,textarea,[role="button"],[role="checkbox"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="option"],[role="radio"],[role="tab"],[data-slot="checkbox"]'

// 2026-05-27 (Yuqi drawer parity — match AlertDetailDrawer):
// the obligation detail panel now shares the alerts panel's
// width contract and motion choreography. The flex slot opens
// from 0 → 60% (matching the alerts panel in
// AlertsListPage.tsx L838-867), the inner surface rises from
// y:'100%' → 0 on enter, dissolves opacity → 0 on exit. Same
// ease-apple curve, same durations as the alert drawer so the
// two right-rail panels read as siblings.

export const DETAIL_SWIFT_EASE = [0.32, 0.72, 0, 1] as const
// 2026-05-27 (Yuqi feedback "remove width:60%" + "responsive也都
//是没有的"): dropped the hardcoded width animation. Sizing is now
// CSS-class driven (responsive: full width on narrow, 3/5 at xl+,
// max-capped so ultra-wide doesn't bloat the drawer past usefulness).
// Animation switched from width-interpolation to x-transform so the
// slide-in works regardless of the final width value.

export const DETAIL_PANEL_OPEN_ANIM = {
  x: 0,
  opacity: 1,
  transition: { duration: 0.3, ease: DETAIL_SWIFT_EASE },
} as const

export const DETAIL_PANEL_CLOSE_ANIM = {
  x: '100%',
  opacity: 0,
  transition: { duration: 0.28, ease: DETAIL_SWIFT_EASE },
} as const
// 2026-05-27 (Yuqi drawer parity): paper-rise enter matches
// AlertDetailDrawer's inner choreography (y:100%→0, 0.64s
// duration, 0.14s delay) — the surface visibly extrudes from
// below the slot. Exit collapses to opacity-only dissolve
// (0.22s) so the slot closes underneath without a slide-down
// mirror motion.

export const DETAIL_PANEL_INNER_RISE_ANIM = {
  y: 0,
  transition: { duration: 0.64, ease: DETAIL_SWIFT_EASE, delay: 0.14 },
} as const

export const DETAIL_PANEL_INNER_FADE_ANIM = {
  opacity: 0,
  transition: { duration: 0.22, ease: DETAIL_SWIFT_EASE },
} as const
// 2026-05-26 (Yuqi seventieth pass #1 — row-switch should be a
// SMALL animation, not big): drop the x-translation on the
// content swap entirely and tighten the duration. Open/close
// still uses the bigger width + paper-rise animations above; only
// the row-to-row content transition is the quick crossfade.

export const DETAIL_PANEL_CONTENT_ENTER_ANIM = {
  opacity: 1,
  transition: { duration: 0.12, ease: DETAIL_SWIFT_EASE },
} as const

export const DETAIL_PANEL_CONTENT_EXIT_ANIM = {
  opacity: 0,
  transition: { duration: 0.08, ease: DETAIL_SWIFT_EASE },
} as const

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const STATE_CODE_RE = /^[A-Z]{2}$/

export const ReadinessChecklistItemsSchema = ReadinessChecklistItemSchema.array().min(1).max(30)

export const obligationQueueSearchParamsParsers = {
  q: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  status: parseAsArrayOf(parseAsStringLiteral(ALL_STATUSES))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  obligation: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
  client: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  // Rule deep-link from the Rule library: lands the user on the
  // queue filtered to the obligations generated by one or more
  // rules. No header filter UI for this (yet) — it's a one-way
  // pre-filter set by the inbound link.
  rule: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  state: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  county: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  taxType: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  assignee: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  assignees: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  owner: parseAsStringLiteral(OWNER_FILTERS).withOptions(REPLACE_HISTORY_OPTIONS),
  due: parseAsStringLiteral(DUE_FILTERS).withOptions(REPLACE_HISTORY_OPTIONS),
  dueWithin: parseAsInteger.withOptions(REPLACE_HISTORY_OPTIONS),
  evidence: parseAsStringLiteral(EVIDENCE_FILTERS).withOptions(REPLACE_HISTORY_OPTIONS),
  // "Awaiting signature" triage lens — filed returns still waiting on the
  // client's 8879. Absent when off (no default); ?awaitingSignature=true
  // when on.
  awaitingSignature: parseAsBoolean.withOptions(REPLACE_HISTORY_OPTIONS),
  // Projected lens — projected (annual-rollover / auto-projection) deadlines
  // awaiting CPA confirmation. Absent when off; ?projected=true when on.
  projected: parseAsBoolean.withOptions(REPLACE_HISTORY_OPTIONS),
  drawer: parseAsStringLiteral(DETAIL_DRAWERS).withOptions(REPLACE_HISTORY_OPTIONS),
  id: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
  tab: parseAsStringLiteral(DETAIL_TABS)
    .withDefault('summary')
    .withOptions({ ...REPLACE_HISTORY_OPTIONS, clearOnDefault: false }),
  daysMin: parseAsInteger.withOptions(REPLACE_HISTORY_OPTIONS),
  daysMax: parseAsInteger.withOptions(REPLACE_HISTORY_OPTIONS),
  asOf: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
  sort: parseAsStringLiteral(ALL_SORTS)
    .withDefault(DEFAULT_SORT)
    .withOptions(REPLACE_HISTORY_OPTIONS),
  density: parseAsStringLiteral(DENSITY_OPTIONS)
    .withDefault(DEFAULT_DENSITY)
    .withOptions(REPLACE_HISTORY_OPTIONS),
  group: parseAsStringLiteral(GROUP_OPTIONS)
    .withDefault(DEFAULT_GROUP)
    .withOptions(REPLACE_HISTORY_OPTIONS),
  // Default-hidden columns are seeded into the `hide` param so they
  // stay off until the user opts them in via the Columns dropdown.
  // `clearOnDefault: false` keeps an empty hide=[] in the URL after
  // the user un-hides one, so a page reload doesn't snap back to the
  // default. (Without it, nuqs strips the param and the default kicks
  // back in.)
  hide: parseAsArrayOf(parseAsString)
    .withDefault([...DEFAULT_HIDDEN_COLUMN_IDS])
    .withOptions({ ...REPLACE_HISTORY_OPTIONS, clearOnDefault: false }),
  row: parseAsString.withOptions(REPLACE_HISTORY_OPTIONS),
} as const

export type ObligationQueueSearchParams = inferParserType<typeof obligationQueueSearchParamsParsers>

export type DeadlineDetailQueueSearchState = Pick<
  ObligationQueueSearchParams,
  | 'q'
  | 'status'
  | 'obligation'
  | 'client'
  | 'rule'
  | 'state'
  | 'county'
  | 'taxType'
  | 'assignee'
  | 'assignees'
  | 'owner'
  | 'due'
  | 'dueWithin'
  | 'evidence'
  | 'awaitingSignature'
  | 'projected'
  | 'daysMin'
  | 'daysMax'
  | 'asOf'
  | 'sort'
  | 'density'
  | 'group'
  | 'hide'
>

export const AUTHORITY_REJECTION_NEXT_STEPS: ReadonlySet<string> = new Set([
  'correct_resubmit',
  'request_client_input',
  'paper_file',
])

export const DUE_DAYS_TERMINAL_STATUSES: ReadonlySet<ObligationStatus> = new Set([
  'done',
  'paid',
  'completed',
  'not_applicable',
])

export const TIMELINE_TERMINAL_STAGE_KEYS: ReadonlySet<string> = new Set(['done', 'completed'])

export const TIMELINE_STAGE_KEYS = [
  'pending',
  'waiting_on_client',
  'blocked',
  'review',
  'done',
  'completed',
] as const

export type TimelineStageKey = (typeof TIMELINE_STAGE_KEYS)[number]

// Maps each strip-stage key back to the full set of lifecycle statuses
// it absorbs (e.g., the "Filed" milestone covers both `done` and `paid`).
// Used to filter the audit-event log to events that happened WHILE the
// row was sitting in this stage.

export const STAGE_STATUS_GROUPS: Record<TimelineStageKey, ReadonlySet<ObligationStatus>> = {
  pending: new Set(['pending', 'not_applicable'] as const),
  waiting_on_client: new Set(['waiting_on_client'] as const),
  blocked: new Set(['blocked'] as const),
  review: new Set(['in_progress', 'review', 'extended'] as const),
  done: new Set(['done', 'paid'] as const),
  completed: new Set(['completed'] as const),
}

// `StageTask` and `StageActions` (the render component) live in
// `@/features/obligations/StageActions`. The flavor system + rendering
// rules are documented there. ActiveStageDetailCard's useMemo below
// builds the per-stage task list.
//
// Note: task labels are populated INSIDE ActiveStageDetailCard via
// useLingui's `t` (see useMemo below). Earlier we factored this out
// to a standalone `canonicalTasksForStage(stageKey, row, t)` helper,
// but Lingui's `@lingui/react/macro` only transforms `t\`...\``
// patterns when `t` is in scope from `useLingui()` or imported from
// the macro module — passing `t` as a function PARAMETER caused the
// macro to skip transformation, and the labels rendered empty.
// Keeping the logic inline trades a little verbosity for guaranteed
// macro coverage.

// Humanize an audit-event action string for the "Done this stage"
// list. The action vocabulary is server-defined; until we have a
// proper label map this is a best-effort de-snake. Prototype only.

export type PastStageEntry = {
  stageKey: TimelineStageKey
  entryAt: string
  exitAt: string
  events: AuditEventPublic[]
}

export const EFILE_PIPELINE_KEYS = [
  'authorization_requested',
  'authorization_signed',
  'ready_to_submit',
  'submitted',
  'accepted',
  'final_package_delivered',
] as const

export const PAYMENT_PIPELINE_KEYS = [
  'estimate_needed',
  'client_approval_needed',
  'scheduled',
  'confirmed',
] as const

// In-Review workflow shown to CPAs. The database keeps finer-grained
// prep/review columns for auditability, but the drawer should not
// expose every internal flag as a separate "step" — it made freshly
// generated review rows look like they had already jumped to step 4.
// Collapse the work into the three business states a preparer expects:
// prepare the return, review the return, then file it.

export const REVIEW_PIPELINE_KEYS = [
  'preparing_return',
  'reviewing_return',
  'ready_to_file',
] as const

export type ReviewPipelineKey = (typeof REVIEW_PIPELINE_KEYS)[number]

export const TIMELINE_STAGE_COUNT = 6

// Earliest audit-event timestamp per timeline stage. The lifecycle is
// not strictly linear (a row can ping-pong between waiting_on_client
// and blocked, or come back to in_review after a rejection), so we
// stamp each stage at its FIRST entry rather than the latest.
//
// 2026-05-24 (re-critique): the previous shape took a `stageKeys`
// param that looked like it controlled matching, but actually only
// sized the array — matching was driven by `timelineIndexForStatus`.
// Dropped the misleading argument; the array length is now an
// explicit module constant aligned with the index function above.
