import {
  CircleSlash2Icon,
  DownloadIcon,
  KeyRoundIcon,
  type LucideIcon,
  PenLineIcon,
  ServerCogIcon,
  SparklesIcon,
} from 'lucide-react'

import type { AuditEventPublic } from '@duedatehq/contracts'

/**
 * Audit-timeline presentation model (Pencil `RqOJw`). The timeline
 * groups events by local calendar day and renders each as a row with a
 * type eyebrow + colored icon tile. The contract carries no per-event
 * "category" — it's a server-side *filter* input only — so we derive a
 * coarse timeline type from the action prefix, which is enough to drive
 * the icon and tint vocabulary the design specifies (FILING green,
 * AMENDMENT orange, DECISION accent, ACCESS neutral, SYSTEM muted).
 */

export type AuditTimelineType = 'filing' | 'amendment' | 'decision' | 'access' | 'system'

export interface AuditTimelineToneTokens {
  /** Tailwind classes for the icon tile background. */
  tile: string
  /** Tailwind classes for the icon glyph color. */
  icon: string
}

const TONE_TOKENS: Record<AuditTimelineType, AuditTimelineToneTokens> = {
  filing: { tile: 'bg-state-success-hover', icon: 'text-text-success' },
  amendment: { tile: 'bg-state-warning-subtle', icon: 'text-text-warning' },
  decision: { tile: 'bg-state-accent-hover', icon: 'text-text-accent' },
  access: { tile: 'bg-background-subtle', icon: 'text-text-secondary' },
  system: { tile: 'bg-background-subtle', icon: 'text-text-tertiary' },
}

const TYPE_ICON: Record<AuditTimelineType, LucideIcon> = {
  filing: DownloadIcon,
  amendment: PenLineIcon,
  decision: SparklesIcon,
  access: KeyRoundIcon,
  system: ServerCogIcon,
}

export function getAuditTimelineToneTokens(type: AuditTimelineType): AuditTimelineToneTokens {
  return TONE_TOKENS[type]
}

export function getAuditTimelineIcon(type: AuditTimelineType): LucideIcon {
  return TYPE_ICON[type]
}

/**
 * Derive the timeline type from an event. Filed obligations read as
 * FILING; amendments/un-files as AMENDMENT; apply/approve/decision-style
 * actions as DECISION; auth/access/export as ACCESS; everything else
 * (cron, migration, reminder dispatch) as SYSTEM.
 */
export function getAuditTimelineType(event: AuditEventPublic): AuditTimelineType {
  const action = event.action.toLowerCase()

  if (action.includes('filed') || action.includes('.file')) return 'filing'
  if (
    action.includes('amend') ||
    action.includes('unfile') ||
    action.includes('reopen') ||
    action.includes('revert')
  ) {
    return 'amendment'
  }
  if (
    action.startsWith('pulse.') ||
    action.includes('apply') ||
    action.includes('approve') ||
    action.includes('exception') ||
    action.includes('decision') ||
    action.includes('waive') ||
    action.includes('dismiss')
  ) {
    return 'decision'
  }
  if (action.startsWith('auth.') || action.startsWith('export.') || action.includes('login')) {
    return 'access'
  }
  return 'system'
}

export function getAuditTimelineFallbackIcon(): LucideIcon {
  return CircleSlash2Icon
}

/**
 * Local-day bucket key (YYYY-MM-DD in the firm timezone) used to group
 * timeline rows under a day band.
 */
export function auditDayKey(iso: string, timeZone: string): string {
  // en-CA yields ISO-ordered YYYY-MM-DD which sorts lexically.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

/** HH:MM (24h) in the firm timezone — the timeline row's left rail. */
export function auditTimeOfDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

/**
 * Day-band label, e.g. "Fri · Jun 5, 2026". `relativeWord` ("Today" /
 * "Yesterday") is prepended by the caller when the bucket matches the
 * current/previous local day.
 */
export function auditDayBandLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}
