export type SourceTier = 'T1' | 'T2' | 'T3'
export type SourceJurisdiction = string

export type SourceId = string

export interface SourceStateHint {
  etag: string | null
  lastModified: string | null
}

export interface IngestCtx {
  fetch(this: void, input: string | URL, init?: RequestInit): Promise<Response>
  browserlessFetch?(this: void, input: string | URL, init?: RequestInit): Promise<Response>
  govdeliveryFetch?(this: void, input: string | URL, init?: RequestInit): Promise<Response>
  getSourceState?(sourceId: string): Promise<SourceStateHint | null>
  archiveRaw(input: {
    sourceId: string
    externalId: string
    fetchedAt: Date
    body: string
    contentType?: string | null
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
  jurisdiction?: string
}

export interface SourceAdapter {
  readonly id: SourceId
  readonly tier: SourceTier
  readonly cronIntervalMs: number
  readonly jurisdiction: SourceJurisdiction
  readonly allowEmptyParse?: boolean
  readonly fetcher?: 'cloudflare' | 'browserless' | 'govdelivery'
  fetch(ctx: IngestCtx): Promise<RawSnapshot[]>
  parse(snapshot: RawSnapshot, ctx: IngestCtx): Promise<ParsedItem[]>
}
