import { useState } from 'react'
import { Astroid, UserRoundIcon } from 'lucide-react'

import { getAssigneeTint } from '@/lib/assignee-tint'
import { initialsFromName } from '@/lib/auth'
import { cn } from '@/lib/utils'

// Assignee avatar — circle with up-to-2-letter initials. Picks
// up the existing initialsFromName helper used by the global user
// menu so vocabulary stays consistent. `isMine` swaps the background
// to a soft accent tint + accent text — gives a quiet "this is your
// row" cue without an extra YOU chip. Name lives in the title
// (tooltip) so the column stays compact.
//
// The non-self path resolves a per-name tint via the shared
// `getAssigneeTint` helper so the same person → same color → same
// visual identity across every owner column in the app.
//
// Consolidated avatar primitive with `size`, `type`, `image`, and
// null-name support so 8+ hand-rolled circular avatars
// (audit-log-table, members-page, ClientDetailWorkspace ×4,
// ClientFactsWorkspace, app-shell-user-menu, app-shell-nav firm
// switcher) can collapse onto this primitive. The defaults are
// size='md', type='human', name required.
//
// Variant map:
//   size='xs' → size-5 (20px), text-caption-xs, icon size-3
//   size='sm' → size-7 (28px), text-xs, icon size-3.5
//   size='md' → size-8 (32px), text-sm, icon size-4  (default)
//   size='lg' → size-10 (40px), text-base, icon size-5
//
//   type='human' (default) → initials + isMine/tint background
//   type='ai'              → bg-state-accent-hover + Astroid glyph
//   type='unassigned'      → bg-background-subtle + UserRoundIcon
//                            (also triggered automatically when
//                            `name === null` so callers don't have
//                            to branch upstream)
//   type='firm'            → brand-primary tile, inverted text. Pair
//                            with shape='square' for workspace
//                            monograms (firm switcher).
//
//   shape='round' (default) → rounded-full (avatars).
//   shape='square'          → rounded-lg (firm monograms / workspace
//                             identity tiles).
//
//   image (optional) → renders <img> inside the same shape-aware
//   wrapper with overflow-hidden; on load error, falls back to
//   initials (or unassigned glyph if `name === null`).
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type AvatarType = 'human' | 'ai' | 'unassigned' | 'firm'
type AvatarShape = 'round' | 'square'

const sizeStyles: Record<AvatarSize, { box: string; text: string; icon: string }> = {
  xs: { box: 'size-5', text: 'text-caption-xs', icon: 'size-3' },
  sm: { box: 'size-7', text: 'text-xs', icon: 'size-3.5' },
  md: { box: 'size-8', text: 'text-sm', icon: 'size-4' },
  lg: { box: 'size-10', text: 'text-base', icon: 'size-5' },
  // 2026-06-10: `xl` (size-16/64px) for the hero profile avatar on
  // /settings/profile (was a one-off `size-[72px]` circle).
  xl: { box: 'size-16', text: 'text-xl', icon: 'size-6' },
}

export function AssigneeAvatar({
  name,
  isMine = false,
  title,
  size = 'md',
  type,
  image,
  shape = 'round',
  className,
}: {
  name: string | null
  isMine?: boolean
  title: string
  size?: AvatarSize
  type?: AvatarType
  image?: string | null
  shape?: AvatarShape
  className?: string
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const resolvedType: AvatarType = type ?? (name === null ? 'unassigned' : 'human')
  const styles = sizeStyles[size]
  const baseClasses = cn(
    'inline-flex items-center justify-center font-semibold uppercase tracking-tight',
    shape === 'square' ? 'rounded-lg' : 'rounded-full',
    styles.box,
    styles.text,
    className,
  )

  if (image && !imageFailed) {
    return (
      <span aria-label={title} title={title} className={cn(baseClasses, 'overflow-hidden')}>
        <img
          src={image}
          alt=""
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </span>
    )
  }

  if (resolvedType === 'ai') {
    return (
      <span
        aria-label={title}
        title={title}
        className={cn(baseClasses, 'bg-state-accent-hover text-text-accent')}
      >
        <Astroid className={styles.icon} aria-hidden />
      </span>
    )
  }

  if (resolvedType === 'unassigned') {
    return (
      <span
        aria-label={title}
        title={title}
        className={cn(baseClasses, 'bg-background-subtle text-text-tertiary')}
      >
        <UserRoundIcon className={styles.icon} aria-hidden />
      </span>
    )
  }

  // Firm/workspace monogram — always paired with shape='square'
  // typically. Brand-primary fill + inverted text matches the
  // app-shell firm switcher visual. The company monogram gets a
  // faint light hairline (border-white/15) so the dark tile reads a
  // touch softer / lifted against the rail.
  const initials = initialsFromName(name ?? '')
  if (resolvedType === 'firm') {
    return (
      <span
        aria-hidden
        translate="no"
        title={title}
        className={cn(
          baseClasses,
          'rounded-lg border border-white/15 bg-brand-primary text-text-inverted',
        )}
      >
        {initials || 'DD'}
      </span>
    )
  }

  // Human path — always has a name here (null name was routed to
  // unassigned above), so initials are safe.
  return (
    <span
      aria-label={title}
      title={title}
      className={cn(
        baseClasses,
        isMine ? 'bg-state-accent-hover-alt text-text-accent' : getAssigneeTint(name ?? ''),
      )}
    >
      {initials}
    </span>
  )
}
