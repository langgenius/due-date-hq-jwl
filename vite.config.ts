import { defineConfig } from 'vite-plus'

/**
 * Root Vite+ config — the monorepo's orchestration layer.
 *
 * Replaces, in one file:
 *   - turbo.json                   → `run.tasks`
 *   - oxlintrc.json                → `lint`
 *   - oxfmt.toml / .oxfmtrc.json   → `fmt`
 *   - lefthook.yml / lint-staged   → `staged`
 *
 * Per-app build config (React plugin, Tailwind plugin, dev proxy,
 * aliases) still lives in `apps/app/vite.config.ts`. This root file
 * drives `vp` subcommands for the whole workspace, not bundling.
 *
 * Authoritative references:
 *   docs/dev-file/01-Tech-Stack.md §4.4
 *   docs/dev-file/08-Project-Structure.md §6  (dependency direction)
 */
export default defineConfig({
  // ──────────────────────────────────────────────────────────
  // Linting (oxlint + tsgolint via `vp check`)
  //
  // `overrides` enforces the monorepo's dep-direction rules
  // (08 §6): procedures cannot import @duedatehq/db directly,
  // packages/core is pure TS, packages/contracts is zod-only,
  // packages/ai must not touch @duedatehq/db.
  // ──────────────────────────────────────────────────────────
  lint: {
    plugins: ['oxc', 'typescript', 'react', 'import', 'unicorn'],
    categories: {
      correctness: 'error',
      suspicious: 'warn',
      perf: 'warn',
      restriction: 'off',
    },
    env: {
      browser: true,
      node: true,
      es2023: true,
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      'no-console': 'off',
      'oxc/no-barrel-file': ['error', { threshold: 0 }],
      'typescript/no-explicit-any': 'error',
      // React 19's new JSX transform doesn't need React in scope.
      'react/react-in-jsx-scope': 'off',
      'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
      // `import './styles.css'` side-effect imports are intentional.
      'import/no-unassigned-import': 'off',
      // Empty-by-design scaffolding files are acceptable during Phase 0.
      'unicorn/no-empty-file': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@duedatehq/db/schema', '@duedatehq/db/schema/*'],
              message:
                'Use context.vars.scoped instead of directly importing schema in procedures.',
            },
          ],
        },
      ],
    },
    overrides: [
      {
        files: ['packages/db/**'],
        rules: { 'no-restricted-imports': 'off' },
      },
      {
        files: ['apps/server/src/jobs/**', 'apps/server/src/webhooks/**', 'packages/db/seed/**'],
        rules: { 'no-restricted-imports': 'off' },
      },
      {
        files: ['apps/server/src/procedures/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  group: ['@duedatehq/db', '@duedatehq/db/*'],
                  message:
                    'Procedures must use context.vars.scoped / tenantContext instead of importing @duedatehq/db directly.',
                },
              ],
            },
          ],
        },
      },
      {
        files: ['apps/app/src/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  group: ['@duedatehq/db/schema', '@duedatehq/db/schema/*'],
                  message:
                    'Use app RPC/contracts instead of importing database schema in the browser app.',
                },
                {
                  group: ['@orpc/client', '@orpc/client/*'],
                  message:
                    'Business code must consume orpc.*.queryOptions()/mutationOptions() from @/lib/rpc; raw oRPC client APIs stay centralized.',
                },
              ],
            },
          ],
        },
      },
      {
        files: ['apps/app/src/lib/rpc.ts'],
        rules: { 'no-restricted-imports': 'off' },
      },
      {
        files: ['packages/core/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  group: [
                    'drizzle-orm',
                    'drizzle-orm/*',
                    '@duedatehq/db',
                    '@duedatehq/db/*',
                    'hono',
                    'hono/*',
                    '@cloudflare/workers-types',
                    '@orpc/server',
                    '@orpc/server/*',
                  ],
                  message:
                    'packages/core must be pure TS with no runtime/infrastructure dependencies.',
                },
              ],
            },
          ],
        },
      },
      {
        files: ['packages/contracts/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  group: [
                    '@orpc/server',
                    '@orpc/server/*',
                    'hono',
                    'hono/*',
                    'drizzle-orm',
                    'drizzle-orm/*',
                    '@duedatehq/db',
                    '@duedatehq/db/*',
                  ],
                  message:
                    'packages/contracts must only depend on zod and @orpc/contract (no server/db deps).',
                },
              ],
            },
          ],
        },
      },
      {
        files: ['packages/ai/**'],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                {
                  group: ['@duedatehq/db', '@duedatehq/db/*'],
                  message:
                    'packages/ai must not import @duedatehq/db directly. Inject writers/stores via ports.ts.',
                },
              ],
            },
          ],
        },
      },
      {
        // Sequential awaits in these IO subsystems are intentional: chunked D1
        // batches (bound-param safety), ordered side-effects, and audit trails.
        // Parallelizing would break correctness, so no-await-in-loop is off here.
        files: [
          'apps/server/src/jobs/**',
          'apps/server/src/procedures/**',
          'apps/server/src/webhooks/**',
          'packages/db/src/repo/**',
        ],
        rules: { 'no-await-in-loop': 'off' },
      },
      {
        // One-off marketing build scripts (OG/asset generation). Sequential awaits
        // are intentional (render assets one at a time to bound memory), and the
        // `__dirname` ESM shim is the standard Node idiom — both rules off here.
        files: ['apps/marketing/scripts/**'],
        rules: { 'no-await-in-loop': 'off', 'no-underscore-dangle': 'off' },
      },
      {
        // Outreach sends are deliberately sequential to preserve rate limiting
        // and write per-recipient state after each accepted send.
        files: ['outreach-kit/**'],
        rules: { 'no-await-in-loop': 'off' },
      },
      {
        // Test stubs legitimately use `as unknown as X` casts and locally
        // scoped helpers; relax the rules that only fire on those patterns.
        files: ['**/*.test.ts', '**/*.test.tsx'],
        rules: {
          'typescript/no-unsafe-type-assertion': 'off',
          'unicorn/consistent-function-scoping': 'off',
        },
      },
    ],
    ignorePatterns: [
      '**/dist/**',
      '**/.wrangler/**',
      '**/.astro/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/drizzle/**',
      'packages/ui/src/components/ui/**',
      // Generated Product Hunt gallery artifacts (HTML mockups + their
      // generator); machine-emitted, regenerated from generator.cjs, so
      // they're not linted as hand-authored source.
      'docs/marketing/product-hunt-launch/**',
      '.agents/**',
      '.claude/**',
    ],
  },

  // ──────────────────────────────────────────────────────────
  // Formatting (oxfmt via `vp fmt`).
  // ──────────────────────────────────────────────────────────
  fmt: {
    semi: false,
    singleQuote: true,
    jsxSingleQuote: false,
    trailingComma: 'all',
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    arrowParens: 'always',
    endOfLine: 'lf',
    sortPackageJson: true,
    ignorePatterns: [
      '.agents/**',
      '.claude/**',
      'apps/app/src/i18n/locales/**/messages.ts',
      // Generated PH gallery artifacts — handwritten/compact HTML the formatter
      // would explode into thousands of lines; kept verbatim (see lint note above).
      'docs/marketing/product-hunt-launch/**',
    ],
  },

  // ──────────────────────────────────────────────────────────
  // Monorepo task graph (replaces turbo.json).
  // `vp run -r <task>` executes the task in every workspace
  // package that declares it, respecting pnpm dep ordering.
  // Content-based cache is enabled by default.
  // ──────────────────────────────────────────────────────────
  run: {
    cache: {
      scripts: false,
      tasks: true,
    },
    tasks: {
      // Build after lint/typecheck passes, so red-line errors
      // surface before we spend time on bundling.
      'workspace-build': {
        command: 'vp run build',
        cache: false,
        dependsOn: ['workspace-check'],
      },
      'workspace-check': {
        command: 'vp check',
        env: ['NODE_ENV'],
      },
      'workspace-test': {
        command: 'vp run -r test',
        env: ['NODE_ENV', 'CI'],
      },
      // Publish is the only Cloudflare-control-plane task. The order is
      // locked by docs/dev-file/12-Marketing-Architecture.md §7:
      //   1. Queue provision      (bindings exist before deploy)
      //   2. D1 migrate           (schema first)
      //   3. server Worker        (back-end + SaaS SPA assets)
      //   4. marketing Worker     (last; CTA targets the now-ready app)
      // Any failure aborts subsequent steps because `&&` short-circuits.
      // `cache: false` means no env fingerprinting — Cloudflare creds
      // are inherited from the shell at run time.
      'workspace-publish': {
        command:
          'pnpm cf:ensure-queues && pnpm db:migrate:remote && vp run @duedatehq/server#deploy && vp run @duedatehq/marketing#deploy',
        cache: false,
      },
      'workspace-deploy': {
        command: 'vp run workspace-publish',
        cache: false,
        dependsOn: ['workspace-build', 'workspace-test'],
      },
    },
  },

  // ──────────────────────────────────────────────────────────
  // Git hooks (replaces lefthook + lint-staged).
  // `vp install` (or `pnpm prepare` which runs `vp config`) sets
  // up the pre-commit hook that reads this block.
  // `vp staged` only receives staged files; CI owns full-repo checks.
  // ──────────────────────────────────────────────────────────
  staged: {
    '*': 'vp check --fix',
    'DESIGN.md': 'npx --yes @google/design.md lint',
  },
})
