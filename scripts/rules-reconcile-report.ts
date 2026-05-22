#!/usr/bin/env node
import { execFile } from 'node:child_process'

const STATUSES = new Set(['open', 'accepted', 'dismissed', 'superseded'])
const args = process.argv.slice(2)
const remote = args.includes('--remote')
const statusArg = args.find((arg) => arg.startsWith('--status='))?.slice('--status='.length)
const limitArg = args.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length)
const status = statusArg && STATUSES.has(statusArg) ? statusArg : 'open'
const limit = Math.min(Math.max(Number(limitArg ?? 50) || 50, 1), 200)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage:
  pnpm rules:reconcile:report
  pnpm rules:reconcile:report -- --remote
  pnpm rules:reconcile:report -- --status=dismissed --limit=25`)
  process.exit(0)
}

if (statusArg && !STATUSES.has(statusArg)) {
  console.error(`Unsupported status: ${statusArg}`)
  process.exit(1)
}

const sql = `
select
  p.id,
  r.run_key,
  p.source_id,
  p.proposal_type,
  p.status,
  p.source_snapshot_id,
  p.content_hash,
  p.raw_r2_key,
  p.affected_rule_ids_json,
  p.proposed_rule_ids_json,
  p.ai_output_id,
  coalesce(p.diff_summary, p.failure_reason, '') as summary,
  datetime(p.created_at / 1000, 'unixepoch') as created_at_utc
from rule_registry_change_proposal p
join rule_registry_reconcile_run r on r.id = p.run_id
where p.status = '${status}'
order by p.created_at desc
limit ${limit};
`.trim()

const wranglerArgs = [
  '--dir',
  'apps/server',
  'exec',
  'wrangler',
  'd1',
  'execute',
  'DB',
  remote ? '--remote' : '--local',
  '--config',
  'wrangler.toml',
  '--command',
  sql,
]

execFile('pnpm', wranglerArgs, { encoding: 'utf8' }, (error, stdout, stderr) => {
  if (stdout) process.stdout.write(stdout)
  if (stderr) process.stderr.write(stderr)
  if (error) {
    process.exit(error.code ?? 1)
  }
})
