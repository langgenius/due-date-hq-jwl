'use client'

import * as React from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-xs text-text-primary', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        // `bg-background-subtle` mirrors the Coverage / Sources / Rule
        // library / Temporary tables, which are the visual reference for
        // every other workbench table. Baking it into the primitive
        // means new tables inherit the right header tone without each
        // call site having to remember the override.
        'bg-background-subtle [&_tr]:border-b [&_tr]:border-divider-regular [&_tr]:hover:bg-transparent',
        className,
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      // 2026-05-26 (Yuqi follow-up — "I still want the table body to
      // be opacity 50% white. apply this to all table"): TableBody
      // carries `bg-background-default/50`. Sits softer than the
      // solid-gray thead, so rows read as a calmer alpha-white wash
      // against the page-gray bg behind the card. One primitive
      // change covers all three workbench tables.
      className={cn('bg-background-default/50 [&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t border-divider-regular bg-background-section font-medium [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-divider-subtle transition-colors hover:bg-state-base-hover has-aria-expanded:bg-state-base-hover data-[state=selected]:bg-state-accent-hover',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      // 2026-05-26 (Yuqi inset-followups H — table header canonical):
      // dropped the small-caps caption style (`text-xs uppercase
      // tracking-[0.08em] text-text-tertiary`) in favor of the
      // /deadlines canonical (`text-sm font-medium normal-case
      // text-text-secondary`). The uppercase + kicker tracking read
      // as a meta label, not a column header — especially next to
      // text-sm body content below. Documented in
      // docs/Design/inset-surface-design-system.md (Table chrome
      // canonical). Every table inherits this default; any consumer
      // that still wants the old style can override via the
      // `className` prop.
      className={cn(
        'h-9 px-3 text-left align-middle text-sm font-medium whitespace-nowrap text-text-secondary [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-xs text-text-tertiary', className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
