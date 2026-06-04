import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { zipSync, strToU8 } from 'fflate'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { createDb } from '@duedatehq/db'
import { auditEvent, auditEvidencePackage, evidenceLink } from '@duedatehq/db/schema/audit'
import { user } from '@duedatehq/db/schema/auth'
import { emailOutbox, inAppNotification } from '@duedatehq/db/schema/notifications'
import type { Env } from '../../env'

export interface AuditPackageGenerateMessage {
  type: 'audit.package.generate'
  packageId: string
}

function csvCell(value: unknown): string {
  const raw =
    value === null || value === undefined
      ? ''
      : value instanceof Date
        ? value.toISOString()
        : typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint'
            ? String(value)
            : typeof value === 'symbol'
              ? (value.description ?? '')
              : typeof value === 'object'
                ? (JSON.stringify(value) ?? '')
                : ''
  return `"${raw.replaceAll('"', '""')}"`
}

function csvRows(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const source = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(source).set(bytes)
  const digest = await crypto.subtle.digest('SHA-256', source)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function buildReportPdf(input: {
  packageId: string
  eventCount: number
  evidenceCount: number
  createdAt: Date
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  page.drawText('DueDateHQ Audit Evidence Package', { x: 72, y: 720, font: bold, size: 18 })
  const lines = [
    `Package ID: ${input.packageId}`,
    `Generated: ${input.createdAt.toISOString()}`,
    `Audit events: ${input.eventCount}`,
    `Evidence links: ${input.evidenceCount}`,
    'Contents: report.pdf, audit/events.csv, audit/events.json, evidence/evidence-links.csv, manifest.json',
  ]
  lines.forEach((line, index) => {
    page.drawText(line, { x: 72, y: 680 - index * 24, font, size: 11 })
  })
  return pdf.save()
}

function eventMatchesScope(
  row: { entityType: string; entityId: string },
  scope: string,
  scopeEntityId: string | null,
): boolean {
  if (scope === 'firm' || !scopeEntityId) return true
  if (scope === 'client') return row.entityType === 'client' && row.entityId === scopeEntityId
  if (scope === 'obligation') {
    return row.entityType === 'obligation_instance' && row.entityId === scopeEntityId
  }
  if (scope === 'migration')
    return row.entityType === 'migration_batch' && row.entityId === scopeEntityId
  return true
}

export async function generateAuditEvidencePackage(env: Env, packageId: string): Promise<void> {
  const db = createDb(env.DB)
  const [pkg] = await db
    .select()
    .from(auditEvidencePackage)
    .where(eq(auditEvidencePackage.id, packageId))
    .limit(1)
  if (!pkg || pkg.status === 'ready') return

  await db
    .update(auditEvidencePackage)
    .set({ status: 'running', updatedAt: new Date() })
    .where(eq(auditEvidencePackage.id, packageId))

  try {
    const filters = [eq(auditEvent.firmId, pkg.firmId)]
    if (pkg.rangeStart) filters.push(gte(auditEvent.createdAt, pkg.rangeStart))
    if (pkg.rangeEnd) filters.push(lte(auditEvent.createdAt, pkg.rangeEnd))
    const rawEvents = await db
      .select()
      .from(auditEvent)
      .where(and(...filters))
      .orderBy(asc(auditEvent.createdAt))
    const events = rawEvents.filter((row) => eventMatchesScope(row, pkg.scope, pkg.scopeEntityId))

    const evidence = await db
      .select()
      .from(evidenceLink)
      .where(eq(evidenceLink.firmId, pkg.firmId))
      .orderBy(asc(evidenceLink.appliedAt))

    const eventsCsv = csvRows([
      ['id', 'created_at', 'actor_id', 'entity_type', 'entity_id', 'action', 'reason'],
      ...events.map((row) => [
        row.id,
        row.createdAt.toISOString(),
        row.actorId,
        row.entityType,
        row.entityId,
        row.action,
        row.reason,
      ]),
    ])
    const evidenceCsv = csvRows([
      ['id', 'applied_at', 'obligation_instance_id', 'source_type', 'source_id', 'confidence'],
      ...evidence.map((row) => [
        row.id,
        row.appliedAt.toISOString(),
        row.obligationInstanceId,
        row.sourceType,
        row.sourceId,
        row.confidence,
      ]),
    ])
    const report = await buildReportPdf({
      packageId,
      eventCount: events.length,
      evidenceCount: evidence.length,
      createdAt: new Date(),
    })
    const files: Record<string, Uint8Array> = {
      'report.pdf': report,
      'audit/events.csv': strToU8(eventsCsv),
      'audit/events.json': strToU8(json(events)),
      'evidence/evidence-links.csv': strToU8(evidenceCsv),
    }
    const manifest = {
      packageId,
      firmId: pkg.firmId,
      scope: pkg.scope,
      scopeEntityId: pkg.scopeEntityId,
      generatedAt: new Date().toISOString(),
      files: await Promise.all(
        Object.entries(files).map(async ([name, bytes]) => ({
          name,
          sizeBytes: bytes.byteLength,
          sha256: await sha256Hex(bytes),
        })),
      ),
    }
    files['manifest.json'] = strToU8(json(manifest))
    const zip = zipSync(files, { level: 6 })
    const sha256Hash = await sha256Hex(zip)
    const r2Key = `firm/${pkg.firmId}/audit/${packageId}.zip`
    const expiresAt = pkg.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await env.R2_AUDIT.put(r2Key, zip, {
      httpMetadata: { contentType: 'application/zip' },
      customMetadata: { sha256: sha256Hash, packageId },
    })

    await db
      .update(auditEvidencePackage)
      .set({
        status: 'ready',
        fileCount: Object.keys(files).length,
        fileManifestJson: manifest,
        sha256Hash,
        r2Key,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(auditEvidencePackage.id, packageId))

    const [exporter] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, pkg.exportedByUserId))
      .limit(1)

    await db.insert(auditEvent).values({
      id: crypto.randomUUID(),
      firmId: pkg.firmId,
      actorId: null,
      // Generated by the background queue worker, not a firm user.
      actorType: 'system',
      entityType: 'audit_evidence_package',
      entityId: packageId,
      action: 'export.audit_package.ready',
      afterJson: { r2Key, sha256Hash, fileCount: Object.keys(files).length },
    })

    await db.insert(inAppNotification).values({
      id: crypto.randomUUID(),
      firmId: pkg.firmId,
      userId: pkg.exportedByUserId,
      type: 'audit_package_ready',
      entityType: 'audit_evidence_package',
      entityId: packageId,
      title: 'Audit package ready',
      body: 'Your audit evidence package is ready to download.',
      href: '/audit',
      metadataJson: { packageId },
    })

    await db
      .insert(emailOutbox)
      .values({
        id: crypto.randomUUID(),
        firmId: pkg.firmId,
        externalId: `audit-package-ready:${packageId}`,
        type: 'audit_evidence_package_ready',
        status: 'pending',
        payloadJson: {
          recipients: exporter?.email ? [exporter.email] : [],
          subject: 'Audit evidence package ready',
          text: `Audit evidence package ${packageId} is ready for download.`,
        },
      })
      .onConflictDoNothing({ target: emailOutbox.externalId })
  } catch (error) {
    const failureReason =
      error instanceof Error ? error.message : 'Audit package generation failed.'
    await db
      .update(auditEvidencePackage)
      .set({
        status: 'failed',
        failureReason,
        updatedAt: new Date(),
      })
      .where(eq(auditEvidencePackage.id, packageId))

    // A failed compliance export must itself leave a trail (the success path
    // writes export.audit_package.ready; the failure path used to write
    // nothing, so a never-delivered package looked like it was never asked
    // for). Best-effort — never mask the original error.
    try {
      await db.insert(auditEvent).values({
        id: crypto.randomUUID(),
        firmId: pkg.firmId,
        actorId: null,
        actorType: 'system',
        entityType: 'audit_evidence_package',
        entityId: packageId,
        action: 'export.audit_package.failed',
        afterJson: { failureReason },
      })
    } catch {
      // swallow — the package row already records the failure.
    }
    throw error
  }
}
