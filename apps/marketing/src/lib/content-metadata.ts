export const CONTENT_REVIEWED_ON = '2026-05-20'

export interface OfficialSourceLink {
  label: string
  href: string
}

export const stateOfficialSources: Record<string, OfficialSourceLink[]> = {
  california: [
    {
      label: 'California Franchise Tax Board forms and publications',
      href: 'https://www.ftb.ca.gov/forms/',
    },
  ],
  'new-york': [
    {
      label: 'New York Department of Taxation and Finance business tax resources',
      href: 'https://www.tax.ny.gov/bus/',
    },
  ],
  texas: [
    {
      label: 'Texas Comptroller franchise tax resources',
      href: 'https://comptroller.texas.gov/taxes/franchise/',
    },
  ],
  florida: [
    {
      label: 'Florida Department of Revenue corporate income tax resources',
      href: 'https://floridarevenue.com/taxes/taxesfees/Pages/corporate.aspx',
    },
  ],
  washington: [
    {
      label: 'Washington Department of Revenue taxes and rates resources',
      href: 'https://dor.wa.gov/taxes-rates',
    },
  ],
}
