import { useCallback, useState, type ComponentType, type SVGProps } from 'react'
import { XIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `InfoBanner` — slim inline tip strip that lives between page chrome
 * and a content card.
 *
 * Stripe Dashboard's `InfoBanner` pattern: a single-row light-gray
 * strip carrying a lightbulb icon, one-sentence tip, optional CTA
 * link, and a × dismiss control. Dismissals persist per-user via
 * localStorage so the banner doesn't re-appear after the user has
 * acknowledged the tip.
 *
 * Visual contract:
 *   - `h-12` slim row, `bg-background-subtle`, `border border-divider-subtle`,
 *     `rounded-lg`
 *   - Lightbulb (or any) icon on the left: `size-4 text-text-tertiary`
 *   - Message text: `text-sm text-text-secondary`
 *   - Optional CTA on the right: accent-purple link, `hover:underline`
 *   - Optional × dismiss button on the right edge that persists
 *     via localStorage when `dismissKey` is provided
 *
 * Usage:
 *   <InfoBanner
 *     icon={LightbulbIcon}
 *     message="Import clients from CSV to populate the directory faster."
 *     cta={{ label: 'Import', onClick: openWizard }}
 *     dismissKey="clients-import-tip"
 *   />
 *
 * When `dismissKey` is set and localStorage already records a dismissal
 * for that key, the component returns `null` on first render — the
 * banner doesn't even mount. When `dismissKey` is omitted, the dismiss
 * × also disappears (the banner is non-dismissable).
 */

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

type InfoBannerCta = {
  label: string
  onClick: () => void
}

type InfoBannerProps = {
  /** Lucide icon component (e.g. LightbulbIcon). */
  icon: IconComponent
  /** Single-sentence message body. */
  message: string
  /** Optional CTA link rendered on the right of the message. */
  cta?: InfoBannerCta | undefined
  /**
   * localStorage key that records the dismissal. When the key is
   * present in localStorage the banner returns `null`. Omit (or pass
   * `null` / `undefined`) for a non-dismissable banner.
   */
  dismissKey?: string | null | undefined
  /** Fires after the user clicks the × dismiss control. */
  onDismiss?: (() => void) | undefined
  className?: string | undefined
}

function readDismissed(key: string | null | undefined): boolean {
  if (!key) return false
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(key) === 'dismissed'
  } catch {
    // localStorage can throw in sandboxed iframes / privacy modes.
    // Treat unreadable storage as "not dismissed" so the tip still
    // surfaces — graceful degradation, never a hard crash.
    return false
  }
}

function writeDismissed(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, 'dismissed')
  } catch {
    // Same fallback: a failed write means the banner will reappear
    // next session, which is acceptable.
  }
}

export function InfoBanner({
  icon: Icon,
  message,
  cta,
  dismissKey,
  onDismiss,
  className,
}: InfoBannerProps) {
  // Initial state reads localStorage synchronously so the banner
  // never flashes-then-disappears for already-dismissed tips.
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(dismissKey))

  const handleDismiss = useCallback(() => {
    if (dismissKey) {
      writeDismissed(dismissKey)
    }
    setDismissed(true)
    onDismiss?.()
  }, [dismissKey, onDismiss])

  if (dismissed) return null

  const showDismiss = Boolean(dismissKey)

  return (
    <div
      role="status"
      className={cn(
        'flex h-12 items-center gap-3 rounded-lg border border-divider-subtle bg-background-subtle px-3',
        className,
      )}
    >
      <Icon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
      <p className="min-w-0 flex-1 truncate text-sm text-text-secondary">{message}</p>
      {cta ? (
        // The CTA uses the canonical `<TextLink variant="accent" size="sm">`
        // primitive (accent tone + hover-underline) with shared focus-ring
        // treatment.
        <TextLink variant="accent" size="sm" onClick={cta.onClick} className="shrink-0">
          {cta.label}
        </TextLink>
      ) : null}
      {showDismiss ? (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-text-tertiary hover:text-text-secondary"
        >
          <XIcon className="size-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  )
}
