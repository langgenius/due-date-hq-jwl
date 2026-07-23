import { execFile } from 'node:child_process'
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
  | { kind: 'queue' }
  | { kind: 'seed-drafts'; count: number }
  | { kind: 'approve'; postId: string; reviewer: string; priority?: 'normal' | 'urgent' }
  | { kind: 'verify-account' }
  | { kind: 'publish-now'; postId: string }
  | { kind: 'cancel'; postId: string; reason: string }
  | {
      kind: 'reconcile'
      postId: string
      outcome: 'published' | 'not_published'
      externalPostId?: string
      reason?: string
    }

interface ApprovalTransition {
  postId: string
  draftUpdatedAt: string
}

interface RunSocialXOptions {
  args?: string[]
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
  log?: (message: string) => void
  warn?: (message: string) => void
  dispatchReviewSync?: (transition: ApprovalTransition, env: NodeJS.ProcessEnv) => Promise<boolean>
}

type ExecFileRunner = (
  file: string,
  args: string[],
  options: { env: NodeJS.ProcessEnv; timeout: number; windowsHide: boolean },
) => Promise<void>

const SOCIAL_PRODUCTION_ORIGIN = 'https://app.duedatehq.com'
const SOCIAL_REVIEW_REPOSITORY = 'langgenius/due-date-hq-jwl'
const SOCIAL_REVIEW_WORKFLOW = 'x-draft-review.yml'

const USAGE = `Usage:
  pnpm social:x -- candidates [--status draft] [--limit 50]
  pnpm social:x -- candidates --pulse <pulse-id> [--priority urgent]
  pnpm social:x -- queue
  pnpm social:x -- seed-drafts [--count 3]
  pnpm social:x -- approve <post-id> [--reviewer <user-id>] [--priority urgent]
  pnpm social:x -- verify-account
  pnpm social:x -- publish-now <post-id>
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
  // pnpm 11 preserves the conventional script-argument separator, so
  // `pnpm social:x -- candidates ...` reaches us with `--` as argv[0].
  // Accept both the documented form and the shorter separator-free form.
  const commandArgs = args[0] === '--' ? args.slice(1) : args
  const [name, postId] = commandArgs
  if (name === 'candidates') {
    const rawLimit = option(commandArgs, '--limit')
    const limit = rawLimit === undefined ? undefined : Number(rawLimit)
    const status = option(commandArgs, '--status')
    const pulseId = option(commandArgs, '--pulse')
    const parsedPriority = priority(option(commandArgs, '--priority'))
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
  if (name === 'queue') {
    if (commandArgs.length !== 1) {
      throw new Error('queue does not accept arguments; it always previews the next 14 days.')
    }
    return { kind: 'queue' }
  }
  if (name === 'seed-drafts') {
    if (commandArgs.length !== 1 && !(commandArgs.length === 3 && commandArgs[1] === '--count')) {
      throw new Error('seed-drafts accepts only an optional --count value.')
    }
    const rawCount = option(commandArgs, '--count')
    const count = rawCount === undefined ? 3 : Number(rawCount)
    if (!Number.isInteger(count) || count < 1 || count > 14) {
      throw new Error('--count must be an integer from 1 to 14.')
    }
    return { kind: 'seed-drafts', count }
  }
  if (name === 'approve') {
    const parsedPriority = priority(option(commandArgs, '--priority'))
    return {
      kind: 'approve',
      postId: requiredPostId(postId, 'approve'),
      reviewer: required(
        option(commandArgs, '--reviewer') ?? env.SOCIAL_OPS_REVIEWER,
        'approve requires --reviewer or SOCIAL_OPS_REVIEWER.',
      ),
      ...(parsedPriority ? { priority: parsedPriority } : {}),
    }
  }
  if (name === 'verify-account') return { kind: 'verify-account' }
  if (name === 'publish-now') {
    return { kind: 'publish-now', postId: requiredPostId(postId, 'publish-now') }
  }
  if (name === 'cancel') {
    return {
      kind: 'cancel',
      postId: requiredPostId(postId, 'cancel'),
      reason: required(option(commandArgs, '--reason'), 'cancel requires --reason.'),
    }
  }
  if (name === 'reconcile') {
    const outcome = option(commandArgs, '--outcome')
    if (outcome !== 'published' && outcome !== 'not_published') {
      throw new Error('reconcile requires --outcome published or not_published.')
    }
    const externalPostId = option(commandArgs, '--x-post-id')
    const reason = option(commandArgs, '--reason')
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

export function requestFor(command: Command): {
  path: string
  method: 'GET' | 'POST'
  body?: unknown
} {
  if (command.kind === 'queue') {
    return {
      path: '/api/ops/social/queue',
      method: 'GET',
    }
  }
  if (command.kind === 'seed-drafts') {
    return {
      path: '/api/ops/social/drafts/seed',
      method: 'POST',
      body: { count: command.count },
    }
  }
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
  if (command.kind === 'verify-account') {
    return { path: '/api/ops/social/x/account', method: 'GET' }
  }
  if (command.kind === 'publish-now') {
    return {
      path: `/api/ops/social/${encodeURIComponent(command.postId)}/publish-now`,
      method: 'POST',
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

export async function dispatchXDraftReviewSync(
  transition: ApprovalTransition,
  env = process.env,
  execFileRunner: ExecFileRunner = runExecFile,
): Promise<boolean> {
  const origin = new URL(env.SOCIAL_OPS_URL ?? 'http://localhost:8787').origin
  if (origin !== SOCIAL_PRODUCTION_ORIGIN) return false
  const postId = requiredSafePostId(transition.postId)
  const draftUpdatedAt = requiredDate(transition.draftUpdatedAt, 'Draft update time').toISOString()
  const childEnv = { ...env }
  delete childEnv.SOCIAL_OPS_TOKEN
  delete childEnv.SOCIAL_OPS_REVIEWER

  await execFileRunner(
    'gh',
    [
      'workflow',
      'run',
      SOCIAL_REVIEW_WORKFLOW,
      '--repo',
      SOCIAL_REVIEW_REPOSITORY,
      '--ref',
      'main',
      '-f',
      `post_id=${postId}`,
      '-f',
      `draft_updated_at=${draftUpdatedAt}`,
    ],
    { env: childEnv, timeout: 15_000, windowsHide: true },
  )
  return true
}

export async function runSocialXCommand({
  args = process.argv.slice(2),
  env = process.env,
  fetchImpl = fetch,
  log = console.log,
  warn = console.warn,
  dispatchReviewSync = dispatchXDraftReviewSync,
}: RunSocialXOptions = {}): Promise<void> {
  const command = parseSocialXCommand(args, env)
  const request = requestFor(command)
  const timeoutMs =
    command.kind === 'verify-account' || command.kind === 'publish-now' ? 45_000 : 15_000
  const origin = env.SOCIAL_OPS_URL ?? 'http://localhost:8787'
  const url = new URL(request.path, origin)
  const headers = new Headers({ accept: 'application/json' })
  if (env.SOCIAL_OPS_TOKEN) {
    headers.set('authorization', `Bearer ${env.SOCIAL_OPS_TOKEN}`)
  }
  if (request.body !== undefined) headers.set('content-type', 'application/json')

  const response = await fetchImpl(url, {
    method: request.method,
    headers,
    ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
    signal: AbortSignal.timeout(timeoutMs),
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
  log(JSON.stringify(payload, null, 2))

  if (command.kind === 'approve') {
    let transition: ApprovalTransition | undefined
    try {
      transition = requiredApprovalTransition(payload, command.postId)
      if (await dispatchReviewSync(transition, env)) {
        warn('Approval succeeded; GitHub Issue status sync queued.')
      }
    } catch {
      warn(
        'Approval succeeded, but GitHub Issue status sync could not be queued. ' +
          (transition
            ? `Retry: ${reviewSyncCommand(transition)}`
            : 'Run the review workflow manually after checking the approval response.'),
      )
    }
  }
}

function reviewSyncCommand(transition: ApprovalTransition): string {
  return [
    'gh workflow run',
    SOCIAL_REVIEW_WORKFLOW,
    '--repo',
    SOCIAL_REVIEW_REPOSITORY,
    '--ref main',
    `-f post_id=${transition.postId}`,
    `-f draft_updated_at=${transition.draftUpdatedAt}`,
  ].join(' ')
}

function requiredApprovalTransition(payload: unknown, expectedPostId: string): ApprovalTransition {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Approval response must be an object.')
  }
  const transition = Reflect.get(payload, 'transition')
  if (!transition || typeof transition !== 'object' || Array.isArray(transition)) {
    throw new Error('Approval response is missing transition metadata.')
  }
  const rawPostId = Reflect.get(transition, 'postId')
  const postId = requiredSafePostId(typeof rawPostId === 'string' ? rawPostId : undefined)
  if (postId !== expectedPostId) throw new Error('Approval response returned the wrong Post.')
  const rawDraftUpdatedAt = Reflect.get(transition, 'draftUpdatedAt')
  const draftUpdatedAt = requiredDate(
    typeof rawDraftUpdatedAt === 'string' ? rawDraftUpdatedAt : undefined,
    'Draft update time',
  ).toISOString()
  return { postId, draftUpdatedAt }
}

function requiredSafePostId(value: string | undefined): string {
  const postId = required(value, 'A Social Post ID is required.')
  if (!/^[A-Za-z0-9_-]{1,200}$/u.test(postId)) throw new Error('Social Post ID is invalid.')
  return postId
}

function requiredDate(value: string | undefined, label: string): Date {
  const date = new Date(required(value, `${label} is required.`))
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date.`)
  return date
}

function runExecFile(
  file: string,
  args: string[],
  options: { env: NodeJS.ProcessEnv; timeout: number; windowsHide: boolean },
): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function main() {
  await runSocialXCommand()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
