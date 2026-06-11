import { Hono } from 'hono'
import type { ContextVars, Env } from '../env'
import { seedBackfillFromBaselineSnapshots } from '../jobs/pulse/backfill'

// Operator-only surface for one-shot maintenance jobs. Same access model as
// the e2e seed routes: open in development, token-gated in staging, absent
// (404) everywhere else — never reachable by tenant traffic.
function hasOpsAccess(c: { env: Env; req: { header(name: string): string | undefined } }) {
  if (c.env.ENV === 'development') return true
  const token = c.env.E2E_SEED_TOKEN
  if (c.env.ENV !== 'staging' || !token) return false
  const header = c.req.header('authorization')
  return header === `Bearer ${token}` || c.req.header('x-e2e-seed-token') === token
}

interface PulseBackfillRequest {
  sourceIds?: unknown
  limit?: unknown
}

export const opsRoute = new Hono<{ Bindings: Env; Variables: ContextVars }>().post(
  '/pulse-backfill',
  async (c) => {
    if (!hasOpsAccess(c)) {
      return c.notFound()
    }
    const body = (await c.req.json().catch(() => ({}))) as PulseBackfillRequest
    const sourceIds = Array.isArray(body.sourceIds)
      ? body.sourceIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : []
    if (sourceIds.length === 0) {
      return c.json({ error: 'sourceIds (non-empty string array) is required' }, 400)
    }
    const limit = typeof body.limit === 'number' ? body.limit : undefined
    const result = await seedBackfillFromBaselineSnapshots(c.env, {
      sourceIds,
      ...(limit !== undefined ? { limit } : {}),
    })
    return c.json(result)
  },
)
