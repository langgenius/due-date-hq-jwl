import { getMarketingUrl } from '../lib/site'

export const prerender = true

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
