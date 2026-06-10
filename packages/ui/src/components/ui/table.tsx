'use client'

import * as React from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

// 2026-06-04 (Yuqi "ensure all of the tables in this app are
// having the same style"): canonical table chrome lives here, in
// the primitive — every table across the app inherits it without
// each callsite needing to remember the override stack.
//
// Canonical recipe (from /today ActionsTable, the visual
// reference):
//   • Container wrapper: rounded-xl + hairline border +
//     bg-background-default + overflow-hidden
//   • TableHeader bg: bg-background-section (gray-50, quiet
//     inset); 1px bottom border-divider-subtle
//   • TableHead: text-xs font-semibold tracking-[0.5px]
//     uppercase text-text-tertiary; px-5 py-3
//   • TableRow body: border-b border-divider-subtle; zebra
//     stripe on even rows (bg-background-section/40); hover
//     bg-state-base-hover; cursor-pointer when row carries
//     onClick (callsite adds it)
//   • TableCell: px-5 py-4 align-middle text-sm text-text-primary
//   • TableFooter: bg-background-section font-medium with a
//     top divider — matches the header inset weight
//
// Callsites that want a different look pass classNames; the
// primitive's defaults are what every table looks like by
// default.

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  // The outer wrapper stays minimal so callsites can wrap the
  // table in their own bordered/rounded container (some surfaces
  // need a tier-accent left border, a heavier shadow, etc). The
  // canonical "wrap me in a rounded card" recipe is:
  //
  //   <div className="overflow-hidden rounded-xl border
  //                   border-divider-subtle bg-background-default">
  //     <Table>...</Table>
  //   </div>
  return (
    <div data-slot="table-container" className="relative w-full">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm text-text-primary', className)}
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
        // bg-background-section is the canonical header inset
        // tone — gray-50, lighter than bg-background-subtle
        // (gray-100). The previous default (background-subtle)
        // read too dark against the table body wash.
        'bg-background-section [&_tr]:border-b [&_tr]:border-divider-subtle [&_tr]:hover:bg-transparent',
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
      className={cn('bg-background-default [&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t border-divider-subtle bg-background-section font-medium [&>tr]:last:border-b-0',
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
        // Zebra striping (even-row tint) is part of the canonical
        // body — gives adjacent rows visual separation even when
        // content is short. Hover overlays cleanly.
        'border-b border-divider-subtle transition-colors even:bg-background-section/40 hover:bg-state-base-hover has-aria-expanded:bg-state-base-hover data-[state=selected]:bg-state-accent-hover',
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
      // Canonical column-label style: 11/600 uppercase tracking
      // tertiary. Reads as caption-tier meta, not body text —
      // visually subordinate to the row content below.
      className={cn(
        'px-5 py-3 text-left align-middle text-xs font-semibold tracking-[0.5px] text-text-tertiary uppercase whitespace-nowrap [&:has([role=checkbox])]:pr-0',
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
      // Canonical cell padding: px-5 py-4 (20px / 16px) — Pencil's
      // VmcdD row dimensions. align-middle keeps cells vertically
      // centered (previously align-top read as cramped on rows
      // with short content).
      className={cn(
        'px-5 py-4 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0',
        className,
      )}
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
