import type { AuditEventInput } from '@duedatehq/ports/audit'
import { sha256Hex } from './readiness-token'

export interface AuditRequestMetadata {
  ipHash?: string
  userAgentHash?: string
}

type AuditWriteEvent = Omit<AuditEventInput, 'firmId'>

interface AuditWritableRepo {
  readonly audit: {
    write(event: AuditWriteEvent): Promise<{ id: string }>
    writeBatch(events: AuditWriteEvent[]): Promise<{ ids: string[] }>
  }
}

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null
  return (
    value
      .split(',')
      .map((part) => part.trim())
      .find((part) => part.length > 0) ?? null
  )
}

export function requestIpFromHeaders(headers: Headers): string | null {
  return (
    headers.get('cf-connecting-ip')?.trim() ||
    firstForwardedIp(headers.get('x-forwarded-for')) ||
    headers.get('x-real-ip')?.trim() ||
    null
  )
}

export async function hashAuditValue(
  secret: string,
  value: string | null | undefined,
): Promise<string | undefined> {
  if (!value) return undefined
  return sha256Hex(`${secret}:${value}`)
}

export async function auditRequestMetadata(
  secret: string,
  headers: Headers,
): Promise<AuditRequestMetadata> {
  const [ipHash, userAgentHash] = await Promise.all([
    hashAuditValue(secret, requestIpFromHeaders(headers)),
    hashAuditValue(secret, headers.get('user-agent')),
  ])

  return {
    ...(ipHash ? { ipHash } : {}),
    ...(userAgentHash ? { userAgentHash } : {}),
  }
}

function withDefaultAuditMetadata<T extends AuditWriteEvent>(
  event: T,
  metadata: AuditRequestMetadata,
): T {
  return {
    ...event,
    ...(event.ipHash === undefined && metadata.ipHash ? { ipHash: metadata.ipHash } : {}),
    ...(event.userAgentHash === undefined && metadata.userAgentHash
      ? { userAgentHash: metadata.userAgentHash }
      : {}),
  }
}

export function withAuditRequestMetadata<T extends AuditWritableRepo>(
  repo: T,
  metadata: AuditRequestMetadata,
): T {
  if (!metadata.ipHash && !metadata.userAgentHash) return repo

  return {
    ...repo,
    audit: {
      ...repo.audit,
      write(event) {
        return repo.audit.write(withDefaultAuditMetadata(event, metadata))
      },
      writeBatch(events) {
        return repo.audit.writeBatch(
          events.map((event) => withDefaultAuditMetadata(event, metadata)),
        )
      },
    },
  }
}
