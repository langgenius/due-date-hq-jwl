'use client'

import { useMediaQuery } from '@base-ui/react/unstable-use-media-query'

/**
 * Project-semantic wrapper around Base UI's `useMediaQuery` so consumers
 * never repeat the breakpoint string. Kept thin on purpose — see
 * `@base-ui/react/unstable-use-media-query` for the underlying API.
 *
 * The breakpoint mirrors Tailwind's default `md` (768px). `defaultMatches`
 * is `false` so SSR / first paint assumes desktop and the hook reconciles
 * after mount via `matchMedia`.
 *
 * The `unstable-` prefix in the import path comes from Base UI; it signals
 * the API surface may change between minor versions, but the underlying
 * matchMedia primitive itself is stable. We accept the prefix as the cost
 * of not maintaining our own listener+cleanup boilerplate.
 */
const MOBILE_QUERY = '(max-width: 767px)'

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY, { defaultMatches: false })
}

export const MOBILE_BREAKPOINT = 768
