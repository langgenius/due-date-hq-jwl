import type { Locator, Page } from '@playwright/test'

// The Rules workspace used to be a single page with six tabs; each former tab
// is now its own route under `/rules/*`, reachable from a collapsible Rules
// entry in the sidebar. The helpers below preserve the old test naming
// (`coverageTab`, `sourcesTab`, `libraryTab`, `previewTab`) but route through
// the sidebar nav links so we keep validating the same user-facing surface.
export class RulesConsolePage {
  readonly rulesNavParent: Locator
  readonly coverageTab: Locator
  readonly sourcesTab: Locator
  readonly libraryTab: Locator
  readonly previewTab: Locator

  constructor(readonly page: Page) {
    this.rulesNavParent = page.getByRole('button', { name: /^Rules/ })
    this.coverageTab = page.getByRole('link', { name: /^Coverage$/ })
    this.sourcesTab = page.getByRole('link', { name: /^Sources$/ })
    this.libraryTab = page.getByRole('link', { name: /^Rule library$/ })
    this.previewTab = page.getByRole('link', { name: /^Obligation preview$/ })
  }

  async goto() {
    // Landing on /rules/coverage auto-expands the Rules nav group, so the
    // child links are immediately reachable without an extra click.
    await this.page.goto('/rules/coverage')
  }
}
