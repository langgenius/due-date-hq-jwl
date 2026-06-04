import * as z from 'zod'

/**
 * `morning-sweep@v1` — daily-briefing summarization for the
 * /rules/pulse "My morning sweep" surface.
 *
 * 2026-06-04 round 49–50 (Yuqi "My morning sweep can be an AI
 * generated summary of the Alerts"). Phase 1 shipped a client-side
 * mock; Phase 2 (this module) moves the generation to a real LLM
 * call via Cloudflare AI Gateway, mirroring the `pulse-extract`
 * pattern. Phase 3 adds named-client personalisation by including
 * affected-client previews in the input.
 *
 * Design constraints — see `MorningSweepInputSchema` field docs:
 *
 *   • Input is BOUNDED by the LLM's input budget. We cap input
 *     alerts to the last 24h × top-50 by impact tier, and clip the
 *     affectedClientNames preview to 5 per alert.
 *   • Output is STRICT JSON with bounded prose length per field —
 *     this is a briefing, not an essay. Hard caps on `headline`
 *     (≤ 20 words), `bullets` (3 items × ≤ 28 words each),
 *     `topActions` (3 items × ≤ 30 words each).
 *   • Citation refs use the alert IDs from input so the client can
 *     deep-link from the briefing back into the list.
 *
 * Calling site: `apps/server/src/procedures/pulse/index.ts`
 * `morningSweepSummary` procedure. Cached in `aiOutput` table
 * with a firm-scoped "today" key (truncated to start-of-day UTC)
 * so the same firm gets at most one generation per morning.
 */

export const MorningSweepAlertSchema = z.object({
  /** Alert ID — used for citationRefs in the output. */
  id: z.string(),
  title: z.string().min(1),
  summary: z.string().nullable(),
  /** Source publisher name e.g. "IRS Disaster Relief", "FL DOR Bulletin". */
  source: z.string(),
  jurisdiction: z.string(),
  /** ISO date — published timestamp from the pulse alert. */
  publishedAt: z.string(),
  /**
   * Severity tier derived server-side from confidence + workflow
   * status. The LLM receives this as a pre-computed signal so it
   * doesn't have to reason about confidence scores itself.
   */
  severity: z.enum(['high', 'medium', 'low']),
  changeKind: z
    .enum([
      'deadline_shift',
      'filing_requirement',
      'applicability_scope',
      'form_instruction',
      'source_status',
      'new_obligation',
      'other',
    ])
    .nullable(),
  /** N of the firm's clients matched by this alert. */
  matchedClientCount: z.number().int().min(0),
  /** Up to 5 affected client names — Phase 3 personalisation. Empty if none. */
  affectedClientNames: z.array(z.string()).max(5).default([]),
})
export type MorningSweepAlert = z.infer<typeof MorningSweepAlertSchema>

export const MorningSweepInputSchema = z.object({
  /** Firm display name — drives prose like "Acme's morning sweep". Nullable for unauthed contexts. */
  firmName: z.string().nullable(),
  /** ISO timestamp marking "now" — drives the 24h cutoff. */
  generatedAt: z.string(),
  /** Alerts inside the 24h window, ranked server-side by impact tier desc → client-count desc. */
  alerts: z.array(MorningSweepAlertSchema).max(50),
})
export type MorningSweepInput = z.infer<typeof MorningSweepInputSchema>

export const MorningSweepOutputSchema = z.object({
  /** One-sentence anchor — what the CPA reads first. ≤ 20 words. */
  headline: z.string().min(1),
  /**
   * 2-3 short body paragraphs summarising the overnight changes,
   * urgency framing, and client-roster impact. Each ≤ 28 words so
   * the briefing fits the dialog without scrolling.
   */
  bullets: z.array(z.string().min(1)).min(0).max(3),
  /**
   * Top 3 alerts the CPA should action first. Each names the
   * alert + a concrete "why this matters now" sentence + which
   * clients are affected if any (Phase 3 personalisation).
   */
  topActions: z
    .array(
      z.object({
        alertId: z.string(),
        /** Alert headline as the LLM saw it — copy through for client matching. */
        title: z.string(),
        /** ≤ 30-word "why this matters now" framing. */
        whyNow: z.string().min(1),
        /** Client mentions surfaced from `affectedClientNames` input. Empty if N/A. */
        clientMentions: z.array(z.string()).max(5).default([]),
      }),
    )
    .max(3),
  /** Optional closing nudge — "Reach out before noon if X applies." ≤ 18 words. */
  footer: z.string().nullable().optional(),
})
export type MorningSweepOutput = z.infer<typeof MorningSweepOutputSchema>
