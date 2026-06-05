import type { Locator, Page } from '@playwright/test'

export class ClientsPage {
  readonly directoryTitle: Locator
  readonly toolbar: Locator
  readonly clientFilter: Locator
  readonly entityFilter: Locator
  readonly stateFilter: Locator
  readonly newClientButton: Locator
  readonly createDialog: Locator
  readonly createClientButton: Locator
  readonly ownerSelect: Locator
  readonly backToClientsButton: Locator
  readonly filteredEmptyState: Locator

  constructor(readonly page: Page) {
    this.directoryTitle = page.getByRole('heading', { name: 'Clients' })
    this.toolbar = page.locator('body')
    this.clientFilter = page.getByRole('button', { name: /^Client(?:\s+\d+)?$/ }).first()
    this.entityFilter = page.getByRole('button', { name: /^Entity(?:\s+\d+)?$/ }).first()
    this.stateFilter = page.getByRole('button', { name: /^States(?:\s+\d+)?$/ }).first()
    this.newClientButton = page.getByRole('button', { name: 'New client' })
    this.createDialog = page.getByRole('dialog', { name: 'Create client' })
    this.createClientButton = this.createDialog.getByRole('button', { name: 'Create client' })
    this.ownerSelect = this.createDialog.getByRole('combobox', { name: 'Owner' })
    this.backToClientsButton = page.getByRole('button', { name: 'Back to clients' })
    this.filteredEmptyState = page.getByText('No clients match these filters')
  }

  async goto(path = '/clients') {
    await this.page.goto(path)
  }

  async createClient(input: {
    name: string
    ein: string
    state: string
    county?: string
    email?: string
    owner?: string
  }) {
    await this.newClientButton.click()
    await this.createDialog.getByLabel('Client name').fill(input.name)
    await this.createDialog.getByLabel('EIN').fill(input.ein)
    await this.createDialog.getByLabel('State').fill(input.state)
    if (input.county) await this.createDialog.getByLabel('County').fill(input.county)
    if (input.email) await this.createDialog.getByLabel('Email').fill(input.email)
    if (input.owner) {
      await this.ownerSelect.click()
      await this.page
        .getByRole('option', { name: new RegExp(`^${escapeRegExp(input.owner)}`) })
        .click()
    }
    await this.createClientButton.click()
  }

  async selectEntityFilter(entity: string) {
    await this.entityFilter.click()
    await this.page.getByRole('menuitemcheckbox', { name: new RegExp(`^${entity}`) }).click()
    await this.page.keyboard.press('Escape')
  }

  async selectStateFilter(state: string) {
    // 2026-05-27: the state-filter dropdown labels use the canonical
    // `RULE_JURISDICTION_LABELS` map (e.g., 'NY' → 'New York'), not the
    // 2-letter codes. Translate the test's state code so the locator
    // still resolves. Keep the regex anchor so partial matches like 'CA'
    // → 'California' still fire on the right item.
    const stateLabels: Record<string, string> = {
      AL: 'Alabama',
      AK: 'Alaska',
      AZ: 'Arizona',
      AR: 'Arkansas',
      CA: 'California',
      CO: 'Colorado',
      CT: 'Connecticut',
      DE: 'Delaware',
      FL: 'Florida',
      GA: 'Georgia',
      HI: 'Hawaii',
      ID: 'Idaho',
      IL: 'Illinois',
      IN: 'Indiana',
      IA: 'Iowa',
      KS: 'Kansas',
      KY: 'Kentucky',
      LA: 'Louisiana',
      ME: 'Maine',
      MD: 'Maryland',
      MA: 'Massachusetts',
      MI: 'Michigan',
      MN: 'Minnesota',
      MS: 'Mississippi',
      MO: 'Missouri',
      MT: 'Montana',
      NE: 'Nebraska',
      NV: 'Nevada',
      NH: 'New Hampshire',
      NJ: 'New Jersey',
      NM: 'New Mexico',
      NY: 'New York',
      NC: 'North Carolina',
      ND: 'North Dakota',
      OH: 'Ohio',
      OK: 'Oklahoma',
      OR: 'Oregon',
      PA: 'Pennsylvania',
      RI: 'Rhode Island',
      SC: 'South Carolina',
      SD: 'South Dakota',
      TN: 'Tennessee',
      TX: 'Texas',
      UT: 'Utah',
      VT: 'Vermont',
      VA: 'Virginia',
      WA: 'Washington',
      WV: 'West Virginia',
      WI: 'Wisconsin',
      WY: 'Wyoming',
      DC: 'District of Columbia',
      FED: 'Federal',
    }
    const label = stateLabels[state] ?? state
    await this.stateFilter.click()
    await this.page.getByRole('menuitemcheckbox', { name: new RegExp(`^${label}`) }).click()
    await this.page.keyboard.press('Escape')
  }

  async selectClientFilter(clientName: string) {
    await this.clientFilter.click()
    await this.page
      .getByRole('menuitemcheckbox', { name: new RegExp(`^${escapeRegExp(clientName)}`) })
      .click()
    await this.page.keyboard.press('Escape')
  }

  metricCard(label: string) {
    return this.page.locator('[role="group"]').filter({
      has: this.page.getByText(label, { exact: true }),
    })
  }

  rowFor(clientName: string) {
    return this.page.getByRole('button', {
      name: new RegExp(`Open client detail for ${escapeRegExp(clientName)}`),
    })
  }

  clientDetailHeading(clientName: string) {
    return this.page.getByRole('heading', { name: clientName })
  }

  detailSection(sectionName: string) {
    // 2026-06-05: the redesigned client-detail tabs render every section
    // header through the shared `TabSection` primitive, which emits an
    // `<h2>` (apps/app/src/features/clients/ClientFactsWorkspace.tsx:243
    // — `<h2 className="text-base font-semibold ...">{title}</h2>`).
    // A raw `getByText('Filing plan', { exact: true })` now matches TWO
    // nodes: the `<h2>` heading AND the tab label
    // `<span data-tab-label>Filing plan</span>` rendered by the Work tab
    // trigger (ClientDetailWorkspace.tsx:1041-1043) — the tab key `work`
    // was relabelled "Filing plan" in the IA pass. Targeting the level-2
    // heading scopes to the section header only (role `heading`), so it
    // can never resolve to the `role="tab"` element regardless of label
    // overlap.
    return this.page.getByRole('heading', { level: 2, name: sectionName })
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
