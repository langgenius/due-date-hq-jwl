# pnpm 11 config migration

## Context

The workspace moved from pnpm 10 to pnpm 11. Official pnpm 11 docs now keep
project settings in `pnpm-workspace.yaml` and replace legacy build dependency
lists with `allowBuilds`.

## Changes

- Kept a single root `packageManager: pnpm@11.3.0` entry; `devEngines` was not
  added because it would create extra package-manager lockfile dependencies for
  this exact-pin use case.
- Migrated `onlyBuiltDependencies` to pnpm 11 `allowBuilds`.
- Explicitly denied ignored transitive build scripts for `core-js` and
  `protobufjs` so installs stay non-interactive.
- Relied on pnpm 11's built-in `minimumReleaseAge` default instead of
  restating default cooldown settings in project config.
- Kept pnpm 11's 24-hour release cooldown intact and reverted direct
  dependency upgrades that were too fresh for the policy.
- Reverted the attempted Astro catalog bump; marketing remains on the
  previously pinned `astro@6.1.8` and `@astrojs/check@0.9.8`.
- Removed the stale Astro config `@ts-expect-error`; the current Vite+ alias no
  longer triggers that plugin type recursion.
- Updated tech-stack docs that still described pnpm 10 config.

## Validation

- `pnpm install --lockfile-only`
- `pnpm install --frozen-lockfile`
- `vp run db:migrate:local`
- `pnpm check` passes with the existing five `no-underscore-dangle` warnings.
