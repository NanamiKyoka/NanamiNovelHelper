import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'out', 'reference'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'out/',
        'reference/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
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
    },
  },
})
