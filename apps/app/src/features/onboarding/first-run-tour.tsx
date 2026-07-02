import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLingui } from '@lingui/react/macro'

import { Button } from '@duedatehq/ui/components/ui/button'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

// A short, once-only first-run tour for /today. Four steps spotlight the stable
// sidebar chrome (Today → Alerts → Deadlines → Rule library) so it orients a new
// user even when their dashboard is still empty. It anchors to the nav rows via
// their `data-tour-href` attribute (locale-proof, unlike aria-labels), dims the
// rest with a box-shadow cutout, and persists "seen" in localStorage so it never
// nags twice. Esc/arrows/Enter drive it; reduced-motion drops the easing.

const SEEN_KEY = 'ddhq:firstRunTour:v1'
const START_DELAY_MS = 650
const CARD_WIDTH = 300
const SPOTLIGHT_PAD = 5

interface TourStep {
  href: string
  title: string
  body: string
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === 'done'
  } catch {
    // Storage blocked (private mode, etc.) → don't pester.
    return true
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, 'done')
  } catch {
    /* ignore */
  }
}

function measure(href: string): Rect | null {
  const el = document.querySelector(`[data-tour-href="${href}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export function FirstRunTour() {
  const { t } = useLingui()
  const navigate = useNavigate()

  const steps = useMemo<TourStep[]>(
    () => [
      {
        href: '/',
        title: t`This is Today`,
        body: t`Your morning read — what's due, what changed overnight, and who needs you.`,
      },
      {
        href: '/alerts',
        title: t`Alerts`,
        body: t`We watch the agencies' sources 24/7. When a rule or date changes, it lands here — with who's affected.`,
      },
      {
        href: '/deadlines',
        title: t`Deadlines`,
        body: t`Every filing across the firm, in one place, ranked by urgency.`,
      },
      {
        href: '/rules/library',
        title: t`Rule library`,
        body: t`Rules are what generate your deadlines. Activate the states you file in, and the calendar fills itself.`,
      },
    ],
    [t],
  )

  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const startedRef = useRef(false)

  // Start once, shortly after mount, if unseen and the first target is anchorable.
  useEffect(() => {
    // Never auto-run in an automated browser (Playwright e2e): the overlay would
    // intercept the test's clicks on /today.
    if (typeof navigator !== 'undefined' && navigator.webdriver) return undefined
    if (startedRef.current || hasSeenTour()) return undefined
    const firstHref = steps[0]?.href
    const timer = window.setTimeout(() => {
      if (firstHref && measure(firstHref)) {
        startedRef.current = true
        setActive(true)
      } else {
        // Can't anchor (collapsed rail / mobile drawer) — skip silently, don't nag.
        markSeen()
      }
    }, START_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [steps])

  const step = steps[index]

  // Track the active target's position; re-measure on resize + scroll.
  useLayoutEffect(() => {
    if (!active || !step) return undefined
    const update = () => setRect(measure(step.href))
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [active, step])

  const finish = useCallback(() => {
    markSeen()
    setActive(false)
  }, [])

  // 2026-07-02 (ux-flow audit): the last step SAYS "activate the states you
  // file in" but the only button used to be "Done" (close overlay) — a dead
  // instruction. The final CTA now actually goes to the Rule library; the
  // quiet left-side dismiss stays for users who just want out.
  const finishToRuleLibrary = useCallback(() => {
    finish()
    void navigate('/rules/library')
  }, [finish, navigate])

  const next = useCallback(() => {
    let n = index + 1
    while (n < steps.length && !measure(steps[n]!.href)) n++
    if (n >= steps.length) {
      finish()
      return
    }
    setIndex(n)
  }, [index, steps, finish])

  const back = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  useEffect(() => {
    if (!active) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        finish()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, finish, next, back])

  if (!active || !step || !rect) return null

  const isLast = index === steps.length - 1
  const spotlight = {
    top: rect.top - SPOTLIGHT_PAD,
    left: rect.left - SPOTLIGHT_PAD,
    width: rect.width + SPOTLIGHT_PAD * 2,
    height: rect.height + SPOTLIGHT_PAD * 2,
  }
  // The nav rail is on the left, so the card sits to the right of the target,
  // clamped inside the viewport.
  const cardLeft = Math.min(rect.left + rect.width + 16, window.innerWidth - CARD_WIDTH - 16)
  const cardTop = Math.max(16, Math.min(rect.top - 6, window.innerHeight - 232))

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label={t`Quick tour`}
    >
      {/* Click-catcher — blocks the page so the tour drives navigation, not stray clicks. */}
      <div className="absolute inset-0" />

      {/* Spotlight — the box-shadow dims everything except the highlighted nav row. */}
      <div
        aria-hidden
        className="absolute rounded-xl ring-2 ring-state-accent-solid transition-all duration-300 ease-out motion-reduce:transition-none"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          boxShadow: '0 0 0 9999px rgba(16, 24, 40, 0.55)',
          pointerEvents: 'none',
        }}
      />

      {/* Step card */}
      <div
        className="absolute flex flex-col gap-3 rounded-xl border border-divider-regular bg-background-default p-4 shadow-overlay transition-all duration-300 ease-out motion-reduce:transition-none"
        style={{ top: cardTop, left: cardLeft, width: CARD_WIDTH }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-caption font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            {t`Quick tour`}
          </span>
          <span aria-hidden className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <span
                key={s.href}
                className={cn(
                  'size-1.5 rounded-full transition-colors',
                  i === index ? 'bg-state-accent-solid' : 'bg-divider-regular',
                )}
              />
            ))}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-text-primary">{step.title}</h3>
          <p className="text-sm leading-normal text-text-secondary">{step.body}</p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <TextLink variant="muted" onClick={finish} className="text-sm">
            {isLast ? t`Done` : t`Skip`}
          </TextLink>
          <div className="flex items-center gap-2">
            {index > 0 ? (
              <Button variant="ghost" size="sm" onClick={back}>
                {t`Back`}
              </Button>
            ) : null}
            <Button size="sm" onClick={isLast ? finishToRuleLibrary : next}>
              {isLast ? t`Open Rule library` : t`Next`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
