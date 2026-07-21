import process from 'node:process'
import { pathToFileURL } from 'node:url'

type Command =
  | {
      kind: 'candidates'
      status?: string
      limit?: number
      pulseId?: string
      priority?: 'normal' | 'urgent'
    }
  | { kind: 'approve'; postId: string; reviewer: string; priority?: 'normal' | 'urgent' }
  | { kind: 'cancel'; postId: string; reason: string }
  | {
      kind: 'reconcile'
      postId: string
      outcome: 'published' | 'not_published'
      externalPostId?: string
      reason?: string
    }

const USAGE = `Usage:
  pnpm social:x -- candidates [--status draft] [--limit 50]
  pnpm social:x -- candidates --pulse <pulse-id> [--priority urgent]
  pnpm social:x -- approve <post-id> [--reviewer <user-id>] [--priority urgent]
  pnpm social:x -- cancel <post-id> --reason <text>
  pnpm social:x -- reconcile <post-id> --outcome published --x-post-id <id>
  pnpm social:x -- reconcile <post-id> --outcome not_published --reason <text>

Environment:
  SOCIAL_OPS_URL       Worker origin (default: http://localhost:8787)
  SOCIAL_OPS_TOKEN     Dedicated bearer token; required outside local development
  SOCIAL_OPS_REVIEWER  Default Better Auth user ID recorded by approve`

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  if (index === -1) return undefined
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`)
  return value
}

function required(value: string | undefined, message: string): string {
  if (!value) throw new Error(message)
  return value
}

function requiredPostId(value: string | undefined, command: string): string {
  return required(
    value && !value.startsWith('--') ? value : undefined,
    `${command} requires a post ID.`,
  )
}

function priority(value: string | undefined): 'normal' | 'urgent' | undefined {
  if (value === undefined) return undefined
  if (value !== 'normal' && value !== 'urgent') {
    throw new Error('--priority must be normal or urgent.')
  }
  return value
}

export function parseSocialXCommand(args: string[], env = process.env): Command {
  const [name, postId] = args
  if (name === 'candidates') {
    const rawLimit = option(args, '--limit')
    const limit = rawLimit === undefined ? undefined : Number(rawLimit)
    const status = option(args, '--status')
    const pulseId = option(args, '--pulse')
    const parsedPriority = priority(option(args, '--priority'))
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
      throw new Error('--limit must be an integer from 1 to 100.')
    }
    return {
      kind: 'candidates',
      ...(status ? { status } : {}),
      ...(limit === undefined ? {} : { limit }),
      ...(pulseId ? { pulseId } : {}),
      ...(parsedPriority ? { priority: parsedPriority } : {}),
    }
  }
  if (name === 'approve') {
    const parsedPriority = priority(option(args, '--priority'))
    return {
      kind: 'approve',
      postId: requiredPostId(postId, 'approve'),
      reviewer: required(
        option(args, '--reviewer') ?? env.SOCIAL_OPS_REVIEWER,
        'approve requires --reviewer or SOCIAL_OPS_REVIEWER.',
      ),
      ...(parsedPriority ? { priority: parsedPriority } : {}),
    }
  }
  if (name === 'cancel') {
    return {
      kind: 'cancel',
      postId: requiredPostId(postId, 'cancel'),
      reason: required(option(args, '--reason'), 'cancel requires --reason.'),
    }
  }
  if (name === 'reconcile') {
    const outcome = option(args, '--outcome')
    if (outcome !== 'published' && outcome !== 'not_published') {
      throw new Error('reconcile requires --outcome published or not_published.')
    }
    const externalPostId = option(args, '--x-post-id')
    const reason = option(args, '--reason')
    if (outcome === 'published' && !externalPostId) {
      throw new Error('published reconciliation requires --x-post-id.')
    }
    if (outcome === 'not_published' && !reason) {
      throw new Error('not_published reconciliation requires --reason.')
    }
    return {
      kind: 'reconcile',
      postId: requiredPostId(postId, 'reconcile'),
      outcome,
      ...(externalPostId ? { externalPostId } : {}),
      ...(reason ? { reason } : {}),
    }
  }
  throw new Error(USAGE)
}

function requestFor(command: Command): { path: string; method: 'GET' | 'POST'; body?: unknown } {
  if (command.kind === 'candidates' && command.pulseId) {
    return {
      path: '/api/ops/social/candidates',
      method: 'POST',
      body: { pulseId: command.pulseId, priority: command.priority },
    }
  }
  if (command.kind === 'candidates') {
    const query = new URLSearchParams()
    if (command.status) query.set('status', command.status)
    if (command.limit) query.set('limit', String(command.limit))
    return {
      path: `/api/ops/social/candidates${query.size ? `?${query}` : ''}`,
      method: 'GET',
    }
  }
  if (command.kind === 'approve') {
    return {
      path: `/api/ops/social/${encodeURIComponent(command.postId)}/approve`,
      method: 'POST',
      body: { approvedBy: command.reviewer, priority: command.priority },
    }
  }
  if (command.kind === 'cancel') {
    return {
      path: `/api/ops/social/${encodeURIComponent(command.postId)}/cancel`,
      method: 'POST',
      body: { reason: command.reason },
    }
  }
  return {
    path: `/api/ops/social/${encodeURIComponent(command.postId)}/reconcile`,
    method: 'POST',
    body: {
      outcome: command.outcome,
      externalPostId: command.externalPostId,
      reason: command.reason,
    },
  }
}

async function main() {
  const command = parseSocialXCommand(process.argv.slice(2))
  const request = requestFor(command)
  const origin = process.env.SOCIAL_OPS_URL ?? 'http://localhost:8787'
  const url = new URL(request.path, origin)
  const headers = new Headers({ accept: 'application/json' })
  if (process.env.SOCIAL_OPS_TOKEN) {
    headers.set('authorization', `Bearer ${process.env.SOCIAL_OPS_TOKEN}`)
  }
  if (request.body !== undefined) headers.set('content-type', 'application/json')

  const response = await fetch(url, {
    method: request.method,
    headers,
    ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
    signal: AbortSignal.timeout(15_000),
  })
  const text = await response.text()
  let payload: unknown = text
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    // Keep the raw response for operator diagnosis.
  }
  if (!response.ok) {
    throw new Error(`Social ops request failed (${response.status}): ${JSON.stringify(payload)}`)
  }
  console.log(JSON.stringify(payload, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
