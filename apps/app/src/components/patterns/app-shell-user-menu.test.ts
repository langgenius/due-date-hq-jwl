import { describe, expect, it } from 'vitest'
import { currentPathForDemoSwitch, demoAccountSwitchHref, isDemoUser } from './app-shell-user-menu'

describe('app shell demo account switcher helpers', () => {
  it('only enables the demo account switcher for mock users', () => {
    expect(isDemoUser({ id: 'mock_user_owner_sarah' })).toBe(true)
    expect(isDemoUser({ id: 'user_123' })).toBe(false)
    expect(isDemoUser(null)).toBe(false)
  })

  it('preserves the current path, search, and hash when building the redirect target', () => {
    expect(
      currentPathForDemoSwitch({
        pathname: '/deadlines',
        search: '?owner=unassigned',
        hash: '#row-1',
      }),
    ).toBe('/deadlines?owner=unassigned#row-1')
  })

  it('builds demo account switch hrefs with role and redirectTo params', () => {
    expect(demoAccountSwitchHref('manager', '/deadlines?owner=unassigned#row-1')).toBe(
      '/api/e2e/demo-login?role=manager&redirectTo=%2Fdeadlines%3Fowner%3Dunassigned%23row-1',
    )
  })

  it('builds demo account switch hrefs with account ids for plan accounts', () => {
    expect(
      demoAccountSwitchHref(
        {
          id: 'plan-team',
          userId: 'mock_user_plan_team',
          firmId: 'mock_firm_plan_team',
          name: 'Taylor Team',
          email: 'taylor.team@duedatehq.test',
          role: 'owner',
          plan: 'team',
        },
        '/billing',
      ),
    ).toBe('/api/e2e/demo-login?account=plan-team&redirectTo=%2Fbilling')
  })
})
