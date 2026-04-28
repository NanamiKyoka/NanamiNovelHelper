import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: ['node_modules', 'out', 'reference'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/renderer/src/services/ahoCorasick.ts',
        'src/renderer/src/utils/lruCache.ts',
        'src/renderer/src/utils/error.tsx',
        'src/renderer/src/utils/html.ts',
        'src/renderer/src/stores/organizationStore.ts',
        'src/renderer/src/stores/vocabularyStore.ts',
        'src/renderer/src/components/common/ConfirmDialog/ConfirmDialog.tsx',
        'src/renderer/src/components/common/Empty/Empty.tsx',
        'src/renderer/src/components/common/Loading/Loading.tsx',
        'src/renderer/src/components/common/ErrorBoundary/ErrorBoundary.tsx',
        'src/shared/errors.ts',
        'src/shared/logger.ts',
        'src/shared/async.ts',
        'src/shared/constants/relationTypes.ts',
        'src/shared/constants/colors.ts',
        'src/main/utils/validation.ts'
      ],
      exclude: ['node_modules/', 'out/', 'reference/', '**/*.d.ts', '**/*.config.*'],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50
      }
    }
  },
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@components': resolve('src/renderer/src/components'),
      '@stores': resolve('src/renderer/src/stores'),
      '@services': resolve('src/renderer/src/services'),
      '@hooks': resolve('src/renderer/src/hooks'),
      '@utils': resolve('src/renderer/src/utils'),
      '@types': resolve('src/renderer/src/types'),
      '@shared': resolve('src/shared'),
      '@constants': resolve('src/renderer/src/constants')
    }
  }
})
