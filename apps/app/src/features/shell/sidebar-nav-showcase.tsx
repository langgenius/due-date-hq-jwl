import { useState, type ComponentType } from 'react'
import {
  ArchiveIcon,
  CalendarPlusIcon,
  FileTextIcon,
  InboxIcon,
  LayersIcon,
  SendIcon,
  SettingsIcon,
  StarIcon,
  TrashIcon,
  type LucideProps,
} from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * SidebarNavShowcase — a /preview-only exploration of a SECTIONED sidebar nav
 * (ref: the Acme email client sidebar). It groups nav rows under quiet
 * eyebrow labels ("Create" / "Operations"), each row carrying a leading
 * lucide icon, a label, and a right-aligned muted count. The selected row is
 * a SOLID accent pill (white text + icon + count).
 *
 * This is deliberately a DIFFERENT register from the live app rail
 * (`app-shell-nav.tsx`), whose canon is bg-only tint (`bg-accent-tint` +
 * `text-text-accent`, see DESIGN §1.2/§4.9). The solid pill here is the Acme
 * "filled selection" pattern surfaced as a showcase candidate, not a change to
 * the shipped rail. The active fill uses the canonical `bg-state-accent-solid`
 * token (same token the Badge `accent-solid` variant rides), so the chroma
 * lives in the container and the text is the inverted/white token — no colored
 * text on the dark fill.
 *
 * Self-contained: demo data + local selection state, no app data deps. Not
 * imported anywhere yet (the /preview route is wired separately).
 *
 * i18n note: user-facing strings are kept as plain literals on purpose — this
 * is a /preview showcase component and we do NOT want `i18n:extract` to pull a
 * parallel session's WIP catalog. Real consumers would route these through the
 * `t` macro like the live rail does.
 */

type ShowcaseNavRow = {
  id: string
  label: string
  icon: ComponentType<LucideProps>
  /** Right-aligned reference count. Omitted rows render no trailing number. */
  count?: number
}

type ShowcaseNavSection = {
  /** Uppercase eyebrow that orients the group ("Create" / "Operations"). */
  label: string
  rows: ShowcaseNavRow[]
}

const NAV_SECTIONS: ShowcaseNavSection[] = [
  {
    label: 'Create',
    rows: [
      { id: 'compose', label: 'Compose', icon: CalendarPlusIcon },
      { id: 'drafts', label: 'Drafts', icon: FileTextIcon, count: 3 },
      { id: 'scheduled', label: 'Scheduled', icon: SendIcon, count: 1 },
    ],
  },
  {
    label: 'Operations',
    rows: [
      { id: 'inbox', label: 'Inbox', icon: InboxIcon, count: 24 },
      { id: 'starred', label: 'Starred', icon: StarIcon, count: 6 },
      { id: 'batches', label: 'Batches', icon: LayersIcon, count: 12 },
      { id: 'archive', label: 'Archive', icon: ArchiveIcon, count: 318 },
      { id: 'trash', label: 'Trash', icon: TrashIcon },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
]

const DEFAULT_ACTIVE_ID = 'inbox'

function formatCount(value: number): string {
  // Cap long counts so the trailing number never crowds the label. 99+ is the
  // same ceiling the live rail's inventory badge uses for at-a-glance reads.
  return value > 99 ? '99+' : String(value)
}

function SidebarNavRow({
  row,
  active,
  onSelect,
}: {
  row: ShowcaseNavRow
  active: boolean
  onSelect: (id: string) => void
}) {
  const Icon = row.icon
  return (
    <li>
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={() => onSelect(row.id)}
        className={cn(
          // Row chrome: rounded-lg (8 — the button/input radius), 32px tall,
          // symmetric 11px inset so the leading icon column lines up across
          // every row. transition limited to color/bg/transform + an
          // active:scale press for a crafted feel; motion-reduce drops it.
          'group/row flex h-8 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm font-normal outline-none',
          'transition-[color,background-color,transform] active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100',
          'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
          active
            ? // Selected = SOLID accent pill. Chroma lives in the container;
              // label, icon and trailing count all ride the inverted/white
              // text token so nothing is colored text on the fill.
              'bg-state-accent-solid text-text-inverted'
            : // Inactive: quiet secondary label, tertiary icon (a step
              // quieter than the label), neutral hover wash — no border.
              'text-text-secondary hover:bg-state-base-hover hover:text-text-primary',
        )}
      >
        <Icon
          aria-hidden
          className={cn(
            'size-4 shrink-0 transition-colors motion-reduce:transition-none',
            active
              ? 'text-text-inverted'
              : 'text-text-tertiary group-hover/row:text-text-secondary',
          )}
        />
        <span className="min-w-0 flex-1 truncate">{row.label}</span>
        {row.count !== undefined ? (
          <span
            className={cn(
              'shrink-0 text-xs tabular-nums',
              // Muted reference number when inactive; on the solid pill it
              // lifts to the inverted token at a softened opacity so it reads
              // as secondary-on-fill rather than competing with the label.
              active ? 'text-text-inverted/80' : 'text-text-muted',
            )}
          >
            {formatCount(row.count)}
          </span>
        ) : null}
      </button>
    </li>
  )
}

function SidebarNavSection({
  section,
  activeId,
  onSelect,
}: {
  section: ShowcaseNavSection
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-col">
      {/* Eyebrow label — matches the live rail's group-label register: 10px,
          600, uppercase, wide tracking, tertiary tone. pt provides the break
          between groups; the label reads as an orientation hint, not chrome. */}
      <div
        role="presentation"
        className="flex h-7 shrink-0 items-center px-3 pt-2.5 pb-1 text-caption-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary"
      >
        {section.label}
      </div>
      <ul className="flex flex-col gap-0.5">
        {section.rows.map((row) => (
          <SidebarNavRow key={row.id} row={row} active={row.id === activeId} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  )
}

export function SidebarNavShowcase() {
  const [activeId, setActiveId] = useState<string>(DEFAULT_ACTIVE_ID)

  return (
    // Wrapper card: rounded-xl (12 — the wrapper radius), 1px border + default
    // surface for the lift (no outer shadow, per the restrained-shadows canon).
    // Fixed rail width so the showcase reads at its intended density.
    <nav
      aria-label="Sectioned navigation"
      className="flex w-64 flex-col gap-1 rounded-xl border border-divider-regular bg-background-default p-2"
    >
      {NAV_SECTIONS.map((section) => (
        <SidebarNavSection
          key={section.label}
          section={section}
          activeId={activeId}
          onSelect={setActiveId}
        />
      ))}
    </nav>
  )
}

export default SidebarNavShowcase
