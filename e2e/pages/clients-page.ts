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
    await this.stateFilter.click()
    await this.page.getByRole('menuitemcheckbox', { name: new RegExp(`^${state}`) }).click()
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
    return this.page.getByText(sectionName, { exact: true })
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
