export type SourceTier = 'T1' | 'T2' | 'T3'
export type SourceJurisdiction = string

export type SourceId = string

export interface SourceStateHint {
  etag: string | null
  lastModified: string | null
}

export interface IngestCtx {
  fetch(this: void, input: string | URL, init?: RequestInit): Promise<Response>
  binaryFetch?(this: void, input: string | URL, init?: RequestInit): Promise<Response>
  browserlessFetch?(this: void, input: string | URL, init?: RequestInit): Promise<Response>
  govdeliveryFetch?(this: void, input: string | URL, init?: RequestInit): Promise<Response>
  getSourceState?(sourceId: string): Promise<SourceStateHint | null>
  archiveRaw(input: {
    sourceId: string
    externalId: string
    fetchedAt: Date
    body: string
    contentType?: string | null
    fullText?: string
    dedupeText?: string
  }): Promise<{ r2Key: string; contentHash: string }>
}

export interface RawSnapshot {
  sourceId: string
  fetchedAt: Date
  contentHash: string
  r2Key: string
  body: string
  contentType: string | null
  etag: string | null
  lastModified: string | null
  notModified?: boolean
}

export interface ParsedItem {
  sourceId: string
  externalId: string
  title: string
  publishedAt: Date
  officialSourceUrl: string
  rawText: string
  // Full normalized page text (un-truncated) for the rule-source drift
  // comparison. rawText stays the 6000-char excerpt fed to AI extraction and
  // hashed for snapshot dedupe. Set only when the excerpt actually truncated.
  fullText?: string
  // Item-local text that stays stable across unrelated changes elsewhere on the
  // listing page (link text + canonical URL). When set, the snapshot contentHash
  // is computed over THIS instead of rawText, so a new 21st item or a footer
  // tweak no longer re-hashes (and re-extracts, at AI cost) every listed item.
  // rawText — the archive + AI input — is unaffected. Absent → hash(rawText),
  // the legacy behavior, which is also correct for whole-page-is-the-content
  // snapshots (sourceSnapshotAnnouncementItem, parsedItemForSourceSnapshot).
  dedupeText?: string
  jurisdiction?: string
}

export interface SourceAdapter {
  readonly id: SourceId
  readonly tier: SourceTier
  readonly cronIntervalMs: number
  readonly jurisdiction: SourceJurisdiction
  // Override the default 'establish_on_first_seen' baseline so a freshly-onboarded
  // source backfills the items already on its page instead of skipping them — used
  // for low-frequency rights-window sources whose open window predates onboarding.
  // Snapshot dedup then keeps later scans to genuinely new items.
  readonly initialBaselineMode?: 'backfill'
  readonly allowEmptyParse?: boolean
  readonly fetcher?: 'cloudflare' | 'browserless' | 'govdelivery'
  fetch(ctx: IngestCtx): Promise<RawSnapshot[]>
  parse(snapshot: RawSnapshot, ctx: IngestCtx): Promise<ParsedItem[]>
}
