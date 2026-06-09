import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DestructiveChangePreviewTone = 'remove' | 'add' | 'keep'

type DestructiveChangePreviewLine = {
  tone: DestructiveChangePreviewTone
  label: ReactNode
  detail: ReactNode
}

const toneClassName: Record<DestructiveChangePreviewTone, string> = {
  remove: 'text-text-destructive',
  add: 'text-text-success',
  keep: 'text-text-secondary',
}

function DiffGlyph({ tone }: { tone: DestructiveChangePreviewTone }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={cn('size-4 shrink-0', toneClassName[tone])}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {tone === 'remove' ? <path d="M4 8h8" /> : null}
      {tone === 'add' ? (
        <>
          <path d="M8 4v8" />
          <path d="M4 8h8" />
        </>
      ) : null}
      {tone === 'keep' ? <path d="m3.5 8.5 3 3 6-7" /> : null}
    </svg>
  )
}

export function DestructiveChangePreview({
  title,
  lines,
}: {
  title?: ReactNode
  lines: readonly DestructiveChangePreviewLine[]
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-divider-regular bg-background-subtle p-3">
      {title ? <p className="text-sm font-medium text-text-primary">{title}</p> : null}
      <div className="grid gap-2">
        {lines.map((line) => (
          <div
            key={line.tone}
            className="grid grid-cols-[20px_72px_minmax(0,1fr)] items-start gap-2 text-sm"
          >
            <DiffGlyph tone={line.tone} />
            <span className={cn('font-medium', toneClassName[line.tone])}>{line.label}</span>
            <span className="min-w-0 text-text-secondary">{line.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
