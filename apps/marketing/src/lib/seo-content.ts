import type {
  GuidePageCopy,
  KeyDatesBlock,
  LandingCopy,
  StateCoverageCopy,
  StatePageCopy,
} from '../i18n/types'

type Locale = 'en' | 'zh-CN'
type StateCard = StateCoverageCopy['states'][number]

interface StateSpec {
  slug: string
  name: string
  abbreviation: string
  agency: string
  sourceSurface: string
  sourceSurfaceZh: string
  signal: string
  signalZh: string
  taxFocus: string
  taxFocusZh: string
}

interface ComparisonSpec {
  slug: string
  product: string
  positioning: string
  positioningZh: string
  bestFit: string
  bestFitZh: string
  contrast: string
  contrastZh: string
}

interface RuleReferenceSpec {
  slug: string
  label: string
  labelZh: string
  sourceContext: string
  sourceContextZh: string
  operationalRisk: string
  operationalRiskZh: string
  clientContext: string
  clientContextZh: string
  keyDates?: {
    sourceLabel: string
    sourceHref: string
    rows: { label: string; labelZh: string; value: string; valueZh: string }[]
  }
}

// Internal coverage-depth truth per docs/dev-file/11-Pulse-Ingest-Source-Catalog.md
// §3: these 6 states run deep multi-agency live adapters. Retained for internal /
// future use ONLY — public state coverage is presented UNIFORMLY (comprehensive
// 50 states + DC), not by depth tier, so this set no longer drives any visible badge.
export const DEEP_COVERAGE_STATE_ABBRS = new Set(['CA', 'NY', 'TX', 'FL', 'WA', 'MA'])

// One uniform, honest coverage badge for every state — emphasizes comprehensive
// monitoring across 50 states + DC, never depth tiers.
function stateStatusLabel(locale: Locale): string {
  return locale === 'zh-CN' ? '监控中' : 'Monitored'
}

const stateSpecs: StateSpec[] = [
  {
    slug: 'illinois',
    name: 'Illinois',
    abbreviation: 'IL',
    agency: 'Illinois Department of Revenue',
    sourceSurface: 'forms, bulletins, and taxpayer guidance',
    sourceSurfaceZh: '表格、公告与纳税人指南',
    signal: 'income, replacement, sales-tax, and relief notices',
    signalZh: '所得税、replacement tax、销售税与救济通知',
    taxFocus: 'entity, sales-tax, and filing-window context',
    taxFocusZh: '实体类型、销售税与申报窗口上下文',
  },
  {
    slug: 'new-jersey',
    name: 'New Jersey',
    abbreviation: 'NJ',
    agency: 'New Jersey Division of Taxation',
    sourceSurface: 'business tax pages, notices, and filing guidance',
    sourceSurfaceZh: '企业税页面、通知与申报指南',
    signal: 'corporation business tax, sales-tax, and relief updates',
    signalZh: '公司营业税、销售税与救济更新',
    taxFocus: 'corporation tax, state filing, and taxpayer-class context',
    taxFocusZh: '公司税、州申报与纳税人类别上下文',
  },
  {
    slug: 'pennsylvania',
    name: 'Pennsylvania',
    abbreviation: 'PA',
    agency: 'Pennsylvania Department of Revenue',
    sourceSurface: 'revenue guidance, tax forms, and public notices',
    sourceSurfaceZh: '税务指南、税表与公开通知',
    signal: 'business tax, sales-tax, and filing-period updates',
    signalZh: '企业税、销售税与申报期间更新',
    taxFocus: 'business filing, taxpayer type, and period context',
    taxFocusZh: '企业申报、纳税人类型与期间上下文',
  },
  {
    slug: 'georgia',
    name: 'Georgia',
    abbreviation: 'GA',
    agency: 'Georgia Department of Revenue',
    sourceSurface: 'tax forms, news, and public filing guidance',
    sourceSurfaceZh: '税表、新闻与公开申报指南',
    signal: 'income tax, sales-tax, and deadline-related updates',
    signalZh: '所得税、销售税与截止日相关更新',
    taxFocus: 'state filing, form, and relief context',
    taxFocusZh: '州申报、表格与救济上下文',
  },
  {
    slug: 'massachusetts',
    name: 'Massachusetts',
    abbreviation: 'MA',
    agency: 'Massachusetts Department of Revenue',
    sourceSurface: 'DOR guidance, forms, and taxpayer notices',
    sourceSurfaceZh: '税务局指南、表格与纳税人通知',
    signal: 'corporate excise, sales-tax, and public filing updates',
    signalZh: 'corporate excise、销售税与公开申报更新',
    taxFocus: 'corporate excise, filing-period, and entity context',
    taxFocusZh: 'corporate excise、申报期间与实体上下文',
  },
  {
    slug: 'north-carolina',
    name: 'North Carolina',
    abbreviation: 'NC',
    agency: 'North Carolina Department of Revenue',
    sourceSurface: 'tax forms, notices, and filing resources',
    sourceSurfaceZh: '税表、通知与申报资源',
    signal: 'corporate income, franchise, sales-tax, and relief updates',
    signalZh: '公司所得税、franchise tax、销售税与救济更新',
    taxFocus: 'corporate, franchise, and due-date context',
    taxFocusZh: '公司税、franchise tax 与截止日上下文',
  },
  {
    slug: 'arizona',
    name: 'Arizona',
    abbreviation: 'AZ',
    agency: 'Arizona Department of Revenue',
    sourceSurface: 'forms, rulings, and taxpayer guidance',
    sourceSurfaceZh: '表格、裁定与纳税人指南',
    signal: 'income tax, transaction privilege tax, and relief notices',
    signalZh: '所得税、transaction privilege tax 与救济通知',
    taxFocus: 'filing, TPT, and taxpayer-class context',
    taxFocusZh: '申报、TPT 与纳税人类别上下文',
  },
  {
    slug: 'colorado',
    name: 'Colorado',
    abbreviation: 'CO',
    agency: 'Colorado Department of Revenue',
    sourceSurface: 'taxation guidance, forms, and notices',
    sourceSurfaceZh: '税务指南、表格与通知',
    signal: 'income tax, sales-tax, and filing-window updates',
    signalZh: '所得税、销售税与申报窗口更新',
    taxFocus: 'state filing, sales-tax, and period context',
    taxFocusZh: '州申报、销售税与期间上下文',
  },
  {
    slug: 'ohio',
    name: 'Ohio',
    abbreviation: 'OH',
    agency: 'Ohio Department of Taxation',
    sourceSurface: 'tax guidance, forms, and public updates',
    sourceSurfaceZh: '税务指南、表格与公开更新',
    signal: 'commercial activity tax, sales-tax, and income-tax updates',
    signalZh: 'commercial activity tax、销售税与所得税更新',
    taxFocus: 'CAT, sales-tax, and entity context',
    taxFocusZh: 'CAT、销售税与实体上下文',
  },
  {
    slug: 'michigan',
    name: 'Michigan',
    abbreviation: 'MI',
    agency: 'Michigan Department of Treasury',
    sourceSurface: 'tax forms, notices, and Treasury guidance',
    sourceSurfaceZh: '税表、通知与财政部指南',
    signal: 'corporate income tax, sales-tax, and public deadline updates',
    signalZh: '公司所得税、销售税与公开截止日更新',
    taxFocus: 'corporate filing, tax type, and period context',
    taxFocusZh: '公司申报、税种与期间上下文',
  },
  {
    slug: 'virginia',
    name: 'Virginia',
    abbreviation: 'VA',
    agency: 'Virginia Department of Taxation',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, due-date, and entity context',
    taxFocusZh: '公司申报、截止日与实体上下文',
  },
  {
    slug: 'maryland',
    name: 'Maryland',
    abbreviation: 'MD',
    agency: 'Comptroller of Maryland',
    sourceSurface: 'tax forms, instructions, and public notices',
    sourceSurfaceZh: '税表、说明与公开通知',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'minnesota',
    name: 'Minnesota',
    abbreviation: 'MN',
    agency: 'Minnesota Department of Revenue',
    sourceSurface: 'tax forms, guidance, and public notices',
    sourceSurfaceZh: '税表、指南与公开通知',
    signal: 'corporate franchise, pass-through, sales-tax, and relief updates',
    signalZh: '公司 franchise tax、转递实体、销售税与救济更新',
    taxFocus: 'franchise filing, period, and entity context',
    taxFocusZh: 'franchise tax 申报、期间与实体上下文',
  },
  {
    slug: 'wisconsin',
    name: 'Wisconsin',
    abbreviation: 'WI',
    agency: 'Wisconsin Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate franchise/income, pass-through, sales-tax, and relief updates',
    signalZh: '公司 franchise/所得税、转递实体、销售税与救济更新',
    taxFocus: 'franchise/income filing, period, and entity context',
    taxFocusZh: 'franchise/所得税申报、期间与实体上下文',
  },
  {
    slug: 'tennessee',
    name: 'Tennessee',
    abbreviation: 'TN',
    agency: 'Tennessee Department of Revenue',
    sourceSurface: 'franchise & excise guidance, forms, and notices',
    sourceSurfaceZh: 'franchise & excise 指南、表格与通知',
    signal: 'franchise & excise, sales-tax, and relief updates',
    signalZh: 'franchise & excise 税、销售税与救济更新',
    taxFocus: 'franchise & excise filing and entity context',
    taxFocusZh: 'franchise & excise 申报与实体上下文',
  },
  {
    slug: 'missouri',
    name: 'Missouri',
    abbreviation: 'MO',
    agency: 'Missouri Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'indiana',
    name: 'Indiana',
    abbreviation: 'IN',
    agency: 'Indiana Department of Revenue',
    sourceSurface: 'tax bulletins, forms, and public guidance',
    sourceSurfaceZh: '税务公告、表格与公开指南',
    signal: 'corporate adjusted-gross-income, pass-through, sales-tax, and relief updates',
    signalZh: '公司调整后毛所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, due-date, and entity context',
    taxFocusZh: '公司申报、截止日与实体上下文',
  },
  {
    slug: 'connecticut',
    name: 'Connecticut',
    abbreviation: 'CT',
    agency: 'Connecticut Department of Revenue Services',
    sourceSurface: 'tax guidance, forms, and public FAQs',
    sourceSurfaceZh: '税务指南、表格与公开 FAQ',
    signal: 'corporation business tax, pass-through, sales-tax, and relief updates',
    signalZh: 'corporation business tax、转递实体、销售税与救济更新',
    taxFocus: 'corporation business tax filing and entity context',
    taxFocusZh: 'corporation business tax 申报与实体上下文',
  },
  {
    slug: 'district-of-columbia',
    name: 'District of Columbia',
    abbreviation: 'DC',
    agency: 'District of Columbia Office of Tax and Revenue',
    sourceSurface: 'tax forms, instructions, and public notices',
    sourceSurfaceZh: '税表、说明与公开通知',
    signal: 'franchise tax (D-20/D-30), sales-tax, and relief updates',
    signalZh: 'franchise tax（D-20/D-30）、销售税与救济更新',
    taxFocus: 'franchise tax filing, period, and entity context',
    taxFocusZh: 'franchise tax 申报、期间与实体上下文',
  },
  {
    slug: 'alabama',
    name: 'Alabama',
    abbreviation: 'AL',
    agency: 'Alabama Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'alaska',
    name: 'Alaska',
    abbreviation: 'AK',
    agency: 'Alaska Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, oil & gas, and relief updates',
    signalZh: '公司所得税、油气税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'arkansas',
    name: 'Arkansas',
    abbreviation: 'AR',
    agency: 'Arkansas Department of Finance and Administration',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'delaware',
    name: 'Delaware',
    abbreviation: 'DE',
    agency: 'Delaware Division of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'hawaii',
    name: 'Hawaii',
    abbreviation: 'HI',
    agency: 'Hawaii Department of Taxation',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, general excise tax, and relief updates',
    signalZh: '公司所得税、general excise tax 与救济更新',
    taxFocus: 'corporate filing, GET, and entity context',
    taxFocusZh: '公司申报、GET 与实体上下文',
  },
  {
    slug: 'idaho',
    name: 'Idaho',
    abbreviation: 'ID',
    agency: 'Idaho State Tax Commission',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'iowa',
    name: 'Iowa',
    abbreviation: 'IA',
    agency: 'Iowa Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'kansas',
    name: 'Kansas',
    abbreviation: 'KS',
    agency: 'Kansas Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'kentucky',
    name: 'Kentucky',
    abbreviation: 'KY',
    agency: 'Kentucky Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'louisiana',
    name: 'Louisiana',
    abbreviation: 'LA',
    agency: 'Louisiana Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'maine',
    name: 'Maine',
    abbreviation: 'ME',
    agency: 'Maine Revenue Services',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'mississippi',
    name: 'Mississippi',
    abbreviation: 'MS',
    agency: 'Mississippi Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'montana',
    name: 'Montana',
    abbreviation: 'MT',
    agency: 'Montana Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'nebraska',
    name: 'Nebraska',
    abbreviation: 'NE',
    agency: 'Nebraska Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'nevada',
    name: 'Nevada',
    abbreviation: 'NV',
    agency: 'Nevada Department of Taxation',
    sourceSurface: 'tax forms, guidance, and public notices',
    sourceSurfaceZh: '税表、指南与公开通知',
    signal: 'commerce tax, sales & use tax, and relief updates',
    signalZh: '商业税、销售与使用税与救济更新',
    taxFocus: 'commerce-tax and business-filing context',
    taxFocusZh: '商业税与企业申报上下文',
  },
  {
    slug: 'new-hampshire',
    name: 'New Hampshire',
    abbreviation: 'NH',
    agency: 'New Hampshire Department of Revenue Administration',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'business profits tax, business enterprise tax, and relief updates',
    signalZh: 'business profits tax、business enterprise tax 与救济更新',
    taxFocus: 'BPT/BET filing and entity context',
    taxFocusZh: 'BPT/BET 申报与实体上下文',
  },
  {
    slug: 'new-mexico',
    name: 'New Mexico',
    abbreviation: 'NM',
    agency: 'New Mexico Taxation and Revenue Department',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'north-dakota',
    name: 'North Dakota',
    abbreviation: 'ND',
    agency: 'North Dakota Office of State Tax Commissioner',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'oklahoma',
    name: 'Oklahoma',
    abbreviation: 'OK',
    agency: 'Oklahoma Tax Commission',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'oregon',
    name: 'Oregon',
    abbreviation: 'OR',
    agency: 'Oregon Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate excise/income, pass-through, and relief updates',
    signalZh: '公司 excise/所得税、转递实体与救济更新',
    taxFocus: 'excise/income filing, period, and entity context',
    taxFocusZh: 'excise/所得税申报、期间与实体上下文',
  },
  {
    slug: 'rhode-island',
    name: 'Rhode Island',
    abbreviation: 'RI',
    agency: 'Rhode Island Division of Taxation',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'south-carolina',
    name: 'South Carolina',
    abbreviation: 'SC',
    agency: 'South Carolina Department of Revenue',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'south-dakota',
    name: 'South Dakota',
    abbreviation: 'SD',
    agency: 'South Dakota Department of Revenue',
    sourceSurface: 'tax forms, guidance, and public notices',
    sourceSurfaceZh: '税表、指南与公开通知',
    signal: 'sales & use tax, bank franchise tax, and relief updates',
    signalZh: '销售与使用税、bank franchise tax 与救济更新',
    taxFocus: 'sales-tax and financial-institution context',
    taxFocusZh: '销售税与金融机构上下文',
  },
  {
    slug: 'utah',
    name: 'Utah',
    abbreviation: 'UT',
    agency: 'Utah State Tax Commission',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'vermont',
    name: 'Vermont',
    abbreviation: 'VT',
    agency: 'Vermont Department of Taxes',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'west-virginia',
    name: 'West Virginia',
    abbreviation: 'WV',
    agency: 'West Virginia Tax Division',
    sourceSurface: 'tax forms, instructions, and public guidance',
    sourceSurfaceZh: '税表、说明与公开指南',
    signal: 'corporate income, pass-through, sales-tax, and relief updates',
    signalZh: '公司所得税、转递实体、销售税与救济更新',
    taxFocus: 'corporate filing, period, and entity context',
    taxFocusZh: '公司申报、期间与实体上下文',
  },
  {
    slug: 'wyoming',
    name: 'Wyoming',
    abbreviation: 'WY',
    agency: 'Wyoming Department of Revenue',
    sourceSurface: 'sales & use tax and public business-filing updates',
    sourceSurfaceZh: '销售与使用税与公开企业申报更新',
    signal: 'sales & use tax and public business-filing updates',
    signalZh: '销售与使用税与公开企业申报更新',
    taxFocus: 'sales-tax and annual-report context',
    taxFocusZh: '销售税与年报上下文',
  },
]

const comparisonSpecs: ComparisonSpec[] = [
  {
    slug: 'file-in-time-alternative',
    product: 'File In Time',
    positioning: 'tax deadline tracking built around due-date lists',
    positioningZh: '围绕截止日清单构建的税务截止日追踪工具',
    bestFit: 'firms that mainly want a narrow deadline tracker',
    bestFitZh: '主要需要窄范围截止日跟踪器的事务所',
    contrast:
      'DueDateHQ is built around risk triage, source evidence, state alerts, and migration-assisted client context.',
    contrastZh: 'DueDateHQ 更关注风险分诊、来源证据、州级提醒复核，以及迁移后保留的客户上下文。',
  },
  {
    slug: 'taxdome-deadline-operations',
    product: 'TaxDome',
    positioning: 'an all-in-one practice management and client portal suite',
    positioningZh: '一体化 practice management 与客户门户套件',
    bestFit:
      'firms standardizing client portals, organizers, documents, payments, and workflow in one platform',
    bestFitZh: '希望把客户门户、organizer、文档、支付和工作流统一到一个平台的事务所',
    contrast:
      'DueDateHQ stays narrower: deadline risk, official-source evidence, state coverage, and weekly operations for CPA teams that do not want a full practice suite migration.',
    contrastZh:
      'DueDateHQ 范围更窄：截止日风险、官方来源证据、州覆盖和每周运营分诊，适合不想做完整 practice suite 迁移的 CPA 团队。',
  },
  {
    slug: 'karbon-deadline-operations',
    product: 'Karbon',
    positioning: 'collaborative accounting workflow and team work management',
    positioningZh: '会计团队协作工作流与 work management 平台',
    bestFit:
      'teams that want broad work management, email collaboration, and operational visibility',
    bestFitZh: '需要更广义 work management、邮件协作和团队可视化的团队',
    contrast:
      'DueDateHQ focuses on tax deadline work: source-backed rules, affected-client review, evidence drawers, and deadline-specific triage.',
    contrastZh:
      'DueDateHQ 聚焦税务截止日运营：带来源的规则、受影响客户复核、证据抽屉和专门面向截止日的分诊。',
  },
  {
    slug: 'canopy-deadline-operations',
    product: 'Canopy',
    positioning:
      'a cloud practice-management suite with client management, workflow, and a client portal',
    positioningZh: '带客户管理、工作流和客户门户的云端 practice-management 套件',
    bestFit: 'firms consolidating CRM, workflow, documents, and billing in one cloud platform',
    bestFitZh: '希望把 CRM、工作流、文档和账单统一到一个云平台的事务所',
    contrast:
      'DueDateHQ stays narrow: source-backed deadline and rule-change monitoring with affected-client review, layered on top of whatever practice suite you run.',
    contrastZh:
      'DueDateHQ 范围更窄：带来源的截止日与规则变化监控 + 受影响客户复核，叠加在你正在用的任何 practice suite 之上。',
  },
  {
    slug: 'financial-cents-deadline-operations',
    product: 'Financial Cents',
    positioning:
      'a workflow and client-management tool focused on team task tracking and client work',
    positioningZh: '聚焦团队任务跟踪与客户工作的工作流与客户管理工具',
    bestFit: 'small firms that want simple workflow, recurring tasks, and client follow-up',
    bestFitZh: '需要简单工作流、周期性任务和客户跟进的小型事务所',
    contrast:
      'DueDateHQ focuses on the deadline-change signal itself — watching official IRS and state sources and routing each change to the clients it affects, with the source attached.',
    contrastZh:
      'DueDateHQ 聚焦截止日变化信号本身——监控官方 IRS 与各州来源，把每条变化路由到受影响的客户，并附上来源。',
  },
  {
    slug: 'jetpack-workflow-deadline-operations',
    product: 'Jetpack Workflow',
    positioning:
      'accounting workflow software built around recurring client work and deadline tracking',
    positioningZh: '围绕周期性客户工作与截止日跟踪构建的会计工作流软件',
    bestFit:
      'firms standardizing recurring jobs from a template library and watching workload across the team',
    bestFitZh: '希望用模板库标准化周期性任务、并掌握团队工作量的事务所',
    contrast:
      'DueDateHQ does not run your recurring jobs — it watches official IRS and state sources for deadline and rule changes and routes each one to the clients it affects, with the source attached, on top of whatever workflow tool you use.',
    contrastZh:
      'DueDateHQ 不负责运行你的周期性任务——它监控官方 IRS 与各州来源的截止日与规则变化，把每条变化路由到受影响的客户并附上来源，叠加在你正在用的任何工作流工具之上。',
  },
  {
    slug: 'aero-workflow-deadline-operations',
    product: 'Aero Workflow',
    positioning:
      'a workflow and task-management tool for bookkeeping, CAS, and accounting firms with a procedures library',
    positioningZh: '面向记账、CAS 与会计事务所的工作流与任务管理工具，带流程库',
    bestFit: 'firms turning standardized procedures into assigned, time-tracked client tasks',
    bestFitZh: '希望把标准化流程转成可分派、可计时的客户任务的事务所',
    contrast:
      'DueDateHQ stays narrower than workflow management: it monitors deadline and rule changes at the official source and shows exactly which clients are affected, instead of running the team task list.',
    contrastZh:
      'DueDateHQ 比工作流管理更窄：它在官方来源处监控截止日与规则变化，并精确显示哪些客户受影响，而不是去运行团队任务清单。',
  },
  {
    slug: 'keeper-deadline-operations',
    product: 'Keeper',
    positioning:
      'a month-end close and bookkeeping management app with a client portal, file reviews, and QuickBooks sync',
    positioningZh: '带客户门户、复核与 QuickBooks 同步的月结与记账管理工具',
    bestFit:
      'bookkeeping teams running the month-end close, client questions, and management reporting in one place',
    bestFitZh: '希望把月结、客户问询与管理报表集中在一处的记账团队',
    contrast:
      'DueDateHQ is not a close or bookkeeping tool — it is a deadline-and-rule-change monitoring layer that watches official IRS and state sources and attaches a source to every date, independent of where your books live.',
    contrastZh:
      'DueDateHQ 不是月结或记账工具——它是一个截止日与规则变化监控层，监控官方 IRS 与各州来源并为每个日期附上来源，与你的账务系统在哪无关。',
  },
]

const ruleReferenceSpecs: RuleReferenceSpec[] = [
  {
    slug: 'form-7004-extension-deadline',
    label: 'Form 7004 extension deadline',
    labelZh: 'Form 7004 延期截止日',
    sourceContext: 'IRS extension instructions and filing-period guidance',
    sourceContextZh: 'IRS 延期说明与申报期间指南',
    operationalRisk:
      'extension work can reduce filing risk while leaving payment timing, readiness, and client communication open for review',
    operationalRiskZh: '延期工作可以降低申报风险，但付款时点、资料准备度和客户沟通仍需要单独复核',
    clientContext:
      'entity type, tax year, filing status, payment estimate, owner, and evidence state',
    clientContextZh: '实体类型、税年、申报状态、付款估算、负责人和证据状态',
    keyDates: {
      sourceLabel: 'IRS — About Form 7004',
      sourceHref: 'https://www.irs.gov/forms-pubs/about-form-7004',
      rows: [
        {
          label: 'What it is',
          labelZh: '这是什么',
          value:
            'Form 7004 is the automatic extension application for business returns — it extends time to file, not time to pay.',
          valueZh: 'Form 7004 是企业申报的自动延期申请——它延长申报时间，不延长付款时间。',
        },
        {
          label: 'File by',
          labelZh: '何时提交',
          value:
            "The underlying return's original due date — March 15 for calendar-year Form 1065 and Form 1120-S.",
          valueZh:
            '在被延期申报表的原始截止日前提交——日历年 Form 1065 和 Form 1120-S 为 3 月 15 日。',
        },
        {
          label: 'Extension granted',
          labelZh: '延长时长',
          value:
            'An automatic 6 months — moving the calendar-year Form 1065 and Form 1120-S deadline to September 15.',
          valueZh: '自动延长 6 个月——把日历年 Form 1065 和 Form 1120-S 的截止日移到 9 月 15 日。',
        },
      ],
    },
  },
  {
    slug: 's-corp-deadline-operations',
    label: 'S-Corp deadline operations',
    labelZh: 'S-Corp 截止日运营',
    sourceContext: 'IRS S corporation filing guidance, form instructions, and state entity signals',
    sourceContextZh: 'IRS S corporation 申报指南、表格说明和州级实体信号',
    operationalRisk:
      'S-Corp work often combines federal filing timing, state registration, extension status, and client readiness',
    operationalRiskZh: 'S-Corp 工作通常同时涉及联邦申报时点、州注册状态、延期状态和客户资料准备度',
    clientContext:
      'entity profile, fiscal year, state footprint, responsible owner, and source-backed obligation state',
    clientContextZh: '实体档案、财年、州足迹、负责人和带来源的义务状态',
    keyDates: {
      sourceLabel: 'IRS — About Form 1120-S',
      sourceHref: 'https://www.irs.gov/forms-pubs/about-form-1120-s',
      rows: [
        {
          label: 'Original deadline',
          labelZh: '原始截止日',
          value:
            'March 15 — the 15th day of the 3rd month after the tax year ends, for calendar-year filers.',
          valueZh: '3 月 15 日——日历年纳税人为税年结束后第 3 个月的第 15 天。',
        },
        {
          label: 'Extension',
          labelZh: '延期',
          value: 'Form 7004 — an automatic 6-month extension of time to file, to September 15.',
          valueZh: 'Form 7004——自动延长 6 个月的申报时间，至 9 月 15 日。',
        },
        {
          label: 'Payment',
          labelZh: '付款',
          value:
            'An extension extends time to file, not time to pay; tax owed is still due by the original deadline.',
          valueZh: '延期只延长申报时间，不延长付款时间；应缴税款仍需在原始截止日前缴清。',
        },
      ],
    },
  },
  {
    slug: 'partnership-form-1065-deadline',
    label: 'Partnership Form 1065 deadline',
    labelZh: 'Partnership Form 1065 截止日',
    sourceContext:
      'IRS partnership return guidance, extension instructions, and state filing references',
    sourceContextZh: 'IRS partnership return 指南、延期说明和州申报参考',
    operationalRisk:
      'partnership deadline work can affect partner schedules, extension handling, payment context, and review ownership',
    operationalRiskZh:
      'partnership 截止日工作会影响 partner schedule、延期处理、付款上下文和复核负责人',
    clientContext:
      'partnership profile, filing period, state footprint, materials readiness, and evidence completeness',
    clientContextZh: '合伙企业档案、申报期间、州足迹、资料准备度和证据完整度',
    keyDates: {
      sourceLabel: 'IRS — About Form 1065',
      sourceHref: 'https://www.irs.gov/forms-pubs/about-form-1065',
      rows: [
        {
          label: 'Original deadline',
          labelZh: '原始截止日',
          value:
            'March 15 — the 15th day of the 3rd month after the tax year ends, for calendar-year filers.',
          valueZh: '3 月 15 日——日历年纳税人为税年结束后第 3 个月的第 15 天。',
        },
        {
          label: 'Extension',
          labelZh: '延期',
          value: 'Form 7004 — an automatic 6-month extension of time to file, to September 15.',
          valueZh: 'Form 7004——自动延长 6 个月的申报时间，至 9 月 15 日。',
        },
        {
          label: 'Payment',
          labelZh: '付款',
          value:
            'An extension extends time to file, not time to pay; tax owed is still due by the original deadline.',
          valueZh: '延期只延长申报时间，不延长付款时间；应缴税款仍需在原始截止日前缴清。',
        },
      ],
    },
  },
  {
    slug: '1099-nec-misc-filing-deadline',
    label: '1099-NEC and 1099-MISC filing deadlines',
    labelZh: '1099-NEC 与 1099-MISC 申报截止日',
    sourceContext: 'IRS information-return instructions and electronic-filing-threshold guidance',
    sourceContextZh: 'IRS 信息申报表说明与电子申报门槛指南',
    operationalRisk:
      'information-return work spans separate recipient-copy deadlines, different IRS paper vs e-file dates, and the ten-return e-file mandate',
    operationalRiskZh:
      '信息申报表工作同时涉及收件人副本截止日、IRS 纸质与电子申报的不同日期，以及 10 份起强制电子申报的规定',
    clientContext:
      'payer entity, contractor and vendor list, box type (NEC vs MISC box 8 or 10), and filing method',
    clientContextZh: '付款方实体、承包商与供应商名单、box 类型（NEC 与 MISC box 8/10）和申报方式',
    keyDates: {
      sourceLabel: 'IRS — Instructions for Forms 1099-MISC and 1099-NEC',
      sourceHref: 'https://www.irs.gov/instructions/i1099mec',
      rows: [
        {
          label: 'Form 1099-NEC',
          labelZh: 'Form 1099-NEC',
          value:
            'Due January 31 to both the recipient and the IRS — the same date for paper and e-file.',
          valueZh: '1 月 31 日前同时提交给收件人和 IRS——纸质与电子申报为同一日期。',
        },
        {
          label: 'Form 1099-MISC — to recipient',
          labelZh: 'Form 1099-MISC——给收件人',
          value: 'Due January 31 (February 15 when amounts are in box 8 or box 10).',
          valueZh: '1 月 31 日（当金额在 box 8 或 box 10 时为 2 月 15 日）。',
        },
        {
          label: 'Form 1099-MISC — to IRS',
          labelZh: 'Form 1099-MISC——给 IRS',
          value: 'Due February 28 on paper, or March 31 if e-filed.',
          valueZh: '纸质申报为 2 月 28 日，电子申报为 3 月 31 日。',
        },
        {
          label: 'E-file mandate',
          labelZh: '强制电子申报',
          value: 'Ten or more information returns (all types combined) must be e-filed.',
          valueZh: '各类信息申报表合计达 10 份及以上必须电子申报。',
        },
      ],
    },
  },
  {
    slug: '1040-es-estimated-tax-deadline',
    label: 'Form 1040-ES estimated tax deadlines',
    labelZh: 'Form 1040-ES 估算税截止日',
    sourceContext: 'IRS estimated-tax guidance and quarterly installment instructions',
    sourceContextZh: 'IRS 估算税指南与季度分期说明',
    operationalRisk:
      'estimated-tax work runs on a four-installment calendar that does not match the annual return, with an early-file waiver for the final payment',
    operationalRiskZh: '估算税按与年度申报不同的四期日历进行，且最后一期在提前报税时可豁免',
    clientContext:
      'individual taxpayer, projected income by period, prior-year safe harbor, and payment status',
    clientContextZh: '个人纳税人、按期预估收入、上年度 safe harbor 和缴款状态',
    keyDates: {
      sourceLabel: 'IRS — About Form 1040-ES',
      sourceHref: 'https://www.irs.gov/forms-pubs/about-form-1040-es',
      rows: [
        {
          label: '1st installment',
          labelZh: '第 1 期',
          value: 'Due April 15 (income earned January 1 – March 31).',
          valueZh: '4 月 15 日（1 月 1 日 – 3 月 31 日的收入）。',
        },
        {
          label: '2nd installment',
          labelZh: '第 2 期',
          value: 'Due June 15 (April 1 – May 31).',
          valueZh: '6 月 15 日（4 月 1 日 – 5 月 31 日）。',
        },
        {
          label: '3rd installment',
          labelZh: '第 3 期',
          value: 'Due September 15 (June 1 – August 31).',
          valueZh: '9 月 15 日（6 月 1 日 – 8 月 31 日）。',
        },
        {
          label: '4th installment',
          labelZh: '第 4 期',
          value:
            'Due January 15 of the following year — skippable if the return is filed and paid in full by January 31.',
          valueZh: '次年 1 月 15 日——若在 1 月 31 日前完成报税并全额缴清，则可免缴此期。',
        },
      ],
    },
  },
  {
    slug: '941-payroll-tax-deadline',
    label: 'Form 941 payroll tax deadlines',
    labelZh: 'Form 941 工资税截止日',
    sourceContext: 'IRS Form 941 instructions and quarterly filing guidance',
    sourceContextZh: 'IRS Form 941 说明与季度申报指南',
    operationalRisk:
      'payroll work separates the quarterly return from the deposit schedule — filing Form 941 is not the same as depositing the tax',
    operationalRiskZh: '工资税工作把季度申报与缴存日程分开——提交 Form 941 不等于缴存税款',
    clientContext:
      'employer entity, deposit schedule (monthly or semiweekly), quarter, and deposit status',
    clientContextZh: '雇主实体、缴存日程（按月或半周）、所属季度和缴存状态',
    keyDates: {
      sourceLabel: 'IRS — Instructions for Form 941',
      sourceHref: 'https://www.irs.gov/instructions/i941',
      rows: [
        {
          label: 'Filing rule',
          labelZh: '申报规则',
          value: 'Form 941 is due the last day of the month after each quarter ends.',
          valueZh: 'Form 941 在每个季度结束后次月的最后一天到期。',
        },
        {
          label: 'Quarterly due dates',
          labelZh: '季度截止日',
          value: 'Q1 April 30, Q2 July 31, Q3 October 31, Q4 January 31.',
          valueZh:
            '第一季度 4 月 30 日、第二季度 7 月 31 日、第三季度 10 月 31 日、第四季度 1 月 31 日。',
        },
        {
          label: 'Timely-deposit grace',
          labelZh: '按时缴存宽限',
          value:
            'If all deposits were made on time and in full, you may file by the 10th day of the 2nd month after the quarter.',
          valueZh: '若所有缴存均按时足额完成，可在季度结束后第 2 个月的第 10 天前申报。',
        },
      ],
    },
  },
  {
    slug: '990-nonprofit-filing-deadline',
    label: 'Form 990 nonprofit return deadline',
    labelZh: 'Form 990 非营利组织申报截止日',
    sourceContext: 'IRS exempt-organization return due-date guidance and Form 8868 extension rules',
    sourceContextZh: 'IRS 豁免组织申报到期日指南与 Form 8868 延期规则',
    operationalRisk:
      'exempt-organization work keys off the 5th-month rule rather than April 15, and the 990-N e-Postcard cannot be extended',
    operationalRiskZh:
      '豁免组织工作依据「第 5 个月」规则而非 4 月 15 日，且 990-N e-Postcard 不可延期',
    clientContext:
      'exempt organization, accounting period, return type (990 / 990-EZ / 990-PF / 990-N), and extension status',
    clientContextZh: '豁免组织、会计期间、申报类型（990 / 990-EZ / 990-PF / 990-N）和延期状态',
    keyDates: {
      sourceLabel: 'IRS — Annual exempt organization return due date',
      sourceHref:
        'https://www.irs.gov/charities-non-profits/annual-exempt-organization-return-due-date',
      rows: [
        {
          label: 'Due-date rule',
          labelZh: '到期规则',
          value: "Due the 15th day of the 5th month after the organization's tax year ends.",
          valueZh: '在组织税年结束后第 5 个月的第 15 天到期。',
        },
        {
          label: 'Calendar-year filer',
          labelZh: '日历年纳税人',
          value: 'May 15 for a December 31 year-end.',
          valueZh: '12 月 31 日财年结束的为 5 月 15 日。',
        },
        {
          label: 'Extension (Form 8868)',
          labelZh: '延期（Form 8868）',
          value:
            'An automatic 6-month extension — to November 15 for calendar-year filers. Form 990-N cannot be extended.',
          valueZh: '自动延长 6 个月——日历年纳税人至 11 月 15 日。Form 990-N 不可延期。',
        },
      ],
    },
  },
  {
    slug: 'form-1120-c-corp-deadline',
    label: 'Form 1120 C corporation deadline',
    labelZh: 'Form 1120 C 类公司截止日',
    sourceContext: 'IRS Form 1120 instructions and corporate filing-period guidance',
    sourceContextZh: 'IRS Form 1120 说明与公司申报期间指南',
    operationalRisk:
      'C-corporation work pairs the original filing date with a separate payment deadline and a fiscal-year exception that does not follow the calendar',
    operationalRiskZh:
      'C 类公司工作把原始申报日、单独的付款截止日，以及不按日历年的财年例外放在一起',
    clientContext:
      'corporation profile, tax year end, estimated-payment status, state registration, and responsible owner',
    clientContextZh: '公司档案、税年结束日、估缴状态、州注册和负责人',
    keyDates: {
      sourceLabel: 'IRS — About Form 1120',
      sourceHref: 'https://www.irs.gov/forms-pubs/about-form-1120',
      rows: [
        {
          label: 'Original deadline',
          labelZh: '原始截止日',
          value:
            'April 15 — the 15th day of the 4th month after the tax year ends, for calendar-year corporations.',
          valueZh: '4 月 15 日——日历年公司为税年结束后第 4 个月的第 15 天。',
        },
        {
          label: 'Extension',
          labelZh: '延期',
          value: 'Form 7004 — an automatic 6-month extension of time to file, to October 15.',
          valueZh: 'Form 7004——自动延长 6 个月的申报时间，至 10 月 15 日。',
        },
        {
          label: 'June 30 fiscal-year filers',
          labelZh: '6 月 30 日财年纳税人',
          value:
            'A corporation with a June 30 year-end files by the 15th day of the 3rd month (September 15) under a special rule.',
          valueZh: '6 月 30 日财年结束的公司按特殊规则在第 3 个月的第 15 天（9 月 15 日）前申报。',
        },
        {
          label: 'Payment',
          labelZh: '付款',
          value:
            'An extension extends time to file, not time to pay; tax owed is still due by the original deadline.',
          valueZh: '延期只延长申报时间，不延长付款时间；应缴税款仍需在原始截止日前缴清。',
        },
      ],
    },
  },
  {
    slug: 'form-1040-individual-deadline',
    label: 'Form 1040 individual filing deadline',
    labelZh: 'Form 1040 个人申报截止日',
    sourceContext: 'IRS Form 1040 instructions and individual filing-period guidance',
    sourceContextZh: 'IRS Form 1040 说明与个人申报期间指南',
    operationalRisk:
      'individual return work separates the filing date from the payment date and from quarterly estimated-tax installments',
    operationalRiskZh: '个人申报工作把申报日、付款日和季度估缴分期分开',
    clientContext:
      'individual taxpayer, filing status, extension state, estimated-payment history, and responsible preparer',
    clientContextZh: '个人纳税人、申报身份、延期状态、估缴历史和负责的报税人',
    keyDates: {
      sourceLabel: 'IRS — About Form 1040',
      sourceHref: 'https://www.irs.gov/forms-pubs/about-form-1040',
      rows: [
        {
          label: 'Original deadline',
          labelZh: '原始截止日',
          value: 'April 15 for calendar-year individual taxpayers.',
          valueZh: '日历年个人纳税人为 4 月 15 日。',
        },
        {
          label: 'Extension',
          labelZh: '延期',
          value: 'Form 4868 — an automatic 6-month extension of time to file, to October 15.',
          valueZh: 'Form 4868——自动延长 6 个月的申报时间，至 10 月 15 日。',
        },
        {
          label: 'Payment',
          labelZh: '付款',
          value:
            'An extension extends time to file, not time to pay; tax owed is still due by April 15.',
          valueZh: '延期只延长申报时间，不延长付款时间；应缴税款仍需在 4 月 15 日前缴清。',
        },
      ],
    },
  },
  {
    slug: 'form-1041-estate-trust-deadline',
    label: 'Form 1041 estate and trust deadline',
    labelZh: 'Form 1041 遗产与信托截止日',
    sourceContext: 'IRS Form 1041 instructions and fiduciary filing guidance',
    sourceContextZh: 'IRS Form 1041 说明与受托人申报指南',
    operationalRisk:
      'fiduciary work pairs the filing date with beneficiary Schedule K-1 timing and a shorter extension than other business returns',
    operationalRiskZh:
      '受托人工作把申报日与受益人 Schedule K-1 时点，以及比其他企业申报更短的延期放在一起',
    clientContext:
      'estate or trust profile, tax year, beneficiary list, distribution status, and responsible fiduciary',
    clientContextZh: '遗产或信托档案、税年、受益人名单、分配状态和负责的受托人',
    keyDates: {
      sourceLabel: 'IRS — About Form 1041',
      sourceHref: 'https://www.irs.gov/forms-pubs/about-form-1041',
      rows: [
        {
          label: 'Original deadline',
          labelZh: '原始截止日',
          value:
            'April 15 — the 15th day of the 4th month after the tax year ends, for calendar-year estates and trusts.',
          valueZh: '4 月 15 日——日历年遗产与信托为税年结束后第 4 个月的第 15 天。',
        },
        {
          label: 'Extension',
          labelZh: '延期',
          value: 'Form 7004 — an automatic 5½-month extension of time to file, to September 30.',
          valueZh: 'Form 7004——自动延长 5 个半月的申报时间，至 9 月 30 日。',
        },
        {
          label: 'Payment',
          labelZh: '付款',
          value:
            'An extension extends time to file, not time to pay; tax owed is still due by the original deadline.',
          valueZh: '延期只延长申报时间，不延长付款时间；应缴税款仍需在原始截止日前缴清。',
        },
      ],
    },
  },
  {
    slug: 'form-940-futa-deadline',
    label: 'Form 940 FUTA deadline',
    labelZh: 'Form 940 联邦失业税（FUTA）截止日',
    sourceContext: 'IRS Form 940 instructions and FUTA deposit guidance',
    sourceContextZh: 'IRS Form 940 说明与 FUTA 缴存指南',
    operationalRisk:
      'unemployment-tax work separates the annual return from the deposit schedule and offers a short filing grace only when deposits were timely',
    operationalRiskZh:
      '失业税工作把年度申报与缴存日程分开，且只有在缴存按时完成时才有较短的申报宽限',
    clientContext: 'employer entity, FUTA deposit history, payroll periods, and deposit status',
    clientContextZh: '雇主实体、FUTA 缴存历史、工资周期和缴存状态',
    keyDates: {
      sourceLabel: 'IRS — Instructions for Form 940',
      sourceHref: 'https://www.irs.gov/instructions/i940',
      rows: [
        {
          label: 'Annual deadline',
          labelZh: '年度截止日',
          value: 'January 31 — Form 940 reports the prior calendar year of FUTA tax.',
          valueZh: '1 月 31 日——Form 940 申报上一日历年的 FUTA 税。',
        },
        {
          label: 'Timely-deposit grace',
          labelZh: '按时缴存宽限',
          value: 'If all FUTA tax was deposited on time and in full, you may file by February 10.',
          valueZh: '若所有 FUTA 税款均按时足额缴存，可在 2 月 10 日前申报。',
        },
        {
          label: 'Deposit vs file',
          labelZh: '缴存与申报',
          value:
            'FUTA tax is deposited quarterly once it exceeds the threshold; filing Form 940 is separate from depositing the tax.',
          valueZh: 'FUTA 税在超过门槛后按季度缴存；提交 Form 940 与缴存税款是两件事。',
        },
      ],
    },
  },
  {
    slug: 'form-w-2-filing-deadline',
    label: 'Form W-2 and W-3 filing deadline',
    labelZh: 'Form W-2 与 W-3 申报截止日',
    sourceContext: 'IRS General Instructions for Forms W-2 and W-3 and SSA filing guidance',
    sourceContextZh: 'IRS Forms W-2 与 W-3 通用说明及 SSA 申报指南',
    operationalRisk:
      'wage-statement work shares one January 31 date for both the employee copy and the SSA filing, and is subject to the aggregate e-file threshold',
    operationalRiskZh:
      '工资单工作的雇员副本与 SSA 申报共用 1 月 31 日同一日期，并受合计电子申报门槛约束',
    clientContext: 'employer entity, employee count, payroll provider, and filing method',
    clientContextZh: '雇主实体、雇员人数、工资服务商和申报方式',
    keyDates: {
      sourceLabel: 'IRS — General Instructions for Forms W-2 and W-3',
      sourceHref: 'https://www.irs.gov/instructions/iw2w3',
      rows: [
        {
          label: 'To employees',
          labelZh: '给雇员',
          value: 'Furnish Copies B, C, and 2 to employees by January 31.',
          valueZh: '在 1 月 31 日前把 Copy B、C、2 交给雇员。',
        },
        {
          label: 'To the SSA',
          labelZh: '给 SSA',
          value:
            'File Copy A of Form W-2 with Form W-3 with the Social Security Administration by January 31 — the same date.',
          valueZh:
            '在 1 月 31 日前把 Form W-2 的 Copy A 连同 Form W-3 报送社会保障局（SSA）——同一日期。',
        },
        {
          label: 'E-file threshold',
          labelZh: '强制电子申报',
          value: 'Ten or more information returns (all types combined) in a year must be e-filed.',
          valueZh: '一年内各类信息申报表合计达 10 份及以上必须电子申报。',
        },
      ],
    },
  },
  {
    slug: 'form-2553-s-corp-election-deadline',
    label: 'Form 2553 S corporation election deadline',
    labelZh: 'Form 2553 S 类公司选举截止日',
    sourceContext: 'IRS Form 2553 instructions and S-election timing guidance',
    sourceContextZh: 'IRS Form 2553 说明与 S 选举时点指南',
    operationalRisk:
      'the S election is a one-time timing decision, not an annual return — missing the window changes how the entity is taxed for the year',
    operationalRiskZh: 'S 选举是一次性的时点决定，而非年度申报——错过窗口会改变该年度实体的纳税方式',
    clientContext:
      'corporation profile, intended effective tax year, formation date, shareholder consents, and prior elections',
    clientContextZh: '公司档案、拟生效税年、成立日期、股东同意书和此前的选举',
    keyDates: {
      sourceLabel: 'IRS — Instructions for Form 2553',
      sourceHref: 'https://www.irs.gov/instructions/i2553',
      rows: [
        {
          label: 'Election window',
          labelZh: '选举窗口',
          value:
            'No later than 2 months and 15 days after the beginning of the tax year the election is to take effect.',
          valueZh: '不晚于拟生效税年开始后的 2 个月零 15 天。',
        },
        {
          label: 'Calendar-year corporations',
          labelZh: '日历年公司',
          value: 'For a calendar-year corporation electing for that year, that date is March 15.',
          valueZh: '对在该年选举的日历年公司，该日期为 3 月 15 日。',
        },
        {
          label: 'Prior-year option',
          labelZh: '前一税年选项',
          value:
            'The election may also be filed any time during the tax year before it takes effect.',
          valueZh: '也可以在生效年之前的整个税年内任何时间提交选举。',
        },
        {
          label: 'Late elections',
          labelZh: '逾期选举',
          value:
            'Relief for a late election may be available when specific IRS requirements are met.',
          valueZh: '在满足 IRS 特定条件时，逾期选举可能获得救济。',
        },
      ],
    },
  },
  {
    slug: 'form-5500-benefit-plan-deadline',
    label: 'Form 5500 benefit-plan filing deadline',
    labelZh: 'Form 5500 福利计划申报截止日',
    sourceContext: 'IRS Form 5500 series guidance and DOL EFAST2 filing requirements',
    sourceContextZh: 'IRS Form 5500 系列指南与 DOL EFAST2 申报要求',
    operationalRisk:
      'benefit-plan reporting runs on the plan year, not the tax year, so the filing date depends on when the plan year ends',
    operationalRiskZh: '福利计划申报按计划年度而非税年进行，申报日取决于计划年度何时结束',
    clientContext:
      'plan sponsor, plan year end, plan type, participant count, and EFAST2 filing status',
    clientContextZh: '计划发起人、计划年度结束日、计划类型、参与人数和 EFAST2 申报状态',
    keyDates: {
      sourceLabel: 'IRS — Form 5500 corner',
      sourceHref: 'https://www.irs.gov/retirement-plans/form-5500-corner',
      rows: [
        {
          label: 'Filing rule',
          labelZh: '申报规则',
          value: 'Due the last day of the 7th month after the plan year ends.',
          valueZh: '在计划年度结束后第 7 个月的最后一天到期。',
        },
        {
          label: 'Calendar-year plan',
          labelZh: '日历年计划',
          value: 'July 31 for a plan year ending December 31.',
          valueZh: '12 月 31 日结束的计划年度为 7 月 31 日。',
        },
        {
          label: 'Extension (Form 5558)',
          labelZh: '延期（Form 5558）',
          value:
            'A one-time extension of up to 2½ months — to October 15 for a calendar-year plan.',
          valueZh: '一次性延长最多 2 个半月——日历年计划至 10 月 15 日。',
        },
      ],
    },
  },
]

const KEY_DATES_NOTE: Record<Locale, string> = {
  en: 'If a deadline falls on a Saturday, Sunday, or legal holiday, it moves to the next business day. Always verify against the official IRS source; this page describes software workflows, not tax advice.',
  'zh-CN':
    '若截止日为周六、周日或法定假日，顺延至下一个工作日。请始终对照 IRS 官方来源核实；本页说明软件工作流，不提供税务建议。',
}

function buildKeyDates(spec: RuleReferenceSpec, locale: Locale): GuidePageCopy['keyDates'] {
  if (!spec.keyDates) return undefined
  const zh = locale === 'zh-CN'
  return {
    eyebrow: zh ? '关键日期' : 'KEY DATES',
    title: zh
      ? `${spec.labelZh} —— 联邦截止日（日历年纳税人）`
      : `${spec.label} — federal due dates (calendar-year filers)`,
    note: KEY_DATES_NOTE[locale],
    sourceLabel: spec.keyDates.sourceLabel,
    sourceHref: spec.keyDates.sourceHref,
    rows: spec.keyDates.rows.map((r) => ({
      label: zh ? r.labelZh : r.label,
      value: zh ? r.valueZh : r.value,
    })),
  }
}

function ruleReferencePage(spec: RuleReferenceSpec, locale: Locale): GuidePageCopy {
  if (locale === 'zh-CN') {
    return {
      slug: spec.slug,
      meta: {
        title: `${spec.labelZh} — DueDateHQ 规则参考`,
        description: `了解 DueDateHQ 如何把 ${spec.labelZh} 转成带官方来源、客户上下文、人工复核、证据状态和审计历史的 CPA 截止日运营工作。`,
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '规则参考',
        title: `${spec.labelZh} 不只是一个日期。`,
        description: `DueDateHQ 不把 ${spec.labelZh} 当作孤立日期，而是把${spec.sourceContextZh}、客户事实、复核状态和审计历史放在同一条运营链路里。`,
        note: '规则参考页面只解释软件建模方式，不提供税务建议。',
      },
      sections: [
        {
          eyebrow: '来源模型',
          title: '规则先从官方来源进入复核。',
          body: `${spec.sourceContextZh} 是 DueDateHQ 优先保存的来源上下文。AI 可以辅助摘要、提示缺口或整理来源摘录，但不能替代官方来源和人工复核决定。`,
          items: [
            {
              title: '来源链接',
              body: '规则需要保留官方页面链接，方便复核人和用户回看同一份材料。',
            },
            { title: '来源摘录', body: '相关摘录靠近运营动作展示，避免把结论变成黑盒建议。' },
            {
              title: '复核元数据',
              body: '复核时间、复核人和规则状态决定该规则能否进入生产截止日工作。',
            },
          ],
        },
        {
          eyebrow: '运营上下文',
          title: '规则只有结合客户事实才成为截止日工作。',
          body: `${spec.operationalRiskZh}。DueDateHQ 会把规则和${spec.clientContextZh}放在一起复核。`,
          items: [
            {
              title: '客户匹配',
              body: '适用性取决于事务所维护的客户事实、申报档案和专业复核。',
            },
            {
              title: '复核门槛',
              body: '低置信度或缺少来源的信号先进入复核，而不是静默改变客户截止日。',
            },
            {
              title: '审计历史',
              body: 'Apply、dismiss、undo 和 revert 都要留下可检查的操作历史。',
            },
          ],
        },
        {
          eyebrow: '产品落点',
          title: '这条规则最终服务于队列、证据和团队分工。',
          body: '当前 app 中，规则复核发生在 Rules Console，生成后的 deadline 进入 Dashboard 和 Deadlines 队列，证据抽屉与审计时间线解释为什么要处理这项工作。',
          items: [
            {
              title: 'Rules Console',
              body: 'Owner 或 manager 可以在 coverage、pending queue 和 source list 中复核规则来源和适用范围。',
            },
            {
              title: 'Deadlines 队列',
              body: '通过客户事实和规则生成的义务会带着状态、负责人、资料准备度、风险和证据一起进入队列。',
            },
            {
              title: 'Evidence drawer',
              body: '用户可以从 deadline、Dashboard 或提醒上下文打开证据链，解释来源、更新时间和操作历史。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: `${spec.labelZh} 常见问题。` },
      faq: [
        {
          question: `DueDateHQ 会判断 ${spec.labelZh} 是否适用吗？`,
          answer: '不会。它保留来源证据和客户上下文，由事务所复核适用性。',
        },
        {
          question: 'AI 在这里做什么？',
          answer: 'AI 可以摘要来源、提示缺失上下文或辅助迁移映射，但官方来源和人工复核才是控制点。',
        },
        {
          question: '这个页面是税务建议吗？',
          answer: '不是。它只是解释 DueDateHQ 如何把截止日规则建模成事务所运营工作。',
        },
      ],
      cta: {
        title: '查看公开规则模型。',
        body: 'DueDateHQ 把来源证据、客户上下文和复核状态放在截止日工作旁边。',
        primary: '打开规则库',
        secondary: '阅读每周分诊指南',
      },
      keyDates: buildKeyDates(spec, locale),
    }
  }

  return {
    slug: spec.slug,
    meta: {
      title: `${spec.label} — DueDateHQ Rule Reference`,
      description: `How DueDateHQ turns ${spec.label} into source-backed deadline operations with client context, review state, and audit history.`,
      ogImage: '/og/home.en.png',
    },
    hero: {
      eyebrow: 'RULE REFERENCE',
      title: `${spec.label} as source-backed deadline work.`,
      description: `DueDateHQ does not treat ${spec.label} as an isolated date. It keeps ${spec.sourceContext}, client context, review state, and audit history in the same operational chain.`,
      note: 'Rule reference pages explain software modeling, not tax advice.',
    },
    sections: [
      {
        eyebrow: 'SOURCE MODEL',
        title: 'The rule starts with official-source review.',
        body: `${spec.sourceContext} are the source context DueDateHQ prioritizes. AI can assist with summaries, but it does not replace the source or reviewer decision.`,
        items: [
          {
            title: 'Source URL',
            body: 'The rule should keep the official page URL so reviewers and users can inspect the same material.',
          },
          {
            title: 'Source excerpt',
            body: 'The relevant excerpt stays near the operational action instead of becoming a black-box recommendation.',
          },
          {
            title: 'Verified metadata',
            body: 'Review timestamp and review state decide whether a rule can enter production deadline work.',
          },
        ],
      },
      {
        eyebrow: 'OPERATIONS',
        title: 'A rule becomes deadline work only with client context.',
        body: `${spec.operationalRisk}. DueDateHQ reviews the rule alongside ${spec.clientContext}.`,
        items: [
          {
            title: 'Client fit',
            body: 'Applicability depends on firm client facts and professional review.',
          },
          {
            title: 'Review gate',
            body: 'Low-confidence or source-missing signals become review work instead of silently changing deadlines.',
          },
          {
            title: 'Audit trail',
            body: 'Apply, dismiss, undo, and revert actions should leave inspectable operational history.',
          },
        ],
      },
      {
        eyebrow: 'PRODUCT SURFACE',
        title: 'The rule supports queues, evidence, and team ownership.',
        body: 'In the current app, rule review lives in Rules Console. Generated deadlines flow into Dashboard and Deadlines, while the evidence drawer and audit timeline explain why the work exists.',
        items: [
          {
            title: 'Rules Console',
            body: 'Owners and managers can review rule source, coverage, pending queue items, and source registry context before rules become active.',
          },
          {
            title: 'Deadlines queue',
            body: 'Generated obligations carry status, owner, readiness, risk, and evidence context into the daily queue.',
          },
          {
            title: 'Evidence drawer',
            body: 'Users can inspect the source chain from deadline, Dashboard, or Alerts context instead of trusting an unexplained date.',
          },
        ],
      },
    ],
    faqHeader: { eyebrow: 'FAQ', title: `${spec.label} questions.` },
    faq: [
      {
        question: `Does DueDateHQ decide whether ${spec.label} applies?`,
        answer:
          'No. It preserves source evidence and client context so the CPA firm can review applicability.',
      },
      {
        question: 'What does AI do in this workflow?',
        answer:
          'AI can summarize sources, flag missing context, or assist migration mapping, but source evidence and human review are the control points.',
      },
      {
        question: 'Is this page tax advice?',
        answer: 'No. It explains how DueDateHQ models deadline rules as operational work.',
      },
    ],
    cta: {
      title: 'Review the public rule model.',
      body: 'DueDateHQ keeps source evidence and review state close to deadline work.',
      primary: 'Open rule library',
      secondary: 'Read weekly triage',
    },
    keyDates: buildKeyDates(spec, locale),
  }
}

function stateSummary(spec: StateSpec, locale: Locale): StateCard {
  if (locale === 'zh-CN') {
    return {
      slug: spec.slug,
      name: spec.name,
      abbreviation: spec.abbreviation,
      status: stateStatusLabel(locale),
      body: `${spec.agency} 的公开${spec.sourceSurfaceZh}可进入来源复核，用于${spec.taxFocusZh}的截止日运营判断。`,
      href: `/zh-CN/states/${spec.slug}`,
    }
  }

  return {
    slug: spec.slug,
    name: spec.name,
    abbreviation: spec.abbreviation,
    status: stateStatusLabel(locale),
    body: `${spec.agency} ${spec.sourceSurface} can enter source review for ${spec.taxFocus} in deadline operations.`,
    href: `/states/${spec.slug}`,
  }
}

function statePage(spec: StateSpec, locale: Locale): StatePageCopy {
  if (locale === 'zh-CN') {
    return {
      slug: spec.slug,
      name: spec.name,
      abbreviation: spec.abbreviation,
      meta: {
        title: `${spec.name} 州税务截止日监控 — DueDateHQ`,
        description: `了解 DueDateHQ 如何监控 ${spec.agency} 的公开${spec.sourceSurfaceZh}，并把 ${spec.name} ${spec.signalZh} 转成带来源、客户上下文和人工复核的截止日工作。`,
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: `州覆盖 · ${spec.abbreviation}`,
        title: `${spec.name} 州税务截止日，先从官方来源复核。`,
        description: `DueDateHQ 监控 ${spec.agency} 的公开${spec.sourceSurfaceZh}，在 ${spec.signalZh} 可能影响事务所截止日运营时保留来源、摘录、复核状态和客户匹配上下文。`,
        note: `${spec.name} 覆盖只描述软件监控范围，不是税务建议。`,
      },
      sourceTypes: [
        {
          title: `${spec.agency} 官方材料`,
          body: `优先使用 ${spec.agency} 的官方${spec.sourceSurfaceZh}，避免把第三方摘要当成来源。`,
        },
        {
          title: '表格与期间上下文',
          body: '表格、期间、纳税人类型和辖区线索会保留给人工复核。',
        },
        {
          title: '救济与通知更新',
          body: '公开救济、通知或截止日变动会先进入候选复核，而不是自动改客户工作。',
        },
      ],
      coveredSignals: [
        {
          title: spec.signalZh,
          body: '这些公开信号可以进入提醒复核，并保留来源链接、来源摘录和验证元数据。',
        },
        {
          title: spec.taxFocusZh,
          body: 'DueDateHQ 将信号和事务所客户申报档案、税种、期间上下文放在一起审查。',
        },
        {
          title: '运营路由',
          body: '复核后的信号可以成为 Dashboard、Deadlines 或邮件工作流的上下文。',
        },
      ],
      limitations: [
        `DueDateHQ 不判断某条 ${spec.name} 规则是否适用于具体客户。`,
        '覆盖依赖公开来源可访问性、来源清晰度和产品复核状态。',
        '客户专属信件、私有通知和专业判断不属于公开州覆盖页面的承诺范围。',
      ],
      faq: [
        {
          question: `${spec.name} 哪些信号会进入复核？`,
          answer: `${spec.signalZh} 会在可能影响截止日运营时进入带来源的复核。`,
        },
        {
          question: `${spec.name} 信号会自动改变客户截止日吗？`,
          answer: '不会。信号需要来源证据、客户上下文匹配和人工动作，才会影响实际运营工作。',
        },
      ],
    }
  }

  return {
    slug: spec.slug,
    name: spec.name,
    abbreviation: spec.abbreviation,
    meta: {
      title: `${spec.name} Tax Deadline Monitoring — DueDateHQ`,
      description: `How DueDateHQ monitors ${spec.agency} ${spec.sourceSurface} with source-backed review for CPA deadline operations.`,
      ogImage: '/og/home.en.png',
    },
    hero: {
      eyebrow: `STATE COVERAGE · ${spec.abbreviation}`,
      title: `${spec.name} tax deadlines, monitored at the source.`,
      description: `DueDateHQ monitors public ${spec.agency} ${spec.sourceSurface}, then preserves source context when ${spec.signal} may affect CPA deadline operations.`,
      note: `${spec.name} coverage describes monitoring scope, not tax advice.`,
    },
    sourceTypes: [
      {
        title: `${spec.agency} public material`,
        body: `Official ${spec.sourceSurface} are preferred over unsupported third-party summaries.`,
      },
      {
        title: 'Form and period context',
        body: 'Form, period, taxpayer type, jurisdiction, and relief details are retained when the public source provides them.',
      },
      {
        title: 'Relief and notice updates',
        body: 'Public relief notices, filing changes, and deadline movement enter review before they can affect client work.',
      },
    ],
    coveredSignals: [
      {
        title: spec.signal,
        body: 'Candidate signals keep source URL, excerpt, verification metadata, and review state attached.',
      },
      {
        title: spec.taxFocus,
        body: 'DueDateHQ reviews the signal against firm client filing profiles, tax types, and period context.',
      },
      {
        title: 'Operational routing',
        body: 'Reviewed signals can become Dashboard, Obligations, or email workflow context for affected clients.',
      },
    ],
    limitations: [
      `DueDateHQ does not decide whether a ${spec.name} rule applies to a specific client.`,
      'Coverage depends on public source availability, source clarity, and product review state.',
      'Client-specific notices, private correspondence, and professional judgment are outside public state coverage.',
    ],
    faq: [
      {
        question: `Which ${spec.name} signals can enter review?`,
        answer: `${spec.signal} can enter source-backed review when they may affect deadline operations.`,
      },
      {
        question: `Can a ${spec.name} signal automatically change client deadlines?`,
        answer:
          'No. Candidate signals require source evidence, client-context matching, and human action before operational use.',
      },
    ],
  }
}

export const supplementalGuides: Record<Locale, GuidePageCopy[]> = {
  en: [
    {
      slug: 'weekly-cpa-deadline-triage',
      meta: {
        title: 'Weekly CPA Deadline Triage — How to rank client filing risk',
        description:
          'A weekly workflow for ranking CPA deadline work by days remaining, missed-deadline risk, source evidence, client readiness, ownership, and state changes.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'How should a CPA firm triage deadlines every Monday?',
        description:
          'A reliable deadline workflow starts with a risk-ranked queue, not a calendar dump. DueDateHQ combines source evidence, client context, status, owner, and state-change signals so teams can see what needs attention first.',
        note: 'This guide describes deadline operations, not tax advice.',
      },
      sections: [
        {
          eyebrow: 'WEEKLY TRIAGE',
          title: 'The first question is not what is due next.',
          body: 'The work that deserves attention first is the work where deadline timing, client readiness, missed-deadline risk, and evidence quality create operational urgency.',
          items: [
            {
              title: 'Days remaining',
              body: 'Short timelines matter, but they should be read together with readiness and deadline risk.',
            },
            {
              title: 'Missed-deadline risk',
              body: 'Surfacing which filings carry the most risk helps a small team avoid spending the morning on low-priority work.',
            },
            {
              title: 'Source evidence',
              body: 'A row without verified source context should be treated differently from a reviewed obligation.',
            },
          ],
        },
        {
          eyebrow: 'OPERATING MODEL',
          title: 'A deadline queue should explain why each row is risky.',
          body: 'DueDateHQ keeps client facts, filing profile, state signal, owner, status, and evidence close to the action so the firm can defend the priority order.',
          items: [
            {
              title: 'Client readiness',
              body: 'Missing materials or unresolved facts can make a later deadline more urgent than an earlier ready one.',
            },
            {
              title: 'Owner assignment',
              body: 'Unowned deadline work is riskier because nobody is accountable for the next review step.',
            },
            {
              title: 'State alerts',
              body: 'State updates should move into review only with source context and affected-client clues.',
            },
          ],
        },
        {
          eyebrow: 'PRODUCT SURFACE',
          title: 'Triage should land in Today, Deadlines, and evidence review.',
          body: 'The current app uses Dashboard/Today to aggregate risk and Alerts, while the Deadlines queue carries filters, status updates, readiness, extension, risk, evidence, and audit detail.',
          items: [
            {
              title: 'Today/Dashboard',
              body: 'The homepage answers what to inspect first: open obligations, due-this-week work, review needs, evidence gaps, and Alerts.',
            },
            {
              title: 'Deadlines',
              body: 'The queue preserves URL filters, owner, status, evidence, and detail context so teams can share the same working state.',
            },
            {
              title: 'Audit/Evidence',
              body: 'The evidence drawer and audit timeline explain why the work exists and who changed what, when.',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Weekly deadline triage questions.' },
      faq: [
        {
          question: 'What should a CPA team review first on Monday?',
          answer:
            'Review the rows with the highest combined operational risk: days remaining, missed-deadline risk, readiness gaps, missing evidence, owner gaps, and state-change impact.',
        },
        {
          question: 'Why is a calendar not enough?',
          answer:
            'A calendar shows dates. It does not explain client readiness, source confidence, missed-deadline risk, or who owns the next action.',
        },
        {
          question: 'How does DueDateHQ keep triage defensible?',
          answer:
            'It keeps source evidence, client context, owner, status, and audit history near the deadline action.',
        },
      ],
      cta: {
        title: 'See how source evidence supports triage.',
        body: 'The public rule model explains how source-backed signals become reviewed deadline work.',
        primary: 'Open rule library',
        secondary: 'View state coverage',
      },
    },
    {
      slug: 'migrate-cpa-deadlines-from-excel',
      meta: {
        title: 'Migrate CPA Deadlines from Excel — DueDateHQ Guide',
        description:
          'How CPA firms move client deadline work from spreadsheets into source-backed filing profiles, obligations, evidence review, and weekly triage.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'How should a CPA firm move deadline work out of Excel?',
        description:
          'Spreadsheet migration should not just copy dates. The useful migration creates client context, filing profiles, obligation records, readiness state, source evidence, and ownership that can drive weekly deadline operations.',
        note: 'Migration support helps organize work; firms still review filing obligations.',
      },
      sections: [
        {
          eyebrow: 'MIGRATION MODEL',
          title: 'A spreadsheet row needs to become operational context.',
          body: 'DueDateHQ treats migration as a review workflow. Imported facts should be normalized, checked, and tied to the deadline work they create.',
          items: [
            {
              title: 'Client facts',
              body: 'Entity type, fiscal year, state footprint, owner, and contact context shape deadline generation.',
            },
            {
              title: 'Obligation mapping',
              body: 'Raw spreadsheet labels need to map to known filing surfaces before the team trusts them.',
            },
            {
              title: 'Review state',
              body: 'Low-confidence rows should become review work instead of silently creating confident reminders.',
            },
          ],
        },
        {
          eyebrow: 'AFTER IMPORT',
          title: 'The goal is a better weekly queue, not a prettier spreadsheet.',
          body: 'A successful migration lets the firm triage by risk, inspect evidence, and update obligations with an audit trail.',
          items: [
            {
              title: 'Evidence attachment',
              body: 'Imported obligations should eventually connect to official-source rules and reviewed state.',
            },
            {
              title: 'Owner handoff',
              body: 'The team needs to know who must resolve missing data or verify a candidate obligation.',
            },
            {
              title: 'Audit history',
              body: 'Apply, undo, and correction flows should leave operational history for later review.',
            },
          ],
        },
        {
          eyebrow: 'PRODUCT SURFACE',
          title: 'Migration Copilot is a four-step review flow, not a live sync engine.',
          body: 'The current product supports Intake, Mapping, Normalize, and Preview & apply. It can handle paste/upload and common export shapes, but public pages should not promise OAuth sync, webhook mirroring, or e-file transmission.',
          items: [
            {
              title: 'Intake',
              body: 'Users paste or upload client tables; SSN-like sensitive columns or parse failures block the flow.',
            },
            {
              title: 'Mapping and normalize',
              body: 'AI can suggest field mapping and normalization, while low-confidence values remain review work.',
            },
            {
              title: 'Preview & apply',
              body: 'The firm reviews dry-run output before apply writes clients, deadlines, evidence, and audit records.',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Excel migration questions.' },
      faq: [
        {
          question: 'Should a firm import every spreadsheet column?',
          answer:
            'No. Import the fields that affect filing profile, deadline generation, readiness, ownership, and review state.',
        },
        {
          question: 'Can AI map spreadsheet fields?',
          answer:
            'AI can suggest mappings and summarize low-confidence rows, but source evidence and human review remain the trust boundary.',
        },
        {
          question: 'What is the migration success metric?',
          answer:
            'The firm can run weekly deadline triage from reviewed client and obligation context instead of manually reconciling spreadsheets.',
        },
      ],
      cta: {
        title: 'Review the weekly triage model.',
        body: 'Migration creates the context that makes deadline risk visible.',
        primary: 'Read weekly triage',
        secondary: 'Open pricing',
      },
    },
    {
      slug: 'extension-vs-payment-deadlines',
      meta: {
        title: 'Extension vs Payment Deadlines — CPA Operations Guide',
        description:
          'Why CPA deadline software must separate filing extensions, payment timing, client readiness, source evidence, and review state.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'Why should extension and payment deadlines be tracked separately?',
        description:
          'For CPA operations, filing extension work and payment timing can create different risks. A workbench should keep source evidence, client facts, review state, and next actions visible before the team treats a deadline as safe.',
        note: 'This guide is operational guidance, not tax advice.',
      },
      sections: [
        {
          eyebrow: 'RISK SPLIT',
          title: 'An extension can reduce one risk while leaving another open.',
          body: 'Deadline operations should make the difference visible so teams do not assume a filing extension resolves every payment or client-readiness concern.',
          items: [
            {
              title: 'Filing action',
              body: 'The team needs to know whether extension paperwork is prepared, reviewed, and filed.',
            },
            {
              title: 'Payment context',
              body: 'Payment timing and estimate context may need separate review from the filing extension workflow.',
            },
            {
              title: 'Client readiness',
              body: 'Missing facts can still block good judgment even when a filing extension exists.',
            },
          ],
        },
        {
          eyebrow: 'PRODUCT MODEL',
          title: 'The product should keep the evidence and action split visible.',
          body: 'DueDateHQ frames extensions as reviewed operational work tied to source-backed rules, client context, and audit history.',
          items: [
            {
              title: 'Source-backed rule',
              body: 'The rule should point back to official material and a verification state.',
            },
            {
              title: 'Separate status',
              body: 'Filing, payment, readiness, and review status should not collapse into one vague reminder.',
            },
            {
              title: 'Audit trail',
              body: 'When the team applies or changes an extension-related action, the change should be inspectable later.',
            },
          ],
        },
        {
          eyebrow: 'PRODUCT SURFACE',
          title:
            'Deadline detail should keep readiness, extension, risk, evidence, and audit separate.',
          body: 'The current app separates Readiness, Extension, Risk, Evidence, and Audit in deadline detail. Public content can explain that separation, but it should not decide payment requirements for users.',
          items: [
            {
              title: 'Readiness',
              body: 'Client facts, request state, and missing materials determine whether the team can proceed.',
            },
            {
              title: 'Extension',
              body: 'Filing extension actions need separate review from payment context, client communication, and source rules.',
            },
            {
              title: 'Risk / Evidence / Audit',
              body: 'Risk explanation, source evidence, and action history support review instead of producing an unexplained reminder.',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Extension operations questions.' },
      faq: [
        {
          question: 'Why is extension tracking risky in spreadsheets?',
          answer:
            'A spreadsheet row often hides source evidence, payment context, readiness state, and who owns the next review step.',
        },
        {
          question: 'Does DueDateHQ decide payment requirements?',
          answer:
            'No. It keeps operational context and source evidence visible so the CPA firm can review and decide.',
        },
        {
          question: 'What should a deadline tool show for extension work?',
          answer:
            'It should show the filing action, payment context, client readiness, source evidence, owner, and audit trail.',
        },
      ],
      cta: {
        title: 'See how DueDateHQ models deadline risk.',
        body: 'Weekly triage keeps extension, payment, evidence, and readiness signals visible.',
        primary: 'Read weekly triage',
        secondary: 'Open rule library',
      },
    },
    {
      slug: 'multi-state-filing-deadlines',
      meta: {
        title: 'Multi-State Filing Deadlines for CPA Firms — Federal + State Due Dates',
        description:
          'The core federal business and individual filing deadlines (Forms 1065, 1120-S, 1120, 1040) for calendar-year filers, how state deadlines vary, and where to verify each against the official source.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'Multi-state filing deadlines, in one place.',
        description:
          'A CPA firm tracks one federal calendar plus a different deadline in every state a client touches. Below are the core federal due dates for calendar-year filers, how state deadlines differ, and where to confirm each.',
        note: 'Calendar-year filers. Verify every date against the official IRS or state source; this is software-workflow context, not tax advice.',
      },
      keyDates: {
        eyebrow: 'FEDERAL DUE DATES',
        title: 'Core federal deadlines (calendar-year filers)',
        note: 'An extension extends time to file, not time to pay. If a date falls on a weekend or legal holiday, it moves to the next business day. Verify against the official IRS source.',
        sourceLabel: 'IRS Publication 509 — Tax Calendars',
        sourceHref: 'https://www.irs.gov/publications/p509',
        rows: [
          {
            label: 'Partnership — Form 1065',
            value: 'March 15 → Form 7004 extension to September 15',
          },
          {
            label: 'S corporation — Form 1120-S',
            value: 'March 15 → Form 7004 extension to September 15',
          },
          {
            label: 'C corporation — Form 1120',
            value: 'April 15 → Form 7004 extension to October 15',
          },
          {
            label: 'Individual — Form 1040',
            value: 'April 15 → Form 4868 extension to October 15',
          },
        ],
      },
      sections: [
        {
          eyebrow: 'STATE VARIATION',
          title: 'State deadlines do not all match the federal calendar.',
          body: 'Some states conform to the federal due date; others set their own date and extension rules — and states without an income tax still file on their own schedule. Always confirm the specific state and entity type against the official Department of Revenue.',
          items: [
            {
              title: 'Conforming dates',
              body: 'Many states align their business return with the federal 15th-day-of-the-3rd-or-4th-month schedule, but extension lengths and tentative-payment rules differ.',
            },
            {
              title: 'Distinct state dates',
              body: 'Some states set their own date — e.g., Florida’s F-1120 for calendar-year filers is due May 1 (not April 15), and Texas franchise reports are due May 15.',
            },
            {
              title: 'No-income-tax states',
              body: 'States without an income tax still file — franchise tax in Texas, corporate income tax in Florida, B&O in Washington — each with its own deadline.',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Multi-state deadline questions.' },
      faq: [
        {
          question: 'When are partnership and S-corp returns due?',
          answer:
            'For calendar-year filers, Form 1065 and Form 1120-S are due March 15; Form 7004 extends the filing deadline to September 15. An extension extends time to file, not time to pay.',
        },
        {
          question: 'When are C-corp and individual returns due?',
          answer:
            'For calendar-year filers, Form 1120 and Form 1040 are due April 15; Form 7004 (C corporation) and Form 4868 (individual) extend the filing deadline to October 15.',
        },
        {
          question: 'Do state deadlines match the federal dates?',
          answer:
            'Not always. Some states conform; others set their own dates and extension rules. Verify each state and entity type against the official Department of Revenue — DueDateHQ links the official source for every state it covers.',
        },
      ],
      cta: {
        title: 'See the deadlines that apply to your clients.',
        body: 'DueDateHQ tracks each client’s federal and state filings with the official source beside every date.',
        primary: 'See state coverage',
        secondary: 'Open rule library',
      },
    },
    {
      slug: '2026-tax-deadline-calendar',
      meta: {
        title: '2026 Tax Deadline Calendar for CPA Firms — Federal Filing Dates',
        description:
          'The 2026 federal filing calendar for calendar-year filers: partnership, S-corp, C-corp, individual, estimated tax, and nonprofit deadlines, with the official IRS source.',
        ogImage: '/og/home.en.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'When are the 2026 federal tax deadlines for a CPA practice?',
        description:
          'The federal calendar for tax year 2025 returns filed in 2026 (calendar-year filers). State deadlines vary — see state coverage for each official Department of Revenue date — and an extension extends time to file, not time to pay.',
        note: 'This guide lists public federal filing dates, not tax advice. Verify against the official IRS source.',
      },
      sections: [
        {
          eyebrow: 'HOW TO READ IT',
          title: 'A calendar is a starting point, not a triage plan.',
          body: 'Knowing the dates is the easy part. The operational question is which clients each date actually puts at risk — that is what DueDateHQ ranks for the week.',
          items: [
            {
              title: 'Weekend & holiday rule',
              body: 'When a deadline lands on a Saturday, Sunday, or legal holiday, it moves to the next business day (in 2026 the March 15 entity deadline shifts to March 16).',
            },
            {
              title: 'Extensions',
              body: 'Form 7004 (entities) and Form 4868 (individuals) extend time to file, not time to pay — tax owed is still due by the original date.',
            },
            {
              title: 'State dates differ',
              body: 'States set their own deadlines and extension rules; check each state page for the official date and source.',
            },
          ],
        },
        {
          eyebrow: 'OPERATING MODEL',
          title: 'Turn the calendar into a ranked, source-backed queue.',
          body: 'DueDateHQ attaches each date to the clients it affects, with the official source, owner, readiness, and review status beside it — so the calendar becomes Monday-morning work, not a wall chart.',
          items: [
            {
              title: 'Per-client mapping',
              body: 'Each filing date is matched to the clients whose entity type and tax year make it apply.',
            },
            {
              title: 'Source on every date',
              body: 'Every deadline keeps its IRS or state source link so the date can be defended.',
            },
            {
              title: 'Change monitoring',
              body: 'If a date moves — a disaster postponement, a state change — affected clients surface in Alerts review.',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: '2026 tax deadline questions.' },
      faq: [
        {
          question: 'Why is the March 2026 entity deadline on the 16th, not the 15th?',
          answer:
            'March 15, 2026 is a Sunday, so the partnership (Form 1065) and S-corporation (Form 1120-S) deadline moves to the next business day, Monday March 16, 2026.',
        },
        {
          question: 'Do these federal dates apply to every state?',
          answer:
            'No. State filing deadlines vary by state and entity type. See the state coverage pages for each official Department of Revenue date and source.',
        },
        {
          question: 'Is this calendar tax advice?',
          answer:
            'No. It lists public federal filing dates. Verify your specific obligations against the official IRS source and a professional.',
        },
      ],
      cta: {
        title: 'See which 2026 deadlines hit your clients.',
        body: 'DueDateHQ maps every federal and state date to the clients it affects, with the source attached.',
        primary: 'See state coverage',
        secondary: 'Open rule library',
      },
      keyDates: {
        eyebrow: 'KEY DATES',
        title: '2026 federal filing calendar (calendar-year filers)',
        note: 'Tax year 2025 returns filed in 2026. If a date falls on a weekend or legal holiday it moves to the next business day; an extension extends time to file, not to pay.',
        sourceLabel: 'IRS — Publication 509, Tax Calendars',
        sourceHref: 'https://www.irs.gov/publications/p509',
        rows: [
          {
            label: 'March 16, 2026',
            value:
              'Partnership (Form 1065) and S-corporation (Form 1120-S) returns — March 15 falls on a Sunday in 2026; Form 7004 extends filing to September 15, 2026.',
          },
          {
            label: 'April 15, 2026',
            value:
              'C-corporation (Form 1120) and individual (Form 1040) returns; Q1 individual estimated tax (Form 1040-ES). Extensions move filing to October 15, 2026.',
          },
          {
            label: 'May 15, 2026',
            value:
              'Calendar-year exempt-organization returns (Form 990 series); Form 8868 extends filing to November 15, 2026.',
          },
          {
            label: 'June 15 & September 15, 2026; January 15, 2027',
            value: 'Remaining 2026 individual estimated-tax installments (Form 1040-ES).',
          },
          {
            label: 'September 15, 2026',
            value: 'Extended partnership and S-corporation returns.',
          },
          {
            label: 'October 15, 2026',
            value: 'Extended C-corporation and individual returns.',
          },
        ],
      },
    },
    {
      slug: 'payroll-tax-deadlines',
      meta: {
        title: 'Payroll tax deadlines for CPA firms — DueDateHQ guide',
        description:
          'How CPA teams keep federal payroll tax deadlines straight: Form 941 quarterly returns, Form 940 FUTA, W-2/W-3 and 1099-NEC by January 31, and the monthly vs semiweekly deposit schedule — each with its IRS source.',
        ogImage: '/og/guide.en.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'How should a CPA firm track payroll tax deadlines?',
        description:
          'Payroll runs on several overlapping clocks: a quarterly return, an annual FUTA return, January 31 wage statements, and a separate deposit schedule. DueDateHQ keeps each one source-backed and matched to the employer clients it affects.',
        note: 'This guide explains deadline operations, not tax advice.',
      },
      sections: [
        {
          eyebrow: 'THE CLOCKS',
          title: 'Payroll is not one deadline — it is four.',
          body: 'Filing a return is not the same as depositing the tax, and the annual statements run on their own date. A reliable workflow separates the quarterly return, the annual FUTA return, the January 31 wage statements, and the deposit schedule.',
          items: [
            {
              title: 'Form 941 — quarterly',
              body: 'The employer’s quarterly federal return, due the last day of the month after each quarter ends.',
            },
            {
              title: 'Form 940 — annual FUTA',
              body: 'The annual federal unemployment return, due January 31, with a short grace if deposits were timely.',
            },
            {
              title: 'W-2 and 1099-NEC',
              body: 'Wage and nonemployee-compensation statements, due January 31 to recipients and the government.',
            },
          ],
        },
        {
          eyebrow: 'DEPOSIT VS FILE',
          title: 'Depositing the tax is a separate obligation.',
          body: 'Most payroll-tax dollars move on a deposit schedule — monthly or semiweekly — set by a lookback period, not by the return date. Missing a deposit is a different failure mode than missing a return.',
          items: [
            {
              title: 'Monthly schedule',
              body: 'Monthly depositors deposit a month’s employment taxes by the 15th day of the following month.',
            },
            {
              title: 'Semiweekly schedule',
              body: 'Semiweekly depositors follow a Wednesday/Friday cadence tied to when payday falls.',
            },
            {
              title: 'Return ≠ deposit',
              body: 'Form 941 reports the quarter; the tax itself was already due on the deposit schedule.',
            },
          ],
        },
        {
          eyebrow: 'OPERATING MODEL',
          title: 'Make each payroll date source-backed and client-matched.',
          body: 'DueDateHQ attaches each payroll deadline to the employer clients it affects, with the official IRS source beside it, so a quarterly return, an annual FUTA filing, and a January 31 statement deadline surface as ranked work — not a wall chart.',
          items: [
            {
              title: 'Per-client mapping',
              body: 'Each payroll date is matched to the employer clients whose facts make it apply.',
            },
            {
              title: 'Source on every date',
              body: 'Every deadline keeps its IRS source link so the date can be defended.',
            },
            {
              title: 'Change monitoring',
              body: 'If a payroll date or rule moves, affected employer clients surface in Alerts review.',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Payroll tax deadline questions.' },
      faq: [
        {
          question: 'When are the Form 941 quarterly deadlines?',
          answer:
            'Form 941 is due the last day of the month after each quarter: April 30, July 31, October 31, and January 31.',
        },
        {
          question: 'Is filing the return the same as depositing the tax?',
          answer:
            'No. Payroll tax is deposited on a monthly or semiweekly schedule set by a lookback period; the return reports what was already due.',
        },
        {
          question: 'Is this guide tax advice?',
          answer:
            'No. It describes how DueDateHQ models payroll deadlines as source-backed operational work. Verify obligations against the official IRS source.',
        },
      ],
      cta: {
        title: 'See which payroll deadlines hit your clients.',
        body: 'DueDateHQ maps each federal payroll date to the employer clients it affects, with the source attached.',
        primary: 'Open rule library',
        secondary: 'Read weekly triage',
      },
      keyDates: {
        eyebrow: 'KEY DATES',
        title: 'Federal payroll filing deadlines (calendar-year basis)',
        note: 'If a date falls on a Saturday, Sunday, or legal holiday it moves to the next business day. Filing a return is separate from depositing the tax. Always verify against the official IRS source; this page describes software workflows, not tax advice.',
        sourceLabel: 'IRS — Employment Tax Due Dates',
        sourceHref:
          'https://www.irs.gov/businesses/small-businesses-self-employed/employment-tax-due-dates',
        rows: [
          {
            label: 'Form 941 (quarterly)',
            value:
              'April 30, July 31, October 31, and January 31 — the last day of the month after each quarter.',
          },
          {
            label: 'Form 940 (FUTA, annual)',
            value:
              'January 31 — or February 10 if all FUTA deposits were made on time and in full.',
          },
          {
            label: 'Form W-2 with W-3',
            value: 'January 31 — to employees and to the Social Security Administration.',
          },
          {
            label: 'Form 1099-NEC',
            value: 'January 31 — to recipients and to the IRS.',
          },
          {
            label: 'Deposit schedule',
            value:
              'Monthly (by the 15th of the next month) or semiweekly, set by the lookback period — separate from the return.',
          },
        ],
      },
    },
    {
      slug: 'deadline-monitoring-for-quickbooks-firms',
      meta: {
        title: 'Deadline monitoring for QuickBooks firms — DueDateHQ guide',
        description:
          'QuickBooks keeps the books; it does not watch IRS and state deadline or rule changes. How CPA and bookkeeping firms add a source-backed deadline-change monitoring layer alongside QuickBooks with DueDateHQ.',
        ogImage: '/og/guide.en.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: 'Deadline monitoring for QuickBooks-based firms',
        description:
          'QuickBooks is where the books live. It is not built to watch official IRS and state sources and tell you when a filing deadline or rule moves. DueDateHQ adds exactly that layer — alongside QuickBooks, not instead of it.',
        note: 'This guide explains how the tools fit together; it is not tax advice, and DueDateHQ is not affiliated with Intuit or QuickBooks.',
      },
      sections: [
        {
          eyebrow: 'WHAT QUICKBOOKS DOES',
          title: 'QuickBooks runs the ledger — not deadline-change monitoring.',
          body: 'QuickBooks is accounting and bookkeeping software: the general ledger, reconciliations, invoicing, and (with add-ons) payroll. Watching government sources for deadline and rule changes is not the job it is built for.',
          items: [
            {
              title: 'The books',
              body: 'Ledger, reconciliations, reporting, and the QuickBooks Online ecosystem your firm already relies on.',
            },
            {
              title: 'Not a source monitor',
              body: 'QuickBooks does not watch IRS or state pages for disaster postponements, deadline shifts, or rule changes.',
            },
            {
              title: 'Per-client deadlines',
              body: 'It does not map a moving federal or state deadline to the specific clients it affects.',
            },
          ],
        },
        {
          eyebrow: 'THE GAP',
          title: 'Deadlines and rules move — and the books will not tell you.',
          body: 'A disaster postponement, a changed state due date, a new filing rule — these happen at the source, not in your ledger. Firms on QuickBooks usually catch them through a patchwork of emails, spreadsheets, and memory.',
          items: [
            {
              title: 'Changes happen at the source',
              body: 'IRS and state agencies move dates and publish rules on their own pages, on their own schedule.',
            },
            {
              title: 'Who is affected?',
              body: 'The real question is which of your clients a change hits — before the deadline, not after.',
            },
            {
              title: 'Evidence on every date',
              body: 'When a date moves, you want the official source attached so the change can be reviewed and defended.',
            },
          ],
        },
        {
          eyebrow: 'TOGETHER',
          title: 'DueDateHQ + QuickBooks: the monitoring layer on top.',
          body: 'DueDateHQ sits alongside QuickBooks. It watches official IRS and state sources around the clock, routes each deadline and rule change to the clients it affects, and keeps the source on every date — while QuickBooks stays your system of record for the books.',
          items: [
            {
              title: 'Keep QuickBooks',
              body: 'Nothing migrates. DueDateHQ adds monitoring without replacing your accounting stack.',
            },
            {
              title: 'Source-backed changes',
              body: 'Each deadline and rule change carries its official IRS or state source, excerpt, and review state.',
            },
            {
              title: 'Affected-client review',
              body: 'Changes are matched to specific clients and human-reviewed before they become work.',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'QuickBooks + DueDateHQ questions.' },
      faq: [
        {
          question: 'Does DueDateHQ replace QuickBooks?',
          answer:
            'No. QuickBooks is your accounting and bookkeeping ledger; DueDateHQ is a deadline-and-rule-change monitoring layer. They do different jobs and work together.',
        },
        {
          question: 'Is DueDateHQ a QuickBooks alternative?',
          answer:
            'No — they are different categories. QuickBooks keeps the books; DueDateHQ watches official IRS and state sources for deadline and rule changes and maps them to your clients.',
        },
        {
          question: 'Can I use DueDateHQ with QuickBooks?',
          answer:
            'Yes. DueDateHQ is designed to sit alongside whatever accounting stack you run, including QuickBooks — it adds the monitoring layer without changing your books.',
        },
      ],
      cta: {
        title: 'Add deadline-change monitoring next to QuickBooks.',
        body: 'DueDateHQ watches official IRS and state sources and routes each change to the clients it affects, with the source attached.',
        primary: 'See how it works',
        secondary: 'Open rule library',
      },
    },
  ],
  'zh-CN': [
    {
      slug: 'weekly-cpa-deadline-triage',
      meta: {
        title: 'CPA 每周截止日分诊 — DueDateHQ 指南',
        description:
          '了解 CPA 团队如何按剩余天数、错过截止日的风险、来源证据、客户资料准备度、负责人、州级变化和审计历史来排序截止日风险，而不是只看日历日期或静态表格。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '指南',
        title: 'CPA 团队每周一应该如何分诊截止日？',
        description:
          '可靠的截止日工作流不是日历列表，而是按风险排序的工作队列。DueDateHQ 把来源证据、客户上下文、状态、负责人和州变化信号放在一起，让团队先看最该处理的工作。',
        note: '本指南解释截止日运营，不提供税务建议。',
      },
      sections: [
        {
          eyebrow: '每周分诊',
          title: '第一个问题不是哪个日期最早。',
          body: '真正该先处理的是截止日时点、客户资料准备度、错过截止日的风险和证据质量共同形成运营紧迫度的工作。',
          items: [
            { title: '剩余天数', body: '剩余天数重要，但要和资料准备度、截止日风险一起看。' },
            {
              title: '错过截止日的风险',
              body: '突出哪些申报风险最高，帮助小团队先处理优先级最高的工作。',
            },
            {
              title: '来源证据',
              body: '缺少已验证来源的行，不能和已复核义务一样处理。',
            },
          ],
        },
        {
          eyebrow: '运营模型',
          title: '截止日队列应该解释每一行为什么有风险。',
          body: 'DueDateHQ 把客户事实、申报档案、州级信号、负责人、状态和证据放在动作旁边，让优先级可以被解释。',
          items: [
            {
              title: '客户资料准备度',
              body: '材料缺失会让较晚的截止日比较早但已准备好的工作更紧急。',
            },
            {
              title: '负责人分配',
              body: '没有负责人的截止日工作风险更高，因为没有人负责下一步。',
            },
            {
              title: '州级提醒',
              body: '州变化必须带来源上下文和受影响客户线索进入复核。',
            },
          ],
        },
        {
          eyebrow: '产品落点',
          title: '分诊结果应能落到 Today、Deadlines 和证据抽屉。',
          body: '当前 app 的 Dashboard/Today surface 聚合风险和提醒，Deadlines 队列承载筛选、状态更新、readiness、extension、risk、evidence 和 audit 详情。',
          items: [
            {
              title: 'Today/Dashboard',
              body: '首页适合回答今天先看什么：未结义务、本周到期、待复核、证据缺口和 Alerts。',
            },
            {
              title: 'Deadlines',
              body: '队列保留 URL filters、owner、status、evidence 和 detail panel，便于团队共享同一工作状态。',
            },
            {
              title: 'Audit/Evidence',
              body: '证据抽屉和审计时间线解释为什么这项工作存在，以及谁在何时做过什么动作。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: '每周截止日分诊问题。' },
      faq: [
        {
          question: 'CPA 团队周一应该先看什么？',
          answer:
            '先看综合运营风险最高的行：剩余天数、错过截止日的风险、资料缺口、缺失证据、负责人缺口和州级变化影响。',
        },
        {
          question: '为什么 calendar 不够？',
          answer:
            'Calendar 展示日期，但不解释客户资料准备度、来源可信度、错过截止日的风险或下一步负责人。',
        },
        {
          question: 'DueDateHQ 如何让分诊可解释？',
          answer: '它把来源证据、客户上下文、负责人、状态和审计历史放在截止日动作附近。',
        },
      ],
      cta: {
        title: '查看来源证据如何支持分诊。',
        body: '公开规则模型解释带来源的信号如何变成已复核的截止日工作。',
        primary: '打开规则库',
        secondary: '查看州覆盖',
      },
    },
    {
      slug: 'migrate-cpa-deadlines-from-excel',
      meta: {
        title: '从 Excel 迁移 CPA 截止日 — DueDateHQ 指南',
        description:
          '了解 CPA 事务所如何把 Excel 或旧系统里的截止日表格转成客户事实、申报档案、截止日义务、复核状态、来源证据、负责人和每周分诊队列。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '指南',
        title: 'CPA 事务所应该如何把截止日工作从 Excel 迁出来？',
        description:
          '迁移不是复制日期。真正有用的迁移会创建客户上下文、申报档案、截止日义务、资料准备状态、来源证据和负责人。',
        note: 'Migration Copilot 帮助组织工作，具体申报义务仍需事务所复核。',
      },
      sections: [
        {
          eyebrow: '迁移模型',
          title: '表格行需要变成运营上下文。',
          body: 'DueDateHQ 把迁移当成复核工作流。导入事实需要标准化、检查，并和截止日工作关联。',
          items: [
            {
              title: '客户事实',
              body: '实体类型、财年、州足迹、负责人和联系人上下文会影响截止日。',
            },
            {
              title: '义务映射',
              body: '原始表格标签要映射到已知申报面，才能被团队信任。',
            },
            {
              title: '复核状态',
              body: '低置信度行应该进入复核工作，而不是静默创建看似可靠的提醒。',
            },
          ],
        },
        {
          eyebrow: '导入后',
          title: '目标是更好的每周队列，不是更漂亮的表格。',
          body: '成功迁移后，事务所可以按风险分诊、检查证据，并带审计链路更新义务。',
          items: [
            {
              title: '证据连接',
              body: '导入后的义务最终应连接到官方来源规则和已复核状态。',
            },
            {
              title: '负责人交接',
              body: '团队要知道谁负责解决缺失数据或验证候选义务。',
            },
            {
              title: '审计历史',
              body: 'Apply、undo 和 correction flow 应留下后续可检查的运营历史。',
            },
          ],
        },
        {
          eyebrow: '产品落点',
          title: 'Migration Copilot 是四步复核流程，不是实时同步器。',
          body: '当前产品支持 Intake、Mapping、Normalize、Preview & apply。它可以处理粘贴、上传和常见导出形态，但公开页面不应承诺 OAuth 双向同步、webhook 镜像或电子申报传输。',
          items: [
            {
              title: 'Intake',
              body: '用户粘贴或上传客户表格；检测到 SSN-like 敏感列或无法解析时会阻止继续。',
            },
            {
              title: 'Mapping 与 Normalize',
              body: 'AI 可以建议字段映射和归一化，但低置信度值仍需要人工复核。',
            },
            {
              title: 'Preview & apply',
              body: '正式导入前先看 dry-run 结果；apply 后写入客户、截止日、证据和审计记录。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'Excel 迁移问题。' },
      faq: [
        {
          question: '事务所应该导入每个 spreadsheet 字段吗？',
          answer:
            '不应该。优先导入会影响申报档案、截止日生成、资料准备度、负责人和复核状态的字段。',
        },
        {
          question: 'AI 可以映射 spreadsheet 字段吗？',
          answer: 'AI 可以建议字段映射并总结低置信度行，但来源证据和人工复核仍是信任边界。',
        },
        {
          question: '迁移成功的标准是什么？',
          answer: '事务所可以从已复核客户和义务上下文运行每周截止日分诊，而不是继续手工对账表格。',
        },
      ],
      cta: {
        title: '查看每周分诊模型。',
        body: '迁移创建让截止日风险可见的上下文。',
        primary: '阅读每周分诊',
        secondary: '查看价格',
      },
    },
    {
      slug: 'extension-vs-payment-deadlines',
      meta: {
        title: '延期申报 vs 付款截止日 — CPA 运营指南',
        description:
          '了解为什么 CPA 截止日软件需要区分申报延期、付款时点、客户资料准备度、来源证据、复核状态和审计历史，避免把延期申报误当成所有风险都已解决。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '指南',
        title: '为什么延期申报和付款截止日要分开跟踪？',
        description:
          '对 CPA 运营来说，申报延期和付款时点会产生不同风险。工作台应在团队认为截止日安全前展示来源证据、客户事实、复核状态和下一步动作。',
        note: '本指南是运营解释，不提供税务建议。',
      },
      sections: [
        {
          eyebrow: '风险拆分',
          title: '延期申报可能降低一种风险，但留下另一种风险。',
          body: '截止日运营应明确区分这些风险，避免团队以为申报延期解决了所有付款或资料准备问题。',
          items: [
            {
              title: '申报动作',
              body: '团队需要知道延期申报材料是否准备、复核、提交。',
            },
            {
              title: '付款上下文',
              body: '付款时点和估算上下文可能需要独立于申报延期的复核。',
            },
            {
              title: '客户资料准备度',
              body: '即使存在延期，缺失事实仍可能阻断专业判断。',
            },
          ],
        },
        {
          eyebrow: '产品模型',
          title: '产品应该让证据和动作拆分保持可见。',
          body: 'DueDateHQ 把延期当成和带来源规则、客户上下文、审计历史绑定的已复核运营工作。',
          items: [
            { title: '带来源的规则', body: '规则应指向官方材料和验证状态。' },
            {
              title: '分离状态',
              body: '申报、付款、资料准备度和复核状态不应该被压成一个模糊提醒。',
            },
            {
              title: '审计历史',
              body: '团队应用或修改延期相关动作时，后续应可检查。',
            },
          ],
        },
        {
          eyebrow: '产品落点',
          title: 'Deadlines 详情页应该把资料准备、延期、风险和证据分开呈现。',
          body: '当前 app 的截止日详情用多个标签页承载 Readiness、Extension、Risk、Evidence 和 Audit。公开内容可以解释这种分离，但不能替用户判断付款要求。',
          items: [
            {
              title: 'Readiness',
              body: '客户资料、请求状态和缺失项决定团队是否可以继续处理。',
            },
            {
              title: '延期',
              body: '延期申报动作需要和付款上下文、客户沟通和来源规则分开复核。',
            },
            {
              title: 'Risk / Evidence / Audit',
              body: '风险解释、来源证据和操作历史共同支持后续复核，而不是生成不可追溯提醒。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: '延期运营问题。' },
      faq: [
        {
          question: '为什么 spreadsheet 里 tracking extension 有风险？',
          answer: '表格行往往隐藏来源证据、付款上下文、资料准备状态和下一步负责人。',
        },
        {
          question: 'DueDateHQ 会判断付款要求吗？',
          answer: '不会。它让运营上下文和来源证据可见，由 CPA 事务所复核和决定。',
        },
        {
          question: '截止日工具应该展示延期工作的什么？',
          answer: '应展示申报动作、付款上下文、客户资料准备度、来源证据、负责人和审计链路。',
        },
      ],
      cta: {
        title: '查看 DueDateHQ 如何建模截止日风险。',
        body: '每周分诊让延期、付款、证据和资料准备度信号保持可见。',
        primary: '阅读每周分诊',
        secondary: '打开规则库',
      },
    },
    {
      slug: 'multi-state-filing-deadlines',
      meta: {
        title: '面向 CPA 事务所的多州申报截止日 — 联邦 + 各州截止日',
        description:
          '日历年纳税人的核心联邦企业与个人申报截止日（Form 1065、1120-S、1120、1040）、各州截止日如何不同，以及在哪里对照官方来源核实。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: 'GUIDE',
        title: '多州申报截止日，集中在一处。',
        description:
          'CPA 事务所要盯一套联邦日历，外加客户涉及的每个州各自不同的截止日。下面是日历年纳税人的核心联邦截止日、各州截止日的差异，以及在哪里逐一核实。',
        note: '日历年纳税人。每个日期都请对照 IRS 或各州官方来源核实；这是软件工作流上下文，不是税务建议。',
      },
      keyDates: {
        eyebrow: '联邦截止日',
        title: '核心联邦截止日（日历年纳税人）',
        note: '延期只延长申报时间，不延长付款时间。若日期为周末或法定假日，顺延至下一个工作日。请对照 IRS 官方来源核实。',
        sourceLabel: 'IRS Publication 509 — Tax Calendars',
        sourceHref: 'https://www.irs.gov/publications/p509',
        rows: [
          { label: '合伙企业 — Form 1065', value: '3 月 15 日 → Form 7004 延期至 9 月 15 日' },
          {
            label: 'S corporation — Form 1120-S',
            value: '3 月 15 日 → Form 7004 延期至 9 月 15 日',
          },
          {
            label: 'C corporation — Form 1120',
            value: '4 月 15 日 → Form 7004 延期至 10 月 15 日',
          },
          { label: '个人 — Form 1040', value: '4 月 15 日 → Form 4868 延期至 10 月 15 日' },
        ],
      },
      sections: [
        {
          eyebrow: '各州差异',
          title: '各州截止日并不都和联邦一致。',
          body: '有些州与联邦截止日一致；有些州自定日期和延期规则——没有所得税的州也仍有各自的申报。请始终对照官方 Department of Revenue 核实具体的州和实体类型。',
          items: [
            {
              title: '一致的日期',
              body: '很多州把企业申报对齐到联邦“第 3 或第 4 个月第 15 天”的节奏，但延期时长和预缴规则各不相同。',
            },
            {
              title: '自定的州日期',
              body: '有些州自定日期——例如 Florida 的 F-1120 日历年纳税人为 5 月 1 日（不是 4 月 15 日），德州 franchise 报告为 5 月 15 日。',
            },
            {
              title: '无所得税的州',
              body: '没有所得税的州仍要申报——德州的 franchise tax、Florida 的公司所得税、Washington 的 B&O——各有自己的截止日。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: '多州截止日常见问题。' },
      faq: [
        {
          question: '合伙企业和 S corp 的申报什么时候到期？',
          answer:
            '日历年纳税人的 Form 1065 和 Form 1120-S 为 3 月 15 日到期；Form 7004 把申报截止日延到 9 月 15 日。延期只延长申报时间，不延长付款时间。',
        },
        {
          question: 'C corp 和个人的申报什么时候到期？',
          answer:
            '日历年纳税人的 Form 1120 和 Form 1040 为 4 月 15 日到期；Form 7004（C corporation）和 Form 4868（个人）把申报截止日延到 10 月 15 日。',
        },
        {
          question: '各州截止日和联邦日期一致吗？',
          answer:
            '不总是。有些州一致；有些州自定日期和延期规则。请对照官方 Department of Revenue 核实每个州和实体类型——DueDateHQ 为它覆盖的每个州都给出官方来源链接。',
        },
      ],
      cta: {
        title: '看清适用于你客户的截止日。',
        body: 'DueDateHQ 跟踪每个客户的联邦与各州申报，每个日期旁都带官方来源。',
        primary: '查看州覆盖',
        secondary: '打开规则库',
      },
    },
    {
      slug: '2026-tax-deadline-calendar',
      meta: {
        title: '2026 年 CPA 税务截止日日历 —— 联邦申报日期',
        description:
          '面向日历年纳税人的 2026 年联邦申报日历：合伙企业、S-corp、C-corp、个人、估算税与非营利组织的截止日，附官方 IRS 来源。',
        ogImage: '/og/home.zh-CN.png',
      },
      hero: {
        eyebrow: '指南',
        title: 'CPA 事务所的 2026 年联邦税务截止日是哪些？',
        description:
          '2025 税年、2026 年申报的联邦日历（日历年纳税人）。各州截止日不一——请在州覆盖页查看每个州官方 Department of Revenue 的日期；延期只延长申报时间，不延长付款时间。',
        note: '本指南列出公开的联邦申报日期，不提供税务建议。请对照官方 IRS 来源核实。',
      },
      sections: [
        {
          eyebrow: '如何使用',
          title: '日历只是起点，不是分诊计划。',
          body: '知道日期是容易的部分。真正的运营问题是每个日期实际把哪些客户置于风险——这正是 DueDateHQ 为一周排序的内容。',
          items: [
            {
              title: '周末与假日规则',
              body: '当截止日落在周六、周日或法定假日时，顺延至下一个工作日（2026 年 3 月 15 日的实体截止日顺延至 3 月 16 日）。',
            },
            {
              title: '延期',
              body: 'Form 7004（实体）与 Form 4868（个人）只延长申报时间，不延长付款时间——应缴税款仍须在原始截止前缴清。',
            },
            {
              title: '各州日期不同',
              body: '各州自行设定截止日与延期规则；请在各州页查看官方日期和来源。',
            },
          ],
        },
        {
          eyebrow: '运营模型',
          title: '把日历变成可排序、带来源的队列。',
          body: 'DueDateHQ 把每个日期连到受影响的客户，并在旁边附上官方来源、负责人、资料准备度和复核状态——让日历成为周一早上的工作，而不是一张墙上的挂历。',
          items: [
            {
              title: '逐客户映射',
              body: '每个申报日期都匹配到其实体类型和税年使之适用的客户。',
            },
            {
              title: '每个日期都附来源',
              body: '每个截止日都保留 IRS 或州的来源链接，使该日期可被复核。',
            },
            {
              title: '变化监控',
              body: '一旦日期变动——灾害延期、某州调整——受影响的客户会在 Alerts 复核中浮现。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: '2026 税务截止日常见问题。' },
      faq: [
        {
          question: '为什么 2026 年 3 月的实体截止日是 16 日而不是 15 日？',
          answer:
            '2026 年 3 月 15 日是星期日，因此合伙企业（Form 1065）与 S-corporation（Form 1120-S）的截止日顺延至下一个工作日，即 2026 年 3 月 16 日（周一）。',
        },
        {
          question: '这些联邦日期适用于所有州吗？',
          answer:
            '不。各州申报截止日因州和实体类型而异。请在州覆盖页查看每个州官方 Department of Revenue 的日期和来源。',
        },
        {
          question: '这份日历是税务建议吗？',
          answer:
            '不是。它列出公开的联邦申报日期。请对照官方 IRS 来源并咨询专业人士，核实你的具体义务。',
        },
      ],
      cta: {
        title: '看看哪些 2026 截止日会影响你的客户。',
        body: 'DueDateHQ 把每个联邦与各州日期映射到受影响的客户，并附上来源。',
        primary: '查看州覆盖',
        secondary: '打开规则库',
      },
      keyDates: {
        eyebrow: '关键日期',
        title: '2026 年联邦申报日历（日历年纳税人）',
        note: '2025 税年、2026 年申报。若日期落在周末或法定假日则顺延至下一个工作日；延期只延长申报时间，不延长付款时间。',
        sourceLabel: 'IRS — Publication 509, Tax Calendars',
        sourceHref: 'https://www.irs.gov/publications/p509',
        rows: [
          {
            label: '2026 年 3 月 16 日',
            value:
              '合伙企业（Form 1065）与 S-corporation（Form 1120-S）申报——2026 年 3 月 15 日为周日；Form 7004 可延长申报至 2026 年 9 月 15 日。',
          },
          {
            label: '2026 年 4 月 15 日',
            value:
              'C-corporation（Form 1120）与个人（Form 1040）申报；第一期个人估算税（Form 1040-ES）。延期后申报截止移至 2026 年 10 月 15 日。',
          },
          {
            label: '2026 年 5 月 15 日',
            value:
              '日历年非营利组织申报（Form 990 系列）；Form 8868 可延长申报至 2026 年 11 月 15 日。',
          },
          {
            label: '2026 年 6 月 15 日、9 月 15 日；2027 年 1 月 15 日',
            value: '2026 年剩余的个人估算税分期（Form 1040-ES）。',
          },
          {
            label: '2026 年 9 月 15 日',
            value: '延期后的合伙企业与 S-corporation 申报。',
          },
          {
            label: '2026 年 10 月 15 日',
            value: '延期后的 C-corporation 与个人申报。',
          },
        ],
      },
    },
    {
      slug: 'payroll-tax-deadlines',
      meta: {
        title: 'CPA 事务所的工资税截止日 — DueDateHQ 指南',
        description:
          '了解 CPA 团队如何理清联邦工资税截止日：Form 941 季度申报、Form 940 FUTA、1 月 31 日的 W-2/W-3 与 1099-NEC，以及按月与半周的缴存日程——每一项都附 IRS 来源。',
        ogImage: '/og/guide.zh-CN.png',
      },
      hero: {
        eyebrow: '指南',
        title: 'CPA 事务所应该如何跟踪工资税截止日？',
        description:
          '工资税同时跑着几条时钟：季度申报、年度 FUTA 申报、1 月 31 日的工资单，以及单独的缴存日程。DueDateHQ 让每一条都带官方来源，并匹配到受影响的雇主客户。',
        note: '本指南解释截止日运营，不提供税务建议。',
      },
      sections: [
        {
          eyebrow: '几条时钟',
          title: '工资税不是一个截止日，而是四个。',
          body: '提交申报不等于缴存税款，年度工资单又有自己的日期。可靠的工作流会把季度申报、年度 FUTA 申报、1 月 31 日工资单和缴存日程分开。',
          items: [
            {
              title: 'Form 941——季度',
              body: '雇主的季度联邦申报，在每个季度结束后次月的最后一天到期。',
            },
            {
              title: 'Form 940——年度 FUTA',
              body: '年度联邦失业税申报，1 月 31 日到期；若缴存按时则有较短宽限。',
            },
            {
              title: 'W-2 与 1099-NEC',
              body: '工资单与非雇员报酬单，1 月 31 日前交给收件人和政府。',
            },
          ],
        },
        {
          eyebrow: '缴存与申报',
          title: '缴存税款是另一项独立义务。',
          body: '大部分工资税款按缴存日程流动——按月或半周——由 lookback period 决定，而不是申报日。漏缴存与漏申报是两种不同的失败。',
          items: [
            {
              title: '按月日程',
              body: '按月缴存人在次月第 15 天前缴存上个月的雇佣税。',
            },
            {
              title: '半周日程',
              body: '半周缴存人按与发薪日挂钩的周三/周五节奏缴存。',
            },
            {
              title: '申报 ≠ 缴存',
              body: 'Form 941 申报的是整个季度；税款本身早已按缴存日程到期。',
            },
          ],
        },
        {
          eyebrow: '运营模型',
          title: '让每个工资税日期都带来源、并匹配到客户。',
          body: 'DueDateHQ 把每个工资税截止日匹配到受影响的雇主客户，并在旁边附上官方 IRS 来源——季度申报、年度 FUTA、1 月 31 日工资单都作为按风险排序的工作出现，而不是一张挂历。',
          items: [
            {
              title: '按客户匹配',
              body: '每个工资税日期都匹配到事实上适用的雇主客户。',
            },
            {
              title: '每个日期都带来源',
              body: '每个截止日都保留 IRS 来源链接，以便日期可被解释。',
            },
            {
              title: '变化监控',
              body: '若工资税日期或规则发生变动，受影响的雇主客户会进入 Alerts 复核。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: '工资税截止日常见问题。' },
      faq: [
        {
          question: 'Form 941 的季度截止日是哪几天？',
          answer:
            'Form 941 在每个季度结束后次月的最后一天到期：4 月 30 日、7 月 31 日、10 月 31 日和 1 月 31 日。',
        },
        {
          question: '提交申报等于缴存税款吗？',
          answer:
            '不等于。工资税按 lookback period 决定的按月或半周日程缴存；申报只是申报已到期的税款。',
        },
        {
          question: '这个指南是税务建议吗？',
          answer:
            '不是。它说明 DueDateHQ 如何把工资税截止日建模成带来源的运营工作。请对照官方 IRS 来源核实义务。',
        },
      ],
      cta: {
        title: '看清哪些工资税截止日影响你的客户。',
        body: 'DueDateHQ 把每个联邦工资税日期匹配到受影响的雇主客户，并附上来源。',
        primary: '打开规则库',
        secondary: '阅读每周分诊指南',
      },
      keyDates: {
        eyebrow: '关键日期',
        title: '联邦工资税申报截止日（以日历年为基准）',
        note: '若日期为周六、周日或法定假日，顺延至下一个工作日。提交申报与缴存税款是两件事。请始终对照 IRS 官方来源核实；本页说明软件工作流，不提供税务建议。',
        sourceLabel: 'IRS — Employment Tax Due Dates',
        sourceHref:
          'https://www.irs.gov/businesses/small-businesses-self-employed/employment-tax-due-dates',
        rows: [
          {
            label: 'Form 941（季度）',
            value:
              '4 月 30 日、7 月 31 日、10 月 31 日和 1 月 31 日——每个季度结束后次月的最后一天。',
          },
          {
            label: 'Form 940（FUTA，年度）',
            value: '1 月 31 日——若所有 FUTA 税款均按时足额缴存，则为 2 月 10 日。',
          },
          {
            label: 'Form W-2 连同 W-3',
            value: '1 月 31 日——交给雇员并报送社会保障局（SSA）。',
          },
          {
            label: 'Form 1099-NEC',
            value: '1 月 31 日——交给收件人并报送 IRS。',
          },
          {
            label: '缴存日程',
            value: '按月（次月 15 日前）或半周，由 lookback period 决定——与申报相互独立。',
          },
        ],
      },
    },
    {
      slug: 'deadline-monitoring-for-quickbooks-firms',
      meta: {
        title: '面向 QuickBooks 事务所的截止日监控 — DueDateHQ 指南',
        description:
          'QuickBooks 管的是账，不会监控 IRS 与各州的截止日或规则变化。了解 CPA 与记账事务所如何用 DueDateHQ 在 QuickBooks 旁边加上一层带来源的截止日变化监控。',
        ogImage: '/og/guide.zh-CN.png',
      },
      hero: {
        eyebrow: '指南',
        title: '面向 QuickBooks 事务所的截止日监控',
        description:
          'QuickBooks 是账务所在的地方，但它并非为监控官方 IRS 与各州来源、在截止日或规则变动时提醒你而设计。DueDateHQ 补的正是这一层——叠加在 QuickBooks 旁边，而不是替换它。',
        note: '本指南说明两类工具如何配合，不提供税务建议；DueDateHQ 与 Intuit 或 QuickBooks 无任何关联。',
      },
      sections: [
        {
          eyebrow: 'QuickBooks 做什么',
          title: 'QuickBooks 跑的是账本，不是截止日变化监控。',
          body: 'QuickBooks 是会计与记账软件：总账、对账、开票，以及（通过附加模块）工资。监控政府来源的截止日与规则变化，并不是它被设计来做的事。',
          items: [
            {
              title: '账本',
              body: '总账、对账、报表，以及你事务所已在依赖的 QuickBooks Online 生态。',
            },
            {
              title: '并非来源监控',
              body: 'QuickBooks 不会监控 IRS 或各州页面的灾害延期、截止日变动或规则变化。',
            },
            {
              title: '逐客户截止日',
              body: '它不会把一个变动中的联邦或州截止日映射到具体受影响的客户。',
            },
          ],
        },
        {
          eyebrow: '缺口',
          title: '截止日和规则会变——而账本不会告诉你。',
          body: '灾害延期、某州改了截止日、出了新申报规则——这些发生在官方来源，而不是你的账本里。用 QuickBooks 的事务所通常靠邮件、表格和记忆拼凑着接住它们。',
          items: [
            {
              title: '变化发生在来源处',
              body: 'IRS 与各州机构在它们自己的页面、按它们自己的节奏调整日期、发布规则。',
            },
            {
              title: '谁受影响？',
              body: '真正的问题是某条变化命中你的哪些客户——在截止日之前，而不是之后。',
            },
            {
              title: '每个日期都带证据',
              body: '日期一变动，你会希望附上官方来源，以便复核与解释。',
            },
          ],
        },
        {
          eyebrow: '一起使用',
          title: 'DueDateHQ + QuickBooks：叠加在上层的监控层。',
          body: 'DueDateHQ 叠加在 QuickBooks 旁边：全天候监控官方 IRS 与各州来源，把每条截止日与规则变化路由到受影响的客户，并为每个日期保留来源——而 QuickBooks 仍是你账务的系统记录。',
          items: [
            {
              title: '保留 QuickBooks',
              body: '无需迁移。DueDateHQ 只加监控，不替换你的会计工具栈。',
            },
            {
              title: '带来源的变化',
              body: '每条截止日与规则变化都带官方 IRS 或州来源、摘录和复核状态。',
            },
            {
              title: '受影响客户复核',
              body: '变化先匹配到具体客户、经人工复核，再成为工作。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: 'QuickBooks + DueDateHQ 常见问题。' },
      faq: [
        {
          question: 'DueDateHQ 会替代 QuickBooks 吗？',
          answer:
            '不会。QuickBooks 是你的会计与记账账本；DueDateHQ 是截止日与规则变化监控层。两者做不同的事，并且互相配合。',
        },
        {
          question: 'DueDateHQ 是 QuickBooks 的替代方案吗？',
          answer:
            '不是——它们属于不同品类。QuickBooks 管账；DueDateHQ 监控官方 IRS 与各州来源的截止日与规则变化，并映射到你的客户。',
        },
        {
          question: '可以和 QuickBooks 一起用吗？',
          answer:
            '可以。DueDateHQ 设计为叠加在你使用的任何会计工具栈旁边，包括 QuickBooks——只加监控层，不改动你的账务。',
        },
      ],
      cta: {
        title: '在 QuickBooks 旁边加上截止日变化监控。',
        body: 'DueDateHQ 监控官方 IRS 与各州来源，把每条变化路由到受影响的客户，并附上来源。',
        primary: '看它如何运作',
        secondary: '打开规则库',
      },
    },
  ],
}

// Capitalize the first letter of an English positioning fragment for table cells.
const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function comparisonPage(spec: ComparisonSpec, locale: Locale): GuidePageCopy {
  if (locale === 'zh-CN') {
    return {
      slug: spec.slug,
      meta: {
        title: `DueDateHQ vs ${spec.product} — 截止日运营对比`,
        description: `把 DueDateHQ 作为 ${spec.product} 的截止日变化监控替代/补充来比较：CPA 截止日风险、官方来源证据、州级提醒复核、迁移成本与每周分诊——以及两者如何并用。`,
        ogImage: '/og/home.zh-CN.png',
      },
      comparisonTable: {
        eyebrow: '一览',
        title: `DueDateHQ 与 ${spec.product}，并排对比`,
        mineLabel: 'DueDateHQ',
        theirsLabel: spec.product,
        rows: [
          {
            dimension: '这是什么',
            mine: '面向 CPA 事务所的截止日与规则变化监控层',
            theirs: spec.positioningZh,
          },
          {
            dimension: '最适合',
            mine: '希望在现有工具栈之上叠加带来源的截止日与规则监控的事务所',
            theirs: spec.bestFitZh,
          },
          {
            dimension: '官方来源级截止日变化监控',
            mine: '核心能力——全天候监控官方 IRS 与各州来源',
            theirs: '并非其重点',
          },
          {
            dimension: '一起使用',
            mine: '叠加在上层——不替换你现有的工具',
            theirs: '仍是你在用的那套工具',
          },
        ],
      },
      hero: {
        eyebrow: '对比',
        title: `DueDateHQ vs ${spec.product}: 哪个更适合截止日运营？`,
        description: `${spec.product} 更接近${spec.positioningZh}。DueDateHQ 的选择角度更窄：CPA 截止日风险、官方来源证据、州级提醒复核和每周运营分诊。`,
        note: '对比页面基于公开定位和产品边界，不声称竞品私有能力。',
      },
      sections: [
        {
          eyebrow: '选择场景',
          title: `${spec.product} 更适合什么情况？`,
          body: `${spec.product} 通常更适合${spec.bestFitZh}。如果这是主要目标，它可能比 DueDateHQ 的窄工作台更合适。`,
          items: [
            {
              title: '更广的平台需求',
              body: '当主要需求是更大范围的 practice platform，应该优先评估完整平台能力。',
            },
            {
              title: '现有工作流',
              body: '如果团队已经在该平台中稳定运行，不应为了 SEO 页面而迁移。',
            },
            {
              title: '采购适配',
              body: '采购应按团队真实 workflow、迁移成本和维护成本判断。',
            },
          ],
        },
        {
          eyebrow: 'DueDateHQ 适配',
          title: 'DueDateHQ 更适合截止日风险运营。',
          body: spec.contrastZh,
          items: [
            {
              title: '带来源的规则',
              body: '截止日工作保留官方来源、摘录、复核时间和复核状态。',
            },
            { title: '每周分诊', body: '首页关注本周谁最急、为什么急、下一步检查什么。' },
            {
              title: '州级提醒复核',
              body: '州变化进入提醒后先复核，再影响客户运营工作。',
            },
          ],
        },
        {
          eyebrow: '边界',
          title: '这不是“替换所有 practice software”的承诺。',
          body: 'DueDateHQ 公开定位是截止日运营工作台。它可以和现有客户门户、文档工作流或更宽的事务所平台并存，重点是把截止日风险、来源证据和受影响客户复核做深。',
          items: [
            {
              title: '迁移成本',
              body: '如果团队主要痛点是全平台迁移，应该先评估原平台和数据迁移负担。',
            },
            {
              title: '产品边界',
              body: 'DueDateHQ 不提供报税提交、客户门户替代或自动税务判断。',
            },
            {
              title: '适用买点',
              body: '当事务所需要更好的截止日队列、提醒复核、证据抽屉和审计链路时，DueDateHQ 才是更直接的选择。',
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: `${spec.product} 对比问题。` },
      faq: [
        {
          question: `DueDateHQ 会替代 ${spec.product} 吗？`,
          answer: `不一定。DueDateHQ 更窄，专注 CPA 截止日运营；${spec.product} 的公开定位更接近${spec.positioningZh}。`,
        },
        {
          question: '什么时候选 DueDateHQ？',
          answer: '当核心问题是每周截止日分诊、来源证据、州级变化和迁移辅助的客户上下文。',
        },
        {
          question: `DueDateHQ 是 ${spec.product} 的替代方案吗？`,
          answer: `在一件事上可以：在官方来源处捕捉截止日与规则变化，并路由到受影响的客户。若你需要 ${spec.product} 更广的工作流，DueDateHQ 是补充而非完全替代。`,
        },
        {
          question: `可以和 ${spec.product} 一起用吗？`,
          answer: `可以。DueDateHQ 是叠加在 ${spec.product} 之上的监控层——监控官方 IRS 与各州来源并为每个日期附上来源，不替换你现有的配置。`,
        },
        {
          question: '这个对比是否是税务建议？',
          answer: '不是。它只解释软件工作流和产品边界。',
        },
      ],
      cta: {
        title: '查看截止日风险工作流。',
        body: 'DueDateHQ 为带来源的 CPA 截止日运营设计。',
        primary: '阅读每周分诊',
        secondary: '查看价格',
      },
    }
  }

  return {
    slug: spec.slug,
    meta: {
      title: `DueDateHQ vs ${spec.product} — Deadline Operations Comparison`,
      description: `How CPA firms compare ${spec.product} with DueDateHQ as a deadline-change monitoring alternative — deadline risk, official-source evidence, state coverage, and weekly triage, and how the two work together.`,
      ogImage: '/og/home.en.png',
    },
    comparisonTable: {
      eyebrow: 'AT A GLANCE',
      title: `DueDateHQ vs ${spec.product}, side by side`,
      mineLabel: 'DueDateHQ',
      theirsLabel: spec.product,
      rows: [
        {
          dimension: 'What it is',
          mine: 'A deadline-and-rule-change monitoring layer for CPA practices',
          theirs: cap(spec.positioning),
        },
        {
          dimension: 'Best fit',
          mine: 'Firms adding source-backed deadline and rule monitoring on top of their stack',
          theirs: cap(spec.bestFit),
        },
        {
          dimension: 'Source-level deadline-change monitoring',
          mine: 'Core — watches official IRS and state sources around the clock',
          theirs: 'Not its focus',
        },
        {
          dimension: 'Using them together',
          mine: 'Layers on top — it does not replace your existing tools',
          theirs: 'Stays the tool you already run',
        },
      ],
    },
    hero: {
      eyebrow: 'COMPARISON',
      title: `DueDateHQ vs ${spec.product}: which fits deadline operations?`,
      description: `${spec.product} is closer to ${spec.positioning}. DueDateHQ takes a narrower angle: CPA deadline risk, official-source evidence, state alert review, and weekly operations triage.`,
      note: 'This comparison is based on public positioning and product boundaries, not competitor claims beyond visible market framing.',
    },
    sections: [
      {
        eyebrow: 'WHEN TO CHOOSE',
        title: `Where ${spec.product} can be the better fit.`,
        body: `${spec.product} is usually a better fit for ${spec.bestFit}. If that is the main buying job, a narrower DueDateHQ workflow may not be the right first system.`,
        items: [
          {
            title: 'Broader platform fit',
            body: 'When the main need is a larger practice platform, evaluate the full platform surface first.',
          },
          {
            title: 'Existing workflow',
            body: 'If the firm already runs well in that system, switching only for deadline content may not be worth the migration cost.',
          },
          {
            title: 'Procurement fit',
            body: 'Buying should follow real workflow scope, setup cost, and maintenance burden.',
          },
        ],
      },
      {
        eyebrow: 'DUEDATEHQ FIT',
        title: 'DueDateHQ fits deadline risk operations.',
        body: spec.contrast,
        items: [
          {
            title: 'Source-backed rules',
            body: 'Deadline work keeps official source URL, excerpt, verified timestamp, and review state attached.',
          },
          {
            title: 'Weekly triage',
            body: 'The homepage focuses on who is risky this week, why they are risky, and what the team should inspect next.',
          },
          {
            title: 'State alert review',
            body: 'State changes enter alert review before they can affect client operations.',
          },
        ],
      },
      {
        eyebrow: 'BOUNDARY',
        title: 'This is not a promise to replace every practice software category.',
        body: 'DueDateHQ is positioned as a deadline operations workbench. It can sit beside an existing client portal, document workflow, or broader practice platform when the firm wants deeper deadline risk, source evidence, and affected-client review.',
        items: [
          {
            title: 'Migration cost',
            body: 'If the main pain is a whole-platform migration, evaluate the incumbent platform and data migration burden first.',
          },
          {
            title: 'Product boundary',
            body: 'DueDateHQ does not provide tax filing transmission, client portal replacement, or automatic tax judgment.',
          },
          {
            title: 'Best-fit buying job',
            body: 'DueDateHQ is the more direct choice when the firm needs a better deadline queue, alert review, evidence drawer, and audit trail.',
          },
        ],
      },
    ],
    faqHeader: { eyebrow: 'FAQ', title: `${spec.product} comparison questions.` },
    faq: [
      {
        question: `Does DueDateHQ replace ${spec.product}?`,
        answer: `Not necessarily. DueDateHQ is narrower and focused on CPA deadline operations; ${spec.product} is publicly positioned closer to ${spec.positioning}.`,
      },
      {
        question: 'When should a firm choose DueDateHQ?',
        answer:
          'Choose DueDateHQ when the core problem is weekly deadline triage, source evidence, state changes, and migration-assisted client context.',
      },
      {
        question: `Is DueDateHQ a ${spec.product} alternative?`,
        answer: `It can be, for one job: catching deadline and rule changes at the official source and routing them to the clients they affect. For broader ${spec.product} workflows, DueDateHQ is a complement, not a full replacement.`,
      },
      {
        question: `Can I use DueDateHQ alongside ${spec.product}?`,
        answer: `Yes. DueDateHQ is a monitoring layer that sits on top of ${spec.product} — it watches official IRS and state sources and attaches a source to every date, without replacing your existing setup.`,
      },
      {
        question: 'Is this comparison tax advice?',
        answer: 'No. It only explains software workflow boundaries and product fit.',
      },
    ],
    cta: {
      title: 'Review the deadline risk workflow.',
      body: 'DueDateHQ is designed for source-backed CPA deadline operations.',
      primary: 'Read weekly triage',
      secondary: 'Open pricing',
    },
  }
}

export const comparisonPages: Record<Locale, GuidePageCopy[]> = {
  en: comparisonSpecs.map((spec) => comparisonPage(spec, 'en')),
  'zh-CN': comparisonSpecs.map((spec) => comparisonPage(spec, 'zh-CN')),
}

// "Best [tool] alternatives" roundup pages — honest, plural-intent capture for
// "{product} alternatives" searches. Each lists the tools commonly evaluated
// together (by public positioning, no false claims) and positions DueDateHQ as
// the deadline-change monitoring option, never as a full-suite replacement.
interface AlternativeRoundupSpec {
  slug: string
  subject: string
  subjectCategory: string
  subjectCategoryZh: string
  alternatives: { name: string; note: string; noteZh: string }[]
}

const DDHQ_ALT = {
  name: 'DueDateHQ',
  note: 'a deadline-and-rule-change monitoring layer — it watches official IRS and state sources and routes each change to the clients it affects, on top of whatever you run.',
  noteZh:
    '截止日与规则变化监控层——监控官方 IRS 与各州来源，把每条变化路由到受影响的客户，叠加在你用的任何工具之上。',
}

const ALT_NOTES = {
  taxdome: {
    name: 'TaxDome',
    note: 'an all-in-one practice management and client portal suite.',
    noteZh: '一体化 practice management 与客户门户套件。',
  },
  canopy: {
    name: 'Canopy',
    note: 'a cloud practice-management suite with CRM, workflow, documents, billing, and a client portal.',
    noteZh: '带 CRM、工作流、文档、账单和客户门户的云端 practice-management 套件。',
  },
  karbon: {
    name: 'Karbon',
    note: 'collaborative accounting workflow and team work management with email collaboration.',
    noteZh: '会计团队协作工作流与 work management，含邮件协作。',
  },
  financialCents: {
    name: 'Financial Cents',
    note: 'a workflow and client-management tool for small firms, with recurring tasks and client follow-up.',
    noteZh: '面向小型事务所的工作流与客户管理工具，含周期性任务与客户跟进。',
  },
  jetpack: {
    name: 'Jetpack Workflow',
    note: 'accounting workflow software built around recurring jobs and deadline tracking from a template library.',
    noteZh: '围绕周期性任务与截止日跟踪、基于模板库的会计工作流软件。',
  },
  aero: {
    name: 'Aero Workflow',
    note: 'a workflow and task-management tool for bookkeeping and CAS firms with a procedures library.',
    noteZh: '面向记账与 CAS 事务所的工作流与任务管理工具，带流程库。',
  },
} as const

const alternativeRoundupSpecs: AlternativeRoundupSpec[] = [
  {
    slug: 'taxdome-alternatives',
    subject: 'TaxDome',
    subjectCategory: 'an all-in-one practice management and client portal suite',
    subjectCategoryZh: '一体化 practice management 与客户门户套件',
    alternatives: [
      ALT_NOTES.canopy,
      ALT_NOTES.karbon,
      ALT_NOTES.financialCents,
      ALT_NOTES.jetpack,
      DDHQ_ALT,
    ],
  },
  {
    slug: 'karbon-alternatives',
    subject: 'Karbon',
    subjectCategory: 'collaborative accounting workflow and team work management',
    subjectCategoryZh: '会计团队协作工作流与 work management',
    alternatives: [
      ALT_NOTES.taxdome,
      ALT_NOTES.canopy,
      ALT_NOTES.financialCents,
      ALT_NOTES.aero,
      DDHQ_ALT,
    ],
  },
  {
    slug: 'file-in-time-alternatives',
    subject: 'File In Time',
    subjectCategory: 'a narrow tax-deadline tracker built around due-date lists',
    subjectCategoryZh: '围绕截止日清单构建的窄范围税务截止日跟踪工具',
    alternatives: [ALT_NOTES.jetpack, ALT_NOTES.taxdome, ALT_NOTES.canopy, DDHQ_ALT],
  },
]

function alternativeRoundupPage(spec: AlternativeRoundupSpec, locale: Locale): GuidePageCopy {
  const zh = locale === 'zh-CN'
  const altItems = spec.alternatives.map((a) => ({ title: a.name, body: zh ? a.noteZh : a.note }))
  if (zh) {
    return {
      slug: spec.slug,
      meta: {
        title: `${spec.subject} 替代方案：CPA 事务所怎么选 — DueDateHQ 指南`,
        description: `面向 CPA 事务所的 ${spec.subject} 替代方案：常被一起评估的工具清单与各自适合的场景，以及 DueDateHQ 如何作为带来源的截止日变化监控层补位。`,
        ogImage: '/og/guide.zh-CN.png',
      },
      hero: {
        eyebrow: '指南',
        title: `面向 CPA 事务所的 ${spec.subject} 替代方案`,
        description: `${spec.subject} 是${spec.subjectCategoryZh}。如果你在评估替代方案，先想清楚要解决哪件事——再看下面这些工具各自的定位。`,
        note: '本指南基于公开定位，不声称竞品私有能力，也不提供税务建议。',
      },
      sections: [
        {
          eyebrow: '怎么选',
          title: `评估 ${spec.subject} 替代方案时先看什么？`,
          body: '替代不是换个名字，而是换一组取舍。先确认你最缺的是哪一块：截止日覆盖与变化监控、官方来源证据，还是迁移成本。',
          items: [
            {
              title: '截止日与变化覆盖',
              body: '工具是只跟踪你录入的日期，还是会监控官方来源、在日期变动时提醒你？',
            },
            {
              title: '官方来源证据',
              body: '每个截止日是否带可回看的官方 IRS/州来源，便于复核与解释？',
            },
            {
              title: '迁移成本',
              body: '换平台的迁移与维护负担，是否值得你要解决的那个问题？',
            },
          ],
        },
        {
          eyebrow: '可选方案',
          title: `值得考虑的 ${spec.subject} 替代方案`,
          body: '下面按公开定位列出常被一起评估的工具，以及各自更适合的场景。',
          items: altItems,
        },
        {
          eyebrow: 'DueDateHQ 的位置',
          title: 'DueDateHQ 补的是「截止日变化监控」这一块。',
          body: '多数替代方案是更宽的 practice/workflow 平台。DueDateHQ 故意更窄：监控官方 IRS 与各州来源的截止日与规则变化，把每条变化路由到受影响的客户，并附上来源——叠加在你已有的工具之上。',
          items: [
            {
              title: '带来源的规则',
              body: '每个截止日保留官方来源、摘录、复核时间与复核状态。',
            },
            {
              title: '受影响客户复核',
              body: '变化先匹配到具体客户、经人工复核，再影响运营。',
            },
            {
              title: '与现有工具并存',
              body: `可以保留 ${spec.subject} 或其它平台，DueDateHQ 只补监控层。`,
            },
          ],
        },
      ],
      faqHeader: { eyebrow: 'FAQ', title: `${spec.subject} 替代方案常见问题。` },
      faq: [
        {
          question: `最好的 ${spec.subject} 替代方案是哪个？`,
          answer: `没有唯一答案——取决于你要解决的问题。若缺的是更宽的 practice 平台，看上面的套件；若缺的是截止日与规则变化监控，DueDateHQ 更直接。`,
        },
        {
          question: `DueDateHQ 是 ${spec.subject} 的替代方案吗？`,
          answer: '在截止日变化监控这件事上可以；更广的工作流场景上它是补充而非完全替代。',
        },
        {
          question: `可以保留 ${spec.subject} 同时加上 DueDateHQ 吗？`,
          answer: '可以。DueDateHQ 是叠加在上层的监控层，不替换你现有的配置。',
        },
      ],
      cta: {
        title: `看看 DueDateHQ 如何补 ${spec.subject} 的截止日监控`,
        body: '监控官方来源，把每条截止日与规则变化路由到受影响的客户，并附上来源。',
        primary: '查看对比',
        secondary: '浏览全部资源',
      },
    }
  }

  return {
    slug: spec.slug,
    meta: {
      title: `The best ${spec.subject} alternatives for CPA firms — DueDateHQ guide`,
      description: `${spec.subject} alternatives for CPA firms: the tools commonly evaluated together and where each fits, plus how DueDateHQ adds a source-backed deadline-change monitoring layer.`,
      ogImage: '/og/guide.en.png',
    },
    hero: {
      eyebrow: 'GUIDE',
      title: `The best ${spec.subject} alternatives for CPA firms`,
      description: `${spec.subject} is ${spec.subjectCategory}. If you are weighing alternatives, get clear on the job you need done first — then see how the tools below are positioned.`,
      note: 'This guide is based on public positioning, not competitor claims beyond visible market framing, and is not tax advice.',
    },
    sections: [
      {
        eyebrow: 'WHAT TO LOOK FOR',
        title: `What to look for in a ${spec.subject} alternative`,
        body: 'Switching is a trade-off, not a rename. Pin down the gap you actually have: deadline coverage and change monitoring, official-source evidence, or migration cost.',
        items: [
          {
            title: 'Deadline & change coverage',
            body: 'Does the tool only track dates you enter, or watch official sources and flag you when a date moves?',
          },
          {
            title: 'Official-source evidence',
            body: 'Does each deadline carry an inspectable IRS or state source so it can be reviewed and defended?',
          },
          {
            title: 'Migration cost',
            body: 'Is the switching and maintenance burden worth the problem you are actually solving?',
          },
        ],
      },
      {
        eyebrow: 'ALTERNATIVES',
        title: `${spec.subject} alternatives to consider`,
        body: 'Tools commonly evaluated together, by public positioning, with where each tends to fit.',
        items: altItems,
      },
      {
        eyebrow: 'WHERE DUEDATEHQ FITS',
        title: 'Where DueDateHQ fits: the deadline-change monitoring gap.',
        body: 'Most alternatives are broader practice or workflow platforms. DueDateHQ is deliberately narrower: it watches official IRS and state sources for deadline and rule changes and routes each one to the clients it affects, with the source attached — on top of the tools you already run.',
        items: [
          {
            title: 'Source-backed rules',
            body: 'Each deadline keeps its official source, excerpt, review timestamp, and review state.',
          },
          {
            title: 'Affected-client review',
            body: 'A change is matched to specific clients and human-reviewed before it affects operations.',
          },
          {
            title: 'Runs alongside your stack',
            body: `Keep ${spec.subject} or any platform — DueDateHQ only adds the monitoring layer.`,
          },
        ],
      },
    ],
    faqHeader: { eyebrow: 'FAQ', title: `${spec.subject} alternative questions.` },
    faq: [
      {
        question: `What is the best ${spec.subject} alternative?`,
        answer: `There is no single answer — it depends on the job. If the gap is a broader practice platform, look at the suites above; if the gap is deadline and rule-change monitoring, DueDateHQ is the more direct fit.`,
      },
      {
        question: `Is DueDateHQ a ${spec.subject} alternative?`,
        answer:
          'For deadline-change monitoring, yes; for broader workflows it is a complement rather than a full replacement.',
      },
      {
        question: `Can I keep ${spec.subject} and add DueDateHQ?`,
        answer:
          'Yes. DueDateHQ is a monitoring layer that sits on top — it does not replace your existing setup.',
      },
    ],
    cta: {
      title: `See how DueDateHQ covers the ${spec.subject} deadline-monitoring gap`,
      body: 'It watches official sources and routes each deadline and rule change to the clients it affects, with the source attached.',
      primary: 'See the comparison',
      secondary: 'Browse all resources',
    },
  }
}

export const alternativeRoundupPages: Record<Locale, GuidePageCopy[]> = {
  en: alternativeRoundupSpecs.map((spec) => alternativeRoundupPage(spec, 'en')),
  'zh-CN': alternativeRoundupSpecs.map((spec) => alternativeRoundupPage(spec, 'zh-CN')),
}

export const ruleReferencePages: Record<Locale, GuidePageCopy[]> = {
  en: ruleReferenceSpecs.map((spec) => ruleReferencePage(spec, 'en')),
  'zh-CN': ruleReferenceSpecs.map((spec) => ruleReferencePage(spec, 'zh-CN')),
}

export function getGuidePages(siteCopy: LandingCopy, locale: Locale): GuidePageCopy[] {
  return [...siteCopy.geo.guides, ...supplementalGuides[locale], ...alternativeRoundupPages[locale]]
}

export function getComparisonPages(locale: Locale): GuidePageCopy[] {
  return comparisonPages[locale]
}

export function getRuleReferencePages(locale: Locale): GuidePageCopy[] {
  return ruleReferencePages[locale]
}

interface StateDeadline {
  name: string
  label: string
  labelZh: string
  due: string
  dueZh: string
  ext?: string
  extZh?: string
  sourceLabel: string
  sourceHref: string
}

// Verified, source-cited primary filing deadline per state (calendar-year filers).
// Only states confirmed high-confidence against an official .gov source are listed;
// every other state intentionally shows its official-source link with NO date —
// state deadlines are varied/quirky, so we never guess (docs/dev-file/13 §7, §5).
const STATE_DEADLINES: Record<string, StateDeadline> = {
  texas: {
    name: 'Texas',
    label: 'Texas Franchise Tax annual report',
    labelZh: '德州 Franchise Tax 年度报告',
    due: 'May 15',
    dueZh: '5 月 15 日',
    ext: 'An extension of time to file can be requested by the May 15 due date.',
    extZh: '可在 5 月 15 日截止前申请延期。',
    sourceLabel: 'Texas Comptroller — Franchise Tax',
    sourceHref: 'https://comptroller.texas.gov/taxes/franchise/',
  },
  massachusetts: {
    name: 'Massachusetts',
    label: 'Form 355 corporate excise return (C corporation)',
    labelZh: 'Form 355 公司 excise 申报（C corporation）',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'An automatic extension is available when the required payment is made.',
    extZh: '满足规定付款后可自动延期。',
    sourceLabel: 'Massachusetts DOR — tax due dates and extensions',
    sourceHref: 'https://www.mass.gov/info-details/massachusetts-dor-tax-due-dates-and-extensions',
  },
  'north-carolina': {
    name: 'North Carolina',
    label: 'Form CD-405 corporate income & franchise tax return (C corporation)',
    labelZh: 'Form CD-405 公司所得税与 franchise tax 申报（C corporation）',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    sourceLabel: 'NCDOR — Corporate Income & Franchise Tax',
    sourceHref: 'https://www.ncdor.gov/taxes-forms/corporate-income-franchise-tax/when-file',
  },
  florida: {
    name: 'Florida',
    label: 'Form F-1120 corporate income / franchise tax return',
    labelZh: 'Form F-1120 公司所得税 / franchise tax 申报',
    due: 'May 1 for calendar-year filers — the 1st day of the 5th month after the tax year ends (not April 15).',
    dueZh: '日历年纳税人为 5 月 1 日——税年结束后第 5 个月的第 1 天（不是 4 月 15 日）。',
    ext: 'Form F-7004 extends the time to file.',
    extZh: 'Form F-7004 可延长申报时间。',
    sourceLabel: 'Florida DOR — Corporate Income Tax',
    sourceHref: 'https://floridarevenue.com/taxes/taxesfees/Pages/corporate.aspx',
  },
  california: {
    name: 'California',
    label: 'Form 100 Corporation Franchise or Income Tax Return (C corporation)',
    labelZh: 'Form 100 公司 Franchise 或所得税申报（C corporation）',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'An automatic 7-month extension to file (to November 15); the tax payment is still due by April 15.',
    extZh: '自动延长 7 个月申报（至 11 月 15 日）；税款仍须在 4 月 15 日前缴清。',
    sourceLabel: 'California FTB — Due dates for businesses',
    sourceHref: 'https://www.ftb.ca.gov/file/when-to-file/due-dates-business.html',
  },
  'new-york': {
    name: 'New York',
    label: 'Form CT-3 General Business Corporation Franchise Tax Return',
    labelZh: 'Form CT-3 一般营业公司 Franchise Tax 申报',
    due: 'April 15 — within 3½ months after the reporting period ends.',
    dueZh: '4 月 15 日——申报期结束后 3 个半月内。',
    ext: 'A 6-month extension via Form CT-5, with estimated tax paid by the original due date.',
    extZh: '通过 Form CT-5 延长 6 个月，须在原始截止前预缴估算税。',
    sourceLabel: 'New York DTF — Instructions for Form CT-3',
    sourceHref: 'https://www.tax.ny.gov/forms/current-forms/ct/ct3i.htm',
  },
  illinois: {
    name: 'Illinois',
    label: 'Form IL-1120 Corporation Income and Replacement Tax Return',
    labelZh: 'Form IL-1120 公司所得税与 Replacement Tax 申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends (non-June-30 year-ends).',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天（非 6 月 30 日财年）。',
    ext: 'An automatic 7-month extension to file (to November 15); tentative tax is still due by April 15.',
    extZh: '自动延长 7 个月申报（至 11 月 15 日）；预估税仍须在 4 月 15 日前缴清。',
    sourceLabel: 'Illinois DOR — Form IL-1120 due date',
    sourceHref: 'https://tax.illinois.gov/questionsandanswers/answer.69.html',
  },
  georgia: {
    name: 'Georgia',
    label: 'Form 600 Corporation Tax Return',
    labelZh: 'Form 600 公司税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A 6-month extension to file (to October 15) via Form IT-303 or a valid federal extension.',
    extZh: '通过 Form IT-303 或有效的联邦延期，延长 6 个月申报（至 10 月 15 日）。',
    sourceLabel: 'Georgia DOR — Corporate Income Tax',
    sourceHref: 'https://dor.georgia.gov/',
  },
  michigan: {
    name: 'Michigan',
    label: 'Form 4891 Corporate Income Tax (CIT) annual return',
    labelZh: 'Form 4891 公司所得税（CIT）年度申报',
    due: 'April 30 — the last day of the 4th month after the tax year ends.',
    dueZh: '4 月 30 日——税年结束后第 4 个月的最后一天。',
    ext: 'An accepted federal extension extends the CIT filing deadline.',
    extZh: '获批的联邦延期可延长 CIT 申报截止日。',
    sourceLabel: 'Michigan Treasury — Corporate Income Tax filing requirements',
    sourceHref: 'https://www.michigan.gov/taxes/business-taxes/cit/detail/filing-requirements',
  },
  washington: {
    name: 'Washington',
    label: 'Annual Combined Excise Tax Return (Business & Occupation tax)',
    labelZh: '年度 Combined Excise Tax 申报（Business & Occupation tax）',
    due: 'April 15 for annual filers. Washington has no corporate or personal income tax; the Business & Occupation tax is reported on the Combined Excise Tax Return.',
    dueZh:
      '年度纳税人为 4 月 15 日。华盛顿州没有公司或个人所得税；Business & Occupation 税通过 Combined Excise Tax 申报报送。',
    sourceLabel: 'Washington DOR — Filing frequencies & due dates',
    sourceHref: 'https://dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates',
  },
  'new-jersey': {
    name: 'New Jersey',
    label: 'Form CBT-100 Corporation Business Tax return',
    labelZh: 'Form CBT-100 Corporation Business Tax 申报',
    due: 'May 15 — the 15th day of the month after the federal return is due, for calendar-year filers.',
    dueZh: '5 月 15 日——日历年纳税人为联邦申报到期月份的次月第 15 天。',
    ext: 'An automatic 6-month extension via Form CBT-200-T when at least 90% of the tax is paid by the original due date.',
    extZh: '通过 Form CBT-200-T 自动延长 6 个月，前提是在原始截止前已缴至少 90% 税款。',
    sourceLabel: 'New Jersey Division of Taxation — CBT-100 instructions',
    sourceHref: 'https://www.nj.gov/treasury/taxation/pdf/current/cbt/cbt100ins.pdf',
  },
  pennsylvania: {
    name: 'Pennsylvania',
    label: 'Form RCT-101 PA Corporate Net Income Tax Report',
    labelZh: 'Form RCT-101 宾州公司净所得税申报',
    due: 'May 15 — the 15th day of the month after the federal return is due, for calendar-year filers.',
    dueZh: '5 月 15 日——日历年纳税人为联邦申报到期月份的次月第 15 天。',
    ext: 'A federal extension extends the RCT-101 filing deadline to November 15.',
    extZh: '联邦延期可把 RCT-101 申报截止日延至 11 月 15 日。',
    sourceLabel: 'Pennsylvania Department of Revenue — RCT-101 instructions (REV-1200)',
    sourceHref:
      'https://www.pa.gov/content/dam/copapwp-pagov/en/revenue/documents/formsandpublications/formsforbusinesses/corporationtax/documents/2024/2024_rev-1200.pdf',
  },
  arizona: {
    name: 'Arizona',
    label: 'Form 120 Arizona Corporation Income Tax Return',
    labelZh: 'Form 120 亚利桑那公司所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A 7-month extension to November 15; at least 90% of the tax is due by April 15.',
    extZh: '延长 7 个月至 11 月 15 日；至少 90% 税款须在 4 月 15 日前缴清。',
    sourceLabel: 'Arizona Department of Revenue — Form 120 instructions',
    sourceHref: 'https://azdor.gov/sites/default/files/document/FORMS_CORPORATE_2025_120_i.pdf',
  },
  colorado: {
    name: 'Colorado',
    label: 'Form DR 0112 Colorado C Corporation Income Tax Return',
    labelZh: 'Form DR 0112 科罗拉多 C corporation 所得税申报',
    due: 'May 15 — the 15th day of the 5th month after the tax year ends (for tax years beginning 2024 and later).',
    dueZh: '5 月 15 日——税年结束后第 5 个月的第 15 天（自 2024 年起的税年）。',
    ext: 'An automatic 6-month extension to November 15; at least 90% of the tax is due by May 15.',
    extZh: '自动延长 6 个月至 11 月 15 日；至少 90% 税款须在 5 月 15 日前缴清。',
    sourceLabel: 'Colorado Department of Revenue — C corporation due dates',
    sourceHref: 'https://tax.colorado.gov/due-date-guide',
  },
  ohio: {
    name: 'Ohio',
    label: 'Commercial Activity Tax (CAT) quarterly return',
    labelZh: 'Commercial Activity Tax（CAT）季度申报',
    due: 'Quarterly. Ohio has no corporate income tax; the CAT (a gross-receipts tax) Q1 return is due May 10 — the 10th day of the 2nd month after the quarter ends.',
    dueZh:
      '按季度。俄亥俄州没有公司所得税；CAT（毛收入税）第一季度申报于 5 月 10 日到期——季度结束后第 2 个月的第 10 天。',
    sourceLabel: 'Ohio Department of Taxation — Commercial Activity Tax',
    sourceHref: 'https://tax.ohio.gov/',
  },
  virginia: {
    name: 'Virginia',
    label: 'Form 500 Virginia Corporation Income Tax Return',
    labelZh: 'Form 500 弗吉尼亚公司所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'An automatic 7-month extension for C corporations (to November 15); at least 90% of the tax is due by April 15.',
    extZh: 'C corporation 自动延长 7 个月（至 11 月 15 日）；至少 90% 税款须在 4 月 15 日前缴清。',
    sourceLabel: 'Virginia Tax — Corporation Income Tax',
    sourceHref: 'https://www.tax.virginia.gov/corporation-income-tax',
  },
  maryland: {
    name: 'Maryland',
    label: 'Form 500 Maryland Corporation Income Tax Return',
    labelZh: 'Form 500 马里兰公司所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A 7-month extension to file via Form 500E, filed by the original due date.',
    extZh: '通过 Form 500E 延长 7 个月申报，须在原始截止前提交。',
    sourceLabel: 'Comptroller of Maryland — Form 500 instructions',
    sourceHref:
      'https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/instructions/2025/corporate-booklet.pdf',
  },
  minnesota: {
    name: 'Minnesota',
    label: 'Form M4 Corporation Franchise Tax Return',
    labelZh: 'Form M4 公司 Franchise Tax 申报',
    due: 'April 15 — on the federal return due date (the 15th day of the 4th month) for calendar-year filers.',
    dueZh: '4 月 15 日——日历年纳税人为联邦申报到期日（第 4 个月的第 15 天）。',
    ext: 'An automatic 7-month extension to file; tax owed is still due by the regular due date.',
    extZh: '自动延长 7 个月申报；应缴税款仍须在原始截止前缴清。',
    sourceLabel: 'Minnesota Statutes 289A.18 — Due dates for filing returns',
    sourceHref: 'https://www.revisor.mn.gov/statutes/cite/289A.18',
  },
  wisconsin: {
    name: 'Wisconsin',
    label: 'Form 4 Wisconsin Corporation Franchise or Income Tax Return',
    labelZh: 'Form 4 威斯康星公司 Franchise 或所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'An automatic 7-month extension to file; tax owed is still due by the unextended due date.',
    extZh: '自动延长 7 个月申报；应缴税款仍须在未延期的原始截止前缴清。',
    sourceLabel: 'Wisconsin Department of Revenue — Form 4 instructions',
    sourceHref: 'https://www.revenue.wi.gov/TaxForms2025/2025-Form4-Inst.pdf',
  },
  tennessee: {
    name: 'Tennessee',
    label: 'Form FAE170 Franchise and Excise Tax Return',
    labelZh: 'Form FAE170 Franchise and Excise Tax 申报',
    due: 'April 15 — the 15th day of the 4th month after the close of the books, for calendar-year filers.',
    dueZh: '4 月 15 日——日历年纳税人为账务结束后第 4 个月的第 15 天。',
    ext: 'A 7-month extension via Form FAE 173; the payment is still due by the original date.',
    extZh: '通过 Form FAE 173 延长 7 个月；付款仍须在原始截止前完成。',
    sourceLabel: 'Tennessee Department of Revenue — Franchise & Excise Tax due dates',
    sourceHref:
      'https://www.tn.gov/revenue/taxes/franchise---excise-tax/due-dates-and-tax-rates.html',
  },
  missouri: {
    name: 'Missouri',
    label: 'Form MO-1120 Corporation Income Tax Return',
    labelZh: 'Form MO-1120 公司所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A federal extension (Form 7004) is honored; otherwise file Form MO-7004. Tax is still due by April 15.',
    extZh: '认可联邦延期（Form 7004）；否则提交 Form MO-7004。税款仍须在 4 月 15 日前缴清。',
    sourceLabel: 'Missouri Department of Revenue — Form MO-1120 instructions',
    sourceHref: 'https://dor.mo.gov/forms/MO-1120%20Instructions_2025.pdf',
  },
  indiana: {
    name: 'Indiana',
    label: 'Form IT-20 Indiana Corporate Adjusted Gross Income Tax Return',
    labelZh: 'Form IT-20 印第安纳公司调整后毛所得税申报',
    due: 'May 15 — the 15th day of the 5th month after the tax year ends, for calendar-year filers.',
    dueZh: '5 月 15 日——日历年纳税人为税年结束后第 5 个月的第 15 天。',
    ext: 'An automatic extension to roughly November 15; at least 90% of the tax is due by May 15.',
    extZh: '自动延长至约 11 月 15 日；至少 90% 税款须在 5 月 15 日前缴清。',
    sourceLabel: 'Indiana DOR — Information Bulletin #303 (corporate due dates)',
    sourceHref: 'https://www.in.gov/dor/files/gb303.pdf',
  },
  connecticut: {
    name: 'Connecticut',
    label: 'Form CT-1120 Connecticut Corporation Business Tax Return',
    labelZh: 'Form CT-1120 康涅狄格 Corporation Business Tax 申报',
    due: 'May 15 — the 15th day of the month after the federal return is due, for calendar-year filers.',
    dueZh: '5 月 15 日——日历年纳税人为联邦申报到期月份的次月第 15 天。',
    ext: 'A 6-month extension via Form CT-1120 EXT (to November 15); an extension to file is not an extension to pay.',
    extZh: '通过 Form CT-1120 EXT 延长 6 个月（至 11 月 15 日）；申报延期不等于付款延期。',
    sourceLabel: 'Connecticut DRS — Corporation Business Tax FAQs',
    sourceHref: 'https://portal.ct.gov/DRS/Corporation-Tax/Corp-FAQs',
  },
  'district-of-columbia': {
    name: 'District of Columbia',
    label: 'Form D-20 Corporation Franchise Tax Return',
    labelZh: 'Form D-20 公司 Franchise Tax 申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A 6-month extension to file via Form FR-120 (to October 15); the full tax must be paid with the request.',
    extZh: '通过 Form FR-120 延长 6 个月申报（至 10 月 15 日）；须随申请缴清全部税款。',
    sourceLabel: 'DC Office of Tax and Revenue — D-20 instructions',
    sourceHref:
      'https://otr.cfo.dc.gov/sites/default/files/dc/sites/otr/publication/attachments/2024_D-20_Book_121824.pdf',
  },
  alabama: {
    name: 'Alabama',
    label: 'Form 20C Alabama Corporation Income Tax Return',
    labelZh: 'Form 20C 亚拉巴马公司所得税申报',
    due: 'May 15 — one month after the federal return due date, for calendar-year filers.',
    dueZh: '5 月 15 日——日历年纳税人为联邦申报到期后一个月。',
    ext: 'The one-month-later date is an automatic filing extension; tax is still due by the federal due date (April 15).',
    extZh: '延后一个月为自动申报延期；税款仍须在联邦截止日（4 月 15 日）前缴清。',
    sourceLabel: 'Alabama DOR — Form 20C instructions',
    sourceHref: 'https://www.revenue.alabama.gov/wp-content/uploads/2025/01/24f20cinstr.pdf',
  },
  alaska: {
    name: 'Alaska',
    label: 'Form 6000 Alaska Corporation Net Income Tax Return',
    labelZh: 'Form 6000 阿拉斯加公司净所得税申报',
    due: 'May 15 — the 15th day of the 5th month after the tax year ends.',
    dueZh: '5 月 15 日——税年结束后第 5 个月的第 15 天。',
    ext: 'A federal extension extends Alaska filing to November 15; payment is due by the 15th day of the 3rd month.',
    extZh: '联邦延期可把阿拉斯加申报延至 11 月 15 日；付款须在第 3 个月的第 15 天前完成。',
    sourceLabel: 'Alaska DOR — Form 6000 instructions',
    sourceHref: 'https://tax.alaska.gov/programs/programs/forms/index.aspx?60380=',
  },
  arkansas: {
    name: 'Arkansas',
    label: 'Form AR1100CT Arkansas Corporation Income Tax Return',
    labelZh: 'Form AR1100CT 阿肯色公司所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A federal extension extends Arkansas filing to one month after the federal extended due date.',
    extZh: '联邦延期可把阿肯色申报延至联邦延期后一个月。',
    sourceLabel: 'Arkansas DFA — Corporation Income Tax instructions',
    sourceHref:
      'https://www.dfa.arkansas.gov/wp-content/uploads/CorporationIncomeTaxInstructions_2024.pdf',
  },
  delaware: {
    name: 'Delaware',
    label: 'Form 1100 Delaware Corporation Income Tax Return',
    labelZh: 'Form 1100 特拉华公司所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A federal extension gives a 6-month extension to October 15; tax is still due April 15.',
    extZh: '联邦延期提供 6 个月延期至 10 月 15 日；税款仍须在 4 月 15 日前缴清。',
    sourceLabel: 'Delaware Division of Revenue — Corporate Income Tax FAQs',
    sourceHref:
      'https://revenue.delaware.gov/frequently-asked-questions/corporate-income-tax-faqs/',
  },
  hawaii: {
    name: 'Hawaii',
    label: 'Form N-30 Hawaii Corporation Income Tax Return',
    labelZh: 'Form N-30 夏威夷公司所得税申报',
    due: 'April 20 — the 20th day of the 4th month after the tax year ends.',
    dueZh: '4 月 20 日——税年结束后第 4 个月的第 20 天。',
    ext: 'An automatic 6-month extension to October 20; tax is still due April 20.',
    extZh: '自动延长 6 个月至 10 月 20 日；税款仍须在 4 月 20 日前缴清。',
    sourceLabel: 'Hawaii DOT — Form N-30 instructions',
    sourceHref: 'https://files.hawaii.gov/tax/forms/current/n30ins.pdf',
  },
  idaho: {
    name: 'Idaho',
    label: 'Form 41 Idaho Corporation Income Tax Return',
    labelZh: 'Form 41 爱达荷公司所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'An automatic 6-month extension to October 15 if prepayment requirements are met.',
    extZh: '满足预缴要求可自动延长 6 个月至 10 月 15 日。',
    sourceLabel: 'Idaho State Tax Commission — Income Tax for Corporations',
    sourceHref:
      'https://tax.idaho.gov/taxes/income-tax/business-income/guides-for-certain-businesses/income-tax-for-corporations/',
  },
  iowa: {
    name: 'Iowa',
    label: 'IA 1120 Iowa Corporation Income Tax Return',
    labelZh: 'IA 1120 爱荷华公司所得税申报',
    due: 'April 30 — the last day of the 4th month after the tax year ends.',
    dueZh: '4 月 30 日——税年结束后第 4 个月的最后一天。',
    ext: 'An automatic 6-month extension to October 31 if 90% of the tax is paid by April 30.',
    extZh: '若在 4 月 30 日前缴清 90% 税款，可自动延长 6 个月至 10 月 31 日。',
    sourceLabel: 'Iowa DOR — IA 1120 instructions',
    sourceHref: 'https://revenue.iowa.gov/media/4083/download?inline=',
  },
  kansas: {
    name: 'Kansas',
    label: 'Form K-120 Kansas Corporate Income Tax Return',
    labelZh: 'Form K-120 堪萨斯公司所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A copy of federal Form 7004 gives an automatic 6-month extension to October 15.',
    extZh: '附联邦 Form 7004 副本可自动延长 6 个月至 10 月 15 日。',
    sourceLabel: 'Kansas DOR — K-120 booklet',
    sourceHref: 'https://www.ksrevenue.gov/pdf/corpbook2025.pdf',
  },
  kentucky: {
    name: 'Kentucky',
    label: 'Form 720 Kentucky Corporation Income Tax and LLET Return',
    labelZh: 'Form 720 肯塔基公司所得税与 LLET 申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A 7-month extension to November 15 via Form 720EXT (or a federal extension).',
    extZh: '通过 Form 720EXT（或联邦延期）延长 7 个月至 11 月 15 日。',
    sourceLabel: 'Kentucky DOR — Form 720 instructions',
    sourceHref: 'https://revenue.ky.gov/Forms/Form%20720%20Instructions.pdf',
  },
  louisiana: {
    name: 'Louisiana',
    label: 'Form CIFT-620 Louisiana Corporation Income and Franchise Tax Return',
    labelZh: 'Form CIFT-620 路易斯安那公司所得税与 franchise tax 申报',
    due: 'May 15 — the 15th day of the 5th month after the tax year ends.',
    dueZh: '5 月 15 日——税年结束后第 5 个月的第 15 天。',
    ext: 'An automatic 6-month extension to November 15 if a federal extension was timely requested.',
    extZh: '若已及时申请联邦延期，可自动延长 6 个月至 11 月 15 日。',
    sourceLabel: 'Louisiana DOR — Corporation Income & Franchise Tax',
    sourceHref:
      'https://revenue.louisiana.gov/businesses/business-taxes/coporate-income-franchise-tax/',
  },
  maine: {
    name: 'Maine',
    label: 'Form 1120ME Maine Corporate Income Tax Return',
    labelZh: 'Form 1120ME 缅因公司所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'An automatic 6-month extension to file; tax is still due April 15.',
    extZh: '自动延长 6 个月申报；税款仍须在 4 月 15 日前缴清。',
    sourceLabel: 'Maine Revenue Services — due dates',
    sourceHref: 'https://www.maine.gov/revenue/tax-return-forms/due-dates',
  },
  mississippi: {
    name: 'Mississippi',
    label: 'Form 83-105 Mississippi Corporate Income and Franchise Tax Return',
    labelZh: 'Form 83-105 密西西比公司所得税与 franchise tax 申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'Mississippi follows the federal extended due date; pay any tax with Form 83-180 by April 15.',
    extZh: '密西西比沿用联邦延期到期日；应缴税款须随 Form 83-180 在 4 月 15 日前缴纳。',
    sourceLabel: 'Mississippi DOR — Corporate Income & Franchise Tax instructions',
    sourceHref:
      'https://www.dor.ms.gov/sites/default/files/tax-forms/business/2025%20CIT%20INSTRUCTIONS%2083-100%20-%20Final%20%2001.14.2026.pdf',
  },
  montana: {
    name: 'Montana',
    label: 'Form CIT Montana Corporate Income Tax Return',
    labelZh: 'Form CIT 蒙大拿公司所得税申报',
    due: 'May 15 — the 15th day of the 5th month after the tax year ends.',
    dueZh: '5 月 15 日——税年结束后第 5 个月的第 15 天。',
    ext: 'An automatic 6-month extension to November 15; tax is still due May 15.',
    extZh: '自动延长 6 个月至 11 月 15 日；税款仍须在 5 月 15 日前缴清。',
    sourceLabel: 'Montana DOR — Form CIT instructions',
    sourceHref:
      'https://revenue.mt.gov/files/Forms/Montana-Form-CIT-Instructions/2025_Montana_Form_CIT_Instructions.pdf',
  },
  nebraska: {
    name: 'Nebraska',
    label: 'Form 1120N Nebraska Corporation Income Tax Return',
    labelZh: 'Form 1120N 内布拉斯加公司所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A federal Form 7004 (or Form 7004N) extends filing; tax is still due April 15.',
    extZh: '联邦 Form 7004（或 Form 7004N）可延长申报；税款仍须在 4 月 15 日前缴清。',
    sourceLabel: 'Nebraska DOR — Business Income Tax FAQs',
    sourceHref:
      'https://revenue.nebraska.gov/about/frequently-asked-questions/business-income-tax-faqs',
  },
  nevada: {
    name: 'Nevada',
    label: 'Commerce Tax Return (gross-revenue tax)',
    labelZh: 'Commerce Tax 申报（毛收入税）',
    due: 'August 14 — Nevada has no corporate income tax; the Commerce Tax year is fixed July 1 – June 30, so the return is due August 14 each year.',
    dueZh:
      '8 月 14 日——内华达州没有公司所得税；Commerce Tax 纳税年固定为 7 月 1 日至 6 月 30 日，故每年 8 月 14 日到期。',
    ext: 'A 30-day extension to file and pay may be requested for good cause before the due date.',
    extZh: '可在到期前因正当理由申请 30 天的申报与缴款延期。',
    sourceLabel: 'Nevada DOT — Commerce Tax Return instructions',
    sourceHref:
      'https://tax.nv.gov/wp-content/uploads/2024/05/Commerce-Tax-Return-Instructions-6-2023.pdf',
  },
  'new-hampshire': {
    name: 'New Hampshire',
    label: 'Form NH-1120 Business Profits Tax Return',
    labelZh: 'Form NH-1120 Business Profits Tax 申报',
    due: 'April 15 — New Hampshire has no general income or sales tax; the Business Profits Tax return is due the 15th day of the 4th month.',
    dueZh:
      '4 月 15 日——新罕布什尔州没有一般所得税或销售税；Business Profits Tax 申报在第 4 个月的第 15 天到期。',
    ext: 'An automatic 7-month extension to November 15 if 100% of the BPT and BET due is paid by April 15.',
    extZh: '若在 4 月 15 日前缴清 100% 的 BPT 与 BET，可自动延长 7 个月至 11 月 15 日。',
    sourceLabel: 'New Hampshire DRA — Business Profits Tax',
    sourceHref: 'https://www.revenue.nh.gov/',
  },
  'new-mexico': {
    name: 'New Mexico',
    label: 'Form CIT-1 New Mexico Corporate Income and Franchise Tax Return',
    labelZh: 'Form CIT-1 新墨西哥公司所得税与 franchise tax 申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'New Mexico accepts the federal extension; file and pay by the federal extended due date.',
    extZh: '新墨西哥接受联邦延期；在联邦延期到期日前申报并缴款。',
    sourceLabel: 'New Mexico T&RD — Corporate Income & Franchise filing requirements',
    sourceHref:
      'https://www.tax.newmexico.gov/businesses/corporate-income-franchise-tax-overview/filing-requirements/',
  },
  oklahoma: {
    name: 'Oklahoma',
    label: 'Form 512 Oklahoma Corporation Income Tax Return',
    labelZh: 'Form 512 俄克拉荷马公司所得税申报',
    due: 'May 15 — 30 days after the federal return due date, for calendar-year filers.',
    dueZh: '5 月 15 日——日历年纳税人为联邦申报到期后 30 天。',
    ext: 'A federal extension extends the Oklahoma filing date when no Oklahoma tax is owed.',
    extZh: '当无俄克拉荷马应缴税款时，联邦延期可延长州申报截止日。',
    sourceLabel: 'Oklahoma Tax Commission — Form 512 packet',
    sourceHref:
      'https://oklahoma.gov/content/dam/ok/en/tax/documents/forms/businesses/corporate-income-tax/current/512-Pkt.pdf',
  },
  oregon: {
    name: 'Oregon',
    label: 'Form OR-20 Oregon Corporation Excise Tax Return',
    labelZh: 'Form OR-20 俄勒冈公司 excise tax 申报',
    due: 'May 15 — the 15th day of the month after the federal return is due, for calendar-year filers.',
    dueZh: '5 月 15 日——日历年纳税人为联邦申报到期月份的次月第 15 天。',
    ext: 'Oregon honors the federal extension (to about November 15).',
    extZh: '俄勒冈认可联邦延期（约至 11 月 15 日）。',
    sourceLabel: 'Oregon DOR — Corporation Excise/Income filing requirements',
    sourceHref: 'https://www.oregon.gov/dor/programs/businesses/pages/corp-requirements.aspx',
  },
  'rhode-island': {
    name: 'Rhode Island',
    label: 'Form RI-1120C Rhode Island Business Corporation Tax Return',
    labelZh: 'Form RI-1120C 罗德岛 Business Corporation Tax 申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'An automatic 6-month extension to October 15 via Form RI-7004.',
    extZh: '通过 Form RI-7004 自动延长 6 个月至 10 月 15 日。',
    sourceLabel: 'RI Division of Taxation — Corporate Tax filing requirements',
    sourceHref: 'https://tax.ri.gov/tax-sections/corporate-tax/tax-filing-requirements',
  },
  'south-carolina': {
    name: 'South Carolina',
    label: 'SC1120 C Corporation Income Tax Return',
    labelZh: 'SC1120 C corporation 所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'An automatic 6-month extension to October 15 via SC1120-T.',
    extZh: '通过 SC1120-T 自动延长 6 个月至 10 月 15 日。',
    sourceLabel: 'SCDOR — C Corporation',
    sourceHref: 'https://dor.sc.gov/tax-index/business-income-taxes/corporate/c-corporation',
  },
  'south-dakota': {
    name: 'South Dakota',
    label: 'Bank Franchise Tax Return (financial institutions)',
    labelZh: 'Bank Franchise Tax 申报（金融机构）',
    due: 'South Dakota has no corporate or personal income tax; only financial institutions file the Bank Franchise Tax, due about April 30 (within 15 days after the federal return).',
    dueZh:
      '南达科他州没有公司或个人所得税；仅金融机构申报 Bank Franchise Tax，约 4 月 30 日到期（联邦申报后 15 天内）。',
    ext: 'Mirror the federal extension by sending a request and a copy of the federal extension before the due date.',
    extZh: '在到期前提交申请及联邦延期副本，比照联邦延期办理。',
    sourceLabel: 'South Dakota DOR — Bank Franchise Tax',
    sourceHref: 'https://dor.sd.gov/businesses/taxes/bank-franchise-tax/',
  },
  utah: {
    name: 'Utah',
    label: 'Form TC-20 Utah Corporation Franchise or Income Tax Return',
    labelZh: 'Form TC-20 犹他公司 franchise 或所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'An automatic 6-month extension to file; tax is still due April 15.',
    extZh: '自动延长 6 个月申报；税款仍须在 4 月 15 日前缴清。',
    sourceLabel: 'Utah State Tax Commission — Form TC-20',
    sourceHref: 'https://tax.utah.gov/',
  },
  vermont: {
    name: 'Vermont',
    label: 'Form CO-411 Vermont Corporate Income Tax Return',
    labelZh: 'Form CO-411 佛蒙特公司所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A federal extension extends Vermont filing to 30 days past the federal extended date (about November 15).',
    extZh: '联邦延期可把佛蒙特申报延至联邦延期后 30 天（约 11 月 15 日）。',
    sourceLabel: 'Vermont Department of Taxes — Corporate Income Tax',
    sourceHref: 'https://tax.vermont.gov/business/corporate-income-tax',
  },
  'west-virginia': {
    name: 'West Virginia',
    label: 'Form CIT-120 West Virginia Corporation Net Income Tax Return',
    labelZh: 'Form CIT-120 西弗吉尼亚公司净所得税申报',
    due: 'April 15 — the 15th day of the 4th month after the tax year ends.',
    dueZh: '4 月 15 日——税年结束后第 4 个月的第 15 天。',
    ext: 'A federal extension (or Form CIT-120EXT) gives a 6-month extension to October 15.',
    extZh: '联邦延期（或 Form CIT-120EXT）提供 6 个月延期至 10 月 15 日。',
    sourceLabel: 'West Virginia Tax Division — CIT-120 instructions',
    sourceHref: 'https://tax.wv.gov/Documents/CIT/2025/cit120.instructions.2025.pdf',
  },
  wyoming: {
    name: 'Wyoming',
    label: 'Annual Report (with license tax)',
    labelZh: '年度报告（含 license tax）',
    due: 'Wyoming has no corporate or personal income tax; the Annual Report and license tax are due the first day of the anniversary month of formation — there is no fixed statewide date.',
    dueZh:
      '怀俄明州没有公司或个人所得税；年度报告与 license tax 在实体周年月的第一天到期——没有统一的固定日期。',
    ext: 'No extension is available; an annual report may instead be filed up to 120 days early.',
    extZh: '不提供延期；年度报告可提前最多 120 天申报。',
    sourceLabel: 'Wyoming Secretary of State — Annual Report FAQs',
    sourceHref: 'https://sos.wyo.gov/faqs.aspx?root=BUS',
  },
}

const STATE_DEADLINE_NOTE: Record<Locale, string> = {
  en: 'Calendar-year filers. State filing deadlines vary and can change — confirm against the official source before relying on a date. This page describes software workflows, not tax advice.',
  'zh-CN':
    '日历年纳税人。各州申报截止日不一、且可能调整——以官方来源为准再据此行事。本页说明软件工作流，不提供税务建议。',
}

function buildStateKeyDeadlines(
  slug: string,
  name: string,
  locale: Locale,
): KeyDatesBlock | undefined {
  const d = STATE_DEADLINES[slug]
  if (!d) return undefined
  const zh = locale === 'zh-CN'
  const rows = [
    { label: zh ? '申报表' : 'Return', value: zh ? d.labelZh : d.label },
    { label: zh ? '截止日' : 'Due', value: zh ? d.dueZh : d.due },
  ]
  if (d.ext) rows.push({ label: zh ? '延期' : 'Extension', value: zh ? (d.extZh ?? d.ext) : d.ext })
  return {
    eyebrow: zh ? '关键日期' : 'KEY DATES',
    title: zh
      ? `${name} 主要申报截止日（日历年）`
      : `${name} primary filing deadline (calendar-year filers)`,
    note: STATE_DEADLINE_NOTE[locale],
    sourceLabel: d.sourceLabel,
    sourceHref: d.sourceHref,
    rows,
  }
}

// Plain-text English summary of the verified state deadlines, for llms-full.txt.
// Driven by STATE_DEADLINES so the agent-facing file stays in sync with the pages.
export function getStateDeadlineLines(): string[] {
  return Object.values(STATE_DEADLINES).map(
    (d) =>
      `- ${d.name}: ${d.label} — due ${d.due}${d.ext ? ` Extension: ${d.ext}` : ''} (${d.sourceLabel}: ${d.sourceHref})`,
  )
}

export function getStatePages(siteCopy: LandingCopy, locale: Locale): StatePageCopy[] {
  const pages = [...siteCopy.geo.states, ...stateSpecs.map((spec) => statePage(spec, locale))]
  // oxlint-disable-next-line no-map-spread -- copy-on-write: pages is shared input, must not mutate
  return pages.map((page) => {
    const keyDeadlines = buildStateKeyDeadlines(page.slug, page.name, locale)
    return keyDeadlines ? { ...page, keyDeadlines } : page
  })
}

export function getStateCoveragePage(siteCopy: LandingCopy, locale: Locale): StateCoverageCopy {
  return {
    ...siteCopy.geo.stateCoverage,
    states: [
      ...siteCopy.geo.stateCoverage.states,
      ...stateSpecs.map((spec) => stateSummary(spec, locale)),
    ],
  }
}

export function getResourceCtaHrefs(
  slug: string,
  locale: Locale,
): { primaryHref: string; secondaryHref: string } {
  const prefix = locale === 'zh-CN' ? '/zh-CN' : ''
  const hrefs: Record<string, { primaryHref: string; secondaryHref: string }> = {
    'cpa-deadline-risk': {
      primaryHref: `${prefix}/guides/evidence-backed-tax-deadline-software`,
      secondaryHref: `${prefix}/rules`,
    },
    'evidence-backed-tax-deadline-software': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/state-coverage`,
    },
    'weekly-cpa-deadline-triage': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/state-coverage`,
    },
    'migrate-cpa-deadlines-from-excel': {
      primaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
      secondaryHref: `${prefix}/pricing`,
    },
    'extension-vs-payment-deadlines': {
      primaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
      secondaryHref: `${prefix}/rules`,
    },
    'form-7004-extension-deadline': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    's-corp-deadline-operations': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    'partnership-form-1065-deadline': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    'multi-state-filing-deadlines': {
      primaryHref: `${prefix}/state-coverage`,
      secondaryHref: `${prefix}/rules`,
    },
    '2026-tax-deadline-calendar': {
      primaryHref: `${prefix}/state-coverage`,
      secondaryHref: `${prefix}/rules`,
    },
    'payroll-tax-deadlines': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    'deadline-monitoring-for-quickbooks-firms': {
      primaryHref: `${prefix}/how-it-works`,
      secondaryHref: `${prefix}/rules`,
    },
    'taxdome-alternatives': {
      primaryHref: `${prefix}/compare/taxdome-deadline-operations`,
      secondaryHref: `${prefix}/resources`,
    },
    'karbon-alternatives': {
      primaryHref: `${prefix}/compare/karbon-deadline-operations`,
      secondaryHref: `${prefix}/resources`,
    },
    'file-in-time-alternatives': {
      primaryHref: `${prefix}/compare/file-in-time-alternative`,
      secondaryHref: `${prefix}/resources`,
    },
    'form-1120-c-corp-deadline': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    'form-1040-individual-deadline': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    'form-1041-estate-trust-deadline': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    'form-940-futa-deadline': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    'form-w-2-filing-deadline': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    'form-2553-s-corp-election-deadline': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
    'form-5500-benefit-plan-deadline': {
      primaryHref: `${prefix}/rules`,
      secondaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
    },
  }

  return (
    hrefs[slug] ?? {
      primaryHref: `${prefix}/guides/weekly-cpa-deadline-triage`,
      secondaryHref: `${prefix}/pricing`,
    }
  )
}

export interface ResourceLink {
  label: string
  href: string
}

// Curated cross-links shown in the "Keep exploring" block on every long-tail
// leaf/hub, so guides/compares/rule references are no longer reachable only via
// the footer + sitemap. Links lead with the highest-value hubs to concentrate
// internal link equity (docs/dev-file/13 §6). Labels are short on purpose.
const RELATED_RESOURCE_LINKS: { href: string; label: string; labelZh: string }[] = [
  { href: '/rules', label: 'Rule library', labelZh: '规则库' },
  { href: '/state-coverage', label: 'State coverage', labelZh: '州覆盖' },
  { href: '/resources', label: 'All resources', labelZh: '全部资源' },
  {
    href: '/guides/weekly-cpa-deadline-triage',
    label: 'Weekly deadline triage',
    labelZh: '每周截止日分诊',
  },
  {
    href: '/guides/multi-state-filing-deadlines',
    label: 'Multi-state filing deadlines',
    labelZh: '多州申报截止日',
  },
  {
    href: '/guides/cpa-deadline-risk',
    label: 'Which client deadline comes first',
    labelZh: '先处理哪个客户截止日',
  },
  {
    href: '/guides/evidence-backed-tax-deadline-software',
    label: 'Evidence-backed deadline software',
    labelZh: '带证据的截止日软件',
  },
  {
    href: '/compare/file-in-time-alternative',
    label: 'File In Time alternative',
    labelZh: 'File In Time 替代方案',
  },
]

export function getRelatedResources(
  currentPathname: string,
  locale: Locale,
  limit = 4,
): ResourceLink[] {
  const prefix = locale === 'zh-CN' ? '/zh-CN' : ''
  const currentFree = currentPathname.replace(/^\/zh-CN/, '') || '/'
  return RELATED_RESOURCE_LINKS.filter((l) => l.href !== currentFree)
    .slice(0, limit)
    .map((l) => ({ label: locale === 'zh-CN' ? l.labelZh : l.label, href: `${prefix}${l.href}` }))
}

// The rule-reference children, surfaced on the /rules hub so its source-backed
// reference pages are linked (and crawlable) from the library itself.
export function getRuleReferenceLinks(locale: Locale): ResourceLink[] {
  const prefix = locale === 'zh-CN' ? '/zh-CN' : ''
  return ruleReferenceSpecs.map((spec) => ({
    label: locale === 'zh-CN' ? spec.labelZh : spec.label,
    href: `${prefix}/rules/${spec.slug}`,
  }))
}

export interface ResourceIndexSection {
  heading: string
  description: string
  links: ResourceLink[]
}

// The full long-tail roster for the /resources hub — every guide, comparison,
// and rule reference linked from one crawlable page so nothing is reachable only
// via the sitemap. Built from the same getters the routes use, so it can never
// drift out of sync with what actually ships.
export function getResourceIndex(siteCopy: LandingCopy, locale: Locale): ResourceIndexSection[] {
  const zh = locale === 'zh-CN'
  const prefix = zh ? '/zh-CN' : ''
  return [
    {
      heading: zh ? '指南' : 'Guides',
      description: zh
        ? '把规则与截止日变成每周可执行的运营工作。'
        : 'Turn rules and deadlines into weekly operational work.',
      links: getGuidePages(siteCopy, locale).map((g) => ({
        label: g.hero.title,
        href: `${prefix}/guides/${g.slug}`,
      })),
    },
    {
      heading: zh ? '对比' : 'Comparisons',
      description: zh
        ? 'DueDateHQ 与 CPA 团队常评估的工具有何不同。'
        : 'How DueDateHQ differs from tools CPA teams evaluate.',
      links: getComparisonPages(locale).map((c) => ({
        label: c.hero.title,
        href: `${prefix}/compare/${c.slug}`,
      })),
    },
    {
      heading: zh ? '兼容你的工具栈' : 'Works with your stack',
      description: zh
        ? 'DueDateHQ 如何叠加在你已有的 CPA 工具之上——补充，而非替换。'
        : 'How DueDateHQ layers on top of the CPA tools you already run — complement, not replacement.',
      links: [
        {
          label: zh ? '兼容你的工具栈' : 'Works with your stack',
          href: `${prefix}/works-with-your-stack`,
        },
      ],
    },
    {
      heading: zh ? '规则参考' : 'Rule references',
      description: zh
        ? '带官方来源的联邦截止日规则参考。'
        : 'Source-backed federal deadline rule references.',
      links: [
        { label: zh ? '规则库' : 'Rule library', href: `${prefix}/rules` },
        ...getRuleReferenceLinks(locale),
      ],
    },
    {
      heading: zh ? '州覆盖' : 'State coverage',
      description: zh
        ? '监控全部 50 州 + DC 的公开税务来源。'
        : 'Monitoring public tax sources across all 50 states + DC.',
      links: [
        {
          label: zh ? '全部州覆盖（50 州 + DC）' : 'All state coverage (50 states + DC)',
          href: `${prefix}/state-coverage`,
        },
      ],
    },
  ]
}
