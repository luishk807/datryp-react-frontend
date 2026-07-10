/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));
const srcAlias = (p: string) => resolve(rootDir, 'src', p);

// The app's tsconfig.json `exclude`s test files (so the app type-check stays
// free of vitest/@types/node ambient types). vite-tsconfig-paths honors that
// exclude, which would leave bare specifiers inside *test files* (e.g.
// `import { TRIP_STATUS } from 'constants'`) unresolved — falling back to
// Node's empty `constants` shim. These explicit aliases re-root the project's
// baseUrl (`src`) specifiers for the test runner, independent of the tsconfig.
const projectAliases = Object.fromEntries(
    ['api', 'assets', 'components', 'constants', 'context', 'hooks', 'i18n', 'lib', 'offline', 'test', 'types', 'utils'].map(
        (name) => [name, srcAlias(name)]
    )
);

// Dedicated Vitest config (kept separate from vite.config.ts so the heavy
// PWA/service-worker plugin never runs under tests). Reuses the app's React
// transform + path aliases so imports resolve exactly as they do in the app.
export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    resolve: { alias: projectAliases },
    test: {
        environment: 'jsdom',
        // Jest-style globals (describe/it/expect) without per-file imports.
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        // Component stylesheets (index.scss) are irrelevant to behavior and
        // would drag Tailwind/Sass into every test run — leave CSS unprocessed
        // so `import './index.scss'` is a no-op.
        css: false,
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        clearMocks: true,
        restoreMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            reportsDirectory: './coverage',
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.{test,spec}.{ts,tsx}',
                'src/test/**',
                'src/**/*.d.ts',
                'src/main.tsx',
                'src/**/index.scss',
                // Non-executable / not-meaningfully-testable: pure type
                // declarations, i18n locale bundles, and static assets.
                'src/**/*.types.ts',
                'src/types/**',
                'src/i18n/**',
                'src/assets/**',
                'src/vite-env.d.ts',
                // Heavy third-party document / runtime glue — low logic
                // density, high setup cost, low bug risk. Tracked for
                // integration tests; excluded from the unit-coverage gate so
                // it doesn't mask the tested logic's real coverage.
                'src/utils/exportTripExcel.ts',
                'src/utils/exportTripPdf.ts',
                'src/utils/tripExportShared.ts',
                'src/utils/lazyWithRetry.ts',
                'src/utils/heroImages.ts',
                'src/utils/index.ts',
                // API infra glue: GraphQL client setup, TanStack Query config,
                // barrel re-exports, and prefetch orchestration — low logic
                // density / mostly wiring. The client MODULES (fetch fns) are
                // all contract-tested; these are excluded from the api gate.
                'src/api/graphqlClient.ts',
                'src/api/pythonGqlClient.ts',
                'src/api/queryClient.ts',
                'src/api/index.ts',
                'src/api/suggestionsPrefetch.ts',
            ],
            // Enforced coverage floor. Currently scoped to the tested logic
            // core (src/utils); RATCHET this outward — add src/components/…,
            // src/api/… globs as those layers reach 80% — until it's global.
            thresholds: {
                'src/utils/**': {
                    statements: 80,
                    branches: 80,
                    functions: 80,
                    lines: 80,
                },
                // Shared form primitives — all 15 covered. Functions is omitted
                // here because MUI picker/callback internals in InputField
                // aren't driven in tests; lines/branches are the real gate.
                'src/components/common/FormFields/**': {
                    statements: 80,
                    branches: 80,
                    lines: 80,
                },
                // API client modules — all ~50 fetch modules contract-tested
                // (MSW + Zod). Direct children only (`*.ts`, not hooks/); infra
                // glue is excluded above. The api/hooks/ layer is not gated yet.
                'src/api/*.ts': {
                    statements: 80,
                    branches: 80,
                    functions: 80,
                    lines: 80,
                },
            },
        },
    },
});
