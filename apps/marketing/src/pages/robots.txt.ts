import { getMarketingUrl } from '../lib/site'

export const prerender = true

// Pre-launch posture: ALLOW everything, including AI training crawlers (GPTBot /
// ClaudeBot / CCBot — covered by `*`), for maximum search + AI-citation
// visibility (docs/dev-file/13 §7-2). `*` already allows all agents; the named
// agents below are explicit for clarity. Re-evaluate tightening training-only
// bots (vs keeping search/citation bots) after launch.
const USER_AGENTS = [
  '*',
  'Googlebot',
  'OAI-SearchBot',
  'GPTBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
]

export function GET(): Response {
  const body = [
    ...USER_AGENTS.flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', '']),
    `Sitemap: ${getMarketingUrl('/sitemap-index.xml')}`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
