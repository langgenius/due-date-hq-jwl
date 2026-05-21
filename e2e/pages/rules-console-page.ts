import type { Locator, Page } from '@playwright/test'

// The Rules workspace used to be a single page with six tabs; each former tab
// is now its own route under `/rules/*`. After the sidebar tidy + rules
// library merge, only "Rule library" remains as a direct sidebar entry.
// Coverage and Sources are still routes (and reachable from "View …" strips
// inside `/rules/library`), but they no longer appear in the sidebar — tests
// that need to land on them should navigate directly via URL. Obligation
// preview is also URL-only — see `gotoPreview()` below.
export class RulesConsolePage {
  readonly libraryTab: Locator

  constructor(readonly page: Page) {
    this.libraryTab = page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: /^Rule library(?:\s+\d+)?$/ })
  }

  async goto() {
    // Coverage now lives as the default view inside the merged Rule library.
    await this.page.goto('/rules/library?view=matrix')
  }

  async gotoPreview() {
    // Obligation preview is intentionally not surfaced in the sidebar — it's
    // a sandbox, not a day-to-day surface. Navigate to it directly via URL.
    await this.page.goto('/rules/preview')
  }
}
