import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Canonical uppercase label typography — the ONE home for the section-header
 * "Register B" family (see docs/Design/section-header-style.md). A single
 * primitive so the small-caps labels that classify a value / column / group
 * stop drifting into per-site recipes (the audit found 4 sizes × 2 weights ×
 * 5 trackings of the same tertiary-uppercase look).
 *
 * Two registers, picked by `variant`:
 *   - **`field`** (default, Register B2) — a label above/beside a VALUE or a
 *     field inside a detail document: `text-xs (12px) font-medium tracking-eyebrow`.
 *     Alert-drawer fact grid, audit timeline group titles, structured-field
 *     panels, form field labels.
 *   - **`group`** (Register B1) — a GROUP band or TABLE COLUMN label: a step
 *     smaller + heavier so it reads as a structural divider, not a value key:
 *     `text-caption-xs (11px) font-semibold tracking-eyebrow-tight`.
 *
 * Both share `uppercase text-text-tertiary` — color + caps are the constant;
 * only size/weight/tracking differ by register. Polymorphic via `as` so callers
 * match the surrounding semantic shape (`<dt>` in a `<dl>`, `<div>` in flow,
 * `<span>` inline, `<label>` for a control).
 */
export function FieldLabel({
  as: Tag = 'div',
  variant = 'field',
  children,
  className,
  ...rest
}: {
  as?: 'div' | 'dt' | 'span' | 'label'
  /** `field` (B2, 12px value/field label) · `group` (B1, 11px group/column band). */
  variant?: 'field' | 'group'
  children: ReactNode
  className?: string
  /** Form-control association — only meaningful with `as="label"`. */
  htmlFor?: string | undefined
  // Generic element attrs (id, aria-*, role, title, onClick, …). Typed off the
  // base `HTMLElement` — NOT a specific element — so the handlers stay assignable
  // across the polymorphic `as` (a label-typed handler would clash with div, etc.).
  // No `ref` is forwarded.
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <Tag
      className={cn(
        'uppercase text-text-tertiary',
        variant === 'group'
          ? 'text-caption-xs font-semibold tracking-eyebrow-tight'
          : 'text-xs font-medium tracking-eyebrow',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
