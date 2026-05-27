import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { msg } from '@lingui/core/macro'
import type { I18n } from '@lingui/core'
import { ArrowLeftIcon, ArrowRightIcon, LockKeyholeIcon } from 'lucide-react'

import type { FirmPublic } from '@duedatehq/contracts'
import {
  hasFirmPermission,
  requiredRolesForFirmPermission,
  type FirmPermission,
  type FirmRole,
} from '@duedatehq/core/permissions'
// ROH-D11 — single source of truth for the pluralized role-list copy
// ("owners, partners, and managers"). The capitalized singular variant
// (`requiredRolesLabelSingular`) and `roleLabel` live in
// `apps/app/src/lib/required-roles-label.ts`. Imported here so the
// PermissionGate badges + the inline notice surface always reflect
// FIRM_PERMISSION_ROLES — no hand-curated copy to drift.
import { requiredRolesLabelSingular } from '@/lib/required-roles-label'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { orpc } from '@/lib/rpc'

type PermissionAction = {
  label: ReactNode
  to: string
  variant?: 'default' | 'outline' | undefined
}

interface PermissionState {
  firm: FirmPublic | null
  isLoading: boolean
  can: (permission: FirmPermission) => boolean
}

const ROLE_LABELS = {
  owner: msg`Owner`,
  partner: msg`Partner`,
  manager: msg`Manager`,
  preparer: msg`Preparer`,
  coordinator: msg`Coordinator`,
} as const
const UNKNOWN_ROLE_LABEL = msg`Unknown`

export function roleLabel(role: FirmRole | null | undefined, i18n: I18n) {
  return i18n._(role ? ROLE_LABELS[role] : UNKNOWN_ROLE_LABEL)
}

// Backwards-compat re-export. New callers should import from
// `@/lib/required-roles-label` directly — `requiredRolesLabelSingular`
// for badge-style "Owner, Partner, Manager" lists and
// `requiredRolesLabel` for sentence-style "owners, partners, and
// managers" lists. Both walk the same `FIRM_PERMISSION_ROLES` map so
// the copy can't drift from the source of truth.
export function requiredRolesLabel(permission: FirmPermission, i18n: I18n): string {
  return requiredRolesLabelSingular(permission, { i18n })
}

export function useFirmPermission(firmOverride?: FirmPublic | null): PermissionState {
  const firmsQuery = useQuery({
    ...orpc.firms.listMine.queryOptions({ input: undefined }),
    enabled: firmOverride === undefined,
  })
  const firm =
    firmOverride === undefined
      ? (firmsQuery.data?.find((item) => item.isCurrent) ?? firmsQuery.data?.[0] ?? null)
      : firmOverride

  return {
    firm,
    isLoading: firmOverride === undefined ? firmsQuery.isLoading : false,
    can: (permission) =>
      hasFirmPermission({
        role: firm?.role,
        permission,
        coordinatorCanSeeDollars: firm?.coordinatorCanSeeDollars,
      }),
  }
}

export function PermissionGate({
  permission,
  firm,
  loading,
  children,
  title,
  description,
  secondaryAction,
}: {
  permission: FirmPermission
  firm: FirmPublic | null | undefined
  loading?: boolean | undefined
  children: ReactNode
  title?: ReactNode | undefined
  description?: ReactNode | undefined
  secondaryAction?: PermissionAction | undefined
}) {
  const allowed = hasFirmPermission({
    role: firm?.role,
    permission,
    coordinatorCanSeeDollars: firm?.coordinatorCanSeeDollars,
  })

  if (loading) return <PermissionGateSkeleton />
  if (allowed) return children

  return (
    <PermissionRequiredPanel
      permission={permission}
      currentRole={firm?.role}
      title={title}
      description={description}
      secondaryAction={secondaryAction}
    />
  )
}

function PermissionRequiredPanel({
  permission,
  currentRole,
  title,
  description,
  secondaryAction,
}: {
  permission: FirmPermission
  currentRole: FirmRole | null | undefined
  title?: ReactNode | undefined
  description?: ReactNode | undefined
  secondaryAction?: PermissionAction | undefined
}) {
  const { i18n, t } = useLingui()
  const defaultTitle =
    requiredRolesForFirmPermission(permission).length === 1 &&
    requiredRolesForFirmPermission(permission)[0] === 'owner'
      ? t`Owner permission required`
      : t`Permission required`
  const currentRoleLabel = roleLabel(currentRole, i18n)
  const requiredRoleText = requiredRolesLabel(permission, i18n)
  const resolvedDescription =
    description ??
    t`Your current role cannot use this surface. Contact the practice owner if you need access.`

  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-4 py-8 md:px-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-md border border-divider-regular bg-background-subtle text-text-accent"
            >
              <LockKeyholeIcon className="size-4" />
            </span>
            <div className="min-w-0">
              <CardTitle role="heading" aria-level={1}>
                {title ?? defaultTitle}
              </CardTitle>
              <CardDescription className="mt-1">{resolvedDescription}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">
            <Trans>Current role: {currentRoleLabel}</Trans>
          </Badge>
          <Badge variant="secondary">
            <Trans>Required: {requiredRoleText}</Trans>
          </Badge>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t border-divider-regular">
          <Button nativeButton={false} render={<Link to="/" />}>
            <Trans>Return to Today</Trans>
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          {secondaryAction ? (
            <Button
              nativeButton={false}
              variant={secondaryAction.variant ?? 'outline'}
              render={<Link to={secondaryAction.to} />}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              {secondaryAction.label}
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </section>
  )
}

export function PermissionInlineNotice({
  permission,
  currentRole,
  children,
}: {
  permission: FirmPermission
  currentRole: FirmRole | null | undefined
  children?: ReactNode
}) {
  const { i18n } = useLingui()
  const currentRoleLabel = roleLabel(currentRole, i18n)
  const requiredRoleText = requiredRolesLabel(permission, i18n)
  return (
    <Alert variant="destructive">
      <LockKeyholeIcon />
      <AlertTitle>
        <Trans>Read-only view</Trans>
      </AlertTitle>
      <AlertDescription>
        {children ?? (
          <Trans>
            Current role: {currentRoleLabel}. Required: {requiredRoleText}.
          </Trans>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function PermissionObscuredContent({
  locked,
  permission,
  currentRole,
  fallback,
  notice,
  children,
}: {
  locked: boolean
  permission: FirmPermission
  currentRole: FirmRole | null | undefined
  fallback: ReactNode
  notice?: ReactNode | undefined
  children: ReactNode
}) {
  const { i18n } = useLingui()
  const currentRoleLabel = roleLabel(currentRole, i18n)
  const requiredRoleText = requiredRolesLabel(permission, i18n)

  if (!locked) return <>{children}</>

  return (
    <div className="relative overflow-hidden rounded-lg border border-state-destructive-hover-alt bg-state-destructive-hover">
      <div aria-hidden className="pointer-events-none select-none blur-sm">
        {fallback}
      </div>
      <div className="absolute inset-0 grid place-items-center bg-state-destructive-hover/85 p-4 backdrop-blur-sm">
        <Alert variant="destructive" className="max-w-lg bg-components-card-bg">
          <LockKeyholeIcon />
          <AlertTitle>
            <Trans>Read-only view</Trans>
          </AlertTitle>
          <AlertDescription>
            {notice ?? (
              <Trans>
                Current role: {currentRoleLabel}. Required: {requiredRoleText}.
              </Trans>
            )}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

function PermissionGateSkeleton() {
  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-4 py-8 md:px-6">
      <Skeleton className="h-48 rounded-lg" />
    </section>
  )
}
