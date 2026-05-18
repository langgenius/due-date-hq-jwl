import type { Locator, Page } from '@playwright/test'

// The Rules workspace used to be a single page with six tabs; each former tab
// is now its own route under `/rules/*`, reachable from a collapsible Rules
// entry in the sidebar. The helpers below preserve the old test naming
// (`coverageTab`, `sourcesTab`, `libraryTab`) but route through the sidebar
// nav links so we keep validating the same user-facing surface. Obligation
// preview is no longer in the sidebar — see `gotoPreview()` below for the
// direct-URL access used by the preview spec.
export class RulesConsolePage {
  readonly rulesNavParent: Locator
  readonly coverageTab: Locator
  readonly sourcesTab: Locator
  readonly libraryTab: Locator

  constructor(readonly page: Page) {
    this.rulesNavParent = page.getByRole('button', { name: /^Rules/ })
    this.coverageTab = page.getByRole('link', { name: /^Coverage$/ })
    this.sourcesTab = page.getByRole('link', { name: /^Sources$/ })
    this.libraryTab = page.getByRole('link', { name: /^Rule library$/ })
  }

  async goto() {
    // Landing on /rules/coverage auto-expands the Rules nav group, so the
    // child links are immediately reachable without an extra click.
    await this.page.goto('/rules/coverage')
  }

  async gotoPreview() {
    // Obligation preview is intentionally not surfaced in the sidebar — it's
    // a sandbox, not a day-to-day surface. Navigate to it directly via URL.
    await this.page.goto('/rules/preview')
  }
}
