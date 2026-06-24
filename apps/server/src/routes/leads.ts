import { Hono } from 'hono'
import * as z from 'zod'
import { createDb } from '@duedatehq/db'
import { marketingLead } from '@duedatehq/db/schema/marketing-lead'
import type { ContextVars, Env } from '../env'
import { logServerError } from '../middleware/logger'

/**
 * Marketing questionnaire lead capture ("3 months of Team free").
 *
 * PUBLIC, no-credentials form POST. Mounted with permissive CORS + IP
 * rate-limiting in app.ts. A `_gotcha` honeypot field silently drops bot
 * submissions (returns ok without writing a row).
 */
const LeadInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  firm: z.string().trim().max(200).optional(),
  focus: z.string().trim().max(200).optional(),
  tools: z.array(z.string().trim().max(80)).max(20).optional(),
  pain: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(80).optional(),
  locale: z.string().trim().max(80).optional(),
})

export const leadsRoute = new Hono<{ Bindings: Env; Variables: ContextVars }>()

leadsRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (body === null || typeof body !== 'object') {
    return c.json({ ok: false, error: 'invalid' }, 400)
  }

  // Honeypot: a real visitor never fills the hidden `_gotcha` field. Pretend
  // success so bots don't learn the field is being checked.
  if (typeof body._gotcha === 'string' && body._gotcha.length > 0) {
    return c.json({ ok: true })
  }

  const parsed = LeadInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: 'invalid' }, 400)
  }
  const { name, email, firm, focus, tools, pain, source, locale } = parsed.data

  try {
    await createDb(c.env.DB)
      .insert(marketingLead)
      .values({
        id: crypto.randomUUID(),
        name,
        email,
        firm: firm ?? null,
        focus: focus ?? null,
        tools: tools ?? null,
        pain: pain ?? null,
        source: source ?? null,
        locale: locale ?? null,
        ipAddress: c.req.header('cf-connecting-ip') ?? null,
        userAgent: c.req.header('user-agent') ?? null,
      })
    return c.json({ ok: true })
  } catch (error) {
    logServerError({
      boundary: 'hono',
      error,
      requestId: c.get('requestId'),
      method: c.req.method,
      path: c.req.path,
      status: 500,
    })
    return c.json({ ok: false }, 500)
  }
})
