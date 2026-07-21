import { Hono } from 'hono'

import { SocialAlertRefSchema, SocialAlertTeaserSchema } from '@duedatehq/contracts'
import { createDb, makeSocialOpsRepo } from '@duedatehq/db'

import type { ContextVars, Env } from '../env'

// Public acquisition API. It intentionally exposes only the exact teaser
// already published on X plus agency/jurisdiction labels. Full Pulse evidence,
// source links, dates, and firm impact remain behind the authenticated RPC.
export const socialAlertsRoute = new Hono<{ Bindings: Env; Variables: ContextVars }>().get(
  '/:ref/teaser',
  async (c) => {
    const parsedRef = SocialAlertRefSchema.safeParse(c.req.param('ref'))
    if (!parsedRef.success) return c.json({ error: 'Not found' }, 404)

    const teaser = await makeSocialOpsRepo(createDb(c.env.DB)).getPublishedTeaserByRef(
      parsedRef.data,
    )
    if (!teaser) return c.json({ error: 'Not found' }, 404)

    const payload = SocialAlertTeaserSchema.parse(teaser)
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=900')
    return c.json(payload)
  },
)
